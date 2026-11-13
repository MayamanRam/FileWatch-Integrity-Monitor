import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.models import MonitoredDirectory
from app.monitoring.watcher import monitoring_orchestrator
from app.monitoring.scanner import periodic_scanner
from app.api.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("filewatch")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing FileWatch database schema...")
    Base.metadata.create_all(bind=engine)

    if not settings.TESTING:
        # Resume monitoring for active directories
        db = SessionLocal()
        try:
            active_dirs = db.query(MonitoredDirectory).filter(
                MonitoredDirectory.is_active == True,
                MonitoredDirectory.status == "active"
            ).all()
            for d in active_dirs:
                logger.info(f"Resuming filesystem monitoring for: {d.path}")
                monitoring_orchestrator.start_monitoring_directory(
                    directory_id=d.id,
                    path=d.path,
                    recursive=d.recursive
                )
        finally:
            db.close()

        # Start periodic full verification scanner
        logger.info("Starting background periodic integrity verification engine...")
        periodic_scanner.start()

    yield

    # Shutdown
    if not settings.TESTING:
        logger.info("Stopping FileWatch monitoring services...")
        periodic_scanner.stop()
        monitoring_orchestrator.stop_all()
        logger.info("FileWatch shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FileWatch — Professional File Integrity Monitoring & Tamper Detection System",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Request ID logged for auditing."}
    )

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "system": "FileWatch",
        "tagline": "Monitor. Detect. Verify.",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "filewatch-backend"}
