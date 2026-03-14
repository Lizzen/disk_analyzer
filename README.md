# Disk Analyzer (DKA)

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![License: Non-Commercial](https://img.shields.io/badge/License-Non_Commercial-red.svg)](#licencia)
[![OS: Windows](https://img.shields.io/badge/OS-Windows-lightgrey.svg)]()

Un analizador de espacio en disco con interfaz gráfica (GUI) rápido y ligero para Windows, con **Asistente de IA integrado**. Construido íntegramente con Python y `tkinter`, te permite descubrir rápidamente qué archivos y carpetas están consumiendo el almacenamiento de tu disco y preguntarle a una IA qué hacer con ellos.

---

## Características Principales

- **Escaneo Multihilo Rápido:** Usa `ThreadPoolExecutor` para escanear directorios en paralelo con resultados en tiempo real.
- **Visualización en Árbol y Tabla:** Vista jerárquica de carpetas y tabla detallada de archivos ordenable.
- **Filtrado Dinámico:** Filtra por tipo, tamaño mínimo y nombre (búsqueda en tiempo real).
- **Gestión de Archivos:** Envía a la Papelera o elimina permanentemente con confirmación.
- **Detección de Duplicados:** Encuentra archivos con mismo nombre y tamaño (>1 MB) desde `Ver → Mostrar duplicados`.
- **Carpetas Excluidas:** Excluye carpetas pesadas del escaneo (ej. `Xilinx`, `node_modules`) desde `Archivo → Carpetas excluidas…`. Se persisten entre sesiones.
- **Asistente IA integrado:** Panel de chat lateral con soporte para 4 proveedores de IA. Tiene acceso a los metadatos del escaneo (nombres, tamaños, rutas, categorías) pero **nunca** al contenido de los archivos.

---

## Asistente IA

El panel derecho de la aplicación incluye un chatbot que puede responder preguntas como:
- *"¿Para qué sirve este archivo?"*
- *"¿Qué carpeta ocupa más espacio?"*
- *"¿Puedo eliminar los archivos de caché de forma segura?"*
- *"¿Qué son estos duplicados?"*

### Proveedores soportados

| Proveedor | Modelo por defecto | Tier gratuito | Requiere key |
|-----------|-------------------|---------------|--------------|
| **Google Gemini** | gemini-2.0-flash-lite | ✓ 1.500 req/día | Sí — [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | llama-3.3-70b-versatile | ✓ 14.400 req/día | Sí — [console.groq.com](https://console.groq.com/keys) |
| **Claude (Anthropic)** | claude-haiku-4-5 | Créditos trial | Sí — [console.anthropic.com](https://console.anthropic.com/account/keys) |
| **Ollama (local)** | llama3.2 | ✓ Sin límite | No — requiere [Ollama](https://ollama.com) instalado |

### Configurar la IA

1. Abre `Chat IA → Configurar APIs…`
2. Introduce tu API key en el proveedor deseado
3. Selecciona el modelo con el desplegable (o pulsa **↺** para cargar los modelos disponibles desde la API)
4. Pulsa **Verificar conexión** para comprobar que funciona
5. Pulsa **Guardar** — la configuración se persiste en `%APPDATA%\DiskAnalyzer\api_keys.json`

---

## Capturas de Pantalla

*(Añade aquí capturas de pantalla de la aplicación funcionando)*

---

## Requisitos

- **Sistema Operativo:** Windows 10 / 11
- **Python:** 3.10 o superior

### Dependencias

Instala las dependencias del asistente IA según el proveedor que quieras usar:

```bash
# Todos los proveedores de nube de una vez:
pip install google-genai groq anthropic

# Solo Ollama (local, sin internet):
pip install ollama
```

> `pywin32` es opcional: mejora el soporte de la Papelera de Reciclaje. Si no está instalado se usa un fallback automático vía `ctypes`.

---

## Instalación y Uso

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Lizzen/disk_analyzer.git
   cd disk_analyzer
   ```

2. (Opcional) Instala dependencias del chatbot:
   ```bash
   pip install google-genai groq anthropic
   ```

3. Ejecuta la aplicación:
   ```bash
   python main.py
   ```

---

## Estructura del Proyecto

```text
disk_analyzer/
├── main.py                   # Punto de entrada
├── app.py                    # Orquestador principal (polling loop, dispatcher)
├── core/
│   ├── models.py             # Clases de datos: FileEntry, FolderNode, ScanResult
│   ├── scanner.py            # Motor de escaneo paralelo con soporte de exclusiones
│   └── trash.py              # Papelera y borrado seguro
├── ui/
│   ├── toolbar.py            # Barra superior (ruta + botones)
│   ├── disk_bar.py           # Barra visual de uso de disco
│   ├── tree_panel.py         # Panel árbol de carpetas
│   ├── file_table.py         # Tabla de archivos con batch rendering
│   ├── filter_bar.py         # Filtros (tipo, tamaño, nombre)
│   ├── status_bar.py         # Barra inferior con métricas y progreso
│   ├── dialogs.py            # Diálogos: confirmación borrado, duplicados
│   ├── exclude_dialog.py     # Gestión de carpetas excluidas del escaneo
│   └── theme.py              # Paleta de colores y estilos ttk centralizados
├── chatbot/
│   ├── config.py             # API keys, modelos y configuración (persiste en AppData)
│   ├── context_builder.py    # Construye el system prompt con metadatos del escaneo
│   ├── providers/
│   │   ├── base.py           # Clase abstracta AIProvider
│   │   ├── gemini.py         # Proveedor Google Gemini (google-genai)
│   │   ├── groq_p.py         # Proveedor Groq (groq)
│   │   ├── claude.py         # Proveedor Anthropic Claude (anthropic)
│   │   └── ollama.py         # Proveedor Ollama local (ollama)
│   └── ui/
│       ├── chat_panel.py     # Panel de chat con streaming y selector de proveedor
│       └── settings_dialog.py# Diálogo de configuración de APIs y modelos
└── utils/
    └── formatters.py         # Formateo de bytes y porcentajes
```

---

## Arquitectura de Escaneo en Tiempo Real

El scanner corre en un hilo separado y se comunica con la UI mediante una `queue.Queue`:

```mermaid
graph TD
    A[Hilo Worker: DiskScanner] -->|queue.Queue| B(file_batch / folder / progress / done)
    B --> C[App._poll_queue — cada 40ms]
    C --> D[TreePanel: árbol de carpetas]
    C --> E[FileTable: buffer de filas]
    C --> F[StatusBar: progreso]
    G[App._flush_loop — cada 60ms] --> H[FileTable: renderiza hasta 500 filas]
```

### Tipos de mensajes del scanner

| Tipo | Campos |
|------|--------|
| `start` | `root`, `n_top` |
| `folder` | `path`, `parent`, `size`, `file_count` |
| `file_batch` | `entries: list[dict]` |
| `progress` | `done`, `total`, `current`, `bytes` |
| `done` | `total_bytes`, `elapsed`, `duplicates` |
| `error` | `path`, `msg` |

---

## Accesos Directos

| Acción | Atajo |
|--------|-------|
| Nuevo escaneo | `F5` |
| Mover a Papelera | `Supr` (Delete) |
| Copiar ruta | `Ctrl+C` |
| Abrir en Explorador | Doble clic en archivo |
| Eliminar permanente | Clic derecho → menú contextual |

---

## Código de colores en la tabla

| Color | Significado |
|-------|-------------|
| Rojo | > 1 GB |
| Naranja | > 100 MB |
| Amarillo | > 10 MB |
| Gris azulado | Archivo de caché / temporal |

---

## Categorías de archivos detectadas

| Categoría | Extensiones |
|-----------|-------------|
| Videos | .mp4, .mkv, .avi, .mov, .wmv, .ts… |
| Imágenes | .jpg, .png, .gif, .raw, .psd, .heic… |
| Audio | .mp3, .flac, .wav, .aac, .opus… |
| Documentos | .pdf, .docx, .xlsx, .txt, .epub… |
| Instaladores/ISO | .iso, .exe, .msi, .zip, .7z, .rar… |
| Temporales/Cache | .tmp, .temp, .log, .bak, .dmp… |
| Desarrollo (compilados) | .pyc, .class, .obj, .pdb… |
| Bases de datos | .db, .sqlite, .mdf… |

---

## Seguridad

- **Borrado permanente protegido:** Rechaza rutas críticas del sistema (`C:\`, `C:\Windows`, `C:\System32`, etc.).
- **Sin `shell=True`:** Los subprocesos usan listas de argumentos, previniendo inyección de comandos.
- **La IA solo ve metadatos:** El chatbot recibe nombres, tamaños, rutas y categorías. Nunca el contenido de los archivos.
- **API keys fuera del código:** Las claves se guardan en `%APPDATA%\DiskAnalyzer\api_keys.json`, no en el repositorio.
- **Hilos daemon:** El scanner usa `daemon=True` para que el proceso termine correctamente al cerrar la ventana.
- **Mover a Papelera por defecto:** El borrado permanente requiere confirmación explícita adicional.

---

## Contribuir

1. Haz un *Fork* del repositorio.
2. Crea una rama: `git checkout -b feature/NuevaCaracteristica`
3. Haz commit: `git commit -m 'Añade NuevaCaracteristica'`
4. Push: `git push origin feature/NuevaCaracteristica`
5. Abre un **Pull Request**.

---

## Licencia

Licencia **Gratuita y No Comercial**.

- **Permitido:** Usar libremente, ver, editar y compartir mejoras.
- **Prohibido:** Vender, distribuir cobrando, integrar en productos comerciales.
- **Obligatorio:** Mantener el aviso de copyright (`Copyright (c) Lizzen`) en cualquier versión distribuida.

Consulta el archivo `LICENSE` para los términos completos.
