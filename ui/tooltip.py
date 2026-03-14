"""
Sistema de tooltips flotantes para DKA.

Uso:
    Tooltip(widget, "Texto del tooltip")
    Tooltip(widget, "Texto", delay=600)
"""

from __future__ import annotations
import tkinter as tk
import ui.theme as theme

_DEFAULT_DELAY = 500   # ms antes de mostrar
_DEFAULT_HIDE  = 4000  # ms antes de ocultar automáticamente


class Tooltip:
    """Tooltip flotante con delay y auto-hide."""

    def __init__(self, widget: tk.Widget, text: str,
                 delay: int = _DEFAULT_DELAY):
        self._widget  = widget
        self._text    = text
        self._delay   = delay
        self._win: tk.Toplevel | None = None
        self._job_show = None
        self._job_hide = None

        widget.bind("<Enter>",   self._on_enter, add="+")
        widget.bind("<Leave>",   self._on_leave, add="+")
        widget.bind("<Button>",  self._on_leave, add="+")
        widget.bind("<Destroy>", self._on_leave, add="+")

    def _on_enter(self, _event=None):
        self._cancel_jobs()
        self._job_show = self._widget.after(self._delay, self._show)

    def _on_leave(self, _event=None):
        self._cancel_jobs()
        self._hide()

    def _cancel_jobs(self):
        if self._job_show:
            try:
                self._widget.after_cancel(self._job_show)
            except Exception:
                pass
            self._job_show = None
        if self._job_hide:
            try:
                self._widget.after_cancel(self._job_hide)
            except Exception:
                pass
            self._job_hide = None

    def _show(self):
        self._hide()
        x = self._widget.winfo_rootx() + 12
        y = self._widget.winfo_rooty() + self._widget.winfo_height() + 4

        self._win = tk.Toplevel(self._widget)
        self._win.wm_overrideredirect(True)
        self._win.wm_geometry(f"+{x}+{y}")
        self._win.configure(bg=theme.BORDER)
        self._win.attributes("-topmost", True)

        outer = tk.Frame(self._win, bg=theme.BORDER, padx=1, pady=1)
        outer.pack()
        inner = tk.Frame(outer, bg=theme.BG_CARD2)
        inner.pack()
        tk.Label(
            inner, text=self._text,
            bg=theme.BG_CARD2, fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL,
            padx=10, pady=6,
            justify="left",
        ).pack()

        self._job_hide = self._widget.after(_DEFAULT_HIDE, self._hide)

    def _hide(self):
        if self._win:
            try:
                self._win.destroy()
            except Exception:
                pass
            self._win = None
