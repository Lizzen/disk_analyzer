"""
Scanner de disco adaptado para GUI.
Emite mensajes en una queue.Queue en lugar de imprimir por consola.
Soporta cancelación mediante threading.Event.
"""

import os
import queue
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Configuración ────────────────────────────────────────────────────────────

IGNORAR_CARPETAS = {
    "Windows", "System Volume Information", "$Recycle.Bin",
    "Recovery", "PerfLogs", "MSOCache", "WpSystem",
}

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

CACHE_FOLDER_NAMES = {"node_modules", "__pycache__", ".git", "dist", "build", ".cache"}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _ext_categoria(nombre: str) -> str:
    ext = os.path.splitext(nombre)[1].lower()
    for cat, exts in CATEGORIAS_EXT.items():
        if ext in exts:
            return cat
    return "Otros"


def _is_cache_folder(name: str) -> bool:
    return name.lower() in CACHE_FOLDER_NAMES


# ── Scanner principal ─────────────────────────────────────────────────────────

class DiskScanner:
    """
    Escanea un directorio raíz de forma paralela y emite mensajes en msg_queue.

    Tipos de mensaje:
      {"type": "start",    "root": str, "n_top": int}
      {"type": "folder",   "path": str, "parent": str, "size": int, "file_count": int}
      {"type": "file",     "path": str, "name": str, "size": int, "category": str,
                           "extension": str, "is_cache": bool, "parent_dir": str}
      {"type": "progress", "done": int, "total": int, "current": str, "bytes": int}
      {"type": "done",     "total_bytes": int, "elapsed": float,
                           "duplicates": dict}
      {"type": "error",    "path": str, "msg": str}
    """

    def __init__(self, msg_queue: queue.Queue, cancel_event: threading.Event,
                 max_workers: int = 16):
        self._q = msg_queue
        self._cancel = cancel_event
        self._max_workers = max_workers
        self._lock = threading.Lock()
        self._bytes_total = 0
        self._done_count = 0
        self._duplicates: dict = defaultdict(list)  # (name_lower, size) -> [paths]

    # ── público ────────────────────────────────────────────────────────────────

    def scan(self, root_path: str):
        import time
        t0 = time.time()

        # Obtener carpetas de primer nivel
        top_folders = self._top_folders(root_path)
        total_top = len(top_folders)

        self._q.put({"type": "start", "root": root_path, "n_top": total_top})

        with ThreadPoolExecutor(max_workers=self._max_workers) as ex:
            futures = {ex.submit(self._scan_folder, folder, root_path): folder
                       for folder in top_folders}
            for fut in as_completed(futures):
                if self._cancel.is_set():
                    break
                try:
                    fut.result()
                except Exception as e:
                    self._q.put({"type": "error", "path": futures[fut], "msg": str(e)})

        elapsed = time.time() - t0

        # Filtrar duplicados reales (>1 copia)
        real_dups = {
            k: list(dict.fromkeys(v))
            for k, v in self._duplicates.items()
            if len(set(v)) > 1
        }

        self._q.put({
            "type": "done",
            "total_bytes": self._bytes_total,
            "elapsed": elapsed,
            "duplicates": real_dups,
        })

    # ── privado ────────────────────────────────────────────────────────────────

    def _top_folders(self, root_path: str) -> list:
        """Devuelve la lista de subcarpetas directas de root_path a escanear."""
        result = []
        try:
            for e in os.scandir(root_path):
                try:
                    name = e.name
                    if name in IGNORAR_CARPETAS or name.startswith("$"):
                        continue
                    if e.is_dir(follow_symlinks=False):
                        result.append(e.path)
                except (PermissionError, OSError):
                    pass
        except (PermissionError, OSError) as exc:
            self._q.put({"type": "error", "path": root_path, "msg": str(exc)})
        return result

    def _scan_folder(self, folder_path: str, root_path: str):
        """Recorre folder_path recursivamente y emite mensajes para cada archivo/carpeta."""
        if self._cancel.is_set():
            return

        folder_size = 0
        folder_files = 0
        # sub-carpetas encontradas en este nivel para emitir sus propios mensajes
        sub_totals: dict = {}  # path -> size

        try:
            for dirpath, dirnames, filenames in os.walk(folder_path, followlinks=False):
                if self._cancel.is_set():
                    return

                # Filtrar carpetas sistema
                dirnames[:] = [
                    d for d in dirnames
                    if d not in IGNORAR_CARPETAS and not d.startswith("$")
                ]

                dir_size = 0
                for fname in filenames:
                    if self._cancel.is_set():
                        return
                    try:
                        fp = os.path.join(dirpath, fname)
                        st = os.stat(fp, follow_symlinks=False)
                        s = st.st_size
                        cat = _ext_categoria(fname)
                        ext = os.path.splitext(fname)[1].lower()
                        is_cache = _is_cache_folder(os.path.basename(dirpath))

                        self._q.put({
                            "type": "file",
                            "path": fp,
                            "name": fname,
                            "size": s,
                            "category": cat,
                            "extension": ext,
                            "is_cache": is_cache,
                            "parent_dir": dirpath,
                        })

                        dir_size += s
                        folder_size += s
                        folder_files += 1

                        # Candidato duplicado (mismo nombre+tamaño, >1MB)
                        if s > 1024 * 1024:
                            key = (fname.lower(), s)
                            with self._lock:
                                self._duplicates[key].append(fp)

                    except (PermissionError, OSError):
                        pass

                # Emitir mensaje de subcarpeta (no la raíz del scan)
                if dirpath != folder_path:
                    parent = os.path.dirname(dirpath)
                    self._q.put({
                        "type": "folder",
                        "path": dirpath,
                        "parent": parent,
                        "size": dir_size,
                        "file_count": len(filenames),
                    })

        except (PermissionError, OSError):
            pass

        # Emitir la carpeta top-level con su total
        with self._lock:
            self._bytes_total += folder_size
            self._done_count += 1
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
            "total": 0,  # total se actualiza en app.py una vez conocido
            "current": folder_path,
            "bytes": self._bytes_total,
        })
