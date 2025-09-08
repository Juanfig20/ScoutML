import pandas as pd
from rest_framework.views import APIView 
from rest_framework.response import Response 
from rest_framework import status 
from .predictor import single, batch
from .file_reader import player_file 
from supabase import create_client
import os
from datetime import datetime
from dateutil import parser
from django.core.files.storage import FileSystemStorage

PLAN_LIMITS = {
  'gratis': 1,
  'basico': 10,
  'medio': 20,
  'avanzado': 40, 
}

class ProspectPredictionView(APIView): 
  def post(self, request, *args, **kwargs): 
    user_id = request.data.get('user_id') 
    if not user_id:
      return Response({"error": "Falta el user_id del usuario."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
      supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
      
      profile_response = supabase.table("profiles").select(
        "plan, prediction_count, last_prediction_date"
      ).eq("user_id", user_id).single().execute()
      
      if not profile_response.data:
        return Response({"error": "Perfil de usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
      
      profile = profile_response.data
      user_plan = profile.get('plan') or 'gratis'
      prediction_count = profile.get('prediction_count') or 0
      last_prediction_str = profile.get('last_prediction_date')
      
      # Reinicio del contador mensual 
      current_month = datetime.now().month
      if last_prediction_str and parser.isoparse(last_prediction_str).month != current_month:
        prediction_count = 0 

    except Exception as e:
      return Response({"error": f"Error al verificar el perfil: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    #  Lógica para carga de archivos (Plan Avanzado)
    if 'file' in request.FILES:
      if user_plan != 'avanzado':
        return Response({"error": "La carga de archivos solo está disponible en el plan Avanzado."}, status=status.HTTP_403_FORBIDDEN)

      limit = PLAN_LIMITS.get(user_plan, 0)

      fs = FileSystemStorage()
      file = request.FILES['file']
      filename = fs.save(file.name, file)
      file_path = fs.path(filename)
      file_type = filename.split('.')[-1].lower()

      try:
        # Usar el nuevo parser para leer y procesar el archivo
        parsed_players = player_file(file_path, file_type)

        if isinstance(parsed_players, dict) and "error" in parsed_players:
          return Response(parsed_players, status=status.HTTP_400_BAD_REQUEST)

        players_in_file = len(parsed_players)
        predictions_available = limit - prediction_count

        if predictions_available <= 0:
          return Response({"error": f"Ya has alcanzado tu límite mensual de {limit} predicciones."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        players_to_process = min(players_in_file, predictions_available)

        # Pasar la lista de jugadores procesados a la función batch
        results = batch(parsed_players[:players_to_process], request.data.get('player_type'))

        response_data = {"results": results}
        if players_to_process < players_in_file:
          response_data["warning"] = f"Límite alcanzado. Se procesaron {players_to_process} de {players_in_file} jugadores. Los restantes fueron omitidos."

        new_count = prediction_count + players_to_process
        supabase.table("profiles").update({
          "prediction_count": new_count,
          "last_prediction_date": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()

        return Response(response_data, status=status.HTTP_200_OK)

      except Exception as e:
        return Response({"error": f"Error al procesar el archivo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
      finally:
        if os.path.exists(file_path):
          os.remove(file_path)

    # Lógica para Predicción Individual 
    else:
      limit = PLAN_LIMITS.get(user_plan, 0)
      if prediction_count >= limit:
        return Response({"error": f"Has alcanzado tu límite mensual de {limit} predicciones."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
      
      player_data = request.data.get('player_data') 
      player_type = request.data.get('player_type')

      if not all([player_data, player_type]): 
        return Response({"error": "Faltan 'player_data' o 'player_type'."}, status=status.HTTP_400_BAD_REQUEST) 
      
      try: 
        result = single(player_data, player_type) 
        if 'error' in result:
          return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Actualizamos el contador
        new_count = prediction_count + 1
        supabase.table("profiles").update({
          "prediction_count": new_count,
          "last_prediction_date": datetime.now().isoformat()
        }).eq("user_id", user_id).execute()

        return Response(result, status=status.HTTP_200_OK) 
      
      except Exception as e: 
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)