"""Panel izquierdo: árbol de carpetas con tamaños."""

import os
import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size, format_pct
from core.trash import open_in_explorer
import ui.theme as theme

# Durante el escaneo, actualizar el árbol cada N carpetas para reducir redraws.
# Los datos se acumulan en _pending_upserts y se aplican en lotes.
_UPSERT_BATCH = 80


class TreePanel(ttk.Frame):
    """
    Árbol de carpetas.
    - on_select(path): al seleccionar una carpeta
    - on_delete([path]): al pedir borrado
    """

    def __init__(self, parent, on_select=None, on_delete=None, **kwargs):
        super().__init__(parent, **kwargs)
        self._on_select = on_select
        self._on_delete = on_delete
        self._total_bytes = 1
        self._nodes: dict[str, str] = {}           # path → iid (son iguales)
        self._pending_upserts: list[tuple] = []    # (path, parent, size, fc)
        self._upsert_counter = 0
        self._build()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self._tree = ttk.Treeview(
            self, columns=("size", "pct"),
            selectmode="browse", show="tree headings",
        )
        self._tree.heading("#0",   text="  Carpeta")
        self._tree.heading("size", text="Tamaño")
        self._tree.heading("pct",  text="%")
        self._tree.column("#0",   width=180, stretch=True)
        self._tree.column("size", width=80,  anchor="e", stretch=False)
        self._tree.column("pct",  width=50,  anchor="e", stretch=False)

        vsb = ttk.Scrollbar(self, orient="vertical",   command=self._tree.yview)
        hsb = ttk.Scrollbar(self, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")

        self._tree.bind("<<TreeviewSelect>>", self._on_tree_select)
        self._tree.bind("<Button-3>", self._show_context_menu)

        self._ctx_menu = tk.Menu(
            self, tearoff=False,
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            activebackground=theme.ACCENT, activeforeground="white",
            relief="flat", borderwidth=1,
        )
        self._ctx_menu.add_command(label="  Abrir en Explorador",
                                   command=self._ctx_open_explorer)
        self._ctx_menu.add_separator()
        self._ctx_menu.add_command(label="  Mover a Papelera",
                                   command=self._ctx_delete)
        self._ctx_menu.add_separator()
        self._ctx_menu.add_command(label="  Copiar ruta",
                                   command=self._ctx_copy_path)
        self._ctx_path: str = ""

    # ── API pública ───────────────────────────────────────────────────────────

    def clear(self):
        self._tree.delete(*self._tree.get_children())
        self._nodes.clear()
        self._pending_upserts.clear()
        self._upsert_counter = 0
        self._total_bytes = 1

    def set_total(self, total: int):
        self._total_bytes = max(total, 1)

    def upsert_folder(self, path: str, parent_path: str, size: int, file_count: int):
        """
        Encola un upsert. Aplica al Treeview en lotes de _UPSERT_BATCH
        para evitar un redraw por cada carpeta descubierta.
        """
        self._pending_upserts.append((path, parent_path, size, file_count))
        self._upsert_counter += 1
        if self._upsert_counter >= _UPSERT_BATCH:
            self.flush_upserts()

    def flush_upserts(self):
        """Aplica todos los upserts pendientes al Treeview de una vez."""
        if not self._pending_upserts:
            return
        pending, self._pending_upserts = self._pending_upserts, []
        self._upsert_counter = 0
        for path, parent_path, size, file_count in pending:
            self._apply_upsert(path, parent_path, size)

    def remove_path(self, path: str):
        if path in self._nodes:
            try:
                self._tree.delete(path)
            except tk.TclError:
                pass
            self._nodes.pop(path, None)

    def get_selected_path(self) -> str:
        sel = self._tree.selection()
        return sel[0] if sel else ""

    # ── privado ───────────────────────────────────────────────────────────────

    def _apply_upsert(self, path: str, parent_path: str, size: int):
        name     = os.path.basename(path) or path
        size_str = format_size(size)
        pct_str  = format_pct(size, self._total_bytes)
        icon     = self._folder_icon(name)
        label    = f"{icon} {name}"

        if path in self._nodes:
            self._tree.item(path, text=label, values=(size_str, pct_str))
            return

        parent_iid = self._nodes.get(parent_path, "")
        try:
            self._tree.insert(
                parent_iid, "end",
                iid=path, text=label,
                values=(size_str, pct_str), open=False,
            )
        except tk.TclError:
            try:
                self._tree.insert(
                    "", "end",
                    iid=path, text=label,
                    values=(size_str, pct_str), open=False,
                )
            except tk.TclError:
                return
        self._nodes[path] = path

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

    @staticmethod
    def _folder_icon(name: str) -> str:
        nl = name.lower()
        if nl in ("users", "usuarios"):                     return "👥"
        if nl == "windows":                                 return "🪟"
        if nl in ("program files", "program files (x86)"): return "🗂"
        if nl in ("documents", "documentos"):               return "📁"
        if nl in ("downloads", "descargas"):                return "⬇"
        if nl in ("pictures", "imágenes", "imagenes"):      return "🖼"
        if nl in ("music", "música", "musica"):             return "🎵"
        if nl == "videos":                                  return "🎬"
        if nl in ("desktop", "escritorio"):                 return "🖥"
        if nl in ("appdata", "localappdata"):               return "⚙"
        if nl == "node_modules":                            return "📦"
        if nl == ".git":                                    return "🔀"
        if nl == "__pycache__":                             return "🐍"
        return "📂"
