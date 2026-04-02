# Disk Analyzer (DKA)

[English](#english) | [Español](#español)

---

<a id="english"></a>
# Disk Analyzer (DKA) — English

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Version](https://img.shields.io/badge/version-1.0.1-indigo.svg)]()
[![License: Non-Commercial](https://img.shields.io/badge/License-Non_Commercial-red.svg)](#license)
[![OS: Windows](https://img.shields.io/badge/OS-Windows%2010%2F11-lightgrey.svg)]()

A fast, modern disk space analyzer for Windows with an **integrated AI Assistant**. Scan your drive in seconds, visualize what is consuming your storage, and ask an AI chatbot what to do next — all from a sleek dark interface.

---

## ⬇️ Download

> **No Python or Node.js required — just download and run.**

**[⬇ Download DiskAnalyzer.exe (v1.0.0)](https://github.com/Lizzen/disk_analyzer/releases/latest/download/DiskAnalyzer.exe)**

Or go to the [Releases page](https://github.com/Lizzen/disk_analyzer/releases/latest) to see all versions.

> Windows will request administrator privileges on launch — this is required to scan all disk folders accurately.

---

## What's New in v0.3.2

- **Mermaid diagram rendering** — the AI can now generate interactive flowcharts, architecture maps, folder structure diagrams and more directly in the chat, rendered with Mermaid.js.
- **Diagram lightbox** — click any diagram (or the ⤢ button) to open it fullscreen. Close with `Escape` or click outside.
- **Claude Code-style code blocks** — numbered lines, click any line to copy it (line number turns ✓), "copy all" button, macOS-style header dots, language label, auto-scroll for long blocks.
- **Improved ChatMarkdown renderer** — new elements: `# H1` with divider, `## H2` with color accent bar, `### H3`, `> blockquotes`, Markdown tables `|col|col|`, `---` horizontal rules, `~~strikethrough~~`, numbered lists with `.` or `)`. Better font size (12px) and line spacing.
- **Proactive risk detection** — after every scan, `/api/risks` analyses the result in-memory and surfaces alerts: executables in TEMP (high), large files without extension (medium), abnormally large known folders (medium), duplicate waste >500 MB (medium).
- **Risk Alerts panel** — bell icon in toolbar shows alerts with severity icons; each alert has "Open in Explorer" and "Ask AI" actions.
- **Horizontal bar chart view** — top 25 folders as proportional colored bars with percentage and file count (switch to "Barras" in the view selector).
- **Temp file cleaner** — scans %TEMP%, AppData\Local\Temp, Chrome/Edge/Firefox caches and Windows Thumbnails; select files and clean to Recycle Bin or permanently.
- **Heavy folder detection** — scanner detects `node_modules`, `.git`, `__pycache__`, `venv`, `ShaderCache` etc. during scan and reports their total size without full indexing.
- **Last-accessed filter** — filter files not accessed in 6 months, 1 year, or 2 years (note: NTFS disables atime by default on Windows).
- **HTML export** — export scan results as a standalone HTML report with CSS bar charts and full file/folder/category tables. All values are HTML-escaped.
- **Scan history** — last 10 scans saved to localStorage with path, date, size, file count, top folders and category breakdown.
- **Folder comparator** — compare any two folders from the current scan side-by-side.
- **Favorites** — pin frequently scanned paths for quick access from the toolbar dropdown.
- **AI analogies & glossary** — system prompt now explains technical terms (node_modules, ShaderCache, hiberfil.sys, pagefile.sys…) using everyday analogies and provides size context relative to familiar references.
- **Toast notifications** — subtle slide-in toasts confirm scan completion, clipboard actions, and more.

## What's New in v0.3.1

- **Toast notification system** — module-level emitter with `useToast()` hook + `ToastContainer`; `toastIn` CSS keyframe animation defined in `index.css`.
- **Multimodal AI input** — attach images (PNG/JPEG/WebP, max 5 MB) to chat messages; supported by Gemini, Claude and Groq providers via their respective multipart content formats.
- **Improved system prompt** — "Estilo de comunicación" section (analogies, relative size context, solution-first) and a glossary of common disk-related terms.

## What's New in v1.0.1

- **Per-provider API key test** — each key card in Settings › API Keys now has an individual **Test** button that sends a real minimal call (`"say hello world"`, `max_tokens=10`) to the provider and shows the live response inline — green on success, red with the error message on failure.
- **Documentation section in Settings** — new **Docs** tab with two expandable guides: *How to use the app* (scanning, table, visualizations, AI chat, temp cleaner, scan history) and *Configure API keys* (step-by-step for Gemini, Claude, Groq, and Ollama with direct links).
- **Settings UI fixes** — resolved duplicate `className` prop on three cards in the Parameters tab (active provider, temperature, max tokens) that caused styling to be silently dropped.
- **Removed global "Verify APIs" button** — replaced by the individual per-provider test flow above.

## What's New in v1.0.0

- **Redesigned AI Chat panel** — modern bubble layout, dynamic status indicator (typing / online), model info bar in header.
- **12 visual themes** — Dark Void, Midnight Blue, Forest Dark, Light Vanilla, Profile Neon, Profile Pastel, Dark Premium, Dracula, Nord, Tokyo Night, Catppuccin Mocha, GitHub Dark.
- **Expanded model library** — 40+ models across Gemini (10), Groq (25+), Claude (11) with metadata, search and tag filters.
- **Settings panel redesign** — sidebar navigation, per-provider model cards with speed bars and recommended badges, temperature/token sliders with quick presets.
- **Context menu delete** — right-click any file to move to Recycle Bin or permanently delete, with confirmation modal.
- **Security hardening** — Pydantic `Field` validation, `_validate_file_path()`, protected path ancestor checks, no `shell=True`.

---

## Key Features

- **Fast Multithreaded Scanning** — `os.scandir()` DFS with `ThreadPoolExecutor`, real-time results streamed as it scans.
- **Modern Themed UI** — 12 built-in themes switchable live from Settings.
- **Virtualized File Table** — Custom virtualizer renders only visible rows — handles 1M+ files smoothly.
- **Multiple Views** — Folder tree, sortable file table, horizontal bar chart, treemap, timeline.
- **Dynamic Filtering** — Category pills, minimum size selector, debounced name search, last-accessed filter.
- **MD5 Duplicate Detection** — Same name + size → verified by MD5 hash in background.
- **Context Menu** — Right-click to open in Explorer, copy path, attach to AI chat, move to Recycle Bin, or permanently delete.
- **Risk Alerts** — Automatic post-scan analysis surfaces dangerous or wasteful files (executables in TEMP, large no-extension files, abnormal folder sizes, duplicate waste).
- **Temp Cleaner** — Targeted cleanup of browser caches, Windows temp folders and thumbnails.
- **Heavy Folder Detection** — `node_modules`, `.git`, `__pycache__`, `venv`, `ShaderCache` etc. reported with total size during scan.
- **Export** — CSV, JSON, or standalone HTML report.
- **Scan History** — Last 10 scans persisted locally for quick comparison.
- **Favorites & Comparator** — Pin paths, compare folders side-by-side.
- **Integrated AI Assistant** — Streaming chat with Mermaid diagram generation, Claude Code-style code blocks, full Markdown rendering, and full access to scan metadata.

---

## AI Assistant

The right panel includes a chatbot with access to your scan results. Ask it things like:

- *"What is taking up the most space?"*
- *"Is it safe to delete these cache files?"*
- *"Which duplicates should I remove?"*
- *"Show me the folder structure as a diagram."*
- *"Draw a flowchart of how the scanner works."*

Right-click any file and select **Attach to chat** to give the AI specific context about it.

### Supported Providers

| Provider | Models | Free Tier | Requires Key |
|---|---|---|---|
| **Google Gemini** | gemini-2.5-flash/pro, gemini-2.0-flash, gemini-1.5-pro/flash… | ✓ 1,500 req/day | Yes — [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | Llama 4 Scout, Llama 3.3 70B, Kimi K2, Qwen 3 32B, DeepSeek R1… | ✓ 14,400 req/day | Yes — [console.groq.com](https://console.groq.com/keys) |
| **Claude (Anthropic)** | claude-haiku-4-5, claude-sonnet-4-5/4-6, claude-opus-4-6… | Trial credits | Yes — [console.anthropic.com](https://console.anthropic.com/account/keys) |
| **Ollama (local)** | Auto-detected from your local installation | ✓ Unlimited | No — requires [Ollama](https://ollama.com) |

### Setup

1. Open the **⚙ settings** panel in the chat header.
2. Go to the **🔑 Keys** tab — enter your API key for the desired provider.
3. Go to the **🤖 Models** tab — select a model from the list (search or filter by tag). For Ollama, press **↺ detect** to auto-fetch installed models.
4. Press the **Test** button on each key card to send a real minimal call and verify the connection.
5. Press **Guardar** — keys are stored in `%APPDATA%\DiskAnalyzer\api_keys.json`, outside the repository.

---

## Screenshots

*(Add screenshots here)*

---

## Running from Source

Requirements: **Windows 10/11**, **Python 3.11+**, **Node.js 18+**

```bash
git clone https://github.com/Lizzen/disk_analyzer.git
cd disk_analyzer

# Install Python dependencies
pip install -r requirements.txt

# Build frontend (only needed once, or after frontend changes)
cd frontend && npm install && npm run build && cd ..

# Launch (double-click or run from terminal)
.\run_admin.bat
```

### Building the executable yourself

```bash
.\build_exe.bat
# Output: dist\DiskAnalyzer.exe
```

---

## Project Structure

```text
disk_analyzer/
├── app_web.py              # Main entry point (FastAPI + pywebview)
├── api.py                  # FastAPI backend: WebSocket scan, chat SSE, export, risks, temp cleaner
├── disk_analyzer.spec      # PyInstaller build config (onefile)
├── build_exe.bat           # One-click build script
├── run_admin.bat           # Development launcher
├── requirements.txt        # Pinned Python dependencies
├── core/
│   ├── models.py           # Data classes: FileEntry, FolderNode, ScanResult
│   ├── scanner.py          # DFS scanner, heavy folder detection, MD5 duplicate verification
│   ├── risk_detector.py    # Post-scan risk analysis
│   └── trash.py            # Recycle Bin, safe permanent delete, symlink guard
├── chatbot/
│   ├── config.py           # API key storage (Windows Credential Manager) and model config
│   ├── context_builder.py  # Builds system prompt from scan metadata + glossary
│   └── providers/
│       ├── base.py         # Abstract AIProvider base class
│       ├── gemini.py       # Google Gemini
│       ├── groq_p.py       # Groq
│       ├── claude.py       # Anthropic Claude
│       └── ollama.py       # Ollama local
├── frontend/
│   ├── src/
│   │   ├── App.jsx                         # Main component
│   │   ├── components/chat/                # ChatMarkdown, Mermaid, action bar
│   │   ├── components/files/               # Virtualized file table
│   │   ├── components/modals/              # Settings, temp cleaner, risk alerts
│   │   └── components/visualizations/      # Treemap, timeline, bar chart
│   └── dist/               # Pre-built production assets (served by FastAPI)
├── utils/
│   ├── formatters.py       # Byte and percentage formatting
│   └── logger.py           # Rotating file logger
└── tests/
    ├── test_scanner.py     # Scanner unit tests
    └── test_api.py         # 43 API endpoint integration tests
```

---

## Architecture

```mermaid
flowchart TD
    A[DiskScanner thread] -->|WebSocket batches| B[file_batch / folder / progress / done]
    B --> C[React: allFilesRef accumulation]
    C -->|flush every 500ms| D[VirtualList render]
    E[POST /api/chat] -->|SSE stream| F[ChatMarkdown + MermaidDiagram]
    G[scan done] -->|GET /api/risks| H[RiskAlertsPanel]
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `WS` | `/ws/scan` | Real-time scan messages |
| `GET` | `/api/drives` | List available drives |
| `GET` | `/api/disk-info` | Disk usage for a given path |
| `POST` | `/api/chat` | SSE streaming AI chat |
| `GET` | `/api/config` | Load saved config (keys masked) |
| `POST` | `/api/config` | Save API keys and model names |
| `GET` | `/api/providers/status` | Check availability of all providers (key configured?) |
| `POST` | `/api/providers/test` | Send a real minimal call to a single provider and return its response |
| `GET` | `/api/ollama/models` | List locally installed Ollama models |
| `POST` | `/api/export` | Export scan as CSV, JSON, or HTML |
| `GET` | `/api/risks` | Post-scan risk analysis |
| `GET` | `/api/temp-files` | Scan temp/cache directories |
| `POST` | `/api/temp-clean` | Delete selected temp files |
| `POST` | `/api/open-in-explorer` | Open a path in Windows Explorer |
| `POST` | `/api/trash` | Move file to Recycle Bin |
| `POST` | `/api/delete-permanent` | Permanently delete file (with system path guard) |

---

## Security & Privacy

- **Secure credential storage** — API keys stored in the Windows Credential Manager, never in plain text files.
- **Symlink traversal guard** — Recycle Bin and permanent delete check resolved symlink targets against protected paths.
- **Protected permanent deletion** — Rejects critical system paths (`C:\`, `C:\Windows`, `C:\System32`, etc.) and their ancestors.
- **Temp cleaner path validation** — Every path validated against known temp roots before deletion.
- **No `shell=True`** — Subprocesses use argument lists — no command injection risk.
- **Input validation** — All API endpoints validate path lengths, characters, and drive letters.
- **AI sees metadata only** — The chatbot receives names, sizes, paths and categories. It never reads file contents.
- **XSS-safe Mermaid** — `securityLevel: "strict"` + DOM rendering instead of `innerHTML` injection.
- **HTML export XSS-safe** — All values escaped with `html.escape()`.
- **CORS restricted** — API only accepts requests from `localhost` / `127.0.0.1`.

---

## License

**Free and Non-Commercial License.**

- **Allowed:** Use, view, modify, and share improvements freely.
- **Forbidden:** Sell, charge for distribution, or integrate into commercial products.
- **Required:** Keep the copyright notice (`Copyright (c) Lizzen`) on any distributed or modified version.

See the `LICENSE` file for full terms.

---
---

<a id="español"></a>
# Disk Analyzer (DKA) — Español

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Version](https://img.shields.io/badge/version-1.0.1-indigo.svg)]()
[![License: Non-Commercial](https://img.shields.io/badge/License-Non_Commercial-red.svg)](#licencia)
[![OS: Windows](https://img.shields.io/badge/OS-Windows%2010%2F11-lightgrey.svg)]()

Analizador de espacio en disco moderno para Windows con **Asistente de IA integrado**. Escanea tu disco en segundos, visualiza qué consume tu almacenamiento y pregunta al chatbot qué hacer — todo desde una interfaz oscura y fluida.

---

## ⬇️ Descarga

> **No requiere Python ni Node.js — descarga y ejecuta directamente.**

**[⬇ Descargar DiskAnalyzer.exe (v1.0.0)](https://github.com/Lizzen/disk_analyzer/releases/latest/download/DiskAnalyzer.exe)**

O visita la [página de Releases](https://github.com/Lizzen/disk_analyzer/releases/latest) para ver todas las versiones.

> Windows pedirá permisos de administrador al lanzar la app — necesario para escanear todas las carpetas del disco con precisión.

---

## Novedades en v0.3.2

- **Diagramas Mermaid en el chat** — la IA puede generar flowcharts, mapas de arquitectura, estructuras de carpetas y más directamente en el chat, renderizados con Mermaid.js.
- **Lightbox de diagramas** — haz click en cualquier diagrama (o el botón ⤢) para abrirlo en pantalla completa. Cierra con `Escape` o click fuera.
- **Bloques de código estilo Claude Code** — líneas numeradas, click en cualquier línea para copiarla (el número se convierte en ✓), botón "copiar todo", puntos estilo macOS, etiqueta de lenguaje, scroll interno para bloques largos.
- **ChatMarkdown mejorado** — nuevos elementos: `# H1` con divisor, `## H2` con barra de color, `### H3`, `> citas`, tablas Markdown `|col|col|`, `---` separadores, `~~tachado~~`, listas numeradas con `.` o `)`. Mejor tamaño de fuente (12px) y espaciado.
- **Detección proactiva de riesgos** — tras cada escaneo, `/api/risks` analiza el resultado en memoria y muestra alertas: ejecutables en TEMP (alta), archivos grandes sin extensión (media), carpetas conocidas anómalamente grandes (media), duplicados que desperdician >500 MB (media).
- **Panel de alertas de riesgo** — icono de campana en la barra muestra alertas con iconos de severidad; cada alerta tiene acciones "Abrir en Explorador" y "Preguntar IA".
- **Vista de barras horizontales** — las 25 carpetas más grandes como barras proporcionales con colores, porcentaje y número de archivos (cambia a "Barras" en el selector de vista).
- **Limpiador de temporales** — escanea %TEMP%, AppData\Local\Temp, cachés de Chrome/Edge/Firefox y Miniaturas de Windows; selecciona archivos y limpia a Papelera o permanentemente.
- **Detección de carpetas pesadas** — el scanner detecta `node_modules`, `.git`, `__pycache__`, `venv`, `ShaderCache` etc. durante el escaneo y reporta su tamaño total sin indexación completa.
- **Filtro por último acceso** — filtra archivos no accedidos en 6 meses, 1 año o 2 años (nota: NTFS desactiva atime por defecto en Windows).
- **Exportación HTML** — exporta los resultados como un informe HTML independiente con gráficas CSS y tablas completas. Todos los valores están escapados con `html.escape()`.
- **Historial de escaneos** — los últimos 10 escaneos se guardan en localStorage con ruta, fecha, tamaño, número de archivos, carpetas top y desglose de categorías.
- **Comparador de carpetas** — compara dos carpetas del escaneo actual lado a lado.
- **Favoritos** — fija rutas de escaneo frecuentes para acceso rápido desde el desplegable de la barra.
- **Analogías y glosario para la IA** — el system prompt explica términos técnicos (node_modules, ShaderCache, hiberfil.sys, pagefile.sys…) con analogías cotidianas y contexto de tamaño relativo.
- **Notificaciones toast** — toasts discretos confirman el fin del escaneo, acciones de portapapeles y más.

## Novedades en v0.3.1

- **Sistema de notificaciones toast** — emisor a nivel de módulo con hook `useToast()` + `ToastContainer`; animación CSS `toastIn` definida en `index.css`.
- **Entrada multimodal para la IA** — adjunta imágenes (PNG/JPEG/WebP, máx. 5 MB) a los mensajes del chat; soportado por Gemini, Claude y Groq.
- **System prompt mejorado** — sección "Estilo de comunicación" (analogías, contexto de tamaño relativo, solución primero) y glosario de términos comunes de disco.

## Novedades en v1.0.1

- **Prueba individual de API key por proveedor** — cada tarjeta de key en Ajustes › API Keys tiene su propio botón **Probar** que hace una llamada real mínima (`"di hola mundo"`, `max_tokens=10`) al proveedor y muestra la respuesta en vivo — verde si funciona, rojo con el mensaje de error si falla.
- **Sección de Documentación en Ajustes** — nueva pestaña **Docs** con dos guías expandibles: *Cómo usar la aplicación* (escaneo, tabla, visualizaciones, chat IA, limpiador de temporales, historial) y *Configurar claves de API* (paso a paso para Gemini, Claude, Groq y Ollama con enlaces directos).
- **Correcciones de UI en Ajustes** — resuelto el atributo `className` duplicado en tres tarjetas de la pestaña Parámetros (proveedor activo, temperatura, máx. tokens) que provocaba que los estilos se aplicaran incorrectamente.
- **Eliminado el botón global "Verificar APIs"** — sustituido por el flujo de prueba individual por proveedor descrito arriba.

## Novedades en v1.0.0

- **Panel de chat rediseñado** — burbujas modernas, indicador de estado dinámico, barra de modelo en la cabecera.
- **12 temas visuales** — Dark Void, Midnight Blue, Forest Dark, Light Vanilla, Profile Neon, Profile Pastel, Dark Premium, Dracula, Nord, Tokyo Night, Catppuccin Mocha, GitHub Dark.
- **Biblioteca de modelos ampliada** — más de 40 modelos entre Gemini (10), Groq (25+), Claude (11).
- **Panel de ajustes rediseñado** — navegación lateral, tarjetas de modelos, sliders de temperatura/tokens.
- **Eliminar desde menú contextual** — clic derecho → Papelera o borrado permanente con confirmación.
- **Seguridad reforzada** — validación con Pydantic `Field`, rutas protegidas, sin `shell=True`.

---

## Características Principales

- **Escaneo Multihilo Rápido** — DFS con `os.scandir()` y `ThreadPoolExecutor`, resultados en tiempo real.
- **Interfaz con Temas** — 12 temas integrados cambiables en vivo desde Ajustes.
- **Tabla Virtualizada** — Virtualizador propio — fluido con más de 1M de archivos.
- **Múltiples Vistas** — Árbol de carpetas, tabla de archivos, gráfica de barras, treemap, línea de tiempo.
- **Filtrado Dinámico** — Pills de categoría, selector de tamaño mínimo, búsqueda por nombre, filtro por último acceso.
- **Detección de Duplicados MD5** — Mismo nombre + tamaño → verificado por hash MD5 en segundo plano.
- **Menú Contextual** — Clic derecho para abrir en Explorador, copiar ruta, adjuntar al chat, Papelera o borrado permanente.
- **Alertas de Riesgo** — Análisis automático post-escaneo detecta archivos peligrosos o que desperdician espacio.
- **Limpiador de Temporales** — Limpieza selectiva de cachés de navegadores, carpetas temp de Windows y miniaturas.
- **Detección de Carpetas Pesadas** — `node_modules`, `.git`, `__pycache__`, `venv`, `ShaderCache` etc. reportados con tamaño total.
- **Exportación** — CSV, JSON o informe HTML independiente.
- **Historial de Escaneos** — Últimos 10 escaneos persistidos localmente.
- **Favoritos y Comparador** — Fija rutas y compara carpetas lado a lado.
- **Asistente IA Integrado** — Chat con streaming, diagramas Mermaid, bloques de código estilo Claude Code, Markdown completo y acceso a metadatos del escaneo.

---

## Asistente IA

El panel derecho incluye un chatbot con acceso a los resultados de tu escaneo:

- *"¿Qué está ocupando más espacio?"*
- *"¿Puedo borrar los archivos de caché de forma segura?"*
- *"¿Cuáles de estos duplicados debo eliminar?"*
- *"Muéstrame la estructura de carpetas como diagrama."*

Haz clic derecho en cualquier archivo y selecciona **Adjuntar al chat** para darle contexto específico a la IA.

### Proveedores Soportados

| Proveedor | Modelos | Tier gratuito | Requiere key |
|---|---|---|---|
| **Google Gemini** | gemini-2.5-flash/pro, gemini-2.0-flash, gemini-1.5-pro/flash… | ✓ 1.500 req/día | Sí — [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | Llama 4 Scout, Llama 3.3 70B, Kimi K2, Qwen 3 32B, DeepSeek R1… | ✓ 14.400 req/día | Sí — [console.groq.com](https://console.groq.com/keys) |
| **Claude (Anthropic)** | claude-haiku-4-5, claude-sonnet-4-5/4-6, claude-opus-4-6… | Créditos trial | Sí — [console.anthropic.com](https://console.anthropic.com/account/keys) |
| **Ollama (local)** | Detectado automáticamente | ✓ Sin límite | No — requiere [Ollama](https://ollama.com) |

### Configurar la IA

1. Abre el panel **⚙ configuración** en la cabecera del chat.
2. Pestaña **🔑 Keys** — introduce tu API key del proveedor deseado.
3. Pestaña **🤖 Modelos** — selecciona un modelo de la lista (busca o filtra por etiqueta). Para Ollama, pulsa **↺ detectar** para cargar los modelos instalados.
4. Pulsa el botón **Probar** en la tarjeta de cada key para hacer una llamada real mínima y verificar la conexión.
5. Pulsa **Guardar** — se guarda en `%APPDATA%\DiskAnalyzer\api_keys.json`, fuera del repositorio.

---

## Capturas de Pantalla

*(Añade aquí capturas de la aplicación)*

---

## Ejecutar desde el código fuente

Requisitos: **Windows 10/11**, **Python 3.11+**, **Node.js 18+**

```bash
git clone https://github.com/Lizzen/disk_analyzer.git
cd disk_analyzer

# Instalar dependencias Python
pip install -r requirements.txt

# Compilar frontend (solo una vez, o tras cambios en el frontend)
cd frontend && npm install && npm run build && cd ..

# Lanzar (doble clic o desde terminal)
.\run_admin.bat
```

### Compilar el ejecutable

```bash
.\build_exe.bat
# Resultado: dist\DiskAnalyzer.exe
```

---

## Estructura del Proyecto

```text
disk_analyzer/
├── app_web.py              # Punto de entrada principal (FastAPI + pywebview)
├── api.py                  # Backend FastAPI: WebSocket scan, chat SSE, export, riesgos, limpiador temp
├── disk_analyzer.spec      # Configuración de compilación PyInstaller (onefile)
├── build_exe.bat           # Script de compilación con un clic
├── run_admin.bat           # Lanzador de desarrollo
├── requirements.txt        # Dependencias Python con versiones fijadas
├── core/
│   ├── models.py           # Clases de datos: FileEntry, FolderNode, ScanResult
│   ├── scanner.py          # Scanner DFS, detección carpetas pesadas, duplicados MD5
│   ├── risk_detector.py    # Análisis de riesgos post-escaneo
│   └── trash.py            # Papelera, borrado permanente, guardia de symlinks
├── chatbot/
│   ├── config.py           # API keys (Administrador de Credenciales) y config de modelos
│   ├── context_builder.py  # Construye el system prompt desde metadatos del escaneo
│   └── providers/
│       ├── base.py         # Clase base abstracta AIProvider
│       ├── gemini.py       # Google Gemini
│       ├── groq_p.py       # Groq
│       ├── claude.py       # Anthropic Claude
│       └── ollama.py       # Ollama local
├── frontend/
│   ├── src/
│   │   ├── App.jsx                         # Componente principal
│   │   ├── components/chat/                # ChatMarkdown, Mermaid, barra de acciones
│   │   ├── components/files/               # Tabla de archivos virtualizada
│   │   ├── components/modals/              # Ajustes, limpiador temp, alertas de riesgo
│   │   └── components/visualizations/      # Treemap, línea de tiempo, gráfica de barras
│   └── dist/               # Assets de producción pre-compilados (servidos por FastAPI)
├── utils/
│   ├── formatters.py       # Formateo de bytes y porcentajes
│   └── logger.py           # Logger con rotación de archivos
└── tests/
    ├── test_scanner.py     # Tests unitarios del scanner
    └── test_api.py         # 43 tests de integración de endpoints API
```

---

## Arquitectura

### Interfaz Moderna — Escaneo en Tiempo Real

El scanner corre en un hilo separado y envía lotes de mensajes al frontend vía WebSocket. React acumula los resultados en refs (sin re-render por lote) y vuelca al estado cada 500ms.

```mermaid
flowchart TD
    A[Hilo Worker: DiskScanner] -->|WebSocket en lotes| B[file_batch / folder / progress / done]
    B --> C[React: acumulación en allFilesRef / foldersRef]
    C -->|flush cada 500ms| D[Estado React / VirtualList render]
    E[POST /api/chat] -->|SSE chunks agrupados 30ms| F[ChatMarkdown + MermaidDiagram]
    G[scan done] -->|GET /api/risks| H[RiskAlertsPanel]
```

### Tipos de Mensajes WebSocket

| Tipo | Campos |
|---|---|
| `start` | `root` |
| `folder` | `path`, `size`, `file_count` |
| `file_batch` | `entries: list[dict]` |
| `progress` | `done`, `total`, `current`, `bytes` |
| `heavy_folder` | `path`, `name`, `parent`, `size` |
| `done` | `total_bytes`, `elapsed`, `duplicates`, `errors` |

### Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| `WS` | `/ws/scan` | Mensajes de escaneo en tiempo real |
| `GET` | `/api/disk-info` | Uso de disco para una ruta dada |
| `POST` | `/api/chat` | Chat con IA vía SSE streaming |
| `GET` | `/api/config` | Carga configuración guardada (keys enmascaradas) |
| `POST` | `/api/config` | Guarda API keys y nombres de modelos |
| `GET` | `/api/providers/status` | Comprueba disponibilidad de todos los proveedores (¿key configurada?) |
| `POST` | `/api/providers/test` | Hace una llamada real mínima a un proveedor concreto y devuelve su respuesta |
| `GET` | `/api/ollama/models` | Lista los modelos Ollama instalados localmente |
| `POST` | `/api/export` | Exporta el escaneo como CSV, JSON o HTML |
| `GET` | `/api/risks` | Análisis de riesgos post-escaneo |
| `GET` | `/api/temp-files` | Escanea directorios temporales/caché |
| `POST` | `/api/temp-clean` | Elimina archivos temporales seleccionados |
| `POST` | `/api/open-in-explorer` | Abre una ruta en el Explorador de Windows |
| `POST` | `/api/trash` | Mueve un archivo a la Papelera de reciclaje |
| `POST` | `/api/delete-permanent` | Elimina permanentemente (con protección de rutas del sistema) |

---

## Código de Colores en la Tabla

| Color | Significado |
|---|---|
| Rojo | > 1 GB |
| Naranja | > 100 MB |
| Azul | > 10 MB |
| Morado | Archivo de caché / temporal |
| Alternado oscuro | Resto de archivos |

---

## Categorías de Archivos Detectadas

| Categoría | Extensiones |
|---|---|
| Videos | `.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.ts`… |
| Imágenes | `.jpg`, `.png`, `.gif`, `.raw`, `.psd`, `.heic`… |
| Audio | `.mp3`, `.flac`, `.wav`, `.aac`, `.opus`… |
| Documentos | `.pdf`, `.docx`, `.xlsx`, `.txt`, `.epub`… |
| Instaladores/ISO | `.iso`, `.exe`, `.msi`, `.zip`, `.7z`, `.rar`… |
| Temporales/Cache | `.tmp`, `.temp`, `.log`, `.bak`, `.dmp`… |
| Desarrollo (compilados) | `.pyc`, `.class`, `.obj`, `.pdb`… |
| Bases de datos | `.db`, `.sqlite`, `.mdf`… |

---

## Seguridad y Privacidad

- **Almacenamiento seguro de credenciales** — API keys en el Administrador de Credenciales de Windows, nunca en texto plano.
- **Guardia contra traversal por symlinks** — Papelera y borrado verifican el destino real de los enlaces simbólicos.
- **Borrado permanente protegido** — Rechaza rutas críticas del sistema (`C:\`, `C:\Windows`, etc.) y sus ancestros.
- **Validación de rutas en el limpiador** — Cada ruta se valida contra raíces temp conocidas antes de borrar.
- **Sin `shell=True`** — Los subprocesos usan listas de argumentos — sin riesgo de inyección de comandos.
- **Validación de entrada** — Todos los endpoints validan longitud de ruta, caracteres y letras de unidad.
- **La IA solo ve metadatos** — El chatbot recibe nombres, tamaños, rutas y categorías. Nunca lee contenidos de archivos.
- **Mermaid XSS-safe** — `securityLevel: "strict"` + renderizado DOM en lugar de inyección de `innerHTML`.
- **Exportación HTML XSS-safe** — Todos los valores escapados con `html.escape()`.
- **CORS restringido** — La API solo acepta peticiones desde `localhost` / `127.0.0.1`.

---

## Licencia

**Licencia Libre y No Comercial.**

- **Permitido:** Usar, ver, modificar y compartir mejoras libremente.
- **Prohibido:** Vender, cobrar por distribución o integrar en productos comerciales.
- **Obligatorio:** Mantener el aviso de copyright (`Copyright (c) Lizzen`) en cualquier versión distribuida o modificada.

Ver el archivo `LICENSE` para los términos completos.
