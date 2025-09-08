from django.shortcuts import render
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client
import os
from datetime import datetime

# Precios de los Planes 
PLAN_PRICES = {
    'basico': '19.00',
    'medio': '49.00',
    'avanzado': '99.00',
}

# Función para obtener un token de acceso de PayPal
def get_paypal_access_token():
    url = "https://api.sandbox.paypal.com/v1/oauth2/token" # Usa api.paypal.com para producción
    headers = {
        "Accept": "application/json",
        "Accept-Language": "en_US",
    }
    data = {
        "grant_type": "client_credentials"
    }
    auth = (settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET)
    response = requests.post(url, headers=headers, data=data, auth=auth)
    response.raise_for_status()
    return response.json()["access_token"]

# Vista para crear una orden en PayPal
class CreatePayPalOrderView(APIView):
    def post(self, request, *args, **kwargs):
        plan = request.data.get('plan')
        if plan not in PLAN_PRICES:
            return Response({"error": "Plan no válido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access_token = get_paypal_access_token()
            url = "https://api.sandbox.paypal.com/v2/checkout/orders" # Usa api.paypal.com para producción
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": "USD",
                        "value": PLAN_PRICES[plan]
                    },
                    "description": f"Suscripción al plan {plan.capitalize()}"
                }]
            }
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return Response(response.json(), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Vista para capturar el pago y actualizar el plan del usuario
class CapturePayPalOrderView(APIView):
    def post(self, request, *args, **kwargs):
        order_id = request.data.get('orderID')
        user_id = request.data.get('userID')
        plan_purchased = request.data.get('plan')

        if not all([order_id, user_id, plan_purchased]):
            return Response({"error": "Faltan datos requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            access_token = get_paypal_access_token()
            url = f"https://api.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture" # Usa api.paypal.com para producción
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            }
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            
            # Si el pago fue exitoso 
            if response.json().get('status') == 'COMPLETED':
                supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
                
                # Actualiza el plan del usuario en la base de datos
                update_response = supabase.table("profiles").update({
                    "plan": plan_purchased,
                    # Reseteamos los contadores para que pueda usar su nuevo plan
                    "prediction_count": 0,
                    "last_prediction_date": datetime.now().isoformat()
                }).eq("user_id", user_id).execute()

                if not update_response.data:
                    raise Exception("No se pudo actualizar el perfil del usuario después del pago.")

                return Response({"message": "Pago exitoso y plan actualizado"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "El pago no pudo ser completado"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Vista para cancelar la suscripción y volver al plan gratis
class CancelSubscriptionView(APIView):
    def post(self, request, *args, **kwargs):
        user_id = request.data.get('userID')

        if not user_id:
            return Response({"error": "Falta el userID"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
            
            # Actualiza el plan del usuario a 'gratis' y resetea los contadores
            update_response = supabase.table("profiles").update({
                "plan": "gratis",
                "prediction_count": 0,
                "last_prediction_date": datetime.now().isoformat()
            }).eq("user_id", user_id).execute()

            if not update_response.data:
                raise Exception("No se pudo actualizar el perfil del usuario para cancelar la suscripción.")

            return Response({"message": "Suscripción cancelada. Has vuelto al plan Gratis."}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)