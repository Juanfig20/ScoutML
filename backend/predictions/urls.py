from django.urls import path
from .views import ProspectPredictionView

urlpatterns = [
    path('predict/', ProspectPredictionView.as_view(), name='predict_prospect'),
]