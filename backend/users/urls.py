from django.urls import path
from .views import AuthView, LoginView, ProfileView

urlpatterns = [
    path('register/', AuthView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
    path('profile/', ProfileView.as_view(), name='user-profile-update'),
]