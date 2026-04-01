# Disk Analyzer (DKA)

[English](#english) | [Español](#español)

---

<a id="english"></a>
# Disk Analyzer (DKA) — English

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
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

## What's New in v1.0.0

- **Standalone executable** — `DiskAnalyzer.exe` bundles the entire app (Python runtime + React frontend). No installation needed.
- **Secure API key storage** — Keys are now stored in the **Windows Credential Manager** instead of a plaintext JSON file.
- **Symlink traversal protection** — Recycle Bin and permanent delete operations now check symlink targets against protected system paths.
- **XSS hardening** — Mermaid diagrams use `securityLevel: "strict"` and DOM-based rendering instead of `dangerouslySetInnerHTML`.
- **Error visibility** — Network errors in the temp cleaner are now shown in the UI instead of being silently swallowed.
- **API test suite** — 43 integration tests covering all REST endpoints.
- **`requirements.txt`** with pinned versions for reproducible installs.
- **Improved `run_admin.bat`** — verifies Python, dependencies, and frontend before launching.

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
3. Go to the **🤖 Models** tab — select a model (search or filter by tag). For Ollama, press **↺ detect** to auto-fetch installed models.
4. Press **Verificar** to test the connection.
5. Press **Guardar** — keys are stored securely in the **Windows Credential Manager**.

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
| `POST` | `/api/config` | Save model and provider settings |
| `GET` | `/api/providers/status` | Verify all provider connections |
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

## Novedades en v1.0.0

- **Ejecutable independiente** — `DiskAnalyzer.exe` incluye toda la app (runtime Python + frontend React). Sin instalación.
- **Almacenamiento seguro de claves** — Las API keys ahora se guardan en el **Administrador de Credenciales de Windows** en lugar de un archivo JSON en texto plano.
- **Protección contra traversal por symlinks** — Las operaciones de Papelera y borrado permanente verifican el destino real de los enlaces simbólicos contra rutas protegidas del sistema.
- **Hardening XSS** — Los diagramas Mermaid usan `securityLevel: "strict"` y renderizado DOM en lugar de `dangerouslySetInnerHTML`.
- **Errores visibles** — Los errores de red en el limpiador de temporales ahora se muestran en la interfaz en lugar de ignorarse silenciosamente.
- **Suite de tests de API** — 43 tests de integración cubriendo todos los endpoints REST.
- **`requirements.txt`** con versiones fijadas para instalaciones reproducibles.
- **`run_admin.bat` mejorado** — verifica Python, dependencias y frontend antes de lanzar.

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
3. Pestaña **🤖 Modelos** — selecciona un modelo. Para Ollama, pulsa **↺ detectar**.
4. Pulsa **Verificar** para comprobar la conexión.
5. Pulsa **Guardar** — las claves se guardan en el **Administrador de Credenciales de Windows**.

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
