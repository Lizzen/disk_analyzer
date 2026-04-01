import React, { useState, useMemo, memo, useRef, useEffect } from "react";
import { fmtSize, fmtNum } from "../../utils/helpers";
import { CAT_COLORS } from "../../utils/constants";
const NOW_MS = Date.now();
function mtimeBucket(mtime) {
  if (!mtime) return "Sin fecha";
  const diff = NOW_MS / 1000 - mtime;
  if (diff <  7 * 86400) return "Última semana";
  if (diff < 30 * 86400) return "Último mes";
  if (diff < 365 * 86400) return "Último año";
  if (diff < 3 * 365 * 86400) return "1–3 años";
  return "Más de 3 años";
}
const TIMELINE_ORDER = ["Última semana","Último mes","Último año","1–3 años","Más de 3 años","Sin fecha"];

// ── Treemap ────────────────────────────────────────────────────────────────────
// Algoritmo squarify para layout de treemap
function squarify(items, x, y, w, h) {
  if (!items.length) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0 || w <= 0 || h <= 0) return [];

  const result = [];
  let remaining = [...items];
  let rx = x, ry = y, rw = w, rh = h;

  while (remaining.length) {
    const isWide = rw >= rh;
    const strip = [];
    let stripVal = 0;
    const side = isWide ? rh : rw;

    let prevRatio = Infinity;
    for (const item of remaining) {
      const testVal = stripVal + item.value;
      const side2 = side * side;
      const a = side2 * item.value / (testVal * testVal);
      const b = testVal * testVal / (side2 * item.value);
      const newRatio = Math.max(a, b);
      if (!strip.length || newRatio < prevRatio) {
        strip.push(item);
        stripVal += item.value;
        prevRatio = newRatio;
      } else break;
    }

    remaining = remaining.slice(strip.length);
    const stripPct = stripVal / total;
    const stripW = isWide ? rw * stripPct : rw;
    const stripH = isWide ? rh : rh * stripPct;
    let sx = rx, sy = ry;

    for (const item of strip) {
      const pct = item.value / stripVal;
      const iw = isWide ? stripW : stripW * pct;
      const ih = isWide ? stripH * pct : stripH;
      result.push({ ...item, x: sx, y: sy, w: iw, h: ih });
      if (isWide) sy += ih; else sx += iw;
    }

    if (isWide) { rx += stripW; rw -= stripW; }
    else        { ry += stripH; rh -= stripH; }
  }
  return result;
}

// Precalculado una sola vez al cargar el módulo — evita Object.values() en cada render
const _CAT_COLOR_LIST = Object.values(CAT_COLORS);

const Treemap = memo(function Treemap({ folders, C, onSelect }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => {
    if (!dims.w || !dims.h || !folders.length) return [];
    const top20 = folders.slice(0, 40).map(f => ({
      label: f.path.split(/[\\/]/).pop() || f.path,
      path:  f.path,
      value: f.size,
    }));
    return squarify(top20, 0, 0, dims.w, dims.h);
  }, [folders, dims]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden"
         style={{ background: C.bgDark }}>
      {cells.map((cell, i) => {
        const color = _CAT_COLOR_LIST[i % _CAT_COLOR_LIST.length];
        const tooSmall = cell.w < 40 || cell.h < 24;
        return (
          <div key={cell.path}
               onClick={() => onSelect?.(cell.path)}
               title={`${cell.label}\n${fmtSize(cell.value)}`}
               className="absolute border cursor-pointer transition-all hover:brightness-125 hover:z-10"
               style={{
                 left: cell.x, top: cell.y, width: cell.w, height: cell.h,
                 background: `${color}22`,
                 borderColor: `${color}44`,
                 overflow: "hidden",
               }}>
            {!tooSmall && (
              <div className="p-1.5 h-full flex flex-col justify-between">
                <span className="text-[10px] font-semibold leading-tight truncate"
                      style={{ color }}>
                  {cell.label}
                </span>
                <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>
                  {fmtSize(cell.value)}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {cells.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs" style={{ color: C.textMuted }}>Escanea una carpeta para ver el Treemap</p>
        </div>
      )}
    </div>
  );
});

// ── Timeline ───────────────────────────────────────────────────────────────────
const Timeline = memo(function Timeline({ files, C }) {
  const buckets = useMemo(() => {
    const map = {};
    for (const f of files) {
      const b = mtimeBucket(f.mtime);
      if (!map[b]) map[b] = { count: 0, bytes: 0, files: [] };
      map[b].count++;
      map[b].bytes += f.size;
      if (map[b].files.length < 5) map[b].files.push(f);
    }
    const totalBytes = Object.values(map).reduce((s, b) => s + b.bytes, 0);
    return TIMELINE_ORDER
      .filter(k => map[k])
      .map(k => ({ label: k, ...map[k], pct: totalBytes > 0 ? map[k].bytes / totalBytes * 100 : 0 }));
  }, [files]);

  if (!buckets.length) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-xs" style={{ color: C.textMuted }}>Escanea una carpeta para ver la línea de tiempo</p>
    </div>
  );

  const BUCKET_COLORS = {
    "Última semana": "#10b981", "Último mes": "#3b82f6",
    "Último año":    "#a855f7", "1–3 años":   "#f59e0b",
    "Más de 3 años": "#f43f5e", "Sin fecha":  "#6b7280",
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
      {buckets.map(b => {
        const clr = BUCKET_COLORS[b.label] || C.accentL;
        return (
          <div key={b.label} className="rounded-xl overflow-hidden"
               style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5"
                 style={{ background: C.bgCard2, borderBottom:`1px solid ${C.border}` }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: clr }}/>
              <span className="text-xs font-bold" style={{ color: C.textPri }}>{b.label}</span>
              <span className="text-[10px] ml-auto font-mono" style={{ color: C.textMuted }}>
                {fmtNum(b.count)} archivos · {fmtSize(b.bytes)}
              </span>
              <span className="text-[10px] font-bold" style={{ color: clr }}>
                {b.pct.toFixed(1)}%
              </span>
            </div>
            {/* Barra */}
            <div className="px-4 pt-2 pb-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.bgDark }}>
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width:`${b.pct}%`, background: clr }}/>
              </div>
            </div>
            {/* Top archivos */}
            <div className="px-4 pb-3 pt-1 space-y-1">
              {b.files.map(f => (
                <div key={f.path} className="flex items-center gap-2 text-[10px]">
                  <span className="truncate flex-1" style={{ color: C.textSec }}>{f.name}</span>
                  <span className="font-mono shrink-0" style={{ color: clr }}>{fmtSize(f.size)}</span>
                </div>
              ))}
              {b.count > 5 && (
                <p className="text-[9px]" style={{ color: C.textMuted }}>… y {fmtNum(b.count - 5)} más</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ── HorizontalBarChart ────────────────────────────────────────────────────────

const BAR_PALETTE = [
  "#6366f1","#22d3ee","#10b981","#f59e0b","#f43f5e",
  "#8b5cf6","#3b82f6","#ec4899","#14b8a6","#84cc16",
];

const HorizontalBarChart = memo(function HorizontalBarChart({ folders, C, topN = 25 }) {
  const top = useMemo(() =>
    [...folders].sort((a,b) => b.size - a.size).slice(0, topN),
  [folders, topN]);

  if (!top.length) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: C.textMuted }}>
      <p className="text-sm">Escanea una carpeta para ver el gráfico</p>
    </div>
  );

  const maxSize = top[0].size || 1;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4"
         style={{ scrollbarWidth:"thin", scrollbarColor:`${C.border} transparent` }}>
      <p className="text-[10px] font-bold tracking-widest mb-4" style={{ color: C.textMuted }}>
        TOP {top.length} CARPETAS POR TAMAÑO
      </p>
      <div className="space-y-2">
        {top.map((f, i) => {
          const pct  = f.size / maxSize * 100;
          const clr  = BAR_PALETTE[i % BAR_PALETTE.length];
          const name = f.path.split(/[\\/]/).filter(Boolean).pop() || f.path;
          return (
            <div key={f.path} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold shrink-0 w-5 text-right"
                        style={{ color: C.textMuted }}>{i+1}</span>
                  <span className="text-[11px] truncate" style={{ color: C.textPri }}
                        title={f.path}>{name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-[11px] font-mono" style={{ color: clr }}>{fmtSize(f.size)}</span>
                  <span className="text-[10px]" style={{ color: C.textMuted }}>{fmtNum(f.file_count)} arch.</span>
                </div>
              </div>
              <div className="h-5 rounded overflow-hidden flex"
                   style={{ background: C.bgCard }}>
                <div className="h-full rounded transition-all duration-700 flex items-center px-2"
                     style={{ width:`${pct}%`, background:`${clr}cc`, minWidth: 4 }}>
                  {pct > 15 && (
                    <span className="text-[9px] font-bold text-white truncate">{(pct).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export { mtimeBucket, squarify, Treemap, Timeline, HorizontalBarChart };
