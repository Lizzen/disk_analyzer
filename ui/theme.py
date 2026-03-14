"""
Sistema de tema centralizado — DKA v2.
Paleta oscura premium inspirada en Linear, Arc, Raycast y Warp.
"""

import tkinter as tk
from tkinter import ttk

# ── Paleta base ───────────────────────────────────────────────────────────────

BG_DARK      = "#0a0a0f"   # negro azulado profundo — fondo raíz
BG_PANEL     = "#0f0f17"   # paneles principales
BG_SURFACE   = "#13131e"   # toolbar / statusbar / headers
BG_CARD      = "#1a1a28"   # tarjetas, items
BG_CARD2     = "#1e1e2e"   # tarjetas elevadas
BG_INPUT     = "#0d0d18"   # campos de entrada
BG_HOVER     = "#22223a"   # hover states
BG_SELECTED  = "#1d2b4f"   # seleccionado

# Borde
BORDER       = "#2a2a40"   # bordes sutiles
BORDER_FOCUS = "#4a4a7a"   # borde en foco

# Texto
TEXT_PRIMARY   = "#f0f0ff"  # blanco ligeramente azulado
TEXT_SECONDARY = "#9898b8"  # gris lavanda
TEXT_MUTED     = "#4a4a6a"  # muy apagado
TEXT_ACCENT    = "#a0a8ff"  # azul claro para etiquetas

# Accentos
ACCENT        = "#6366f1"   # indigo-500 — acento principal
ACCENT_LIGHT  = "#818cf8"   # indigo-400 — hover/light
ACCENT_DARK   = "#4f46e5"   # indigo-600 — pressed
ACCENT_GLOW   = "#6366f120" # semi-transparente para glow

ACCENT_GREEN  = "#10b981"   # emerald-500 — éxito
ACCENT_AMBER  = "#f59e0b"   # amber-500 — advertencia
ACCENT_RED    = "#f43f5e"   # rose-500 — error/peligro
ACCENT_PURPLE = "#a855f7"   # purple-500 — especial
ACCENT_CYAN   = "#06b6d4"   # cyan-500 — info

# Gradiente (simulado con colores)
GRAD_START   = "#6366f1"
GRAD_END     = "#a855f7"

# DiskBar
DISK_TRACK   = "#1e1e30"
DISK_GREEN   = "#10b981"
DISK_AMBER   = "#f59e0b"
DISK_RED     = "#f43f5e"

# Tags FileTable
TAG_HUGE_BG   = "#1f0a14"
TAG_LARGE_BG  = "#1a1300"
TAG_MEDIUM_BG = "#071225"
TAG_CACHE_BG  = "#0d0d1a"
TAG_CACHE_FG  = "#a855f7"
TAG_ODD_BG    = "#0d0d17"
TAG_EVEN_BG   = "#0f0f1a"

# Separador
SASH = "#13131e"

# ── Fuentes ───────────────────────────────────────────────────────────────────

# Segoe UI Variable es la mejor fuente del sistema en Windows 11
FONT_UI       = ("Segoe UI Variable", 10)
FONT_UI_BOLD  = ("Segoe UI Variable", 10, "bold")
FONT_SMALL    = ("Segoe UI Variable", 9)
FONT_SMALL_B  = ("Segoe UI Variable", 9, "bold")
FONT_TITLE    = ("Segoe UI Variable", 13, "bold")
FONT_HEADING  = ("Segoe UI Variable", 11, "bold")
FONT_MICRO    = ("Segoe UI Variable", 8, "bold")
FONT_MONO     = ("Cascadia Code", 9)
FONT_MONO_SM  = ("Cascadia Code", 8)
FONT_NUMBER   = ("Segoe UI Variable", 18, "bold")

ROW_HEIGHT = 30


# ── Helpers de color ──────────────────────────────────────────────────────────

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def blend(c1: str, c2: str, t: float) -> str:
    """Mezcla dos colores hex. t=0 → c1, t=1 → c2."""
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    r = int(r1 + (r2 - r1) * t)
    g = int(g1 + (g2 - g1) * t)
    b = int(b1 + (b2 - b1) * t)
    return f"#{r:02x}{g:02x}{b:02x}"


# ── Aplicador de tema ─────────────────────────────────────────────────────────

def apply(root: tk.Tk) -> ttk.Style:
    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    # ── Frame
    style.configure("TFrame",         background=BG_DARK)
    style.configure("Surface.TFrame", background=BG_SURFACE)
    style.configure("Panel.TFrame",   background=BG_PANEL)
    style.configure("Card.TFrame",    background=BG_CARD)
    style.configure("Card2.TFrame",   background=BG_CARD2)

    # ── Label
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
    style.configure("Accent.TLabel",
                    background=BG_DARK, foreground=TEXT_ACCENT, font=FONT_SMALL_B)

    # ── Entry
    style.configure("TEntry",
                    fieldbackground=BG_INPUT,
                    foreground=TEXT_PRIMARY,
                    insertcolor=ACCENT,
                    selectbackground=ACCENT,
                    selectforeground="white",
                    bordercolor=BORDER,
                    lightcolor=BORDER,
                    darkcolor=BORDER,
                    relief="flat",
                    padding=(10, 7))
    style.map("TEntry",
              bordercolor=[("focus", BORDER_FOCUS)])

    # ── Combobox
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
                    padding=(8, 6))
    style.map("TCombobox",
              fieldbackground=[("readonly", BG_INPUT), ("disabled", BG_DARK)],
              foreground=[("disabled", TEXT_MUTED)],
              bordercolor=[("focus", BORDER_FOCUS)])

    root.option_add("*TCombobox*Listbox.background",       BG_CARD)
    root.option_add("*TCombobox*Listbox.foreground",       TEXT_PRIMARY)
    root.option_add("*TCombobox*Listbox.selectBackground", ACCENT)
    root.option_add("*TCombobox*Listbox.selectForeground", "white")
    root.option_add("*TCombobox*Listbox.font",             "\"Segoe UI Variable\" 10")
    root.option_add("*TCombobox*Listbox.relief",           "flat")

    # ── Button normal
    style.configure("TButton",
                    background=BG_CARD,
                    foreground=TEXT_SECONDARY,
                    font=FONT_UI,
                    relief="flat",
                    borderwidth=0,
                    padding=(14, 8),
                    focuscolor="")
    style.map("TButton",
              background=[("active", BG_HOVER), ("disabled", BG_DARK)],
              foreground=[("active", TEXT_PRIMARY), ("disabled", TEXT_MUTED)],
              relief=[("pressed", "flat")])

    # ── Button accent (indigo)
    style.configure("Accent.TButton",
                    background=ACCENT,
                    foreground="white",
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(18, 8),
                    focuscolor="")
    style.map("Accent.TButton",
              background=[("active", ACCENT_LIGHT), ("disabled", "#2d2d55")],
              foreground=[("disabled", "#5a5a9a")])

    # ── Button ghost (solo texto, sin fondo)
    style.configure("Ghost.TButton",
                    background=BG_SURFACE,
                    foreground=TEXT_MUTED,
                    font=FONT_SMALL,
                    relief="flat",
                    borderwidth=0,
                    padding=(10, 6),
                    focuscolor="")
    style.map("Ghost.TButton",
              background=[("active", BG_HOVER), ("disabled", BG_SURFACE)],
              foreground=[("active", TEXT_PRIMARY), ("disabled", TEXT_MUTED)])

    # ── Button danger
    style.configure("Danger.TButton",
                    background=BG_CARD,
                    foreground=ACCENT_RED,
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(14, 8),
                    focuscolor="")
    style.map("Danger.TButton",
              background=[("active", "#2a0f18"), ("disabled", BG_DARK)],
              foreground=[("disabled", "#7a2a40")])

    # ── Scrollbar (ultra thin 5px)
    style.configure("TScrollbar",
                    background=BG_PANEL,
                    troughcolor=BG_DARK,
                    bordercolor=BG_DARK,
                    arrowcolor=BG_PANEL,
                    relief="flat",
                    borderwidth=0,
                    arrowsize=0,
                    width=5)
    style.map("TScrollbar",
              background=[("active", BORDER)])

    # ── Separator
    style.configure("TSeparator", background=BORDER)

    # ── Progressbar (thin 2px, animated glow)
    style.configure("TProgressbar",
                    background=ACCENT,
                    troughcolor=BG_DARK,
                    bordercolor=BG_DARK,
                    lightcolor=ACCENT_LIGHT,
                    darkcolor=ACCENT,
                    thickness=2)

    # ── Treeview
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
                    foreground=TEXT_MUTED,
                    font=FONT_MICRO,
                    relief="flat",
                    borderwidth=0,
                    padding=(10, 7))
    style.map("Treeview",
              background=[("selected", BG_SELECTED)],
              foreground=[("selected", TEXT_PRIMARY)])
    style.map("Treeview.Heading",
              background=[("active", BG_CARD)],
              foreground=[("active", TEXT_SECONDARY)],
              relief=[("active", "flat")])

    # ── Notebook (para tabs si se usan)
    style.configure("TNotebook",
                    background=BG_SURFACE,
                    tabmargins=[0, 0, 0, 0])
    style.configure("TNotebook.Tab",
                    background=BG_SURFACE,
                    foreground=TEXT_MUTED,
                    font=FONT_SMALL_B,
                    padding=[16, 8])
    style.map("TNotebook.Tab",
              background=[("selected", BG_PANEL)],
              foreground=[("selected", TEXT_PRIMARY)])

    root.configure(bg=BG_DARK)
    return style
