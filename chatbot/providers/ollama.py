"""
Proveedor Ollama — modelos locales, sin internet, sin límites, totalmente privado.
Requiere instalar Ollama: https://ollama.com/download
Modelos recomendados: llama3.2 (3B, rápido), phi3 (3.8B), mistral (7B)

Instalar el cliente Python: pip install ollama
Instalar un modelo: ollama pull llama3.2
"""

from __future__ import annotations
from typing import Callable

from .base import AIProvider, Message, ProviderInfo
from chatbot.config import get_key

_DEFAULT_MODEL = "llama3.2"
_OLLAMA_URL    = "http://localhost:11434"

_INFO = ProviderInfo(
    id="ollama",
    name="Ollama (Local)",
    model=_DEFAULT_MODEL,
    free_tier=True,
    requires_key=False,
    description="Modelo local · completamente privado · sin internet · requiere Ollama instalado",
    color="#4ecdc4",
)


class OllamaProvider(AIProvider):

    def __init__(self, model: str = _DEFAULT_MODEL):
        self._model = model

    @property
    def info(self) -> ProviderInfo:
        return ProviderInfo(
            id="ollama",
            name=f"Ollama ({self._model})",
            model=self._model,
            free_tier=True,
            requires_key=False,
            description=f"Modelo local '{self._model}' · privado · sin internet",
            color="#4ecdc4",
        )

    def is_available(self) -> tuple[bool, str]:
        try:
            import ollama  # noqa: F401
        except ImportError:
            return False, "Instala ollama:  pip install ollama"
        # Comprobar que el servidor está corriendo
        try:
            import ollama as _ol
            _ol.list()
        except Exception:
            return False, (
                "Ollama no está corriendo. Abre Ollama o ejecuta:\n"
                "  ollama serve\n"
                f"Luego instala un modelo:\n"
                f"  ollama pull {self._model}"
            )
        return True, ""

    def available_models(self) -> list[str]:
        """Lista los modelos instalados localmente."""
        try:
            import ollama
            resp = ollama.list()
            return [m.model for m in resp.models]
        except Exception:
            return []

    def send(
        self,
        messages: list[Message],
        on_chunk: Callable[[str], None] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        import ollama

        api_msgs = [{"role": m.role, "content": m.content} for m in messages]
        opts = {"temperature": temperature, "num_predict": max_tokens}

        try:
            if on_chunk:
                stream = ollama.chat(
                    model=self._model, messages=api_msgs,
                    stream=True, options=opts,
                )
                full = []
                for chunk in stream:
                    text = chunk["message"]["content"]
                    if text:
                        full.append(text)
                        on_chunk(text)
                return "".join(full)
            else:
                resp = ollama.chat(model=self._model, messages=api_msgs, options=opts)
                return resp["message"]["content"]
        except Exception as exc:
            raise RuntimeError(f"Ollama error: {exc}") from exc
