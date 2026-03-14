"""
Clase principal de la aplicación.
Gestiona el polling loop, dispatcher de mensajes y coordina todos los componentes.
"""

import os
import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox

from core.scanner import DiskScanner
from core.models import FileEntry, FolderNode, ScanResult
from core.trash import send_to_recycle_bin, delete_permanently, open_in_explorer
from utils.formatters import format_size

from ui.toolbar   import Toolbar
from ui.disk_bar  import DiskBar
from ui.tree_panel import TreePanel
from ui.file_table import FileTable
from ui.filter_bar import FilterBar
from ui.status_bar import StatusBar
from ui.dialogs   import ConfirmDeleteDialog, DuplicatesDialog

POLL_INTERVAL_MS = 50   # cada cuánto ms se revisa la queue
FLUSH_EVERY_MS   = 80   # cada cuánto ms se vacía el batch de filas


class App(ttk.Frame):
    def __init__(self, root: tk.Tk):
        super().__init__(root)
        self._root = root
        self.pack(fill="both", expand=True)

        self._msg_queue:   queue.Queue     = queue.Queue()
        self._cancel_evt:  threading.Event = threading.Event()
        self._scan_thread: threading.Thread | None = None
        self._scan_result: ScanResult | None = None
        self._n_top: int = 0          # carpetas de primer nivel (para progreso)
        self._scanning = False

        self._build()
        self._apply_theme()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self._root.columnconfigure(0, weight=1)
        self._root.rowconfigure(0, weight=1)

        # ── Toolbar ──
        self._toolbar = Toolbar(self, on_scan=self._start_scan,
                                on_cancel=self._cancel_scan)
        self._toolbar.pack(fill="x")

        # ── DiskBar ──
        self._disk_bar = DiskBar(self)
        self._disk_bar.pack(fill="x")

        # ── Separador ──
        ttk.Separator(self).pack(fill="x")

        # ── Contenido principal (PanedWindow) ──
        self._paned = tk.PanedWindow(self, orient="horizontal",
                                      sashrelief="raised", sashwidth=5,
                                      bg="#3c3c3c")
        self._paned.pack(fill="both", expand=True)

        # Panel izquierdo: árbol de carpetas
        self._tree_panel = TreePanel(
            self._paned,
            on_select=self._on_folder_selected,
            on_delete=self._request_delete_paths,
        )
        self._paned.add(self._tree_panel, minsize=160, width=240)

        # Panel derecho: filtros + tabla
        right = ttk.Frame(self._paned)
        self._paned.add(right, minsize=400)

        self._filter_bar = FilterBar(right, on_change=self._on_filter_change)
        self._filter_bar.pack(fill="x", pady=2)

        ttk.Separator(right).pack(fill="x")

        self._file_table = FileTable(
            right,
            on_delete=self._request_delete_paths,
        )
        self._file_table.pack(fill="both", expand=True)

        # ── StatusBar ──
        ttk.Separator(self).pack(fill="x")
        self._status = StatusBar(self)
        self._status.pack(fill="x")

        # ── Menú de la ventana ──
        self._build_menu()

    def _build_menu(self):
        menubar = tk.Menu(self._root)
        self._root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=False)
        menubar.add_cascade(label="Archivo", menu=file_menu)
        file_menu.add_command(label="Escanear...",        accelerator="F5",
                              command=lambda: self._toolbar._btn_scan.invoke())
        file_menu.add_command(label="Cancelar escaneo",   command=self._cancel_scan)
        file_menu.add_separator()
        file_menu.add_command(label="Salir",              command=self._root.destroy)

        view_menu = tk.Menu(menubar, tearoff=False)
        menubar.add_cascade(label="Ver", menu=view_menu)
        view_menu.add_command(label="Mostrar duplicados", command=self._show_duplicates)
        view_menu.add_command(label="Limpiar filtros",    command=self._filter_bar.reset)

        self._root.bind("<F5>", lambda _: self._toolbar._btn_scan.invoke())
        self._root.bind("<Delete>", self._key_delete)
        self._root.bind("<Control-c>", self._key_copy)

    def _apply_theme(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

    # ── Escaneo ───────────────────────────────────────────────────────────────

    def _start_scan(self, path: str):
        if self._scanning:
            return

        self._scanning = True
        self._cancel_evt.clear()
        self._scan_result = ScanResult(root_path=path)
        self._n_top = 0

        # Limpiar UI
        self._tree_panel.clear()
        self._file_table.clear()
        self._filter_bar.reset()
        self._toolbar.set_scanning(True)
        self._status.start_scan(path)
        self._disk_bar.update_disk(path)

        scanner = DiskScanner(self._msg_queue, self._cancel_evt)
        self._scan_thread = threading.Thread(
            target=scanner.scan,
            args=(path,),
            daemon=True,
        )
        self._scan_thread.start()
        self._poll_queue()
        self._flush_loop()

    def _cancel_scan(self):
        self._cancel_evt.set()
        self._status.set_message("Escaneo cancelado.")
        self._toolbar.set_scanning(False)
        self._scanning = False

    # ── Polling loop ──────────────────────────────────────────────────────────

    def _poll_queue(self):
        try:
            for _ in range(200):   # consumir hasta 200 msgs por tick
                msg = self._msg_queue.get_nowait()
                self._dispatch(msg)
        except queue.Empty:
            pass

        if self._scan_thread and self._scan_thread.is_alive():
            self._root.after(POLL_INTERVAL_MS, self._poll_queue)

    def _flush_loop(self):
        """Vuelca el batch de filas al FileTable periódicamente."""
        has_more = self._file_table.flush_batch()
        if self._scanning or has_more:
            self._root.after(FLUSH_EVERY_MS, self._flush_loop)

    # ── Dispatcher ───────────────────────────────────────────────────────────

    def _dispatch(self, msg: dict):
        t = msg["type"]

        if t == "start":
            self._n_top = msg["n_top"]
            self._tree_panel.clear()

        elif t == "folder":
            path   = msg["path"]
            parent = msg["parent"]
            size   = msg["size"]
            fc     = msg["file_count"]
            # Actualizar ScanResult
            if path in self._scan_result.folders:
                self._scan_result.folders[path].size += size
                self._scan_result.folders[path].file_count += fc
            else:
                self._scan_result.folders[path] = FolderNode(
                    path=path,
                    name=os.path.basename(path) or path,
                    size=size,
                    parent=parent,
                    file_count=fc,
                )
            # Actualizar árbol
            self._tree_panel.upsert_folder(path, parent, size, fc)

        elif t == "file":
            entry = FileEntry(
                path=msg["path"],
                name=msg["name"],
                size=msg["size"],
                extension=msg["extension"],
                category=msg["category"],
                is_cache=msg["is_cache"],
                parent_dir=msg["parent_dir"],
            )
            self._scan_result.files.append(entry)
            self._file_table.add_entry(entry)

        elif t == "progress":
            done  = msg["done"]
            total = self._n_top if self._n_top > 0 else msg.get("total", 0)
            self._status.update_progress(done, total, msg["current"], msg["bytes"])

        elif t == "done":
            self._on_scan_done(msg)

        elif t == "error":
            # Errores de permiso son silenciosos; otros se loguean en statusbar
            pass

    def _on_scan_done(self, msg: dict):
        self._scanning = False
        self._scan_result.total_bytes = msg["total_bytes"]
        self._scan_result.elapsed     = msg["elapsed"]
        self._scan_result.duplicates  = msg["duplicates"]

        self._tree_panel.set_total(msg["total_bytes"])
        # Re-renderizar tamaños con el total correcto
        for path, node in self._scan_result.folders.items():
            self._tree_panel.upsert_folder(
                path, node.parent or "", node.size, node.file_count
            )

        # Vaciar el último batch pendiente
        self._file_table.flush_batch()

        self._toolbar.set_scanning(False)
        self._status.update_stats(
            folders=len(self._scan_result.folders),
            files=len(self._scan_result.files),
            bytes_total=msg["total_bytes"],
            elapsed=msg["elapsed"],
        )

    # ── Filtros ───────────────────────────────────────────────────────────────

    def _on_filter_change(self, category: str, min_bytes: int, name_pattern: str):
        self._file_table.apply_filters(category, min_bytes, name_pattern)

    def _on_folder_selected(self, path: str):
        self._file_table.filter_by_folder(path)

    # ── Borrado ───────────────────────────────────────────────────────────────

    def _request_delete_paths(self, paths: list[str], permanent: bool = False):
        if not paths:
            return
        dlg = ConfirmDeleteDialog(self._root, paths, permanent=permanent)
        if not dlg.result:
            return

        def _do_delete():
            errors: list[str] = []
            failed_paths: set[str] = set()
            for p in paths:
                if permanent:
                    ok, err = delete_permanently(p)
                else:
                    ok, err = send_to_recycle_bin(p)
                if not ok:
                    errors.append(f"{p}: {err}")
                    failed_paths.add(p)

            self._root.after(0, lambda: self._after_delete(paths, failed_paths, errors, permanent))

        threading.Thread(target=_do_delete, daemon=True).start()

    def _after_delete(self, paths: list[str], failed: set[str], errors: list[str], permanent: bool):
        deleted = set(p for p in paths if p not in failed)
        if deleted:
            self._file_table.remove_paths(deleted)
            for p in deleted:
                self._tree_panel.remove_path(p)
            action = "eliminados" if permanent else "movidos a Papelera"
            self._status.set_message(
                f"{len(deleted)} elemento(s) {action}."
            )
        if errors:
            messagebox.showerror(
                "Error al borrar",
                "\n".join(errors[:10]) + ("\n…" if len(errors) > 10 else ""),
            )

    # ── Atajos de teclado ────────────────────────────────────────────────────

    def _key_delete(self, _event):
        paths = self._file_table._selected_paths()
        if paths:
            self._request_delete_paths(paths, permanent=False)

    def _key_copy(self, _event):
        paths = self._file_table._selected_paths()
        if paths:
            self._root.clipboard_clear()
            self._root.clipboard_append("\n".join(paths))

    # ── Duplicados ───────────────────────────────────────────────────────────

    def _show_duplicates(self):
        if not self._scan_result or not self._scan_result.duplicates:
            messagebox.showinfo("Duplicados", "No se han encontrado duplicados.\n"
                                "Realiza un escaneo primero.")
            return
        DuplicatesDialog(self._root, self._scan_result.duplicates,
                          on_delete=self._request_delete_paths)
