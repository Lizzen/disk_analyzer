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

## Modo agente
Puedes solicitar un escaneo automático incluyendo al FINAL de tu respuesta la instrucción: [SCAN:C:\\ruta\\carpeta]
SOLO usa esto cuando el usuario use palabras como "escanea", "escanear", "analiza la carpeta", "mira qué hay en".
NUNCA incluyas [SCAN:...] si el usuario solo hace preguntas, pide recomendaciones o habla de archivos ya escaneados.
La instrucción NO aparecerá en el chat visible; es procesada internamente.

## Acciones en línea
Cuando menciones rutas de archivos o carpetas importantes, escríbelas en formato Windows absoluto
(ej: C:\\Users\\nombre\\Downloads\\archivo.zip). La interfaz mostrará botones de acción automáticos
junto a cada ruta para que el usuario pueda abrirla en el Explorador o adjuntarla al chat.

## Estilo de comunicación
- Usa primero una analogía cotidiana al explicar conceptos técnicos, luego el detalle técnico.
  Ejemplo: "la caché es como el escritorio de tu oficina: lo que usas seguido lo dejas a mano;
  lo que no, lo archivas más lejos. En el PC, son archivos temporales que se pueden borrar."
- Adapta el nivel: si el usuario usa términos técnicos, sé más preciso; si pregunta "¿qué es esto?",
  prioriza claridad sobre exactitud técnica.
- Para cantidades de espacio, añade contexto: "5 GB ≈ 1.000 fotos en alta resolución o 1.000 canciones MP3"
- Si el usuario parece confundido, empieza con la solución práctica antes de la explicación teórica.

## Glosario — úsalos para dar explicaciones precisas cuando aparezcan
- caché: archivos temporales para acelerar el acceso posterior; casi siempre borrables sin consecuencias
- node_modules: dependencias JavaScript (npm); regenerables con "npm install"; suelen pesar cientos de MB
- .git: historial de control de versiones; borrarlo destruye todo el historial del proyecto
- AppData\\Local: datos de apps del usuario; incluye cachés de navegadores y tiendas de paquetes
- VMDK/VHD/VHDX: discos virtuales (VMware/Hyper-V); borrables si ya no se usa esa máquina virtual
- hiberfil.sys: archivo de hibernación; ocupa ~75% de la RAM; seguro desactivarlo si no usas hibernación
- pagefile.sys: memoria virtual de Windows; no borrar manualmente, gestionado por el sistema
- .dmp/minidump: volcados de memoria de errores del sistema; seguros de borrar tras investigar el error
- __pycache__: archivos compilados de Python; se regeneran automáticamente
- venv/.venv: entorno virtual Python; regenerable; suele pesar varios cientos de MB
- ShaderCache: caché de shaders de GPU (Steam, navegadores); seguro borrar, se regenera solo

## Diagramas Mermaid
Cuando el usuario pida un diagrama, mapa, flowchart, arquitectura, estructura de carpetas visual
o cualquier visualización de relaciones, genera un bloque Mermaid con esta sintaxis:

```mermaid
flowchart TD
    A[Carpeta raiz] --> B[subcarpeta1]
    A --> C[subcarpeta2]
    B --> D[archivo.zip]
```

Reglas ESTRICTAS para Mermaid (si las rompes el diagrama fallará):
- Los textos de nodos NO pueden contener: paréntesis, corchetes anidados, barras invertidas, comillas ni los caracteres < > { }
- Para rutas de Windows usa barras normales o escribe solo el nombre de la carpeta sin la ruta completa
- Usa siempre flowchart TD o flowchart LR (no "graph TD")
- Cada nodo necesita un ID único corto (A, B, C... o palabras sin espacios)
- NO uses subgraph si no es necesario
- Tipos disponibles: flowchart TD/LR, sequenceDiagram, pie, mindmap
- Úsalos para: estructura de carpetas, flujo del escaneo, distribución de espacio por categoría

Reglas importantes:
- Nunca afirmes con certeza que un archivo específico es seguro eliminar si es del sistema operativo
- Si el usuario pregunta por algo fuera del escaneo, indícalo amablemente
- Responde siempre en español
- Sé conciso pero completo; usa listas cuando sea útil
- NUNCA escribas scripts, comandos de terminal, PowerShell, batch, Python ni ningún otro código ejecutable
- La única excepción de bloques de código son los diagramas Mermaid (```mermaid)
- Si el usuario pide código ejecutable, responde que solo puedes ayudar con análisis de disco
"""


def build_context(
    scan: ScanResult | None,
    selected_path: str = "",
    alert_risk: dict | None = None,
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

    # ── Alerta de riesgo activa ────────────────────────────────────────────────
    if alert_risk:
        severity    = alert_risk.get("severity", "")
        sev_label   = {"high": "CRÍTICO", "medium": "MODERADO", "low": "BAJO"}.get(severity, severity.upper())
        risk_type   = alert_risk.get("type", "desconocido")
        title       = alert_risk.get("title", "")
        description = alert_risk.get("description", "")
        size        = alert_risk.get("size", 0)
        files       = alert_risk.get("files", [])

        lines.append(f"\n[⚠ ALERTA DE RIESGO ACTIVA — ANALIZAR CON PRIORIDAD]")
        lines.append(f"  Severidad : {sev_label}")
        lines.append(f"  Tipo      : {risk_type}")
        lines.append(f"  Título    : {title}")
        lines.append(f"  Descripción: {description}")
        if size > 0:
            lines.append(f"  Espacio afectado: {format_size(size)}")
        if files:
            lines.append(f"  Archivos implicados ({len(files)} total, mostrando top {min(10, len(files))}):")
            for p in files[:10]:
                lines.append(f"    • {p}")
            if len(files) > 10:
                lines.append(f"    • … y {len(files) - 10} más")
        lines.append(
            "  INSTRUCCIÓN: El usuario necesita consejo concreto sobre esta alerta. "
            "Explica el riesgo real, si es un falso positivo o no, y da pasos claros de acción."
        )

    return "\n".join(lines)


def build_messages(
    history: list[dict],
    user_input: str,
    scan: ScanResult | None,
    selected_path: str = "",
    image_b64: str | None = None,
    image_mime: str | None = None,
    alert_risk: dict | None = None,
) -> list:
    """
    Construye la lista de mensajes para enviar al LLM.
    history: lista de {"role": "user"|"assistant", "content": str}
    Si se adjunta imagen, el último mensaje user es multipart:
      [{"type":"text","text":...}, {"type":"image","media_type":...,"data":...}]
    """
    from chatbot.providers.base import Message
    from chatbot import config

    context = build_context(scan, selected_path, alert_risk=alert_risk)
    system  = SYSTEM_PROMPT + context

    msgs: list[Message] = [Message(role="system", content=system)]

    # Historial reciente (excluir el system)
    max_hist = config.MAX_HISTORY_MESSAGES
    for h in history[-max_hist:]:
        msgs.append(Message(role=h["role"], content=h["content"]))

    # Último mensaje: texto puro o multipart si hay imagen adjunta
    if image_b64 and image_mime:
        user_content = [
            {"type": "text",  "text": user_input},
            {"type": "image", "media_type": image_mime, "data": image_b64},
        ]
    else:
        user_content = user_input

    msgs.append(Message(role="user", content=user_content))
    return msgs
