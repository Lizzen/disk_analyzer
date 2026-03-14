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

import os
import queue
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Configuración ─────────────────────────────────────────────────────────────

IGNORAR_CARPETAS: frozenset = frozenset({
    "Windows", "System Volume Information", "$Recycle.Bin",
    "Recovery", "PerfLogs", "MSOCache", "WpSystem",
    "WindowsApps", "WinSxS",
})

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

DUP_MIN_SIZE = 1024 * 1024       # 1 MB — mínimo para candidato a duplicado
BATCH_SIZE   = 500                # archivos por lote antes de poner en queue


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
        # Cada hilo acumula duplicados localmente; se fusionan al final con un solo lock
        self._local_dups: list[dict] = []

    # ── público ────────────────────────────────────────────────────────────────

    def scan(self, root_path: str):
        import time
        t0 = time.perf_counter()

        top_folders = self._top_folders(root_path)
        total_top = len(top_folders)
        self._total_top = total_top

        self._q.put({"type": "start", "root": root_path, "n_top": total_top})

        with ThreadPoolExecutor(max_workers=self._max_workers) as ex:
            futures = {
                ex.submit(self._scan_folder, folder, root_path): folder
                for folder in top_folders
            }
            for fut in as_completed(futures):
                if self._cancel.is_set():
                    break
                try:
                    fut.result()
                except Exception as exc:
                    self._q.put({"type": "error",
                                 "path": futures[fut], "msg": str(exc)})

        elapsed = time.perf_counter() - t0

        # Fusionar duplicados locales de todos los hilos
        merged: dict = defaultdict(list)
        for local in self._local_dups:
            for key, paths in local.items():
                merged[key].extend(paths)

        real_dups = {
            k: list(dict.fromkeys(v))
            for k, v in merged.items()
            if len(set(v)) > 1
        }

        self._q.put({
            "type": "done",
            "total_bytes": self._bytes_total,
            "elapsed": elapsed,
            "duplicates": real_dups,
        })

    # ── privado ────────────────────────────────────────────────────────────────

    def _top_folders(self, root_path: str) -> list[str]:
        result: list[str] = []
        try:
            with os.scandir(root_path) as it:
                for e in it:
                    try:
                        if e.name in IGNORAR_CARPETAS or e.name.startswith("$"):
                            continue
                        if e.is_dir(follow_symlinks=False):
                            result.append(e.path)
                    except (PermissionError, OSError):
                        pass
        except (PermissionError, OSError) as exc:
            self._q.put({"type": "error", "path": root_path, "msg": str(exc)})
        return result

    def _scan_folder(self, folder_path: str, root_path: str):
        """
        Recorre folder_path recursivamente con os.scandir (evita stat extra).
        Emite mensajes de carpeta y lotes de archivos.
        """
        if self._cancel.is_set():
            return

        local_dups: dict = defaultdict(list)
        folder_size = 0
        folder_files = 0

        # Pila de (dirpath, parent_path) para DFS iterativo sin recursión Python
        stack: list[tuple[str, str]] = [(folder_path, os.path.dirname(folder_path))]

        while stack:
            if self._cancel.is_set():
                return

            dirpath, parent_path = stack.pop()
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
                                name = entry.name
                                if name in IGNORAR_CARPETAS or name.startswith("$"):
                                    continue
                                stack.append((entry.path, dirpath))
                            else:
                                # Usar stat en caché del DirEntry (ya disponible en NTFS)
                                st = entry.stat(follow_symlinks=False)
                                s = st.st_size
                                name = entry.name

                                # Extensión sin llamar splitext
                                dot = name.rfind(".")
                                ext = name[dot:].lower() if dot > 0 else ""

                                cat = _ext_categoria(ext)
                                is_cache = dirpath.split(os.sep)[-1].lower() in CACHE_FOLDER_NAMES

                                batch.append({
                                    "path": entry.path,
                                    "name": name,
                                    "size": s,
                                    "category": cat,
                                    "extension": ext,
                                    "is_cache": is_cache,
                                    "parent_dir": dirpath,
                                })

                                dir_size    += s
                                folder_size += s
                                dir_file_count += 1
                                folder_files   += 1

                                if s > DUP_MIN_SIZE:
                                    local_dups[(name.lower(), s)].append(entry.path)

                                # Emitir lote cuando llega al límite
                                if len(batch) >= BATCH_SIZE:
                                    self._q.put({"type": "file_batch", "entries": batch})
                                    batch = []

                        except (PermissionError, OSError):
                            pass

            except (PermissionError, OSError):
                pass

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
