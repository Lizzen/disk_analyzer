"""
Sistema de logging para Disk Analyzer.

- Escribe en logs/dka_YYYY-MM-DD.log (rotación diaria)
- Niveles: DEBUG, INFO, WARNING, ERROR
- Thread-safe
- Se activa con la variable de entorno DKA_DEBUG=1 o llamando a enable_debug()
"""

from __future__ import annotations

import logging
import os
import sys
import threading
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

# ── Directorio de logs ────────────────────────────────────────────────────────

_ROOT = Path(__file__).parent.parent          # raíz del proyecto
LOGS_DIR = _ROOT / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# ── Configuración del logger ──────────────────────────────────────────────────

_logger = logging.getLogger("dka")
_logger.setLevel(logging.DEBUG)               # captura todo; los handlers filtran
_initialized = False
_lock = threading.Lock()


def _init():
    global _initialized
    with _lock:
        if _initialized:
            return
        _initialized = True

        # ── Handler de archivo (siempre activo) ────────────────────────
        log_file = LOGS_DIR / f"dka_{datetime.now():%Y-%m-%d}.log"
        fh = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,   # 10 MB
            backupCount=5,
            encoding="utf-8",
        )
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(logging.Formatter(
            "%(asctime)s.%(msecs)03d  %(levelname)-7s  [%(threadName)s]  %(message)s",
            datefmt="%H:%M:%S",
        ))
        _logger.addHandler(fh)

        # ── Handler de consola (solo si DKA_DEBUG=1) ───────────────────
        if os.environ.get("DKA_DEBUG") == "1":
            sh = logging.StreamHandler(sys.stdout)
            sh.setLevel(logging.DEBUG)
            sh.setFormatter(logging.Formatter(
                "%(asctime)s  %(levelname)-7s  %(message)s",
                datefmt="%H:%M:%S",
            ))
            _logger.addHandler(sh)


_init()


# ── API pública ───────────────────────────────────────────────────────────────

def debug(msg: str, *args):
    _logger.debug(msg, *args)

def info(msg: str, *args):
    _logger.info(msg, *args)

def warning(msg: str, *args):
    _logger.warning(msg, *args)

def error(msg: str, *args):
    _logger.error(msg, *args)

def enable_debug():
    """Activa salida por consola en tiempo de ejecución."""
    if not any(isinstance(h, logging.StreamHandler) and h.stream is sys.stdout
               for h in _logger.handlers):
        sh = logging.StreamHandler(sys.stdout)
        sh.setLevel(logging.DEBUG)
        sh.setFormatter(logging.Formatter(
            "%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S"
        ))
        _logger.addHandler(sh)

def get_log_path() -> Path:
    return LOGS_DIR / f"dka_{datetime.now():%Y-%m-%d}.log"
