import uvicorn
import webview
import threading
import sys
import os
import socket
import time


def _ensure_admin():
    """Re-lanza el proceso con permisos de administrador si no los tiene."""
    if sys.platform != "win32":
        return
    import ctypes
    if ctypes.windll.shell32.IsUserAnAdmin():
        return  # ya es admin
    # Usar pythonw.exe para relanzar sin ventana de consola
    exe = sys.executable
    if exe.lower().endswith("python.exe"):
        exe = exe[:-10] + "pythonw.exe"
    params = " ".join(f'"{a}"' for a in sys.argv)
    ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", exe, params, None, 1)
    if ret > 32:
        sys.exit(0)   # proceso padre cierra; el hijo elevado continúa


_ensure_admin()

from api import app


def _wait_port(port: int, timeout: float = 10.0) -> bool:
    """Espera hasta que el servidor escuche en el puerto."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        for host in ("127.0.0.1", "::1"):
            try:
                with socket.create_connection((host, port), timeout=0.3):
                    return True
            except OSError:
                pass
        time.sleep(0.1)
    return False


def start_server():
    import logging
    # Silenciar todo output de uvicorn/fastapi a la consola
    logging.getLogger("uvicorn").handlers.clear()
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.error").handlers.clear()
    logging.getLogger("uvicorn").propagate = False
    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("uvicorn.error").propagate = False
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="critical", access_log=False)


if __name__ == '__main__':
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Esperar activamente a que el servidor esté listo (máximo 10s)
    if not _wait_port(8000, timeout=10.0):
        print("ERROR: FastAPI no arrancó en 10 segundos", file=sys.stderr)
        sys.exit(1)

    prod_path = os.path.join(os.path.dirname(__file__), "frontend", "dist", "index.html")
    # Siempre cargar por HTTP para evitar caché de file:// en pywebview
    url = "http://127.0.0.1:8000" if os.path.exists(prod_path) else "http://localhost:5173"

    window = webview.create_window(
        'Disk Analyzer (Modern GUI)',
        url,
        width=1200,
        height=800,
        min_size=(800, 600)
    )

    webview.start(debug=True)
    sys.exit(0)
