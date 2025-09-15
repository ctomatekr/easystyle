from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import AIStyleRequest, AIStyleResponse


@admin.register(AIStyleRequest)
class AIStyleRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status_display', 'image_thumbnail', 'has_response', 'created_at', 'updated_at')
    list_filter = ('processing_status', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'style_prompt', 'error_message')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'image_preview')
    raw_id_fields = ('user',)

    fieldsets = (
        ('요청 정보', {
            'fields': ('id', 'user', 'style_prompt', 'user_image', 'image_preview')
        }),
        ('처리 상태', {
            'fields': ('processing_status', 'error_message')
        }),
        ('메타데이터', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def status_display(self, obj):
        """Status with color coding"""
        colors = {
            'pending': '#ffc107',     # yellow
            'processing': '#007bff',  # blue
            'completed': '#28a745',   # green
            'failed': '#dc3545'       # red
        }
        color = colors.get(obj.processing_status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_processing_status_display()
        )
    status_display.short_description = 'Status'

    def image_thumbnail(self, obj):
        """Small image thumbnail for list view"""
        if obj.user_image:
            return format_html(
                '<img src="{}" width="40" height="40" style="border-radius: 4px;" />',
                obj.user_image.url
            )
        return '📷'
    image_thumbnail.short_description = 'Image'

    def image_preview(self, obj):
        """Larger image preview for detail view"""
        if obj.user_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;" />',
                obj.user_image.url
            )
        return 'No image uploaded'
    image_preview.short_description = 'Image Preview'

    def has_response(self, obj):
        """Check if AI response exists"""
        has_resp = hasattr(obj, 'ai_response') and obj.ai_response is not None
        if has_resp:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    has_response.short_description = 'Response'
    has_response.boolean = True


try:
    from .models import AIStyleResponse
    @admin.register(AIStyleResponse)
    class AIStyleResponseAdmin(admin.ModelAdmin):
        list_display = ('request', 'user_display')
        search_fields = ('request__user__username',)
        raw_id_fields = ('request',)

        def user_display(self, obj):
            """Display user from related request"""
            return obj.request.user.username if obj.request else 'N/A'
        user_display.short_description = 'User'
except ImportError:
    pass
