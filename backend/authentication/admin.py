from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Display fields in list view
    list_display = ('username', 'email', 'full_name', 'profile_picture_display', 'style_activity', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_active', 'date_joined', 'last_style_request')
    search_fields = ('username', 'email', 'full_name', 'preferred_style')
    ordering = ('-date_joined',)

    # Form fields organization
    fieldsets = BaseUserAdmin.fieldsets + (
        ('프로필 정보', {
            'fields': ('full_name', 'phone_number', 'date_of_birth', 'profile_picture')
        }),
        ('스타일 선호도', {
            'fields': ('preferred_style', 'size_preferences')
        }),
        ('활동 통계', {
            'fields': ('last_style_request', 'total_style_requests'),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('추가 정보', {
            'fields': ('email', 'full_name', 'phone_number')
        }),
    )

    readonly_fields = ('last_style_request', 'total_style_requests')

    def profile_picture_display(self, obj):
        """Display profile picture thumbnail"""
        if obj.profile_picture:
            return format_html(
                '<img src="{}" width="50" height="50" style="border-radius: 50%;" />',
                obj.profile_picture.url
            )
        return format_html('<div style="width: 50px; height: 50px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #666;">No Image</div>')
    profile_picture_display.short_description = 'Profile'

    def style_activity(self, obj):
        """Display style request activity"""
        if obj.total_style_requests > 0:
            # Link to style recommendations for this user
            url = reverse('admin:products_stylerecommendation_changelist') + f'?user__id__exact={obj.id}'
            return format_html(
                '<a href="{}" title="View style requests">{} requests</a>',
                url,
                obj.total_style_requests
            )
        return '0 requests'
    style_activity.short_description = 'Style Requests'

    def get_queryset(self, request):
        """Optimize queryset for better performance"""
        return super().get_queryset(request).select_related().prefetch_related('stylerecommendation_set')
