from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str
    database_url: str

    jwt_secret: str
    jwt_algorithm: str
    access_token_ttl_minutes: int

    mock_docs_dir: str

    demo_client_email: str
    demo_client_password: str
    demo_employee_email: str
    demo_employee_password: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
