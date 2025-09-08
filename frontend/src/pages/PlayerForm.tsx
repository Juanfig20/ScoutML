import { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Layout } from '@/components/Layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Target, Upload, Download, XCircle, X } from 'lucide-react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buttonVariants } from '@/components/ui/button-variants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';


type Player = {
  id: string;
  name: string;
  birth_date: string;
  weight: number | null;
  height: number | null;
  position: string;
};

// Tipo para los resultados de la predicción por archivo (batch)
type BatchPredictionResult = {
  Player: string;
  Birth_Date: string;
  Weight: string | number;
  Height: string | number;
  is_prospect: boolean;
  prospect_percentage: number;
  [key: string]: string | number | boolean | null; 
};

type PredictionWithReport = FullReport & {
  player_id: string;
};

// Tipo para un nuevo jugador con sus datos de predicción
type NewPlayerForCreation = {
  name: string;
  birth_date: string;
  weight: number | null;
  height: number | null;
  user_id: string;
  position: 'batter' | 'pitcher';
  originalReport: FullReport;
};

type CalculatedStats = {
    AVG?: number; OBP?: number; SLG?: number; OPS?: number; 'K%'?: number; 'BB/K'?: number;
    ERA?: number; WHIP?: number; 'K/9'?: number; 'BB/9'?: number; 'K/BB'?: number;
    FPCT?: number; RF?: number;
  };

  type FullReport = {
  Player: string;
  Birth_Date?: string;
  Weight?: string | number;
  Height?: string | number;
  is_prospect: boolean;
  prospect_percentage: number;
  ranking: number;
  factores_positivos: string[];
  factores_a_mejorar: string[];
  jugador_comparable: string;
  resumen: string;
  calculated_stats: CalculatedStats;
};

// API del backend para la predicción
const API_URL = import.meta.env.VITE_API_URL;

export default function PlayerForm() {
  const [position, setPosition] = useState<'batter' | 'pitcher'>('batter');
  const [bulkFileType, setBulkFileType] = useState<'batter' | 'pitcher'>('batter');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estado para almacenar los jugadores del usuario
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);

  // Estado para almacenar los datos del formulario
  const [baseData, setBaseData] = useState({ name: '', birthDate: '', weight: '', height: '' });
  const [gamesPlayed, setGamesPlayed] = useState('');
  const [batterData, setBatterData] = useState({ atBats: '', hits: '', doubles: '', triples: '', homeRuns: '', walks: '', strikeouts: '', hitByPitch: '', sacrificeFlies: '', putouts: '', assists: '', errors: '' });
  const [pitcherData, setPitcherData] = useState({ earnedRuns: '', inningsPitched: '', hits: '', walks: '', strikeouts: '', putouts: '', assists: '', errors: '' });
  
  // Estado para manejar la carga de archivos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Cargar jugadores del usuario 
  useEffect(() => {
    const fetchPlayers = async () => {
      if (user && 'user_id' in user) {
        const { data, error } = await supabase
          .from('players')
          .select('id, name, birth_date, weight, height, position')
          .eq('user_id', user.user_id);

        if (error) {
          toast({ title: "Error", description: "No se pudieron cargar tus jugadores.", variant: "destructive" });
        } else {
          setMyPlayers(data as Player[]);
        }
      }
    };

    fetchPlayers();
  }, [user, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
        setSelectedFile(file);
        toast({
          title: "Archivo cargado",
          description: `Procesando archivo ${file.name} para ${bulkFileType === 'batter' ? 'bateadores' : 'pitchers'}...`,
        });
      } else {
        setSelectedFile(null);
        toast({
          title: "Formato no válido",
          description: "Por favor, sube un archivo CSV o Excel.",
          variant: "destructive"
        });
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast({
      title: "Archivo removido",
      description: "El archivo ha sido removido exitosamente",
      variant: "destructive"
    });
  };

  // Manejar el envío del archivo para predicciones masivas
  const handleFileSubmit = async () => {
  if (!selectedFile) {
    toast({ title: "Error", description: "No has seleccionado ningún archivo.", variant: "destructive" });
    return;
  }
  if (!user || !('user_id' in user)) {
    toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
    return;
  }
  setIsLoading(true);

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('player_type', bulkFileType);
  formData.append('user_id', user.user_id);

  try {
    // Consiguir las predicciones del backend
    const response = await fetch(`${API_URL}/predictions/predict/`, { method: 'POST', body: formData });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al procesar el archivo.");
    }
      const responseData = await response.json();

    // Extrae los reportes de la propiedad 'results'
    const reports: FullReport[] = responseData.results;

    if (responseData.warning) {
      toast({
        title: "Aviso de Límite de Plan",
        description: responseData.warning,
        variant: "default", 
        duration: 9000,   
      });
    }

    if (!reports || reports.length === 0) {
      toast({ title: "Proceso Completado", description: "No se procesaron nuevos jugadores. Es posible que hayas alcanzado tu límite." });
      setIsLoading(false);
      return;
    }

    // Separar los jugadores existentes de los nuevos
    const existingPlayersMap = new Map(myPlayers.map(p => [p.name.toLowerCase(), p.id]));
    const newPlayersToCreate: NewPlayerForCreation[] = [];
    const predictionsForExistingPlayers: PredictionWithReport[] = [];

    for (const report of reports) {
      const existingId = existingPlayersMap.get(report.Player.toLowerCase());
      if (existingId) {
        predictionsForExistingPlayers.push({ player_id: existingId, ...report });
      } else {
        if (!report.Birth_Date) {
          throw new Error(`El jugador "${report.Player}" no tiene fecha de nacimiento.`);
        }
        newPlayersToCreate.push({
          name: report.Player,
          birth_date: String(report.Birth_Date),
          weight: Number(report.Weight) || null,
          height: Number(report.Height) || null,
          user_id: user.user_id,
          position: bulkFileType,
          originalReport: report,
        });
      }
    }

    // Crear nuevos jugadores y preparar todas las predicciones para insertar
    const predictionsToInsert: PredictionWithReport[] = [...predictionsForExistingPlayers];
    if (newPlayersToCreate.length > 0) {
      const playerProfiles = newPlayersToCreate.map(({ originalReport, ...profile }) => profile);
      const { data: newPlayerData, error: playerError } = await supabase.from('players').insert(playerProfiles).select('id, name');
      if (playerError) throw new Error(`Error al crear jugadores: ${playerError.message}`);
      
      // Mapear los IDs de los nuevos jugadores a sus reportes originales
      newPlayerData?.forEach(newPlayer => {
        const original = newPlayersToCreate.find(p => p.name === newPlayer.name);
        if (original) {
          predictionsToInsert.push({ player_id: newPlayer.id, ...original.originalReport });
        }
      });
    }

    // Insertar todas las predicciones
    if (predictionsToInsert.length === 0) {
      toast({ title: "Proceso Completado", description: "No se encontraron nuevos datos para procesar." });
      setIsLoading(false); // Stop loading if we exit early
      return;
    }
    
    const predictionInserts = predictionsToInsert.map(p => ({
      player_id: p.player_id,
      is_prospect: p.is_prospect,
      prospect_percentage: p.prospect_percentage,
      ranking: p.ranking,
      factores_positivos: p.factores_positivos,
      factores_a_mejorar: p.factores_a_mejorar,
      jugador_comparable: p.jugador_comparable,
      resumen: p.resumen,
    }));

    const { data: newPredictionData, error: predictionError } = await supabase.from('predictions').insert(predictionInserts).select('id, player_id');
    if (predictionError) throw new Error(`Error al guardar predicciones: ${predictionError.message}`);

    // Insertar las estadísticas asociadas a cada predicción
    const statsToInsert = newPredictionData?.map(pred => {
      
      const report = predictionsToInsert.find(p => p.player_id === pred.player_id);
      const stats = report?.calculated_stats || {};
      return {
        prediction_id: pred.id,
        player_id: pred.player_id,
        avg: stats.AVG, obp: stats.OBP, slg: stats.SLG, ops: stats.OPS,
        k_percentage: stats['K%'], bb_k: stats['BB/K'], era: stats.ERA,
        whip: stats.WHIP, k_9: stats['K/9'], bb_9: stats['BB/9'],
        k_bb: stats['K/BB'], fpct: stats.FPCT, rf: stats.RF,
      };
    });

    if (statsToInsert && statsToInsert.length > 0) {
      const { error: statsError } = await supabase.from('stats').insert(statsToInsert);
      if (statsError) throw new Error(`Error al guardar estadísticas: ${statsError.message}`);
    }

    toast({
      title: "¡Carga de archivos completada!",
      description: `Se crearon ${newPlayersToCreate.length} jugadores y se añadieron ${predictionsToInsert.length} reportes.`,
    });
    navigate('/my-players');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error.";
      toast({ title: "Error en el proceso", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Botón para seleccionar un jugador existente
  const handlePlayerSelect = (playerId: string) => {
    if (!playerId) {
      clearSelection();
      return;
    }
    const player = myPlayers.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(playerId);
      setBaseData({
        name: player.name,
        birthDate: player.birth_date,
        weight: player.weight?.toString() || '',
        height: player.height?.toString() || ''
      });
      setPosition(player.position as 'batter' | 'pitcher');
      toast({
        title: "Jugador Cargado",
        description: `Datos de ${player.name} cargados. Ingresa sus nuevas estadísticas.`,
      });
    }
  };
  
  const clearSelection = () => {
    setSelectedPlayer('');
    setBaseData({ name: '', birthDate: '', weight: '', height: '' });
    setGamesPlayed('');
    setBatterData({ atBats: '', hits: '', doubles: '', triples: '', homeRuns: '', walks: '', strikeouts: '', hitByPitch: '', sacrificeFlies: '', putouts: '', assists: '', errors: '' });
    setPitcherData({ earnedRuns: '', inningsPitched: '', hits: '', walks: '', strikeouts: '', putouts: '', assists: '', errors: '' });
  };

  const handleDownloadTemplate = () => {
    const fileName = bulkFileType  === 'batter' 
      ? 'Plantilla_Bateadores.xlsx' 
      : 'Plantilla_Pitchers.xlsx';

    const filePath = `/${fileName}`;

    // Se crea el link de descarga
    const a = document.createElement('a');
    a.href = filePath;
    a.download = fileName; 
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Accion del boton de envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!user || !('user_id' in user) || !('plan' in user)) {
    toast({ title: "Error", description: "Usuario no autenticado o plan no definido. Por favor, inicia sesión de nuevo.", variant: "destructive" });
    return;
    }

    const today = new Date();
    const birthDate = new Date(baseData.birthDate);
    if (birthDate > today) {
      toast({ title: "Error", description: "La fecha de nacimiento no puede ser posterior al día actual.", variant: "destructive" });
      return;
    }
    
  setIsLoading(true);

    try {
      // Calcular las estadísticas y prepararlas en un objeto
      let statsObjectForModel: CalculatedStats = {};
      const G = Number(gamesPlayed);

      if (position === 'batter') {
        const { atBats, hits, doubles, triples, homeRuns, walks, strikeouts, hitByPitch, sacrificeFlies, putouts, assists, errors } = batterData;
        const AB = Number(atBats), H = Number(hits), D2B = Number(doubles), D3B = Number(triples), HR = Number(homeRuns), BB = Number(walks), SO = Number(strikeouts), HBP = Number(hitByPitch), SF = Number(sacrificeFlies), PO = Number(putouts), A = Number(assists), E = Number(errors);
        
        const singles = H - (D2B + D3B + HR);
        const TB = singles + (D2B * 2) + (D3B * 3) + (HR * 4);
        
        //Calcular stats de bateador
        const avg = (AB > 0 ? H / AB : 0);
        const obp = (() => { const den = AB + BB + HBP + SF; return den > 0 ? (H + BB + HBP) / den : 0; })();
        const slg = (AB > 0 ? TB / AB : 0);
        const ops = obp + slg;
        const k_percentage = (AB > 0 ? (SO / AB) * 100 : 0);
        const bb_k = (SO > 0 ? BB / SO : 0);
        const fpct = (() => { const den = PO + A + E; return den > 0 ? (PO + A) / den : 0; })();
        const rf = (G > 0 ? (PO + A) / G : 0);

        statsObjectForModel = { AVG: avg, OBP: obp, SLG: slg, OPS: ops, 'K%': k_percentage, 'BB/K': bb_k, FPCT: fpct, RF: rf };
      
      } else { //Se calculan las stats de pitcher
        const { earnedRuns, inningsPitched, hits, walks, strikeouts, putouts, assists, errors } = pitcherData;
        const ER = Number(earnedRuns), IP_str = inningsPitched.toString(), H = Number(hits), BB = Number(walks), SO = Number(strikeouts), PO = Number(putouts), A = Number(assists), E = Number(errors);
        
        const fullIP = Math.floor(Number(inningsPitched));
        const partialIP = Number(IP_str.split('.')[1] || '0');
        const IPOuts = (fullIP * 3) + partialIP;
        const IP_calc = IPOuts / 3;

        const era = (IP_calc > 0 ? (ER / IP_calc) * 9 : 0);
        const whip = (IP_calc > 0 ? (BB + H) / IP_calc : 0);
        const k_9 = (IP_calc > 0 ? (SO / IP_calc) * 9 : 0);
        const bb_9 = (IP_calc > 0 ? (BB / IP_calc) * 9 : 0);
        const k_bb = (BB > 0 ? SO / BB : 0);
        const fpct = (() => { const den = PO + A + E; return den > 0 ? (PO + A) / den : 0; })();
        const rf = (G > 0 ? (PO + A) / G : 0);

       statsObjectForModel = { ERA: era, WHIP: whip, 'K/9': k_9, 'BB/9': bb_9, 'K/BB': k_bb, FPCT: fpct, RF: rf };
      }
      
      // Obtener la predicción de la API
       const predictionResponse = await fetch(`${API_URL}/predictions/predict/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          player_data: statsObjectForModel,
          player_type: position,
        }),
      });

      if (!predictionResponse.ok) {
        const errorData = await predictionResponse.json();
        if (predictionResponse.status === 429) {
             throw new Error(errorData.error || 'Límite de predicciones alcanzado.');
        }
        throw new Error(errorData.error || 'Error del servidor al predecir.');
      }

      const fullReport = await predictionResponse.json();

      let finalPlayerId = selectedPlayer;

      // Crear jugador si es nuevo
      if (!selectedPlayer) {
        const { data: newPlayerData, error: playerError } = await supabase
          .from('players')
          .insert([{ name: baseData.name, birth_date: baseData.birthDate, weight: Number(baseData.weight) || null, height: Number(baseData.height) || null, user_id: user.user_id, position }])
          .select('id').single();
        if (playerError) throw new Error(`Error al guardar el jugador: ${playerError.message}`);
        if (!newPlayerData?.id) throw new Error('No se pudo obtener el ID del jugador creado.');
        finalPlayerId = newPlayerData.id;
      }

      // Se guarda la predicción y los otros datos en la tabla 'predictions'
       const { data: newPredictionData, error: predictionError } = await supabase
      .from('predictions')
      .insert([{ 
        player_id: finalPlayerId, 
        is_prospect: fullReport.is_prospect, 
        prospect_percentage: fullReport.prospect_percentage ?? null,
        ranking: fullReport.ranking ?? null,
        factores_positivos: fullReport.factores_positivos ?? null,
        factores_a_mejorar: fullReport.factores_a_mejorar ?? null,
        jugador_comparable: fullReport.jugador_comparable ?? null,
        resumen: fullReport.resumen ?? null
      }])
      .select('id').single();

      if (predictionError) throw new Error(`Error al guardar la predicción: ${predictionError.message}`);
      if (!newPredictionData?.id) throw new Error('No se pudo obtener el ID de la predicción creada.');
      
      // Se guardan las estadísticas en la tabla 'stats'
      const statsToSaveForDB = {
        avg: statsObjectForModel.AVG,
        obp: statsObjectForModel.OBP,
        slg: statsObjectForModel.SLG,
        ops: statsObjectForModel.OPS,
        k_percentage: statsObjectForModel['K%'],
        bb_k: statsObjectForModel['BB/K'],
        era: statsObjectForModel.ERA,
        whip: statsObjectForModel.WHIP,
        k_9: statsObjectForModel['K/9'],
        bb_9: statsObjectForModel['BB/9'],
        k_bb: statsObjectForModel['K/BB'],
        fpct: statsObjectForModel.FPCT,
        rf: statsObjectForModel.RF,
      };

      const { error: statsError } = await supabase
        .from('stats')
        .insert([{
          prediction_id: newPredictionData.id,
          player_id: finalPlayerId,
          ...statsToSaveForDB
        }]);

      if (statsError) throw new Error(`Error al guardar las estadísticas: ${statsError.message}`);

      // Mensaje
      if (selectedPlayer) {
        toast({ title: "¡Reporte generado!", description: `Se añadió un nuevo reporte para ${baseData.name}.` });
      } else {
        toast({ title: "¡Jugador y reporte creados!", description: `Se creó a ${baseData.name} con su reporte completo.` });
      }
      
      navigate('/my-players');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      toast({ title: "Error en el proceso", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Bateadores
const renderBatterFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="atBats">Turnos al bate (AB)</Label>
        <Input id="atBats" type="number" value={batterData.atBats} onChange={(e) => setBatterData({ ...batterData, atBats: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hits">Hits (H)</Label>
        <Input id="hits" type="number" value={batterData.hits} onChange={(e) => setBatterData({ ...batterData, hits: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="doubles">Dobles (2B)</Label>
        <Input id="doubles" type="number" value={batterData.doubles} onChange={(e) => setBatterData({ ...batterData, doubles: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="triples">Triples (3B)</Label>
        <Input id="triples" type="number" value={batterData.triples} onChange={(e) => setBatterData({ ...batterData, triples: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="homeRuns">Jonrones (HR)</Label>
        <Input id="homeRuns" type="number" value={batterData.homeRuns} onChange={(e) => setBatterData({ ...batterData, homeRuns: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="walks">Bases por bolas (BB)</Label>
        <Input id="walks" type="number" value={batterData.walks} onChange={(e) => setBatterData({ ...batterData, walks: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="strikeouts">Ponches (SO)</Label>
        <Input id="strikeouts" type="number" value={batterData.strikeouts} onChange={(e) => setBatterData({ ...batterData, strikeouts: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hitByPitch">Golpes por lanzamiento (HBP)</Label>
        <Input id="hitByPitch" type="number" value={batterData.hitByPitch} onChange={(e) => setBatterData({ ...batterData, hitByPitch: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sacrificeFlies">Flies de sacrificio (SF)</Label>
        <Input id="sacrificeFlies" type="number" value={batterData.sacrificeFlies} onChange={(e) => setBatterData({ ...batterData, sacrificeFlies: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="putouts">Putouts (PO)</Label>
        <Input id="putouts" type="number" value={batterData.putouts} onChange={(e) => setBatterData({ ...batterData, putouts: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assists">Asistencias (A)</Label>
        <Input id="assists" type="number" value={batterData.assists} onChange={(e) => setBatterData({ ...batterData, assists: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="errors">Errores (E)</Label>
        <Input id="errors" type="number" value={batterData.errors} onChange={(e) => setBatterData({ ...batterData, errors: e.target.value })} required />
      </div>
    </div>
  );

  // Pitchers
  const renderPitcherFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="earnedRuns">Carreras limpias (ER)</Label>
        <Input id="earnedRuns" type="number" step="0.01" value={pitcherData.earnedRuns} onChange={(e) => setPitcherData({ ...pitcherData, earnedRuns: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inningsPitched">Innings pitchados (IP)</Label>
        <Input id="inningsPitched" type="number" step="0.1" value={pitcherData.inningsPitched} onChange={(e) => setPitcherData({ ...pitcherData, inningsPitched: e.target.value })} placeholder="Ej: 5.1 o 5.2" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-hits">Hits (H)</Label>
        <Input id="pitcher-hits" type="number" value={pitcherData.hits} onChange={(e) => setPitcherData({ ...pitcherData, hits: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-walks">Bases por bolas (BB)</Label>
        <Input id="pitcher-walks" type="number" value={pitcherData.walks} onChange={(e) => setPitcherData({ ...pitcherData, walks: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-strikeouts">Ponches (SO)</Label>
        <Input id="pitcher-strikeouts" type="number" value={pitcherData.strikeouts} onChange={(e) => setPitcherData({ ...pitcherData, strikeouts: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-putouts">Putouts (PO)</Label>
        <Input id="pitcher-putouts" type="number" value={pitcherData.putouts} onChange={(e) => setPitcherData({ ...pitcherData, putouts: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-assists">Asistencias (A)</Label>
        <Input id="pitcher-assists" type="number" value={pitcherData.assists} onChange={(e) => setPitcherData({ ...pitcherData, assists: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitcher-errors">Errores (E)</Label>
        <Input id="pitcher-errors" type="number" value={pitcherData.errors} onChange={(e) => setPitcherData({ ...pitcherData, errors: e.target.value })} required />
      </div>
    </div>
  );
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Análisis de talento</h1>
          <p className="text-muted-foreground">Ingresa las estadísticas de uno o varios jugadores para generar una predicción.</p>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><User className="h-5 w-5 text-primary" /><span>Información del jugador</span></CardTitle>
            <CardDescription>Completa los campos para un nuevo jugador o selecciona uno existente para generar una nueva predicción.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Seleccionar jugador existente</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex-grow space-y-2">
                    <Label htmlFor="playerSelect">Cargar información de jugador (opcional)</Label>
                    <Select value={selectedPlayer} onValueChange={handlePlayerSelect}>
                      <SelectTrigger><SelectValue placeholder="Selecciona uno de tus jugadores" /></SelectTrigger>
                      <SelectContent>
                        {myPlayers.length > 0 ? ( myPlayers.map((player) => (<SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>)) ) : ( <SelectItem value="none" disabled>No tienes jugadores guardados</SelectItem> )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPlayer && ( <Button variant="ghost" size="icon" onClick={clearSelection} className="mt-auto" type="button"><XCircle className="h-5 w-5 text-muted-foreground" /></Button> )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Información personal</h3>
                <fieldset disabled={!!selectedPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="name">Nombre del jugador</Label><Input id="name" type="text" value={baseData.name} onChange={(e) => setBaseData({ ...baseData, name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label htmlFor="birthDate">Fecha de nacimiento</Label><Input id="birthDate" type="date" value={baseData.birthDate} onChange={(e) => setBaseData({ ...baseData, birthDate: e.target.value })} required /></div>
                  <div className="space-y-2"><Label htmlFor="weight">Peso (kg)</Label><Input id="weight" type="number" value={baseData.weight} onChange={(e) => setBaseData({ ...baseData, weight: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="height">Estatura (cm)</Label><Input id="height" type="number" value={baseData.height} onChange={(e) => setBaseData({ ...baseData, height: e.target.value })} /></div>
                </fieldset>
                <div className="space-y-2"><Label htmlFor="gamesPlayed">Juegos jugados (G)</Label><Input id="gamesPlayed" type="number" value={gamesPlayed} onChange={(e) => setGamesPlayed(e.target.value)} required /></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Posición del jugador</h3>
                <RadioGroup value={position} onValueChange={(value) => setPosition(value as 'batter' | 'pitcher')} disabled={!!selectedPlayer}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="batter" id="batter" /><Label htmlFor="batter">Bateador</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="pitcher" id="pitcher" /><Label htmlFor="pitcher">Pitcher</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Estadísticas {position === 'batter' ? 'de Bateo y Fildeo' : 'de Pitcheo y Fildeo'}</h3>
                {position === 'batter' ? renderBatterFields() : renderPitcherFields()}
              </div>
              <div className="flex justify-center pt-6">
                <Button type="submit" className={buttonVariants({ variant: "hero", size: "lg" })} disabled={isLoading} size="lg">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analizando...</>) : (<><Target className="mr-2 h-4 w-4" />Generar Predicción</>)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {user?.plan === 'avanzado' && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Upload className="h-5 w-5 text-primary" /><span>Carga archivos de jugadores</span></CardTitle>
                <CardDescription>Sube un archivo CSV o Excel. Asegúrate de seleccionar el tipo de jugador correcto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="space-y-2">
                  <Label className="text-center block">Tipo de jugadores en el archivo</Label>
                  <div className="flex justify-center space-x-2">
                    <Button type="button" variant={bulkFileType === 'batter' ? 'default' : 'outline'} onClick={() => setBulkFileType('batter')} className="min-w-32" >
                      Bateadores
                    </Button>
                    <Button type="button" variant={bulkFileType === 'pitcher' ? 'default' : 'outline'} onClick={() => setBulkFileType('pitcher')} className="min-w-32" >
                      Pitchers
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileUpload">Seleccionar archivo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                      <Input id="fileUpload" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="file:mr-4 file:py-2px file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
                      {selectedFile && (
                        <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground" onClick={clearSelectedFile} >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar plantilla
                    </Button>
                  </div>
                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Archivo seleccionado:</span>
                      <span>{selectedFile.name}</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {bulkFileType === 'batter' ? 'Bateadores' : 'Pitchers'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button onClick={handleFileSubmit} disabled={!selectedFile || isLoading} size="lg">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando archivo...</>
                    ) : (
                      <>Procesar archivo</>
                    )}
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Formato del archivo:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Descarga la plantilla y sube los datos de tus jugadores</li>
                    <li>• RECUERDA seleccionar el tipo de jugador con los botones de arriba para descargar la plantilla correcta.</li>
                    <li>• La columna Player debe contener el nombre completo del jugador</li>
                    <li>• Las columnas Weight y Height pueden estar vacias en caso de que no tengas esa informacion</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    </Layout>
  );
}