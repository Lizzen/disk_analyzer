"""Diálogos modales: confirmación de borrado, duplicados."""

import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size
import ui.theme as theme


class ConfirmDeleteDialog(tk.Toplevel):
    """
    Diálogo de confirmación antes de borrar.
    result = True  → el usuario confirmó
    result = False → canceló
    """

    def __init__(self, parent, paths: list[str], permanent: bool = False):
        super().__init__(parent)
        self.result = False
        self._build(paths, permanent)
        self.transient(parent)
        self.grab_set()
        self.wait_window()

    def _build(self, paths: list[str], permanent: bool):
        n = len(paths)
        if permanent:
            self.title("Delete permanently")
            hdr_color = "#3b0a0a"
            icon      = "⚠"
            action    = f"Delete {n} item(s) permanently"
            detail    = "This action is IRREVERSIBLE. Files will not go to the Recycle Bin."
            btn_txt   = "Delete permanently"
            btn_style = "Danger.TButton"
        else:
            self.title("Move to Recycle Bin")
            hdr_color = "#1c1400"
            icon      = "🗑"
            action    = f"Move {n} item(s) to the Recycle Bin"
            detail    = "You can recover them from the Recycle Bin."
            btn_txt   = "Move to Bin"
            btn_style = "Accent.TButton"

        self.resizable(False, False)
        self.configure(bg=theme.BG_DARK)

        # Header
        hdr = tk.Frame(self, bg=hdr_color)
        hdr.pack(fill="x")
        tk.Label(
            hdr, text=f"  {icon}   {action}",
            bg=hdr_color, fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Variable", 10, "bold"),
            anchor="w", pady=12, padx=14,
        ).pack(fill="x")

        # Detalle
        tk.Label(
            self, text=detail,
            bg=theme.BG_DARK, fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL,
            pady=8, padx=14, anchor="w",
        ).pack(fill="x")

        # Separador
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x", padx=14)

        # Lista de rutas
        if paths:
            frame = tk.Frame(self, bg=theme.BG_CARD)
            frame.pack(fill="both", padx=14, pady=8)
            lb = tk.Listbox(
                frame,
                height=min(len(paths), 8),
                bg=theme.BG_CARD,
                fg=theme.TEXT_SECONDARY,
                selectbackground=theme.ACCENT,
                selectforeground="white",
                font=theme.FONT_MONO,
                borderwidth=0,
                highlightthickness=0,
            )
            lb.pack(side="left", fill="both", expand=True)
            sb = ttk.Scrollbar(frame, command=lb.yview)
            sb.pack(side="right", fill="y")
            lb.config(yscrollcommand=sb.set)
            for p in paths[:50]:
                lb.insert("end", "  " + p)
            if len(paths) > 50:
                lb.insert("end", f"  … and {len(paths) - 50} more")

        # Botones
        btn_frame = tk.Frame(self, bg=theme.BG_DARK)
        btn_frame.pack(fill="x", padx=14, pady=(4, 12))
        ttk.Button(
            btn_frame, text="Cancel",
            command=self.destroy,
        ).pack(side="right", padx=(6, 0))
        ttk.Button(
            btn_frame, text=btn_txt,
            style=btn_style,
            command=self._confirm,
        ).pack(side="right")

    def _confirm(self):
        self.result = True
        self.destroy()


class DuplicatesDialog(tk.Toplevel):
    """Muestra los posibles duplicados detectados."""

    def __init__(self, parent, duplicates: dict, on_delete):
        super().__init__(parent)
        self.title("Possible duplicates")
        self.configure(bg=theme.BG_DARK)
        self._on_delete = on_delete
        self._build(duplicates)
        self.transient(parent)
        self.grab_set()

    def _build(self, duplicates: dict):
        self.resizable(True, True)
        self.minsize(640, 420)

        # Header
        hdr = tk.Frame(self, bg=theme.BG_SURFACE)
        hdr.pack(fill="x")
        tk.Label(
            hdr,
            text=f"  {len(duplicates)} duplicate groups  (same name & size, >1 MB)",
            bg=theme.BG_SURFACE, fg=theme.TEXT_SECONDARY,
            font=("Segoe UI Variable", 9, "bold"),
            anchor="w", pady=10, padx=12,
        ).pack(fill="x")
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")

        frame = tk.Frame(self, bg=theme.BG_DARK)
        frame.pack(fill="both", expand=True, padx=0, pady=0)

        cols = ("name", "size", "copies", "wasted", "paths")
        tree = ttk.Treeview(frame, columns=cols, show="headings", height=20)
        tree.heading("name",   text="Name")
        tree.heading("size",   text="Size")
        tree.heading("copies", text="Copies")
        tree.heading("wasted", text="Wasted")
        tree.heading("paths",  text="Paths")
        tree.column("name",   width=200)
        tree.column("size",   width=80,  anchor="e")
        tree.column("copies", width=60,  anchor="center")
        tree.column("wasted", width=80,  anchor="e")
        tree.column("paths",  width=320)

        sb = ttk.Scrollbar(frame, command=tree.yview)
        tree.config(yscrollcommand=sb.set)
        tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        tree.tag_configure("odd",  background=theme.TAG_ODD_BG,  foreground=theme.TEXT_PRIMARY)
        tree.tag_configure("even", background=theme.TAG_EVEN_BG, foreground=theme.TEXT_PRIMARY)

        sorted_dups = sorted(
            duplicates.items(),
            key=lambda x: x[0][1] * (len(x[1]) - 1),
            reverse=True,
        )

        for i, ((name, size), paths) in enumerate(sorted_dups[:200]):
            wasted = size * (len(paths) - 1)
            paths_str = " | ".join(paths[:3])
            if len(paths) > 3:
                paths_str += f"  +{len(paths)-3} more"
            tag = "odd" if i % 2 == 0 else "even"
            tree.insert("", "end", values=(
                name,
                format_size(size),
                len(paths),
                format_size(wasted),
                paths_str,
            ), tags=(tag,))

        # Pie
        tk.Frame(self, bg=theme.BORDER, height=1).pack(fill="x")
        foot = tk.Frame(self, bg=theme.BG_SURFACE)
        foot.pack(fill="x", padx=12, pady=8)
        ttk.Button(foot, text="Close", command=self.destroy).pack(side="right")
