"""Barra de estado inferior — diseño moderno Linear/Vercel.

~32 px de altura + 2 px de progressbar en la parte superior.
- Izquierda: dot de estado coloreado + mensaje
- Derecha: estadísticas
- Sin label de porcentaje separado

API pública: set_idle(), start_scan(), update_progress(), update_stats(), set_message()
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
        # Progressbar de 2 px en la parte superior de la barra
        self._progress = ttk.Progressbar(
            self, mode="determinate", style="TProgressbar"
        )
        self._progress.pack(fill="x", side="top")

        # Fila de contenido
        row = tk.Frame(self, bg=theme.BG_SURFACE)
        row.pack(fill="x", padx=12, pady=(5, 5))

        # Dot de estado
        self._dot = tk.Label(
            row,
            text="●",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 8),
        )
        self._dot.pack(side="left", padx=(0, 6))

        # Mensaje principal
        self._label = tk.Label(
            row,
            text="Listo — selecciona una carpeta y pulsa Scan",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL,
            anchor="w",
        )
        self._label.pack(side="left", fill="x", expand=True)

        # Estadísticas a la derecha
        self._stats = tk.Label(
            row,
            text="",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL,
            anchor="e",
        )
        self._stats.pack(side="right")

    # ── API pública ────────────────────────────────────────────────────────────

    def set_idle(self, msg: str = "Listo — selecciona una carpeta y pulsa Scan"):
        self._progress.stop()
        self._progress.config(mode="determinate", value=0)
        self._dot.config(fg=theme.TEXT_MUTED)
        self._label.config(text=msg, fg=theme.TEXT_SECONDARY)

    def start_scan(self, root: str):
        short = root[-60:] if len(root) > 60 else root
        self._dot.config(fg=theme.ACCENT)
        self._label.config(text=f"Escaneando  {short}", fg=theme.TEXT_PRIMARY)
        self._progress.config(mode="indeterminate")
        self._progress.start(8)
        self._stats.config(text="")

    def update_progress(self, done: int, total: int, current: str, bytes_scanned: int):
        short = current[-70:] if len(current) > 70 else current

        if total > 0:
            pct = done / total * 100
            self._dot.config(fg=theme.ACCENT)
            self._progress.stop()
            self._progress.config(mode="determinate", value=int(pct))
            self._label.config(text=short, fg=theme.TEXT_PRIMARY)
        else:
            self._dot.config(fg=theme.ACCENT)
            self._label.config(text=short, fg=theme.TEXT_PRIMARY)

        done_str = f"{done}/{total}" if total > 0 else str(done)
        self._stats.config(
            text=f"{done_str} carpetas  ·  {format_size(bytes_scanned)}"
        )

    def update_stats(self, folders: int, files: int, bytes_total: int,
                     elapsed: float, errors: int = 0):
        self._progress.stop()
        self._progress.config(mode="determinate", value=100)
        if errors:
            self._dot.config(fg=theme.ACCENT_RED)
            self._label.config(
                text=f"Completado en {elapsed:.1f} s  —  ⚠ {errors} carpeta(s) sin acceso",
                fg=theme.ACCENT_RED,
            )
        else:
            self._dot.config(fg=theme.ACCENT_GREEN)
            self._label.config(
                text=f"Completado en {elapsed:.1f} s",
                fg=theme.TEXT_PRIMARY,
            )
        self._stats.config(
            text=f"{folders:,} carpetas  ·  {files:,} archivos  ·  {format_size(bytes_total)}"
        )

    def set_message(self, msg: str):
        self._dot.config(fg=theme.TEXT_MUTED)
        self._label.config(text=msg, fg=theme.TEXT_SECONDARY)
