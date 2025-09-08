from django.urls import path
from .views import AuthView, LoginView

urlpatterns = [
    path('register/', AuthView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
]