"""
LegalAce Backend Server Launcher
Binds to 0.0.0.0 to enable simultaneous access from:
- Local Web Browser (http://localhost:8000)
- Mobile Expo Go on physical device (http://<COMPUTER_LAN_IP>:8000)
"""
import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
