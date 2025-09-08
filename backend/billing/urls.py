from django.urls import path
from .views import CreatePayPalOrderView, CapturePayPalOrderView,CancelSubscriptionView

urlpatterns = [
    path('create-order/', CreatePayPalOrderView.as_view(), name='create-paypal-order'),
    path('capture-order/', CapturePayPalOrderView.as_view(), name='capture-paypal-order'),
    path('cancel-subscription/', CancelSubscriptionView.as_view(), name='cancel-subscription'),
]