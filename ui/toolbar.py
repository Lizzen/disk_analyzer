"""Barra superior: selector de ruta + botones de acción."""

import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

import ui.theme as theme


class Toolbar(ttk.Frame):
    def __init__(self, parent, on_scan, on_cancel, **kwargs):
        kwargs.setdefault("style", "Surface.TFrame")
        super().__init__(parent, **kwargs)
        self._on_scan   = on_scan
        self._on_cancel = on_cancel
        self._build()

    def _build(self):
        self.columnconfigure(1, weight=1)

        # Icono de disco + label
        lbl = ttk.Label(self, text="  Ruta:", style="Toolbar.TLabel")
        lbl.grid(row=0, column=0, padx=(10, 4), pady=8)

        self._path_var = tk.StringVar(value="C:\\")
        self._entry = ttk.Entry(self, textvariable=self._path_var)
        self._entry.grid(row=0, column=1, sticky="ew", padx=(0, 4), pady=8)

        self._btn_browse = ttk.Button(self, text="...", width=3,
                                      command=self._browse)
        self._btn_browse.grid(row=0, column=2, padx=(0, 6), pady=8)

        self._btn_scan = ttk.Button(self, text="⬤  Escanear",
                                    style="Accent.TButton",
                                    command=self._do_scan)
        self._btn_scan.grid(row=0, column=3, padx=(0, 4), pady=8)

        self._btn_cancel = ttk.Button(self, text="✕  Cancelar",
                                      command=self._on_cancel, state="disabled")
        self._btn_cancel.grid(row=0, column=4, padx=(0, 10), pady=8)

    # ── API pública ────────────────────────────────────────────────────────────

    def set_scanning(self, scanning: bool):
        state_scan   = "disabled" if scanning else "normal"
        state_cancel = "normal"   if scanning else "disabled"
        self._btn_scan.config(state=state_scan)
        self._btn_cancel.config(state=state_cancel)
        self._entry.config(state="disabled" if scanning else "normal")
        self._btn_browse.config(state="disabled" if scanning else "normal")

    @property
    def path(self) -> str:
        return self._path_var.get().strip()

    # ── privado ────────────────────────────────────────────────────────────────

    def _browse(self):
        initial = self._path_var.get()
        if not os.path.isdir(initial):
            initial = "C:\\"
        chosen = filedialog.askdirectory(initialdir=initial,
                                         title="Selecciona carpeta a escanear")
        if chosen:
            self._path_var.set(chosen.replace("/", "\\"))

    def _do_scan(self):
        path = self.path
        if os.path.isdir(path):
            self._on_scan(path)
        else:
            messagebox.showerror("Error", f"La ruta no existe:\n{path}")
