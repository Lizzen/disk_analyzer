"""
Diálogo de configuración de proveedores de IA.
Permite introducir API keys, seleccionar modelo y proveedor por defecto.
Los cambios se persisten en disco.
"""

from __future__ import annotations
import threading
import tkinter as tk
from tkinter import ttk

import ui.theme as theme
from chatbot import config


PROVIDER_ORDER = ["gemini", "groq", "claude", "ollama"]

_PROVIDER_INFO = {
    "gemini": {
        "label":        "Google Gemini",
        "key_name":     "GEMINI_API_KEY",
        "key_lbl":      "Gemini API Key",
        "model_key":    "GEMINI_MODEL",
        "hint":         "Gratis: 1 500 req/día  •  aistudio.google.com/app/apikey",
        "color":        "#4285f4",
        "requires_key": True,
        "models": [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest",
        ],
    },
    "groq": {
        "label":        "Groq",
        "key_name":     "GROQ_API_KEY",
        "key_lbl":      "Groq API Key",
        "model_key":    "GROQ_MODEL",
        "hint":         "Gratis: 14 400 req/día  •  console.groq.com/keys",
        "color":        "#f55036",
        "requires_key": True,
        "models": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
        ],
    },
    "claude": {
        "label":        "Claude (Anthropic)",
        "key_name":     "ANTHROPIC_API_KEY",
        "key_lbl":      "Anthropic API Key",
        "model_key":    "CLAUDE_MODEL",
        "hint":         "Trial gratuito  •  console.anthropic.com/account/keys",
        "color":        "#d4a017",
        "requires_key": True,
        "models": [
            "claude-haiku-4-5-20251001",
            "claude-sonnet-4-6",
            "claude-opus-4-6",
        ],
    },
    "ollama": {
        "label":        "Ollama (Local)",
        "key_name":     None,
        "key_lbl":      None,
        "model_key":    "OLLAMA_MODEL",
        "hint":         "Sin internet · Sin API key  •  ollama.com/download",
        "color":        "#4ecdc4",
        "requires_key": False,
        "models": [],   # se carga dinámicamente
    },
}


class APISettingsDialog(tk.Toplevel):
    """Diálogo modal para configurar API keys, modelos y proveedor por defecto."""

    def __init__(self, parent, on_save=None):
        super().__init__(parent)
        self._on_save = on_save
        self._key_entries:   dict[str, tk.StringVar] = {}
        self._model_vars:    dict[str, tk.StringVar] = {}
        self._model_combos:  dict[str, ttk.Combobox] = {}
        self._status_labels: dict[str, tk.Label] = {}

        self.title("Configuración de IA")
        self.configure(bg=theme.BG_DARK)
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        self._build()
        self._load_current()
        self._center(parent)

    # ── construcción ──────────────────────────────────────────────────────────

    def _build(self):
        # Encabezado
        hdr = tk.Frame(self, bg=theme.BG_SURFACE)
        hdr.pack(fill="x")
        tk.Label(
            hdr, text="  ⚙   Configuración de proveedores de IA",
            bg=theme.BG_SURFACE, fg=theme.TEXT_PRIMARY,
            font=("Segoe UI", 11, "bold"), anchor="w", pady=12, padx=14,
        ).pack(fill="x")

        body = tk.Frame(self, bg=theme.BG_DARK)
        body.pack(fill="both", expand=True, padx=16, pady=10)

        # Proveedor por defecto
        def_frame = tk.Frame(body, bg=theme.BG_PANEL, pady=8, padx=12)
        def_frame.pack(fill="x", pady=(0, 10))
        tk.Label(
            def_frame, text="Proveedor por defecto:",
            bg=theme.BG_PANEL, fg=theme.TEXT_SECONDARY, font=theme.FONT_UI,
        ).grid(row=0, column=0, sticky="w", pady=4)
        self._default_var = tk.StringVar()
        ttk.Combobox(
            def_frame, textvariable=self._default_var,
            values=[_PROVIDER_INFO[p]["label"] for p in PROVIDER_ORDER],
            state="readonly", width=22,
        ).grid(row=0, column=1, sticky="w", padx=(10, 0), pady=4)

        # Tarjeta por proveedor
        for pid in PROVIDER_ORDER:
            self._build_card(body, pid)

        # Botones
        btn_frame = tk.Frame(self, bg=theme.BG_DARK)
        btn_frame.pack(fill="x", padx=16, pady=(0, 12))
        ttk.Button(btn_frame, text="Cancelar", command=self.destroy).pack(side="right", padx=(6, 0))
        ttk.Button(btn_frame, text="Guardar", style="Accent.TButton",
                   command=self._save).pack(side="right")
        ttk.Button(btn_frame, text="Verificar conexión",
                   command=self._verify_all).pack(side="left")

    def _build_card(self, parent, pid: str):
        info = _PROVIDER_INFO[pid]

        card = tk.Frame(parent, bg=theme.BG_PANEL, pady=8, padx=12)
        card.pack(fill="x", pady=(0, 6))
        card.columnconfigure(1, weight=1)

        # Nombre + dot + status
        tk.Label(card, text="●", bg=theme.BG_PANEL,
                 fg=info["color"], font=("Segoe UI", 12),
                 ).grid(row=0, column=0, sticky="w", padx=(0, 6))
        tk.Label(card, text=info["label"], bg=theme.BG_PANEL,
                 fg=theme.TEXT_PRIMARY, font=theme.FONT_UI_BOLD,
                 ).grid(row=0, column=1, sticky="w")
        status_lbl = tk.Label(card, text="", bg=theme.BG_PANEL,
                               fg=theme.TEXT_MUTED, font=theme.FONT_SMALL)
        status_lbl.grid(row=0, column=2, sticky="e", padx=(8, 0))
        self._status_labels[pid] = status_lbl

        row = 1

        # API Key (si requiere)
        if info["requires_key"]:
            tk.Label(card, text=info["key_lbl"] + ":",
                     bg=theme.BG_PANEL, fg=theme.TEXT_SECONDARY, font=theme.FONT_SMALL,
                     ).grid(row=row, column=0, columnspan=3, sticky="w", pady=(6, 2))
            row += 1

            var = tk.StringVar()
            self._key_entries[info["key_name"]] = var

            ef = tk.Frame(card, bg=theme.BG_PANEL)
            ef.grid(row=row, column=0, columnspan=3, sticky="ew", pady=(0, 4))
            ef.columnconfigure(0, weight=1)
            row += 1

            entry = tk.Entry(ef, textvariable=var, show="•", width=48,
                             bg=theme.BG_INPUT, fg=theme.TEXT_PRIMARY,
                             insertbackground=theme.TEXT_PRIMARY,
                             relief="flat", font=theme.FONT_MONO)
            entry.grid(row=0, column=0, sticky="ew", ipady=5)

            eye_var = tk.BooleanVar(value=False)
            btn_eye = tk.Button(ef, text="👁", bg=theme.BG_INPUT, fg=theme.TEXT_MUTED,
                                relief="flat", bd=0, cursor="hand2",
                                font=("Segoe UI Emoji", 10))

            def _toggle(e=entry, v=eye_var, b=btn_eye):
                v.set(not v.get())
                e.config(show="" if v.get() else "•")
                b.config(text="🙈" if v.get() else "👁")

            btn_eye.config(command=_toggle)
            btn_eye.grid(row=0, column=1, padx=(4, 0))

            tk.Label(card, text=info["hint"], bg=theme.BG_PANEL,
                     fg=theme.TEXT_MUTED, font=theme.FONT_SMALL,
                     ).grid(row=row, column=0, columnspan=3, sticky="w")
            row += 1

        # Selector de modelo
        tk.Label(card, text="Modelo:", bg=theme.BG_PANEL,
                 fg=theme.TEXT_SECONDARY, font=theme.FONT_SMALL,
                 ).grid(row=row, column=0, sticky="w", pady=(8, 2))

        model_var = tk.StringVar()
        self._model_vars[pid] = model_var

        models = list(info["models"])  # copia; ollama se rellena dinámicamente
        combo = ttk.Combobox(card, textvariable=model_var,
                             values=models, width=38)
        combo.grid(row=row, column=1, columnspan=2, sticky="ew",
                   padx=(8, 0), pady=(8, 2))
        self._model_combos[pid] = combo

        # Botón recargar modelos (Groq, Gemini, Ollama)
        if pid in ("groq", "gemini", "ollama"):
            tk.Button(
                card, text="↺", bg=theme.BG_PANEL, fg=theme.TEXT_SECONDARY,
                relief="flat", bd=0, cursor="hand2", font=("Segoe UI", 11),
                command=lambda p=pid: self._fetch_models(p),
            ).grid(row=row, column=2, sticky="e")

    # ── carga / guardado ──────────────────────────────────────────────────────

    def _load_current(self):
        cfg = config.get_config()

        for key_name, var in self._key_entries.items():
            var.set(cfg.get(key_name, ""))

        for pid in PROVIDER_ORDER:
            info = _PROVIDER_INFO[pid]
            saved_model = cfg.get(info["model_key"], "")
            self._model_vars[pid].set(saved_model)

        default_pid = cfg.get("DEFAULT_PROVIDER", "gemini")
        self._default_var.set(
            _PROVIDER_INFO.get(default_pid, _PROVIDER_INFO["gemini"])["label"]
        )

    def _save(self):
        keys = {k: v.get().strip() for k, v in self._key_entries.items()}

        selected_label = self._default_var.get()
        default_pid = "gemini"
        for pid in PROVIDER_ORDER:
            if _PROVIDER_INFO[pid]["label"] == selected_label:
                default_pid = pid
                break

        config.set_keys(
            keys,
            default_provider=default_pid,
            gemini_model=self._model_vars["gemini"].get().strip(),
            groq_model=self._model_vars["groq"].get().strip(),
            claude_model=self._model_vars["claude"].get().strip(),
            ollama_model=self._model_vars["ollama"].get().strip() or "llama3.2",
        )

        if self._on_save:
            self._on_save()
        self.destroy()

    # ── carga dinámica de modelos ─────────────────────────────────────────────

    def _fetch_models(self, pid: str):
        """Carga la lista de modelos disponibles desde la API en segundo plano."""
        combo = self._model_combos[pid]
        combo.config(state="disabled")
        self._status_labels[pid].config(text="cargando modelos…", fg=theme.TEXT_MUTED)

        def _run():
            models = []
            try:
                if pid == "gemini":
                    models = self._fetch_gemini_models()
                elif pid == "groq":
                    models = self._fetch_groq_models()
                elif pid == "ollama":
                    models = self._fetch_ollama_models()
            except Exception as e:
                self.after(0, lambda: self._status_labels[pid].config(
                    text=f"✗ {str(e)[:40]}", fg=theme.ACCENT))
                self.after(0, lambda: combo.config(state="normal"))
                return

            def _update():
                if models:
                    combo["values"] = models
                    if self._model_vars[pid].get() not in models:
                        combo.current(0)
                    combo.config(state="normal")
                    self._status_labels[pid].config(
                        text=f"✓ {len(models)} modelos", fg=theme.ACCENT_GREEN)
                else:
                    combo.config(state="normal")
                    self._status_labels[pid].config(text="Sin modelos", fg=theme.ACCENT)

            self.after(0, _update)

        threading.Thread(target=_run, daemon=True).start()

    def _fetch_gemini_models(self) -> list[str]:
        from google import genai
        key = self._key_entries.get("GEMINI_API_KEY")
        api_key = key.get().strip() if key else config.get_key("GEMINI_API_KEY")
        if not api_key:
            return list(_PROVIDER_INFO["gemini"]["models"])
        client = genai.Client(api_key=api_key)
        models = []
        for m in client.models.list():
            name = m.name.removeprefix("models/")
            if "generateContent" in (m.supported_actions or []):
                models.append(name)
        return models or list(_PROVIDER_INFO["gemini"]["models"])

    def _fetch_groq_models(self) -> list[str]:
        from groq import Groq
        key = self._key_entries.get("GROQ_API_KEY")
        api_key = key.get().strip() if key else config.get_key("GROQ_API_KEY")
        if not api_key:
            return list(_PROVIDER_INFO["groq"]["models"])
        client = Groq(api_key=api_key)
        resp = client.models.list()
        return sorted(m.id for m in resp.data)

    def _fetch_ollama_models(self) -> list[str]:
        import ollama
        resp = ollama.list()
        return [m.model for m in resp.models] or ["llama3.2"]

    # ── verificación ──────────────────────────────────────────────────────────

    def _verify_all(self):
        for lbl in self._status_labels.values():
            lbl.config(text="verificando…", fg=theme.TEXT_MUTED)

        def _run():
            temp_keys = {k: v.get().strip() for k, v in self._key_entries.items()}
            config.set_keys(temp_keys)
            statuses = config.all_providers_status()
            self.after(0, lambda: self._show_statuses(statuses))

        threading.Thread(target=_run, daemon=True).start()

    def _show_statuses(self, statuses: dict):
        for pid, (ok, msg) in statuses.items():
            lbl = self._status_labels.get(pid)
            if lbl is None:
                continue
            if ok:
                lbl.config(text="✓ Disponible", fg=theme.ACCENT_GREEN)
            else:
                lbl.config(text=f"✗ {msg.split(chr(10))[0][:38]}", fg=theme.ACCENT)

    # ── centrado ──────────────────────────────────────────────────────────────

    def _center(self, parent):
        self.update_idletasks()
        w = self.winfo_width()
        h = self.winfo_height()
        px = parent.winfo_rootx() + parent.winfo_width() // 2 - w // 2
        py = parent.winfo_rooty() + parent.winfo_height() // 2 - h // 2
        self.geometry(f"+{max(px, 0)}+{max(py, 0)}")
        self.wait_window()
