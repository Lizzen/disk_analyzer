import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import React from "react";

export const _fmtSizeCache = new Map();
export function fmtSize(b) {
  if (b == null || isNaN(b)) return "—";
  const cached = _fmtSizeCache.get(b);
  if (cached) return cached;
  const u = ["B","KB","MB","GB","TB"];
  let v = b, i = 0;
  while (v >= 1024 && i < u.length-1) { v /= 1024; i++; }
  const result = `${v.toFixed(i===0?0:1)} ${u[i]}`;
  if (_fmtSizeCache.size > 5000) _fmtSizeCache.clear();
  _fmtSizeCache.set(b, result);
  return result;
}

export function fmtNum(n) {
  return n == null ? "—" : Number(n).toLocaleString("es-ES");
}

// Barra de progreso relativa (0-100%)
export function MiniBar({ pct, color, C }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
      <div className="h-full rounded-full transition-all duration-500"
           style={{ width: `${Math.min(pct,100)}%`, background: color }} />
    </div>
  );
}

// Icono de ordenación
export function SortIcon({ col, sortCol, sortAsc, C }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="opacity-20 ml-0.5" />;
  return sortAsc
    ? <ChevronUp   size={11} className="ml-0.5" style={{ color: C.accentL }} />
    : <ChevronDown size={11} className="ml-0.5" style={{ color: C.accentL }} />;
}

// ── MermaidLightbox: overlay de diagrama ampliado ────────────────────────────
