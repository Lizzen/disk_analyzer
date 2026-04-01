"""
Scanner de disco adaptado para GUI.
Emite mensajes en una queue.Queue en lugar de imprimir por consola.
Soporta cancelación mediante threading.Event.

Optimizaciones v2:
  - os.scandir() recursivo en lugar de os.walk() + os.stat() separado
    → evita una syscall de stat extra por archivo (DirEntry ya trae el stat en caché)
  - Emisión por lotes de archivos (BATCH_SIZE) → reduce contención en la queue
  - Lock de duplicados reducido: acumular localmente y fusionar al final
  - Extensión extraída del DirEntry.name sin llamar splitext
  - Lookup de categoría con dict inverso (ext→cat) O(1) en lugar de iterar
"""

import hashlib
import os
import queue
import threading
import time as _time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils import logger as log

# ── Configuración ─────────────────────────────────────────────────────────────

IGNORAR_CARPETAS: frozenset = frozenset({
    # Sistema Windows
    "Windows", "System Volume Information", "$Recycle.Bin",
    "Recovery", "PerfLogs", "MSOCache", "WpSystem",
    "WindowsApps", "WinSxS",
    # Carpetas de dependencias de desarrollo (enormes, no útiles de escanear individualmente)
    "node_modules", ".git", "__pycache__", ".venv", "venv", ".env",
})

# Carpetas que el usuario puede añadir manualmente para excluir del escaneo
_user_ignore: set[str] = set()

def get_ignore_list() -> list[str]:
    """Devuelve la lista combinada de carpetas ignoradas (sistema + usuario)."""
    return sorted(IGNORAR_CARPETAS | _user_ignore)

def add_ignore(name: str):
    """Añade una carpeta a la lista de ignoradas (solo nombre, no ruta completa)."""
    _user_ignore.add(name)

def remove_ignore(name: str):
    """Elimina una carpeta de la lista de ignoradas por el usuario."""
    _user_ignore.discard(name)

def _should_ignore(name: str) -> bool:
    return name in IGNORAR_CARPETAS or name in _user_ignore or name.startswith("$")

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

# Dict inverso ext→categoría para lookup O(1)
_EXT_TO_CAT: dict[str, str] = {}
for _cat, _exts in CATEGORIAS_EXT.items():
    for _e in _exts:
        _EXT_TO_CAT[_e] = _cat

CACHE_FOLDER_NAMES: frozenset = frozenset({
    "node_modules", "__pycache__", ".git", "dist", "build", ".cache",
    ".next", ".nuxt", "venv", ".venv", "env",
})

# Carpetas que se ignoran en el escaneo profundo pero cuyo tamaño total se reporta
HEAVY_KNOWN_DIRS: frozenset = frozenset({
    "node_modules", "__pycache__", ".git",
    "venv", ".venv", "env",
    "ShaderCache",        # Steam/GPU shader cache
    "shadercache",        # variante minúscula
})

DUP_MIN_SIZE    = 1024 * 1024    # 1 MB — mínimo para candidato a duplicado
DUP_MAX_GROUPS  = 20_000         # máximo de grupos de duplicados por hilo (evita RAM ilimitada)
BATCH_SIZE      = 500            # archivos por lote antes de poner en queue
PROGRESS_EVERY  = 2000           # emitir progreso cada N archivos dentro de una carpeta


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ext_categoria(ext_lower: str) -> str:
    """Categoría a partir de la extensión (ya en minúsculas). O(1)."""
    return _EXT_TO_CAT.get(ext_lower, "Otros")


# ── Scanner principal ─────────────────────────────────────────────────────────

class DiskScanner:
    """
    Escanea un directorio raíz de forma paralela y emite mensajes en msg_queue.

    Tipos de mensaje:
      {"type": "start",    "root": str, "n_top": int}
      {"type": "file_batch", "entries": list[dict]}       ← NUEVO: lote de archivos
      {"type": "folder",   "path": str, "parent": str, "size": int, "file_count": int}
      {"type": "progress", "done": int, "total": int, "current": str, "bytes": int}
      {"type": "done",     "total_bytes": int, "elapsed": float, "duplicates": dict}
      {"type": "error",    "path": str, "msg": str}
    """

    def __init__(self, msg_queue: queue.Queue, cancel_event: threading.Event,
                 max_workers: int = 0):
        self._q = msg_queue
        self._cancel = cancel_event
        # 0 → auto: usa CPU count * 2, mínimo 8, máximo 32
        cpu = os.cpu_count() or 4
        self._max_workers = max_workers or min(max(cpu * 2, 8), 32)
        self._lock = threading.Lock()
        self._bytes_total = 0
        self._done_count = 0
        self._total_top = 0   # total de carpetas top-level (para % progreso)
        self._error_count = 0  # carpetas/archivos con error de acceso
        # Cada hilo acumula duplicados localmente; se fusionan al final con un solo lock
        self._local_dups: list[dict] = []

    # ── público ────────────────────────────────────────────────────────────────

    def scan(self, root_path: str):
        t0 = _time.perf_counter()
        log.info("SCAN START  root=%s  workers=%d", root_path, self._max_workers)

        top_folders = self._top_folders(root_path)
        total_top = len(top_folders)
        self._total_top = total_top
        log.info("SCAN top-level folders=%d", total_top)

        self._q.put({"type": "start", "root": root_path, "n_top": total_top})

        with ThreadPoolExecutor(max_workers=self._max_workers) as ex:
            futures = {
                ex.submit(self._scan_folder, folder, root_path): folder
                for folder in top_folders
            }
            for fut in as_completed(futures):
                if self._cancel.is_set():
                    log.info("SCAN cancelled — stopping after_completed loop")
                    break
                try:
                    fut.result()
                except Exception as exc:
                    log.error("SCAN future error  path=%s  exc=%s", futures[fut], exc)
                    self._q.put({"type": "error",
                                 "path": futures[fut], "msg": str(exc)})

        elapsed = _time.perf_counter() - t0
        log.info("SCAN DONE  elapsed=%.2fs  bytes=%d  errors=%d  dups_candidates=%d",
                 elapsed, self._bytes_total, self._error_count, len(self._local_dups))

        # Fusionar duplicados locales de todos los hilos
        merged: dict = defaultdict(list)
        for local in self._local_dups:
            for key, paths in local.items():
                merged[key].extend(paths)

        # dict.fromkeys preserva orden y deduplica en una pasada (O(n)).
        # Usamos la misma estructura para el chequeo de longitud, evitando
        # crear un set adicional con set(v).
        real_dups = {}
        for k, v in merged.items():
            deduped = list(dict.fromkeys(v))
            if len(deduped) > 1:
                real_dups[k] = deduped
        log.info("SCAN dup groups after dedup=%d", len(real_dups))

        self._q.put({
            "type": "done",
            "total_bytes": self._bytes_total,
            "elapsed": elapsed,
            "duplicates": real_dups,
            "errors": self._error_count,
        })

    # ── privado ────────────────────────────────────────────────────────────────

    def _top_folders(self, root_path: str) -> list[str]:
        result: list[str] = []
        try:
            with os.scandir(root_path) as it:
                for e in it:
                    try:
                        if _should_ignore(e.name):
                            # Si es una carpeta pesada conocida, calcular su tamaño y emitir heavy_folder
                            if e.is_dir(follow_symlinks=False) and e.name in HEAVY_KNOWN_DIRS:
                                size = self._quick_dir_size(e.path)
                                self._q.put({
                                    "type":  "heavy_folder",
                                    "path":  e.path,
                                    "name":  e.name,
                                    "parent": root_path,
                                    "size":  size,
                                })
                                log.debug("HEAVY_FOLDER  path=%s  size=%d", e.path, size)
                            else:
                                log.debug("IGNORE  folder=%s", e.path)
                            continue
                        if e.is_dir(follow_symlinks=False):
                            result.append(e.path)
                    except (PermissionError, OSError) as exc:
                        log.warning("TOP_FOLDERS access error  path=%s  exc=%s", e.path, exc)
        except (PermissionError, OSError) as exc:
            log.error("TOP_FOLDERS root not accessible  path=%s  exc=%s", root_path, exc)
            self._q.put({"type": "error", "path": root_path, "msg": str(exc)})
        return result

    def _quick_dir_size(self, path: str, max_depth: int = 6) -> int:
        """Calcula el tamaño total de un directorio de forma rápida (sin indexar archivos)."""
        total = 0
        stack = [(path, 0)]
        while stack:
            dirpath, depth = stack.pop()
            try:
                with os.scandir(dirpath) as it:
                    for e in it:
                        try:
                            if e.is_file(follow_symlinks=False):
                                total += e.stat(follow_symlinks=False).st_size
                            elif e.is_dir(follow_symlinks=False) and depth < max_depth:
                                stack.append((e.path, depth + 1))
                        except OSError:
                            pass
            except OSError:
                pass
        return total

    def _scan_folder(self, folder_path: str, root_path: str):
        """
        Recorre folder_path recursivamente con os.scandir (evita stat extra).
        Emite mensajes de carpeta y lotes de archivos.
        """
        if self._cancel.is_set():
            log.debug("FOLDER skipped (cancelled before start)  path=%s", folder_path)
            return

        t_folder = _time.perf_counter()
        log.debug("FOLDER START  path=%s", folder_path)

        local_dups: dict = defaultdict(list)
        folder_size = 0
        folder_files = 0
        files_since_progress = 0   # contador para emitir progreso intermedio

        # Pila de (dirpath, parent_path, is_cache) para DFS iterativo sin recursión Python
        # is_cache se propaga hacia abajo: si un ancestro es carpeta cache, todo lo de dentro también
        root_is_cache = folder_path.split(os.sep)[-1].lower() in CACHE_FOLDER_NAMES
        stack: list[tuple[str, str, bool]] = [(folder_path, os.path.dirname(folder_path), root_is_cache)]

        while stack:
            if self._cancel.is_set():
                log.debug("FOLDER cancelled mid-DFS  path=%s  files_so_far=%d", folder_path, folder_files)
                return

            dirpath, parent_path, dir_is_cache = stack.pop()
            log.debug("DIR  path=%s", dirpath)
            dir_size = 0
            dir_file_count = 0
            batch: list[dict] = []

            try:
                with os.scandir(dirpath) as it:
                    for entry in it:
                        if self._cancel.is_set():
                            return
                        try:
                            if entry.is_dir(follow_symlinks=False):
                                if _should_ignore(entry.name):
                                    if entry.name in HEAVY_KNOWN_DIRS:
                                        size = self._quick_dir_size(entry.path)
                                        self._q.put({
                                            "type":   "heavy_folder",
                                            "path":   entry.path,
                                            "name":   entry.name,
                                            "parent": dirpath,
                                            "size":   size,
                                        })
                                    continue
                                child_is_cache = dir_is_cache or entry.name.lower() in CACHE_FOLDER_NAMES
                                stack.append((entry.path, dirpath, child_is_cache))
                            else:
                                # Usar stat en caché del DirEntry (ya disponible en NTFS)
                                st = entry.stat(follow_symlinks=False)
                                s = st.st_size
                                name = entry.name

                                # Extensión sin llamar splitext
                                dot = name.rfind(".")
                                ext = name[dot:].lower() if dot > 0 else ""

                                cat = _ext_categoria(ext)
                                is_cache = dir_is_cache

                                batch.append({
                                    "path": entry.path,
                                    "name": name,
                                    "size": s,
                                    "category": cat,
                                    "extension": ext,
                                    "is_cache": is_cache,
                                    "parent_dir": dirpath,
                                    "mtime": int(st.st_mtime),
                                    "atime": int(st.st_atime),
                                })

                                dir_size    += s
                                folder_size += s
                                dir_file_count  += 1
                                folder_files    += 1
                                files_since_progress += 1

                                if s > DUP_MIN_SIZE and len(local_dups) < DUP_MAX_GROUPS:
                                    local_dups[(name.lower(), s)].append(entry.path)

                                # Emitir lote cuando llega al límite
                                if len(batch) >= BATCH_SIZE:
                                    self._q.put({"type": "file_batch", "entries": batch})
                                    batch = []

                                # Progreso intermedio: dentro de una carpeta grande.
                                # Lee sin lock: int reads en CPython son atómicos bajo el GIL.
                                if files_since_progress >= PROGRESS_EVERY:
                                    files_since_progress = 0
                                    self._q.put({
                                        "type":    "progress",
                                        "done":    self._done_count,
                                        "total":   self._total_top,
                                        "current": dirpath,
                                        "bytes":   self._bytes_total + folder_size,
                                    })

                        except (PermissionError, OSError) as e:
                            log.warning("ENTRY error  path=%s  exc=%s", entry.path, e)
                            with self._lock:
                                self._error_count += 1
                            self._q.put({"type": "error", "path": entry.path, "msg": str(e)})

            except (PermissionError, OSError) as e:
                log.warning("SCANDIR error  path=%s  exc=%s", dirpath, e)
                with self._lock:
                    self._error_count += 1
                self._q.put({"type": "error", "path": dirpath, "msg": str(e)})

            # Vaciar lote restante
            if batch:
                self._q.put({"type": "file_batch", "entries": batch})

            # Emitir carpeta (no la top-level aún)
            if dirpath != folder_path:
                self._q.put({
                    "type": "folder",
                    "path": dirpath,
                    "parent": parent_path,
                    "size": dir_size,
                    "file_count": dir_file_count,
                })

        # Guardar duplicados locales
        with self._lock:
            self._local_dups.append(dict(local_dups))
            self._bytes_total += folder_size
            self._done_count  += 1
            done = self._done_count

        elapsed_f = _time.perf_counter() - t_folder
        log.info("FOLDER DONE  path=%s  files=%d  bytes=%d  elapsed=%.2fs",
                 folder_path, folder_files, folder_size, elapsed_f)

        parent = os.path.dirname(folder_path)
        self._q.put({
            "type": "folder",
            "path": folder_path,
            "parent": parent,
            "size": folder_size,
            "file_count": folder_files,
        })
        self._q.put({
            "type": "progress",
            "done": done,
            "total": self._total_top,
            "current": folder_path,
            "bytes": self._bytes_total,
        })


# ── Verificación de duplicados por hash ───────────────────────────────────────

_HASH_CHUNK = 65536  # 64 KB por lectura


def _file_md5(path: str) -> str | None:
    """Calcula el MD5 de un fichero. Devuelve None si no se puede leer."""
    h = hashlib.md5()
    try:
        with open(path, "rb") as f:
            while chunk := f.read(_HASH_CHUNK):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def verify_duplicates_by_hash(
    candidates: dict,
    cancel_event: threading.Event | None = None,
) -> dict:
    """
    Dado el dict de candidatos {(name, size): [paths, ...]}, calcula el MD5
    de cada fichero y devuelve solo los grupos con hash idéntico.

    Parámetros
    ----------
    candidates  : resultado de DiskScanner.scan → msg["duplicates"]
    cancel_event: si se activa, interrumpe el proceso y devuelve lo obtenido hasta ese momento

    Retorna
    -------
    dict con la misma estructura que candidates pero solo con duplicados reales por contenido:
      {(name, size): [path1, path2, ...]}
    """
    real: dict = {}
    for (name, size), paths in candidates.items():
        if cancel_event and cancel_event.is_set():
            break
        hash_groups: dict[str, list[str]] = defaultdict(list)
        for p in paths:
            if cancel_event and cancel_event.is_set():
                break
            md5 = _file_md5(p)
            if md5:
                hash_groups[md5].append(p)
        for h, group in hash_groups.items():
            if len(group) > 1:
                key = (name, size)
                if key not in real:
                    real[key] = []
                real[key].extend(group)
    return real
