#!/usr/bin/env python3
"""
Disk Analyzer GUI — punto de entrada.
Uso: python main.py
"""

import sys
import os
import tkinter as tk

# Permitir importar módulos del proyecto sin instalar
sys.path.insert(0, os.path.dirname(__file__))

from app import App

MIN_W, MIN_H = 900, 600
DEF_W, DEF_H = 1200, 720


def main():
    root = tk.Tk()
    root.title("Disk Analyzer")
    root.minsize(MIN_W, MIN_H)

    # Centrar en pantalla
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()
    x = (sw - DEF_W) // 2
    y = (sh - DEF_H) // 2
    root.geometry(f"{DEF_W}x{DEF_H}+{x}+{y}")

    # Icono (si existe)
    icon_path = os.path.join(os.path.dirname(__file__), "icon.ico")
    if os.path.isfile(icon_path):
        try:
            root.iconbitmap(icon_path)
        except tk.TclError:
            pass

    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
