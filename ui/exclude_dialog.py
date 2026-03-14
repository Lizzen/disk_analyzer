"""
Diálogo para gestionar carpetas excluidas del escaneo.
Permite añadir nombres de carpeta (no rutas completas) que se saltarán
durante el escaneo. Persiste en AppData.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

import ui.theme as theme
from core.scanner import get_ignore_list, add_ignore, remove_ignore, IGNORAR_CARPETAS, _user_ignore

_CONFIG_DIR  = Path(os.environ.get("APPDATA", Path.home())) / "DiskAnalyzer"
_IGNORE_FILE = _CONFIG_DIR / "excluded_folders.json"


def load_excluded():
    """Carga las exclusiones guardadas y las aplica al scanner."""
    try:
        if _IGNORE_FILE.exists():
            names = json.loads(_IGNORE_FILE.read_text(encoding="utf-8"))
            for n in names:
                add_ignore(n)
    except Exception:
        pass


def _save_excluded():
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _IGNORE_FILE.write_text(
        json.dumps(sorted(_user_ignore), indent=2), encoding="utf-8"
    )


class ExcludeDialog(tk.Toplevel):
    """Diálogo modal para gestionar carpetas excluidas del escaneo."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("Carpetas excluidas del escaneo")
        self.configure(bg=theme.BG_DARK)
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self._build()
        self._refresh_list()
        self._center(parent)

    def _build(self):
        # Encabezado
        hdr = tk.Frame(self, bg=theme.BG_SURFACE)
        hdr.pack(fill="x")
        tk.Label(
            hdr, text="  🚫   Carpetas excluidas del escaneo",
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            font=("Segoe UI", 11, "bold"), anchor="w", pady=10, padx=14,
        ).pack(fill="x")

        tk.Label(
            self,
            text="Escribe el nombre de la carpeta (no la ruta completa).\n"
                 "Cualquier carpeta con ese nombre se saltará durante el escaneo.",
            bg=theme.BG_DARK, fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL, justify="left", padx=14, pady=6,
        ).pack(fill="x")

        # Input + botón añadir
        inp_frame = tk.Frame(self, bg=theme.BG_DARK)
        inp_frame.pack(fill="x", padx=14, pady=(0, 8))
        inp_frame.columnconfigure(0, weight=1)

        self._new_var = tk.StringVar()
        entry = tk.Entry(
            inp_frame, textvariable=self._new_var,
            bg=theme.BG_INPUT, fg=theme.TEXT_PRIMARY,
            insertbackground=theme.TEXT_PRIMARY,
            relief="flat", font=theme.FONT_UI,
        )
        entry.grid(row=0, column=0, sticky="ew", ipady=5, padx=(0, 6))
        entry.bind("<Return>", lambda _: self._add())

        ttk.Button(inp_frame, text="Añadir", command=self._add).grid(row=0, column=1)

        # Lista dividida: sistema (fijo) + usuario (editable)
        list_frame = tk.Frame(self, bg=theme.BG_DARK)
        list_frame.pack(fill="both", expand=True, padx=14, pady=(0, 8))

        # Sistema (solo lectura)
        tk.Label(list_frame, text="Del sistema (no editables):",
                 bg=theme.BG_DARK, fg=theme.TEXT_MUTED, font=theme.FONT_SMALL,
                 ).pack(anchor="w")

        sys_lb = tk.Listbox(
            list_frame, height=4,
            bg=theme.BG_PANEL, fg=theme.TEXT_MUTED,
            selectbackground=theme.BG_PANEL, font=theme.FONT_MONO,
            borderwidth=0, highlightthickness=0,
        )
        sys_lb.pack(fill="x")
        for name in sorted(IGNORAR_CARPETAS):
            sys_lb.insert("end", f"  {name}")

        tk.Label(list_frame, text="Personalizadas (editables):",
                 bg=theme.BG_DARK, fg=theme.TEXT_SECONDARY, font=theme.FONT_SMALL,
                 pady=(8, 0),
                 ).pack(anchor="w", pady=(8, 0))

        user_frame = tk.Frame(list_frame, bg=theme.BG_DARK)
        user_frame.pack(fill="both", expand=True)
        user_frame.columnconfigure(0, weight=1)

        self._user_lb = tk.Listbox(
            user_frame, height=8,
            bg=theme.BG_PANEL, fg=theme.TEXT_PRIMARY,
            selectbackground=theme.ACCENT, selectforeground="white",
            font=theme.FONT_MONO, borderwidth=0, highlightthickness=0,
        )
        sb = ttk.Scrollbar(user_frame, command=self._user_lb.yview)
        self._user_lb.config(yscrollcommand=sb.set)
        self._user_lb.grid(row=0, column=0, sticky="nsew")
        sb.grid(row=0, column=1, sticky="ns")

        ttk.Button(
            list_frame, text="Eliminar seleccionado",
            command=self._remove,
        ).pack(anchor="e", pady=(4, 0))

        # Sugerencias rápidas
        tk.Label(
            self,
            text="Sugerencias:  Xilinx  •  node_modules  •  .git  •  venv  •  build",
            bg=theme.BG_DARK, fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL, padx=14,
        ).pack(anchor="w", pady=(0, 4))

        # Botones inferiores
        btn_frame = tk.Frame(self, bg=theme.BG_DARK)
        btn_frame.pack(fill="x", padx=14, pady=(0, 12))
        ttk.Button(btn_frame, text="Cerrar", style="Accent.TButton",
                   command=self.destroy).pack(side="right")

    def _refresh_list(self):
        self._user_lb.delete(0, "end")
        for name in sorted(_user_ignore):
            self._user_lb.insert("end", f"  {name}")

    def _add(self):
        name = self._new_var.get().strip().strip("\\/")
        if not name:
            return
        if name in IGNORAR_CARPETAS:
            messagebox.showinfo("Info", f"'{name}' ya está en la lista del sistema.")
            return
        add_ignore(name)
        _save_excluded()
        self._new_var.set("")
        self._refresh_list()

    def _remove(self):
        sel = self._user_lb.curselection()
        if not sel:
            return
        name = self._user_lb.get(sel[0]).strip()
        remove_ignore(name)
        _save_excluded()
        self._refresh_list()

    def _center(self, parent):
        self.update_idletasks()
        w, h = self.winfo_width(), self.winfo_height()
        px = parent.winfo_rootx() + parent.winfo_width() // 2 - w // 2
        py = parent.winfo_rooty() + parent.winfo_height() // 2 - h // 2
        self.geometry(f"+{max(px,0)}+{max(py,0)}")
        self.wait_window()
