"""
FilterBar v2 — Barra de filtros con pills de categoría clicables.

- Pills horizontales por categoría con contador de archivos (actualizable)
- Size dropdown compacto
- Search input con icono y borde vivo al focus
- Botón limpiar ghost
"""

import tkinter as tk
from tkinter import ttk

import ui.theme as theme

SIZE_OPTIONS = {
    "Todo":     0,
    "> 1 MB":   1 * 1024 * 1024,
    "> 10 MB":  10 * 1024 * 1024,
    "> 100 MB": 100 * 1024 * 1024,
    "> 500 MB": 500 * 1024 * 1024,
    "> 1 GB":   1024 * 1024 * 1024,
}

CATEGORIES = [
    "Todos", "Videos", "Imagenes", "Audio", "Documentos",
    "Instaladores/ISO", "Temporales/Cache", "Desarrollo (compilados)",
    "Bases de datos", "Otros",
]

CAT_ICONS = {
    "Todos":                   "◈",
    "Videos":                  "▶",
    "Imagenes":                "⬚",
    "Audio":                   "♪",
    "Documentos":              "≡",
    "Instaladores/ISO":        "⬇",
    "Temporales/Cache":        "⟳",
    "Desarrollo (compilados)": "⚙",
    "Bases de datos":          "◉",
    "Otros":                   "·",
}

CAT_COLORS = {
    "Todos":                   theme.ACCENT,
    "Videos":                  "#f43f5e",
    "Imagenes":                "#8b5cf6",
    "Audio":                   "#06b6d4",
    "Documentos":              "#3b82f6",
    "Instaladores/ISO":        "#f59e0b",
    "Temporales/Cache":        "#ef4444",
    "Desarrollo (compilados)": "#10b981",
    "Bases de datos":          "#6366f1",
    "Otros":                   "#9ca3af",
}


class FilterBar(ttk.Frame):
    def __init__(self, parent, on_change, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._on_change = on_change
        self._active_cat = "Todos"
        self._pill_buttons: dict[str, tk.Label] = {}
        self._placeholder_active = True
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        # Borde superior
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")

        row = tk.Frame(self, bg=theme.BG_SURFACE)
        row.pack(fill="x", padx=0, pady=0)

        # ── Zona de pills (scrollable horizontal via canvas) ───────────
        pills_canvas = tk.Canvas(
            row, bg=theme.BG_SURFACE, height=42,
            highlightthickness=0, bd=0,
        )
        pills_canvas.pack(side="left", fill="x", expand=True, padx=(10, 0))

        self._pills_inner = tk.Frame(pills_canvas, bg=theme.BG_SURFACE)
        self._pills_win = pills_canvas.create_window(
            (0, 0), window=self._pills_inner, anchor="nw"
        )
        self._pills_inner.bind("<Configure>", lambda e: pills_canvas.configure(
            scrollregion=pills_canvas.bbox("all")
        ))
        pills_canvas.bind("<Configure>", lambda e: pills_canvas.itemconfig(
            self._pills_win, height=e.height
        ))
        # Scroll horizontal con rueda
        pills_canvas.bind("<MouseWheel>", lambda e: pills_canvas.xview_scroll(
            int(-1 * e.delta / 120), "units"
        ))

        for cat in CATEGORIES:
            self._make_pill(self._pills_inner, cat)

        # Separator
        tk.Frame(row, bg=theme.BORDER, width=1).pack(
            side="left", fill="y", pady=6, padx=8
        )

        # ── Size combobox compacto ────────────────────────────────────
        tk.Label(
            row, text="SIZE",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=theme.FONT_MICRO,
        ).pack(side="left", padx=(0, 4))

        self._size_var = tk.StringVar(value="Todo")
        size_combo = ttk.Combobox(
            row, textvariable=self._size_var,
            values=list(SIZE_OPTIONS.keys()),
            state="readonly", width=9,
            font=theme.FONT_SMALL,
        )
        size_combo.pack(side="left", ipady=4)
        self._size_var.trace_add("write", self._fire)

        # Separator
        tk.Frame(row, bg=theme.BORDER, width=1).pack(
            side="left", fill="y", pady=6, padx=8
        )

        # ── Search input ──────────────────────────────────────────────
        tk.Label(
            row, text="⌕",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 13),
        ).pack(side="left", padx=(0, 4))

        self._search_border = tk.Frame(row, bg=theme.BORDER)
        self._search_border.pack(side="left", padx=(0, 6))

        search_inner = tk.Frame(self._search_border, bg=theme.BG_INPUT)
        search_inner.pack(fill="both", expand=True, padx=1, pady=1)

        self._name_var = tk.StringVar()
        self._name_var.trace_add("write", self._fire)
        self._search_entry = tk.Entry(
            search_inner,
            textvariable=self._name_var,
            bg=theme.BG_INPUT, fg=theme.TEXT_PRIMARY,
            insertbackground=theme.ACCENT,
            relief="flat", bd=0,
            font=theme.FONT_SMALL,
            width=16,
        )
        self._search_entry.pack(padx=8, pady=5)

        self._placeholder = "Filtrar nombre…"
        self._search_entry.insert(0, self._placeholder)
        self._search_entry.config(fg=theme.TEXT_MUTED)
        self._placeholder_active = True
        self._search_entry.bind("<FocusIn>",  self._search_focus_in)
        self._search_entry.bind("<FocusOut>", self._search_focus_out)

        # ── Botón limpiar ─────────────────────────────────────────────
        clear_btn = tk.Label(
            row, text="✕ Limpiar",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL, cursor="hand2",
            padx=8, pady=6,
        )
        clear_btn.pack(side="left", padx=(0, 10))
        clear_btn.bind("<Button-1>", lambda _: self.reset())
        clear_btn.bind("<Enter>",    lambda _: clear_btn.config(fg=theme.TEXT_PRIMARY))
        clear_btn.bind("<Leave>",    lambda _: clear_btn.config(fg=theme.TEXT_MUTED))

    def _make_pill(self, parent, cat: str):
        icon  = CAT_ICONS.get(cat, "·")
        color = CAT_COLORS.get(cat, theme.TEXT_MUTED)
        is_active = cat == "Todos"

        bg   = theme.blend(theme.BG_CARD, color, 0.18) if is_active else theme.BG_CARD
        fg   = color if is_active else theme.TEXT_MUTED
        border_f = tk.Frame(parent, bg=color if is_active else theme.BORDER, bd=0)
        border_f.pack(side="left", padx=(4, 0), pady=8)

        pill = tk.Label(
            border_f,
            text=f" {icon} {cat} ",
            bg=bg, fg=fg,
            font=theme.FONT_SMALL_B if is_active else theme.FONT_SMALL,
            cursor="hand2",
            padx=6, pady=3,
        )
        pill.pack(padx=1, pady=1)

        def on_click(_event, c=cat, p=pill, b=border_f):
            self._set_active_cat(c)

        def on_enter(_event, c=cat, p=pill, b=border_f):
            if self._active_cat != c:
                p.config(fg=theme.TEXT_SECONDARY)

        def on_leave(_event, c=cat, p=pill, b=border_f):
            if self._active_cat != c:
                p.config(fg=theme.TEXT_MUTED)

        pill.bind("<Button-1>", on_click)
        pill.bind("<Enter>",    on_enter)
        pill.bind("<Leave>",    on_leave)

        self._pill_buttons[cat] = (pill, border_f, color)

    def _set_active_cat(self, cat: str):
        prev = self._active_cat
        self._active_cat = cat

        for c, (pill, border_f, color) in self._pill_buttons.items():
            if c == cat:
                border_f.config(bg=color)
                pill.config(
                    bg=theme.blend(theme.BG_CARD, color, 0.18),
                    fg=color,
                    font=theme.FONT_SMALL_B,
                )
            else:
                border_f.config(bg=theme.BORDER)
                pill.config(
                    bg=theme.BG_CARD,
                    fg=theme.TEXT_MUTED,
                    font=theme.FONT_SMALL,
                )

        if prev != cat:
            self._fire()

    # ── Focus / placeholder ────────────────────────────────────────────────────

    def _search_focus_in(self, _=None):
        self._search_border.config(bg=theme.ACCENT)
        if self._placeholder_active:
            self._search_entry.delete(0, "end")
            self._search_entry.config(fg=theme.TEXT_PRIMARY)
            self._placeholder_active = False

    def _search_focus_out(self, _=None):
        self._search_border.config(bg=theme.BORDER)
        if not self._search_entry.get():
            self._search_entry.insert(0, self._placeholder)
            self._search_entry.config(fg=theme.TEXT_MUTED)
            self._placeholder_active = True

    # ── API pública ────────────────────────────────────────────────────────────

    def reset(self):
        self._set_active_cat("Todos")
        self._size_var.set("Todo")
        self._name_var.set("")
        self._search_entry.delete(0, "end")
        self._search_entry.insert(0, self._placeholder)
        self._search_entry.config(fg=theme.TEXT_MUTED)
        self._placeholder_active = True

    @property
    def category(self) -> str:
        return self._active_cat

    @property
    def min_bytes(self) -> int:
        return SIZE_OPTIONS.get(self._size_var.get(), 0)

    @property
    def name_pattern(self) -> str:
        if self._placeholder_active:
            return ""
        return self._name_var.get().strip().lower()

    def _fire(self, *_):
        self._on_change(self.category, self.min_bytes, self.name_pattern)
