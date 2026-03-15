"""
Sistema de tema centralizado — DKA v2.
Soporte para múltiples temas, incluyendo clásicos modernos y el tema de tu perfil.
"""

import tkinter as tk
from tkinter import ttk

# ── Temas Disponibles ─────────────────────────────────────────────────────────
THEMES = {
    "dark_premium": {
        "BG_DARK": "#09090b",
        "BG_PANEL": "#121216",
        "BG_SURFACE": "#18181b",
        "BG_CARD": "#1f1f23",
        "BG_CARD2": "#27272a",
        "BG_INPUT": "#000000",
        "BG_HOVER": "#27272a",
        "BG_SELECTED": "#18181b",
        "BORDER": "#27272a",
        "BORDER_FOCUS": "#6366f1",
        "TEXT_PRIMARY": "#f8f8f2",
        "TEXT_SECONDARY": "#a1a1aa",
        "TEXT_MUTED": "#52525b",
        "TEXT_ACCENT": "#818cf8",
        "ACCENT": "#6366f1",
        "ACCENT_LIGHT": "#818cf8",
        "ACCENT_DARK": "#4f46e5",
        "ACCENT_GLOW": "#6366f120",
        "ACCENT_GREEN": "#10b981",
        "ACCENT_AMBER": "#f59e0b",
        "ACCENT_RED": "#ef4444",
        "ACCENT_PURPLE": "#8b5cf6",
        "ACCENT_CYAN": "#06b6d4",
        "GRAD_START": "#6366f1",
        "GRAD_END": "#8b5cf6",
        "DISK_TRACK": "#27272a",
        "DISK_GREEN": "#10b981",
        "DISK_AMBER": "#f59e0b",
        "DISK_RED": "#ef4444",
        "TAG_HUGE_BG": "#3f1a1a",
        "TAG_LARGE_BG": "#3f2c1a",
        "TAG_MEDIUM_BG": "#1a2f3f",
        "TAG_CACHE_BG": "#2d1a3f",
        "TAG_CACHE_FG": "#a78bfa",
        "TAG_ODD_BG": "#121216",
        "TAG_EVEN_BG": "#18181b",
        "SASH": "#27272a",
    },
    "dracula": {
        "BG_DARK": "#282a36",
        "BG_PANEL": "#21222c",
        "BG_SURFACE": "#282a36",
        "BG_CARD": "#383a59",
        "BG_CARD2": "#44475a",
        "BG_INPUT": "#1e1f29",
        "BG_HOVER": "#44475a",
        "BG_SELECTED": "#44475a",
        "BORDER": "#6272a4",
        "BORDER_FOCUS": "#bd93f9",
        "TEXT_PRIMARY": "#f8f8f2",
        "TEXT_SECONDARY": "#bfbfbf",
        "TEXT_MUTED": "#6272a4",
        "TEXT_ACCENT": "#ff79c6",
        "ACCENT": "#bd93f9",
        "ACCENT_LIGHT": "#ff79c6",
        "ACCENT_DARK": "#8be9fd",
        "ACCENT_GLOW": "#bd93f920",
        "ACCENT_GREEN": "#50fa7b",
        "ACCENT_AMBER": "#f1fa8c",
        "ACCENT_RED": "#ff5555",
        "ACCENT_PURPLE": "#bd93f9",
        "ACCENT_CYAN": "#8be9fd",
        "GRAD_START": "#bd93f9",
        "GRAD_END": "#ff79c6",
        "DISK_TRACK": "#44475a",
        "DISK_GREEN": "#50fa7b",
        "DISK_AMBER": "#f1fa8c",
        "DISK_RED": "#ff5555",
        "TAG_HUGE_BG": "#442a2a",
        "TAG_LARGE_BG": "#44442a",
        "TAG_MEDIUM_BG": "#2a4444",
        "TAG_CACHE_BG": "#3f2a44",
        "TAG_CACHE_FG": "#bd93f9",
        "TAG_ODD_BG": "#21222c",
        "TAG_EVEN_BG": "#282a36",
        "SASH": "#282a36",
    },
    "nord": {
        "BG_DARK": "#2e3440",
        "BG_PANEL": "#3b4252",
        "BG_SURFACE": "#434c5e",
        "BG_CARD": "#4c566a",
        "BG_CARD2": "#434c5e",
        "BG_INPUT": "#2e3440",
        "BG_HOVER": "#4c566a",
        "BG_SELECTED": "#434c5e",
        "BORDER": "#4c566a",
        "BORDER_FOCUS": "#88c0d0",
        "TEXT_PRIMARY": "#eceff4",
        "TEXT_SECONDARY": "#e5e9f0",
        "TEXT_MUTED": "#d8dee9",
        "TEXT_ACCENT": "#8fbcbb",
        "ACCENT": "#88c0d0",
        "ACCENT_LIGHT": "#81a1c1",
        "ACCENT_DARK": "#5e81ac",
        "ACCENT_GLOW": "#88c0d020",
        "ACCENT_GREEN": "#a3be8c",
        "ACCENT_AMBER": "#ebcb8b",
        "ACCENT_RED": "#bf616a",
        "ACCENT_PURPLE": "#b48ead",
        "ACCENT_CYAN": "#88c0d0",
        "GRAD_START": "#88c0d0",
        "GRAD_END": "#81a1c1",
        "DISK_TRACK": "#434c5e",
        "DISK_GREEN": "#a3be8c",
        "DISK_AMBER": "#ebcb8b",
        "DISK_RED": "#bf616a",
        "TAG_HUGE_BG": "#4c383d",
        "TAG_LARGE_BG": "#4c4638",
        "TAG_MEDIUM_BG": "#384c4c",
        "TAG_CACHE_BG": "#46384c",
        "TAG_CACHE_FG": "#b48ead",
        "TAG_ODD_BG": "#3b4252",
        "TAG_EVEN_BG": "#2e3440",
        "SASH": "#3b4252",
    },
    "tokyo_night": {
        "BG_DARK": "#1a1b26",
        "BG_PANEL": "#24283b",
        "BG_SURFACE": "#1f2335",
        "BG_CARD": "#292e42",
        "BG_CARD2": "#3b4261",
        "BG_INPUT": "#1a1b26",
        "BG_HOVER": "#292e42",
        "BG_SELECTED": "#292e42",
        "BORDER": "#3b4261",
        "BORDER_FOCUS": "#7aa2f7",
        "TEXT_PRIMARY": "#c0caf5",
        "TEXT_SECONDARY": "#a9b1d6",
        "TEXT_MUTED": "#565f89",
        "TEXT_ACCENT": "#bb9af7",
        "ACCENT": "#7aa2f7",
        "ACCENT_LIGHT": "#89b4fa",
        "ACCENT_DARK": "#3d59a1",
        "ACCENT_GLOW": "#7aa2f720",
        "ACCENT_GREEN": "#9ece6a",
        "ACCENT_AMBER": "#e0af68",
        "ACCENT_RED": "#f7768e",
        "ACCENT_PURPLE": "#bb9af7",
        "ACCENT_CYAN": "#7dcfff",
        "GRAD_START": "#7aa2f7",
        "GRAD_END": "#bb9af7",
        "DISK_TRACK": "#3b4261",
        "DISK_GREEN": "#9ece6a",
        "DISK_AMBER": "#e0af68",
        "DISK_RED": "#f7768e",
        "TAG_HUGE_BG": "#422832",
        "TAG_LARGE_BG": "#423828",
        "TAG_MEDIUM_BG": "#283842",
        "TAG_CACHE_BG": "#382842",
        "TAG_CACHE_FG": "#bb9af7",
        "TAG_ODD_BG": "#1f2335",
        "TAG_EVEN_BG": "#24283b",
        "SASH": "#1f2335",
    },
    "catppuccin_mocha": {
        "BG_DARK": "#11111b",
        "BG_PANEL": "#1e1e2e",
        "BG_SURFACE": "#181825",
        "BG_CARD": "#313244",
        "BG_CARD2": "#45475a",
        "BG_INPUT": "#11111b",
        "BG_HOVER": "#313244",
        "BG_SELECTED": "#45475a",
        "BORDER": "#313244",
        "BORDER_FOCUS": "#cba6f7",
        "TEXT_PRIMARY": "#cdd6f4",
        "TEXT_SECONDARY": "#bac2de",
        "TEXT_MUTED": "#6c7086",
        "TEXT_ACCENT": "#f5c2e7",
        "ACCENT": "#cba6f7",
        "ACCENT_LIGHT": "#f5c2e7",
        "ACCENT_DARK": "#b4befe",
        "ACCENT_GLOW": "#cba6f720",
        "ACCENT_GREEN": "#a6e3a1",
        "ACCENT_AMBER": "#f9e2af",
        "ACCENT_RED": "#f38ba8",
        "ACCENT_PURPLE": "#cba6f7",
        "ACCENT_CYAN": "#89dceb",
        "GRAD_START": "#cba6f7",
        "GRAD_END": "#f5c2e7",
        "DISK_TRACK": "#45475a",
        "DISK_GREEN": "#a6e3a1",
        "DISK_AMBER": "#f9e2af",
        "DISK_RED": "#f38ba8",
        "TAG_HUGE_BG": "#4a2a34",
        "TAG_LARGE_BG": "#4a422a",
        "TAG_MEDIUM_BG": "#2a424a",
        "TAG_CACHE_BG": "#3a2a4a",
        "TAG_CACHE_FG": "#cba6f7",
        "TAG_ODD_BG": "#181825",
        "TAG_EVEN_BG": "#1e1e2e",
        "SASH": "#181825",
    },
    "github_dark": {
        "BG_DARK": "#010409",
        "BG_PANEL": "#0d1117",
        "BG_SURFACE": "#161b22",
        "BG_CARD": "#21262d",
        "BG_CARD2": "#30363d",
        "BG_INPUT": "#010409",
        "BG_HOVER": "#21262d",
        "BG_SELECTED": "#1f6feb",
        "BORDER": "#30363d",
        "BORDER_FOCUS": "#58a6ff",
        "TEXT_PRIMARY": "#c9d1d9",
        "TEXT_SECONDARY": "#8b949e",
        "TEXT_MUTED": "#484f58",
        "TEXT_ACCENT": "#79c0ff",
        "ACCENT": "#2f81f7",
        "ACCENT_LIGHT": "#58a6ff",
        "ACCENT_DARK": "#1f6feb",
        "ACCENT_GLOW": "#58a6ff20",
        "ACCENT_GREEN": "#238636",
        "ACCENT_AMBER": "#d29922",
        "ACCENT_RED": "#da3633",
        "ACCENT_PURPLE": "#bc8cff",
        "ACCENT_CYAN": "#39c5cf",
        "GRAD_START": "#58a6ff",
        "GRAD_END": "#bc8cff",
        "DISK_TRACK": "#21262d",
        "DISK_GREEN": "#238636",
        "DISK_AMBER": "#d29922",
        "DISK_RED": "#da3633",
        "TAG_HUGE_BG": "#3a1d1d",
        "TAG_LARGE_BG": "#3d3016",
        "TAG_MEDIUM_BG": "#112e3e",
        "TAG_CACHE_BG": "#2b1c3f",
        "TAG_CACHE_FG": "#bc8cff",
        "TAG_ODD_BG": "#0d1117",
        "TAG_EVEN_BG": "#161b22",
        "SASH": "#30363d",
    },
    "profile_cyber": {
        "BG_DARK": "#0f111a",
        "BG_PANEL": "#151824",
        "BG_SURFACE": "#1a1e2d",
        "BG_CARD": "#23283a",
        "BG_CARD2": "#2e344a",
        "BG_INPUT": "#0b0c12",
        "BG_HOVER": "#2a2f45",
        "BG_SELECTED": "#303752",
        "BORDER": "#353d57",
        "BORDER_FOCUS": "#59dff2",
        "TEXT_PRIMARY": "#e6dcf5",
        "TEXT_SECONDARY": "#afb8cf",
        "TEXT_MUTED": "#5f6985",
        "TEXT_ACCENT": "#f071e6",
        "ACCENT": "#59dff2",
        "ACCENT_LIGHT": "#8ae9f5",
        "ACCENT_DARK": "#1eaec4",
        "ACCENT_GLOW": "#59dff230",
        "ACCENT_GREEN": "#00f0ff",
        "ACCENT_AMBER": "#ffb86c",
        "ACCENT_RED": "#ff5ce7",
        "ACCENT_PURPLE": "#c678dd",
        "ACCENT_CYAN": "#59dff2",
        "GRAD_START": "#59dff2",
        "GRAD_END": "#f071e6",
        "DISK_TRACK": "#2e344a",
        "DISK_GREEN": "#00f0ff",
        "DISK_AMBER": "#ffb86c",
        "DISK_RED": "#ff5ce7",
        "TAG_HUGE_BG": "#4a1936",
        "TAG_LARGE_BG": "#4a3c19",
        "TAG_MEDIUM_BG": "#193c4a",
        "TAG_CACHE_BG": "#34194a",
        "TAG_CACHE_FG": "#f071e6",
        "TAG_ODD_BG": "#151824",
        "TAG_EVEN_BG": "#1a1e2d",
        "SASH": "#353d57",
    },
    "profile_pastel": {
        "BG_DARK": "#dfd5eb",
        "BG_PANEL": "#ebe4f2",
        "BG_SURFACE": "#f4f0f7",
        "BG_CARD": "#ffffff",
        "BG_CARD2": "#ffffff",
        "BG_INPUT": "#ffffff",
        "BG_HOVER": "#f7f4fa",
        "BG_SELECTED": "#dcd0e8",
        "BORDER": "#c9bada",
        "BORDER_FOCUS": "#59dff2",
        "TEXT_PRIMARY": "#11131c",
        "TEXT_SECONDARY": "#4a4e69",
        "TEXT_MUTED": "#8389a3",
        "TEXT_ACCENT": "#f071e6",
        "ACCENT": "#11131c",
        "ACCENT_LIGHT": "#363a52",
        "ACCENT_DARK": "#000000",
        "ACCENT_GLOW": "#11131c20",
        "ACCENT_GREEN": "#38bdf8",
        "ACCENT_AMBER": "#f5a356",
        "ACCENT_RED": "#f071e6",
        "ACCENT_PURPLE": "#b27bf2",
        "ACCENT_CYAN": "#59dff2",
        "GRAD_START": "#59dff2",
        "GRAD_END": "#f071e6",
        "DISK_TRACK": "#c9bada",
        "DISK_GREEN": "#59dff2",
        "DISK_AMBER": "#f5a356",
        "DISK_RED": "#f071e6",
        "TAG_HUGE_BG": "#fcddec",
        "TAG_LARGE_BG": "#fcebdc",
        "TAG_MEDIUM_BG": "#dcf6fc",
        "TAG_CACHE_BG": "#eddbfc",
        "TAG_CACHE_FG": "#b27bf2",
        "TAG_ODD_BG": "#ebe4f2",
        "TAG_EVEN_BG": "#f4f0f7",
        "SASH": "#c9bada",
    }
}

ACTIVE_THEME = "profile_cyber" # Por defecto el tema basado en tu foto de perfil

# Inyectamos las variables locales
for _k, _v in THEMES[ACTIVE_THEME].items():
    globals()[_k] = _v

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

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    if not hex_color:
        return (0,0,0)
    h = hex_color.lstrip("#")
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        return (0,0,0)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def blend(c1: str, c2: str, t: float) -> str:
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    r = int(r1 + (r2 - r1) * t)
    g = int(g1 + (g2 - g1) * t)
    b = int(b1 + (b2 - b1) * t)
    return f"#{r:02x}{g:02x}{b:02x}"

def set_theme(theme_name: str, root: tk.Tk = None):
    global ACTIVE_THEME
    if theme_name in THEMES:
        ACTIVE_THEME = theme_name
        for _k, _v in THEMES[theme_name].items():
            globals()[_k] = _v
        if root:
            apply(root)

def apply(root: tk.Tk) -> ttk.Style:
    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    bg_dark = globals().get("BG_DARK", "#0a0a0f")
    bg_surface = globals().get("BG_SURFACE", "#13131e")
    bg_panel = globals().get("BG_PANEL", "#0f0f17")
    bg_card = globals().get("BG_CARD", "#1a1a28")
    bg_card2 = globals().get("BG_CARD2", "#1e1e2e")
    bg_input = globals().get("BG_INPUT", "#0d0d18")
    bg_hover = globals().get("BG_HOVER", "#22223a")
    bg_selected = globals().get("BG_SELECTED", "#1d2b4f")
    border = globals().get("BORDER", "#2a2a40")
    border_focus = globals().get("BORDER_FOCUS", "#4a4a7a")
    text_primary = globals().get("TEXT_PRIMARY", "#f0f0ff")
    text_secondary = globals().get("TEXT_SECONDARY", "#9898b8")
    text_muted = globals().get("TEXT_MUTED", "#4a4a6a")
    text_accent = globals().get("TEXT_ACCENT", "#a0a8ff")
    accent = globals().get("ACCENT", "#6366f1")
    accent_light = globals().get("ACCENT_LIGHT", "#818cf8")
    accent_red = globals().get("ACCENT_RED", "#f43f5e")

    style.configure("TFrame",         background=bg_dark)
    style.configure("Surface.TFrame", background=bg_surface)
    style.configure("Panel.TFrame",   background=bg_panel)
    style.configure("Card.TFrame",    background=bg_card)
    style.configure("Card2.TFrame",   background=bg_card2)

    style.configure("TLabel",
                    background=bg_dark, foreground=text_primary, font=FONT_UI)
    style.configure("Muted.TLabel",
                    background=bg_dark, foreground=text_muted, font=FONT_SMALL)
    style.configure("Secondary.TLabel",
                    background=bg_dark, foreground=text_secondary, font=FONT_UI)
    style.configure("Toolbar.TLabel",
                    background=bg_surface, foreground=text_secondary, font=FONT_UI)
    style.configure("Status.TLabel",
                    background=bg_surface, foreground=text_primary, font=FONT_UI)
    style.configure("Stats.TLabel",
                    background=bg_surface, foreground=text_secondary, font=FONT_SMALL)
    style.configure("Accent.TLabel",
                    background=bg_dark, foreground=text_accent, font=FONT_SMALL_B)

    style.configure("TEntry",
                    fieldbackground=bg_input,
                    foreground=text_primary,
                    insertcolor=accent,
                    selectbackground=accent,
                    selectforeground="white",
                    bordercolor=border,
                    lightcolor=border,
                    darkcolor=border,
                    relief="flat",
                    padding=(10, 7))
    style.map("TEntry",
              bordercolor=[("focus", border_focus)])

    style.configure("TCombobox",
                    fieldbackground=bg_input,
                    background=bg_input,
                    foreground=text_primary,
                    selectbackground=accent,
                    selectforeground="white",
                    arrowcolor=text_secondary,
                    bordercolor=border,
                    lightcolor=border,
                    darkcolor=border,
                    relief="flat",
                    padding=(8, 6))
    style.map("TCombobox",
              fieldbackground=[("readonly", bg_input), ("disabled", bg_dark)],
              foreground=[("disabled", text_muted)],
              bordercolor=[("focus", border_focus)])

    root.option_add("*TCombobox*Listbox.background",       bg_card)
    root.option_add("*TCombobox*Listbox.foreground",       text_primary)
    root.option_add("*TCombobox*Listbox.selectBackground", accent)
    root.option_add("*TCombobox*Listbox.selectForeground", "white")
    root.option_add("*TCombobox*Listbox.font",             "\"Segoe UI Variable\" 10")
    root.option_add("*TCombobox*Listbox.relief",           "flat")

    style.configure("TButton",
                    background=bg_card,
                    foreground=text_secondary,
                    font=FONT_UI,
                    relief="flat",
                    borderwidth=0,
                    padding=(14, 8),
                    focuscolor="")
    style.map("TButton",
              background=[("active", bg_hover), ("disabled", bg_dark)],
              foreground=[("active", text_primary), ("disabled", text_muted)],
              relief=[("pressed", "flat")])

    style.configure("Accent.TButton",
                    background=accent,
                    foreground="white",
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(18, 8),
                    focuscolor="")
    style.map("Accent.TButton",
              background=[("active", accent_light), ("disabled", "#2d2d55")],
              foreground=[("disabled", "#5a5a9a")])

    style.configure("Ghost.TButton",
                    background=bg_surface,
                    foreground=text_muted,
                    font=FONT_SMALL,
                    relief="flat",
                    borderwidth=0,
                    padding=(10, 6),
                    focuscolor="")
    style.map("Ghost.TButton",
              background=[("active", bg_hover), ("disabled", bg_surface)],
              foreground=[("active", text_primary), ("disabled", text_muted)])

    style.configure("Danger.TButton",
                    background=bg_card,
                    foreground=accent_red,
                    font=FONT_UI_BOLD,
                    relief="flat",
                    borderwidth=0,
                    padding=(14, 8),
                    focuscolor="")
    style.map("Danger.TButton",
              background=[("active", "#2a0f18"), ("disabled", bg_dark)],
              foreground=[("disabled", "#7a2a40")])

    style.configure("TScrollbar",
                    background=bg_panel,
                    troughcolor=bg_dark,
                    bordercolor=bg_dark,
                    arrowcolor=bg_panel,
                    relief="flat",
                    borderwidth=0,
                    arrowsize=0,
                    width=5)
    style.map("TScrollbar",
              background=[("active", border)])

    style.configure("TSeparator", background=border)

    style.configure("TProgressbar",
                    background=accent,
                    troughcolor=bg_dark,
                    bordercolor=bg_dark,
                    lightcolor=accent_light,
                    darkcolor=accent,
                    thickness=2)

    style.configure("Treeview",
                    background=bg_panel,
                    fieldbackground=bg_panel,
                    foreground=text_primary,
                    font=FONT_UI,
                    rowheight=ROW_HEIGHT,
                    borderwidth=0,
                    relief="flat")
    style.configure("Treeview.Heading",
                    background=bg_surface,
                    foreground=text_muted,
                    font=FONT_MICRO,
                    relief="flat",
                    borderwidth=0,
                    padding=(10, 7))
    style.map("Treeview",
              background=[("selected", bg_selected)],
              foreground=[("selected", text_primary)])
    style.map("Treeview.Heading",
              background=[("active", bg_card)],
              foreground=[("active", text_secondary)],
              relief=[("active", "flat")])

    style.configure("TNotebook",
                    background=bg_surface,
                    tabmargins=[0, 0, 0, 0])
    style.configure("TNotebook.Tab",
                    background=bg_surface,
                    foreground=text_muted,
                    font=FONT_SMALL_B,
                    padding=[16, 8])
    style.map("TNotebook.Tab",
              background=[("selected", bg_panel)],
              foreground=[("selected", text_primary)])

    root.configure(bg=bg_dark)
    return style