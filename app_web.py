import uvicorn
import webview
import threading
import sys
import os
import socket
import time

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
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")


if __name__ == '__main__':
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Esperar activamente a que el servidor esté listo (máximo 10s)
    if not _wait_port(8000, timeout=10.0):
        print("ERROR: FastAPI no arrancó en 10 segundos", file=sys.stderr)
        sys.exit(1)

    dev_url   = "http://localhost:5173"
    prod_path = os.path.join(os.path.dirname(__file__), "frontend", "dist", "index.html")
    url = dev_url if not os.path.exists(prod_path) else prod_path

    window = webview.create_window(
        'Disk Analyzer (Modern GUI)',
        url,
        width=1200,
        height=800,
        min_size=(800, 600)
    )

    webview.start(debug=True)
    sys.exit(0)
