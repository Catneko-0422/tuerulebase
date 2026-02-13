import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = 3600
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SECURE = False
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_COOKIE_SAMESITE = 'Lax'