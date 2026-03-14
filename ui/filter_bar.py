"""Barra de filtros: tipo de archivo, tamaño mínimo, nombre."""

import tkinter as tk
from tkinter import ttk

import ui.theme as theme

SIZE_OPTIONS = {
    "Cualquier tamaño": 0,
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


class FilterBar(ttk.Frame):
    """
    Barra de filtros.  on_change(category, min_bytes, name_pattern) se llama
    cada vez que cambia algún control.
    """

    def __init__(self, parent, on_change, **kwargs):
        kwargs.setdefault("style", "Panel.TFrame")
        super().__init__(parent, **kwargs)
        self._on_change = on_change
        self._build()

    def _build(self):
        # Padding interno
        inner = ttk.Frame(self, style="Panel.TFrame")
        inner.pack(fill="x", padx=8, pady=5)

        ttk.Label(inner, text="Tipo", style="Secondary.TLabel").pack(
            side="left", padx=(0, 3))

        self._cat_var = tk.StringVar(value="Todos")
        cat_combo = ttk.Combobox(inner, textvariable=self._cat_var,
                                  values=CATEGORIES, state="readonly", width=20)
        cat_combo.pack(side="left", padx=(0, 12))
        self._cat_var.trace_add("write", self._fire)

        ttk.Label(inner, text="Tamaño", style="Secondary.TLabel").pack(
            side="left", padx=(0, 3))

        self._size_var = tk.StringVar(value="Cualquier tamaño")
        size_combo = ttk.Combobox(inner, textvariable=self._size_var,
                                   values=list(SIZE_OPTIONS.keys()),
                                   state="readonly", width=15)
        size_combo.pack(side="left", padx=(0, 12))
        self._size_var.trace_add("write", self._fire)

        ttk.Label(inner, text="Nombre", style="Secondary.TLabel").pack(
            side="left", padx=(0, 3))

        self._name_var = tk.StringVar()
        self._name_var.trace_add("write", self._fire)
        name_entry = ttk.Entry(inner, textvariable=self._name_var, width=20)
        name_entry.pack(side="left", padx=(0, 10))

        # Botón limpiar con estilo mínimo
        clear_btn = ttk.Button(inner, text="✕ Limpiar", command=self.reset)
        clear_btn.pack(side="left")

    # ── API pública ───────────────────────────────────────────────────────────

    def reset(self):
        self._cat_var.set("Todos")
        self._size_var.set("Cualquier tamaño")
        self._name_var.set("")

    @property
    def category(self) -> str:
        return self._cat_var.get()

    @property
    def min_bytes(self) -> int:
        return SIZE_OPTIONS.get(self._size_var.get(), 0)

    @property
    def name_pattern(self) -> str:
        return self._name_var.get().strip().lower()

    # ── privado ───────────────────────────────────────────────────────────────

    def _fire(self, *_):
        self._on_change(self.category, self.min_bytes, self.name_pattern)
