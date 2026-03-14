"""
Panel de chat integrado en la UI de Disk Analyzer.

Características:
- Selector de proveedor de IA con estado visual
- Historial de mensajes con burbujas usuario/asistente
- Streaming de respuestas en tiempo real
- Botón para adjuntar archivo/carpeta seleccionado como contexto
- Indicador de estado del proveedor activo
"""

from __future__ import annotations
import threading
import tkinter as tk
from tkinter import ttk

import ui.theme as theme
from chatbot import config
from chatbot.context_builder import build_messages


# ── Colores específicos del chat ───────────────────────────────────────────────

USER_BG    = "#0f3460"
USER_FG    = "#e8eaf6"
BOT_BG     = "#1e2a45"
BOT_FG     = "#e8eaf6"
ERROR_BG   = "#4a0e0e"
ERROR_FG   = "#ff8a80"
SYSTEM_FG  = "#5c6bc0"

PROVIDER_ORDER = ["gemini", "groq", "claude", "ollama"]


class ChatPanel(ttk.Frame):
    """
    Panel de chat lateral con soporte multi-proveedor y streaming.

    Parámetros:
        get_scan_result: callable que retorna el ScanResult actual (o None)
        get_selected_path: callable que retorna la ruta seleccionada actualmente
    """

    def __init__(self, parent, get_scan_result, get_selected_path, **kwargs):
        kwargs.setdefault("style", "Panel.TFrame")
        super().__init__(parent, **kwargs)

        self._get_scan   = get_scan_result
        self._get_sel    = get_selected_path
        self._history:   list[dict] = []
        self._streaming  = False
        self._provider   = None   # instancia AIProvider activa

        self._build()
        self._load_providers()

    # ── construcción ─────────────────────────────────────────────────────────

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        # ── Header ───────────────────────────────────────────────────────────
        hdr = tk.Frame(self, bg=theme.BG_SURFACE)
        hdr.grid(row=0, column=0, sticky="ew")

        tk.Label(
            hdr, text="  Asistente IA", bg=theme.BG_SURFACE,
            fg=theme.TEXT_PRIMARY, font=("Segoe UI", 10, "bold"), anchor="w",
        ).pack(side="left", pady=6)

        # Selector de proveedor
        self._provider_var = tk.StringVar()
        self._provider_combo = ttk.Combobox(
            hdr, textvariable=self._provider_var,
            state="readonly", width=18,
        )
        self._provider_combo.pack(side="right", padx=8, pady=5)
        self._provider_combo.bind("<<ComboboxSelected>>", self._on_provider_change)

        # Indicador de estado del proveedor (punto de color)
        self._status_dot = tk.Label(
            hdr, text="●", bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED, font=("Segoe UI", 12),
        )
        self._status_dot.pack(side="right", padx=(4, 0), pady=5)

        # ── Área de mensajes ─────────────────────────────────────────────────
        msg_frame = ttk.Frame(self, style="Panel.TFrame")
        msg_frame.grid(row=1, column=0, sticky="nsew", padx=0, pady=0)
        msg_frame.rowconfigure(0, weight=1)
        msg_frame.columnconfigure(0, weight=1)

        self._canvas = tk.Canvas(
            msg_frame, bg=theme.BG_PANEL, highlightthickness=0, bd=0,
        )
        self._vsb = ttk.Scrollbar(msg_frame, orient="vertical",
                                   command=self._canvas.yview)
        self._canvas.configure(yscrollcommand=self._vsb.set)

        self._canvas.grid(row=0, column=0, sticky="nsew")
        self._vsb.grid(row=0, column=1, sticky="ns")

        # Frame interior que contiene los mensajes
        self._msg_inner = tk.Frame(self._canvas, bg=theme.BG_PANEL)
        self._canvas_window = self._canvas.create_window(
            (0, 0), window=self._msg_inner, anchor="nw",
        )
        self._msg_inner.bind("<Configure>", self._on_inner_configure)
        self._canvas.bind("<Configure>", self._on_canvas_configure)
        self._canvas.bind("<MouseWheel>", self._on_mousewheel)
        self._msg_inner.bind("<MouseWheel>", self._on_mousewheel)

        # ── Barra de contexto (archivo seleccionado) ──────────────────────────
        self._ctx_bar = tk.Frame(self, bg=theme.BG_SURFACE)
        self._ctx_bar.grid(row=2, column=0, sticky="ew")
        self._ctx_bar.grid_remove()

        tk.Label(
            self._ctx_bar, text="Contexto:", bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED, font=theme.FONT_SMALL,
        ).pack(side="left", padx=(8, 4), pady=3)

        self._ctx_lbl = tk.Label(
            self._ctx_bar, text="", bg=theme.BG_SURFACE,
            fg=theme.TEXT_SECONDARY, font=theme.FONT_SMALL, anchor="w",
        )
        self._ctx_lbl.pack(side="left", fill="x", expand=True, pady=3)

        tk.Button(
            self._ctx_bar, text="✕", bg=theme.BG_SURFACE, fg=theme.TEXT_MUTED,
            relief="flat", bd=0, cursor="hand2",
            command=self._clear_context,
        ).pack(side="right", padx=6, pady=3)

        # ── Input ─────────────────────────────────────────────────────────────
        inp_frame = tk.Frame(self, bg=theme.BG_SURFACE)
        inp_frame.grid(row=3, column=0, sticky="ew")

        # Botón adjuntar selección
        self._btn_attach = tk.Button(
            inp_frame, text="📎", bg=theme.BG_SURFACE, fg=theme.TEXT_SECONDARY,
            relief="flat", bd=0, cursor="hand2", font=("Segoe UI Emoji", 11),
            command=self._attach_selection,
        )
        self._btn_attach.pack(side="left", padx=(6, 2), pady=6)

        self._input_var = tk.StringVar()
        self._input = tk.Text(
            inp_frame, height=2, wrap="word",
            bg=theme.BG_INPUT, fg=theme.TEXT_PRIMARY,
            insertbackground=theme.TEXT_PRIMARY,
            relief="flat", bd=0, padx=6, pady=6,
            font=theme.FONT_UI,
        )
        self._input.pack(side="left", fill="both", expand=True, pady=6)
        self._input.bind("<Return>",       self._on_enter)
        self._input.bind("<Shift-Return>", lambda e: None)   # salto de línea normal

        self._btn_send = tk.Button(
            inp_frame, text="▶", bg=theme.ACCENT, fg="white",
            relief="flat", bd=0, cursor="hand2",
            font=("Segoe UI", 12, "bold"), width=3,
            command=self._send,
        )
        self._btn_send.pack(side="right", padx=(2, 6), pady=6, fill="y")

        # ── Barra de estado proveedor ─────────────────────────────────────────
        self._info_lbl = tk.Label(
            self, text="", bg=theme.BG_DARK,
            fg=theme.TEXT_MUTED, font=theme.FONT_SMALL, anchor="w",
        )
        self._info_lbl.grid(row=4, column=0, sticky="ew", padx=8, pady=(0, 4))

        self._attached_path: str = ""

    # ── Providers ─────────────────────────────────────────────────────────────

    def _load_providers(self):
        """Inicializa los providers y actualiza el combo."""
        from chatbot.providers.gemini import GeminiProvider
        from chatbot.providers.claude import ClaudeProvider
        from chatbot.providers.groq_p import GroqProvider
        from chatbot.providers.ollama import OllamaProvider

        self._providers = {
            "gemini": GeminiProvider(),
            "claude": ClaudeProvider(),
            "groq":   GroqProvider(),
            "ollama": OllamaProvider(config.OLLAMA_MODEL),
        }

        labels = []
        for pid in PROVIDER_ORDER:
            p = self._providers[pid]
            free = " ✓" if p.info.free_tier else ""
            labels.append(f"{p.info.name}{free}")

        self._provider_combo["values"] = labels
        self._provider_ids = PROVIDER_ORDER

        # Seleccionar el provider por defecto
        default_idx = PROVIDER_ORDER.index(config.DEFAULT_PROVIDER) \
            if config.DEFAULT_PROVIDER in PROVIDER_ORDER else 0
        self._provider_combo.current(default_idx)
        self._activate_provider(PROVIDER_ORDER[default_idx])

    def _activate_provider(self, pid: str):
        p = self._providers.get(pid)
        if p is None:
            return
        self._provider = p
        ok, err = p.is_available()
        if ok:
            self._status_dot.config(fg="#4ecdc4")   # verde
            self._info_lbl.config(
                text=f"  {p.info.model}  —  {p.info.description}",
                fg=theme.TEXT_MUTED,
            )
        else:
            self._status_dot.config(fg=theme.ACCENT)   # rojo
            self._info_lbl.config(
                text=f"  ⚠ {err}",
                fg=theme.ACCENT,
            )

    def _on_provider_change(self, _event=None):
        idx = self._provider_combo.current()
        if 0 <= idx < len(self._provider_ids):
            self._activate_provider(self._provider_ids[idx])

    # ── Contexto adjunto ──────────────────────────────────────────────────────

    def _attach_selection(self):
        path = self._get_sel()
        if path:
            self._attached_path = path
            short = path[-50:] if len(path) > 50 else path
            self._ctx_lbl.config(text=f"…{short}")
            self._ctx_bar.grid()
        else:
            self._add_system_msg("No hay ningún archivo/carpeta seleccionado.")

    def _clear_context(self):
        self._attached_path = ""
        self._ctx_bar.grid_remove()

    # ── Envío de mensajes ─────────────────────────────────────────────────────

    def _on_enter(self, event):
        # Enter envía; Shift+Enter inserta salto
        if not event.state & 0x1:   # sin Shift
            self._send()
            return "break"

    def _send(self):
        if self._streaming:
            return
        text = self._input.get("1.0", "end-1c").strip()
        if not text:
            return

        if self._provider is None:
            self._add_system_msg("Selecciona un proveedor de IA.")
            return

        ok, err = self._provider.is_available()
        if not ok:
            self._add_system_msg(f"⚠ Proveedor no disponible:\n{err}")
            return

        self._input.delete("1.0", "end")
        self._add_message("user", text)
        self._history.append({"role": "user", "content": text})

        # Construir mensajes con contexto del scan
        selected = self._attached_path or self._get_sel()
        msgs = build_messages(self._history[:-1], text, self._get_scan(), selected)

        # Lanzar en hilo para no bloquear UI
        self._streaming = True
        self._btn_send.config(state="disabled", text="…")
        bot_widget = self._add_message("assistant", "")

        threading.Thread(
            target=self._stream_response,
            args=(msgs, bot_widget),
            daemon=True,
        ).start()

    def _stream_response(self, msgs, bot_widget):
        full_text = []

        def on_chunk(chunk: str):
            full_text.append(chunk)
            # Actualizar el widget desde el hilo de UI (thread-safe via after)
            self.after(0, lambda c=chunk: self._append_to_widget(bot_widget, c))

        try:
            if config.STREAM_RESPONSES:
                self._provider.send(msgs, on_chunk=on_chunk)
                response = "".join(full_text)
            else:
                response = self._provider.send(msgs)
                self.after(0, lambda: self._set_widget_text(bot_widget, response))
        except RuntimeError as exc:
            response = f"Error: {exc}"
            self.after(0, lambda: self._set_widget_text(bot_widget, response, error=True))

        self._history.append({"role": "assistant", "content": response})
        self.after(0, self._on_stream_done)

    def _on_stream_done(self):
        self._streaming = False
        self._btn_send.config(state="normal", text="▶")
        self._scroll_to_bottom()

    # ── Widgets de mensajes ───────────────────────────────────────────────────

    def _add_message(self, role: str, text: str) -> tk.Text:
        """Añade una burbuja de mensaje al panel y retorna el widget Text."""
        is_user = (role == "user")

        outer = tk.Frame(self._msg_inner, bg=theme.BG_PANEL)
        outer.pack(fill="x", padx=6, pady=(4, 0))

        # Label de nombre
        name = "Tú" if is_user else (
            self._provider.info.name if self._provider else "IA"
        )
        color = self._provider.info.color if (self._provider and not is_user) else "#9fa8da"
        tk.Label(
            outer, text=name, bg=theme.BG_PANEL,
            fg=color, font=("Segoe UI", 8, "bold"), anchor="e" if is_user else "w",
        ).pack(fill="x", padx=4)

        # Burbuja
        bubble_bg = USER_BG if is_user else BOT_BG
        bubble = tk.Text(
            outer, wrap="word", relief="flat", bd=0,
            bg=bubble_bg, fg=USER_FG if is_user else BOT_FG,
            font=theme.FONT_UI, padx=10, pady=8,
            cursor="arrow", state="normal",
            height=1,   # se auto-ajusta con _resize_bubble
        )
        bubble.pack(fill="x", padx=(30 if is_user else 0, 0 if is_user else 30))

        if text:
            bubble.insert("end", text)
            bubble.config(state="disabled")
            self._resize_bubble(bubble)

        self._scroll_to_bottom()
        return bubble

    def _append_to_widget(self, widget: tk.Text, chunk: str):
        widget.config(state="normal")
        widget.insert("end", chunk)
        self._resize_bubble(widget)
        widget.config(state="disabled")
        self._scroll_to_bottom()

    def _set_widget_text(self, widget: tk.Text, text: str, error: bool = False):
        widget.config(state="normal")
        widget.delete("1.0", "end")
        widget.insert("end", text)
        if error:
            widget.config(bg=ERROR_BG, fg=ERROR_FG)
        self._resize_bubble(widget)
        widget.config(state="disabled")
        self._scroll_to_bottom()

    def _resize_bubble(self, widget: tk.Text):
        """Ajusta la altura del Text al contenido."""
        widget.update_idletasks()
        lines = int(widget.index("end-1c").split(".")[0])
        widget.config(height=max(lines, 1))

    def _add_system_msg(self, text: str):
        lbl = tk.Label(
            self._msg_inner, text=text, bg=theme.BG_PANEL,
            fg=SYSTEM_FG, font=theme.FONT_SMALL, wraplength=240, justify="center",
        )
        lbl.pack(fill="x", padx=12, pady=4)
        self._scroll_to_bottom()

    # ── Scroll ────────────────────────────────────────────────────────────────

    def _scroll_to_bottom(self):
        self._canvas.update_idletasks()
        self._canvas.yview_moveto(1.0)

    def _on_inner_configure(self, _event):
        self._canvas.configure(scrollregion=self._canvas.bbox("all"))

    def _on_canvas_configure(self, event):
        self._canvas.itemconfig(self._canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        self._canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    # ── API pública ───────────────────────────────────────────────────────────

    def clear_history(self):
        self._history.clear()
        for widget in self._msg_inner.winfo_children():
            widget.destroy()
        self._add_system_msg("Historial limpiado.")

    def notify_scan_complete(self, scan_result):
        """Llamar desde app.py cuando termina un escaneo."""
        n = len(scan_result.files) if scan_result else 0
        if n > 0:
            self._add_system_msg(
                f"Escaneo completado: {n:,} archivos disponibles.\n"
                "Puedes preguntar sobre cualquier archivo o carpeta."
            )

    def reload_providers(self):
        """Recarga los providers tras guardar nueva configuración."""
        from chatbot import config as cfg
        # Importar config actualizado
        import importlib
        importlib.reload(cfg)

        self._load_providers()
        self._add_system_msg("✓ Configuración guardada. Proveedores recargados.")
