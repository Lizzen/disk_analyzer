"""Modelos de datos del analizador."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FileEntry:
    path: str
    name: str
    size: int
    extension: str
    category: str
    is_cache: bool = False
    parent_dir: str = ""


@dataclass
class FolderNode:
    path: str
    name: str
    size: int = 0
    parent: Optional[str] = None
    file_count: int = 0
    tree_id: str = ""   # iid en ttk.Treeview


@dataclass
class ScanResult:
    root_path: str
    total_bytes: int = 0
    folders: dict = field(default_factory=dict)   # path -> FolderNode
    files: list = field(default_factory=list)      # [FileEntry]
    categories: dict = field(default_factory=dict) # cat -> bytes
    duplicates: dict = field(default_factory=dict) # (name,size) -> [paths]
    elapsed: float = 0.0
