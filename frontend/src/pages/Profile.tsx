import React, { useState, useEffect } from 'react';
// 1. Importa 'useNavigate' para poder redirigir al usuario
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Save, Crown, CreditCard, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = 'http://127.0.0.1:8000/api/users';
const BILLING_API_URL = 'http://127.0.0.1:8000/api/billing';

export const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

 

  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Las contraseñas nuevas no coinciden"
        });
        setIsLoading(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La contraseña debe tener al menos 6 caracteres"
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const payload = {
        user_id: user?.user_id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        new_password: formData.newPassword || null,
      };

      
      await axios.post(`${API_URL}/api/users/profile/`, payload);

      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados exitosamente"
      });
      
      setFormData(prev => ({ 
        ...prev, 
        newPassword: '', 
        confirmPassword: '' 
      }));

    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.error 
        ? error.response.data.error 
        : "Error al actualizar el perfil";

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleChangePlan = () => {
    navigate('/plans');
  };

   const handleCancelSubscription = async () => {
    if (!user || !user.user_id) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }

    setIsCancelling(true);
    try {
        const response = await fetch(`${API_URL}/api/billing/cancel-subscription/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID: user.user_id }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo cancelar la suscripción.");
        }
        
        toast({
            title: "Suscripción Cancelada",
            description: "Has sido cambiado al plan Gratuito. La página se recargará.",
        });

        // Recargamos la página para que el AuthProvider actualice el estado del usuario
        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
        toast({
            title: "Error al cancelar",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsCancelling(false);
    }
  };

  
  const getPlanBadgeVariant = (plan: string | null | undefined) => {
    switch (plan?.toLowerCase()) {
      case 'avanzado':
        return 'default';
      case 'medio':
        return 'secondary';
      case 'basico':
        return 'outline';
      default: 
        return 'outline';
    }
  };

  
  const capitalize = (s: string | null | undefined) => {
    if (!s) return 'Gratis';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Actualiza tu información personal y configuración de cuenta.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Mi Suscripción</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan actual</p>
                <div className="flex items-center space-x-2 mt-1">
                  
                  <span className="text-lg font-semibold">{capitalize(user?.plan)}</span>
                  <Badge variant={getPlanBadgeVariant(user?.plan)}>
                    {capitalize(user?.plan)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={handleChangePlan}
                className="flex items-center space-x-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>Cambiar plan</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={user?.plan === 'gratis' || !user?.plan}
                className="flex items-center space-x-2 hover:bg-red-200 hover:border-red-500"
              >
                <X className="h-4 w-4" />
                <span>Cancelar suscripción</span>
              </Button>
            </div>

            {(user?.plan === 'gratis' || !user?.plan) && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Estás usando el plan gratuito. Actualiza para acceder a funcionalidades premium.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Información Personal</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Tu apellido"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="tu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Nueva contraseña"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirmar contraseña"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Deja los campos en blanco si no quieres cambiar tu contraseña
                </p>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isLoading ? 'Guardando...' : 'Guardar cambios'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};