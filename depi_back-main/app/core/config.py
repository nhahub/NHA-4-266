from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CV Inference API"
    MODEL_PATH: str = "best.pt"
    CONFIDENCE_THRESHOLD: float = 0.4
    IMAGE_SIZE: int = 320

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()