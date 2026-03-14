"""
FileTable v2 — Tabla de archivos con hover, indicadores y menú contextual moderno.
"""

import tkinter as tk
from tkinter import ttk

from core.models import FileEntry
from utils.formatters import format_size
from core.trash import open_in_explorer
import ui.theme as theme

CAT_ICONS = {
    "Videos":                  "🎬",
    "Imagenes":                "🖼",
    "Audio":                   "🎵",
    "Documentos":              "📄",
    "Instaladores/ISO":        "📦",
    "Temporales/Cache":        "🗑",
    "Desarrollo (compilados)": "⚙",
    "Bases de datos":          "🗄",
    "Otros":                   "📎",
}

COLUMNS = [
    ("name",     "  Nombre",   270, "w"),
    ("size",     "Tamaño",      88, "e"),
    ("category", "Tipo",       145, "w"),
    ("ext",      "Ext",         58, "center"),
    ("path",     "Ruta",       390, "w"),
]

DISPLAY_LIMIT = 3_000


class FileTable(ttk.Frame):
    def __init__(self, parent, on_delete=None, **kwargs):
        super().__init__(parent, **kwargs)
        self._on_delete = on_delete

        self._all_entries:     list[FileEntry] = []
        self._visible_entries: list[FileEntry] = []
        self._iid_map:         dict[str, str]  = {}

        self._sort_col  = "size"
        self._sort_rev  = True
        self._filter_cat  = "Todos"
        self._filter_min  = 0
        self._filter_name = ""

        self._pending_batch: list[FileEntry] = []
        self._row_counter = 0
        self._hover_iid   = ""

        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        col_ids = [c[0] for c in COLUMNS]
        self._tree = ttk.Treeview(
            self, columns=col_ids, show="headings", selectmode="extended",
        )

        for col_id, heading, width, anchor in COLUMNS:
            self._tree.heading(col_id, text=heading,
                               command=lambda c=col_id: self._sort_by(c))
            self._tree.column(col_id, width=width, anchor=anchor,
                              stretch=(col_id == "path"))

        # Tags de color semántico
        self._tree.tag_configure("huge",   background=theme.TAG_HUGE_BG,   foreground=theme.ACCENT_RED)
        self._tree.tag_configure("large",  background=theme.TAG_LARGE_BG,  foreground=theme.ACCENT_AMBER)
        self._tree.tag_configure("medium", background=theme.TAG_MEDIUM_BG, foreground=theme.TEXT_PRIMARY)
        self._tree.tag_configure("cache",  background=theme.TAG_CACHE_BG,  foreground=theme.TAG_CACHE_FG)
        self._tree.tag_configure("odd",    background=theme.TAG_ODD_BG,    foreground=theme.TEXT_PRIMARY)
        self._tree.tag_configure("even",   background=theme.TAG_EVEN_BG,   foreground=theme.TEXT_PRIMARY)
        self._tree.tag_configure("hover",  background=theme.BG_HOVER)

        vsb = ttk.Scrollbar(self, orient="vertical",   command=self._tree.yview)
        hsb = ttk.Scrollbar(self, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")

        # Label overflow
        self._overflow_label = tk.Label(
            self, text="",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL, anchor="w", padx=12, pady=4,
        )
        self._overflow_label.grid(row=2, column=0, columnspan=2, sticky="ew")
        self._overflow_label.grid_remove()

        self._tree.bind("<Button-3>",        self._show_context_menu)
        self._tree.bind("<Double-Button-1>", self._on_double_click)
        self._tree.bind("<Motion>",          self._on_motion)
        self._tree.bind("<Leave>",           self._on_leave)

        # ── Menú contextual moderno ────────────────────────────────────
        self._ctx = tk.Menu(
            self, tearoff=False,
            bg=theme.BG_CARD2, fg=theme.TEXT_PRIMARY,
            activebackground=theme.ACCENT, activeforeground="white",
            relief="flat", borderwidth=0,
            font=theme.FONT_SMALL,
        )
        self._ctx.add_command(label="  📂  Abrir en Explorador",      command=self._ctx_open)
        self._ctx.add_separator()
        self._ctx.add_command(label="  🗑  Mover a Papelera",         command=self._ctx_trash)
        self._ctx.add_command(label="  ✕  Eliminar permanentemente",  command=self._ctx_delete_perm)
        self._ctx.add_separator()
        self._ctx.add_command(label="  ⎘  Copiar ruta",               command=self._ctx_copy)

    # ── API pública ────────────────────────────────────────────────────────────

    def clear(self):
        self._tree.delete(*self._tree.get_children())
        self._all_entries.clear()
        self._visible_entries.clear()
        self._pending_batch.clear()
        self._iid_map.clear()
        self._row_counter = 0
        self._hover_iid   = ""
        self._overflow_label.grid_remove()

    def add_entry(self, entry: FileEntry):
        self._all_entries.append(entry)
        if self._matches_filter(entry):
            self._pending_batch.append(entry)

    def flush_batch(self) -> bool:
        if not self._pending_batch:
            return False
        batch = self._pending_batch[:600]
        self._pending_batch = self._pending_batch[600:]
        rendered = len(self._iid_map)
        for entry in batch:
            self._visible_entries.append(entry)
            if rendered < DISPLAY_LIMIT:
                self._insert_row(entry)
                rendered += 1
        self._update_overflow_label()
        return bool(self._pending_batch)

    def apply_filters(self, category: str, min_bytes: int, name_pattern: str):
        self._filter_cat  = category
        self._filter_min  = min_bytes
        self._filter_name = name_pattern
        self._rebuild_visible()

    def filter_by_folder(self, folder_path: str):
        self._filter_cat  = "Todos"
        self._filter_min  = 0
        self._filter_name = ""
        self._visible_entries = [
            e for e in self._all_entries if e.path.startswith(folder_path)
        ]
        self._visible_entries.sort(key=lambda e: e.size, reverse=True)
        self._render_visible()

    def remove_paths(self, paths: set):
        self._all_entries     = [e for e in self._all_entries     if e.path not in paths]
        self._visible_entries = [e for e in self._visible_entries if e.path not in paths]
        for path in paths:
            iid = self._iid_map.pop(path, None)
            if iid:
                try:
                    self._tree.delete(iid)
                except tk.TclError:
                    pass
        self._update_overflow_label()

    @property
    def entry_count(self) -> int:
        return len(self._all_entries)

    # ── hover ─────────────────────────────────────────────────────────────────

    def _on_motion(self, event):
        item = self._tree.identify_row(event.y)
        if item == self._hover_iid:
            return
        if self._hover_iid:
            try:
                tags = [t for t in self._tree.item(self._hover_iid, "tags") if t != "hover"]
                self._tree.item(self._hover_iid, tags=tags)
            except tk.TclError:
                pass
        self._hover_iid = item
        if item:
            try:
                tags = list(self._tree.item(item, "tags"))
                if "hover" not in tags:
                    tags.append("hover")
                self._tree.item(item, tags=tags)
            except tk.TclError:
                pass

    def _on_leave(self, _event):
        if self._hover_iid:
            try:
                tags = [t for t in self._tree.item(self._hover_iid, "tags") if t != "hover"]
                self._tree.item(self._hover_iid, tags=tags)
            except tk.TclError:
                pass
        self._hover_iid = ""

    # ── privado ────────────────────────────────────────────────────────────────

    def _matches_filter(self, e: FileEntry) -> bool:
        if self._filter_cat != "Todos" and e.category != self._filter_cat:
            return False
        if e.size < self._filter_min:
            return False
        if self._filter_name and self._filter_name not in e.name.lower():
            return False
        return True

    def _rebuild_visible(self):
        self._visible_entries = [e for e in self._all_entries if self._matches_filter(e)]
        self._visible_entries.sort(
            key=lambda e: getattr(e, self._sort_col, e.size),
            reverse=self._sort_rev,
        )
        self._render_visible()

    def _render_visible(self):
        self._tree.delete(*self._tree.get_children())
        self._iid_map.clear()
        self._row_counter = 0
        self._hover_iid   = ""
        for entry in self._visible_entries[:DISPLAY_LIMIT]:
            self._insert_row(entry)
        self._update_overflow_label()

    def _insert_row(self, entry: FileEntry) -> str:
        icon = CAT_ICONS.get(entry.category, "📎")
        tag  = self._tag_for(entry)
        vals = (
            f"  {icon}  {entry.name}",
            format_size(entry.size),
            entry.category,
            entry.extension,
            entry.path,
        )
        try:
            iid = self._tree.insert("", "end", values=vals, tags=(tag,))
            self._iid_map[entry.path] = iid
            self._row_counter += 1
            return iid
        except tk.TclError:
            return ""

    def _tag_for(self, entry: FileEntry) -> str:
        if entry.is_cache:                 return "cache"
        if entry.size >= 1024 ** 3:        return "huge"
        if entry.size >= 100 * 1024 ** 2:  return "large"
        if entry.size >= 10 * 1024 ** 2:   return "medium"
        return "odd" if self._row_counter % 2 == 0 else "even"

    def _update_overflow_label(self):
        total  = len(self._visible_entries)
        shown  = min(total, DISPLAY_LIMIT)
        hidden = total - shown
        if hidden > 0:
            self._overflow_label.config(
                text=f"  Mostrando {shown:,} de {total:,} archivos  —  aplica filtros para reducir"
            )
            self._overflow_label.grid()
        else:
            self._overflow_label.grid_remove()

    def _sort_by(self, col: str):
        if self._sort_col == col:
            self._sort_rev = not self._sort_rev
        else:
            self._sort_col = col
            self._sort_rev = (col == "size")
        for col_id, heading, *_ in COLUMNS:
            arrow = ("  ▼" if self._sort_rev else "  ▲") if col_id == col else ""
            self._tree.heading(col_id, text=heading + arrow)
        self._rebuild_visible()

    def _selected_paths(self) -> list[str]:
        paths = []
        for iid in self._tree.selection():
            vals = self._tree.item(iid, "values")
            if vals:
                paths.append(vals[4])
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
            break

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
