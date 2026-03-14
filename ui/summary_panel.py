"""
SummaryPanel — Panel flotante de resumen post-escaneo.

Aparece tras completar el escaneo y muestra:
- 4 stat cards: archivos, carpetas, tamaño total, duplicados
- Barras horizontales de top categorías por tamaño
- Botón para cerrar/ocultar
"""

from __future__ import annotations
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme

CAT_COLORS = {
    "Videos":                  "#f43f5e",
    "Imagenes":                "#8b5cf6",
    "Audio":                   "#06b6d4",
    "Documentos":              "#3b82f6",
    "Instaladores/ISO":        "#f59e0b",
    "Temporales/Cache":        "#ef4444",
    "Desarrollo (compilados)": "#10b981",
    "Bases de datos":          "#6366f1",
    "Otros":                   "#6b7280",
}

CAT_ICONS = {
    "Videos":                  "🎬",
    "Imagenes":                "🖼",
    "Audio":                   "🎵",
    "Documentos":              "📄",
    "Instaladores/ISO":        "📦",
    "Temporales/Cache":        "🗑",
    "Desarrollo (compilados)": "⚙",
    "Bases de datos":          "🗄",
    "Otros":                   "📎",
}


class SummaryPanel(tk.Frame):
    """
    Panel de resumen que se incrusta en la parte superior del panel central.
    Se muestra/oculta con show() / hide().
    """

    def __init__(self, parent, on_close=None, **kwargs):
        kwargs.setdefault("bg", theme.BG_CARD)
        super().__init__(parent, **kwargs)
        self._on_close = on_close
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        # Borde superior con acento
        tk.Frame(self, bg=theme.ACCENT, height=2).pack(fill="x")

        # Header
        hdr = tk.Frame(self, bg=theme.BG_CARD)
        hdr.pack(fill="x", padx=14, pady=(8, 0))

        tk.Label(
            hdr, text="✦  Resumen del escaneo",
            bg=theme.BG_CARD, fg=theme.TEXT_ACCENT,
            font=theme.FONT_SMALL_B,
        ).pack(side="left")

        close_btn = tk.Label(
            hdr, text="✕",
            bg=theme.BG_CARD, fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL, cursor="hand2",
        )
        close_btn.pack(side="right")
        close_btn.bind("<Button-1>", lambda _: self.hide())
        close_btn.bind("<Enter>",    lambda _: close_btn.config(fg=theme.TEXT_PRIMARY))
        close_btn.bind("<Leave>",    lambda _: close_btn.config(fg=theme.TEXT_MUTED))

        # Stat cards
        self._cards_frame = tk.Frame(self, bg=theme.BG_CARD)
        self._cards_frame.pack(fill="x", padx=14, pady=8)

        self._card_labels: dict[str, tuple[tk.Label, tk.Label]] = {}
        cards_def = [
            ("files",   "ARCHIVOS",  "0",    theme.ACCENT),
            ("folders", "CARPETAS",  "0",    theme.ACCENT_CYAN),
            ("size",    "TAMAÑO",    "0 B",  theme.ACCENT_GREEN),
            ("dups",    "DUPLICADOS","0",    theme.ACCENT_AMBER),
        ]
        for i, (key, label, default, color) in enumerate(cards_def):
            card = tk.Frame(self._cards_frame, bg=theme.BG_CARD2, bd=0)
            card.grid(row=0, column=i, padx=(0, 8), sticky="ew")
            self._cards_frame.columnconfigure(i, weight=1)

            # Borde izquierdo de color
            tk.Frame(card, bg=color, width=3).pack(side="left", fill="y")

            inner = tk.Frame(card, bg=theme.BG_CARD2)
            inner.pack(fill="both", expand=True, padx=10, pady=8)

            lbl_title = tk.Label(inner, text=label,
                                 bg=theme.BG_CARD2, fg=theme.TEXT_MUTED,
                                 font=theme.FONT_MICRO)
            lbl_title.pack(anchor="w")

            lbl_val = tk.Label(inner, text=default,
                               bg=theme.BG_CARD2, fg=color,
                               font=theme.FONT_NUMBER)
            lbl_val.pack(anchor="w")

            self._card_labels[key] = (lbl_title, lbl_val)

        # Separador
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x", padx=14)

        # Top categorías
        cat_hdr = tk.Frame(self, bg=theme.BG_CARD)
        cat_hdr.pack(fill="x", padx=14, pady=(8, 4))
        tk.Label(cat_hdr, text="TOP CATEGORÍAS POR TAMAÑO",
                 bg=theme.BG_CARD, fg=theme.TEXT_MUTED,
                 font=theme.FONT_MICRO).pack(side="left")

        self._cat_frame = tk.Frame(self, bg=theme.BG_CARD)
        self._cat_frame.pack(fill="x", padx=14, pady=(0, 10))

        # Borde inferior sutil
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")

    # ── API pública ────────────────────────────────────────────────────────────

    def update(self, files: int, folders: int, total_bytes: int,
               duplicates: int, categories: dict):
        """Actualiza los datos del panel."""
        vals = {
            "files":   f"{files:,}",
            "folders": f"{folders:,}",
            "size":    format_size(total_bytes),
            "dups":    str(duplicates),
        }
        for key, (_, lbl_val) in self._card_labels.items():
            lbl_val.config(text=vals.get(key, "—"))

        # Reconstruir barras de categorías
        for w in self._cat_frame.winfo_children():
            w.destroy()

        if not categories:
            return

        sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        top = sorted_cats[:6]
        max_val = top[0][1] if top else 1

        for cat, size in top:
            color = CAT_COLORS.get(cat, theme.TEXT_MUTED)
            icon  = CAT_ICONS.get(cat, "·")
            row   = tk.Frame(self._cat_frame, bg=theme.BG_CARD)
            row.pack(fill="x", pady=2)

            # Label
            tk.Label(row, text=f"{icon} {cat}",
                     bg=theme.BG_CARD, fg=theme.TEXT_SECONDARY,
                     font=theme.FONT_SMALL, width=26, anchor="w"
                     ).pack(side="left")

            # Barra
            bar_frame = tk.Frame(row, bg=theme.BG_CARD2, height=14)
            bar_frame.pack(side="left", fill="x", expand=True, padx=(4, 8))
            bar_frame.pack_propagate(False)

            pct = size / max_val if max_val > 0 else 0
            bar_fill = tk.Frame(bar_frame, bg=color, height=14)
            bar_fill.place(x=0, y=0, relwidth=pct, relheight=1.0)

            # Valor
            tk.Label(row, text=format_size(size),
                     bg=theme.BG_CARD, fg=color,
                     font=theme.FONT_MONO_SM, width=9, anchor="e"
                     ).pack(side="right")

    def show(self):
        children = self.master.winfo_children()
        first = next((w for w in children if w is not self), None)
        if first:
            self.pack(fill="x", before=first)
        else:
            self.pack(fill="x")

    def hide(self):
        self.pack_forget()
        if self._on_close:
            self._on_close()
