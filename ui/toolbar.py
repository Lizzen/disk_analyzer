"""Barra superior: selector de ruta + botones de acción.

Diseño Linear/Vercel — ~52 px de altura, minimalista.
API pública: set_scanning(bool), path (property), _btn_scan
"""

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

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self.columnconfigure(2, weight=1)   # columna del entry se expande

        # ── Logotipo DKA ─────────────────────────────────────────────
        logo_frame = tk.Frame(self, bg=theme.BG_SURFACE)
        logo_frame.grid(row=0, column=0, padx=(14, 0), pady=14, sticky="ns")

        # Punto azul
        tk.Label(
            logo_frame, text="●",
            bg=theme.BG_SURFACE, fg=theme.ACCENT,
            font=("Segoe UI Variable", 8),
        ).pack(side="left", padx=(0, 4))

        # Nombre
        tk.Label(
            logo_frame, text="DKA",
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Variable", 10, "bold"),
        ).pack(side="left")

        # ── Separador vertical ────────────────────────────────────────
        tk.Frame(self, bg=theme.BORDER, width=1).grid(
            row=0, column=1, padx=12, pady=10, sticky="ns"
        )

        # ── Breadcrumb / entry de ruta ────────────────────────────────
        # Wrapper con borde de 1px simulado
        entry_border = tk.Frame(self, bg=theme.BORDER)
        entry_border.grid(row=0, column=2, sticky="ew", pady=12, padx=(0, 4))

        entry_inner = tk.Frame(entry_border, bg=theme.BG_INPUT)
        entry_inner.pack(fill="both", expand=True, padx=1, pady=1)

        self._path_var = tk.StringVar(value="C:\\")
        self._entry = tk.Entry(
            entry_inner,
            textvariable=self._path_var,
            bg=theme.BG_INPUT,
            fg=theme.TEXT_PRIMARY,
            insertbackground=theme.ACCENT,
            selectbackground=theme.ACCENT,
            selectforeground="white",
            relief="flat",
            bd=0,
            font=theme.FONT_UI,
        )
        self._entry.pack(fill="both", expand=True, padx=10, ipady=8)
        self._entry.bind("<Return>", lambda _: self._do_scan())

        # ── Botón carpeta (icono) ─────────────────────────────────────
        self._btn_browse = tk.Button(
            self,
            text="⊞",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.TEXT_PRIMARY,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 13),
            padx=8,
            pady=6,
            command=self._browse,
        )
        self._btn_browse.grid(row=0, column=3, padx=(0, 4), pady=10)

        # ── Botón Scan (azul) ─────────────────────────────────────────
        self._btn_scan = tk.Button(
            self,
            text="▶  Escanear",
            bg=theme.ACCENT,
            fg="white",
            activebackground=theme.ACCENT_DARK,
            activeforeground="white",
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 10, "bold"),
            padx=16,
            pady=8,
            command=self._do_scan,
        )
        self._btn_scan.grid(row=0, column=4, padx=(0, 4), pady=10)

        # ── Botón Cancel (ghost) ──────────────────────────────────────
        self._btn_cancel = tk.Button(
            self,
            text="✕",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.ACCENT_RED,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 11),
            padx=10,
            pady=8,
            state="disabled",
            command=self._on_cancel,
        )
        self._btn_cancel.grid(row=0, column=5, padx=(0, 12), pady=10)

    # ── API pública ────────────────────────────────────────────────────────────

    def set_scanning(self, scanning: bool):
        if scanning:
            self._btn_scan.config(
                state="disabled",
                bg="#1e3a5f",
                fg="#4a7ab5",
            )
            self._btn_cancel.config(state="normal", fg=theme.ACCENT_RED)
            self._entry.config(state="disabled")
            self._btn_browse.config(state="disabled")
        else:
            self._btn_scan.config(
                state="normal",
                bg=theme.ACCENT,
                fg="white",
            )
            self._btn_cancel.config(state="disabled", fg=theme.TEXT_MUTED)
            self._entry.config(state="normal")
            self._btn_browse.config(state="normal")

    @property
    def path(self) -> str:
        return self._path_var.get().strip()

    # ── privado ────────────────────────────────────────────────────────────────

    def _browse(self):
        initial = self._path_var.get()
        if not os.path.isdir(initial):
            initial = "C:\\"
        chosen = filedialog.askdirectory(
            initialdir=initial,
            title="Selecciona carpeta a escanear",
        )
        if chosen:
            self._path_var.set(chosen.replace("/", "\\"))

    def _do_scan(self):
        path = self.path
        if os.path.isdir(path):
            self._on_scan(path)
        else:
            messagebox.showerror("Error", f"La ruta no existe:\n{path}")
