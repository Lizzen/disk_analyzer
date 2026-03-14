"""Barra gráfica de uso del disco (Canvas)."""

import shutil
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size


class DiskBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self._build()

    def _build(self):
        self._canvas = tk.Canvas(self, height=28, bg="#2b2b2b",
                                  highlightthickness=0)
        self._canvas.pack(fill="x", padx=8, pady=4)
        self._canvas.bind("<Configure>", self._redraw)
        self._data = None   # (used, total, path_label)

    def update_disk(self, root_path: str):
        try:
            total, used, free = shutil.disk_usage(root_path)
            drive = root_path[:3] if len(root_path) >= 3 else root_path
            self._data = (used, total, drive)
        except OSError:
            self._data = None
        self._redraw()

    def _redraw(self, _event=None):
        c = self._canvas
        c.delete("all")
        w = c.winfo_width()
        h = c.winfo_height()
        if w < 2 or h < 2:
            return

        if not self._data:
            c.create_text(w // 2, h // 2, text="—", fill="#888", anchor="center")
            return

        used, total, drive = self._data
        pct = used / total if total > 0 else 0

        # Fondo
        c.create_rectangle(0, 0, w, h, fill="#3c3c3c", outline="")

        # Barra de uso
        bar_w = int((w - 16) * pct)
        color = "#e05252" if pct > 0.9 else "#e0a030" if pct > 0.75 else "#4caf50"
        if bar_w > 0:
            c.create_rectangle(8, 4, 8 + bar_w, h - 4, fill=color, outline="")

        # Texto
        pct_txt = f"{pct * 100:.1f}%"
        size_txt = f"{drive}  {format_size(used)} / {format_size(total)}  ({pct_txt})"
        c.create_text(w // 2, h // 2, text=size_txt, fill="white",
                      anchor="center", font=("Segoe UI", 9))
