"""
Configuración de API keys y proveedor activo.

Las claves se guardan en el Administrador de Credenciales de Windows (keyring).
Los ajustes no sensibles (proveedor, modelos) se guardan en JSON:
  %APPDATA%/DiskAnalyzer/settings.json

También se pueden sobreescribir con variables de entorno.
Prioridad: variable de entorno > keyring > archivo de configuración > valor por defecto.
"""

import os
import json
from pathlib import Path

try:
    import keyring
    _KEYRING_AVAILABLE = True
except ImportError:
    _KEYRING_AVAILABLE = False

# ── Rutas de configuración ────────────────────────────────────────────────────

_CONFIG_DIR  = Path(os.environ.get("APPDATA", Path.home())) / "DiskAnalyzer"
_CONFIG_FILE = _CONFIG_DIR / "settings.json"
_LEGACY_FILE = _CONFIG_DIR / "api_keys.json"   # archivo antiguo a migrar

_KEYRING_SERVICE = "DiskAnalyzer"
_KEY_NAMES = {"GEMINI_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY"}


def _migrate_legacy() -> None:
    """Migra claves en texto plano del archivo legacy al keyring (una sola vez)."""
    if not _KEYRING_AVAILABLE or not _LEGACY_FILE.exists():
        return
    try:
        data = json.loads(_LEGACY_FILE.read_text(encoding="utf-8"))
        migrated = False
        for k in _KEY_NAMES:
            v = data.get(k, "")
            if v:
                try:
                    keyring.set_password(_KEYRING_SERVICE, k, v)
                    migrated = True
                except Exception:
                    pass  # keyring no disponible en este entorno
        if migrated:
            # Reescribir el archivo legacy sin las claves
            safe = {k: v for k, v in data.items() if k not in _KEY_NAMES}
            _LEGACY_FILE.write_text(json.dumps(safe, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_saved() -> dict:
    """Carga ajustes no sensibles desde disco. Fusiona settings.json y legacy si existe."""
    result = {}
    # Intentar leer el archivo legacy para ajustes no sensibles
    if _LEGACY_FILE.exists():
        try:
            data = json.loads(_LEGACY_FILE.read_text(encoding="utf-8"))
            result.update({k: v for k, v in data.items() if k not in _KEY_NAMES})
        except Exception:
            pass
    # El archivo nuevo sobreescribe si existe
    if _CONFIG_FILE.exists():
        try:
            result.update(json.loads(_CONFIG_FILE.read_text(encoding="utf-8")))
        except Exception:
            pass
    return result


def _save_settings(data: dict) -> None:
    """Guarda ajustes no sensibles. Las claves NO se escriben en disco."""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    safe = {k: v for k, v in data.items() if k not in _KEY_NAMES}
    _CONFIG_FILE.write_text(json.dumps(safe, indent=2), encoding="utf-8")


# Migrar claves legacy al importar el módulo (operación idempotente)
_migrate_legacy()

# Cache en memoria
_saved: dict = _load_saved()


# ── Claves de API ─────────────────────────────────────────────────────────────

# ── Proveedor por defecto ─────────────────────────────────────────────────────
DEFAULT_PROVIDER = _saved.get("DEFAULT_PROVIDER", "gemini")

# ── Modelos por proveedor ─────────────────────────────────────────────────────
GEMINI_MODEL  = _saved.get("GEMINI_MODEL",  "gemini-2.0-flash-lite")
GROQ_MODEL    = _saved.get("GROQ_MODEL",    "llama-3.1-70b-versatile")
CLAUDE_MODEL  = _saved.get("CLAUDE_MODEL",  "claude-haiku-4-5-20251001")
OLLAMA_MODEL  = _saved.get("OLLAMA_MODEL",  "llama3.2")

# ── Comportamiento del chat ───────────────────────────────────────────────────
MAX_HISTORY_MESSAGES = 20
STREAM_RESPONSES     = True


# ── Función de acceso ─────────────────────────────────────────────────────────

def get_key(name: str) -> str:
    """
    Retorna la API key para `name`.
    Prioridad: variable de entorno > keyring > fallback en memoria (si keyring falló al migrar).
    """
    env_val = os.environ.get(name, "")
    if env_val:
        return env_val
    if name in _KEY_NAMES:
        if _KEYRING_AVAILABLE:
            try:
                return keyring.get_password(_KEYRING_SERVICE, name) or ""
            except Exception:
                pass
        # Fallback: si keyring no está disponible, buscar en _saved (puede tener el valor legacy)
        return _saved.get(name, "")
    return _saved.get(name, "")


def set_keys(keys: dict[str, str], default_provider: str = "",
             gemini_model: str = "", groq_model: str = "",
             claude_model: str = "", ollama_model: str = "") -> None:
    """
    Guarda las claves y configuración.
    Las claves de API van al keyring; los ajustes de modelo/proveedor van al JSON.
    """
    global _saved, DEFAULT_PROVIDER, GEMINI_MODEL, GROQ_MODEL, CLAUDE_MODEL, OLLAMA_MODEL
    new_data = dict(_saved)

    for k, v in keys.items():
        if v is None:
            continue
        if k in _KEY_NAMES:
            if _KEYRING_AVAILABLE:
                try:
                    keyring.set_password(_KEYRING_SERVICE, k, v)
                    continue  # guardada en keyring, no escribir en JSON
                except Exception:
                    pass
            # Fallback: guardar en _saved si keyring no está disponible
            new_data[k] = v
        else:
            new_data[k] = v

    if default_provider:
        new_data["DEFAULT_PROVIDER"] = default_provider
    if gemini_model:
        new_data["GEMINI_MODEL"] = gemini_model
    if groq_model:
        new_data["GROQ_MODEL"] = groq_model
    if claude_model:
        new_data["CLAUDE_MODEL"] = claude_model
    if ollama_model:
        new_data["OLLAMA_MODEL"] = ollama_model

    _save_settings(new_data)
    _saved = new_data

    if default_provider:
        DEFAULT_PROVIDER = default_provider
    if gemini_model:
        GEMINI_MODEL = gemini_model
    if groq_model:
        GROQ_MODEL = groq_model
    if claude_model:
        CLAUDE_MODEL = claude_model
    if ollama_model:
        OLLAMA_MODEL = ollama_model


def get_config() -> dict:
    """Devuelve la configuración actual como dict.
    Las claves de API se leen del keyring (no del archivo JSON)."""
    return {
        "GEMINI_API_KEY":    get_key("GEMINI_API_KEY"),
        "ANTHROPIC_API_KEY": get_key("ANTHROPIC_API_KEY"),
        "GROQ_API_KEY":      get_key("GROQ_API_KEY"),
        "DEFAULT_PROVIDER":  _saved.get("DEFAULT_PROVIDER", "gemini"),
        "GEMINI_MODEL":      _saved.get("GEMINI_MODEL",  "gemini-2.0-flash-lite"),
        "GROQ_MODEL":        _saved.get("GROQ_MODEL",    "llama-3.1-70b-versatile"),
        "CLAUDE_MODEL":      _saved.get("CLAUDE_MODEL",  "claude-haiku-4-5-20251001"),
        "OLLAMA_MODEL":      _saved.get("OLLAMA_MODEL",  "llama3.2"),
    }


def all_providers_status() -> dict[str, tuple[bool, str]]:
    """
    Devuelve el estado de disponibilidad de todos los providers.
    Retorna dict {provider_id: (disponible, mensaje)}.
    """
    from chatbot.providers.gemini  import GeminiProvider
    from chatbot.providers.claude  import ClaudeProvider
    from chatbot.providers.groq_p  import GroqProvider
    from chatbot.providers.ollama  import OllamaProvider

    providers = [GeminiProvider(), ClaudeProvider(), GroqProvider(), OllamaProvider(OLLAMA_MODEL)]
    return {p.info.id: p.is_available() for p in providers}
