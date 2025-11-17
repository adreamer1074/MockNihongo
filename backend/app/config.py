from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "sqlite:///./mock_nihongo.db"
    secret_key: str = "your-secret-key-change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-1"
    s3_bucket_name: str = "mock-nihongo-pdfs"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
