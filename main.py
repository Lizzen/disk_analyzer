#!/usr/bin/env python3
"""
Disk Analyzer GUI — punto de entrada.
Uso: python main.py
"""

import sys
import os
import tkinter as tk

# ── DPI Awareness (Windows) ───────────────────────────────────────────────────
# Debe llamarse ANTES de crear cualquier ventana Tk.
if sys.platform == "win32":
    try:
        from ctypes import windll
        # PROCESS_PER_MONITOR_DPI_AWARE = 2  → escala nativa por monitor
        windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            windll.user32.SetProcessDPIAware()
        except Exception:
            pass

# Permitir importar módulos del proyecto sin instalar
sys.path.insert(0, os.path.dirname(__file__))

from app import App

MIN_W, MIN_H = 1000, 650


def _dpi_scale(root: tk.Tk) -> float:
    """Devuelve el factor de escala DPI actual (1.0 = 96 DPI)."""
    try:
        dpi = root.winfo_fpixels("1i")     # píxeles por pulgada real
        return max(dpi / 96.0, 1.0)
    except Exception:
        return 1.0


def main():
    root = tk.Tk()
    root.withdraw()   # ocultar mientras se configura

    # Ajustar scaling de Tk al DPI real del sistema
    scale = _dpi_scale(root)
    # Solo corregir si tk no lo detectó bien (suele reportar 1.33 en pantallas 96dpi)
    # Forzamos escala basada en DPI real para que los widgets se vean nítidos
    root.tk.call("tk", "scaling", scale)

    # Tamaño de ventana proporcional a la pantalla
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()

    # 85% del ancho y 88% del alto, con máximos razonables
    w = min(int(sw * 0.85), 1440)
    h = min(int(sh * 0.88), 860)
    w = max(w, MIN_W)
    h = max(h, MIN_H)

    x = (sw - w) // 2
    y = max((sh - h) // 2 - 20, 0)   # ligeramente arriba del centro

    root.geometry(f"{w}x{h}+{x}+{y}")
    root.minsize(MIN_W, MIN_H)
    root.title("Disk Analyzer")

    # Icono (si existe)
    icon_path = os.path.join(os.path.dirname(__file__), "icon.ico")
    if os.path.isfile(icon_path):
        try:
            root.iconbitmap(icon_path)
        except tk.TclError:
            pass

    root.deiconify()   # mostrar ventana
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
