import os
import sys
from pathlib import Path
import uvicorn

# Ensure the backend directory is in the Python module search path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    # Import the FastAPI application
    from app.main import app
except Exception as e:
    import traceback
    print("❌ FATAL ERROR DURING STARTUP IMPORT:", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)

if __name__ == "__main__":
    # Render assigns the external listening port via the $PORT environment variable (default: 8000)
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"🚀 Safar API starting on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

