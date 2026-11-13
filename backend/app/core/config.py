import os
import secrets
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FileWatch"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    # Database
    DATABASE_URL: str = ""
    
    # Security & Tamper Detection Key
    HMAC_SECRET_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Hashing Engine
    HASH_CHUNK_SIZE_BYTES: int = 65536  # 64 KB
    MAX_FILE_SIZE_BYTES: int = 104857600  # 100 MB default max file size
    
    # Monitoring Engine
    EVENT_DEBOUNCE_SECONDS: float = 1.0
    PERIODIC_SCAN_INTERVAL_SECONDS: int = 300  # 5 minutes
    
    # Suspicious file extensions for severity classification
    CRITICAL_EXTENSIONS: List[str] = [
        ".exe", ".dll", ".sys", ".so", ".dylib", ".bat", ".cmd", ".ps1", ".vbs", ".sh"
    ]
    HIGH_RISK_EXTENSIONS: List[str] = [
        ".env", ".config", ".yml", ".yaml", ".ini", ".conf", ".pem", ".key", ".crt", ".json"
    ]

    # Testing mode
    TESTING: bool = False

    class Config:
        env_file = ".env"
        extra = "allow"

    def __init__(self, **values):
        super().__init__(**values)
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        if not self.DATABASE_URL:
            db_path = self.DATA_DIR / "filewatch.db"
            self.DATABASE_URL = f"sqlite:///{db_path.as_posix()}"
            
        if not self.HMAC_SECRET_KEY:
            key_file = self.DATA_DIR / ".hmac_key"
            if key_file.exists():
                try:
                    self.HMAC_SECRET_KEY = key_file.read_text(encoding="utf-8").strip()
                except Exception:
                    self.HMAC_SECRET_KEY = secrets.token_hex(32)
            else:
                new_key = secrets.token_hex(32)
                try:
                    key_file.write_text(new_key, encoding="utf-8")
                except OSError as err:
                    import logging
                    logging.getLogger("filewatch.config").debug("HMAC key write fallback: %s", err)
                self.HMAC_SECRET_KEY = new_key

settings = Settings()
