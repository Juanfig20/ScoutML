import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, User, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Definición de las interfaces directamente en este archivo
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
  // Propiedades opcionales para la estadística más reciente
  avg?: number | null;
  era?: number | null;
}

interface NewPlayerFormData {
  name: string;
  birth_date: string;
  weight: string;
  height: string;
  position: 'batter' | 'pitcher';
}

export default function MyPlayers() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayerData, setNewPlayerData] = useState<NewPlayerFormData>({
    name: '',
    birth_date: '',
    weight: '',
    height: '',
    position: 'batter',
  });
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PLAYERS_PER_PAGE = 6;
  const totalPages = Math.ceil(players.length / PLAYERS_PER_PAGE);
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const currentPlayers = players.slice(startIndex, endIndex);

  // Maneja bug de paginación
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (players.length > 0 && totalPages === 0) {
      setCurrentPage(1);
    }
  }, [players.length, totalPages, currentPage]);

  const fetchPlayers = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Error de autenticación',
        description: 'No se pudo obtener la sesión del usuario. Por favor, inicia sesión de nuevo.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        predictions(
          created_at,
          stats(
            avg,
            era
          )
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error al cargar jugadores',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const playersWithStats = data.map((player: any) => {
        const sortedPredictions = player.predictions.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestStats = sortedPredictions.length > 0 ? sortedPredictions[0].stats : null;
        return {
          ...player,
          avg: latestStats?.avg,
          era: latestStats?.era,
        };
      });
      setPlayers(playersWithStats);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const validatePlayerData = (data: { weight: string | number | null, height: string | number | null, birth_date: string }) => {
    const today = new Date().toISOString().split('T')[0];

    if (data.weight && parseFloat(data.weight.toString()) < 0) {
      return 'El peso no puede ser un valor negativo.';
    }
    if (data.height && parseFloat(data.height.toString()) < 0) {
      return 'La estatura no puede ser un valor negativo.';
    }
    if (new Date(data.birth_date) > new Date(today)) {
      return 'La fecha de nacimiento no puede ser posterior al día actual.';
    }

    return null;
  };

  const handleCreatePlayer = async () => {
    setIsAdding(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Error de autenticación',
        description: 'No se pudo obtener la sesión del usuario.',
        variant: 'destructive',
      });
      setIsAdding(false);
      return;
    }

    const { name, birth_date, weight, height, position } = newPlayerData;

    if (!name || !birth_date || !position) {
      toast({
        title: 'Datos incompletos',
        description: 'El nombre, fecha de nacimiento y posición son obligatorios.',
        variant: 'destructive',
      });
      setIsAdding(false);
      return;
    }

    const validationError = validatePlayerData({ weight, height, birth_date });
    if (validationError) {
      toast({
        title: 'Error de validación',
        description: validationError,
        variant: 'destructive',
      });
      setIsAdding(false);
      return;
    }

    const { data, error } = await supabase
      .from('players')
      .insert([{
        user_id: user.id,
        name,
        birth_date,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        position,
      }]);

    if (error) {
      toast({
        title: 'Error al agregar jugador',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Jugador agregado',
        description: 'El jugador ha sido agregado exitosamente.',
      });
      setNewPlayerData({
        name: '',
        birth_date: '',
        weight: '',
        height: '',
        position: 'batter',
      });
      setIsDialogOpen(false);
      fetchPlayers();
    }
    setIsAdding(false);
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;

    setIsUpdating(true);
    const { id, name, birth_date, weight, height, position } = editingPlayer;

    const validationError = validatePlayerData({ weight, height, birth_date });
    if (validationError) {
      toast({
        title: 'Error de validación',
        description: validationError,
        variant: 'destructive',
      });
      setIsUpdating(false);
      return;
    }

    const { data, error } = await supabase
      .from('players')
      .update({
        name,
        birth_date,
        weight: weight,
        height: height,
        position,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error al actualizar jugador',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Jugador actualizado',
        description: 'La información del jugador ha sido actualizada exitosamente.',
      });
      setIsEditDialogOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    }
    setIsUpdating(false);
  };

  const handleDeletePlayer = async (playerId: string) => {
    setDeletingPlayerId(playerId);

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      toast({
        title: 'Error al eliminar jugador',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Jugador eliminado',
        description: 'El jugador ha sido eliminado exitosamente.',
      });
      setPlayers(players.filter(p => p.id !== playerId));
    }
    setDeletingPlayerId(null);
  };

  const getPlayerStats = (player: Player) => {
    if (player.position === 'batter') {
      const battingAvg = player.avg;
      return `Promedio: ${battingAvg !== null && battingAvg !== undefined ? battingAvg.toFixed(3) : 'N/A'}`;
    } else {
      const era = player.era;
      return `ERA: ${era !== null && era !== undefined ? era.toFixed(2) : 'N/A'}`;
    }
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Mis jugadores</h1>
            <p className="text-muted-foreground">
              Gestiona todos los jugadores de los cuales has realizado predicciones anteriormente.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Agregar jugador</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar jugador</DialogTitle>
                <DialogDescription>
                  Completa la información básica del jugador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Nombre del jugador</Label>
                  <Input
                    id="playerName"
                    placeholder="Ej: Juan Pérez"
                    value={newPlayerData.name}
                    onChange={(e) => setNewPlayerData({ ...newPlayerData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerBirthDate">Fecha de nacimiento</Label>
                  <Input
                    id="playerBirthDate"
                    type="date"
                    value={newPlayerData.birth_date}
                    onChange={(e) => setNewPlayerData({ ...newPlayerData, birth_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerWeight">Peso (kg)</Label>
                    <Input
                      id="playerWeight"
                      type="number"
                      placeholder="70"
                      value={newPlayerData.weight}
                      onChange={(e) => setNewPlayerData({ ...newPlayerData, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playerHeight">Estatura (cm)</Label>
                    <Input
                      id="playerHeight"
                      type="number"
                      placeholder="175"
                      value={newPlayerData.height}
                      onChange={(e) => setNewPlayerData({ ...newPlayerData, height: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playerPosition">Posición</Label>
                  <Select
                    value={newPlayerData.position}
                    onValueChange={(value) => setNewPlayerData({ ...newPlayerData, position: value as 'batter' | 'pitcher' })}
                  >
                    <SelectTrigger id="playerPosition">
                      <SelectValue placeholder="Selecciona la posición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batter">Bateador</SelectItem>
                      <SelectItem value="pitcher">Pitcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePlayer} disabled={isAdding}>
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      'Agregar'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPlayers.map((player) => (
              <Card
                key={player.id}
                className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/player/${player.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{player.name}</CardTitle>
                        <CardDescription>
                          {getAge(player.birth_date)} años • {player.height}cm • {player.weight}kg
                        </CardDescription>
                      </div>
                    </div>

                    <Badge variant={player.position === 'batter' ? 'default' : 'secondary'}>
                      {player.position === 'batter' ? 'Bateador' : 'Pitcher'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{getPlayerStats(player)}</span>
                  </div>

                  <div className="flex justify-between space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer(player);
                        setIsEditDialogOpen(true);
                      }}
                      disabled={isUpdating || deletingPlayerId === player.id}
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>{isUpdating && editingPlayer?.id === player.id ? 'Guardando...' : 'Editar'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlayer(player.id);
                      }}
                      disabled={deletingPlayerId === player.id}
                    >
                      {deletingPlayerId === player.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3" />
                          <span>Eliminar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginación */}
        {players.length > PLAYERS_PER_PAGE && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Maneja la situación donde no hay jugadores aún */}
        {players.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay jugadores registrados</h3>
            <p className="text-muted-foreground mb-4">
              Agrega tu primer jugador para comenzar a hacer predicciones
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer jugador
            </Button>
          </div>
        )}

        {/* Dialogo de Edición */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar jugador</DialogTitle>
              <DialogDescription>
                Modifica la información del jugador.
              </DialogDescription>
            </DialogHeader>
            {editingPlayer && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editPlayerName">Nombre del jugador</Label>
                  <Input
                    id="editPlayerName"
                    placeholder="Ej: Juan Pérez"
                    value={editingPlayer.name}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPlayerBirthDate">Fecha de nacimiento</Label>
                  <Input
                    id="editPlayerBirthDate"
                    type="date"
                    value={editingPlayer.birth_date}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, birth_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editPlayerWeight">Peso (kg)</Label>
                    <Input
                      id="editPlayerWeight"
                      type="number"
                      placeholder="70"
                      value={editingPlayer.weight || ''}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, weight: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPlayerHeight">Estatura (cm)</Label>
                    <Input
                      id="editPlayerHeight"
                      type="number"
                      placeholder="175"
                      value={editingPlayer.height || ''}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, height: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPlayerPositon">Posición</Label>
                  <Select
                    value={editingPlayer.position}
                    onValueChange={(value) => setEditingPlayer({ ...editingPlayer, position: value as 'batter' | 'pitcher' })}
                  >
                    <SelectTrigger id="editPlayerPosition">
                      <SelectValue placeholder="Selecciona la posición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batter">Bateador</SelectItem>
                      <SelectItem value="pitcher">Pitcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdatePlayer} disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}