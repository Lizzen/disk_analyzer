"""
Sistema de tema centralizado para Disk Analyzer.
Paleta Linear/Vercel/Raycast — zinc-950 base, blue-500 accent.
"""

import tkinter as tk
from tkinter import ttk

# ── Paleta de colores ──────────────────────────────────────────────────────────

BG_DARK      = "#09090b"   # zinc-950 — fondo raíz
BG_PANEL     = "#111113"   # zinc-900 ish — paneles
BG_SURFACE   = "#18181b"   # zinc-900 — toolbar / statusbar
BG_CARD      = "#1c1c1f"   # ligeramente más claro — tarjetas
BG_INPUT     = "#0f0f11"   # más oscuro — campos de entrada
BG_HOVER     = "#27272a"   # zinc-800 — hover

ACCENT       = "#3b82f6"   # blue-500 — acento principal
ACCENT_DARK  = "#2563eb"   # blue-600 — acento presionado
ACCENT_GREEN = "#10b981"   # emerald-500 — OK / éxito
ACCENT_AMBER = "#f59e0b"   # amber-500 — advertencia
ACCENT_RED   = "#ef4444"   # red-500 — error / peligro

TEXT_PRIMARY   = "#fafafa"  # zinc-50 — texto principal
TEXT_SECONDARY = "#a1a1aa"  # zinc-400 — texto secundario
TEXT_MUTED     = "#52525b"  # zinc-600 — texto apagado

BORDER = "#27272a"          # zinc-800 — bordes sutiles
SASH   = "#18181b"          # separador PanedWindow

# Tags de color para FileTable
TAG_HUGE_BG   = "#1c0a0a"
TAG_LARGE_BG  = "#1c1400"
TAG_MEDIUM_BG = "#0a1020"
TAG_CACHE_BG  = "#0f0f11"
TAG_CACHE_FG  = "#6366f1"  # indigo
TAG_ODD_BG    = "#0c0c0e"
TAG_EVEN_BG   = "#111113"

# DiskBar
DISK_TRACK = "#27272a"
DISK_GREEN = "#10b981"
DISK_AMBER = "#f59e0b"
DISK_RED   = "#ef4444"

# ── Fuentes ────────────────────────────────────────────────────────────────────
FONT_UI      = ("Segoe UI Variable", 10)
FONT_UI_BOLD = ("Segoe UI Variable", 10, "bold")
FONT_SMALL   = ("Segoe UI Variable", 9)
FONT_TITLE   = ("Segoe UI Variable", 12, "bold")
FONT_MONO    = ("Cascadia Code", 9)

# Altura de fila en Treeview
ROW_HEIGHT = 28


# ── Aplicador de tema ──────────────────────────────────────────────────────────

def apply(root: tk.Tk) -> ttk.Style:
    """Aplica el tema completo a la ventana raíz y devuelve el Style."""
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
                    padding=(8, 6))

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
                    padding=(8, 5))
    style.map("TCombobox",
              fieldbackground=[("readonly", BG_INPUT), ("disabled", BG_DARK)],
              foreground=[("disabled", TEXT_MUTED)])

    root.option_add("*TCombobox*Listbox.background",       BG_INPUT)
    root.option_add("*TCombobox*Listbox.foreground",       TEXT_PRIMARY)
    root.option_add("*TCombobox*Listbox.selectBackground", ACCENT)
    root.option_add("*TCombobox*Listbox.selectForeground", "white")
    root.option_add("*TCombobox*Listbox.font",             "\"Segoe UI Variable\" 10")

    # ── Button normal (flat, card bg)
    style.configure("TButton",
                    background=BG_CARD,
                    foreground=TEXT_SECONDARY,
                    font=FONT_UI,
                    relief="flat",
                    borderwidth=0,
                    padding=(12, 7),
                    focuscolor=ACCENT)
    style.map("TButton",
              background=[("active", BG_HOVER), ("disabled", BG_DARK)],
              foreground=[("active", TEXT_PRIMARY), ("disabled", TEXT_MUTED)],
              relief=[("pressed", "flat")])

    # ── Button accent (blue)
    style.configure("Accent.TButton",
                    background=ACCENT,
                    foreground="white",
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(16, 7))
    style.map("Accent.TButton",
              background=[("active", ACCENT_DARK), ("disabled", "#1e3a5f")],
              foreground=[("disabled", "#4a7ab5")])

    # ── Button danger (ghost red text)
    style.configure("Danger.TButton",
                    background=BG_CARD,
                    foreground=ACCENT_RED,
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(12, 7))
    style.map("Danger.TButton",
              background=[("active", "#2a0f0f"), ("disabled", BG_DARK)],
              foreground=[("disabled", "#7a2a2a")])

    # ── Scrollbar (very thin, 6px)
    style.configure("TScrollbar",
                    background=BG_PANEL,
                    troughcolor=BG_DARK,
                    bordercolor=BG_DARK,
                    arrowcolor=BG_PANEL,   # hide arrows
                    relief="flat",
                    borderwidth=0,
                    arrowsize=0,
                    width=6)
    style.map("TScrollbar",
              background=[("active", BORDER)])

    # ── Separator
    style.configure("TSeparator", background=BORDER)

    # ── Progressbar (thin, 2px height)
    style.configure("TProgressbar",
                    background=ACCENT,
                    troughcolor=BG_DARK,
                    bordercolor=BG_DARK,
                    lightcolor=ACCENT,
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
                    font=("Segoe UI Variable", 9, "bold"),
                    relief="flat",
                    borderwidth=0,
                    padding=(8, 6))
    style.map("Treeview",
              background=[("selected", ACCENT)],
              foreground=[("selected", "white")])
    style.map("Treeview.Heading",
              background=[("active", BG_CARD)],
              foreground=[("active", TEXT_SECONDARY)],
              relief=[("active", "flat")])

    root.configure(bg=BG_DARK)
    return style
