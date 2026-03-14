"""
StatusBar v2 — Barra de estado con progressbar animada y métricas inline.

- Progressbar de 2px con color de acento al tope
- Dot de estado con color semántico
- Mensaje a la izquierda + stats a la derecha
"""

import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme


class StatusBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        # Borde superior
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")

        # Progressbar (2 px)
        self._progress = ttk.Progressbar(self, mode="determinate", style="TProgressbar")
        self._progress.pack(fill="x", side="top")

        # Fila principal
        row = tk.Frame(self, bg=theme.BG_SURFACE)
        row.pack(fill="x", padx=14, pady=(5, 6))

        # Dot
        self._dot = tk.Label(
            row, text="●",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 7),
        )
        self._dot.pack(side="left", padx=(0, 7))

        # Mensaje
        self._label = tk.Label(
            row,
            text="Listo — selecciona una carpeta y pulsa Escanear",
            bg=theme.BG_SURFACE, fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL, anchor="w",
        )
        self._label.pack(side="left", fill="x", expand=True)

        # Stats (derecha)
        self._stats = tk.Label(
            row, text="",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=theme.FONT_MONO_SM, anchor="e",
        )
        self._stats.pack(side="right")

    # ── API pública ────────────────────────────────────────────────────────────

    def set_idle(self, msg: str = "Listo — selecciona una carpeta y pulsa Escanear"):
        self._progress.stop()
        self._progress.config(mode="determinate", value=0)
        self._dot.config(fg=theme.TEXT_MUTED)
        self._label.config(text=msg, fg=theme.TEXT_SECONDARY)
        self._stats.config(text="")

    def start_scan(self, root: str):
        short = f"…{root[-55:]}" if len(root) > 57 else root
        self._dot.config(fg=theme.ACCENT)
        self._label.config(text=f"Escaneando  {short}", fg=theme.TEXT_PRIMARY)
        self._progress.config(mode="indeterminate")
        self._progress.start(6)
        self._stats.config(text="")

    def update_progress(self, done: int, total: int, current: str, bytes_scanned: int):
        short = f"…{current[-60:]}" if len(current) > 62 else current
        self._dot.config(fg=theme.ACCENT)
        if total > 0:
            pct = done / total * 100
            self._progress.stop()
            self._progress.config(mode="determinate", value=int(pct))
            self._label.config(text=short, fg=theme.TEXT_PRIMARY)
        else:
            self._label.config(text=short, fg=theme.TEXT_PRIMARY)

        done_str = f"{done}/{total}" if total > 0 else str(done)
        self._stats.config(text=f"{done_str} carpetas  ·  {format_size(bytes_scanned)}")

    def update_stats(self, folders: int, files: int, bytes_total: int,
                     elapsed: float, errors: int = 0):
        self._progress.stop()
        self._progress.config(mode="determinate", value=100)
        if errors:
            self._dot.config(fg=theme.ACCENT_AMBER)
            self._label.config(
                text=f"Completado en {elapsed:.1f} s  —  ⚠ {errors} carpeta(s) inaccesible(s)",
                fg=theme.ACCENT_AMBER,
            )
        else:
            self._dot.config(fg=theme.ACCENT_GREEN)
            self._label.config(
                text=f"✓  Completado en {elapsed:.1f} s",
                fg=theme.ACCENT_GREEN,
            )
        self._stats.config(
            text=f"{folders:,} carpetas  ·  {files:,} archivos  ·  {format_size(bytes_total)}"
        )

    def set_message(self, msg: str):
        self._dot.config(fg=theme.TEXT_MUTED)
        self._label.config(text=msg, fg=theme.TEXT_SECONDARY)
