import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Layout } from '@/components/Layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Target, Plus, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { supabase } from '@/integrations/supabase/client';

interface PlayerPrediction {
  id: string;
  playerName: string;
  position: string;
  ranking: number | null;
  isProspect: boolean;
  date: string;
  analysis: string;
  player_id: string;
}

const getClassificationInfo = (isProspect: boolean, ranking: number | null) => {
  const rank = ranking || 0;
  let text = 'Promedio';
  let color = 'bg-yellow-500 text-white';

  if (!isProspect) {
    text = 'No prospecto';
    color = 'bg-red-500 text-white';
  } else {
    if (rank >= 85) {
      text = 'Gran potencial';
      color = 'bg-green-500 text-white';
    } else if (rank >= 70) {
      text = 'Buen potencial';
      color = 'bg-blue-500 text-white';
    }
  }

  return { text, color };
};

export default function Dashboard() {
  const { user } = useAuth();
  const profile = user;

  const [predictions, setPredictions] = useState<PlayerPrediction[]>([]);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [averageTalent, setAverageTalent] = useState(0);
  const [latestPrediction, setLatestPrediction] = useState<PlayerPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select(
          `
          id,
          created_at,
          player_id,
          is_prospect,
          ranking,
          resumen,
          players (
            name,
            position
          )
          `
        )
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      const formattedPredictions: PlayerPrediction[] = data.map((prediction: any) => {
        return {
          id: prediction.id.toString(),
          player_id: prediction.player_id,
          playerName: prediction.players.name,
          position: prediction.players.position,
          ranking: prediction.ranking,
          isProspect: prediction.is_prospect,
          date: new Date(prediction.created_at).toISOString().split('T')[0],
          analysis: prediction.resumen || 'Análisis no disponible.',
        };
      });

      setPredictions(formattedPredictions);
      if (formattedPredictions.length > 0) {
        setLatestPrediction(formattedPredictions[0]);
      } else {
        setLatestPrediction(null);
      }

      // Calcular Total Predicciones
      const { count, error: countError } = await supabase
        .from('predictions')
        .select('*', { count: 'exact' });

      if (countError) {
        throw countError;
      }
      setTotalPredictions(count || 0);

      // Calcular promedio de rendimieto
      const { data: allRankings, error: avgError } = await supabase
        .from('predictions')
        .select('ranking');

      if (avgError) {
        throw avgError;
      }

      if (allRankings && allRankings.length > 0) {
        const sumRankings = allRankings.reduce((sum, p) => sum + (p.ranking || 0), 0);
        setAverageTalent(Math.round(sumRankings / allRankings.length));
      } else {
        setAverageTalent(0);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err.message);
      setError('No se pudieron cargar las predicciones. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  let trendInfo = {
    arrow: '',
    value: 'N/A',
    description: 'Se necesitan 2 predicciones',
    color: 'text-muted-foreground'
  };

  if (predictions.length >= 2) {
    const latestRanking = predictions[0].ranking || 0;
    const previousRanking = predictions[1].ranking || 0;
    const difference = latestRanking - previousRanking;
    const absDifference = Math.abs(difference);

    if (difference > 0) {
      trendInfo = {
        arrow: '↑',
        value: `${absDifference}%`,
        description: 'Rendimiento en aumento',
        color: 'text-green-600'
      };
    } else if (difference < 0) {
      trendInfo = {
        arrow: '↓',
        value: `${absDifference}%`,
        description: 'Rendimiento en descenso',
        color: 'text-red-600'
      };
    } else {
      trendInfo = {
        arrow: '→',
        value: '0%',
        description: 'Sin cambios',
        color: 'text-muted-foreground'
      };
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p className="text-red-500">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido, {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}. Calcula y analiza el potencial que tienen los jugadores jóvenes de béisbol.
            </p>
          </div>
          <Link to="/player-form">
            <Button className={buttonVariants({ variant: "hero" })}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Análisis
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de predicciones</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalPredictions}</div>
              <p className="text-xs text-muted-foreground">
                +2 desde la semana pasada
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rendimiento promedio</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{averageTalent}%</div>
              <p className="text-xs text-muted-foreground">
                +5 desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${trendInfo.color}`}>{trendInfo.arrow} {trendInfo.value}</div>
              <p className="text-xs text-muted-foreground">{trendInfo.description}</p>
            </CardContent>
          </Card>
        </div>
        {predictions.length > 0 ? (
          <>
            {/* Latest Prediction */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>Última predicción</span>
                </CardTitle>
                <CardDescription>
                  Resultado del análisis más reciente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestPrediction && (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                      <div>
                        <h3 className="text-xl font-semibold">{latestPrediction.playerName}</h3>
                        <p className="text-muted-foreground capitalize">
                          {latestPrediction.position === 'batter' ? 'Bateador' : 'Pitcher'}
                        </p>
                      </div>
                      <Badge className={getClassificationInfo(latestPrediction.isProspect, latestPrediction.ranking).color}>
                        {getClassificationInfo(latestPrediction.isProspect, latestPrediction.ranking).text}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rendimiento del jugador</span>
                        <span className="font-semibold">{latestPrediction.ranking}%</span>
                      </div>
                      <Progress value={latestPrediction.ranking || 0} className='h-3' indicatorClassName={getClassificationInfo(latestPrediction.isProspect, latestPrediction.ranking).color}/>
                    </div>

                    <p className="text-muted-foreground">{latestPrediction.analysis}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Predictions History */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Historial de predicciones</CardTitle>
                <CardDescription>
                  Últimos análisis de talento realizados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead>Rendimiento</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((prediction, index) => (
                      <TableRow key={prediction.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link
                            to={`/player/${prediction.player_id}`}
                            className="text-primary hover:underline"
                          >
                            {prediction.playerName}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">
                          {prediction.position === 'batter' ? 'Bateador' : 'Pitcher'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{prediction.ranking}%</span>
                            <Progress value={prediction.ranking || 0} className="w-16 h-2" indicatorClassName={getClassificationInfo(prediction.isProspect, prediction.ranking).color}/>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getClassificationInfo(prediction.isProspect, prediction.ranking).color}>
                            {getClassificationInfo(prediction.isProspect, prediction.ranking).text}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(prediction.date).toLocaleDateString('es-ES')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay predicciones todavía</h3>
            <p className="text-muted-foreground mb-4">
              Realiza tu primer análisis para ver los resultados aquí.
            </p>
            <Link to="/player-form">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Realizar análisis
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}