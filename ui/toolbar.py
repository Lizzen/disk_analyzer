"""
Toolbar principal — diseño premium DKA v2.

Logo con gradiente simulado · Entry de ruta con borde vivo al focus ·
Botón Scan con efecto pulse · Botón cancel · Animaciones hover en tk puro.
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
        self._scanning  = False
        self._build()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self.columnconfigure(2, weight=1)

        # ── Logo ──────────────────────────────────────────────────────
        logo = tk.Frame(self, bg=theme.BG_SURFACE)
        logo.grid(row=0, column=0, padx=(16, 0), pady=12, sticky="ns")

        # Canvas para el logo con gradiente simulado
        logo_canvas = tk.Canvas(
            logo, width=28, height=28,
            bg=theme.BG_SURFACE, highlightthickness=0, bd=0,
        )
        logo_canvas.pack(side="left", padx=(0, 8))
        # Icono de disco: círculo exterior + círculo interior
        logo_canvas.create_oval(2, 2, 26, 26, fill=theme.ACCENT, outline="")
        logo_canvas.create_oval(9, 9, 19, 19, fill=theme.BG_SURFACE, outline="")
        logo_canvas.create_oval(12, 12, 16, 16, fill=theme.ACCENT_LIGHT, outline="")

        tk.Label(
            logo, text="Disk",
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Variable", 11, "bold"),
        ).pack(side="left")
        tk.Label(
            logo, text="Analyzer",
            bg=theme.BG_SURFACE, fg=theme.ACCENT_LIGHT,
            font=("Segoe UI Variable", 11),
        ).pack(side="left", padx=(2, 0))

        # ── Separador vertical ─────────────────────────────────────────
        tk.Frame(self, bg=theme.BORDER, width=1).grid(
            row=0, column=1, padx=14, pady=10, sticky="ns"
        )

        # ── Entry de ruta con borde vivo ───────────────────────────────
        self._entry_border = tk.Frame(self, bg=theme.BORDER, bd=0)
        self._entry_border.grid(row=0, column=2, sticky="ew", pady=12, padx=(0, 6))

        entry_inner = tk.Frame(self._entry_border, bg=theme.BG_INPUT)
        entry_inner.pack(fill="both", expand=True, padx=1, pady=1)

        # Icono folder dentro del entry
        tk.Label(
            entry_inner, text="  ⊘",
            bg=theme.BG_INPUT, fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 10),
        ).pack(side="left")

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
        self._entry.pack(fill="both", expand=True, padx=(4, 10), ipady=8)
        self._entry.bind("<Return>",    lambda _: self._do_scan())
        self._entry.bind("<FocusIn>",   self._on_entry_focus_in)
        self._entry.bind("<FocusOut>",  self._on_entry_focus_out)

        # ── Botón browse ───────────────────────────────────────────────
        self._btn_browse = _HoverButton(
            self,
            text="📂",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            hover_bg=theme.BG_HOVER, hover_fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Emoji", 12),
            padx=10, pady=8,
            command=self._browse,
        )
        self._btn_browse.grid(row=0, column=3, padx=(0, 4), pady=10)

        # ── Botón Scan ─────────────────────────────────────────────────
        self._btn_scan = _HoverButton(
            self,
            text="  ▶  Escanear  ",
            bg=theme.ACCENT, fg="white",
            hover_bg=theme.ACCENT_LIGHT, hover_fg="white",
            font=("Segoe UI Variable", 10, "bold"),
            padx=4, pady=8,
            command=self._do_scan,
        )
        self._btn_scan.grid(row=0, column=4, padx=(0, 4), pady=10)

        # ── Botón Cancel ───────────────────────────────────────────────
        self._btn_cancel = _HoverButton(
            self,
            text="✕",
            bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            hover_bg="#2a0f18", hover_fg=theme.ACCENT_RED,
            font=("Segoe UI Variable", 12),
            padx=10, pady=8,
            state="disabled",
            command=self._on_cancel,
        )
        self._btn_cancel.grid(row=0, column=5, padx=(0, 14), pady=10)

    # ── API pública ────────────────────────────────────────────────────────────

    def set_scanning(self, scanning: bool):
        self._scanning = scanning
        if scanning:
            self._btn_scan.configure(
                bg="#2d2d55", fg="#5a5a9a",
                hover_bg="#2d2d55", hover_fg="#5a5a9a",
                state="disabled",
            )
            self._btn_cancel.configure(state="normal")
            self._entry.configure(state="disabled")
            self._btn_browse.configure(state="disabled")
        else:
            self._btn_scan.configure(
                bg=theme.ACCENT, fg="white",
                hover_bg=theme.ACCENT_LIGHT, hover_fg="white",
                state="normal",
            )
            self._btn_cancel.configure(state="disabled")
            self._entry.configure(state="normal")
            self._btn_browse.configure(state="normal")

    @property
    def path(self) -> str:
        return self._path_var.get().strip()

    # ── privado ────────────────────────────────────────────────────────────────

    def _on_entry_focus_in(self, _=None):
        self._entry_border.configure(bg=theme.ACCENT)

    def _on_entry_focus_out(self, _=None):
        self._entry_border.configure(bg=theme.BORDER)

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
        if self._scanning:
            return
        path = self.path
        if os.path.isdir(path):
            self._on_scan(path)
        else:
            messagebox.showerror("Error", f"La ruta no existe:\n{path}")


# ── Widget helper: botón con hover animado ────────────────────────────────────

class _HoverButton(tk.Button):
    """tk.Button con transición de color en hover."""

    def __init__(self, parent, hover_bg: str, hover_fg: str, **kwargs):
        self._normal_bg = kwargs.get("bg", theme.BG_CARD)
        self._normal_fg = kwargs.get("fg", theme.TEXT_SECONDARY)
        self._hover_bg  = hover_bg
        self._hover_fg  = hover_fg
        kwargs.setdefault("activebackground", hover_bg)
        kwargs.setdefault("activeforeground", hover_fg)
        kwargs.setdefault("relief", "flat")
        kwargs.setdefault("bd", 0)
        kwargs.setdefault("cursor", "hand2")
        super().__init__(parent, **kwargs)
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)

    def configure(self, **kwargs):
        # Actualizar colores de hover si se pasan
        if "hover_bg" in kwargs:
            self._hover_bg = kwargs.pop("hover_bg")
            self.configure(activebackground=self._hover_bg)
        if "hover_fg" in kwargs:
            self._hover_fg = kwargs.pop("hover_fg")
            self.configure(activeforeground=self._hover_fg)
        if "bg" in kwargs:
            self._normal_bg = kwargs["bg"]
        if "fg" in kwargs:
            self._normal_fg = kwargs["fg"]
        super().configure(**kwargs)

    def _on_enter(self, _=None):
        if str(self.cget("state")) != "disabled":
            super().configure(bg=self._hover_bg, fg=self._hover_fg)

    def _on_leave(self, _=None):
        super().configure(bg=self._normal_bg, fg=self._normal_fg)
