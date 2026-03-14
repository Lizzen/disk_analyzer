# Disk Analyzer GUI

Analizador de disco con interfaz gráfica para Windows. Muestra qué ocupa espacio en tu disco, permite filtrar por tipo/tamaño/nombre, eliminar archivos y abrir carpetas en el Explorador.

## Requisitos

- Python 3.10 o superior (incluido con Windows 11)
- Sin dependencias externas — solo módulos de la librería estándar

> **pywin32** (ya instalado en el sistema) se usa para la Papelera de reciclaje. Si no está disponible, hay un fallback automático vía `ctypes`.

## Uso

```bash
cd Desktop\disk_analyzer_gui
python main.py
```

## Estructura del proyecto

```
disk_analyzer_gui/
├── main.py              # Punto de entrada
├── app.py               # Clase principal App (lógica de orquestación)
├── core/
│   ├── models.py        # Dataclasses: FileEntry, FolderNode, ScanResult
│   ├── scanner.py       # Motor de escaneo paralelo (ThreadPoolExecutor)
│   └── trash.py         # Operaciones de borrado seguro
├── ui/
│   ├── toolbar.py       # Barra superior: ruta + botones
│   ├── disk_bar.py      # Barra gráfica de uso del disco
│   ├── tree_panel.py    # Panel izquierdo: árbol de carpetas
│   ├── file_table.py    # Panel derecho: tabla de archivos
│   ├── filter_bar.py    # Filtros: tipo, tamaño, nombre
│   ├── status_bar.py    # Barra inferior: progreso + estadísticas
│   └── dialogs.py       # Diálogos de confirmación y duplicados
└── utils/
    └── formatters.py    # format_size(), format_pct()
```

## Arquitectura

La aplicación separa completamente el escaneo (hilo worker) de la UI (hilo principal de tkinter).

```
Hilo Worker (DiskScanner)
    │
    │  queue.Queue (mensajes: folder, file, progress, done)
    ▼
App._poll_queue()   [cada 50 ms, via root.after()]
    │
    ├── TreePanel.upsert_folder()  → árbol en tiempo real
    ├── FileTable.add_entry()      → buffer de batch
    └── StatusBar.update_progress()

App._flush_loop()   [cada 80 ms]
    └── FileTable.flush_batch()   → inserta ≤300 filas por tick
```

### Tipos de mensaje del scanner

| type       | campos clave                                      |
|------------|---------------------------------------------------|
| `start`    | `root`, `n_top`                                   |
| `folder`   | `path`, `parent`, `size`, `file_count`            |
| `file`     | `path`, `name`, `size`, `category`, `extension`, `is_cache` |
| `progress` | `done`, `total`, `current`, `bytes`               |
| `done`     | `total_bytes`, `elapsed`, `duplicates`            |
| `error`    | `path`, `msg`                                     |

## Funcionalidades

### Escaneo
- Escaneo paralelo con `ThreadPoolExecutor` (16 hilos por defecto)
- El árbol de carpetas se construye en tiempo real mientras escanea
- Cancelable en cualquier momento con el botón **Cancelar** o cerrando la ventana

### Filtros (en tiempo real)
| Filtro   | Opciones                                                      |
|----------|---------------------------------------------------------------|
| Tipo     | Todos / Videos / Imágenes / Audio / Documentos / ...         |
| Tamaño   | Cualquier tamaño / >1 MB / >10 MB / >100 MB / >500 MB / >1 GB |
| Nombre   | Búsqueda de texto libre (substring, no distingue mayúsculas) |

### Navegación
- Click en carpeta del árbol → filtra la tabla a esa carpeta y sus subdirectorios
- Doble click en archivo → abre su ubicación en el Explorador de Windows
- Clic derecho en árbol/tabla → menú contextual

### Acciones
| Acción                       | Atajo          |
|------------------------------|----------------|
| Abrir en Explorador          | Doble click    |
| Mover a Papelera             | `Delete`       |
| Eliminar permanentemente     | Menú contextual |
| Copiar ruta al portapapeles  | `Ctrl+C`       |
| Nuevo escaneo                | `F5`           |
| Ver duplicados               | Menú Ver       |

### Color coding en la tabla
| Color      | Significado      |
|------------|------------------|
| Rojo       | > 1 GB           |
| Naranja    | > 100 MB         |
| Amarillo   | > 10 MB          |
| Gris       | Archivo de caché |

## Seguridad

- **Borrado permanente protegido**: Rechaza automáticamente rutas críticas del sistema (`C:\`, `C:\Windows`, `C:\Windows\System32`, `C:\Users`, `C:\Program Files`, `C:\Program Files (x86)`).
- **Sin shell=True**: Los comandos de subprocess usan listas de argumentos, previniendo inyección de comandos.
- **Mover a Papelera primero**: La acción por defecto envía a la Papelera (recuperable). El borrado permanente requiere confirmación explícita separada.
- **Hilos daemon**: Los threads del scanner son `daemon=True`, garantizando que el proceso Python termina correctamente al cerrar la ventana.

## Categorías de archivos detectadas

| Categoría               | Extensiones ejemplo                      |
|-------------------------|------------------------------------------|
| Videos                  | .mp4, .mkv, .avi, .mov, .wmv            |
| Imágenes                | .jpg, .png, .gif, .raw, .psd            |
| Audio                   | .mp3, .flac, .wav, .aac                 |
| Documentos              | .pdf, .docx, .xlsx, .txt                |
| Instaladores/ISO        | .iso, .exe, .msi, .zip, .7z, .rar      |
| Temporales/Cache        | .tmp, .temp, .log, .bak, .dmp          |
| Desarrollo (compilados) | .pyc, .class, .obj, .pdb               |
| Bases de datos          | .db, .sqlite, .mdf                      |

## Duplicados

Se detectan automáticamente archivos con el **mismo nombre Y mismo tamaño** mayores de 1 MB. Ver el informe completo desde **Ver → Mostrar duplicados** tras completar un escaneo.

---

Basado en [analyzer.py](../analyzer.py) — versión de terminal original.
