import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/Layout/Layout';
import { ArrowLeft, Calendar, TrendingUp, Weight, Ruler, Target, Award, Loader2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import defaultPlayerImage from '@/assets/default-player.jpg';

interface Player {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  weight: number | null;
  height: number | null;
  position: 'batter' | 'pitcher';
  created_at: string;
  updated_at: string;
  // Propiedades opcionales del fetch de stats
  avg?: number;
  obp?: number;
  slg?: number;
  ops?: number;
  k_percentage?: number;
  bb_k?: number;
  era?: number;
  whip?: number;
  k_9?: number;
  bb_9?: number;
  k_bb?: number;
  fpct?: number;
  rf?: number;
}

interface Prediction {
  id: number;
  created_at: string;
  player_id: string;
  is_prospect: boolean;
  prospect_percentage: number;
  ranking?: number;
  factores_positivos?: string[];
  factores_a_mejorar?: string[];
  jugador_comparable?: string;
  resumen?: string;
  // Relación con Stats
  stats: Stats | null;
}

interface Stats {
  id: number;
  created_at: string;
  prediction_id: number;
  player_id: string;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  k_percentage: number | null;
  bb_k: number | null;
  era: number | null;
  whip: number | null;
  k_9: number | null;
  bb_9: number | null;
  k_bb: number | null;
  fpct: number | null;
  rf: number | null;
}

interface FullPlayerProfile extends Player {
  predictions: (Prediction & { stats: Stats | null })[];
}

// Datos que alimentan el gráfico de radar
const ComparisonData = {
  mlb: {
    batter: { avg: 0.252, obp: 0.320, slg: 0.382, ops: 0.701, k_percentage: 23.41, bb_k: 0.395, fpct: 0.984, rf: 4.02 },
    pitcher: { era: 4.11, whip: 1.31, k_9: 8.03, bb_9: 3.17, k_bb: 2.53, fpct: 0.984, rf: 4.02 }
  },
  juveniles: {
    batter: { avg: 0.297, obp: 0.428, slg: 0.425, ops: 0.852, k_percentage: 23.15, bb_k: 0.810, fpct: 0.917, rf: 1.67 },
    pitcher: { era: 7.42, whip: 2.01, k_9: 8.64, bb_9: 7.00, k_bb: 1.23, fpct: 0.917, rf: 1.67 }
  },
  milb: {
    batter: { avg: 0.290, obp: 0.353, slg: 0.424, ops: 0.777, k_percentage: 17.54, bb_k: 0.513, fpct: 0.971, rf: 3.08 },
    pitcher: { era: 3.38, whip: 1.27, k_9: 8.22, bb_9: 3.30, k_bb: 2.49, fpct: 0.914, rf: 3.08 }
  }
};

// Datos de jugadores comparables en la sección "Comparación entre jugadores"
const MockComparisonPlayers = [
  { id: 'abreu', name: 'Bob Abreu', position: 'batter' as const, stats: { avg: 0.293, obp: 0.375, slg: 0.452, ops: 0.827, k_percentage: 21.21, bb_k: 0.628, fpct: 1.0, rf: 0.03 }, image: 'https://midfield.mlbstatic.com/v1/people/110029/spots/240?zoom=1.2' },
  { id: 'acuna', name: 'Luisangel Acuña', position: 'batter' as const, stats: { avg: 0.281, obp: 0.351, slg: 0.401, ops: 0.752, k_percentage: 21.46, bb_k: 0.501, fpct: 0.959, rf: 3.29 }, image: 'https://midfield.mlbstatic.com/v1/people/682668/spots/240?zoom=1.2' },
  { id: 'acunajr', name: 'Ronald Acuña Jr.', position: 'batter' as const, stats: { avg: 0.304, obp: 0.378, slg: 0.474, ops: 0.852, k_percentage: 23.94, bb_k: 0.46, fpct: 0.98, rf: 1.64 }, image: 'https://midfield.mlbstatic.com/v1/people/660670/spots/240?zoom=1.2' },
  { id: 'altuve', name: 'José Altuve', position: 'batter' as const, stats: { avg: 0.322, obp: 0.381, slg: 0.473, ops: 0.854, k_percentage: 12.38, bb_k: 0.75, fpct: 0.97, rf: 4.19 }, image: 'https://midfield.mlbstatic.com/v1/people/514888/spots/240?zoom=1.2' },
  { id: 'arraez', name: 'Luis Arraez', position: 'batter' as const, stats: { avg: 0.331, obp: 0.385, slg: 0.413, ops: 0.798, k_percentage: 8.98, bb_k: 0.953, fpct: 0.982, rf: 3.64 }, image: 'https://midfield.mlbstatic.com/v1/people/650333/spots/240?zoom=1.2' },
  { id: 'cabrera', name: 'Miguel Cabrera', position: 'batter' as const, stats: { avg: 0.286, obp: 0.35, slg: 0.431, ops: 0.781, k_percentage: 18.35, bb_k: 0.5, fpct: 0.0, rf: 0.0 }, image: 'https://midfield.mlbstatic.com/v1/people/408234/spots/240?zoom=1.2' },
  { id: 'escobar', name: 'Alcides Escobar', position: 'batter' as const, stats: { avg: 0.291, obp: 0.333, slg: 0.388, ops: 0.721, k_percentage: 16.40, bb_k: 0.353, fpct: 0.958, rf: 3.92 }, image: 'https://midfield.mlbstatic.com/v1/people/444876/spots/240?zoom=1.2' },
  { id: 'gimenez', name: 'Andrés Giménez', position: 'batter' as const, stats: { avg: 0.278, obp: 0.354, slg: 0.416, ops: 0.77, k_percentage: 20.07, bb_k: 0.429, fpct: 0.969, rf: 3.86 }, image: 'https://midfield.mlbstatic.com/v1/people/665926/spots/240?zoom=1.2' },
  { id: 'perez', name: 'Salvador Pérez', position: 'batter' as const, stats: { avg: 0.29, obp: 0.331, slg: 0.404, ops: 0.735, k_percentage: 10.99, bb_k: 0.514, fpct: 0.988, rf: 7.35 }, image: 'https://midfield.mlbstatic.com/v1/people/521692/spots/240?zoom=1.2' },
  { id: 'sandoval', name: 'Pablo Sandoval', position: 'batter' as const, stats: { avg: 0.297, obp: 0.338, slg: 0.444, ops: 0.782, k_percentage: 13.50, bb_k: 0.421, fpct: 0.984, rf: 5.78 }, image: 'https://midfield.mlbstatic.com/v1/people/467055/spots/240?zoom=1.2' },
  { id: 'santander', name: 'Anthony Santander', position: 'batter' as const, stats: { avg: 0.27, obp: 0.335, slg: 0.45, ops: 0.785, k_percentage: 21.77, bb_k: 0.384, fpct: 0.981, rf: 1.36 }, image: 'https://midfield.mlbstatic.com/v1/people/623993/spots/240?zoom=1.2' },
  { id: 'suarez', name: 'Eugenio Suárez', position: 'batter' as const, stats: { avg: 0.276, obp: 0.362, slg: 0.417, ops: 0.779, k_percentage: 21.02, bb_k: 0.524, fpct: 0.952, rf: 4.29 }, image: 'https://midfield.mlbstatic.com/v1/people/553993/spots/240?zoom=1.2' },
  { id: 'vizquel', name: 'Omar Vizquel', position: 'batter' as const, stats: { avg: 0.243, obp: 0.311, slg: 0.313, ops: 0.624, k_percentage: 10.32, bb_k: 0.923, fpct: 1.0, rf: 0.0 }, image: 'https://midfield.mlbstatic.com/v1/people/123744/spots/240?zoom=1.2' },
  { id: 'alvarado', name: 'José Alvarado', position: 'pitcher' as const, stats: { era: 3.50, whip: 1.40, k_9: 10.26, bb_9: 5.88, k_bb: 1.75, fpct: 0.681, rf: 1.02 }, image: 'https://midfield.mlbstatic.com/v1/people/621237/spots/240?zoom=1.2' },
  { id: 'alvarez', name: 'Wilson Álvarez', position: 'pitcher' as const, stats: { era: 2.93, whip: 1.29, k_9: 7.45, bb_9: 3.68, k_bb: 2.03, fpct: 1.0, rf: 3.26 }, image: 'https://midfield.mlbstatic.com/v1/people/110209/spots/240?zoom=1.2' },
  { id: 'chacin', name: 'Jhoulys Chacín', position: 'pitcher' as const, stats: { era: 2.73, whip: 1.17, k_9: 7.40, bb_9: 2.84, k_bb: 2.61, fpct: 0.957, rf: 2.48 }, image: 'https://midfield.mlbstatic.com/v1/people/468504/spots/240?zoom=1.2' },
  { id: 'garcia', name: 'Freddy García', position: 'pitcher' as const, stats: { era: 3.47, whip: 1.24, k_9: 7.46, bb_9: 2.56, k_bb: 2.91, fpct: 0.933, rf: 1.95 }, image: 'https://midfield.mlbstatic.com/v1/people/150119/spots/240?zoom=1.2' },
  { id: 'hernandez', name: 'Félix Hernández', position: 'pitcher' as const, stats: { era: 2.22, whip: 1.14, k_9: 10.84, bb_9: 3.74, k_bb: 3.12, fpct: 0.958, rf: 0.89 }, image: 'https://midfield.mlbstatic.com/v1/people/433587/spots/240?zoom=1.2' },
  { id: 'lopez', name: 'Pablo López', position: 'pitcher' as const, stats: { era: 3.09, whip: 1.07, k_9: 7.11, bb_9: 1.39, k_bb: 5.11, fpct: 0.917, rf: 4.21 }, image: 'https://midfield.mlbstatic.com/v1/people/641154/spots/240?zoom=1.2' },
  { id: 'perezm', name: 'Martín Pérez', position: 'pitcher' as const, stats: { era: 4.05, whip: 1.43, k_9: 7.70, bb_9: 3.47, k_bb: 2.22, fpct: 0.916, rf: 3.38 }, image: 'https://midfield.mlbstatic.com/v1/people/527048/spots/240?zoom=1.2' },
  { id: 'rodriguez', name: 'Francisco Rodríguez', position: 'pitcher' as const, stats: { era: 3.65, whip: 1.27, k_9: 11.79, bb_9: 3.95, k_bb: 2.99, fpct: 1.0, rf: 2.61 }, image: 'https://midfield.mlbstatic.com/v1/people/408061/spots/240?zoom=1.2' },
  { id: 'sanchez', name: 'Aníbal Sánchez', position: 'pitcher' as const, stats: { era: 2.91, whip: 1.13, k_9: 10.07, bb_9: 3.02, k_bb: 3.33, fpct: 0.909, rf: 3.12 }, image: 'https://midfield.mlbstatic.com/v1/people/434671/spots/240?zoom=1.2' },
  { id: 'santana', name: 'Johan Santana', position: 'pitcher' as const, stats: { era: 4.70, whip: 1.37, k_9: 9.16, bb_9: 3.36, k_bb: 2.73, fpct: 1.0, rf: 2.63 }, image: 'https://midfield.mlbstatic.com/v1/people/276371/spots/240?zoom=1.2' },
  { id: 'zambrano', name: 'Carlos Zambrano', position: 'pitcher' as const, stats: { era: 3.53, whip: 1.37, k_9: 7.20, bb_9: 4.26, k_bb: 1.69, fpct: 1.0, rf: 1.11 }, image: 'https://midfield.mlbstatic.com/v1/people/407296/spots/240?zoom=1.2' },
];

const getRatingInfo = (isProspect: boolean, ranking: number | undefined) => {
  const rank = ranking || 0;
  let text = 'Promedio';
  let badgeColorClass = 'bg-yellow-500 text-white';
  let textColorClass = 'text-yellow-600';

  if (!isProspect) {
    if (rank >= 50 && rank < 70) {
      text = 'Potencial de mejora';
      badgeColorClass = 'bg-orange-500 text-white';
      textColorClass = 'text-orange-600';
    } else {
      text = 'Bajo rendimiento';
      badgeColorClass = 'bg-red-500 text-white';
      textColorClass = 'text-red-600';
    }
  } else {
    if (rank >= 85) {
      text = 'Gran potencial';
      badgeColorClass = 'bg-green-500 text-white';
      textColorClass = 'text-green-600';
    } else if (rank >= 70) {
      text = 'Buen potencial';
      badgeColorClass = 'bg-blue-500 text-white';
      textColorClass = 'text-blue-600';
    }
  }

  return { text, badgeColorClass, textColorClass };
};

const normalizationRanges: { [key: string]: { min: number, max: number, inverse?: boolean } } = {
  avg: { min: 0.0, max: 0.400 }, obp: { min: 0.0, max: 0.500 }, slg: { min: 0.0, max: 0.800 }, ops: { min: 0.0, max: 1.200 }, k_percentage: { min: 0.0, max: 50.0, inverse: true }, bb_k: { min: 0.0, max: 2.000 }, fpct: { min: 0.850, max: 1.000 }, rf: { min: 0.0, max: 6.0 },
  era: { min: 0.0, max: 10.0, inverse: true }, whip: { min: 0.5, max: 3.0, inverse: true }, k_9: { min: 4.0, max: 15.0 }, bb_9: { min: 1.0, max: 8.0, inverse: true }, k_bb: { min: 0.5, max: 6.0 },
};

// Función de normalización de datos
const normalizeValue = (value: number, key: string) => {
  const range = normalizationRanges[key];
  if (!range) {console.error(`Missing normalization range for key: ${key}`); return 0;}
  const normalized = (value - range.min) / (range.max - range.min);
  const clamped = Math.max(0, Math.min(1, normalized));
  return range.inverse ? (1 - clamped) * 100 : clamped * 100;
};

const StatDisplayNames: Record<string, string> = {
  avg: 'AVG', obp: 'OBP', slg: 'SLG', ops: 'OPS', k_percentage: 'K%', bb_k: 'BB/K', fpct: 'FPCT', rf: 'RF',
  era: 'ERA', whip: 'WHIP', k_9: 'K/9', bb_9: 'BB/9', k_bb: 'K/BB'
};

const getRadarData = (stats: Stats | undefined, comparisonType: string, position: 'batter' | 'pitcher') => {
  if (!stats) return [];
  
  const comparison = ComparisonData[comparisonType]?.[position];
  
  const radarKeys = position === 'batter' ? 
    ['avg', 'obp', 'slg', 'ops', 'k_percentage', 'bb_k', 'fpct', 'rf'] : 
    ['era', 'whip', 'k_9', 'bb_9', 'k_bb', 'fpct', 'rf'];

  return radarKeys.map(key => ({
    stat: StatDisplayNames[key],
    player: stats[key as keyof Stats] !== null ? normalizeValue(Number(stats[key as keyof Stats]), key) : 0,
    comparison: comparison ? normalizeValue(comparison[key as keyof typeof comparison], key) : 0
  }));
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateAge = (birth_date: string) => {
  const today = new Date();
  const birth = new Date(birth_date);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

const formatStatValue = (value: number | null | undefined, statKey: string) => {
  if (value === null || value === undefined) return 'N/A';
  const decimalPlaces = ['avg', 'obp', 'slg', 'ops', 'bb_k', 'fpct'].includes(statKey) ? 3 : 2;
  return value.toFixed(decimalPlaces);
};

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [playerProfile, setPlayerProfile] = useState<FullPlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPredictionId, setSelectedPredictionId] = useState<number | null>(null);
  const [comparisonType, setComparisonType] = useState<string>('mlb');
  const [selectedComparisonPlayer, setSelectedComparisonPlayer] = useState<string>('');
  
  useEffect(() => {
    const fetchPlayerProfile = async () => {
      if (!id) return;
      setIsLoading(true);

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single();
      
      if (playerError) {
        console.error('Error fetching player:', playerError);
        setIsLoading(false);
        return;
      }

      const { data: predictions, error: predictionsError } = await supabase
        .from('predictions')
        .select(`
          *,
          stats (
            *
          )
        `)
        .eq('player_id', id)
        .order('created_at', { ascending: false });

      if (predictionsError) {
        console.error('Error fetching predictions:', predictionsError);
        setIsLoading(false);
        return;
      }
      
      const typedPlayer = {
        ...player,
        position: player.position as 'batter' | 'pitcher',
      };

      setPlayerProfile({ ...typedPlayer, predictions: predictions as (Prediction & { stats: Stats | null })[] });
      
      if (predictions.length > 0) {
        setSelectedPredictionId(predictions[0].id);
      }
      
      const defaultComparisonPlayer = MockComparisonPlayers.find(p => p.position === player.position);
      if(defaultComparisonPlayer) {
        setSelectedComparisonPlayer(defaultComparisonPlayer.id);
      }
      
      setIsLoading(false);
    };

    fetchPlayerProfile();
  }, [id]);

  const currentPrediction = playerProfile?.predictions.find(p => p.id === selectedPredictionId);
  const latestPrediction = playerProfile?.predictions[0];
  const player = playerProfile;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p>Cargando perfil del jugador...</p>
        </div>
      </Layout>
    );
  }

  if (!playerProfile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Jugador no encontrado</h1>
          <p className="text-muted-foreground">Regresa a la lista para añadir uno nuevo.</p>
          <Link to="/my-players">
            <Button>Volver a Mis Jugadores</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (playerProfile.predictions.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{player.name}</h1>
          <p className="text-muted-foreground">No se ha encontrado ningún informe para este jugador.</p>
          <Link to="/my-players">
            <Button>Volver a Mis Jugadores</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const age = calculateAge(player.birth_date);
  const radarData = getRadarData(currentPrediction?.stats, comparisonType, player.position);
  const positiveFactors = currentPrediction?.factores_positivos || [];
  const improvementFactors = currentPrediction?.factores_a_mejorar || [];
  const playerRanking = {
    rank: currentPrediction?.ranking || 'N/A',
    description: currentPrediction?.resumen || 'No hay resumen disponible.',
  };
  const comparisonPlayer = MockComparisonPlayers.find(p => p.id === selectedComparisonPlayer);

  const getPlayerStatsForTable = (stats: Stats | null, position: 'batter' | 'pitcher') => {
    if (!stats) return [];
    
    const statKeys = position === 'batter' ? 
      ['avg', 'obp', 'slg', 'ops', 'k_percentage', 'bb_k', 'fpct', 'rf'] :
      ['era', 'whip', 'k_9', 'bb_9', 'k_bb', 'fpct', 'rf'];
    
    return statKeys.map(key => ({
      key,
      stat: StatDisplayNames[key],
      playerValue: stats[key as keyof Stats],
      comparisonValue: comparisonPlayer?.stats[key as keyof typeof comparisonPlayer.stats]
    }));
  };

  const playerComparisonData = getPlayerStatsForTable(currentPrediction?.stats || null, player.position);
  
  // Lista de estadísticas donde un valor menor es mejor
  const inverseStats = ['era', 'whip', 'bb_9', 'k_percentage'];

  const latestRatingInfo = getRatingInfo(latestPrediction?.is_prospect ?? false, latestPrediction?.ranking);
const currentRatingInfo = getRatingInfo(currentPrediction?.is_prospect ?? false, currentPrediction?.ranking);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link to="/my-players">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Perfil del jugador</h1>
            <p className="text-muted-foreground">Análisis detallado e historial de predicciones</p>
          </div>
        </div>

        {/* Player Info Card */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Player Image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={defaultPlayerImage}
                    alt={`${player.name} profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Player Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{player.name}</h2>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {player.position === 'batter' ? 'Bateador' : 'Pitcher'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Edad</p>
                      <p className="font-semibold">{age} años</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Weight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="font-semibold">{player.weight || 'N/A'} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estatura</p>
                      <p className="font-semibold">{player.height || 'N/A'} cm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Prediction */}
              {latestPrediction && (
                <div className="flex-shrink-0 md:w-80">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <span>Última predicción</span>
                      </CardTitle>
                      <CardDescription>
                        {formatDate(latestPrediction.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <Badge className={latestRatingInfo.badgeColorClass}>
                          {latestRatingInfo.text}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Rendimiento general</span>
                          <span className="font-semibold">{latestPrediction.ranking || 0}%</span>
                        </div>
                        <Progress value={latestPrediction.ranking || 0} className="h-3" indicatorClassName={latestRatingInfo.badgeColorClass}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prediction Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prediction Selection and Results */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Resultados de la predicción</CardTitle>
              <CardDescription>
                Selecciona un informe para ver los resultados detallados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prediction Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Seleccionar informe:</label>
                <Select value={String(selectedPredictionId)} onValueChange={(value) => setSelectedPredictionId(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un informe" />
                  </SelectTrigger>
                  <SelectContent>
                    {player.predictions.map((prediction) => (
                      <SelectItem key={prediction.id} value={String(prediction.id)}>
                        {formatDate(prediction.created_at)} - {prediction.ranking || 'N/A'}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentPrediction && (
                <>
                  {/* Rating Display */}
                  <div className="text-center space-y-4">
                    <div className={`text-6xl font-bold ${currentRatingInfo.textColorClass.split(' ')[0]}`}>
                      {currentPrediction.is_prospect ? 'Prospecto' : 'No prospecto'}
                    </div>
                    <Badge className={currentRatingInfo.badgeColorClass}>
                      {currentRatingInfo.text}
                    </Badge>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rendimiento general</span>
                        <span className="font-semibold">{currentPrediction.ranking || 0}%</span>
                      </div>
                      <Progress value={currentPrediction.ranking || 0} className="h-4" indicatorClassName={currentRatingInfo.badgeColorClass}
                      />
                    </div>
                    
                    {/* Ranking and Description */}
                    <div className="space-y-3 mt-6 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Resumen:</span>
                      </div>
                      <p className="text-base text-muted-foreground">
                        {playerRanking.description}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Comparación de estadísticas</CardTitle>
              <CardDescription>
                Compara las estadísticas del jugador con promedios de diferentes niveles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comparison Type Buttons */}
              <div>
                <label className="text-sm font-medium mb-3 block">Comparar con</label>
                <div className="flex space-x-2">
                  <Button
                    variant={comparisonType === 'mlb' ? 'default' : 'outline'}
                    onClick={() => setComparisonType('mlb')}
                    className="flex-1"
                  >
                    MLB
                  </Button>
                  <Button
                    variant={comparisonType === 'juveniles' ? 'default' : 'outline'}
                    onClick={() => setComparisonType('juveniles')}
                    className="flex-1"
                  >
                    Juveniles
                  </Button>
                  <Button
                    variant={comparisonType === 'milb' ? 'default' : 'outline'}
                    onClick={() => setComparisonType('milb')}
                    className="flex-1"
                  >
                    MiLB
                  </Button>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar
                      name="Jugador"
                      dataKey="player"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name={comparisonType === 'mlb' ? 'MLB' : comparisonType === 'juveniles' ? 'Juveniles' : 'MiLB'}
                      dataKey="comparison"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positive Factors */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-600" />
              <span>Factores positivos</span>
            </CardTitle>
            <CardDescription>
              Estadísticas en las que el jugador destaca.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {positiveFactors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {positiveFactors.map((factor: any, index: any) => (
                  <Card key={index} className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center space-y-2">
                      <h4 className="font-semibold text-green-800">{factor.metrica}</h4>
                      <div className="text-2xl font-bold text-green-600">{typeof factor.valor === 'number' ? factor.valor.toFixed(3) : factor.valor}</div>
                      <div className="text-sm text-green-700">
                        Percentil {factor.percentil}
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${factor.percentil}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground"> No se encontraron factores positivos. </div>
            )}
          </CardContent>
        </Card>

        {/* Improvement Factors */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-red-600" />
              <span>Factores a mejorar</span>
            </CardTitle>
            <CardDescription>
              Áreas específicas que requieren desarrollo adicional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {improvementFactors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {improvementFactors.map((factor: any, index: any) => (
                  <Card key={index} className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-center space-y-2">
                      <h4 className="font-semibold text-red-800">{factor.metrica}</h4>
                      <p className="text-2xl font-bold text-red-700">{typeof factor.actual === 'number' ? factor.actual.toFixed(3) : factor.actual}</p>
                      <p className="text-sm text-red-600">Percentil {factor.percentil}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground"> No se encontraron factores a mejorar. </div>
            )}
          </CardContent>
        </Card>

        {/* Player Comparison */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Comparación entre jugadores</span>
            </CardTitle>
            <CardDescription>
              Compara directamente las estadísticas del jugador con venezolanes destacados en su paso por las Ligas Menores (MiLB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player Selector */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-4 block">Comparar con</label>
              <Carousel className="w-full max-w-3xl mx-auto">
                <CarouselContent className="-ml-3">
                  {MockComparisonPlayers
                    .filter(p => p.position === player.position)
                    .map((compPlayer) => (
                    <CarouselItem key={compPlayer.id} className="pl-3 basis-auto">
                      <button
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                          selectedComparisonPlayer === compPlayer.id 
                            ? 'bg-green-700 text-white shadow-lg transform scale-105' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setSelectedComparisonPlayer(compPlayer.id)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={compPlayer.image}
                            alt={`${compPlayer.name} profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = defaultPlayerImage;
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">
                          {compPlayer.name}
                        </span>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hover:scale-110 transition-transform" />
                <CarouselNext className="hover:scale-110 transition-transform" />
              </Carousel>
            </div>

            {/* Comparison Display */}
            <div className="space-y-4">
              {currentPrediction && comparisonPlayer && (
                <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-center py-2 border-b">
                  <div>{player.name}</div>
                  <div>Estadística</div>
                  <div>{comparisonPlayer?.name}</div>
                </div>
              )}
              
              {currentPrediction && currentPrediction.stats && (
                playerComparisonData.map((stat, index) => {
                  const playerVal = stat.playerValue !== null ? formatStatValue(Number(stat.playerValue), stat.key) : 'N/A';
                  const compVal = stat.comparisonValue !== null ? formatStatValue(stat.comparisonValue, stat.key) : 'N/A';
                  
                  const isInverse = inverseStats.includes(stat.key);
                  
                  const rawPlayerVal = stat.playerValue !== null ? stat.playerValue : (isInverse ? Infinity : -Infinity);
                  const rawCompVal = stat.comparisonValue !== null ? stat.comparisonValue : (isInverse ? Infinity : -Infinity);
                  
                  const isPlayerBetter = isInverse ? Number(rawPlayerVal) < Number(rawCompVal) : Number(rawPlayerVal) > Number(rawCompVal);
                  const isComparisonBetter = isInverse ? Number(rawCompVal) < Number(rawPlayerVal) : Number(rawCompVal) > Number(rawPlayerVal);

                  return (
                    <div key={index} className="grid grid-cols-3 gap-4 text-center py-3 border-b border-muted">
                      <div className={`font-semibold text-primary p-2 rounded ${
                        isPlayerBetter ? 'bg-green-100 dark:bg-green-900/20' : ''
                      }`}>
                        {playerVal}
                      </div>
                      <div className="text-muted-foreground flex items-center justify-center">{stat.stat}</div>
                      <div className={`font-semibold text-secondary p-2 rounded ${
                        isComparisonBetter ? 'bg-green-100 dark:bg-green-900/20' : ''
                      }`}>
                        {compVal}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}