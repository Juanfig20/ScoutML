import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout/Layout';
import { Check, Loader2, Award, Medal, Trophy, Copy } from 'lucide-react';
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import type { PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const plansData = [
    {
      name: 'Rookie',
      price: '$19',
      period: '/mes',
      description: 'Ideal para entrenadores que recién comienzan',
      icon: Award,
      features: [
       'Hasta 10 jugadores',
       'Predicciones básicas',
       'Reportes en PDF',
       'Soporte por email',
       'Dashboard básico'
     ],
      popular: false,
      color: 'from-[#51c279] to-[#398855]',
      planId: 'basico'
    },
    {
      name: 'Pro',
    price: '$49',
    period: '/mes',
    description: 'Para entrenadores profesionales y equipos',
    icon: Medal,
    features: [
      'Hasta 50 jugadores',
      'Predicciones avanzadas',
      'Análisis comparativo',
      'Reportes detallados',
      'Dashboard completo',
      'Soporte prioritario',
      'Exportación de datos'
    ],
    popular: true,
    color: 'from-[#419b61] to-[#29613d] ',
      planId: 'medio'
    },
    {
      name: 'All-Star',
    price: '$99',
    period: '/mes',
    description: 'Para organizaciones y ligas profesionales',
    icon: Trophy,
    features: [
      'Jugadores ilimitados',
      'IA predictiva avanzada',
      'Análisis de video',
      'Reportes personalizados',
      'Dashboard analítico',
      'Soporte 24/7',
      'API personalizada',
      'Consultoría especializada'
    ],
    popular: false,
    color: 'from-[#317449] to-[#183a24]',
      planId: 'avanzado'
    }
];
const API_URL = 'http://127.0.0.1:8000/api/billing/';

// Componente de PayPal 
const PayPalCheckoutButton = ({ planId }: { planId: 'basico' | 'medio' | 'avanzado' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [{ isPending }] = usePayPalScriptReducer();
  const [error, setError] = useState<string | null>(null);

  const createOrder: PayPalButtonsComponentProps['createOrder'] = async (_data, actions) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}create-order/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const orderData = await response.json();
      if (response.ok && orderData.id) {
        return orderData.id;
      } else {
        throw new Error(orderData.error || "No se pudo generar la orden de pago.");
      }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
        setError(errorMessage);
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        return Promise.reject(err);
    }
  };

  const onApprove: PayPalButtonsComponentProps['onApprove'] = async (data, actions) => {
    try {
      const details = await actions.order?.capture();
      if (details?.status !== 'COMPLETED') {
        throw new Error('La transacción no pudo ser completada por PayPal.');
      }

      const response = await fetch(`${API_URL}capture-order/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: data.orderID,
          userID: user?.user_id,
          plan: planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "El pago no pudo ser verificado por el servidor.");
      }
      
      toast({ title: "¡Pago completado!", description: `Has sido actualizado al plan ${planId}. Recargando...` });
      window.location.reload();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "No se pudo confirmar tu pago.";
      setError(errorMessage);
      toast({ title: "Error de Verificación", description: errorMessage, variant: "destructive" });
    }
  };

  if (isPending) return <div className="flex justify-center items-center h-12"><Loader2 className="animate-spin" /></div>;
  if (error) return <p className="text-sm text-red-500 text-center px-4">{error}</p>;

  return (
    <PayPalButtons
      style={{ layout: "vertical", label: "pay" }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error con PayPal.";
        setError(errorMessage);
        toast({ title: "Error de PayPal", description: errorMessage, variant: "destructive" });
      }}
    />
  );
};

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCopy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: "¡Correo copiado!",
        description: "La dirección de correo electrónico se ha copiado al portapapeles.",
      });
    } catch (err) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el correo al portapapeles.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Planes de suscripción</h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            Elige el plan que mejor se adapte a tus necesidades como entrenador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {plansData.map((plan) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = user?.plan === plan.planId;

            return (
              <Card 
                key={plan.name} 
                className={`relative shadow-card hover:shadow-lg transition-all duration-300 flex flex-col ${
                  plan.popular ? 'border-primary scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-primary text-primary-foreground">
                      Más Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center space-y-4 pb-8">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6 flex-grow flex flex-col justify-between">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-3 text-left">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    {isCurrentPlan ? (
                        <Button disabled className="w-full" size="lg">
                            Tu plan actual
                        </Button>
                    ) : (
                        <PayPalCheckoutButton planId={plan.planId as 'basico' | 'medio' | 'avanzado'} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-muted/50 rounded-lg p-8 text-center space-y-4 mt-12">
          <h3 className="text-2xl font-semibold text-foreground">¿Necesitas algo diferente?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ofrecemos planes personalizados para organizaciones grandes, ligas profesionales 
            y entrenadores con necesidades específicas. Contáctanos para una atención personalizada.
          </p>
          <ul className="text-muted-foreground font-medium space-y-2">
            <li className="flex items-center justify-center space-x-2 group">
              <span>diegomanzanilla22@gmail.com</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary transition-colors" onClick={() => handleCopy('diegomanzanilla22@gmail.com')} >
                <Copy className="h-4 w-4" />
              </Button>
            </li>
            <li className="flex items-center justify-center space-x-2 group">
              <span>jpfl0203@gmail.com</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary transition-colors" onClick={() => handleCopy('jpfl0203@gmail.com')} >
                <Copy className="h-4 w-4" />
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}