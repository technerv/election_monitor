"""
Authentication views for user registration and login
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from .serializers import UserRegistrationSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user account.
    
    Required fields:
    - username
    - email
    - password
    - password_confirm
    
    Optional fields:
    - first_name
    - last_name
    - phone_number
    - organization
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        token = Token.objects.get(user=user)
        
        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user).data,
            'token': token.key,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login with username/email and password.
    Returns auth token on success.
    """
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Try to authenticate with username
    user = authenticate(username=username, password=password)
    
    # If failed, try with email
    if user is None:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    
    if user is None:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'Account is disabled'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get or create token
    token, created = Token.objects.get_or_create(user=user)
    
    return Response({
        'message': 'Login successful',
        'user': UserSerializer(user).data,
        'token': token.key,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout by deleting the auth token.
    """
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    
    return Response({'message': 'Logout successful'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current user details.
    """
    return Response(UserSerializer(request.user).data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update current user profile.
    """
    user = request.user
    
    # Update User model fields
    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
    if 'last_name' in request.data:
        user.last_name = request.data['last_name']
    if 'email' in request.data:
        # Check if email is already taken by another user
        if User.objects.filter(email=request.data['email']).exclude(pk=user.pk).exists():
            return Response(
                {'error': 'Email already in use'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.email = request.data['email']
    
    user.save()
    
    # Update UserProfile fields
    profile = user.profile if hasattr(user, 'profile') else None
    if profile:
        if 'organization' in request.data:
            profile.organization = request.data['organization']
        profile.save()
    
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password.
    """
    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')
    new_password_confirm = request.data.get('new_password_confirm', '')
    
    if not old_password or not new_password:
        return Response(
            {'error': 'Old password and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != new_password_confirm:
        return Response(
            {'error': 'New passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not request.user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    request.user.set_password(new_password)
    request.user.save()
    
    # Delete old token and create new one
    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)
    
    return Response({
        'message': 'Password changed successfully',
        'token': token.key,
    })
