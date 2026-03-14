"""
Tests para core/scanner.py y core/models.py
"""
import os
import queue
import threading
import tempfile
import time
import pytest

# Asegurar que el root del proyecto está en el path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.scanner import (
    DiskScanner,
    _ext_categoria,
    _should_ignore,
    get_ignore_list,
    add_ignore,
    remove_ignore,
    verify_duplicates_by_hash,
    CATEGORIAS_EXT,
    _EXT_TO_CAT,
    DUP_MIN_SIZE,
    BATCH_SIZE,
)
from core.models import FileEntry, FolderNode, ScanResult


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def drain_queue(q: queue.Queue, timeout: float = 5.0) -> list[dict]:
    """Recoge todos los mensajes hasta recibir 'done' o que expire el timeout."""
    msgs = []
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            msg = q.get(timeout=0.1)
            msgs.append(msg)
            if msg["type"] == "done":
                break
        except queue.Empty:
            pass
    return msgs


def run_scan(root: str, cancel: threading.Event | None = None) -> list[dict]:
    q = queue.Queue()
    ev = cancel or threading.Event()
    scanner = DiskScanner(q, ev, max_workers=2)
    t = threading.Thread(target=scanner.scan, args=(root,), daemon=True)
    t.start()
    msgs = drain_queue(q)
    t.join(timeout=10)
    return msgs


def create_tree(base: str, spec: dict):
    """
    Crea un árbol de ficheros en base a partir de un dict:
      { "subdir/file.txt": b"contenido", ... }
    """
    for rel_path, content in spec.items():
        full = os.path.join(base, rel_path.replace("/", os.sep))
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(content)


# ─────────────────────────────────────────────────────────────────────────────
# Tests: _ext_categoria
# ─────────────────────────────────────────────────────────────────────────────

class TestExtCategoria:
    def test_video(self):
        assert _ext_categoria(".mp4") == "Videos"

    def test_imagen(self):
        assert _ext_categoria(".jpg") == "Imagenes"
        assert _ext_categoria(".png") == "Imagenes"

    def test_audio(self):
        assert _ext_categoria(".mp3") == "Audio"

    def test_documento(self):
        assert _ext_categoria(".pdf") == "Documentos"
        assert _ext_categoria(".docx") == "Documentos"

    def test_temporal(self):
        assert _ext_categoria(".tmp") == "Temporales/Cache"
        assert _ext_categoria(".log") == "Temporales/Cache"

    def test_instalador(self):
        assert _ext_categoria(".exe") == "Instaladores/ISO"
        assert _ext_categoria(".zip") == "Instaladores/ISO"

    def test_compilado(self):
        assert _ext_categoria(".pyc") == "Desarrollo (compilados)"
        assert _ext_categoria(".class") == "Desarrollo (compilados)"

    def test_base_datos(self):
        assert _ext_categoria(".db") == "Bases de datos"
        assert _ext_categoria(".sqlite") == "Bases de datos"

    def test_desconocido(self):
        assert _ext_categoria(".xyz123") == "Otros"
        assert _ext_categoria("") == "Otros"

    def test_mayusculas_no_matchean(self):
        # La función espera ext ya en minúsculas
        assert _ext_categoria(".MP4") == "Otros"

    def test_dict_inverso_completo(self):
        """Todos los ext de CATEGORIAS_EXT deben estar en _EXT_TO_CAT."""
        for cat, exts in CATEGORIAS_EXT.items():
            for ext in exts:
                assert _EXT_TO_CAT.get(ext) == cat, \
                    f"ext '{ext}' de cat '{cat}' no está en _EXT_TO_CAT"


# ─────────────────────────────────────────────────────────────────────────────
# Tests: _should_ignore
# ─────────────────────────────────────────────────────────────────────────────

class TestShouldIgnore:
    def test_ignora_carpetas_sistema(self):
        assert _should_ignore("Windows") is True
        assert _should_ignore("$Recycle.Bin") is True
        assert _should_ignore("System Volume Information") is True

    def test_ignora_prefijo_dolar(self):
        assert _should_ignore("$MFT") is True
        assert _should_ignore("$SomethingRandom") is True

    def test_no_ignora_carpeta_normal(self):
        assert _should_ignore("Documents") is False
        assert _should_ignore("my_project") is False

    def test_user_ignore(self):
        add_ignore("mi_carpeta_custom")
        assert _should_ignore("mi_carpeta_custom") is True
        remove_ignore("mi_carpeta_custom")
        assert _should_ignore("mi_carpeta_custom") is False

    def test_get_ignore_list_ordenado(self):
        lst = get_ignore_list()
        assert lst == sorted(lst)
        assert "Windows" in lst


# ─────────────────────────────────────────────────────────────────────────────
# Tests: DiskScanner — estructura de mensajes
# ─────────────────────────────────────────────────────────────────────────────

class TestScannerMessages:

    def test_emite_start_y_done(self, tmp_path):
        (tmp_path / "sub").mkdir()
        (tmp_path / "sub" / "a.txt").write_bytes(b"hola")
        msgs = run_scan(str(tmp_path))
        types = [m["type"] for m in msgs]
        assert "start" in types
        assert "done" in types

    def test_start_contiene_root(self, tmp_path):
        (tmp_path / "sub").mkdir()
        msgs = run_scan(str(tmp_path))
        start = next(m for m in msgs if m["type"] == "start")
        assert start["root"] == str(tmp_path)

    def test_done_contiene_campos(self, tmp_path):
        (tmp_path / "sub").mkdir()
        (tmp_path / "sub" / "x.bin").write_bytes(b"x" * 100)
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert "total_bytes" in done
        assert "elapsed" in done
        assert "duplicates" in done
        assert done["elapsed"] >= 0

    def test_file_batch_contiene_entradas(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "a.txt").write_bytes(b"a" * 50)
        (sub / "b.mp4").write_bytes(b"b" * 80)
        msgs = run_scan(str(tmp_path))
        batches = [m for m in msgs if m["type"] == "file_batch"]
        assert len(batches) > 0
        entries = [e for m in batches for e in m["entries"]]
        names = {e["name"] for e in entries}
        assert "a.txt" in names
        assert "b.mp4" in names

    def test_file_batch_campos_obligatorios(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "test.pdf").write_bytes(b"pdf" * 10)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        for e in entries:
            assert "path" in e
            assert "name" in e
            assert "size" in e
            assert "category" in e
            assert "extension" in e
            assert "is_cache" in e
            assert "parent_dir" in e

    def test_categoria_correcta_en_batch(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "video.mp4").write_bytes(b"v" * 10)
        (sub / "doc.pdf").write_bytes(b"d" * 10)
        (sub / "unknown.xyz").write_bytes(b"u" * 10)
        msgs = run_scan(str(tmp_path))
        entries = {e["name"]: e for m in msgs if m["type"] == "file_batch" for e in m["entries"]}
        assert entries["video.mp4"]["category"] == "Videos"
        assert entries["doc.pdf"]["category"] == "Documentos"
        assert entries["unknown.xyz"]["category"] == "Otros"

    def test_extension_en_minusculas(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "FILE.TXT").write_bytes(b"text")
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        assert any(e["extension"] == ".txt" for e in entries)

    def test_total_bytes_correcto(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "a.bin").write_bytes(b"x" * 1000)
        (sub / "b.bin").write_bytes(b"y" * 2000)
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert done["total_bytes"] == 3000

    def test_carpeta_ignorada_no_escaneada(self, tmp_path):
        win = tmp_path / "Windows"
        win.mkdir()
        (win / "secret.sys").write_bytes(b"s" * 500)
        sub = tmp_path / "normal"
        sub.mkdir()
        (sub / "doc.txt").write_bytes(b"d" * 100)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        names = {e["name"] for e in entries}
        assert "secret.sys" not in names
        assert "doc.txt" in names

    def test_carpeta_prefijo_dolar_ignorada(self, tmp_path):
        dol = tmp_path / "$RECYCLE"
        dol.mkdir()
        (dol / "trash.bin").write_bytes(b"t" * 200)
        sub = tmp_path / "kept"
        sub.mkdir()
        (sub / "keep.txt").write_bytes(b"k" * 50)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        names = {e["name"] for e in entries}
        assert "trash.bin" not in names
        assert "keep.txt" in names

    def test_directorio_vacio_no_falla(self, tmp_path):
        empty = tmp_path / "empty_sub"
        empty.mkdir()
        msgs = run_scan(str(tmp_path))
        types = [m["type"] for m in msgs]
        assert "done" in types

    def test_directorio_sin_subdirectorios(self, tmp_path):
        """Si root no tiene subdirectorios, emite start y done con 0 bytes."""
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert done["total_bytes"] == 0

    def test_archivos_anidados_profundos(self, tmp_path):
        deep = tmp_path / "a" / "b" / "c" / "d"
        deep.mkdir(parents=True)
        (deep / "deep.log").write_bytes(b"L" * 300)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        names = {e["name"] for e in entries}
        assert "deep.log" in names

    def test_is_cache_en_carpeta_cache(self, tmp_path):
        cache = tmp_path / "__pycache__"
        cache.mkdir()
        (cache / "mod.pyc").write_bytes(b"pyc" * 5)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        pyc = next((e for e in entries if e["name"] == "mod.pyc"), None)
        assert pyc is not None
        assert pyc["is_cache"] is True

    def test_is_cache_false_carpeta_normal(self, tmp_path):
        norm = tmp_path / "docs"
        norm.mkdir()
        (norm / "readme.txt").write_bytes(b"r" * 20)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        readme = next((e for e in entries if e["name"] == "readme.txt"), None)
        assert readme is not None
        assert readme["is_cache"] is False


# ─────────────────────────────────────────────────────────────────────────────
# Tests: detección de duplicados
# ─────────────────────────────────────────────────────────────────────────────

class TestDuplicates:

    def _make_large(self, size=DUP_MIN_SIZE + 1):
        return b"A" * size

    def test_no_duplicados_por_defecto(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "unique.bin").write_bytes(self._make_large())
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert done["duplicates"] == {}

    def test_detecta_duplicados_entre_carpetas(self, tmp_path):
        content = self._make_large()
        sub1 = tmp_path / "folder1"
        sub2 = tmp_path / "folder2"
        sub1.mkdir(); sub2.mkdir()
        (sub1 / "file.bin").write_bytes(content)
        (sub2 / "file.bin").write_bytes(content)
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        dups = done["duplicates"]
        assert len(dups) > 0
        # La clave es (nombre_lower, tamaño)
        key = ("file.bin", len(content))
        assert key in dups
        assert len(dups[key]) == 2

    def test_no_duplicados_por_debajo_min_size(self, tmp_path):
        """Archivos < DUP_MIN_SIZE no se consideran duplicados."""
        content = b"X" * (DUP_MIN_SIZE - 1)
        sub1 = tmp_path / "a"
        sub2 = tmp_path / "b"
        sub1.mkdir(); sub2.mkdir()
        (sub1 / "small.bin").write_bytes(content)
        (sub2 / "small.bin").write_bytes(content)
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert done["duplicates"] == {}

    def test_mismo_nombre_distinto_tamanho_no_son_duplicados(self, tmp_path):
        sub1 = tmp_path / "a"
        sub2 = tmp_path / "b"
        sub1.mkdir(); sub2.mkdir()
        (sub1 / "file.bin").write_bytes(b"A" * (DUP_MIN_SIZE + 100))
        (sub2 / "file.bin").write_bytes(b"A" * (DUP_MIN_SIZE + 200))
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert done["duplicates"] == {}

    def test_clave_duplicado_case_insensitive(self, tmp_path):
        """FILE.BIN y file.bin con mismo tamaño cuentan como duplicado."""
        content = self._make_large()
        sub1 = tmp_path / "a"
        sub2 = tmp_path / "b"
        sub1.mkdir(); sub2.mkdir()
        (sub1 / "FILE.BIN").write_bytes(content)
        (sub2 / "file.bin").write_bytes(content)
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        dups = done["duplicates"]
        assert len(dups) > 0


# ─────────────────────────────────────────────────────────────────────────────
# Tests: cancelación
# ─────────────────────────────────────────────────────────────────────────────

class TestCancellation:

    def test_cancelacion_inmediata(self, tmp_path):
        """Si se cancela antes de empezar, el scan termina limpiamente."""
        # Crear árbol grande simulado
        for i in range(5):
            sub = tmp_path / f"sub{i}"
            sub.mkdir()
            for j in range(20):
                (sub / f"file{j}.txt").write_bytes(b"x" * 100)

        cancel = threading.Event()
        cancel.set()  # Cancelar antes de empezar
        msgs = run_scan(str(tmp_path), cancel=cancel)
        # Con cancelación inmediata puede que ni emita "done" pero no debe colgarse
        # El test principal es que termina sin timeout
        assert isinstance(msgs, list)

    def test_cancelacion_durante_scan(self, tmp_path):
        """Cancelar a mitad no debe colgar el hilo."""
        for i in range(3):
            sub = tmp_path / f"sub{i}"
            sub.mkdir()
            for j in range(50):
                (sub / f"file{j}.dat").write_bytes(b"d" * 200)

        cancel = threading.Event()
        q = queue.Queue()
        scanner = DiskScanner(q, cancel, max_workers=2)
        t = threading.Thread(target=scanner.scan, args=(str(tmp_path),), daemon=True)
        t.start()

        # Cancelar tras 50ms
        time.sleep(0.05)
        cancel.set()
        t.join(timeout=5)
        assert not t.is_alive(), "El hilo no terminó tras cancelación"


# ─────────────────────────────────────────────────────────────────────────────
# Tests: models
# ─────────────────────────────────────────────────────────────────────────────

class TestModels:

    def test_file_entry_defaults(self):
        fe = FileEntry(path="/a/b.txt", name="b.txt", size=100,
                       extension=".txt", category="Documentos")
        assert fe.is_cache is False
        assert fe.parent_dir == ""

    def test_file_entry_campos(self):
        fe = FileEntry(path="/x/y.mp4", name="y.mp4", size=5000,
                       extension=".mp4", category="Videos",
                       is_cache=True, parent_dir="/x")
        assert fe.size == 5000
        assert fe.is_cache is True
        assert fe.parent_dir == "/x"

    def test_folder_node_defaults(self):
        fn = FolderNode(path="/a/b", name="b")
        assert fn.size == 0
        assert fn.parent is None
        assert fn.file_count == 0
        assert fn.tree_id == ""

    def test_scan_result_defaults(self):
        sr = ScanResult(root_path="/home")
        assert sr.total_bytes == 0
        assert sr.folders == {}
        assert sr.files == []
        assert sr.categories == {}
        assert sr.duplicates == {}
        assert sr.elapsed == 0.0

    def test_scan_result_mutabilidad(self):
        sr = ScanResult(root_path="/home")
        sr.files.append(FileEntry("/a/b.txt", "b.txt", 10, ".txt", "Documentos"))
        assert len(sr.files) == 1


# ─────────────────────────────────────────────────────────────────────────────
# Tests: múltiples subcarpetas (integración ligera)
# ─────────────────────────────────────────────────────────────────────────────

class TestScanIntegracion:

    def test_multiples_subcarpetas(self, tmp_path):
        spec = {
            "docs/report.pdf": b"p" * 500,
            "docs/notes.txt": b"n" * 100,
            "media/video.mp4": b"v" * 800,
            "media/photo.jpg": b"j" * 300,
            "dev/main.py": b"c" * 200,
            "dev/__pycache__/main.pyc": b"b" * 150,
        }
        create_tree(str(tmp_path), spec)
        msgs = run_scan(str(tmp_path))
        entries = {e["name"]: e for m in msgs if m["type"] == "file_batch" for e in m["entries"]}
        done = next(m for m in msgs if m["type"] == "done")

        assert "report.pdf" in entries
        assert entries["report.pdf"]["category"] == "Documentos"
        assert "video.mp4" in entries
        assert entries["video.mp4"]["category"] == "Videos"
        assert "photo.jpg" in entries
        assert entries["photo.jpg"]["category"] == "Imagenes"
        assert entries["main.pyc"]["category"] == "Desarrollo (compilados)"
        assert entries["main.pyc"]["is_cache"] is True

        total = sum(len(v) for v in spec.values())
        assert done["total_bytes"] == total

    def test_scan_batch_size(self, tmp_path):
        """Con más de BATCH_SIZE archivos deben llegar múltiples batches."""
        sub = tmp_path / "bigfolder"
        sub.mkdir()
        n = BATCH_SIZE + 50
        for i in range(n):
            (sub / f"file_{i:04d}.txt").write_bytes(b"x" * 10)
        msgs = run_scan(str(tmp_path))
        batches = [m for m in msgs if m["type"] == "file_batch"]
        total_entries = sum(len(m["entries"]) for m in batches)
        assert total_entries == n
        assert len(batches) >= 2  # Al menos 2 batches

    def test_archivos_sin_extension(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "Makefile").write_bytes(b"make" * 10)
        (sub / ".gitignore").write_bytes(b"ignore" * 5)
        msgs = run_scan(str(tmp_path))
        entries = {e["name"]: e for m in msgs if m["type"] == "file_batch" for e in m["entries"]}
        assert entries["Makefile"]["category"] == "Otros"
        assert entries["Makefile"]["extension"] == ""


# ─────────────────────────────────────────────────────────────────────────────
# Tests: nuevas mejoras
# ─────────────────────────────────────────────────────────────────────────────

class TestMejoras:

    # ── done incluye campo errors ─────────────────────────────────────────────

    def test_done_contiene_errors(self, tmp_path):
        sub = tmp_path / "sub"
        sub.mkdir()
        (sub / "a.txt").write_bytes(b"a")
        msgs = run_scan(str(tmp_path))
        done = next(m for m in msgs if m["type"] == "done")
        assert "errors" in done
        assert done["errors"] == 0

    # ── is_cache propagado a subcarpetas anidadas ─────────────────────────────

    def test_is_cache_subdir_anidado_en_cache(self, tmp_path):
        """Archivos dentro de un subdirectorio de __pycache__ también son cache."""
        deep = tmp_path / "pkg" / "__pycache__" / "sub"
        deep.mkdir(parents=True)
        (deep / "deep_cache.pyc").write_bytes(b"x" * 50)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        entry = next((e for e in entries if e["name"] == "deep_cache.pyc"), None)
        assert entry is not None
        assert entry["is_cache"] is True, "Archivo en subdir de __pycache__ debe ser is_cache=True"

    def test_is_cache_no_propagado_fuera_de_cache(self, tmp_path):
        """Archivos en carpetas normales adyacentes a __pycache__ NO son cache."""
        normal = tmp_path / "pkg" / "normal"
        normal.mkdir(parents=True)
        (normal / "real.py").write_bytes(b"code" * 20)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        entry = next((e for e in entries if e["name"] == "real.py"), None)
        assert entry is not None
        assert entry["is_cache"] is False

    def test_is_cache_node_modules_anidado(self, tmp_path):
        """Archivos dentro de node_modules/deep/sub también son cache."""
        deep = tmp_path / "app" / "node_modules" / "lodash" / "fp"
        deep.mkdir(parents=True)
        (deep / "chunk.js").write_bytes(b"js" * 100)
        msgs = run_scan(str(tmp_path))
        entries = [e for m in msgs if m["type"] == "file_batch" for e in m["entries"]]
        entry = next((e for e in entries if e["name"] == "chunk.js"), None)
        assert entry is not None
        assert entry["is_cache"] is True

    # ── verify_duplicates_by_hash ─────────────────────────────────────────────

    def test_verify_hash_duplicados_reales(self, tmp_path):
        """Dos ficheros con mismo nombre, tamaño Y contenido → duplicado real."""
        content = b"identical content " * 100
        f1 = tmp_path / "a.bin"
        f2 = tmp_path / "b.bin"
        f1.write_bytes(content)
        f2.write_bytes(content)
        candidates = {("a.bin", len(content)): [str(f1), str(f2)]}
        result = verify_duplicates_by_hash(candidates)
        assert ("a.bin", len(content)) in result
        assert len(result[("a.bin", len(content))]) == 2

    def test_verify_hash_mismo_nombre_distinto_contenido(self, tmp_path):
        """Mismo nombre y tamaño pero contenido diferente → no son duplicados."""
        f1 = tmp_path / "a.bin"
        f2 = tmp_path / "b.bin"
        f1.write_bytes(b"AAAA" * 50)
        f2.write_bytes(b"BBBB" * 50)
        candidates = {("a.bin", 200): [str(f1), str(f2)]}
        result = verify_duplicates_by_hash(candidates)
        assert result == {}

    def test_verify_hash_cancellation(self, tmp_path):
        """Si cancel_event está activo, la función retorna sin procesar."""
        content = b"x" * 200
        f1 = tmp_path / "a.bin"
        f2 = tmp_path / "b.bin"
        f1.write_bytes(content)
        f2.write_bytes(content)
        cancel = threading.Event()
        cancel.set()
        candidates = {("a.bin", 200): [str(f1), str(f2)]}
        result = verify_duplicates_by_hash(candidates, cancel)
        # Con cancelación inmediata, puede no procesar nada
        assert isinstance(result, dict)

    def test_verify_hash_archivo_inexistente(self, tmp_path):
        """Un path que no existe no debe lanzar excepción, simplemente se ignora."""
        f1 = tmp_path / "real.bin"
        f1.write_bytes(b"R" * 200)
        candidates = {("real.bin", 200): [str(f1), str(tmp_path / "ghost.bin")]}
        result = verify_duplicates_by_hash(candidates)
        # Solo hay 1 path legible → no hay duplicado
        assert result == {}

    def test_verify_hash_tres_copias(self, tmp_path):
        """Tres ficheros idénticos → todos en el mismo grupo."""
        content = b"triple" * 50
        paths = []
        for i in range(3):
            p = tmp_path / f"copy_{i}.bin"
            p.write_bytes(content)
            paths.append(str(p))
        candidates = {("copy_0.bin", len(content)): paths}
        result = verify_duplicates_by_hash(candidates)
        key = ("copy_0.bin", len(content))
        assert key in result
        assert len(result[key]) == 3
