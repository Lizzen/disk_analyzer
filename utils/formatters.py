"""Utilidades de formato."""

SIZE_UNITS = ("B", "KB", "MB", "GB", "TB", "PB")


def format_size(b: int) -> str:
    """Convierte bytes a cadena legible (ej: 1.4 GB)."""
    b = float(b)
    for unit in SIZE_UNITS:
        if abs(b) < 1024:
            return f"{b:,.1f} {unit}"
        b /= 1024
    return f"{b:,.1f} PB"


def format_pct(part: int, total: int) -> str:
    """Devuelve porcentaje como cadena (ej: '12.3%')."""
    if total <= 0:
        return "0.0%"
    return f"{part / total * 100:.1f}%"
