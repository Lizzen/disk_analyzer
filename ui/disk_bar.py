"""Barra de estadísticas del disco — diseño moderno Linear/Vercel.

52 px de alto, Canvas.  Muestra chip de unidad, usado/total, espacio libre,
porcentaje pill y barra de 4 px al fondo.

API pública: update_disk(path), _redraw()
"""

import shutil
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme


class DiskBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._data: tuple | None = None
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self._canvas = tk.Canvas(
            self,
            height=52,
            bg=theme.BG_SURFACE,
            highlightthickness=0,
            bd=0,
        )
        self._canvas.pack(fill="x")
        self._canvas.bind("<Configure>", self._redraw)

    # ── API pública ────────────────────────────────────────────────────────────

    def update_disk(self, root_path: str):
        try:
            total, used, free = shutil.disk_usage(root_path)
            # Extraer letra de unidad o primer segmento del path
            if len(root_path) >= 2 and root_path[1] == ":":
                drive = root_path[:2].upper()
            else:
                drive = root_path[:3] if len(root_path) >= 3 else root_path
            self._data = (used, total, drive)
        except OSError:
            self._data = None
        self._redraw()

    # ── dibujo ────────────────────────────────────────────────────────────────

    def _redraw(self, _event=None):
        c = self._canvas
        c.delete("all")
        w = c.winfo_width()
        h = c.winfo_height()
        if w < 4 or h < 4:
            return

        # Fondo completo
        c.create_rectangle(0, 0, w, h, fill=theme.BG_SURFACE, outline="")

        # Separador superior (1 px)
        c.create_line(0, 0, w, 0, fill=theme.BORDER, width=1)

        if not self._data:
            c.create_text(
                w // 2, h // 2,
                text="No disk data",
                fill=theme.TEXT_MUTED,
                anchor="center",
                font=theme.FONT_SMALL,
            )
            return

        used, total, drive = self._data
        pct = used / total if total > 0 else 0

        # Colores según uso
        bar_color = (
            theme.DISK_RED   if pct > 0.90 else
            theme.DISK_AMBER if pct > 0.75 else
            theme.DISK_GREEN
        )

        # ── Barra de uso (4 px, en la parte baja) ─────────────────────
        bar_h   = 4
        bar_y1  = h - bar_h
        bar_y2  = h

        # Track
        c.create_rectangle(0, bar_y1, w, bar_y2,
                            fill=theme.DISK_TRACK, outline="")
        # Fill
        fill_w = int(w * pct)
        if fill_w > 0:
            c.create_rectangle(0, bar_y1, fill_w, bar_y2,
                                fill=bar_color, outline="")

        # ── Zona de texto (centrada verticalmente sobre la barra) ──────
        text_area_h = h - bar_h
        text_y = text_area_h // 2  # centro vertical de la zona de texto

        # Textos derivados
        used_txt = format_size(used)
        tot_txt  = format_size(total)
        free_txt = format_size(total - used)
        pct_txt  = f"{pct * 100:.1f}%"

        # ── Chip de unidad (izquierda) ─────────────────────────────────
        chip_x    = 14
        chip_pad  = 8
        chip_h    = 22
        chip_y1   = text_y - chip_h // 2
        chip_y2   = text_y + chip_h // 2

        # Medir texto de la unidad para calcular ancho del chip
        # Usamos un ancho fijo proporcional
        chip_text_w = len(drive) * 9 + chip_pad * 2
        chip_x2     = chip_x + chip_text_w

        # Fondo del chip
        c.create_rectangle(chip_x, chip_y1, chip_x2, chip_y2,
                            fill=theme.BG_CARD, outline=theme.BORDER)
        # Texto del chip
        c.create_text(
            (chip_x + chip_x2) // 2, text_y,
            text=drive,
            fill=bar_color,
            anchor="center",
            font=("Segoe UI Variable", 9, "bold"),
        )

        # ── Centro: usado / total ──────────────────────────────────────
        c.create_text(
            w // 2, text_y - 7,
            text=f"{used_txt}  /  {tot_txt}",
            fill=theme.TEXT_PRIMARY,
            anchor="center",
            font=("Segoe UI Variable", 10, "bold"),
        )
        c.create_text(
            w // 2, text_y + 9,
            text=f"{free_txt} free",
            fill=theme.TEXT_SECONDARY,
            anchor="center",
            font=("Segoe UI Variable", 9),
        )

        # ── Porcentaje pill (derecha) ──────────────────────────────────
        pill_r    = 3
        pill_pad  = 10
        pct_tw    = len(pct_txt) * 7 + pill_pad * 2
        pill_x2   = w - 14
        pill_x1   = pill_x2 - pct_tw
        pill_y1   = text_y - 11
        pill_y2   = text_y + 11

        # Fondo pill (semi-transparent simulado con colores oscuros)
        pill_bg = (
            "#2a0f0f" if pct > 0.90 else
            "#2a1f0f" if pct > 0.75 else
            "#0f2a1f"
        )
        c.create_rectangle(pill_x1, pill_y1, pill_x2, pill_y2,
                            fill=pill_bg, outline=bar_color)
        c.create_text(
            (pill_x1 + pill_x2) // 2, text_y,
            text=pct_txt,
            fill=bar_color,
            anchor="center",
            font=("Segoe UI Variable", 9, "bold"),
        )
