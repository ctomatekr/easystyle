from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Extended User model for EasyStyle application
    Includes additional fields for styling preferences and user profile
    """
    
    # Personal Information
    full_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(
        max_length=20, 
        blank=True, 
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$', message="Phone number must be valid")]
    )
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Profile and Preferences
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    preferred_style = models.CharField(max_length=100, blank=True)
    size_preferences = models.JSONField(default=dict, blank=True)  # Store sizing info
    
    # User activity tracking
    last_style_request = models.DateTimeField(null=True, blank=True)
    total_style_requests = models.PositiveIntegerField(default=0)
    
    # Account settings
    email_notifications = models.BooleanField(default=True)
    style_recommendations = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.username or self.email
    
    def get_full_name(self):
        return self.full_name or f"{self.first_name} {self.last_name}".strip()
    
    class Meta:
        db_table = 'easystyle_users'


class UserProfile(models.Model):
    """
    Additional profile information for users
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Body measurements for AI styling
    height = models.PositiveIntegerField(null=True, blank=True, help_text="Height in cm")
    weight = models.PositiveIntegerField(null=True, blank=True, help_text="Weight in kg")
    body_type = models.CharField(max_length=50, blank=True)
    
    # Styling preferences
    favorite_colors = models.JSONField(default=list, blank=True)
    style_categories = models.JSONField(default=list, blank=True)
    budget_range = models.CharField(max_length=50, blank=True)
    
    # Privacy settings
    profile_visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('private', 'Private'),
            ('friends', 'Friends Only'),
        ],
        default='public'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    class Meta:
        db_table = 'easystyle_user_profiles'


class UserStyleHistory(models.Model):
    """
    Track user's style generation history
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='style_history')
    
    # Style request information
    original_image = models.ImageField(upload_to='style_requests/')
    style_prompt = models.TextField()
    generated_image = models.ImageField(upload_to='style_results/')
    ai_description = models.TextField()
    
    # Metadata
    processing_time = models.FloatField(null=True, blank=True)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    user_rating = models.PositiveIntegerField(null=True, blank=True, choices=[(i, i) for i in range(1, 6)])
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'easystyle_style_history'
        ordering = ['-created_at']
