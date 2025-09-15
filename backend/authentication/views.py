from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.utils import timezone
from .models import User, UserProfile, UserStyleHistory
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserProfileSerializer, UserStyleHistorySerializer, PasswordChangeSerializer
)


class UserRegistrationView(generics.CreateAPIView):
    """
    API endpoint for user registration
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate authentication token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def user_login(request):
    """
    API endpoint for user login
    """
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        
        # Generate or get existing token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def user_logout(request):
    """
    API endpoint for user logout
    """
    try:
        # Delete the user's token
        request.user.auth_token.delete()
    except:
        pass
    
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for user profile management
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for detailed user profile information
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class UserStyleHistoryView(generics.ListCreateAPIView):
    """
    API endpoint for user style history
    """
    serializer_class = UserStyleHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserStyleHistory.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Update user's style request count
        user = self.request.user
        user.total_style_requests += 1
        user.last_style_request = timezone.now()
        user.save()
        
        serializer.save(user=user)


class UserStyleHistoryDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for individual style history items
    """
    serializer_class = UserStyleHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserStyleHistory.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """
    API endpoint for password change
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Delete existing token to force re-login
        try:
            user.auth_token.delete()
        except:
            pass
        
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_dashboard(request):
    """
    API endpoint for user dashboard data
    """
    user = request.user
    recent_styles = UserStyleHistory.objects.filter(user=user)[:5]
    
    dashboard_data = {
        'user': UserSerializer(user).data,
        'stats': {
            'total_styles': user.total_style_requests,
            'last_style_date': user.last_style_request,
            'profile_completion': calculate_profile_completion(user),
        },
        'recent_styles': UserStyleHistorySerializer(recent_styles, many=True).data,
    }
    
    return Response(dashboard_data, status=status.HTTP_200_OK)


def calculate_profile_completion(user):
    """
    Calculate profile completion percentage
    """
    completion_score = 0
    total_fields = 10
    
    # Basic info (4 fields)
    if user.first_name: completion_score += 1
    if user.last_name: completion_score += 1
    if user.email: completion_score += 1
    if user.phone_number: completion_score += 1
    
    # Profile info (3 fields)
    if user.profile_picture: completion_score += 1
    if user.date_of_birth: completion_score += 1
    if user.preferred_style: completion_score += 1
    
    # Extended profile (3 fields)
    try:
        profile = user.profile
        if profile.height: completion_score += 1
        if profile.favorite_colors: completion_score += 1
        if profile.budget_range: completion_score += 1
    except UserProfile.DoesNotExist:
        pass
    
    return int((completion_score / total_fields) * 100)
