"""Barra de filtros: tipo de archivo, tamaño mínimo, nombre."""

import tkinter as tk
from tkinter import ttk

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
        super().__init__(parent, **kwargs)
        self._on_change = on_change
        self._build()

    def _build(self):
        ttk.Label(self, text="Tipo:").pack(side="left", padx=(8, 2))

        self._cat_var = tk.StringVar(value="Todos")
        cat_combo = ttk.Combobox(self, textvariable=self._cat_var,
                                  values=CATEGORIES, state="readonly", width=22)
        cat_combo.pack(side="left", padx=(0, 8))
        self._cat_var.trace_add("write", self._fire)

        ttk.Label(self, text="Tamaño:").pack(side="left", padx=(0, 2))

        self._size_var = tk.StringVar(value="Cualquier tamaño")
        size_combo = ttk.Combobox(self, textvariable=self._size_var,
                                   values=list(SIZE_OPTIONS.keys()),
                                   state="readonly", width=16)
        size_combo.pack(side="left", padx=(0, 8))
        self._size_var.trace_add("write", self._fire)

        ttk.Label(self, text="Nombre:").pack(side="left", padx=(0, 2))

        self._name_var = tk.StringVar()
        self._name_var.trace_add("write", self._fire)
        ttk.Entry(self, textvariable=self._name_var, width=20).pack(
            side="left", padx=(0, 8))

        ttk.Button(self, text="Limpiar", command=self.reset).pack(
            side="left", padx=(0, 8))

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
