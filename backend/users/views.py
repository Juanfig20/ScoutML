from django.shortcuts import render
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client

class AuthView(APIView):
    def post(self, request, *args, **kwargs):
        supabase_service_role = create_client(
            os.getenv('SUPABASE_URL'), 
            os.getenv('SUPABASE_KEY') 
        )

        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        if not all([email, password, first_name, last_name]):
            return Response({"error": "Todos los campos son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        user_id = None
        try:
            #  Registrar el usuario en Supabase Auth.
            
            user_response = supabase_service_role.auth.sign_up({
                "email": email,
                "password": password,
            })
            user_id = user_response.user.id
            
            # ACTUALIZAR el perfil recién creado con los datos adicionales.
            
            profile_data_to_update = {
                "first_name": first_name,
                "last_name": last_name,
                "email": email  
            }
            
            update_response = supabase_service_role.table("profiles") \
                .update(profile_data_to_update) \
                .eq("user_id", user_id) \
                .execute()

            # Verificamos si la actualización fue exitosa 
            if not update_response.data:
                
                raise Exception("El perfil de usuario no pudo ser actualizado después del registro.")

            return Response({"message": "Usuario registrado exitosamente"}, status=status.HTTP_201_CREATED)

        except Exception as e:
           
            if user_id:
                try:
                    supabase_service_role.auth.admin.delete_user(user_id)
                except Exception as delete_e:
                    
                    print(f"CRÍTICO: No se pudo borrar el usuario huérfano {user_id}: {delete_e}")
            
            # Los errores de Supabase a veces vienen en un atributo 'message'.
            error_message = getattr(e, 'message', str(e))
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        supabase = create_client(
            os.getenv('SUPABASE_URL'), 
            os.getenv('SUPABASE_KEY') 
        )
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({"error": "Email y contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_response = supabase.auth.sign_in_with_password({"email": email, "password": password})
            user_data = user_response.user
            
            profile_data = supabase.table("profiles").select("*").eq('user_id', user_data.id).single().execute()
            
            return Response({"user": profile_data.data}, status=status.HTTP_200_OK)

        except Exception as e:
          
            error_message = getattr(e, 'message', str(e))
            return Response({"error": error_message}, status=status.HTTP_401_UNAUTHORIZED)
        
