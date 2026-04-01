"""
Operaciones de eliminación segura.
Usa pywin32 (SHFileOperation) para mover a la Papelera de reciclaje.
Fallback a ctypes si pywin32 no está disponible.
"""

import os
import shutil
import ctypes
import subprocess
from typing import Tuple


def send_to_recycle_bin(path: str) -> Tuple[bool, str]:
    """
    Mueve 'path' a la Papelera de reciclaje de Windows.
    Devuelve (exito, mensaje_error).
    """
    if not os.path.exists(path):
        return False, f"Ruta no encontrada: {path}"

    # Guardia contra traversal por symlink: si el path es un enlace simbólico
    # cuyo destino real es una ruta protegida del sistema, rechazar la operación.
    if os.path.islink(path):
        resolved = os.path.realpath(path)
        if _is_protected(resolved):
            return False, f"Enlace simbólico apunta a ruta protegida: {resolved}"

    # Intento 1: pywin32
    try:
        from win32com.shell import shell, shellcon
        # SHFileOperation requiere ruta terminada en \0\0 (lo gestiona pywin32)
        result = shell.SHFileOperation((
            0,
            shellcon.FO_DELETE,
            path,
            None,
            shellcon.FOF_ALLOWUNDO | shellcon.FOF_NOCONFIRMATION | shellcon.FOF_SILENT,
            None, None
        ))
        if result[0] == 0:
            return True, ""
        return False, f"SHFileOperation devolvió código {result[0]}"
    except ImportError:
        pass
    except Exception as exc:
        pass  # fallback a ctypes

    # Intento 2: ctypes directo
    try:
        class SHFILEOPSTRUCT(ctypes.Structure):
            _fields_ = [
                ("hwnd",                ctypes.c_void_p),
                ("wFunc",               ctypes.c_uint),
                ("pFrom",               ctypes.c_wchar_p),
                ("pTo",                 ctypes.c_wchar_p),
                ("fFlags",              ctypes.c_ushort),
                ("fAnyOperationsAborted", ctypes.c_bool),
                ("hNameMappings",       ctypes.c_void_p),
                ("lpszProgressTitle",   ctypes.c_wchar_p),
            ]

        FO_DELETE = 0x0003
        FOF_ALLOWUNDO      = 0x0040
        FOF_NOCONFIRMATION = 0x0010
        FOF_SILENT         = 0x0004

        op = SHFILEOPSTRUCT()
        op.hwnd  = None
        op.wFunc = FO_DELETE
        op.pFrom = path + "\x00"   # doble nulo al final
        op.pTo   = None
        op.fFlags = FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT

        ret = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(op))
        if ret == 0:
            return True, ""
        return False, f"ctypes SHFileOperationW devolvió {ret}"
    except Exception as exc:
        return False, str(exc)


def _build_protected_paths() -> set:
    """Construye el conjunto de rutas protegidas de forma dinámica."""
    protected = {
        "C:\\",
        "C:\\Windows",
        "C:\\Windows\\System32",
        "C:\\Windows\\SysWOW64",
        "C:\\Windows\\System32\\drivers",
        "C:\\Users",
        "C:\\Program Files",
        "C:\\Program Files (x86)",
        "C:\\ProgramData",
        "C:\\$Recycle.Bin",
        "C:\\Recovery",
        "C:\\System Volume Information",
    }
    # Añadir dinámicamente directorios del usuario actual
    userprofile = os.environ.get("USERPROFILE", "")
    if userprofile:
        protected.add(userprofile)                                          # C:\Users\Name
        protected.add(os.path.join(userprofile, "AppData"))
        protected.add(os.path.join(userprofile, "AppData", "Roaming"))
        protected.add(os.path.join(userprofile, "AppData", "Local"))
    # AppData general
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        protected.add(appdata)
    localappdata = os.environ.get("LOCALAPPDATA", "")
    if localappdata:
        protected.add(localappdata)
    return {os.path.normcase(p) for p in protected}


_PROTECTED_PATHS = _build_protected_paths()


def _is_protected(path: str) -> bool:
    """
    Devuelve True si:
    - La ruta coincide exactamente con una protegida, O
    - La ruta es un ancestro directo de una ruta protegida
      (evita borrar padres de rutas criticas como C:/Windows/System).
    NO bloquea descendientes de rutas protegidas del usuario
    (p. ej. Downloads esta dentro de C:/Users/Name pero si se puede borrar).
    """
    norm = os.path.normcase(os.path.abspath(path))
    if norm in _PROTECTED_PATHS:
        return True
    # Bloquear solo si la ruta es un ANCESTRO de una ruta protegida
    # (norm es prefijo de protected), para evitar borrar padres de rutas críticas.
    for protected in _PROTECTED_PATHS:
        try:
            common = os.path.commonpath([norm, protected])
        except ValueError:
            continue
        if common == norm and norm != protected:
            # norm es padre de un path protegido → bloquear
            return True
    return False


def delete_permanently(path: str, trusted: bool = False) -> Tuple[bool, str]:
    """
    Borra 'path' de forma permanente (sin posibilidad de recuperación).
    ¡Solo llamar tras confirmación explícita del usuario!
    Rechaza rutas críticas del sistema operativo salvo que trusted=True
    (usado cuando la ruta ya fue validada como perteneciente a un directorio temporal conocido).
    """
    if not os.path.exists(path):
        return False, f"Ruta no encontrada: {path}"

    # Guardia contra traversal por symlink
    if os.path.islink(path):
        resolved = os.path.realpath(path)
        if _is_protected(resolved):
            return False, f"Enlace simbólico apunta a ruta protegida: {resolved}"

    # Protección: rechazar rutas críticas del sistema (omitir si la ruta es de confianza)
    if not trusted and _is_protected(path):
        return False, f"Ruta protegida del sistema, no se puede eliminar: {path}"

    try:
        if os.path.isfile(path) or os.path.islink(path):
            os.remove(path)
        elif os.path.isdir(path):
            shutil.rmtree(path)
        return True, ""
    except PermissionError as exc:
        return False, f"Permiso denegado: {exc}"
    except Exception as exc:
        return False, str(exc)


def open_in_explorer(path: str):
    """Abre el Explorador de Windows en la carpeta o seleccionando el archivo."""
    if os.path.isfile(path):
        subprocess.Popen(["explorer", "/select,", path])
    elif os.path.isdir(path):
        subprocess.Popen(["explorer", path])
    else:
        # Si ya no existe, abrir el padre
        parent = os.path.dirname(path)
        if os.path.isdir(parent):
            subprocess.Popen(["explorer", parent])
