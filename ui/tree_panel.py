"""Panel izquierdo: árbol de carpetas con tamaños."""

import os
import tkinter as tk
from tkinter import ttk, messagebox

from utils.formatters import format_size, format_pct
from core.trash import open_in_explorer


class TreePanel(ttk.Frame):
    """
    Árbol de carpetas. Callback on_select(path) se llama al seleccionar una carpeta.
    Callback on_delete(path) se llama al pedir borrado.
    """

    def __init__(self, parent, on_select=None, on_delete=None, **kwargs):
        super().__init__(parent, **kwargs)
        self._on_select = on_select
        self._on_delete = on_delete
        self._total_bytes = 1   # para calcular %
        self._nodes: dict = {}  # path -> FolderNode iid
        self._build()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self._tree = ttk.Treeview(
            self,
            columns=("size", "pct"),
            selectmode="browse",
            show="tree headings",
        )
        self._tree.heading("#0",    text="Carpeta")
        self._tree.heading("size",  text="Tamaño")
        self._tree.heading("pct",   text="%")
        self._tree.column("#0",    width=180, stretch=True)
        self._tree.column("size",  width=85,  anchor="e", stretch=False)
        self._tree.column("pct",   width=55,  anchor="e", stretch=False)

        vsb = ttk.Scrollbar(self, orient="vertical",   command=self._tree.yview)
        hsb = ttk.Scrollbar(self, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")

        self._tree.bind("<<TreeviewSelect>>", self._on_tree_select)
        self._tree.bind("<Button-3>", self._show_context_menu)

        self._ctx_menu = tk.Menu(self, tearoff=False)
        self._ctx_menu.add_command(label="Abrir en Explorador",
                                   command=self._ctx_open_explorer)
        self._ctx_menu.add_separator()
        self._ctx_menu.add_command(label="Mover a Papelera",
                                   command=self._ctx_delete)
        self._ctx_menu.add_separator()
        self._ctx_menu.add_command(label="Copiar ruta",
                                   command=self._ctx_copy_path)

        self._ctx_path: str = ""

    # ── API pública ───────────────────────────────────────────────────────────

    def clear(self):
        self._tree.delete(*self._tree.get_children())
        self._nodes.clear()
        self._total_bytes = 1

    def set_total(self, total: int):
        self._total_bytes = max(total, 1)

    def upsert_folder(self, path: str, parent_path: str, size: int, file_count: int):
        """Inserta o actualiza un nodo de carpeta en el árbol."""
        name = os.path.basename(path) or path
        size_str = format_size(size)
        pct_str  = format_pct(size, self._total_bytes)

        if path in self._nodes:
            self._tree.item(path, values=(size_str, pct_str))
            return

        # Determinar padre en el árbol
        parent_iid = self._nodes.get(parent_path, "")

        try:
            self._tree.insert(
                parent_iid, "end",
                iid=path,
                text=f"  {name}",
                values=(size_str, pct_str),
                open=False,
            )
        except tk.TclError:
            # Si el padre aún no existe, insertar en raíz
            try:
                self._tree.insert(
                    "", "end",
                    iid=path,
                    text=f"  {name}",
                    values=(size_str, pct_str),
                    open=False,
                )
            except tk.TclError:
                return

        self._nodes[path] = path

    def remove_path(self, path: str):
        """Elimina un nodo y todos sus hijos del árbol."""
        if path in self._nodes:
            try:
                self._tree.delete(path)
            except tk.TclError:
                pass
            self._nodes.pop(path, None)

    def get_selected_path(self) -> str:
        sel = self._tree.selection()
        return sel[0] if sel else ""

    # ── callbacks internos ────────────────────────────────────────────────────

    def _on_tree_select(self, _event):
        path = self.get_selected_path()
        if path and self._on_select:
            self._on_select(path)

    def _show_context_menu(self, event):
        item = self._tree.identify_row(event.y)
        if not item:
            return
        self._tree.selection_set(item)
        self._ctx_path = item
        self._ctx_menu.tk_popup(event.x_root, event.y_root)

    def _ctx_open_explorer(self):
        if self._ctx_path:
            open_in_explorer(self._ctx_path)

    def _ctx_delete(self):
        if self._ctx_path and self._on_delete:
            self._on_delete([self._ctx_path])

    def _ctx_copy_path(self):
        if self._ctx_path:
            self.clipboard_clear()
            self.clipboard_append(self._ctx_path)
