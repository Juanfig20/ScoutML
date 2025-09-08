import pandas as pd

def player_file(file_path: str, file_type: str = 'csv') -> list:
  column_mapping = {
    # Datos del jugador
    'nombre': ['nombre', 'name', 'player name', 'player', 'jugador'],
    'apellido': ['apellido', 'last name', 'lastname'],
    'fecha_nacimiento': ['birth date', 'fecha de nacimiento', 'fecha nacimiento', 'birth_date', 'fecha nac', 'nacimiento'],
    'peso': ['weight', 'peso', 'kg'],
    'estatura': ['height', 'estatura', 'cm'],
    
    # Stats Base
    'G': ['g', 'jj', 'j', 'games', 'juegos', 'juegos jugados'],
    'AB': ['ab', 'vb', 'at bats', 'turnos al bate'],
    'H': ['h', 'hp', 'hits', 'hits totales'],
    '2B': ['2b', 'h2', 'doubles', 'dobles'],
    '3B': ['3b', 'h3', 'triples'],
    'HR': ['hr', 'home runs', 'jonrones'],
    'BB': ['bb', 'walks', 'bases por bolas'],
    'SO': ['so', 'k', 'strikeouts', 'ponches'],
    'HBP': ['hbp', 'gp', 'hit by pitch', 'golpeado'],
    'SF': ['sf', 'sacrifice flies', 'fly de sacrificio'],
    'ER': ['er', 'cl', 'earned runs', 'carreras limpias'],
    'IP': ['ip', 'il', 'innings pitched', 'entradas lanzadas'],
    'PO': ['po', 'putouts'],
    'A': ['a', 'as', 'assists', 'asistencias'],
    'E': ['e', 'err', 'errors', 'errores'],

    # Stats Derivadas (para buscarlas si ya existen)
    'AVG': ['avg', 'ba', 'pdb', 'average', 'promedio', 'promedio de bateo'],
    'OBP': ['obp', 'pde', 'on-base percentage'],
    'SLG': ['slg', 'slugging'],
    'OPS': ['ops'],
    'K%': ['k%', 'k_percentage', 'so%', 'k_%'],
    'BB/K': ['bb/k', 'bb_k', 'bb/so', 'bb_so'],
    'FPCT': ['fpct', 'pdf', 'fielding_percentage', 'porcentaje de fildeo', '% de fildeo'],
    'RF': ['rf', 'range_factor'],
    'ERA': ['era', 'efec', 'efect', 'efectividad'],
    'WHIP': ['whip'],
    'K/9': ['k/9', 'k_9', 'so/9', 'so_9'],
    'BB/9': ['bb/9', 'bb_9'],
    'K/BB': ['k/bb', 'k_bb', 'so/bb', 'so_bb'],
  }
    
  def find_column(df_columns, possible_names):
    for name in possible_names:
      normalized_name = name.lower().strip().replace(' ', '_')
      if normalized_name in df_columns:
        return normalized_name
    return None

  try:
    if file_type == 'csv':
      try:
        df = pd.read_csv(file_path, on_bad_lines='skip')
      except UnicodeDecodeError:
        df = pd.read_csv(file_path, encoding='latin1', on_bad_lines='skip')
    elif file_type == 'xlsx':
        df = pd.read_excel(file_path)
    else:
        raise ValueError("Tipo de archivo no soportado. Usa 'csv' o 'xlsx'.")
  except FileNotFoundError:
    return {"error": "Archivo no encontrado en la ruta especificada."}
  except Exception as e:
    return {"error": f"Error al leer el archivo: {e}"}

  df.columns = df.columns.astype(str)
  df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
  
  df_columns_lower = list(df.columns)
  
  mapped_columns = {key: find_column(df_columns_lower, value) for key, value in column_mapping.items()}

  players_data = []
  
  for _, row in df.iterrows():
    player = {}
      
    first_name = row.get(mapped_columns.get('nombre')) if mapped_columns.get('nombre') else ''
    last_name = row.get(mapped_columns.get('apellido')) if mapped_columns.get('apellido') else ''
    player['name'] = f"{first_name} {last_name}".strip().title()

    birth_date_raw = row.get(mapped_columns.get('fecha_nacimiento'))
    if pd.notna(birth_date_raw):
      try:
        player['birth_date'] = pd.to_datetime(birth_date_raw).strftime('%Y-%m-%d')
      except (ValueError, TypeError):
        player['birth_date'] = str(birth_date_raw)
    else:
      player['birth_date'] = ''

    player['weight'] = row.get(mapped_columns.get('peso'))
    player['height'] = row.get(mapped_columns.get('estatura'))
    
    has_batting_stats = mapped_columns.get('AB') is not None
    has_pitching_stats = mapped_columns.get('IP') is not None
    
    if has_batting_stats and not has_pitching_stats:
      player['position'] = 'batter'
      
      G = row.get(mapped_columns.get('G'), 1)
      AB = row.get(mapped_columns.get('AB'), 0)
      H = row.get(mapped_columns.get('H'), 0)
      doubles = row.get(mapped_columns.get('2B'), 0)
      triples = row.get(mapped_columns.get('3B'), 0)
      HR = row.get(mapped_columns.get('HR'), 0)
      BB = row.get(mapped_columns.get('BB'), 0)
      SO = row.get(mapped_columns.get('SO'), 0)
      HBP = row.get(mapped_columns.get('HBP'), 0)
      SF = row.get(mapped_columns.get('SF'), 0)
      PO = row.get(mapped_columns.get('PO'), 0)
      A = row.get(mapped_columns.get('A'), 0)
      E = row.get(mapped_columns.get('E'), 0)

      player.update({
        'G': G, 'AB': AB, 'H': H, '2B': doubles, '3B': triples, 'HR': HR,
        'BB': BB, 'SO': SO, 'HBP': HBP, 'SF': SF, 'PO': PO, 'A': A, 'E': E
      })

      # Lógica condicional para estadísticas derivadas de bateo
      if mapped_columns.get('AVG') and pd.notna(row.get(mapped_columns.get('AVG'))):
        player['AVG'] = row.get(mapped_columns.get('AVG'))
      else:
        player['AVG'] = H / AB if AB > 0 else 0

      if mapped_columns.get('OBP') and pd.notna(row.get(mapped_columns.get('OBP'))):
        player['OBP'] = row.get(mapped_columns.get('OBP'))
      else:
        player['OBP'] = (H + BB + HBP) / (AB + BB + HBP + SF) if (AB + BB + HBP + SF) > 0 else 0
      
      if mapped_columns.get('SLG') and pd.notna(row.get(mapped_columns.get('SLG'))):
        player['SLG'] = row.get(mapped_columns.get('SLG'))
      else:
        singles = H - doubles - triples - HR
        total_bases = singles + (doubles * 2) + (triples * 3) + (HR * 4)
        player['SLG'] = total_bases / AB if AB > 0 else 0
        
      if mapped_columns.get('OPS') and pd.notna(row.get(mapped_columns.get('OPS'))):
        player['OPS'] = row.get(mapped_columns.get('OPS'))
      else:
        player['OPS'] = player['OBP'] + player['SLG']
        
      player['K%'] = (SO / AB) * 100 if AB > 0 else 0
      player['BB/K'] = BB / SO if SO > 0 else 0
      
      if mapped_columns.get('FPCT') and pd.notna(row.get(mapped_columns.get('FPCT'))):
        player['FPCT'] = row.get(mapped_columns.get('FPCT'))
      else:
        player['FPCT'] = (PO + A) / (PO + A + E) if (PO + A + E) > 0 else 0
        
      player['RF'] = (PO + A) / G if G > 0 else 0

    elif has_pitching_stats and not has_batting_stats:
      player['position'] = 'pitcher'
      
      ER = row.get(mapped_columns.get('ER'), 0)
      IP = row.get(mapped_columns.get('IP'), 0)
      H = row.get(mapped_columns.get('H'), 0)
      BB = row.get(mapped_columns.get('BB'), 0)
      SO = row.get(mapped_columns.get('SO'), 0)
      PO = row.get(mapped_columns.get('PO'), 0)
      A = row.get(mapped_columns.get('A'), 0)
      E = row.get(mapped_columns.get('E'), 0)
      G = row.get(mapped_columns.get('G'), 1)

      player.update({
        'ER': ER, 'IP': IP, 'H': H, 'BB': BB, 'SO': SO,
        'PO': PO, 'A': A, 'E': E, 'G': G
      })

      # Lógica condicional para estadísticas derivadas de pitcheo
      if mapped_columns.get('ERA') and pd.notna(row.get(mapped_columns.get('ERA'))):
        player['ERA'] = row.get(mapped_columns.get('ERA'))
      else:
        player['ERA'] = (ER * 9) / IP if IP > 0 else 0

      if mapped_columns.get('WHIP') and pd.notna(row.get(mapped_columns.get('WHIP'))):
        player['WHIP'] = row.get(mapped_columns.get('WHIP'))
      else:
        player['WHIP'] = (BB + H) / IP if IP > 0 else 0

      player['K/9'] = (SO * 9) / IP if IP > 0 else 0
      player['BB/9'] = (BB * 9) / IP if IP > 0 else 0
      player['K/BB'] = SO / BB if BB > 0 else 0
      
      if mapped_columns.get('FPCT') and pd.notna(row.get(mapped_columns.get('FPCT'))):
        player['FPCT'] = row.get(mapped_columns.get('FPCT'))
      else:
        player['FPCT'] = (PO + A) / (PO + A + E) if (PO + A + E) > 0 else 0
        
      player['RF'] = (PO + A) / G if G > 0 else 0
      
    else:
      player['position'] = 'unknown'

    players_data.append(player)
      
  return players_data