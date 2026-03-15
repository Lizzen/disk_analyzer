"""
Clase abstracta base para todos los proveedores de IA.
Cada proveedor implementa send() que devuelve el texto de respuesta.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Message:
    role: str   # "user" | "assistant" | "system"
    content: str


@dataclass
class ProviderInfo:
    """Metadata de un proveedor para mostrar en la UI."""
    id: str
    name: str
    model: str
    free_tier: bool
    requires_key: bool
    description: str
    color: str = "#4ecdc4"      # color de acento en la UI


class AIProvider(ABC):
    """Interfaz común para todos los proveedores de IA."""

    @property
    @abstractmethod
    def info(self) -> ProviderInfo:
        ...

    @abstractmethod
    def is_available(self) -> tuple[bool, str]:
        """
        Comprueba si el proveedor está disponible (librería instalada + key configurada).
        Retorna (ok, mensaje_de_error_si_falla).
        """
        ...

    @abstractmethod
    def send(
        self,
        messages: list[Message],
        on_chunk: Callable[[str], None] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """
        Envía los mensajes al LLM y devuelve la respuesta completa.
        Si on_chunk no es None, se llama con cada fragmento de texto (streaming).
        Lanza RuntimeError si hay error de red/API.
        """
        ...
