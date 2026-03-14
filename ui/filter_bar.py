"""Barra de filtros compacta — diseño moderno Linear/Vercel.

Altura ~38 px, BG_SURFACE elevado.
API pública: reset(), category (property), min_bytes (property),
             name_pattern (property), on_change callback.
"""

import tkinter as tk
from tkinter import ttk

import ui.theme as theme

SIZE_OPTIONS = {
    "Cualquier tamaño":   0,
    "> 1 MB":     1 * 1024 * 1024,
    "> 10 MB":   10 * 1024 * 1024,
    "> 100 MB": 100 * 1024 * 1024,
    "> 500 MB": 500 * 1024 * 1024,
    "> 1 GB":  1024 * 1024 * 1024,
}

CATEGORIES = [
    "Todos",
    "Videos",
    "Imagenes",
    "Audio",
    "Documentos",
    "Instaladores/ISO",
    "Temporales/Cache",
    "Desarrollo (compilados)",
    "Bases de datos",
    "Otros",
]

CAT_ICONS = {
    "Todos": "⊞",
    "Videos": "▶",
    "Imagenes": "⬚",
    "Audio": "♪",
    "Documentos": "≡",
    "Instaladores/ISO": "⬇",
    "Temporales/Cache": "⟳",
    "Desarrollo (compilados)": "⚙",
    "Bases de datos": "◈",
    "Otros": "·",
}


class FilterBar(ttk.Frame):
    """Barra de filtros compacta y moderna."""

    def __init__(self, parent, on_change, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._on_change = on_change
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self._placeholder_active = True
        inner = tk.Frame(self, bg=theme.BG_SURFACE)
        inner.pack(fill="x", padx=10, pady=(6, 6))

        # ── Separador vertical helper ──────────────────────────────────
        def vsep():
            tk.Frame(inner, bg=theme.BORDER, width=1).pack(
                side="left", fill="y", pady=4, padx=8
            )

        # ── Label helper ───────────────────────────────────────────────
        def micro_label(text: str):
            tk.Label(
                inner,
                text=text,
                bg=theme.BG_SURFACE,
                fg=theme.TEXT_MUTED,
                font=("Segoe UI Variable", 8, "bold"),
            ).pack(side="left", padx=(0, 4))

        # ── Tipo ──────────────────────────────────────────────────────
        micro_label("TYPE")

        self._cat_var = tk.StringVar(value="Todos")
        self._cat_combo = ttk.Combobox(
            inner,
            textvariable=self._cat_var,
            values=CATEGORIES,
            state="readonly",
            width=20,
            font=("Segoe UI Variable", 9),
        )
        self._cat_combo.pack(side="left", padx=(0, 0), ipady=3)
        self._cat_var.trace_add("write", self._fire)

        vsep()

        # ── Tamaño ────────────────────────────────────────────────────
        micro_label("SIZE")

        self._size_var = tk.StringVar(value="Cualquier tamaño")
        ttk.Combobox(
            inner,
            textvariable=self._size_var,
            values=list(SIZE_OPTIONS.keys()),
            state="readonly",
            width=12,
            font=("Segoe UI Variable", 9),
        ).pack(side="left", padx=(0, 0), ipady=3)
        self._size_var.trace_add("write", self._fire)

        vsep()

        # ── Búsqueda con icono ─────────────────────────────────────────
        # Icono de búsqueda (unicode)
        tk.Label(
            inner,
            text="⌕",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 13),
        ).pack(side="left", padx=(0, 4))

        # Campo de búsqueda con borde de 1 px
        search_border = tk.Frame(inner, bg=theme.BORDER)
        search_border.pack(side="left", padx=(0, 0))

        search_inner = tk.Frame(search_border, bg=theme.BG_INPUT)
        search_inner.pack(fill="both", expand=True, padx=1, pady=1)

        self._name_var = tk.StringVar()
        self._name_var.trace_add("write", self._fire)
        self._search_entry = tk.Entry(
            search_inner,
            textvariable=self._name_var,
            bg=theme.BG_INPUT,
            fg=theme.TEXT_PRIMARY,
            insertbackground=theme.ACCENT,
            relief="flat",
            bd=0,
            font=("Segoe UI Variable", 9),
            width=18,
        )
        self._search_entry.pack(padx=8, pady=4)

        # Placeholder
        self._search_placeholder = "Filtrar por nombre…"
        self._search_entry.insert(0, self._search_placeholder)
        self._search_entry.config(fg=theme.TEXT_MUTED)
        self._placeholder_active = True
        self._search_entry.bind("<FocusIn>",  self._search_focus_in)
        self._search_entry.bind("<FocusOut>", self._search_focus_out)

        vsep()

        # ── Botón limpiar (ghost) ──────────────────────────────────────
        tk.Button(
            inner,
            text="Limpiar",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.TEXT_PRIMARY,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 9),
            padx=10,
            pady=3,
            command=self.reset,
        ).pack(side="left")

    # ── Placeholder helpers ────────────────────────────────────────────────────

    def _search_focus_in(self, _event=None):
        if self._placeholder_active:
            self._search_entry.delete(0, "end")
            self._search_entry.config(fg=theme.TEXT_PRIMARY)
            self._placeholder_active = False

    def _search_focus_out(self, _event=None):
        if not self._search_entry.get():
            self._search_entry.insert(0, self._search_placeholder)
            self._search_entry.config(fg=theme.TEXT_MUTED)
            self._placeholder_active = True

    # ── API pública ────────────────────────────────────────────────────────────

    def reset(self):
        self._cat_var.set("Todos")
        self._size_var.set("Cualquier tamaño")
        self._name_var.set("")
        # Restaurar placeholder
        self._search_entry.delete(0, "end")
        self._search_entry.insert(0, self._search_placeholder)
        self._search_entry.config(fg=theme.TEXT_MUTED)
        self._placeholder_active = True

    @property
    def category(self) -> str:
        return self._cat_var.get()

    @property
    def min_bytes(self) -> int:
        return SIZE_OPTIONS.get(self._size_var.get(), 0)

    @property
    def name_pattern(self) -> str:
        if self._placeholder_active:
            return ""
        return self._name_var.get().strip().lower()

    # ── privado ────────────────────────────────────────────────────────────────

    def _fire(self, *_):
        self._on_change(self.category, self.min_bytes, self.name_pattern)
