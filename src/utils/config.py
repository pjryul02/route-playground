from pydantic_settings import BaseSettings
from typing import Optional, Dict


class Settings(BaseSettings):
    app_name: str = "Route Playground"
    debug: bool = False
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    
    # Server URLs (configurable via environment variables)
    # Docker 배포: http://vroom-wrapper-v3:8000 (routing-net 공유 네트워크)
    # 로컬 개발: http://host.docker.internal:8000 (WSL2) 또는 http://localhost:8000
    wrapper_base_url: str = "http://vroom-wrapper-v3:8000"
    wrapper_api_key: str = "demo-key-12345"
    ortools_local_url: str = "embedded"
    map_matching_url: str = "http://vroom-wrapper-v3:8000/map-matching/match"

    @property
    def server_registry(self) -> Dict[str, dict]:
        """Returns a registry of available routing servers."""
        return {
            "vroom-distribute": {
                "description": "VROOM Direct (OSRM)",
                "url": f"{self.wrapper_base_url}/distribute",
            },
            "vroom-optimize": {
                "description": "VROOM Optimize (Full)",
                "url": f"{self.wrapper_base_url}/optimize",
                "api_key": self.wrapper_api_key,
            },
            "vroom-optimize-basic": {
                "description": "VROOM Optimize (Basic)",
                "url": f"{self.wrapper_base_url}/optimize/basic",
                "api_key": self.wrapper_api_key,
            },
            "vroom-optimize-premium": {
                "description": "VROOM Optimize (Premium)",
                "url": f"{self.wrapper_base_url}/optimize/premium",
                "api_key": self.wrapper_api_key,
            },
            "ortools-local": {
                "description": "OR-Tools (Euclidean)",
                "url": self.ortools_local_url,
            },
        }
    
    class Config:
        env_file = ".env"


settings = Settings()