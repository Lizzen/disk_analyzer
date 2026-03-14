"""Barra gráfica de uso del disco (Canvas) — diseño moderno."""

import shutil
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme


class DiskBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._build()

    def _build(self):
        self._canvas = tk.Canvas(self, height=46, bg=theme.BG_SURFACE,
                                  highlightthickness=0)
        self._canvas.pack(fill="x", padx=0, pady=0)
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

        # Fondo
        c.create_rectangle(0, 0, w, h, fill=theme.BG_SURFACE, outline="")

        if not self._data:
            c.create_text(w // 2, h // 2, text="— Sin datos de disco —",
                          fill=theme.TEXT_MUTED, anchor="center",
                          font=theme.FONT_UI)
            return

        used, total, drive = self._data
        pct = used / total if total > 0 else 0

        # Track (fondo de la barra)
        bar_x1, bar_y1 = 12, h - 10
        bar_x2, bar_y2 = w - 12, h - 5
        radius = 3
        self._rounded_rect(c, bar_x1, bar_y1, bar_x2, bar_y2,
                            radius, fill=theme.DISK_TRACK, outline="")

        # Barra de uso
        color = (theme.DISK_RED   if pct > 0.9 else
                 theme.DISK_AMBER if pct > 0.75 else
                 theme.DISK_GREEN)
        fill_w = int((bar_x2 - bar_x1) * pct)
        if fill_w > radius * 2:
            self._rounded_rect(c, bar_x1, bar_y1, bar_x1 + fill_w, bar_y2,
                                radius, fill=color, outline="")
        elif fill_w > 0:
            c.create_rectangle(bar_x1, bar_y1, bar_x1 + fill_w, bar_y2,
                                fill=color, outline="")

        # Texto principal
        pct_txt  = f"{pct * 100:.1f}%"
        used_txt = format_size(used)
        tot_txt  = format_size(total)
        free_txt = format_size(total - used)

        text_y = h // 2 - 8   # centrado verticalmente sobre la barra

        # Lado izquierdo: unidad
        c.create_text(16, text_y, anchor="w",
                      text=f"  {drive}",
                      fill=theme.TEXT_PRIMARY, font=("Segoe UI", 10, "bold"))

        # Centro: used / total
        c.create_text(w // 2, text_y, anchor="center",
                      text=f"{used_txt}  /  {tot_txt}",
                      fill=theme.TEXT_PRIMARY, font=("Segoe UI", 10, "bold"))

        # Lado derecho: libre
        c.create_text(w - 16, text_y, anchor="e",
                      text=f"Libre: {free_txt}",
                      fill=theme.TEXT_SECONDARY, font=("Segoe UI", 9))

        # Porcentaje encima de la barra, junto al borde derecho
        c.create_text(w - 16, bar_y1 - 2, anchor="se",
                      text=pct_txt,
                      fill=color, font=("Segoe UI", 9, "bold"))

    @staticmethod
    def _rounded_rect(canvas, x1, y1, x2, y2, r, **kwargs):
        """Dibuja un rectángulo con esquinas redondeadas."""
        points = [
            x1+r, y1,  x2-r, y1,
            x2,   y1,  x2,   y1+r,
            x2,   y2-r, x2,  y2,
            x2-r, y2,  x1+r, y2,
            x1,   y2,  x1,   y2-r,
            x1,   y1+r, x1,  y1,
        ]
        return canvas.create_polygon(points, smooth=True, **kwargs)
