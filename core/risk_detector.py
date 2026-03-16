"""
Detector de riesgos proactivo.
Opera sobre un ScanResult ya en memoria — sin I/O de disco adicional.
"""

from __future__ import annotations
import os
from core.models import ScanResult

# Extensiones ejecutables que no deberían estar en carpetas temporales
_EXEC_EXTS = frozenset({".exe", ".msi", ".bat", ".ps1", ".vbs", ".cmd", ".scr", ".pif"})

# Prefijos de rutas temporales (en minúsculas para comparación case-insensitive)
def _temp_prefixes() -> list[str]:
    prefixes = []
    localappdata = os.environ.get("LOCALAPPDATA", "")
    for var in ("TEMP", "TMP"):
        p = os.environ.get(var, "")
        if p:
            prefixes.append(p.lower())
    if localappdata:
        prefixes.append(os.path.join(localappdata, "Temp").lower())
    return prefixes

# Nombres de carpetas que, si son muy grandes, indican crecimiento inusual
_GROWTH_SUSPICIOUS = {
    "appdata", "temp", "tmp", "downloads", "descargas",
    "cache", ".cache", "node_modules",
}
_GROWTH_THRESHOLD = 5 * 1024 ** 3   # 5 GB
_DUP_WASTE_THRESHOLD = 500 * 1024 ** 2  # 500 MB
_LARGE_NO_EXT_THRESHOLD = 100 * 1024 ** 2  # 100 MB


def detect_risks(scan: ScanResult) -> list[dict]:
    """
    Analiza el ScanResult y devuelve una lista de alertas estructuradas.
    Cada alerta: { type, severity, title, description, path, size, action }
    """
    alerts: list[dict] = []
    temp_prefixes = _temp_prefixes()

    def _get(f, key, default=""):
        return f[key] if isinstance(f, dict) else getattr(f, key, default)

    # ── Regla 1: Ejecutables en carpetas temporales ────────────────────────────
    exec_in_temp: list[dict] = []
    for f in scan.files:
        ext  = _get(f, "extension", "").lower()
        path = _get(f, "path", "")
        if ext in _EXEC_EXTS:
            path_lower = path.lower()
            if any(path_lower.startswith(p) for p in temp_prefixes):
                exec_in_temp.append({"path": path, "size": _get(f, "size", 0)})

    if exec_in_temp:
        top = sorted(exec_in_temp, key=lambda x: x["size"], reverse=True)
        total = sum(x["size"] for x in top)
        alerts.append({
            "type":        "executable_in_temp",
            "severity":    "high",
            "title":       f"{len(exec_in_temp)} ejecutable(s) en carpetas temporales",
            "description": "Se encontraron archivos .exe/.bat/.ps1 en carpetas TEMP. "
                           "Pueden ser instaladores huérfanos o software sospechoso.",
            "path":        top[0]["path"],
            "size":        total,
            "action":      "open",
            "files":       [x["path"] for x in top[:10]],
        })

    # ── Regla 2: Archivos grandes sin extensión ────────────────────────────────
    large_no_ext: list[dict] = []
    for f in scan.files:
        ext  = _get(f, "extension", "")
        size = _get(f, "size", 0)
        if not ext and size > _LARGE_NO_EXT_THRESHOLD:
            large_no_ext.append({"path": _get(f, "path", ""), "size": size})

    if large_no_ext:
        top = sorted(large_no_ext, key=lambda x: x["size"], reverse=True)
        alerts.append({
            "type":        "large_no_extension",
            "severity":    "medium",
            "title":       f"{len(large_no_ext)} archivo(s) grande(s) sin extensión",
            "description": "Archivos de más de 100 MB sin extensión. Pueden ser discos "
                           "virtuales, volcados de memoria o archivos descargados incompletos.",
            "path":        top[0]["path"],
            "size":        top[0]["size"],
            "action":      "open",
            "files":       [x["path"] for x in top[:10]],
        })

    # ── Regla 3: Carpetas con tamaño inusualmente grande ──────────────────────
    for node in scan.folders.values():
        name_lower = (node.name or os.path.basename(node.path)).lower()
        if name_lower in _GROWTH_SUSPICIOUS and node.size > _GROWTH_THRESHOLD:
            alerts.append({
                "type":        "folder_unusually_large",
                "severity":    "medium",
                "title":       f'Carpeta "{node.name or name_lower}" ocupa {_fmt(node.size)}',
                "description": f"La carpeta {node.path} tiene un tamaño inusualmente grande "
                               f"({_fmt(node.size)}). Puede contener cachés acumuladas o archivos olvidados.",
                "path":        node.path,
                "size":        node.size,
                "action":      "open",
                "files":       [],
            })

    # ── Regla 4: Desperdicio por duplicados ───────────────────────────────────
    total_waste = 0
    dup_groups  = 0
    worst_path  = ""
    worst_waste = 0

    dups = scan.duplicates
    # duplicates puede ser dict {(name,size): [paths]} o lista de dicts
    if isinstance(dups, dict):
        items = dups.items()
    else:
        items = (((d.get("name",""), d.get("size",0)), d.get("paths",[])) for d in (dups or []))

    for key, paths in items:
        if not paths or len(paths) < 2:
            continue
        size = key[1] if isinstance(key, (tuple, list)) else 0
        waste = size * (len(paths) - 1)
        total_waste += waste
        dup_groups  += 1
        if waste > worst_waste:
            worst_waste = waste
            worst_path  = paths[0] if paths else ""

    if total_waste > _DUP_WASTE_THRESHOLD:
        alerts.append({
            "type":        "duplicate_waste",
            "severity":    "medium",
            "title":       f"{dup_groups} grupos de duplicados desperdician {_fmt(total_waste)}",
            "description": f"Se detectaron archivos duplicados (mismo nombre y tamaño) que "
                           f"ocupan {_fmt(total_waste)} de espacio innecesario.",
            "path":        worst_path,
            "size":        total_waste,
            "action":      "chat",
            "files":       [],
        })

    # Ordenar: high primero, luego por size desc
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 9), -a["size"]))
    return alerts


def _fmt(b: int) -> str:
    for unit, t in [("GB", 1024**3), ("MB", 1024**2), ("KB", 1024)]:
        if b >= t:
            return f"{b/t:.1f} {unit}"
    return f"{b} B"
