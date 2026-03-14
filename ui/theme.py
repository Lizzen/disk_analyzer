"""
Sistema de tema centralizado para Disk Analyzer.
Define paleta de colores, fuentes y estilos ttk en un solo lugar.
"""

import tkinter as tk
from tkinter import ttk

# ── Paleta de colores ──────────────────────────────────────────────────────────

BG_DARK      = "#1a1a2e"   # Fondo principal (azul-negro profundo)
BG_PANEL     = "#16213e"   # Paneles laterales
BG_SURFACE   = "#0f3460"   # Superficies elevadas (toolbar, statusbar)
BG_CARD      = "#1e2a45"   # Tarjetas / filas alternadas
BG_INPUT     = "#0d1b38"   # Campos de entrada
BG_HOVER     = "#233554"   # Hover sobre elementos

ACCENT       = "#e94560"   # Rojo-rosa: acento principal
ACCENT_DARK  = "#c73652"   # Acento oscuro (pressed)
ACCENT_GREEN = "#4ecdc4"   # Verde-turquesa: OK / bajo uso
ACCENT_AMBER = "#f7b731"   # Amarillo: advertencia media
ACCENT_RED   = "#e94560"   # Rojo: crítico / uso alto

TEXT_PRIMARY   = "#e8eaf6"  # Texto principal
TEXT_SECONDARY = "#9fa8da"  # Texto secundario
TEXT_MUTED     = "#5c6bc0"  # Texto apagado

BORDER = "#1e3a5f"          # Bordes sutiles
SASH   = "#0f3460"          # Separador PanedWindow

# Tags de color para FileTable
TAG_HUGE_BG   = "#4a0e0e"
TAG_LARGE_BG  = "#4a2e0a"
TAG_MEDIUM_BG = "#3a3a0a"
TAG_CACHE_BG  = "#1e2233"
TAG_CACHE_FG  = "#7986cb"
TAG_ODD_BG    = "#141d30"
TAG_EVEN_BG   = BG_CARD

# DiskBar
DISK_TRACK = "#1e3a5f"
DISK_GREEN = "#4ecdc4"
DISK_AMBER = "#f7b731"
DISK_RED   = "#e94560"

# ── Fuentes ── (tamaño 10 como base: legible en 1536×864 con scaling 1.33)

FONT_UI      = ("Segoe UI", 10)
FONT_UI_BOLD = ("Segoe UI", 10, "bold")
FONT_SMALL   = ("Segoe UI", 9)
FONT_TITLE   = ("Segoe UI", 11, "bold")
FONT_MONO    = ("Consolas", 9)

# Altura de fila en Treeview (px) — más grande para resoluciones medias
ROW_HEIGHT = 26


# ── Aplicador de tema ─────────────────────────────────────────────────────────

def apply(root: tk.Tk) -> ttk.Style:
    """Aplica el tema completo a la ventana raíz y devuelve el Style."""
    style = ttk.Style(root)

    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    # Frame
    style.configure("TFrame",         background=BG_DARK)
    style.configure("Surface.TFrame", background=BG_SURFACE)
    style.configure("Panel.TFrame",   background=BG_PANEL)

    # Label
    style.configure("TLabel",
                    background=BG_DARK, foreground=TEXT_PRIMARY, font=FONT_UI)
    style.configure("Muted.TLabel",
                    background=BG_DARK, foreground=TEXT_MUTED, font=FONT_SMALL)
    style.configure("Secondary.TLabel",
                    background=BG_DARK, foreground=TEXT_SECONDARY, font=FONT_UI)
    style.configure("Toolbar.TLabel",
                    background=BG_SURFACE, foreground=TEXT_SECONDARY, font=FONT_UI)
    style.configure("Status.TLabel",
                    background=BG_SURFACE, foreground=TEXT_PRIMARY, font=FONT_UI)
    style.configure("Stats.TLabel",
                    background=BG_SURFACE, foreground=TEXT_SECONDARY, font=FONT_SMALL)

    # Entry — padding vertical mayor para que se vea más alto
    style.configure("TEntry",
                    fieldbackground=BG_INPUT,
                    foreground=TEXT_PRIMARY,
                    insertcolor=TEXT_PRIMARY,
                    selectbackground=ACCENT,
                    selectforeground="white",
                    bordercolor=BORDER,
                    lightcolor=BORDER,
                    darkcolor=BORDER,
                    relief="flat",
                    padding=(6, 5))

    # Combobox
    style.configure("TCombobox",
                    fieldbackground=BG_INPUT,
                    background=BG_INPUT,
                    foreground=TEXT_PRIMARY,
                    selectbackground=ACCENT,
                    selectforeground="white",
                    arrowcolor=TEXT_SECONDARY,
                    bordercolor=BORDER,
                    lightcolor=BORDER,
                    darkcolor=BORDER,
                    relief="flat",
                    padding=(6, 5))
    style.map("TCombobox",
              fieldbackground=[("readonly", BG_INPUT), ("disabled", BG_DARK)],
              foreground=[("disabled", TEXT_MUTED)])

    root.option_add("*TCombobox*Listbox.background",       BG_INPUT)
    root.option_add("*TCombobox*Listbox.foreground",       TEXT_PRIMARY)
    root.option_add("*TCombobox*Listbox.selectBackground", ACCENT)
    root.option_add("*TCombobox*Listbox.selectForeground", "white")
    root.option_add("*TCombobox*Listbox.font",             "\"Segoe UI\" 10")

    # Button normal
    style.configure("TButton",
                    background=BG_HOVER,
                    foreground=TEXT_PRIMARY,
                    font=FONT_UI,
                    relief="flat",
                    borderwidth=0,
                    padding=(12, 6),
                    focuscolor=ACCENT)
    style.map("TButton",
              background=[("active", BORDER), ("disabled", BG_DARK)],
              foreground=[("disabled", TEXT_MUTED)],
              relief=[("pressed", "flat")])

    # Button acento (Escanear)
    style.configure("Accent.TButton",
                    background=ACCENT,
                    foreground="white",
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(14, 6))
    style.map("Accent.TButton",
              background=[("active", ACCENT_DARK), ("disabled", "#3d2030")],
              foreground=[("disabled", "#aaaaaa")])

    # Button peligro (eliminar permanente)
    style.configure("Danger.TButton",
                    background="#7b1a1a",
                    foreground="white",
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(12, 6))
    style.map("Danger.TButton",
              background=[("active", "#9c2020"), ("disabled", "#3d1a1a")],
              foreground=[("disabled", "#aaaaaa")])

    # Scrollbar — más estrecha y sutil
    style.configure("TScrollbar",
                    background=BG_PANEL,
                    troughcolor=BG_DARK,
                    bordercolor=BG_DARK,
                    arrowcolor=TEXT_MUTED,
                    relief="flat",
                    borderwidth=0,
                    arrowsize=10,
                    width=10)
    style.map("TScrollbar",
              background=[("active", BORDER)])

    # Separator
    style.configure("TSeparator", background=BORDER)

    # Progressbar — más gruesa para que sea visible
    style.configure("TProgressbar",
                    background=ACCENT,
                    troughcolor=BG_INPUT,
                    bordercolor=BG_INPUT,
                    lightcolor=ACCENT,
                    darkcolor=ACCENT,
                    thickness=5)

    # Treeview — rowheight mayor para mejor legibilidad
    style.configure("Treeview",
                    background=BG_PANEL,
                    fieldbackground=BG_PANEL,
                    foreground=TEXT_PRIMARY,
                    font=FONT_UI,
                    rowheight=ROW_HEIGHT,
                    borderwidth=0,
                    relief="flat")
    style.configure("Treeview.Heading",
                    background=BG_SURFACE,
                    foreground=TEXT_SECONDARY,
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(6, 6))
    style.map("Treeview",
              background=[("selected", ACCENT)],
              foreground=[("selected", "white")])
    style.map("Treeview.Heading",
              background=[("active", BG_HOVER)],
              relief=[("active", "flat")])

    # Fondo de la ventana raíz
    root.configure(bg=BG_DARK)

    return style
