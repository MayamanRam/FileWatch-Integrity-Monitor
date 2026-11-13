import os
import sys
import shutil
import tempfile
from pathlib import Path

# Guarantee FileWatch backend is at the head of sys.path before any imports
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path in sys.path:
    sys.path.remove(backend_path)
sys.path.insert(0, backend_path)

# If another project injected its own "app" package into sys.modules, unload it
for mod_name in list(sys.modules.keys()):
    if mod_name == "app" or mod_name.startswith("app."):
        del sys.modules[mod_name]

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base, get_db
from app.core.config import settings
from app.main import app

settings.TESTING = True

@pytest.fixture(scope="session")
def test_temp_dir():
    temp_dir = Path(tempfile.mkdtemp(prefix="filewatch_test_"))
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="function")
def test_db_session(test_temp_dir):
    db_path = test_temp_dir / f"test_{tempfile.mktemp()[-6:]}.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()

@pytest.fixture(scope="function")
def client(test_db_session):
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def sample_monitored_dir(test_temp_dir):
    d = test_temp_dir / f"monitored_{tempfile.mktemp()[-6:]}"
    d.mkdir(parents=True, exist_ok=True)
    # Create sample files
    (d / "config.ini").write_text("port=8080\nenv=production\n", encoding="utf-8")
    (d / "app.py").write_text("print('hello world')\n", encoding="utf-8")
    (d / "payload.exe").write_bytes(b"\x4d\x5a\x90\x00\x03\x00\x00\x00")
    sub = d / "data"
    sub.mkdir()
    (sub / "report.txt").write_text("Integrity data report\n", encoding="utf-8")
    yield d
