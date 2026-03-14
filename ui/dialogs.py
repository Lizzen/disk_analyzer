"""Diálogos modales: confirmación de borrado, duplicados."""

import tkinter as tk
from tkinter import ttk

from utils.formatters import format_size


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
        # Modal
        self.transient(parent)
        self.grab_set()
        self.wait_window()

    def _build(self, paths: list[str], permanent: bool):
        n = len(paths)
        if permanent:
            self.title("Eliminar permanentemente")
            color  = "#c0392b"
            icon   = "⚠️"
            action = f"ELIMINAR PERMANENTEMENTE {n} elemento(s)"
            detail = "Esta acción es IRREVERSIBLE. Los archivos no irán a la Papelera."
            btn_txt = "Eliminar permanentemente"
        else:
            self.title("Mover a Papelera")
            color  = "#e67e22"
            icon   = "🗑"
            action = f"Mover {n} elemento(s) a la Papelera de Reciclaje"
            detail = "Podrás recuperarlos desde la Papelera."
            btn_txt = "Mover a Papelera"

        self.resizable(False, False)
        self.configure(bg="#2b2b2b")

        # Encabezado
        hdr = tk.Frame(self, bg=color)
        hdr.pack(fill="x")
        tk.Label(hdr, text=f" {icon}  {action}", bg=color, fg="white",
                 font=("Segoe UI", 10, "bold"), anchor="w",
                 pady=10, padx=10).pack(fill="x")

        # Detalle
        tk.Label(self, text=detail, bg="#2b2b2b", fg="#cccccc",
                 pady=6, padx=12, anchor="w").pack(fill="x")

        # Lista (primeros 10)
        if paths:
            frame = tk.Frame(self, bg="#1e1e1e")
            frame.pack(fill="both", padx=12, pady=(0, 8))
            lb = tk.Listbox(frame, height=min(len(paths), 8),
                            bg="#1e1e1e", fg="#cccccc",
                            selectbackground="#1e1e1e",
                            font=("Consolas", 8), borderwidth=0)
            lb.pack(side="left", fill="both", expand=True)
            sb = ttk.Scrollbar(frame, command=lb.yview)
            sb.pack(side="right", fill="y")
            lb.config(yscrollcommand=sb.set)
            for p in paths[:50]:
                lb.insert("end", "  " + p)
            if len(paths) > 50:
                lb.insert("end", f"  … y {len(paths) - 50} más")

        # Botones
        btn_frame = tk.Frame(self, bg="#2b2b2b")
        btn_frame.pack(fill="x", padx=12, pady=8)
        ttk.Button(btn_frame, text="Cancelar",
                   command=self.destroy).pack(side="right", padx=(4, 0))
        ttk.Button(btn_frame, text=btn_txt,
                   command=self._confirm).pack(side="right")

    def _confirm(self):
        self.result = True
        self.destroy()


class DuplicatesDialog(tk.Toplevel):
    """Muestra los posibles duplicados detectados."""

    def __init__(self, parent, duplicates: dict, on_delete):
        super().__init__(parent)
        self.title("Posibles duplicados")
        self._on_delete = on_delete
        self._build(duplicates)
        self.transient(parent)
        self.grab_set()

    def _build(self, duplicates: dict):
        self.resizable(True, True)
        self.minsize(600, 400)

        ttk.Label(self, text=f"Se encontraron {len(duplicates)} grupos de posibles duplicados "
                             f"(mismo nombre y tamaño, >1 MB).",
                  padding=8).pack(fill="x")

        frame = ttk.Frame(self)
        frame.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        cols = ("name", "size", "copies", "wasted", "paths")
        tree = ttk.Treeview(frame, columns=cols, show="headings", height=20)
        tree.heading("name",   text="Nombre")
        tree.heading("size",   text="Tamaño")
        tree.heading("copies", text="Copias")
        tree.heading("wasted", text="Desperdicio")
        tree.heading("paths",  text="Rutas")
        tree.column("name",   width=200)
        tree.column("size",   width=90,  anchor="e")
        tree.column("copies", width=60,  anchor="center")
        tree.column("wasted", width=90,  anchor="e")
        tree.column("paths",  width=300)

        sb = ttk.Scrollbar(frame, command=tree.yview)
        tree.config(yscrollcommand=sb.set)
        tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        # Ordenar por desperdicio
        sorted_dups = sorted(
            duplicates.items(),
            key=lambda x: x[0][1] * (len(x[1]) - 1),
            reverse=True,
        )

        for (name, size), paths in sorted_dups[:200]:
            wasted = size * (len(paths) - 1)
            paths_str = " | ".join(paths[:3])
            if len(paths) > 3:
                paths_str += f" … +{len(paths)-3}"
            tree.insert("", "end", values=(
                name,
                format_size(size),
                len(paths),
                format_size(wasted),
                paths_str,
            ))

        ttk.Button(self, text="Cerrar", command=self.destroy).pack(pady=8)
