"""
Launcher de la versión moderna (Vite + FastAPI + pywebview).

Uso:
    python run_modern.py           # modo auto: dev si no hay dist/, prod si lo hay
    python run_modern.py --dev     # fuerza modo desarrollo (Vite dev-server)
    python run_modern.py --prod    # fuerza modo producción (dist compilado)
    python run_modern.py --build   # compila el frontend antes de iniciar
"""

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time

# ── Rutas ─────────────────────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, "frontend")
DIST_INDEX   = os.path.join(FRONTEND_DIR, "dist", "index.html")

VITE_PORT    = 5173
API_PORT     = 8000
VITE_TIMEOUT = 20   # segundos máximos esperando que Vite levante
API_TIMEOUT  = 5    # segundos máximos esperando que FastAPI levante

# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_dep(name: str) -> bool:
    """Devuelve True si el ejecutable está en PATH."""
    return shutil.which(name) is not None


def _npm_cmd() -> list[str]:
    """Devuelve ['npm.cmd'] en Windows o ['npm'] en Unix."""
    return ["npm.cmd"] if sys.platform == "win32" else ["npm"]


def _wait_port(port: int, timeout: float) -> bool:
    """Espera hasta que algo escuche en el puerto (prueba IPv4 e IPv6). Devuelve True si lo consigue."""
    import socket
    hosts = ["127.0.0.1", "::1", "localhost"]
    deadline = time.time() + timeout
    while time.time() < deadline:
        for host in hosts:
            try:
                with socket.create_connection((host, port), timeout=0.5):
                    return True
            except OSError:
                pass
        time.sleep(0.25)
    return False


def _kill(*procs):
    """Termina todos los procesos pasados (ignora si ya terminaron)."""
    for p in procs:
        if p and p.poll() is None:
            try:
                p.terminate()
            except OSError:
                pass
    # Esperar un poco y forzar kill si siguen vivos
    time.sleep(1)
    for p in procs:
        if p and p.poll() is None:
            try:
                p.kill()
            except OSError:
                pass


def _free_port(port: int) -> None:
    """Si el puerto está ocupado en Windows, mata el proceso que lo usa (sin shell=True)."""
    if sys.platform != "win32":
        return
    try:
        # Usar netstat sin shell: args como lista, nunca interpolación de strings
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=5,
        )
        pids = set()
        target = f":{port} "
        for line in result.stdout.splitlines():
            if target in line and "LISTENING" in line:
                parts = line.split()
                if parts and parts[-1].isdigit():
                    pids.add(int(parts[-1]))
        for pid in pids:
            # taskkill con args como lista — sin shell=True
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/F"],
                capture_output=True, timeout=5,
            )
            print(f"  ⚠  Puerto {port} ocupado — proceso {pid} terminado.")
        if pids:
            time.sleep(0.5)
    except Exception:
        pass


# ── Build del frontend ────────────────────────────────────────────────────────

def build_frontend():
    print("▶  Instalando dependencias npm…")
    r = subprocess.run(
        _npm_cmd() + ["install"],
        cwd=FRONTEND_DIR,
    )
    if r.returncode != 0:
        print("✗  npm install falló.", file=sys.stderr)
        sys.exit(r.returncode)

    print("▶  Compilando frontend (npm run build)…")
    r = subprocess.run(
        _npm_cmd() + ["run", "build"],
        cwd=FRONTEND_DIR,
    )
    if r.returncode != 0:
        print("✗  npm run build falló.", file=sys.stderr)
        sys.exit(r.returncode)

    print("✓  Frontend compilado.\n")


# ── Modo desarrollo ───────────────────────────────────────────────────────────

def run_dev():
    print("─" * 60)
    print("  Modo: DESARROLLO  (Vite dev-server + FastAPI)")
    print(f"  Frontend : http://localhost:{VITE_PORT}")
    print(f"  API      : http://localhost:{API_PORT}")
    print("─" * 60)

    # Verificar deps
    if not _check_dep("npm") and not _check_dep("npm.cmd"):
        print("✗  npm no encontrado. Instala Node.js y añádelo al PATH.", file=sys.stderr)
        sys.exit(1)

    # Liberar puertos si están ocupados
    _free_port(API_PORT)
    _free_port(VITE_PORT)

    vite = web = None
    try:
        # 1. Vite dev server
        print("\n▶  Iniciando Vite Dev Server…")
        vite = subprocess.Popen(
            _npm_cmd() + ["run", "dev"],
            cwd=FRONTEND_DIR,
        )

        print(f"   Esperando que Vite levante en el puerto {VITE_PORT}…", end="", flush=True)
        if not _wait_port(VITE_PORT, VITE_TIMEOUT):
            print(f"\n✗  Vite no respondió en {VITE_TIMEOUT}s.", file=sys.stderr)
            _kill(vite)
            sys.exit(1)
        print(" ✓")

        # 2. app_web.py (FastAPI + pywebview)
        print("▶  Iniciando aplicación de escritorio (app_web.py)…")
        web = subprocess.Popen(
            [sys.executable, "app_web.py"],
            cwd=ROOT,
        )

        print(f"   Esperando que FastAPI levante en el puerto {API_PORT}…", end="", flush=True)
        if not _wait_port(API_PORT, API_TIMEOUT):
            # No es fatal; pywebview ya mostrará error interno
            print(" (aviso: API aún no responde, continuando)")
        else:
            print(" ✓")

        print("\n✓  Aplicación iniciada. Cierra la ventana para salir.\n")
        web.wait()

    except KeyboardInterrupt:
        print("\n  Interrupción recibida, cerrando…")
    finally:
        _kill(vite, web)
        print("  Procesos terminados.")


# ── Modo producción ───────────────────────────────────────────────────────────

def run_prod():
    print("─" * 60)
    print("  Modo: PRODUCCIÓN  (dist compilado + FastAPI)")
    print(f"  API : http://localhost:{API_PORT}")
    print("─" * 60)

    if not os.path.isfile(DIST_INDEX):
        print("✗  No existe el build de producción.")
        print("   Ejecuta: python run_modern.py --build", file=sys.stderr)
        sys.exit(1)

    _free_port(API_PORT)

    web = None
    try:
        print("\n▶  Iniciando aplicación de escritorio (app_web.py)…")
        web = subprocess.Popen(
            [sys.executable, "app_web.py"],
            cwd=ROOT,
        )

        print(f"   Esperando que FastAPI levante en el puerto {API_PORT}…", end="", flush=True)
        if not _wait_port(API_PORT, API_TIMEOUT):
            print(" (aviso: API aún no responde)")
        else:
            print(" ✓")

        print("\n✓  Aplicación iniciada. Cierra la ventana para salir.\n")
        web.wait()

    except KeyboardInterrupt:
        print("\n  Interrupción recibida, cerrando…")
    finally:
        _kill(web)
        print("  Proceso terminado.")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Launcher de Disk Analyzer (UI moderna)"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dev",   action="store_true", help="Fuerza modo desarrollo")
    group.add_argument("--prod",  action="store_true", help="Fuerza modo producción")
    group.add_argument("--build", action="store_true", help="Compila el frontend y arranca en modo producción")
    args = parser.parse_args()

    if args.build:
        build_frontend()
        run_prod()
    elif args.dev:
        run_dev()
    elif args.prod:
        run_prod()
    else:
        # Auto: usa producción si ya existe el dist, dev en caso contrario
        if os.path.isfile(DIST_INDEX):
            run_prod()
        else:
            run_dev()


if __name__ == "__main__":
    # Asegurar que Ctrl+C en Windows también envíe SIGINT
    if sys.platform == "win32":
        signal.signal(signal.SIGINT, signal.SIG_DFL)
    main()
