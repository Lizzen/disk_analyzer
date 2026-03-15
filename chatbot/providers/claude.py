"""
Proveedor Anthropic Claude.
Modelos: claude-haiku-4-5 (más barato), claude-sonnet-4-6 (más capaz).
Instalar: pip install anthropic
Tier: créditos de trial gratuitos al registrarse; luego de pago.

Nota: Este es el mismo modelo que impulsa Claude Code.
La diferencia es que aquí se usa directamente via API REST,
sin las herramientas de agente (bash, edit, etc.).
"""

from __future__ import annotations
from typing import Callable

from .base import AIProvider, Message, ProviderInfo
from chatbot.config import get_key


class ClaudeProvider(AIProvider):

    @property
    def info(self) -> ProviderInfo:
        from chatbot import config as cfg
        model = cfg.CLAUDE_MODEL
        return ProviderInfo(
            id="claude",
            name="Claude (Anthropic)",
            model=model,
            free_tier=False,
            requires_key=True,
            description=f"{model} · créditos trial al registrarse",
            color="#e94560",
        )

    def is_available(self) -> tuple[bool, str]:
        try:
            import anthropic  # noqa: F401
        except ImportError:
            return False, "Instala anthropic:  pip install anthropic"
        key = get_key("ANTHROPIC_API_KEY")
        if not key:
            return False, "Falta ANTHROPIC_API_KEY en chatbot/config.py o variable de entorno"
        return True, ""

    def send(
        self,
        messages: list[Message],
        on_chunk: Callable[[str], None] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        import anthropic
        from chatbot import config as cfg

        key = get_key("ANTHROPIC_API_KEY")
        model = cfg.CLAUDE_MODEL
        client = anthropic.Anthropic(api_key=key)

        system = ""
        api_msgs = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                api_msgs.append({"role": m.role, "content": m.content})

        try:
            if on_chunk:
                full = []
                with client.messages.stream(
                    model=model, max_tokens=max_tokens,
                    temperature=temperature, system=system, messages=api_msgs,
                ) as stream:
                    for text in stream.text_stream:
                        full.append(text)
                        on_chunk(text)
                return "".join(full)
            else:
                resp = client.messages.create(
                    model=model, max_tokens=max_tokens,
                    temperature=temperature, system=system, messages=api_msgs,
                )
                return resp.content[0].text
        except Exception as exc:
            raise RuntimeError(f"Claude error: {exc}") from exc
