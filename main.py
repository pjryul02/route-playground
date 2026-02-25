import uvicorn
from src.api.routes import app
from src.utils.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "src.api.routes:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )