"""
Proveedor Google Gemini.
Tier gratuito: 1500 req/día con gemini-2.0-flash-lite.
Instalar: pip install google-genai
"""

from __future__ import annotations
from typing import Callable

from .base import AIProvider, Message, ProviderInfo
from chatbot.config import get_key


class GeminiProvider(AIProvider):

    @property
    def info(self) -> ProviderInfo:
        from chatbot import config as cfg
        model = cfg.GEMINI_MODEL
        return ProviderInfo(
            id="gemini",
            name="Google Gemini",
            model=model,
            free_tier=True,
            requires_key=True,
            description=f"{model} · gratis · requiere API key de Google AI Studio",
            color="#4285f4",
        )

    def is_available(self) -> tuple[bool, str]:
        try:
            import google.genai  # noqa: F401
        except ImportError:
            return False, "Instala google-genai:  pip install google-genai"
        key = get_key("GEMINI_API_KEY")
        if not key:
            return False, "Falta GEMINI_API_KEY en la configuración"
        return True, ""

    def send(
        self,
        messages: list[Message],
        on_chunk: Callable[[str], None] | None = None,
    ) -> str:
        from google import genai
        from google.genai import types
        from chatbot import config as cfg

        key = get_key("GEMINI_API_KEY")
        _MODEL = cfg.GEMINI_MODEL
        client = genai.Client(api_key=key)

        # Separar system prompt del historial
        system_content = None
        chat_msgs: list[Message] = []
        for m in messages:
            if m.role == "system":
                system_content = m.content
            else:
                chat_msgs.append(m)

        # Construir historial (todo menos el último mensaje)
        history = []
        for m in chat_msgs[:-1]:
            role = "user" if m.role == "user" else "model"
            history.append(types.Content(role=role, parts=[types.Part(text=m.content)]))

        last = chat_msgs[-1].content if chat_msgs else ""

        config_kwargs = {}
        if system_content:
            config_kwargs["system_instruction"] = system_content

        try:
            if on_chunk:
                with client.models.generate_content_stream(
                    model=_MODEL,
                    contents=history + [types.Content(role="user", parts=[types.Part(text=last)])],
                    config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
                ) as stream:
                    full = []
                    for chunk in stream:
                        text = chunk.text or ""
                        if text:
                            full.append(text)
                            on_chunk(text)
                    return "".join(full)
            else:
                response = client.models.generate_content(
                    model=_MODEL,
                    contents=history + [types.Content(role="user", parts=[types.Part(text=last)])],
                    config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
                )
                return response.text or ""
        except Exception as exc:
            raise RuntimeError(f"Gemini error: {exc}") from exc
