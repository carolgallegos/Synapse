from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Synapse"
    splunk_host: str = ""
    splunk_port: int = 8089
    splunk_token: str = ""
    splunk_index: str = "main"
    use_mock_splunk: bool = True
    splunk_web_url: str = "https://localhost:8000"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
