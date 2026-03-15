"""
Construye el system prompt y el contexto del escaneo para el LLM.

El LLM recibe:
  - Metadatos del scan: ruta raíz, total bytes, carpetas top, tiempo
  - Top 50 archivos más grandes con: nombre, tamaño, categoría, extensión, ruta
  - Top 10 carpetas más grandes
  - Resumen por categoría
  - Duplicados detectados (si los hay)
  - Archivo o carpeta seleccionada actualmente (contexto extra)

NO se envía el contenido de ningún fichero, solo sus metadatos.
"""

from __future__ import annotations
from core.models import ScanResult, FileEntry, FolderNode
from utils.formatters import format_size

# Límite de archivos a incluir en el contexto para no saturar el contexto del LLM
_TOP_FILES    = 60
_TOP_FOLDERS  = 15
_TOP_DUPS     = 10


SYSTEM_PROMPT = """\
Eres un asistente experto en análisis de disco y gestión de archivos para Windows.
Tienes acceso a los METADATOS del último escaneo de disco del usuario: nombres de archivos, \
tamaños, extensiones, categorías y rutas. NO tienes acceso al contenido de los archivos.

Tu rol es:
- Explicar para qué sirven archivos o carpetas específicos
- Indicar si un archivo/carpeta es importante o se puede eliminar de forma segura
- Identificar qué ocupa más espacio y sugerir cómo liberar disco
- Explicar categorías de archivos (cache, temporales, instaladores, etc.)
- Advertir sobre archivos del sistema que no se deben tocar
- Ayudar a interpretar duplicados y tamaños inusuales

Reglas importantes:
- Nunca afirmes con certeza que un archivo específico es seguro eliminar si es del sistema operativo
- Si el usuario pregunta por algo fuera del escaneo, indícalo amablemente
- Responde siempre en español
- Sé conciso pero completo; usa listas cuando sea útil
"""


def build_context(
    scan: ScanResult | None,
    selected_path: str = "",
) -> str:
    """
    Genera el bloque de contexto del scan para incluir en el system prompt.
    Si scan es None, retorna un aviso de que no hay datos.
    """
    if scan is None or not scan.root_path:
        return (
            "\n\n[CONTEXTO DEL DISCO]\n"
            "No hay ningún escaneo realizado todavía. "
            "El usuario puede escanear una carpeta usando el botón Escanear."
        )

    lines: list[str] = []
    lines.append("\n\n[CONTEXTO DEL DISCO — ÚLTIMO ESCANEO]")
    lines.append(f"Ruta escaneada: {scan.root_path}")
    lines.append(f"Espacio total analizado: {format_size(scan.total_bytes)}")
    lines.append(f"Carpetas encontradas: {len(scan.folders):,}")
    lines.append(f"Archivos encontrados: {len(scan.files):,}")
    if scan.elapsed:
        lines.append(f"Tiempo de escaneo: {scan.elapsed:.1f}s")

    # ── helpers para acceso a FileEntry o dict ───────────────────────────────
    def _get(f, key):
        return f[key] if isinstance(f, dict) else getattr(f, key)

    # ── Resumen por categoría ─────────────────────────────────────────────────
    cat_totals: dict[str, int] = {}
    for f in scan.files:
        cat  = _get(f, "category")
        size = _get(f, "size")
        cat_totals[cat] = cat_totals.get(cat, 0) + size

    if cat_totals:
        lines.append("\nResumen por categoría (espacio):")
        for cat, total in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True):
            pct = total / scan.total_bytes * 100 if scan.total_bytes > 0 else 0
            lines.append(f"  {cat}: {format_size(total)} ({pct:.1f}%)")

    # ── Top carpetas más grandes ──────────────────────────────────────────────
    top_folders = sorted(scan.folders.values(), key=lambda n: n.size, reverse=True)[:_TOP_FOLDERS]
    if top_folders:
        lines.append(f"\nTop {len(top_folders)} carpetas más grandes:")
        for node in top_folders:
            pct = node.size / scan.total_bytes * 100 if scan.total_bytes > 0 else 0
            lines.append(f"  {node.path}  →  {format_size(node.size)} ({pct:.1f}%)"
                         f"  [{node.file_count} archivos]")

    # ── Top archivos más grandes ──────────────────────────────────────────────
    top_files = sorted(scan.files, key=lambda f: _get(f, "size"), reverse=True)[:_TOP_FILES]
    if top_files:
        lines.append(f"\nTop {len(top_files)} archivos más grandes:")
        for f in top_files:
            cache_tag = "  [CACHE]" if _get(f, "is_cache") else ""
            lines.append(
                f"  {_get(f,'name')}  |  {format_size(_get(f,'size'))}  |  {_get(f,'category')}"
                f"  |  {_get(f,'extension') or 'sin ext'}{cache_tag}"
                f"\n    Ruta: {_get(f,'path')}"
            )

    # ── Duplicados ────────────────────────────────────────────────────────────
    if scan.duplicates:
        dups = sorted(
            scan.duplicates.items(),
            key=lambda x: x[0][1] * (len(x[1]) - 1),
            reverse=True,
        )[:_TOP_DUPS]
        lines.append(f"\nDuplicados detectados (top {len(dups)} por espacio desperdiciado):")
        for (name, size), paths in dups:
            wasted = size * (len(paths) - 1)
            lines.append(f"  '{name}'  {format_size(size)} c/u  ×{len(paths)} copias"
                         f"  →  {format_size(wasted)} desperdiciados")
            for p in paths[:3]:
                lines.append(f"    • {p}")
            if len(paths) > 3:
                lines.append(f"    • … +{len(paths)-3} más")

    # ── Elemento seleccionado actualmente ─────────────────────────────────────
    if selected_path:
        lines.append(f"\nElemento seleccionado actualmente por el usuario: {selected_path}")
        # Buscar si es un archivo conocido
        for f in scan.files:
            if _get(f, "path") == selected_path:
                lines.append(
                    f"  Detalles: {_get(f,'name')}  |  {format_size(_get(f,'size'))}"
                    f"  |  {_get(f,'category')}  |  {_get(f,'extension')}"
                    + ("  [CACHE/TEMP]" if _get(f, "is_cache") else "")
                )
                break
        # Buscar si es una carpeta
        node = scan.folders.get(selected_path)
        if node:
            pct = node.size / scan.total_bytes * 100 if scan.total_bytes > 0 else 0
            lines.append(
                f"  Detalles carpeta: {format_size(node.size)} ({pct:.1f}%)"
                f"  |  {node.file_count} archivos"
            )

    return "\n".join(lines)


def build_messages(
    history: list[dict],
    user_input: str,
    scan: ScanResult | None,
    selected_path: str = "",
) -> list:
    """
    Construye la lista de mensajes para enviar al LLM.
    history: lista de {"role": "user"|"assistant", "content": str}
    """
    from chatbot.providers.base import Message
    from chatbot import config

    context = build_context(scan, selected_path)
    system  = SYSTEM_PROMPT + context

    msgs: list[Message] = [Message(role="system", content=system)]

    # Historial reciente (excluir el system)
    max_hist = config.MAX_HISTORY_MESSAGES
    for h in history[-max_hist:]:
        msgs.append(Message(role=h["role"], content=h["content"]))

    msgs.append(Message(role="user", content=user_input))
    return msgs
