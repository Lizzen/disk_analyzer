"""
Panel de chat integrado — diseño moderno Linear/Vercel/claude.ai.

- Header compacto: "Assistant" a la izquierda, selector de proveedor + dot + clear a la derecha
- Área de mensajes con Canvas + inner Frame (scrollable)
- Mensajes usuario: alineados a la derecha, tint azul oscuro (#0f1e3d)
- Mensajes bot: alineados a la izquierda, tarjeta oscura (#111113)
- Bloques de código: tk.Text con Cascadia Code
- Indicador de escritura animado
- Sugerencias rápidas iniciales
- Input multilinea con botón enviar
- Footer: nombre del modelo + estado

API pública: clear_history(), notify_scan_complete(), reload_providers(), _attach_selection()
"""

from __future__ import annotations
import threading
import tkinter as tk
from tkinter import ttk

import ui.theme as theme
from chatbot import config
from chatbot.context_builder import build_messages


# ── Constantes de estilo del chat ─────────────────────────────────────────────

USER_BG   = "#0f1e3d"   # Azul oscuro — mensajes del usuario
USER_FG   = "#e8f0fe"
BOT_BG    = "#111113"   # Zinc-900 — mensajes del asistente
BOT_FG    = "#fafafa"
CODE_BG   = "#0a0a0e"   # Casi negro — bloques de código
CODE_FG   = "#86efac"   # verde claro
ERROR_BG  = "#1c0a0a"
ERROR_FG  = "#ef4444"
SYSTEM_FG = "#52525b"   # zinc-600

PROVIDER_ORDER = ["gemini", "groq", "claude", "ollama"]

PROVIDER_COLORS = {
    "gemini": "#4285f4",
    "groq":   "#f55036",
    "claude": "#d97706",
    "ollama": "#10b981",
}

QUICK_SUGGESTIONS = [
    "¿Qué carpeta ocupa más espacio?",
    "¿Puedo eliminar archivos temporales de forma segura?",
    "¿Qué son los archivos .pyc?",
    "Muéstrame los archivos más grandes",
    "¿Cuántos duplicados hay?",
]

TYPING_FRAMES = ["·", "· ·", "· · ·"]


class ChatPanel(ttk.Frame):
    """Panel de chat lateral con soporte multi-proveedor y streaming."""

    def __init__(self, parent, get_scan_result, get_selected_path, **kwargs):
        kwargs.setdefault("style", "Panel.TFrame")
        super().__init__(parent, **kwargs)

        self._get_scan  = get_scan_result
        self._get_sel   = get_selected_path
        self._history:  list[dict] = []
        self._streaming = False
        self._provider  = None
        self._attached_path: str = ""
        self._typing_idx = 0
        self._typing_job = None
        self._suggestions_shown = False

        self._build()
        self._load_providers()

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        self._build_header()
        self._build_messages()
        self._build_context_bar()
        self._build_input()
        self._build_footer()

    def _build_header(self):
        hdr = tk.Frame(self, bg=theme.BG_SURFACE, height=44)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.pack_propagate(False)

        # Separador inferior del header (row propio)
        tk.Frame(self, bg=theme.BORDER, height=1).grid(
            row=0, column=0, sticky="sew"
        )

        # Título "Assistant"
        tk.Label(
            hdr,
            text="Assistant",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Variable", 10, "bold"),
        ).pack(side="left", padx=(14, 8))

        # Dot de estado
        self._status_dot = tk.Label(
            hdr,
            text="●",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 8),
        )
        self._status_dot.pack(side="left", padx=(0, 8))

        # Botón limpiar (derecha)
        tk.Button(
            hdr,
            text="↺",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.TEXT_PRIMARY,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 13),
            padx=6,
            command=self.clear_history,
        ).pack(side="right", padx=(0, 8), pady=8)

        # Selector de proveedor (derecha)
        self._provider_var = tk.StringVar()
        self._provider_combo = ttk.Combobox(
            hdr,
            textvariable=self._provider_var,
            state="readonly",
            width=13,
            font=("Segoe UI Variable", 9),
        )
        self._provider_combo.pack(side="right", padx=(0, 4), pady=9)
        self._provider_combo.bind("<<ComboboxSelected>>", self._on_provider_change)

    def _build_messages(self):
        msg_frame = tk.Frame(self, bg=theme.BG_PANEL)
        msg_frame.grid(row=1, column=0, sticky="nsew")
        msg_frame.rowconfigure(0, weight=1)
        msg_frame.columnconfigure(0, weight=1)

        self._canvas = tk.Canvas(
            msg_frame,
            bg=theme.BG_PANEL,
            highlightthickness=0,
            bd=0,
        )
        self._vsb = ttk.Scrollbar(
            msg_frame, orient="vertical", command=self._canvas.yview
        )
        self._canvas.configure(yscrollcommand=self._vsb.set)

        self._canvas.grid(row=0, column=0, sticky="nsew")
        self._vsb.grid(row=0, column=1, sticky="ns")

        self._msg_inner = tk.Frame(self._canvas, bg=theme.BG_PANEL)
        self._canvas_window = self._canvas.create_window(
            (0, 0), window=self._msg_inner, anchor="nw"
        )
        self._msg_inner.bind("<Configure>", self._on_inner_configure)
        self._canvas.bind("<Configure>", self._on_canvas_configure)
        self._canvas.bind("<MouseWheel>", self._on_mousewheel)
        self._msg_inner.bind("<MouseWheel>", self._on_mousewheel)

    def _build_context_bar(self):
        self._ctx_bar = tk.Frame(self, bg=theme.BG_CARD)
        self._ctx_bar.grid(row=2, column=0, sticky="ew")
        self._ctx_bar.grid_remove()

        # Icono clip
        tk.Label(
            self._ctx_bar,
            text="📎",
            bg=theme.BG_CARD,
            fg=theme.ACCENT,
            font=("Segoe UI Emoji", 9),
        ).pack(side="left", padx=(10, 4), pady=4)

        self._ctx_lbl = tk.Label(
            self._ctx_bar,
            text="",
            bg=theme.BG_CARD,
            fg=theme.TEXT_SECONDARY,
            font=theme.FONT_SMALL,
            anchor="w",
        )
        self._ctx_lbl.pack(side="left", fill="x", expand=True, pady=4)

        tk.Button(
            self._ctx_bar,
            text="✕",
            bg=theme.BG_CARD,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.ACCENT_RED,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 9),
            command=self._clear_context,
        ).pack(side="right", padx=8, pady=4)

    def _build_input(self):
        # Separador superior del área de input
        tk.Frame(self, bg=theme.BORDER, height=1).grid(
            row=3, column=0, sticky="ew"
        )

        inp_frame = tk.Frame(self, bg=theme.BG_SURFACE)
        inp_frame.grid(row=4, column=0, sticky="ew")
        inp_frame.columnconfigure(0, weight=1)

        # Wrapper del área de texto con borde sutil
        text_border = tk.Frame(inp_frame, bg=theme.BORDER)
        text_border.grid(row=0, column=0, sticky="ew", padx=(10, 4), pady=10)

        text_inner = tk.Frame(text_border, bg=theme.BG_INPUT)
        text_inner.pack(fill="both", expand=True, padx=1, pady=1)

        self._input = tk.Text(
            text_inner,
            height=2,
            wrap="word",
            bg=theme.BG_INPUT,
            fg=theme.TEXT_PRIMARY,
            insertbackground=theme.ACCENT,
            relief="flat",
            bd=0,
            padx=10,
            pady=8,
            font=theme.FONT_UI,
        )
        self._input.pack(fill="both", expand=True)
        self._input.bind("<Return>",       self._on_enter)
        self._input.bind("<Shift-Return>", lambda e: None)

        # Placeholder
        self._input.insert("1.0", "Ask about your files…")
        self._input.config(fg=theme.TEXT_MUTED)
        self._input.bind("<FocusIn>",  self._on_input_focus_in)
        self._input.bind("<FocusOut>", self._on_input_focus_out)
        self._placeholder_active = True

        # Fila de botones bajo el input
        btn_row = tk.Frame(inp_frame, bg=theme.BG_SURFACE)
        btn_row.grid(row=1, column=0, columnspan=2, sticky="ew",
                     padx=10, pady=(0, 8))

        self._btn_attach = tk.Button(
            btn_row,
            text="📎  Attach selection",
            bg=theme.BG_SURFACE,
            fg=theme.TEXT_MUTED,
            activebackground=theme.BG_HOVER,
            activeforeground=theme.TEXT_SECONDARY,
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 9),
            command=self._attach_selection,
        )
        self._btn_attach.pack(side="left")

        # Botón enviar (columna 1 del inp_frame)
        self._btn_send = tk.Button(
            inp_frame,
            text="↑",
            bg=theme.ACCENT,
            fg="white",
            activebackground=theme.ACCENT_DARK,
            activeforeground="white",
            relief="flat",
            bd=0,
            cursor="hand2",
            font=("Segoe UI Variable", 14, "bold"),
            width=3,
            height=1,
            command=self._send,
        )
        self._btn_send.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="ns")

    def _build_footer(self):
        self._footer = tk.Label(
            self,
            text="",
            bg=theme.BG_PANEL,
            fg=theme.TEXT_MUTED,
            font=("Segoe UI Variable", 8),
            anchor="w",
        )
        self._footer.grid(row=5, column=0, sticky="ew", padx=12, pady=(0, 4))

    # ── Providers ─────────────────────────────────────────────────────────────

    def _load_providers(self):
        from chatbot.providers.gemini  import GeminiProvider
        from chatbot.providers.claude  import ClaudeProvider
        from chatbot.providers.groq_p  import GroqProvider
        from chatbot.providers.ollama  import OllamaProvider

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

        default_idx = (
            PROVIDER_ORDER.index(config.DEFAULT_PROVIDER)
            if config.DEFAULT_PROVIDER in PROVIDER_ORDER
            else 0
        )
        self._provider_combo.current(default_idx)
        self._activate_provider(PROVIDER_ORDER[default_idx])

        if not self._suggestions_shown:
            self._show_suggestions()

    def _activate_provider(self, pid: str):
        p = self._providers.get(pid)
        if p is None:
            return
        self._provider = p
        ok, err = p.is_available()
        if ok:
            self._status_dot.config(fg=theme.ACCENT_GREEN)
            self._footer.config(
                text=f"  {p.info.name}  ·  {p.info.model}",
                fg=theme.TEXT_MUTED,
            )
        else:
            self._status_dot.config(fg=theme.ACCENT_RED)
            self._footer.config(
                text=f"  ⚠  {p.info.name} — {err[:60]}",
                fg=theme.ACCENT_RED,
            )

    def _on_provider_change(self, _event=None):
        idx = self._provider_combo.current()
        if 0 <= idx < len(self._provider_ids):
            self._activate_provider(self._provider_ids[idx])

    # ── Sugerencias rápidas ────────────────────────────────────────────────────

    def _show_suggestions(self):
        self._suggestions_shown = True

        tk.Label(
            self._msg_inner,
            text="How can I help?",
            bg=theme.BG_PANEL,
            fg=theme.TEXT_PRIMARY,
            font=("Segoe UI Variable", 11, "bold"),
        ).pack(pady=(20, 4), padx=14, anchor="w")

        tk.Label(
            self._msg_inner,
            text="Scan a folder then ask me anything about your files.",
            bg=theme.BG_PANEL,
            fg=theme.TEXT_MUTED,
            font=theme.FONT_SMALL,
            wraplength=240,
            justify="left",
        ).pack(padx=14, pady=(0, 12), anchor="w")

        for suggestion in QUICK_SUGGESTIONS:
            btn = tk.Button(
                self._msg_inner,
                text=suggestion,
                bg=theme.BG_CARD,
                fg=theme.TEXT_SECONDARY,
                activebackground=theme.BG_HOVER,
                activeforeground=theme.TEXT_PRIMARY,
                relief="flat",
                bd=0,
                cursor="hand2",
                font=("Segoe UI Variable", 9),
                anchor="w",
                padx=12,
                pady=7,
                wraplength=230,
                justify="left",
                command=lambda s=suggestion: self._use_suggestion(s),
            )
            # Borde sutil de 1 px arriba de cada chip
            wrap = tk.Frame(self._msg_inner, bg=theme.BORDER)
            wrap.pack(fill="x", padx=14, pady=2)
            btn_inner = tk.Frame(wrap, bg=theme.BG_CARD)
            btn_inner.pack(fill="x", padx=1, pady=1)
            btn.master = btn_inner
            btn = tk.Button(
                btn_inner,
                text=suggestion,
                bg=theme.BG_CARD,
                fg=theme.TEXT_SECONDARY,
                activebackground=theme.BG_HOVER,
                activeforeground=theme.TEXT_PRIMARY,
                relief="flat",
                bd=0,
                cursor="hand2",
                font=("Segoe UI Variable", 9),
                anchor="w",
                padx=12,
                pady=7,
                wraplength=230,
                justify="left",
                command=lambda s=suggestion: self._use_suggestion(s),
            )
            btn.pack(fill="x")

    def _use_suggestion(self, text: str):
        if self._placeholder_active:
            self._input.delete("1.0", "end")
            self._input.config(fg=theme.TEXT_PRIMARY)
            self._placeholder_active = False
        self._input.delete("1.0", "end")
        self._input.insert("1.0", text)
        self._input.focus_set()

    # ── Input helpers ──────────────────────────────────────────────────────────

    def _on_input_focus_in(self, _event=None):
        if self._placeholder_active:
            self._input.delete("1.0", "end")
            self._input.config(fg=theme.TEXT_PRIMARY)
            self._placeholder_active = False

    def _on_input_focus_out(self, _event=None):
        content = self._input.get("1.0", "end-1c").strip()
        if not content:
            self._input.insert("1.0", "Ask about your files…")
            self._input.config(fg=theme.TEXT_MUTED)
            self._placeholder_active = True

    # ── Contexto adjunto ───────────────────────────────────────────────────────

    def _attach_selection(self):
        path = self._get_sel()
        if path:
            self._attached_path = path
            short = path[-50:] if len(path) > 50 else path
            self._ctx_lbl.config(text=f"…{short}")
            self._ctx_bar.grid()
        else:
            self._add_system_msg("No file or folder is selected.")

    def _clear_context(self):
        self._attached_path = ""
        self._ctx_bar.grid_remove()

    # ── Envío de mensajes ──────────────────────────────────────────────────────

    def _on_enter(self, event):
        if not event.state & 0x1:
            self._send()
            return "break"

    def _send(self):
        if self._streaming:
            return
        if self._placeholder_active:
            return
        text = self._input.get("1.0", "end-1c").strip()
        if not text:
            return

        if self._provider is None:
            self._add_system_msg("Select an AI provider.")
            return

        ok, err = self._provider.is_available()
        if not ok:
            self._add_system_msg(f"⚠ Provider unavailable:\n{err}")
            return

        self._input.delete("1.0", "end")
        self._placeholder_active = False

        # Limpiar sugerencias en primer uso
        if self._suggestions_shown and len(self._history) == 0:
            for w in self._msg_inner.winfo_children():
                w.destroy()

        self._add_message("user", text)
        self._history.append({"role": "user", "content": text})

        selected = self._attached_path or self._get_sel()
        msgs = build_messages(
            self._history[:-1], text, self._get_scan(), selected
        )

        self._streaming = True
        self._btn_send.config(state="disabled")
        bot_widget = self._add_message("assistant", "")
        self._start_typing_indicator(bot_widget)

        threading.Thread(
            target=self._stream_response,
            args=(msgs, bot_widget),
            daemon=True,
        ).start()

    def _stream_response(self, msgs, bot_widget):
        full_text = []

        def on_chunk(chunk: str):
            full_text.append(chunk)
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
            self.after(
                0, lambda: self._set_widget_text(bot_widget, response, error=True)
            )

        self._history.append({"role": "assistant", "content": response})
        self.after(0, self._on_stream_done)

    def _on_stream_done(self):
        self._streaming = False
        self._stop_typing_indicator()
        self._btn_send.config(state="normal")
        self._scroll_to_bottom()

    # ── Indicador de escritura ─────────────────────────────────────────────────

    def _start_typing_indicator(self, widget: tk.Text):
        self._typing_idx = 0
        self._typing_widget = widget
        self._animate_typing()

    def _animate_typing(self):
        if not self._streaming:
            return
        widget = self._typing_widget
        content = widget.get("1.0", "end-1c")
        if not content.strip():
            frame = TYPING_FRAMES[self._typing_idx % len(TYPING_FRAMES)]
            widget.config(state="normal")
            widget.delete("1.0", "end")
            widget.insert("1.0", frame)
            widget.config(fg=theme.TEXT_MUTED, state="disabled")
            self._resize_bubble(widget)
        self._typing_idx += 1
        self._typing_job = self.after(400, self._animate_typing)

    def _stop_typing_indicator(self):
        if self._typing_job:
            self.after_cancel(self._typing_job)
            self._typing_job = None

    # ── Widgets de mensajes ────────────────────────────────────────────────────

    def _add_message(self, role: str, text: str) -> tk.Text:
        is_user = (role == "user")

        # Frame exterior — full width para anclar el mensaje a un lado
        outer = tk.Frame(self._msg_inner, bg=theme.BG_PANEL)
        outer.pack(fill="x", padx=0, pady=(4, 0))

        # Nombre del remitente
        name = "You" if is_user else (
            self._provider.info.name if self._provider else "AI"
        )
        name_color = theme.ACCENT if is_user else (
            PROVIDER_COLORS.get(
                self._provider_ids[self._provider_combo.current()]
                if self._provider_combo.current() >= 0 else "gemini",
                theme.TEXT_SECONDARY,
            ) if self._provider else theme.TEXT_SECONDARY
        )

        tk.Label(
            outer,
            text=name,
            bg=theme.BG_PANEL,
            fg=name_color,
            font=("Segoe UI Variable", 8, "bold"),
            anchor="e" if is_user else "w",
        ).pack(
            fill="x",
            padx=14,
            pady=(0, 2),
            anchor="e" if is_user else "w",
        )

        # Burbuja: el padding asimétrico empuja el globo al lado correcto
        bubble_bg  = USER_BG if is_user else BOT_BG
        bubble_fg  = USER_FG if is_user else BOT_FG
        padx_args  = (50, 10) if is_user else (10, 50)

        bubble = tk.Text(
            outer,
            wrap="word",
            relief="flat",
            bd=0,
            bg=bubble_bg,
            fg=bubble_fg,
            font=theme.FONT_UI,
            padx=12,
            pady=8,
            cursor="arrow",
            state="normal",
            height=1,
            selectbackground=theme.ACCENT,
        )
        bubble.pack(fill="x", padx=padx_args, pady=(0, 4))

        if text:
            self._render_text(bubble, text, is_user)
            bubble.config(state="disabled")
            self._resize_bubble(bubble)

        bubble.bind("<MouseWheel>", self._on_mousewheel)
        self._scroll_to_bottom()
        return bubble

    def _render_text(self, widget: tk.Text, text: str, is_user: bool):
        """Renderiza texto con soporte básico de bloques de código."""
        widget.tag_configure(
            "code_block",
            background=CODE_BG,
            foreground=CODE_FG,
            font=theme.FONT_MONO,
            relief="flat",
            lmargin1=6,
            lmargin2=6,
            rmargin=6,
            spacing1=4,
            spacing3=4,
        )
        widget.tag_configure(
            "inline_code",
            background=CODE_BG,
            foreground=CODE_FG,
            font=theme.FONT_MONO,
        )
        widget.tag_configure("bold", font=theme.FONT_UI_BOLD)

        parts = text.split("```")
        for i, part in enumerate(parts):
            if i % 2 == 1:
                lines = part.split("\n")
                if lines and lines[0].strip() and not lines[0].strip().startswith(" "):
                    part = "\n".join(lines[1:])
                widget.insert("end", part.strip(), "code_block")
                widget.insert("end", "\n")
            else:
                self._render_normal(widget, part)

    def _render_normal(self, widget: tk.Text, text: str):
        import re
        parts = re.split(r'(\*\*[^*]+\*\*)', text)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                widget.insert("end", part[2:-2], "bold")
            else:
                widget.insert("end", part)

    def _append_to_widget(self, widget: tk.Text, chunk: str):
        widget.config(state="normal", fg=BOT_FG)
        content = widget.get("1.0", "end-1c")
        if content in TYPING_FRAMES:
            widget.delete("1.0", "end")
        widget.insert("end", chunk)
        self._resize_bubble(widget)
        widget.config(state="disabled")
        self._scroll_to_bottom()

    def _set_widget_text(self, widget: tk.Text, text: str, error: bool = False):
        widget.config(state="normal")
        widget.delete("1.0", "end")
        if error:
            widget.insert("end", text)
            widget.config(bg=ERROR_BG, fg=ERROR_FG)
        else:
            self._render_text(widget, text, is_user=False)
        self._resize_bubble(widget)
        widget.config(state="disabled")
        self._scroll_to_bottom()

    def _resize_bubble(self, widget: tk.Text):
        widget.update_idletasks()
        lines = int(widget.index("end-1c").split(".")[0])
        widget.config(height=max(lines, 1))

    def _add_system_msg(self, text: str):
        lbl = tk.Label(
            self._msg_inner,
            text=text,
            bg=theme.BG_PANEL,
            fg=SYSTEM_FG,
            font=theme.FONT_SMALL,
            wraplength=260,
            justify="center",
        )
        lbl.pack(fill="x", padx=16, pady=6)
        self._scroll_to_bottom()

    # ── Scroll ─────────────────────────────────────────────────────────────────

    def _scroll_to_bottom(self):
        self._canvas.update_idletasks()
        self._canvas.yview_moveto(1.0)

    def _on_inner_configure(self, _event):
        self._canvas.configure(scrollregion=self._canvas.bbox("all"))

    def _on_canvas_configure(self, event):
        self._canvas.itemconfig(self._canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        self._canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    # ── API pública ────────────────────────────────────────────────────────────

    def clear_history(self):
        self._history.clear()
        self._suggestions_shown = False
        for widget in self._msg_inner.winfo_children():
            widget.destroy()
        self._show_suggestions()

    def notify_scan_complete(self, scan_result):
        n = len(scan_result.files) if scan_result else 0
        if n > 0:
            self._add_system_msg(
                f"✓ Scan complete — {n:,} files indexed.\n"
                "You can now ask questions about them."
            )

    def reload_providers(self):
        """Recarga los providers tras guardar nueva configuración."""
        from chatbot import config as cfg
        import importlib
        importlib.reload(cfg)
        self._load_providers()
        self._add_system_msg("✓ Configuration updated.")
