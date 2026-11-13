import sys
import uvicorn
from pathlib import Path

# Add backend directory to sys.path ahead of any other paths
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
backend_str = str(backend_dir)
if backend_str in sys.path:
    sys.path.remove(backend_str)
sys.path.insert(0, backend_str)

# If an 'app' package was already imported from another project on sys.path, unload it
if "app" in sys.modules:
    app_file = getattr(sys.modules["app"], "__file__", "")
    if app_file and not app_file.startswith(backend_str):
        for mod_name in list(sys.modules.keys()):
            if mod_name == "app" or mod_name.startswith("app."):
                del sys.modules[mod_name]

if __name__ == "__main__":
    print("[*] Starting FileWatch Integrity Monitor Backend on http://localhost:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

