from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'company_name', 'location', 'first_name', 'last_name', 'pin', 'profile_picture', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'phone', 'pin']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


class ChangeUsernameSerializer(serializers.Serializer):
    new_username = serializers.CharField(required=True)


class ChangePinSerializer(serializers.Serializer):
    old_pin = serializers.CharField(required=True)
    new_pin = serializers.CharField(required=True, min_length=4, max_length=6)


class ChangeEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ChangePhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(required=True, max_length=20)


class ChangeCompanyNameSerializer(serializers.Serializer):
    company_name = serializers.CharField(required=True, max_length=200)


class ChangeLocationSerializer(serializers.Serializer):
    location = serializers.CharField(required=True, max_length=200)


class ChangeProfilePictureSerializer(serializers.Serializer):
    profile_picture = serializers.CharField(required=True, max_length=5000000)
