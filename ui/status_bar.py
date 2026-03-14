"""Barra de estado inferior: progreso + estadísticas."""

import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size


class StatusBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self._build()

    def _build(self):
        self._label = ttk.Label(self, text="Listo.", anchor="w")
        self._label.pack(fill="x", padx=8, pady=(4, 0))

        self._progress = ttk.Progressbar(self, mode="indeterminate", length=200)
        self._progress.pack(fill="x", padx=8, pady=(2, 2))

        self._stats = ttk.Label(self, text="", anchor="w", foreground="#888")
        self._stats.pack(fill="x", padx=8, pady=(0, 4))

    # ── API pública ───────────────────────────────────────────────────────────

    def set_idle(self, msg: str = "Listo."):
        self._progress.stop()
        self._progress.config(mode="determinate", value=0)
        self._label.config(text=msg)

    def start_scan(self, root: str):
        self._label.config(text=f"Escaneando {root} ...")
        self._progress.config(mode="indeterminate")
        self._progress.start(15)
        self._stats.config(text="")

    def update_progress(self, done: int, total: int, current: str, bytes_scanned: int):
        short = current[-55:] if len(current) > 55 else current
        self._label.config(text=f"Escaneando: ...{short}")
        if total > 0:
            self._progress.stop()
            self._progress.config(mode="determinate", value=int(done / total * 100))
        self._stats.config(text=f"{format_size(bytes_scanned)} escaneados")

    def update_stats(self, folders: int, files: int, bytes_total: int, elapsed: float):
        self._progress.stop()
        self._progress.config(mode="determinate", value=100)
        self._label.config(text=f"Escaneo completado en {elapsed:.1f}s")
        self._stats.config(
            text=f"{folders:,} carpetas  |  {files:,} archivos  |  {format_size(bytes_total)}"
        )

    def set_message(self, msg: str):
        self._label.config(text=msg)
