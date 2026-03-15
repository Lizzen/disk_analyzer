"""
Clase principal de la aplicación.
Gestiona el polling loop, dispatcher de mensajes y coordina todos los componentes.
"""

import os
import queue
import threading
import tkinter as tk
from tkinter import ttk, messagebox

from core.scanner import DiskScanner, verify_duplicates_by_hash
from core.models import FileEntry, FolderNode, ScanResult
from utils import logger as log
from core.trash import send_to_recycle_bin, delete_permanently, open_in_explorer
from utils.formatters import format_size

from ui.toolbar       import Toolbar
from ui.disk_bar      import DiskBar
from ui.tree_panel    import TreePanel
from ui.file_table    import FileTable
from ui.filter_bar    import FilterBar
from ui.status_bar    import StatusBar
from ui.summary_panel import SummaryPanel
from ui.tooltip       import Tooltip
from ui.dialogs       import ConfirmDeleteDialog, DuplicatesDialog
import ui.theme as theme

from chatbot.ui.chat_panel import ChatPanel

POLL_INTERVAL_MS = 40    # cada cuánto ms se revisa la queue
FLUSH_EVERY_MS   = 60    # cada cuánto ms se vacía el batch de filas
POLL_MAX_MSGS    = 500   # máximo mensajes a consumir por tick


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
        self._scan_errors: int = 0    # carpetas con error de acceso en el último escaneo

        self._build()
        self._apply_theme()
        # Cargar exclusiones guardadas
        from ui.exclude_dialog import load_excluded
        load_excluded()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self._root.columnconfigure(0, weight=1)
        self._root.rowconfigure(0, weight=1)

        # ── Toolbar ──
        self._toolbar = Toolbar(self, on_scan=self._start_scan,
                                on_cancel=self._cancel_scan)
        self._toolbar.pack(fill="x")
        Tooltip(self._toolbar._btn_scan,   "Iniciar escaneo del directorio seleccionado  (F5)")
        Tooltip(self._toolbar._btn_cancel, "Cancelar escaneo en curso")
        Tooltip(self._toolbar._btn_browse, "Seleccionar carpeta…")

        # ── DiskBar ──
        self._disk_bar = DiskBar(self)
        self._disk_bar.pack(fill="x")

        # ── Contenido principal (PanedWindow) ──
        self._paned = tk.PanedWindow(self, orient="horizontal",
                                      sashrelief="flat", sashwidth=2,
                                      bg=theme.BORDER)
        self._paned.pack(fill="both", expand=True)

        # Panel izquierdo: árbol de carpetas
        self._tree_panel = TreePanel(
            self._paned,
            on_select=self._on_folder_selected,
            on_delete=self._request_delete_paths,
        )
        self._paned.add(self._tree_panel, minsize=160, width=240)

        # Panel central: filtros + tabla
        right = ttk.Frame(self._paned, style="Panel.TFrame")
        self._paned.add(right, minsize=380)

        # Panel de resumen post-escaneo (oculto inicialmente)
        self._summary_panel = SummaryPanel(right, on_close=None)

        self._filter_bar = FilterBar(right, on_change=self._on_filter_change)
        self._filter_bar.pack(fill="x")

        # Separador fino entre filtros y tabla
        tk.Frame(right, bg=theme.BORDER, height=1).pack(fill="x")

        self._file_table = FileTable(
            right,
            on_delete=self._request_delete_paths,
        )
        self._file_table.pack(fill="both", expand=True)

        # Panel derecho: chatbot
        self._chat_panel = ChatPanel(
            self._paned,
            get_scan_result=lambda: self._scan_result,
            get_selected_path=self._get_selected_path,
        )
        self._paned.add(self._chat_panel, minsize=260, width=300)

        # ── StatusBar ──
        self._status = StatusBar(self)
        self._status.pack(fill="x")

        # ── Menú de la ventana ──
        self._build_menu()

    def _build_menu(self):
        menubar = tk.Menu(self._root,
                          bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
                          activebackground=theme.ACCENT, activeforeground="white",
                          relief="flat", borderwidth=0)
        self._root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=False,
                            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
                            activebackground=theme.ACCENT, activeforeground="white",
                            relief="flat", borderwidth=0)
        menubar.add_cascade(label="Archivo", menu=file_menu)
        file_menu.add_command(label="Escanear...",        accelerator="F5",
                              command=lambda: self._toolbar._btn_scan.invoke())
        file_menu.add_command(label="Cancelar escaneo",   command=self._cancel_scan)
        file_menu.add_separator()
        file_menu.add_command(label="Carpetas excluidas…",
                              command=self._open_exclude_dialog)
        file_menu.add_separator()
        file_menu.add_command(label="Salir",              command=self._root.destroy)

        view_menu = tk.Menu(menubar, tearoff=False,
                            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
                            activebackground=theme.ACCENT, activeforeground="white",
                            relief="flat", borderwidth=0)
        menubar.add_cascade(label="Ver", menu=view_menu)
        
        # --- Selector de temas ---
        theme_menu = tk.Menu(view_menu, tearoff=False,
                             bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
                             activebackground=theme.ACCENT, activeforeground="white",
                             relief="flat", borderwidth=0)
        
        # Variable to keep the selected theme in sync
        self._current_theme = tk.StringVar(value=theme.ACTIVE_THEME)
        
        for th_name in theme.THEMES.keys():
            theme_menu.add_radiobutton(label=th_name.replace("_", " ").title(),
                                       variable=self._current_theme,
                                       value=th_name,
                                       command=lambda th=th_name: self._change_theme(th))

        view_menu.add_cascade(label="Temas", menu=theme_menu)
        view_menu.add_separator()
        # -------------------------
        
        view_menu.add_command(label="Mostrar duplicados", command=self._show_duplicates)
        view_menu.add_command(label="Limpiar filtros",    command=self._filter_bar.reset)

        chat_menu = tk.Menu(menubar, tearoff=False,
                            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
                            activebackground=theme.ACCENT, activeforeground="white",
                            relief="flat", borderwidth=0)
        menubar.add_cascade(label="Chat IA", menu=chat_menu)
        chat_menu.add_command(label="Configurar APIs…",
                              command=self._open_api_settings)
        chat_menu.add_separator()
        chat_menu.add_command(label="Limpiar historial", command=self._chat_panel.clear_history)
        chat_menu.add_command(label="Adjuntar selección al chat",
                              command=self._chat_panel._attach_selection)

        self._root.bind("<F5>", lambda _: self._toolbar._btn_scan.invoke())
        self._root.bind("<Delete>", self._key_delete)
        self._root.bind("<Control-c>", self._key_copy)

    def _apply_theme(self):
        theme.apply(self._root)

    def _change_theme(self, th_name: str):
        theme.set_theme(th_name, self._root)
        # Reconstruir los menús para que adopten los colores del nuevo tema
        self._build_menu()
        self._root.update()

    # ── Escaneo ───────────────────────────────────────────────────────────────

    def _start_scan(self, path: str):
        if self._scanning:
            return

        log.info("APP _start_scan  path=%s", path)
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
        self._root.title("Disk Analyzer  —  DKA")
        self._status.set_message("Escaneo cancelado.")
        self._toolbar.set_scanning(False)
        self._scanning = False

    # ── Polling loop ──────────────────────────────────────────────────────────

    def _poll_queue(self):
        try:
            count = 0
            for _ in range(POLL_MAX_MSGS):
                msg = self._msg_queue.get_nowait()
                self._dispatch(msg)
                count += 1
            if count == POLL_MAX_MSGS:
                log.warning("POLL hit POLL_MAX_MSGS=%d — queue may be saturated", POLL_MAX_MSGS)
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

        elif t == "file_batch":
            files = self._scan_result.files
            add   = self._file_table.add_entry
            for m in msg["entries"]:
                entry = FileEntry(
                    path=m["path"],
                    name=m["name"],
                    size=m["size"],
                    extension=m["extension"],
                    category=m["category"],
                    is_cache=m["is_cache"],
                    parent_dir=m["parent_dir"],
                )
                files.append(entry)
                add(entry)

        elif t == "progress":
            done  = msg["done"]
            total = msg.get("total") or self._n_top
            self._status.update_progress(done, total, msg["current"], msg["bytes"])
            # Porcentaje en el título de ventana
            if total > 0:
                pct = int(done / total * 100)
                self._root.title(f"Disk Analyzer  [{pct}%]")

        elif t == "done":
            self._on_scan_done(msg)

        elif t == "error":
            # Errores de permiso son silenciosos; otros se loguean en statusbar
            pass

    def _on_scan_done(self, msg: dict):
        log.info("APP _on_scan_done  bytes=%d  elapsed=%.2fs  errors=%d  dups=%d",
                 msg["total_bytes"], msg["elapsed"],
                 msg.get("errors", 0), len(msg.get("duplicates", {})))
        self._scanning = False
        self._scan_result.total_bytes = msg["total_bytes"]
        self._scan_result.elapsed     = msg["elapsed"]
        self._scan_result.duplicates  = msg["duplicates"]
        self._scan_errors             = msg.get("errors", 0)

        # Volcar upserts pendientes del árbol antes de recalcular porcentajes
        self._tree_panel.flush_upserts()
        self._tree_panel.set_total(msg["total_bytes"])

        # Re-renderizar porcentajes con el total correcto (solo actualiza, no inserta)
        for path, node in self._scan_result.folders.items():
            self._tree_panel.upsert_folder(
                path, node.parent or "", node.size, node.file_count
            )
        self._tree_panel.flush_upserts()

        # Vaciar el último batch pendiente de archivos
        self._file_table.flush_batch()

        self._toolbar.set_scanning(False)
        self._root.title("Disk Analyzer  —  DKA")
        self._chat_panel.notify_scan_complete(self._scan_result)
        self._status.update_stats(
            folders=len(self._scan_result.folders),
            files=len(self._scan_result.files),
            bytes_total=msg["total_bytes"],
            elapsed=msg["elapsed"],
            errors=self._scan_errors,
        )

        # Mostrar panel de resumen
        cats = {}
        for e in self._scan_result.files:
            cats[e.category] = cats.get(e.category, 0) + e.size
        self._summary_panel.update(
            files=len(self._scan_result.files),
            folders=len(self._scan_result.folders),
            total_bytes=msg["total_bytes"],
            duplicates=len(self._scan_result.duplicates),
            categories=cats,
        )
        self._summary_panel.show()

        log.info("APP scan_done UI update complete  folders=%d  files=%d",
                 len(self._scan_result.folders), len(self._scan_result.files))

        # Verificar duplicados reales por hash MD5 en segundo plano
        if self._scan_result.duplicates:
            candidates = dict(self._scan_result.duplicates)
            log.info("APP launching MD5 verification for %d candidates", len(candidates))
            threading.Thread(
                target=self._verify_duplicates_hash,
                args=(candidates,),
                daemon=True,
            ).start()

    def _verify_duplicates_hash(self, candidates: dict):
        """Corre en background: confirma duplicados por MD5 y actualiza scan_result."""
        log.info("MD5 verify START  candidates=%d", len(candidates))
        real = verify_duplicates_by_hash(candidates, self._cancel_evt)
        log.info("MD5 verify DONE  real_dups=%d", len(real))
        if self._scan_result:
            self._scan_result.duplicates = real
            n = len(real)
            self._root.after(0, lambda: self._status.set_message(
                f"✓ Duplicados verificados por contenido: {n} grupo(s) real(es)"
                if n else "✓ Sin duplicados reales por contenido"
            ))

    def _get_selected_path(self) -> str:
        """Retorna la ruta del archivo/carpeta actualmente seleccionado en la UI."""
        # Intentar tabla de archivos primero, luego árbol de carpetas
        paths = self._file_table._selected_paths()
        if paths:
            return paths[0]
        return self._tree_panel.get_selected_path()

    # ── Filtros ───────────────────────────────────────────────────────────────

    def _on_filter_change(self, category: str, min_bytes: int, name_pattern: str):
        if hasattr(self, "_file_table"):
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

    # ── Configuración de APIs ─────────────────────────────────────────────────

    def _open_api_settings(self):
        from chatbot.ui.settings_dialog import APISettingsDialog
        APISettingsDialog(self._root, on_save=self._chat_panel.reload_providers)

    def _open_exclude_dialog(self):
        from ui.exclude_dialog import ExcludeDialog
        ExcludeDialog(self._root)
