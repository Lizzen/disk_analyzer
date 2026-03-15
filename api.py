import asyncio
import json
import logging
import queue
import threading
import os
import sys
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

# Ensure project root is in path so chatbot/* imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Logging ───────────────────────────────────────────────────────────────────
_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modern_debug.log")
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(_LOG_FILE, encoding="utf-8", mode="a"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("api")
log.info("=" * 60)
log.info("API STARTED — pid=%d", os.getpid())

from core.scanner import DiskScanner
from core.models import ScanResult, FileEntry, FolderNode

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Restringimos CORS a orígenes loopback (localhost/127.0.0.1) en cualquier puerto.
    # Esto sigue funcionando con el puerto dinámico de pywebview, pero evita que
    # páginas web arbitrarias puedan hacer requests cross-origin a la API local.
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── Estado global ──────────────────────────────────────────────────────────────

current_scan_thread:  Optional[threading.Thread] = None
current_cancel_event: Optional[threading.Event]  = None
last_scan_result:     Optional[ScanResult]        = None   # persiste el último scan


# ── Modelos ────────────────────────────────────────────────────────────────────

_VALID_PROVIDERS = {"gemini", "groq", "claude", "ollama"}


class ChatRequest(BaseModel):
    message:       str        = Field(..., min_length=1, max_length=8000)
    provider:      str        = Field("gemini", pattern=r"^(gemini|groq|claude|ollama)$")
    selected_path: str        = Field("", max_length=1000)
    history:       list[dict] = Field(default_factory=list, max_length=40)
    temperature:   float      = Field(0.7, ge=0.0, le=2.0)
    max_tokens:    int        = Field(1024, ge=10, le=8192)


class ConfigRequest(BaseModel):
    GEMINI_API_KEY:    Optional[str] = Field(None, max_length=500)
    ANTHROPIC_API_KEY: Optional[str] = Field(None, max_length=500)
    GROQ_API_KEY:      Optional[str] = Field(None, max_length=500)
    DEFAULT_PROVIDER:  Optional[str] = Field(None, pattern=r"^(gemini|groq|claude|ollama)?$")
    GEMINI_MODEL:      Optional[str] = Field(None, max_length=100)
    GROQ_MODEL:        Optional[str] = Field(None, max_length=100)
    CLAUDE_MODEL:      Optional[str] = Field(None, max_length=100)
    OLLAMA_MODEL:      Optional[str] = Field(None, max_length=100)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_provider(provider_id: str):
    """Instancia el provider solicitado."""
    from chatbot.providers.gemini import GeminiProvider
    from chatbot.providers.groq_p import GroqProvider
    from chatbot.providers.claude import ClaudeProvider
    from chatbot.providers.ollama import OllamaProvider
    from chatbot import config as cfg

    mapping = {
        "gemini": GeminiProvider,
        "groq":   GroqProvider,
        "claude": ClaudeProvider,
        "ollama": lambda: OllamaProvider(cfg.OLLAMA_MODEL),
    }
    factory = mapping.get(provider_id, GeminiProvider)
    return factory() if not callable(factory()) else factory()


def _build_scan_result_from_ws_data(data: dict) -> ScanResult:
    """
    Reconstruye un ScanResult a partir del dict acumulado en el WebSocket
    (mensaje 'done' contiene totales; las carpetas/archivos se acumulan en last_scan_result).
    """
    return last_scan_result or ScanResult(root_path="")


def run_scanner(path: str, q: queue.Queue, cancel_event: threading.Event):
    log.info("SCANNER THREAD START  path=%s", path)
    scanner = DiskScanner(q, cancel_event)
    try:
        scanner.scan(path)
        log.info("SCANNER THREAD DONE  path=%s  queue_size=%d", path, q.qsize())
    except Exception as e:
        log.exception("SCANNER THREAD EXCEPTION  path=%s", path)
        q.put({"type": "error", "path": path, "msg": str(e)})


# ── WebSocket: escaneo ─────────────────────────────────────────────────────────

def _is_loopback_origin(origin: str) -> bool:
    """Devuelve True si el Origin viene de loopback (cualquier puerto) o está vacío (pywebview prod)."""
    if not origin:
        return True
    # Permitir cualquier puerto en 127.0.0.1 o localhost (pywebview usa puerto dinámico)
    return origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:")


@app.websocket("/ws/scan")
async def scan_socket(websocket: WebSocket):
    global current_scan_thread, current_cancel_event, last_scan_result

    origin = websocket.headers.get("origin", "")
    if not _is_loopback_origin(origin):
        await websocket.close(code=1008, reason="Unauthorized origin")
        log.warning("WS rejected non-loopback origin: %s", origin)
        return

    await websocket.accept()
    log.info("WS /ws/scan accepted  client=%s", websocket.client)

    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("action")
            log.info("WS command=%s  action=%s", command, data.get("action"))

            if command == "start":
                path = data.get("path", "C:/")
                # Normalizar y validar que sea una ruta absoluta real
                path = os.path.abspath(path)
                path = os.path.normpath(path)
                if not os.path.isabs(path) or not os.path.exists(path):
                    await websocket.send_json(
                        [
                            {
                                "type": "done",
                                "msg": "Ruta inválida o no existe",
                                "errors": ["Ruta inválida o no existe"],
                            }
                        ]
                    )
                    continue

                if current_cancel_event:
                    log.info("WS cancelling previous scan")
                    current_cancel_event.set()
                if current_scan_thread:
                    current_scan_thread.join(timeout=1.0)

                last_scan_result = ScanResult(root_path=path)

                q = queue.Queue()
                current_cancel_event = threading.Event()
                current_scan_thread = threading.Thread(
                    target=run_scanner,
                    args=(path, q, current_cancel_event),
                    daemon=True,
                )
                current_scan_thread.start()
                log.info("WS scanner thread started  path=%s", path)
                asyncio.create_task(flush_queue_to_ws(q, websocket, current_cancel_event))

            elif command == "cancel":
                log.info("WS cancel received")
                if current_cancel_event:
                    current_cancel_event.set()

    except WebSocketDisconnect:
        log.warning("WS disconnected — cancelling scan")
        if current_cancel_event:
            current_cancel_event.set()


def _sanitize_msg(m: dict) -> dict:
    """
    Convierte el mensaje del scanner a un dict JSON-serializable.
    El problema principal: el mensaje 'done' tiene duplicates con claves tuple (name, size),
    que no son serializables en JSON. Las convertimos a [name, size].
    """
    if m.get("type") != "done":
        return m
    raw_dups = m.get("duplicates", {})
    safe_dups = [
        {"name": k[0], "size": k[1], "paths": v}
        for k, v in raw_dups.items()
    ]
    return {**m, "duplicates": safe_dups}


async def flush_queue_to_ws(q: queue.Queue, websocket: WebSocket, cancel_event: threading.Event):
    global last_scan_result
    msgs_sent   = 0
    files_sent  = 0
    t_start     = time.time()
    last_log    = t_start

    log.info("FLUSH START")

    while not cancel_event.is_set():
        try:
            if q.empty():
                # Log periódico cada 5s para saber que el flush sigue vivo
                now = time.time()
                if now - last_log >= 5:
                    log.debug("FLUSH alive  msgs_sent=%d  files_sent=%d  elapsed=%.1fs  queue_empty=True  scanner_alive=%s",
                              msgs_sent, files_sent, now - t_start,
                              current_scan_thread.is_alive() if current_scan_thread else "N/A")
                    last_log = now
                # Si el scanner terminó y la queue está vacía, salimos
                if current_scan_thread and not current_scan_thread.is_alive():
                    log.warning("FLUSH scanner thread dead but no 'done' msg — queue empty, exiting flush")
                    break
                await asyncio.sleep(0.05)
                continue

            msgs = []
            while not q.empty() and len(msgs) < 500:
                msgs.append(q.get_nowait())

            if msgs:
                types_in_batch = [m.get("type") for m in msgs]
                log.debug("FLUSH batch=%d  types=%s", len(msgs), types_in_batch)

                if last_scan_result is not None:
                    for m in msgs:
                        t = m.get("type")
                        if t == "folder":
                            path   = m.get("path", "")
                            parent = m.get("parent", "")
                            size   = m.get("size", 0)
                            fc     = m.get("file_count", 0)
                            if path in last_scan_result.folders:
                                last_scan_result.folders[path].size       += size
                                last_scan_result.folders[path].file_count += fc
                            else:
                                last_scan_result.folders[path] = FolderNode(
                                    path=path,
                                    name=os.path.basename(path) or path,
                                    size=size,
                                    parent=parent,
                                    file_count=fc,
                                )
                        elif t == "file_batch":
                            batch_entries = m.get("entries", [])
                            files_sent += len(batch_entries)
                            # Store raw dicts — avoids 100k Pydantic object constructions
                            last_scan_result.files.extend(batch_entries)
                        elif t == "done":
                            last_scan_result.total_bytes = m.get("total_bytes", 0)
                            last_scan_result.elapsed     = m.get("elapsed", 0.0)
                            last_scan_result.duplicates  = m.get("duplicates", {})
                            log.info("FLUSH got 'done'  total_bytes=%d  elapsed=%.2fs  files_sent=%d",
                                     last_scan_result.total_bytes, last_scan_result.elapsed, files_sent)

                safe_msgs = [_sanitize_msg(m) for m in msgs]
                await websocket.send_json(safe_msgs)
                msgs_sent += len(msgs)

                for msg in msgs:
                    if msg.get("type") == "done":
                        log.info("FLUSH complete  total_msgs=%d  files=%d  elapsed=%.1fs",
                                 msgs_sent, files_sent, time.time() - t_start)
                        return
                    if msg.get("type") == "error" and msg.get("path") == last_scan_result.root_path:
                        log.error("FLUSH root error: %s", msg.get("msg"))
                        return

        except Exception:
            log.exception("FLUSH exception — exiting")
            break

    log.info("FLUSH ended  cancelled=%s  msgs_sent=%d", cancel_event.is_set(), msgs_sent)


# ── Chat SSE ───────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Endpoint de chat con streaming SSE.
    Devuelve text/event-stream con chunks de la respuesta del LLM.
    """
    from chatbot.context_builder import build_messages
    from chatbot import config as cfg

    # Seleccionar provider
    pid = req.provider or cfg.DEFAULT_PROVIDER
    try:
        if pid == "gemini":
            from chatbot.providers.gemini import GeminiProvider
            provider = GeminiProvider()
        elif pid == "groq":
            from chatbot.providers.groq_p import GroqProvider
            provider = GroqProvider()
        elif pid == "claude":
            from chatbot.providers.claude import ClaudeProvider
            provider = ClaudeProvider()
        elif pid == "ollama":
            from chatbot.providers.ollama import OllamaProvider
            provider = OllamaProvider(cfg.OLLAMA_MODEL)
        else:
            from chatbot.providers.gemini import GeminiProvider
            provider = GeminiProvider()
    except Exception as e:
        log.exception("chat: provider init failed")
        async def _err():
            yield f"data: {json.dumps({'error': 'Error al inicializar el proveedor de IA.'})}\n\n"
        return StreamingResponse(_err(), media_type="text/event-stream")

    # Verificar disponibilidad
    ok, reason = provider.is_available()
    if not ok:
        async def _unavail():
            yield f"data: {json.dumps({'error': reason})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_unavail(), media_type="text/event-stream")

    messages = build_messages(
        history=req.history,
        user_input=req.message,
        scan=last_scan_result,
        selected_path=req.selected_path,
    )

    # Streaming en thread aparte (los providers son síncronos)
    chunk_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _run():
        try:
            def on_chunk(text: str):
                loop.call_soon_threadsafe(chunk_queue.put_nowait, {"chunk": text})
            provider.send(messages, on_chunk=on_chunk,
                          temperature=req.temperature, max_tokens=req.max_tokens)
        except Exception as e:
            log.exception("chat: streaming thread error")
            loop.call_soon_threadsafe(chunk_queue.put_nowait, {"error": "Error al generar respuesta."})
        finally:
            loop.call_soon_threadsafe(chunk_queue.put_nowait, None)  # sentinel

    threading.Thread(target=_run, daemon=True).start()

    async def _stream():
        while True:
            item = await chunk_queue.get()
            if item is None:
                yield "data: [DONE]\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(_stream(), media_type="text/event-stream")


# ── Config ─────────────────────────────────────────────────────────────────────

@app.get("/api/config")
def get_config():
    """Devuelve la configuración guardada (sin las API keys completas por seguridad)."""
    from chatbot import config as cfg
    saved = cfg.get_config()
    # Enmascarar keys: mostrar solo si tienen valor
    def _mask(key: str) -> bool:
        return bool(saved.get(key, ""))
    return {
        "has_gemini_key":    _mask("GEMINI_API_KEY"),
        "has_anthropic_key": _mask("ANTHROPIC_API_KEY"),
        "has_groq_key":      _mask("GROQ_API_KEY"),
        "DEFAULT_PROVIDER":  saved.get("DEFAULT_PROVIDER", "gemini"),
        "GEMINI_MODEL":      saved.get("GEMINI_MODEL", "gemini-2.0-flash-lite"),
        "GROQ_MODEL":        saved.get("GROQ_MODEL", "llama-3.1-70b-versatile"),
        "CLAUDE_MODEL":      saved.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001"),
        "OLLAMA_MODEL":      saved.get("OLLAMA_MODEL", "llama3.2"),
    }


@app.post("/api/config")
def save_config(req: ConfigRequest):
    """Guarda la configuración de API keys y modelos."""
    from chatbot import config as cfg
    keys = {}
    if req.GEMINI_API_KEY    is not None: keys["GEMINI_API_KEY"]    = req.GEMINI_API_KEY
    if req.ANTHROPIC_API_KEY is not None: keys["ANTHROPIC_API_KEY"] = req.ANTHROPIC_API_KEY
    if req.GROQ_API_KEY      is not None: keys["GROQ_API_KEY"]      = req.GROQ_API_KEY

    cfg.set_keys(
        keys=keys,
        default_provider=req.DEFAULT_PROVIDER or "",
        gemini_model=req.GEMINI_MODEL  or "",
        groq_model=req.GROQ_MODEL      or "",
        claude_model=req.CLAUDE_MODEL  or "",
        ollama_model=req.OLLAMA_MODEL  or "",
    )
    return {"ok": True}


@app.get("/api/providers/status")
def providers_status():
    """Devuelve el estado de disponibilidad de cada provider."""
    from chatbot.config import all_providers_status
    status = all_providers_status()
    return {pid: {"available": ok, "reason": msg} for pid, (ok, msg) in status.items()}


@app.get("/api/ollama/models")
def ollama_models():
    """Lista los modelos Ollama instalados localmente."""
    try:
        from chatbot.providers.ollama import OllamaProvider
        models = OllamaProvider().available_models()
        return {"models": models, "ok": True}
    except Exception as e:
        log.warning("ollama_models error: %s", e)
        return {"models": [], "ok": False, "error": "No se pudo conectar con Ollama"}


def _validate_file_path(path: str) -> tuple[bool, str]:
    """
    Valida que una ruta sea segura para operar:
    - No vacía ni demasiado larga
    - Ruta absoluta y normalizada
    - Pertenece a una unidad del sistema reconocida
    Devuelve (ok, error_msg).
    """
    if not path or not isinstance(path, str):
        return False, "path requerido"
    if len(path) > 1000:
        return False, "path demasiado largo"
    norm = os.path.normpath(os.path.abspath(path))
    # Debe ser ruta absoluta
    if not os.path.isabs(norm):
        return False, "path debe ser absoluto"
    # La unidad debe ser una unidad del sistema reconocida
    drive = os.path.splitdrive(norm)[0].upper()
    known = [d.upper() for d in _get_system_drives()]
    if sys.platform == "win32" and drive not in known:
        return False, "unidad no reconocida"
    return True, norm


@app.post("/api/open-in-explorer")
def open_in_explorer_endpoint(body: dict):
    """Abre un archivo/carpeta en el Explorador de Windows."""
    ok, result = _validate_file_path(body.get("path", ""))
    if not ok:
        return {"ok": False, "error": result}
    try:
        from core.trash import open_in_explorer
        open_in_explorer(result)
        return {"ok": True}
    except Exception:
        log.exception("open_in_explorer failed for: %s", result)
        return {"ok": False, "error": "No se pudo abrir en el explorador"}


@app.post("/api/trash")
def trash_endpoint(body: dict):
    """Mueve un archivo/carpeta a la Papelera de reciclaje."""
    ok, result = _validate_file_path(body.get("path", ""))
    if not ok:
        return {"ok": False, "error": result}
    from core.trash import send_to_recycle_bin
    ok2, err = send_to_recycle_bin(result)
    return {"ok": ok2, "error": err}


@app.post("/api/delete-permanent")
def delete_permanent_endpoint(body: dict):
    """Elimina un archivo/carpeta de forma permanente (sin papelera)."""
    ok, result = _validate_file_path(body.get("path", ""))
    if not ok:
        return {"ok": False, "error": result}
    from core.trash import delete_permanently
    ok2, err = delete_permanently(result)
    return {"ok": ok2, "error": err}


# ── Disco ──────────────────────────────────────────────────────────────────────

def _get_system_drives() -> list[str]:
    """Obtiene las unidades disponibles usando la API de Windows sin shell."""
    drives = []
    if sys.platform == "win32":
        try:
            import ctypes
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                if bitmask & 1:
                    drives.append(f"{letter}:")
                bitmask >>= 1
        except Exception:
            drives = ["C:"]
    else:
        drives = ["/"]
    return drives


@app.get("/api/drives")
def get_drives():
    return {"drives": _get_system_drives()}


@app.get("/api/disk-info")
def get_disk_info(path: str = "C:/"):
    """Devuelve uso de disco para la ruta dada."""
    import shutil

    # Validar que la ruta corresponde a una unidad/raíz conocida del sistema
    norm = os.path.normpath(path)
    known_drives = _get_system_drives()
    # Permitir la raíz de cualquier unidad reconocida (ej: "C:" o "C:\")
    drive_of_path = os.path.splitdrive(norm)[0].upper()
    if drive_of_path not in [d.upper() for d in known_drives] and norm not in ["/", "\\"]:
        return {"error": "Ruta no válida"}

    try:
        total, used, free = shutil.disk_usage(norm)
        pct = round(used / total * 100, 1) if total > 0 else 0
        return {
            "path":  norm,
            "total": total,
            "used":  used,
            "free":  free,
            "pct":   pct,
        }
    except Exception as e:
        log.warning("disk_info error for path %s: %s", norm, e)
        return {"error": "No se pudo obtener información del disco"}


# ── Frontend estático (dist/) ──────────────────────────────────────────────────
_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

if os.path.isdir(_DIST):
    # Servir assets con no-cache para que pywebview siempre cargue la versión nueva
    from starlette.responses import Response as _R
    from starlette.staticfiles import StaticFiles as _SF

    class _NoCacheStaticFiles(_SF):
        async def __call__(self, scope, receive, send):
            # Inyectar no-cache en todos los assets
            async def send_no_cache(msg):
                if msg["type"] == "http.response.start":
                    headers = dict(msg.get("headers", []))
                    headers[b"cache-control"] = b"no-store, no-cache, must-revalidate"
                    headers[b"pragma"]        = b"no-cache"
                    msg = {**msg, "headers": list(headers.items())}
                await send(msg)
            await super().__call__(scope, receive, send_no_cache)

    app.mount("/assets", _NoCacheStaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/")
    def serve_index():
        resp = FileResponse(os.path.join(_DIST, "index.html"), media_type="text/html")
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        resp.headers["Pragma"]        = "no-cache"
        return resp

    @app.get("/favicon.svg")
    def serve_favicon():
        f = os.path.join(_DIST, "favicon.svg")
        if os.path.isfile(f):
            return FileResponse(f)
        return Response(status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
