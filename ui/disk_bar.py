"""
DiskBar v2 — Barra de estadísticas del disco con donut arc chart.

Canvas con arco animado + 3 cards de métricas: usado, libre, porcentaje.
"""

import math
import shutil
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme

BAR_H = 64


class DiskBar(ttk.Frame):
    def __init__(self, parent, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._data: tuple | None = None
        self._anim_pct = 0.0
        self._anim_job = None
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        # Borde superior sutil
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")

        self._canvas = tk.Canvas(
            self,
            height=BAR_H,
            bg=theme.BG_SURFACE,
            highlightthickness=0, bd=0,
        )
        self._canvas.pack(fill="x")
        self._canvas.bind("<Configure>", lambda _: self._redraw())

    # ── API pública ────────────────────────────────────────────────────────────

    def update_disk(self, root_path: str):
        try:
            total, used, free = shutil.disk_usage(root_path)
            drive = root_path[:2].upper() if len(root_path) >= 2 and root_path[1] == ":" else root_path[:3]
            self._data = (used, total, drive)
        except OSError:
            self._data = None
        # Animar el arco desde 0
        self._anim_pct = 0.0
        self._start_animation()

    # ── animación ─────────────────────────────────────────────────────────────

    def _start_animation(self):
        if self._anim_job:
            self.after_cancel(self._anim_job)
        self._animate_step()

    def _animate_step(self):
        if not self._data:
            self._redraw()
            return
        used, total, _ = self._data
        target = used / total if total > 0 else 0
        diff = target - self._anim_pct
        if abs(diff) < 0.005:
            self._anim_pct = target
            self._redraw()
            return
        self._anim_pct += diff * 0.18
        self._redraw()
        self._anim_job = self.after(16, self._animate_step)

    # ── dibujo ────────────────────────────────────────────────────────────────

    def _redraw(self):
        c = self._canvas
        c.delete("all")
        w = c.winfo_width()
        h = c.winfo_height()
        if w < 4 or h < 4:
            return

        c.create_rectangle(0, 0, w, h, fill=theme.BG_SURFACE, outline="")

        if not self._data:
            c.create_text(w // 2, h // 2, text="— sin datos de disco —",
                          fill=theme.TEXT_MUTED, font=theme.FONT_SMALL, anchor="center")
            return

        used, total, drive = self._data
        pct = used / total if total > 0 else 0
        anim = self._anim_pct

        bar_color = (
            theme.DISK_RED   if pct > 0.90 else
            theme.DISK_AMBER if pct > 0.75 else
            theme.DISK_GREEN
        )

        margin = 10
        cy = h // 2
        r_out = (h - margin * 2) // 2
        r_in  = max(r_out - 7, 4)
        cx    = margin + r_out

        # ── Donut arc ────────────────────────────────────────────────────
        # Track (fondo gris)
        self._draw_arc(c, cx, cy, r_out, r_in, 0, 360, theme.DISK_TRACK)
        # Fill animado
        if anim > 0:
            self._draw_arc(c, cx, cy, r_out, r_in, -90, anim * 360 - 0.1, bar_color)

        # Texto central del donut
        pct_txt = f"{int(pct * 100)}%"
        c.create_text(cx, cy - 1, text=pct_txt,
                      fill=bar_color, font=("Segoe UI Variable", 8, "bold"),
                      anchor="center")

        # ── Separador ────────────────────────────────────────────────────
        sep_x = cx * 2 + 14
        c.create_line(sep_x, margin + 2, sep_x, h - margin - 2,
                      fill=theme.BORDER, width=1)

        # ── Cards de métricas ─────────────────────────────────────────────
        # Calcular zona disponible para las cards
        cards_x = sep_x + 10
        card_w  = max((w - cards_x - margin) // 3 - 8, 60)
        cards = [
            ("UNIDAD", drive,              bar_color),
            ("USADO",  format_size(used),  theme.TEXT_PRIMARY),
            ("LIBRE",  format_size(total - used), theme.ACCENT_GREEN if pct < 0.75 else theme.ACCENT_AMBER),
        ]

        for i, (label, value, color) in enumerate(cards):
            cx_card = cards_x + i * (card_w + 8) + card_w // 2
            # Card background
            c.create_rectangle(
                cx_card - card_w // 2, margin,
                cx_card + card_w // 2, h - margin,
                fill=theme.BG_CARD, outline=theme.BORDER,
            )
            # Label micro
            c.create_text(cx_card, margin + 10,
                          text=label, fill=theme.TEXT_MUTED,
                          font=("Segoe UI Variable", 7, "bold"), anchor="center")
            # Valor
            c.create_text(cx_card, cy + 2,
                          text=value, fill=color,
                          font=("Segoe UI Variable", 10, "bold"), anchor="center")

        # ── Barra de uso en el fondo (2px) ────────────────────────────────
        bar_y = h - 2
        c.create_rectangle(0, bar_y, w, h, fill=theme.DISK_TRACK, outline="")
        fill_w = int(w * anim)
        if fill_w > 0:
            c.create_rectangle(0, bar_y, fill_w, h, fill=bar_color, outline="")

    @staticmethod
    def _draw_arc(canvas, cx, cy, r_out, r_in, start_deg, extent_deg, color):
        """Dibuja un arco de donut con polígono de puntos."""
        if abs(extent_deg) < 0.5:
            return
        steps = max(int(abs(extent_deg) / 3), 2)
        start_rad = math.radians(start_deg)
        extent_rad = math.radians(extent_deg)
        pts = []
        for i in range(steps + 1):
            a = start_rad + extent_rad * i / steps
            pts.append(cx + r_out * math.cos(a))
            pts.append(cy + r_out * math.sin(a))
        for i in range(steps, -1, -1):
            a = start_rad + extent_rad * i / steps
            pts.append(cx + r_in * math.cos(a))
            pts.append(cy + r_in * math.sin(a))
        if len(pts) >= 6:
            canvas.create_polygon(pts, fill=color, outline="", smooth=False)
