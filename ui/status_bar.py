"""Barra de estado inferior: porcentaje + progreso + estadísticas."""

import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme


class StatusBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._build()

    def _build(self):
        # ── Fila superior: porcentaje + label de estado ───────────────────────
        top = ttk.Frame(self, style="Surface.TFrame")
        top.pack(fill="x", padx=10, pady=(6, 2))

        # Porcentaje en grande, a la izquierda
        self._pct_label = tk.Label(
            top, text="", width=6,
            bg=theme.BG_SURFACE, fg=theme.ACCENT,
            font=("Segoe UI", 11, "bold"), anchor="w",
        )
        self._pct_label.pack(side="left", padx=(0, 8))

        # Texto de estado — ocupa el resto
        self._label = tk.Label(
            top, text="Listo.",
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            font=theme.FONT_UI, anchor="w",
        )
        self._label.pack(side="left", fill="x", expand=True)

        # ── Progressbar ──────────────────────────────────────────────────────
        self._progress = ttk.Progressbar(
            self, mode="indeterminate", length=200, style="TProgressbar"
        )
        self._progress.pack(fill="x", padx=10, pady=(0, 3))

        # ── Fila inferior: estadísticas ───────────────────────────────────────
        self._stats = tk.Label(
            self, text="",
            bg=theme.BG_SURFACE, fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL, anchor="w",
        )
        self._stats.pack(fill="x", padx=10, pady=(0, 6))

    # ── API pública ───────────────────────────────────────────────────────────

    def set_idle(self, msg: str = "Listo."):
        self._progress.stop()
        self._progress.config(mode="determinate", value=0)
        self._pct_label.config(text="")
        self._label.config(text=msg)

    def start_scan(self, root: str):
        self._pct_label.config(text="")
        self._label.config(text=f"Iniciando escaneo de  {root} …")
        self._progress.config(mode="indeterminate")
        self._progress.start(10)
        self._stats.config(text="")

    def update_progress(self, done: int, total: int, current: str, bytes_scanned: int):
        short = current[-65:] if len(current) > 65 else current

        if total > 0:
            pct = done / total * 100
            self._pct_label.config(text=f"{pct:.0f}%")
            self._progress.stop()
            self._progress.config(mode="determinate", value=int(pct))
            self._label.config(text=f"…{short}")
        else:
            # Total aún desconocido → indeterminate
            self._pct_label.config(text="")
            self._label.config(text=f"Escaneando: …{short}")

        size_str = format_size(bytes_scanned)
        done_str = f"{done}/{total}" if total > 0 else str(done)
        self._stats.config(
            text=f"{done_str} carpetas procesadas   —   {size_str} encontrados"
        )

    def update_stats(self, folders: int, files: int, bytes_total: int, elapsed: float):
        self._progress.stop()
        self._progress.config(mode="determinate", value=100)
        self._pct_label.config(text="100%", fg=theme.ACCENT_GREEN)
        self._label.config(text=f"Escaneo completado en {elapsed:.1f} s")
        self._stats.config(
            text=f"{folders:,} carpetas   |   {files:,} archivos   |   {format_size(bytes_total)}"
        )

    def set_message(self, msg: str):
        self._pct_label.config(text="", fg=theme.ACCENT)
        self._label.config(text=msg)
