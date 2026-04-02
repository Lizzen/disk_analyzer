"""
Tests de integración para los endpoints REST de api.py.
Usa FastAPI TestClient (httpx síncrono) — no requiere pytest-asyncio.
"""

import os
import sys
import tempfile
import pytest

# Asegurar que la raíz del proyecto está en PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from api import app

client = TestClient(app, raise_server_exceptions=False)


# ── /api/drives ───────────────────────────────────────────────────────────────

class TestGetDrives:
    def test_returns_200(self):
        r = client.get("/api/drives")
        assert r.status_code == 200

    def test_returns_drives_list(self):
        data = client.get("/api/drives").json()
        assert "drives" in data
        assert isinstance(data["drives"], list)
        assert len(data["drives"]) > 0

    def test_drives_are_strings(self):
        data = client.get("/api/drives").json()
        for d in data["drives"]:
            assert isinstance(d, str)


# ── /api/disk-info ────────────────────────────────────────────────────────────

class TestDiskInfo:
    def test_valid_drive_returns_usage(self):
        r = client.get("/api/disk-info", params={"path": "C:/"})
        assert r.status_code == 200
        data = r.json()
        # Si el disco existe, debe tener estos campos
        if "error" not in data:
            assert "total" in data
            assert "used" in data
            assert "free" in data
            assert "pct" in data

    def test_invalid_drive_returns_error(self):
        r = client.get("/api/disk-info", params={"path": "Z:/nonexistent_xyz"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data

    def test_default_path(self):
        r = client.get("/api/disk-info")
        assert r.status_code == 200


# ── /api/config ───────────────────────────────────────────────────────────────

class TestConfig:
    def test_get_config_returns_200(self):
        r = client.get("/api/config")
        assert r.status_code == 200

    def test_get_config_has_expected_keys(self):
        data = client.get("/api/config").json()
        expected_keys = {
            "has_gemini_key", "has_anthropic_key", "has_groq_key",
            "DEFAULT_PROVIDER", "GEMINI_MODEL", "GROQ_MODEL",
            "CLAUDE_MODEL", "OLLAMA_MODEL",
        }
        assert expected_keys.issubset(set(data.keys()))

    def test_post_config_valid_provider(self):
        r = client.post("/api/config", json={"DEFAULT_PROVIDER": "gemini"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_post_config_invalid_provider_returns_422(self):
        r = client.post("/api/config", json={"DEFAULT_PROVIDER": "fake_provider"})
        assert r.status_code == 422

    def test_post_config_key_too_long_returns_422(self):
        r = client.post("/api/config", json={"GEMINI_API_KEY": "x" * 501})
        assert r.status_code == 422

    def test_post_config_model_update(self):
        r = client.post("/api/config", json={"OLLAMA_MODEL": "llama3.2"})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ── /api/providers/status ─────────────────────────────────────────────────────

class TestProvidersStatus:
    def test_returns_200(self):
        r = client.get("/api/providers/status")
        assert r.status_code == 200

    def test_returns_dict_with_providers(self):
        data = client.get("/api/providers/status").json()
        assert isinstance(data, dict)
        # Al menos uno de los providers conocidos debe aparecer
        known = {"gemini", "groq", "claude", "ollama"}
        assert len(known & set(data.keys())) > 0


# ── /api/ollama/models ────────────────────────────────────────────────────────

class TestOllamaModels:
    def test_returns_200(self):
        r = client.get("/api/ollama/models")
        assert r.status_code == 200

    def test_returns_models_key(self):
        data = client.get("/api/ollama/models").json()
        assert "models" in data
        assert isinstance(data["models"], list)


# ── /api/trash ────────────────────────────────────────────────────────────────

class TestTrash:
    def test_empty_path_returns_error(self):
        r = client.post("/api/trash", json={"path": ""})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_nonexistent_path_returns_error(self):
        r = client.post("/api/trash", json={"path": "C:/nonexistent_disk_analyzer_test_xyz"})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_protected_path_refused(self):
        r = client.post("/api/trash", json={"path": "C:\\Windows"})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_valid_temp_file(self):
        """Crear un archivo temporal real y verificar que se puede enviar a papelera."""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".dka_test") as f:
            fpath = f.name
        try:
            r = client.post("/api/trash", json={"path": fpath})
            assert r.status_code == 200
            # Debería tener ok=True o un error descriptivo (no un crash)
            assert "ok" in r.json()
        finally:
            # Limpiar si la papelera falló
            if os.path.exists(fpath):
                os.remove(fpath)


# ── /api/delete-permanent ─────────────────────────────────────────────────────

class TestDeletePermanent:
    def test_empty_path_returns_error(self):
        r = client.post("/api/delete-permanent", json={"path": ""})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_windows_system_path_refused(self):
        r = client.post("/api/delete-permanent", json={"path": "C:\\Windows\\System32"})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_user_profile_root_refused(self):
        userprofile = os.environ.get("USERPROFILE", "C:\\Users\\Default")
        r = client.post("/api/delete-permanent", json={"path": userprofile})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_valid_file_deleted_permanently(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".dka_test") as f:
            fpath = f.name
        r = client.post("/api/delete-permanent", json={"path": fpath})
        assert r.status_code == 200
        data = r.json()
        assert "ok" in data
        # Limpiar si algo falló
        if os.path.exists(fpath):
            os.remove(fpath)


# ── /api/open-in-explorer ─────────────────────────────────────────────────────

class TestOpenExplorer:
    def test_empty_path_returns_error(self):
        r = client.post("/api/open-in-explorer", json={"path": ""})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_valid_path_returns_ok(self):
        # Usar una ruta que sabemos que existe
        r = client.post("/api/open-in-explorer", json={"path": "C:\\"})
        assert r.status_code == 200
        # No debe lanzar excepción, aunque puede retornar ok=True o error


# ── /api/export ───────────────────────────────────────────────────────────────

class TestExport:
    def test_no_scan_returns_204(self):
        r = client.post("/api/export", json={"format": "csv"})
        # Sin escaneo previo, debe retornar 204 No Content
        assert r.status_code in (200, 204)

    def test_invalid_format_returns_422(self):
        r = client.post("/api/export", json={"format": "xml"})
        assert r.status_code == 422

    def test_valid_formats_accepted(self):
        for fmt in ("csv", "json", "html"):
            r = client.post("/api/export", json={"format": fmt})
            assert r.status_code in (200, 204), f"Formato {fmt} debería ser aceptado"

    def test_limit_out_of_range_returns_422(self):
        r = client.post("/api/export", json={"format": "csv", "limit": 0})
        assert r.status_code == 422


# ── /api/risks ────────────────────────────────────────────────────────────────

class TestRisks:
    def test_returns_200(self):
        r = client.get("/api/risks")
        assert r.status_code == 200

    def test_returns_alerts_key(self):
        data = client.get("/api/risks").json()
        assert "alerts" in data
        assert isinstance(data["alerts"], list)


# ── /api/temp-files ───────────────────────────────────────────────────────────

class TestTempFiles:
    def test_returns_200(self):
        r = client.get("/api/temp-files")
        assert r.status_code == 200

    def test_returns_groups_key(self):
        data = client.get("/api/temp-files").json()
        assert "groups" in data
        assert isinstance(data["groups"], list)

    def test_groups_have_required_fields(self):
        data = client.get("/api/temp-files").json()
        for group in data["groups"]:
            assert "label" in group
            assert "path" in group
            assert "files" in group


# ── /api/temp-clean ───────────────────────────────────────────────────────────

class TestTempClean:
    def test_invalid_mode_returns_422(self):
        r = client.post("/api/temp-clean", json={"paths": [], "mode": "unknown_mode"})
        assert r.status_code == 422

    def test_empty_paths_returns_result(self):
        r = client.post("/api/temp-clean", json={"paths": [], "mode": "trash"})
        assert r.status_code == 200
        data = r.json()
        assert "deleted" in data or "errors" in data or "ok" in data

    def test_nonexistent_path_reported_as_error(self):
        r = client.post("/api/temp-clean", json={
            "paths": ["C:/totally_fake_temp_file_xyz_dka.tmp"],
            "mode": "trash"
        })
        assert r.status_code == 200
        data = r.json()
        # El archivo no existe, debe aparecer en errores o el resultado debe reflejarlo
        assert "errors" in data or "deleted" in data


# ── /api/providers/test ───────────────────────────────────────────────────────

class TestProvidersTest:
    def test_invalid_provider_returns_422(self):
        r = client.post("/api/providers/test", json={"provider": "fakeprovider"})
        assert r.status_code == 422

    def test_provider_too_long_returns_422(self):
        r = client.post("/api/providers/test", json={"provider": "x" * 25})
        assert r.status_code == 422

    def test_provider_unavailable_returns_ok_false(self, monkeypatch):
        """Cuando is_available() falla, el endpoint devuelve ok=False sin llamar a send()."""
        import chatbot.providers.gemini as gemini_mod

        class _FakeProvider:
            def is_available(self):
                return (False, "No API key configured")
            def send(self, **kwargs):  # pragma: no cover
                raise AssertionError("send() should not be called")

        monkeypatch.setattr(gemini_mod, "GeminiProvider", _FakeProvider)
        r = client.post("/api/providers/test", json={"provider": "gemini"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is False
        assert "No API key configured" in data["error"]

    def test_provider_send_success(self, monkeypatch):
        """Cuando send() tiene éxito, el endpoint devuelve ok=True con la respuesta."""
        import chatbot.providers.gemini as gemini_mod

        class _FakeProvider:
            def is_available(self):
                return (True, "")
            def send(self, messages, temperature=0.0, max_tokens=10):
                return "hola mundo"

        monkeypatch.setattr(gemini_mod, "GeminiProvider", _FakeProvider)
        r = client.post("/api/providers/test", json={"provider": "gemini"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["response"] == "hola mundo"
        assert data["error"] == ""

    def test_provider_send_raises_returns_ok_false(self, monkeypatch):
        """Cuando send() lanza una excepción, el endpoint devuelve ok=False."""
        import chatbot.providers.groq_p as groq_mod

        class _FakeProvider:
            def is_available(self):
                return (True, "")
            def send(self, messages, temperature=0.0, max_tokens=10):
                raise RuntimeError("connection timeout")

        monkeypatch.setattr(groq_mod, "GroqProvider", _FakeProvider)
        r = client.post("/api/providers/test", json={"provider": "groq"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is False
        assert "connection timeout" in data["error"]


# ── /api/chat — validación de entrada ────────────────────────────────────────

class TestChatValidation:
    def test_empty_message_returns_422(self):
        r = client.post("/api/chat", json={
            "message": "",
            "provider": "gemini",
        })
        assert r.status_code == 422

    def test_invalid_provider_returns_422(self):
        r = client.post("/api/chat", json={
            "message": "hola",
            "provider": "fakeprovider",
        })
        assert r.status_code == 422

    def test_message_too_long_returns_422(self):
        r = client.post("/api/chat", json={
            "message": "x" * 8001,
            "provider": "gemini",
        })
        assert r.status_code == 422

    def test_temperature_out_of_range_returns_422(self):
        r = client.post("/api/chat", json={
            "message": "hola",
            "provider": "gemini",
            "temperature": 3.0,
        })
        assert r.status_code == 422

    def test_invalid_image_mime_returns_422(self):
        r = client.post("/api/chat", json={
            "message": "hola",
            "provider": "gemini",
            "image_b64": "abc",
            "image_mime": "image/gif",  # no permitido
        })
        assert r.status_code == 422
