"""
Proveedor Groq — Llama 3.1 70B gratuito, extremadamente rápido.
Tier gratuito: 14400 req/día, 500k tokens/día.
Instalar: pip install groq
API key gratis en: https://console.groq.com
"""

from __future__ import annotations
from typing import Callable

from .base import AIProvider, Message, ProviderInfo
from chatbot.config import get_key


class GroqProvider(AIProvider):

    @property
    def info(self) -> ProviderInfo:
        from chatbot import config as cfg
        model = cfg.GROQ_MODEL
        return ProviderInfo(
            id="groq",
            name="Groq",
            model=model,
            free_tier=True,
            requires_key=True,
            description=f"{model} · 14400 req/día gratuitas · ultra-rápido",
            color="#f7b731",
        )

    def is_available(self) -> tuple[bool, str]:
        try:
            import groq  # noqa: F401
        except ImportError:
            return False, "Instala groq:  pip install groq"
        key = get_key("GROQ_API_KEY")
        if not key:
            return False, "Falta GROQ_API_KEY — obtén una gratis en console.groq.com"
        return True, ""

    def send(
        self,
        messages: list[Message],
        on_chunk: Callable[[str], None] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        from groq import Groq
        from chatbot import config as cfg

        key = get_key("GROQ_API_KEY")
        model = cfg.GROQ_MODEL
        client = Groq(api_key=key)

        def _to_content(content):
            if isinstance(content, str):
                return content
            # Groq vision: formato OpenAI image_url con data URI
            parts = []
            for p in content:
                if p.get("type") == "text":
                    parts.append({"type": "text", "text": p["text"]})
                elif p.get("type") == "image":
                    parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{p['media_type']};base64,{p['data']}"},
                    })
            return parts if parts else ""

        api_msgs = [{"role": m.role, "content": _to_content(m.content)} for m in messages]

        try:
            if on_chunk:
                stream = client.chat.completions.create(
                    model=model, messages=api_msgs,
                    temperature=temperature, max_tokens=max_tokens, stream=True,
                )
                full = []
                for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        full.append(delta)
                        on_chunk(delta)
                return "".join(full)
            else:
                resp = client.chat.completions.create(
                    model=model, messages=api_msgs,
                    temperature=temperature, max_tokens=max_tokens,
                )
                return resp.choices[0].message.content
        except Exception as exc:
            raise RuntimeError(f"Groq error: {exc}") from exc
