"""Tabla principal de archivos con filtrado, ordenamiento y menú contextual."""

import os
import tkinter as tk
from tkinter import ttk

from core.models import FileEntry
from utils.formatters import format_size
from core.trash import open_in_explorer

# Iconos Unicode por categoría
CAT_ICONS = {
    "Videos":                 "🎬",
    "Imagenes":               "🖼",
    "Audio":                  "🎵",
    "Documentos":             "📄",
    "Instaladores/ISO":       "📦",
    "Temporales/Cache":       "🗑",
    "Desarrollo (compilados)":"⚙",
    "Bases de datos":         "🗄",
    "Otros":                  "📎",
}

# Etiquetas de color por tamaño
_COLOR_TAGS = [
    ("huge",   1024**3,         "#c0392b", "white"),   # >1 GB
    ("large",  100 * 1024**2,   "#e67e22", "white"),   # >100 MB
    ("medium", 10  * 1024**2,   "#f39c12", "black"),   # >10 MB
    ("cache",  0,               "#888888", "white"),   # cache
]

# Columnas: (id, encabezado, ancho, anchor)
COLUMNS = [
    ("name",     "Nombre",     260, "w"),
    ("size",     "Tamaño",      90, "e"),
    ("category", "Tipo",       150, "w"),
    ("ext",      "Extensión",   70, "center"),
    ("path",     "Ruta",       380, "w"),
]


class FileTable(ttk.Frame):
    """
    Tabla de archivos.
    on_delete([paths]) se llama al pedir borrado desde el menú contextual.
    """

    def __init__(self, parent, on_delete=None, **kwargs):
        super().__init__(parent, **kwargs)
        self._on_delete = on_delete
        self._all_entries: list[FileEntry] = []
        self._visible_entries: list[FileEntry] = []
        self._sort_col = "size"
        self._sort_rev = True
        self._filter_cat = "Todos"
        self._filter_min = 0
        self._filter_name = ""
        self._pending_batch: list[FileEntry] = []
        self._build()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        col_ids = [c[0] for c in COLUMNS]
        self._tree = ttk.Treeview(
            self,
            columns=col_ids,
            show="headings",
            selectmode="extended",
        )

        for col_id, heading, width, anchor in COLUMNS:
            self._tree.heading(col_id, text=heading,
                               command=lambda c=col_id: self._sort_by(c))
            self._tree.column(col_id, width=width, anchor=anchor, stretch=(col_id == "path"))

        # Color tags
        self._tree.tag_configure("huge",   background="#c0392b", foreground="white")
        self._tree.tag_configure("large",  background="#e67e22", foreground="white")
        self._tree.tag_configure("medium", background="#f39c12", foreground="black")
        self._tree.tag_configure("cache",  background="#555555", foreground="#cccccc")

        vsb = ttk.Scrollbar(self, orient="vertical",   command=self._tree.yview)
        hsb = ttk.Scrollbar(self, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")

        self._tree.bind("<Button-3>",        self._show_context_menu)
        self._tree.bind("<Double-Button-1>",  self._on_double_click)

        # Menú contextual
        self._ctx = tk.Menu(self, tearoff=False)
        self._ctx.add_command(label="Abrir en Explorador",    command=self._ctx_open)
        self._ctx.add_separator()
        self._ctx.add_command(label="Mover a Papelera",       command=self._ctx_trash)
        self._ctx.add_command(label="Eliminar permanentemente", command=self._ctx_delete_perm)
        self._ctx.add_separator()
        self._ctx.add_command(label="Copiar ruta",            command=self._ctx_copy)

    # ── API pública ───────────────────────────────────────────────────────────

    def clear(self):
        self._tree.delete(*self._tree.get_children())
        self._all_entries.clear()
        self._visible_entries.clear()
        self._pending_batch.clear()

    def add_entry(self, entry: FileEntry):
        """Añade una entrada al buffer de batch. Llamar flush_batch() para mostrar."""
        self._all_entries.append(entry)
        if self._matches_filter(entry):
            self._pending_batch.append(entry)

    def flush_batch(self):
        """Inserta en el Treeview el batch acumulado (hasta 300 items por llamada)."""
        batch = self._pending_batch[:300]
        self._pending_batch = self._pending_batch[300:]

        for entry in batch:
            self._visible_entries.append(entry)
            self._insert_row(entry)

        return bool(self._pending_batch)  # True si aún queda

    def apply_filters(self, category: str, min_bytes: int, name_pattern: str):
        self._filter_cat  = category
        self._filter_min  = min_bytes
        self._filter_name = name_pattern
        self._rebuild_visible()

    def filter_by_folder(self, folder_path: str):
        """Muestra solo archivos dentro de folder_path (y sus subdirectorios)."""
        self._tree.delete(*self._tree.get_children())
        self._visible_entries = [
            e for e in self._all_entries
            if e.path.startswith(folder_path) and self._matches_filter(e)
        ]
        self._visible_entries.sort(key=lambda e: e.size, reverse=True)
        for entry in self._visible_entries:
            self._insert_row(entry)

    def remove_paths(self, paths: set):
        """Elimina rutas de la tabla y del almacén interno."""
        self._all_entries     = [e for e in self._all_entries     if e.path not in paths]
        self._visible_entries = [e for e in self._visible_entries if e.path not in paths]
        for iid in list(self._tree.get_children()):
            vals = self._tree.item(iid, "values")
            if vals and vals[4] in paths:   # columna 'path'
                self._tree.delete(iid)

    @property
    def entry_count(self) -> int:
        return len(self._all_entries)

    # ── privado ───────────────────────────────────────────────────────────────

    def _matches_filter(self, e: FileEntry) -> bool:
        if self._filter_cat != "Todos" and e.category != self._filter_cat:
            return False
        if e.size < self._filter_min:
            return False
        if self._filter_name and self._filter_name not in e.name.lower():
            return False
        return True

    def _rebuild_visible(self):
        self._tree.delete(*self._tree.get_children())
        self._visible_entries = [e for e in self._all_entries if self._matches_filter(e)]
        self._visible_entries.sort(
            key=lambda e: getattr(e, self._sort_col, e.size),
            reverse=self._sort_rev,
        )
        for entry in self._visible_entries:
            self._insert_row(entry)

    def _insert_row(self, entry: FileEntry):
        icon = CAT_ICONS.get(entry.category, "📎")
        tag  = self._tag_for(entry)
        vals = (
            f"{icon} {entry.name}",
            format_size(entry.size),
            entry.category,
            entry.extension,
            entry.path,
        )
        try:
            self._tree.insert("", "end", values=vals, tags=(tag,))
        except tk.TclError:
            pass

    def _tag_for(self, entry: FileEntry) -> str:
        if entry.is_cache:
            return "cache"
        for tag, threshold, *_ in _COLOR_TAGS:
            if tag == "cache":
                continue
            if entry.size >= threshold:
                return tag
        return ""

    def _sort_by(self, col: str):
        if self._sort_col == col:
            self._sort_rev = not self._sort_rev
        else:
            self._sort_col = col
            self._sort_rev = (col == "size")
        self._rebuild_visible()

    def _selected_paths(self) -> list[str]:
        paths = []
        for iid in self._tree.selection():
            vals = self._tree.item(iid, "values")
            if vals:
                paths.append(vals[4])  # columna 'path'
        return paths

    def _show_context_menu(self, event):
        item = self._tree.identify_row(event.y)
        if not item:
            return
        if item not in self._tree.selection():
            self._tree.selection_set(item)
        self._ctx.tk_popup(event.x_root, event.y_root)

    def _on_double_click(self, _event):
        paths = self._selected_paths()
        if paths:
            open_in_explorer(paths[0])

    def _ctx_open(self):
        for p in self._selected_paths():
            open_in_explorer(p)
            break  # solo el primero

    def _ctx_trash(self):
        paths = self._selected_paths()
        if paths and self._on_delete:
            self._on_delete(paths, permanent=False)

    def _ctx_delete_perm(self):
        paths = self._selected_paths()
        if paths and self._on_delete:
            self._on_delete(paths, permanent=True)

    def _ctx_copy(self):
        paths = self._selected_paths()
        if paths:
            self.clipboard_clear()
            self.clipboard_append("\n".join(paths))
