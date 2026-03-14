"""
Configuración de API keys y proveedor activo.

Las claves se guardan en un archivo JSON en la carpeta del usuario:
  %APPDATA%/DiskAnalyzer/api_keys.json

También se pueden sobreescribir con variables de entorno.
Prioridad: variable de entorno > archivo de configuración > valor en código.
"""

import os
import json
from pathlib import Path


# ── Ruta del archivo de configuración persistente ─────────────────────────────

_CONFIG_DIR  = Path(os.environ.get("APPDATA", Path.home())) / "DiskAnalyzer"
_CONFIG_FILE = _CONFIG_DIR / "api_keys.json"


def _load_saved() -> dict:
    """Carga las claves guardadas desde disco."""
    try:
        if _CONFIG_FILE.exists():
            return json.loads(_CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_keys(data: dict) -> None:
    """Guarda las claves en disco."""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _CONFIG_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


# Cache en memoria (se rellena al importar el módulo)
_saved: dict = _load_saved()


# ── Claves de API ─────────────────────────────────────────────────────────────
_KEYS_DEFAULT: dict[str, str] = {
    "GEMINI_API_KEY":    "",
    "ANTHROPIC_API_KEY": "",
    "GROQ_API_KEY":      "",
}

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
    Prioridad: variable de entorno > archivo guardado > valor por defecto.
    """
    return (
        os.environ.get(name, "")
        or _saved.get(name, "")
        or _KEYS_DEFAULT.get(name, "")
    )


def set_keys(keys: dict[str, str], default_provider: str = "",
             gemini_model: str = "", groq_model: str = "",
             claude_model: str = "", ollama_model: str = "") -> None:
    """
    Guarda las claves y configuración en disco.
    Actualiza también el módulo en memoria para que el cambio sea inmediato.
    """
    global _saved, DEFAULT_PROVIDER, GEMINI_MODEL, GROQ_MODEL, CLAUDE_MODEL, OLLAMA_MODEL
    new_data = dict(_saved)
    new_data.update({k: v for k, v in keys.items() if v is not None})
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
    _save_keys(new_data)
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
    """Devuelve la configuración actual como dict (sin env vars)."""
    return {
        "GEMINI_API_KEY":    _saved.get("GEMINI_API_KEY", ""),
        "ANTHROPIC_API_KEY": _saved.get("ANTHROPIC_API_KEY", ""),
        "GROQ_API_KEY":      _saved.get("GROQ_API_KEY", ""),
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
