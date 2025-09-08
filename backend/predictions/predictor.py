import joblib
import pandas as pd
import numpy as np
import requests 
from pathlib import Path
from io import BytesIO

#  URLs DE ARCHIVOS EN SUPABASE STORAGE
PITCHER_MODEL_URL = "https://cbapxmchljrtvfiqozoy.supabase.co/storage/v1/object/public/ml_models/Modelo_RF_Pitchers.pkl"
PITCHER_DATASET_URL = "https://cbapxmchljrtvfiqozoy.supabase.co/storage/v1/object/public/ml_models/Pitchers.csv"
BATTER_MODEL_URL = "https://cbapxmchljrtvfiqozoy.supabase.co/storage/v1/object/public/ml_models/Modelo_RF_Bateadores.pkl"
BATTER_DATASET_URL = "https://cbapxmchljrtvfiqozoy.supabase.co/storage/v1/object/public/ml_models/Bateadores.csv"


# FUNCIÓN  PARA DESCARGAR Y CARGAR MODELOS
def load_pipeline_from_url(url: str):
    """Descarga un pipeline de modelo (.pkl) desde una URL y lo carga."""
    print(f"Descargando pipeline desde {url}...")
    try:
        response = requests.get(url)
        # Esto lanzará un error si la URL no es válida o la descarga falla
        response.raise_for_status()
        # Carga el pipeline directamente desde los bytes descargados
        pipeline = joblib.load(BytesIO(response.content))
        print("Pipeline cargado exitosamente.")
        return pipeline
    except Exception as e:
        raise RuntimeError(f"Error al cargar el pipeline desde {url}: {e}")

#  CARGA DE MODELOS Y DATASETS
try:
    # Carga de Pitchers
    pitcher_pipeline = load_pipeline_from_url(PITCHER_MODEL_URL)
    pitcher_model = pitcher_pipeline['model']
    pitcher_scaler = pitcher_pipeline['scaler']
    pitcher_features = pitcher_pipeline['features']
    print(f"Descargando dataset de pitchers desde {PITCHER_DATASET_URL}...")
    pitcher_dataset = pd.read_csv(PITCHER_DATASET_URL)
    print("Dataset de pitchers cargado.")

    # Carga de Bateadores
    batter_pipeline = load_pipeline_from_url(BATTER_MODEL_URL)
    batter_model = batter_pipeline['model']
    batter_scaler = batter_pipeline['scaler']
    batter_features = batter_pipeline['features']
    print(f"Descargando dataset de bateadores desde {BATTER_DATASET_URL}...")
    batter_dataset = pd.read_csv(BATTER_DATASET_URL)
    print("Dataset de bateadores cargado.")

except RuntimeError as e:
    # Si algo falla (la descarga, la carga), el programa se detendrá con un error claro.
    raise e

#Constantes de Métricas
metricas_invertidas_p = ['ERA', 'WHIP', 'BB/9']
metricas_invertidas_b = ['K%']
pesos_bateo = {'AVG': 0.15, 'OBP': 0.20, 'SLG': 0.15, 'OPS': 0.25, 'K%': 0.10, 'BB/K': 0.05, 'FPCT': 0.05, 'RF': 0.05}
pesos_pitcheo = {'ERA': 0.20, 'WHIP': 0.25, 'K/9': 0.20, 'BB/9': 0.15, 'K/BB': 0.15, 'FPCT': 0.025, 'RF': 0.025}

# Genera un reporte completo para un solo jugador
def single(player_data, player_type, plan='gratis'):
  if player_type == 'pitcher':
    model, scaler, features, dataset, metricas_invertidas, pesos = \
    pitcher_model, pitcher_scaler, pitcher_features, pitcher_dataset, metricas_invertidas_p, pesos_pitcheo
  elif player_type == 'batter':
    model, scaler, features, dataset, metricas_invertidas, pesos = \
    batter_model, batter_scaler, batter_features, batter_dataset, metricas_invertidas_b, pesos_bateo
  else:
    return {"error": "Tipo de jugador no válido."}

  try:
    # Se limpian los datos para asegurar que todas las features requeridas están presentes
    cleaned_player_data = {k: player_data.get(k, 0) for k in features}
    player_df = pd.DataFrame([cleaned_player_data], columns=features)
    player_scaled = scaler.transform(player_df)
  except KeyError as e:
    return {"error": f"Falta la métrica requerida: {str(e)}"}

  # 1. Booleano de Prospecto y Probabilidad
  is_prospect = bool(model.predict(player_scaled)[0])
  prospect_percentage = model.predict_proba(player_scaled)[0][1]

  # 2. Percentiles, Fortalezas y Debilidades
  percentiles, fortalezas, mejoras = {}, [], []
  for m in features:
    valor = player_data.get(m, 0)
    percentil = ((dataset[m] > valor).mean() if m in metricas_invertidas else (dataset[m] < valor).mean()) * 100
    percentil = int(percentil)
    percentiles[m] = percentil
    if percentil >= 80:
      fortalezas.append({"metrica": m, "valor": valor, "percentil": percentil})
    elif percentil <= 20:
      mejoras.append({"metrica": m, "actual": valor, "percentil": percentil})

  # 3. Ranking
  ranking = int(np.average(pd.Series(percentiles), weights=pd.Series(pesos)))

  # 4. Jugador Comparable
  distancias = np.linalg.norm(dataset[features].values - player_df.values.flatten(), axis=1)
  comparable = dataset.iloc[np.argmin(distancias)]
  jugador_comparable = f"{comparable.get('nameFirst', '')} {comparable.get('nameLast', '')} ({comparable.get('yearID', '')})"

  # 5. Resumen
  if is_prospect:
    resumen = f"Presenta un perfil de prospecto con un rendimiento del {ranking}%."
  else:
    if mejoras:
      metricas_a_mejorar_nombres = [m['metrica'] for m in mejoras]
      resumen = f"Aún no alcanza el perfil de prospecto. Áreas clave a mejorar: {', '.join(metricas_a_mejorar_nombres)}."
    else:
      resumen = "Aún no alcanza el perfil de prospecto. Sus estadísticas generales son sólidas pero necesitan desarrollo igualmente."
      
  # Formatear respuesta para coincidir con la BD
  return {
    "is_prospect": is_prospect,
    "prospect_percentage": prospect_percentage,
    "ranking": ranking,
    "factores_positivos": fortalezas,
    "factores_a_mejorar": mejoras,
    "jugador_comparable": jugador_comparable,
    "resumen": resumen,
    "calculated_stats": cleaned_player_data,
  }
    

#Predice un DataFrame completo
def batch(players_list: list, player_type: str) -> list:
  all_reports = []
  for player_stats in players_list:

    report = single(player_stats, player_type)
    
    # Añadir la información personal del jugador al reporte para el frontend
    report['Player'] = player_stats.get('name', 'Nombre Desconocido')
    report['Birth_Date'] = player_stats.get('birth_date')
    report['Weight'] = player_stats.get('weight')
    report['Height'] = player_stats.get('height')
        
    all_reports.append(report)

  # Limpieza final para asegurar compatibilidad con JSON
  for record in all_reports:
    for key, value in record.items():
      if isinstance(value, float) and np.isnan(value):
        record[key] = None
      if isinstance(value, pd.Timestamp):
        record[key] = value.strftime('%Y-%m-%d')

  return all_reports