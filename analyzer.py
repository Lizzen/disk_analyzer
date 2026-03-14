#!/usr/bin/env python3
"""
Analizador de disco - Windows
Escanea C:\\ completo y muestra qué ocupa más espacio.
Uso: python analyzer.py [--min-mb N] [--top N] [--raiz RUTA]
"""

import os
import sys
import shutil
import argparse
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from collections import defaultdict

# ──────────────────────────────────────────────
#  ARGUMENTOS
# ──────────────────────────────────────────────

parser = argparse.ArgumentParser(description="Analizador de disco para Windows")
parser.add_argument("--raiz",   default="C:\\",  help="Ruta raíz a escanear (default: C:\\)")
parser.add_argument("--min-mb", type=int, default=20, help="Tamaño mínimo en MB para listar archivos grandes (default: 20)")
parser.add_argument("--top",    type=int, default=30, help="Cuántas carpetas/archivos mostrar en top (default: 30)")
parser.add_argument("--hilos",  type=int, default=16, help="Número de hilos (default: 16)")
ARGS = parser.parse_args()

RAIZ        = ARGS.raiz
MAX_HILOS   = ARGS.hilos
MIN_BYTES   = ARGS.min_mb * 1024 * 1024
TOP_N       = ARGS.top

# ──────────────────────────────────────────────
#  CONFIGURACIÓN
# ──────────────────────────────────────────────

# Carpetas del sistema que no se tocan
IGNORAR_CARPETAS = {
    "Windows", "System Volume Information", "$Recycle.Bin",
    "Recovery", "PerfLogs", "MSOCache", "WpSystem",
}

# Extensiones por categoría
CATEGORIAS_EXT = {
    "Temporales/Cache": {
        ".tmp", ".temp", ".cache", ".log", ".dmp", ".bak",
        ".old", ".chk", ".gid", ".thumbs", ".etl",
    },
    "Videos": {
        ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv",
        ".m4v", ".webm", ".mpg", ".mpeg", ".ts", ".vob", ".3gp",
    },
    "Imagenes": {
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff",
        ".raw", ".heic", ".webp", ".psd", ".ai", ".cr2", ".nef",
    },
    "Audio": {
        ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a", ".opus",
    },
    "Instaladores/ISO": {
        ".iso", ".img", ".exe", ".msi", ".zip", ".rar",
        ".7z", ".tar", ".gz", ".cab", ".apk", ".xz", ".zst",
    },
    "Documentos": {
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx",
        ".ppt", ".odt", ".txt", ".csv", ".epub",
    },
    "Desarrollo (compilados)": {
        ".pyo", ".pyc", ".class", ".o", ".obj", ".pdb",
        ".ilk", ".suo", ".user", ".ncb", ".idb",
    },
    "Bases de datos": {
        ".db", ".sqlite", ".sqlite3", ".mdf", ".ldf", ".accdb",
    },
}

# Rutas de caché/basura segura de borrar (por usuario)
def rutas_basura(usuario):
    base = f"C:\\Users\\{usuario}"
    return [
        (f"C:\\Windows\\Temp",                                              "Temp del sistema"),
        (f"C:\\Windows\\SoftwareDistribution\\Download",                    "Windows Update cache"),
        (f"{base}\\AppData\\Local\\Temp",                                   "Temp del usuario"),
        (f"{base}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache", "Cache Chrome"),
        (f"{base}\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache","Cache Edge"),
        (f"{base}\\AppData\\Local\\Mozilla\\Firefox\\Profiles",             "Cache Firefox"),
        (f"{base}\\AppData\\Roaming\\npm-cache",                            "Cache npm"),
        (f"{base}\\AppData\\Local\\pip\\cache",                             "Cache pip"),
        (f"{base}\\AppData\\Local\\Yarn\\Cache",                            "Cache Yarn"),
        (f"{base}\\AppData\\Local\\NuGet\\Cache",                           "Cache NuGet"),
        (f"{base}\\.gradle\\caches",                                        "Cache Gradle"),
        (f"{base}\\.m2\\repository",                                        "Repo Maven"),
        (f"{base}\\.nuget\\packages",                                       "Paquetes NuGet"),
        (f"{base}\\Downloads",                                              "Descargas"),
    ]

# Carpetas de proyectos donde buscar node_modules / __pycache__
def rutas_proyectos(usuario):
    base = f"C:\\Users\\{usuario}"
    return [
        f"{base}\\Desktop",
        f"{base}\\Documents",
        f"{base}\\Projects",
        f"{base}\\dev",
        f"{base}\\repos",
        f"{base}\\code",
        f"{base}\\src",
    ]

# ──────────────────────────────────────────────
#  UTILIDADES
# ──────────────────────────────────────────────

LOCK = Lock()

def tam(b):
    for u in ("B", "KB", "MB", "GB", "TB"):
        if abs(b) < 1024:
            return f"{b:,.1f} {u}"
        b /= 1024
    return f"{b:,.1f} PB"

def barra(pct, w=20):
    n = int(w * min(pct, 100) / 100)
    return "█" * n + "░" * (w - n)

def ext_categoria(nombre):
    ext = os.path.splitext(nombre)[1].lower()
    for cat, exts in CATEGORIAS_EXT.items():
        if ext in exts:
            return cat
    return None

def usuarios_windows():
    """Devuelve lista de usuarios en C:\\Users."""
    users_dir = "C:\\Users"
    ignorar = {"Public", "Default", "Default User", "All Users"}
    try:
        return [
            e.name for e in os.scandir(users_dir)
            if e.is_dir() and e.name not in ignorar
        ]
    except (PermissionError, OSError):
        return [os.environ.get("USERNAME", "")]

# ──────────────────────────────────────────────
#  ESCANEO
# ──────────────────────────────────────────────

def escanear_carpeta(ruta):
    """
    Recorre ruta recursivamente.
    Devuelve: (total_bytes, dict_por_categoria, lista_archivos_grandes, dict_duplicados_candidatos)
    """
    total = 0
    por_cat = defaultdict(int)
    archivos_grandes = []
    duplicados_cand = {}   # (nombre_lower, tamaño) -> primera ruta encontrada

    try:
        for dirpath, dirnames, filenames in os.walk(ruta, followlinks=False):
            # Saltar carpetas del sistema y ocultas
            dirnames[:] = [
                d for d in dirnames
                if d not in IGNORAR_CARPETAS and not d.startswith("$")
            ]
            for fname in filenames:
                try:
                    fp = os.path.join(dirpath, fname)
                    st = os.stat(fp, follow_symlinks=False)
                    s  = st.st_size
                    total += s

                    cat = ext_categoria(fname)
                    if cat:
                        por_cat[cat] += s

                    if s >= MIN_BYTES:
                        archivos_grandes.append((s, fp))

                    # Candidatos a duplicado: mismo nombre Y mismo tamaño (> 1 MB)
                    if s > 1024 * 1024:
                        key = (fname.lower(), s)
                        if key in duplicados_cand:
                            duplicados_cand[key].append(fp)
                        else:
                            duplicados_cand[key] = [fp]
                except (PermissionError, OSError):
                    pass
    except (PermissionError, OSError):
        pass

    return total, por_cat, archivos_grandes, duplicados_cand


def escanear_carpetas_en_paralelo(carpetas_raiz):
    """Lanza escaneos en paralelo y agrega resultados."""
    resultados_carpeta   = []     # (tamaño, ruta)
    archivos_grandes_all = []
    cats_global          = defaultdict(int)
    duplicados_global    = defaultdict(list)  # key -> [rutas]
    bytes_total          = [0]
    completadas          = [0]
    n = len(carpetas_raiz)

    def _escanear(ruta):
        total_c, por_cat, grandes, dups = escanear_carpeta(ruta)
        nombre_c = os.path.basename(ruta) or ruta
        with LOCK:
            completadas[0] += 1
            progreso = completadas[0] / n * 100
            bar = barra(progreso, 20)
            print(
                f"  [{completadas[0]:>2}/{n}] {bar} {progreso:>5.1f}%  "
                f"📁 {nombre_c:<28} {tam(total_c):>10}",
                flush=True,
            )
        return ruta, total_c, por_cat, grandes, dups

    with ThreadPoolExecutor(max_workers=MAX_HILOS) as ex:
        futures = {ex.submit(_escanear, r): r for r in carpetas_raiz}
        for fut in as_completed(futures):
            try:
                ruta, total_c, por_cat, grandes, dups = fut.result()
                resultados_carpeta.append((total_c, ruta))
                archivos_grandes_all.extend(grandes)
                for cat, s in por_cat.items():
                    cats_global[cat] += s
                for key, paths in dups.items():
                    duplicados_global[key].extend(paths)
                bytes_total[0] += total_c
            except Exception:
                pass

    resultados_carpeta.sort(reverse=True)
    archivos_grandes_all.sort(reverse=True)
    return resultados_carpeta, archivos_grandes_all, cats_global, duplicados_global, bytes_total[0]


# ──────────────────────────────────────────────
#  SECCIÓN: RECOMENDACIONES
# ──────────────────────────────────────────────

def calcular_recomendaciones(usuarios):
    recomendaciones = []

    # Caché y basura por cada usuario detectado
    for usuario in usuarios:
        for ruta_bas, desc in rutas_basura(usuario):
            if not os.path.isdir(ruta_bas):
                continue
            s, _, _, _ = escanear_carpeta(ruta_bas)
            if s > 0:
                recomendaciones.append((s, ruta_bas, desc + (f" [{usuario}]" if len(usuarios) > 1 else "")))

    # node_modules y __pycache__ en carpetas de proyectos
    nm_total, nm_rutas = 0, []
    py_total, py_rutas = 0, []

    for usuario in usuarios:
        for base in rutas_proyectos(usuario):
            if not os.path.isdir(base):
                continue
            try:
                for dirpath, dirnames, _ in os.walk(base, followlinks=False):
                    if "node_modules" in dirnames:
                        nm_path = os.path.join(dirpath, "node_modules")
                        s, _, _, _ = escanear_carpeta(nm_path)
                        nm_total += s
                        nm_rutas.append((s, nm_path))
                        dirnames.remove("node_modules")
                    if "__pycache__" in dirnames:
                        pc_path = os.path.join(dirpath, "__pycache__")
                        s, _, _, _ = escanear_carpeta(pc_path)
                        py_total += s
                        py_rutas.append(pc_path)
            except (PermissionError, OSError):
                pass

    if nm_total > 0:
        for s, path in sorted(nm_rutas, reverse=True):
            recomendaciones.append((s, path, "node_modules (borrar y regenerar con npm install)"))

    if py_total > 0:
        recomendaciones.append((py_total,
                                f"{len(py_rutas)} carpeta(s) __pycache__",
                                "Cache Python — se regenera automáticamente"))

    recomendaciones.sort(reverse=True)
    return recomendaciones


# ──────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────

def main():
    SEP  = "═" * 78
    SEP2 = "─" * 78

    print(f"\n{SEP}")
    print("  🔍  ANALIZADOR DE DISCO — Windows")
    print(f"       Raíz: {RAIZ}   |   Archivos grandes: >{ARGS.min_mb} MB   |   Top: {TOP_N}")
    print(SEP)

    # Info del disco
    total_d, usado_d, libre_d = shutil.disk_usage(RAIZ)
    pct_uso = usado_d / total_d * 100
    alerta = "⚠️  ¡CRÍTICO!" if pct_uso > 95 else "⚠️  MUY LLENO" if pct_uso > 88 else ""
    print(f"\n  💾  Disco {RAIZ}   Total: {tam(total_d)}   Usado: {tam(usado_d)}   Libre: {tam(libre_d)}")
    print(f"       {barra(pct_uso, 40)} {pct_uso:.1f}%  {alerta}")

    # Detectar usuarios
    usuarios = usuarios_windows()
    print(f"\n  👤  Usuarios detectados: {', '.join(usuarios)}")

    # Obtener carpetas raíz a escanear
    try:
        entradas = list(os.scandir(RAIZ))
    except PermissionError:
        print(f"  ❌  Sin permisos para leer {RAIZ}")
        sys.exit(1)

    carpetas_raiz = []
    bytes_raiz = 0
    for e in entradas:
        try:
            nombre = e.name
            if nombre in IGNORAR_CARPETAS or nombre.startswith("$"):
                continue
            if e.is_dir(follow_symlinks=False):
                carpetas_raiz.append(e.path)
            elif e.is_file(follow_symlinks=False):
                bytes_raiz += e.stat(follow_symlinks=False).st_size
        except (PermissionError, OSError):
            pass

    print(f"\n  ⏳  Escaneando {len(carpetas_raiz)} carpetas con {MAX_HILOS} hilos...\n")
    t0 = time.time()

    resultados_carpeta, archivos_grandes_all, cats_global, duplicados_global, bytes_total = \
        escanear_carpetas_en_paralelo(carpetas_raiz)

    bytes_total += bytes_raiz
    duracion = time.time() - t0

    # ── SECCIÓN 1: Carpetas más grandes ──────────────────────────────────────
    print(f"\n\n{SEP}")
    print(f"  📁  TOP {TOP_N} CARPETAS MÁS GRANDES")
    print(SEP2)
    print(f"  {'CARPETA':<50} {'TAMAÑO':>10}  {'%':>5}  BARRA")
    print(SEP2)
    for s, ruta in resultados_carpeta[:TOP_N]:
        pct = s / bytes_total * 100 if bytes_total else 0
        nombre_c = ruta if len(ruta) <= 50 else "…" + ruta[-49:]
        print(f"  {nombre_c:<50} {tam(s):>10}  {pct:>4.1f}%  {barra(pct, 14)}")

    # ── SECCIÓN 2: Archivos más grandes ──────────────────────────────────────
    print(f"\n\n{SEP}")
    print(f"  🐘  TOP {TOP_N} ARCHIVOS MÁS GRANDES  (>{ARGS.min_mb} MB)")
    print(SEP2)
    print(f"  {'ARCHIVO':<60} {'TAMAÑO':>10}")
    print(SEP2)
    if archivos_grandes_all:
        for s, fp in archivos_grandes_all[:TOP_N]:
            nombre_f = fp if len(fp) <= 60 else "…" + fp[-59:]
            print(f"  {nombre_f:<60} {tam(s):>10}")
    else:
        print(f"  (no se encontraron archivos > {ARGS.min_mb} MB con acceso)")

    # ── SECCIÓN 3: Por tipo de archivo ───────────────────────────────────────
    print(f"\n\n{SEP}")
    print("  📊  ESPACIO POR TIPO DE ARCHIVO")
    print(SEP2)
    cats_sorted = sorted(cats_global.items(), key=lambda x: x[1], reverse=True)
    for cat, s in cats_sorted:
        pct = s / bytes_total * 100 if bytes_total else 0
        print(f"  {cat:<30} {tam(s):>10}  {barra(pct, 20)} {pct:.1f}%")

    # ── SECCIÓN 4: Posibles duplicados ───────────────────────────────────────
    duplicados_reales = {
        key: list(dict.fromkeys(paths))       # eliminar rutas duplicadas
        for key, paths in duplicados_global.items()
        if len(set(paths)) > 1
    }
    duplicados_reales = dict(
        sorted(duplicados_reales.items(), key=lambda x: x[0][1] * len(x[1]), reverse=True)
    )

    if duplicados_reales:
        print(f"\n\n{SEP}")
        print(f"  👯  POSIBLES DUPLICADOS (mismo nombre y tamaño, >1 MB) — top {min(15, len(duplicados_reales))}")
        print(SEP2)
        mostrados_dup = 0
        for (nombre, s), paths in duplicados_reales.items():
            if mostrados_dup >= 15:
                break
            desperdicio = s * (len(paths) - 1)
            print(f"  {nombre}  ({tam(s)} × {len(paths)} copias = {tam(desperdicio)} extra)")
            for p in paths[:4]:
                p_c = p if len(p) <= 70 else "…" + p[-69:]
                print(f"    → {p_c}")
            if len(paths) > 4:
                print(f"    … y {len(paths)-4} más")
            print()
            mostrados_dup += 1

    # ── SECCIÓN 5: Recomendaciones ────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  🧹  QUÉ PUEDES BORRAR — de más seguro a menos")
    print(SEP)
    print("\n  Calculando tamaños de caché y basura...")

    recomendaciones = calcular_recomendaciones(usuarios)
    total_recuperable = sum(s for s, *_ in recomendaciones)

    print(f"\n  💡  Espacio potencialmente recuperable: {tam(total_recuperable)}\n")
    print(f"  {'RUTA / DESCRIPCIÓN':<58} {'TAMAÑO':>10}")
    print(SEP2)
    for s, ruta, desc in recomendaciones:
        ruta_c = str(ruta) if len(str(ruta)) <= 58 else "…" + str(ruta)[-57:]
        print(f"  {ruta_c:<58} {tam(s):>10}")
        print(f"     ↳ {desc}")
        print()

    # ── SECCIÓN 6: Consejos manuales ─────────────────────────────────────────
    print(SEP2)
    print("\n  ⚠️   TAMBIÉN CONSIDERA (requiere criterio manual):")
    for usuario in usuarios:
        print(f"  • Programas no usados:  Panel de control → Agregar o quitar programas")
        print(f"  • Juegos de Steam/Epic que ya terminaste")
        print(f"  • Videos/fotos duplicados en C:\\Users\\{usuario}\\")
        print(f"  • Papelera de reciclaje (clic derecho sobre el icono → Vaciar)")
        break   # solo una vez aunque haya varios usuarios

    print(f"\n  📈  Escaneado: {tam(bytes_total)}  |  Archivos grandes encontrados: {len(archivos_grandes_all)}")
    print(f"  ⏱️   Escaneo completado en {duracion:.1f} segundos")
    print(f"{SEP}\n")


if __name__ == "__main__":
    main()
