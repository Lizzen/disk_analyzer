import React, { memo, useRef, useEffect, useState, useMemo } from "react";
import { Folder, FileText } from "lucide-react";
import { CAT_ICONS, CAT_COLORS } from "../../utils/constants";
import { fmtSize } from "../../utils/helpers";

// Fila virtualizada de la tabla de archivos (memoizada para evitar re-renders)
const FileRow = memo(({ index, style, data }) => {
  const { files, selectedPath, setSelectedPath, setCtxMenu, C } = data;
  const file = files[index];
  if (!file) return null;
  const sel      = selectedPath === file.path;
  const Icon     = CAT_ICONS[file.category] || FileText;
  const clr      = CAT_COLORS[file.category] || C.textMuted;
  const rowBg    = sel             ? C.bgSelected
                 : file.is_cache   ? C.tagCacheBg
                 : file.size >= 1073741824 ? C.tagHugeBg
                 : file.size >= 104857600  ? C.tagLargeBg
                 : file.size >= 10485760   ? C.tagMedBg
                 : index % 2 === 0 ? C.tagOddBg : C.tagEvenBg;
  const sizeClr  = file.size >= 1073741824 ? C.red
                 : file.size >= 104857600  ? C.amber
                 : file.size >= 10485760   ? C.accentL
                 : C.textSec;

  const handleCtx = (e) => {
    e.preventDefault();
    setSelectedPath(file.path);
    setCtxMenu({ x: e.clientX, y: e.clientY, file });
  };

  return (
    <div onClick={() => setSelectedPath(file.path)}
         onContextMenu={handleCtx}
         onDoubleClick={() => navigator.clipboard?.writeText(file.path)}
         className="grid gap-2 px-3 text-xs cursor-pointer transition-all duration-200 hover:scale-[1.002] hover:z-10 hover:shadow-md border-transparent hover:border-[--border]/50"
         onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bgHover; }}
         onMouseLeave={e => { if (!sel) e.currentTarget.style.background = rowBg; }}
         style={{ ...style, background: rowBg, borderBottom: `1px solid ${C.border}44`,
                  gridTemplateColumns:"1fr 90px 130px 55px 1fr", alignItems:"center",
                  display:"grid", gap:"0.5rem", padding:"0 0.75rem" }}>
      <div className="flex items-center gap-2 truncate">
        <Icon size={13} style={{ color: clr }} className="shrink-0" />
        <span className="truncate" style={{ color: sel ? C.accentL : C.textPri }}>{file.name}</span>
        {file.is_cache && (
          <span className="shrink-0 text-[9px] px-1 rounded"
                style={{ background: C.tagCacheBg, color: C.tagCacheFg }}>cache</span>
        )}
      </div>
      <div className="text-right font-mono" style={{ color: sizeClr }}>{fmtSize(file.size)}</div>
      <div className="truncate" style={{ color: clr }}>{file.category}</div>
      <div className="text-center font-mono truncate" style={{ color: C.textMuted }}>{file.extension}</div>
      <div className="truncate font-mono text-[10px]" style={{ color: C.textMuted }}>{file.path}</div>
    </div>
  );
}, (prev, next) => {
  // Solo re-renderizar si cambia la selección para esta fila, o el archivo mismo
  const prevSel = prev.data.selectedPath === prev.data.files[prev.index]?.path;
  const nextSel = next.data.selectedPath === next.data.files[next.index]?.path;
  return prevSel === nextSel &&
         prev.data.files[prev.index] === next.data.files[next.index] &&
         prev.data.C === next.data.C;
});

// Virtualización propia — sin dependencias externas, inmune al bug de react-window
const ROW_H = 32;
const OVERSCAN = 8;

function FileTableVirtual({ files, selectedPath, setSelectedPath, setCtxMenu, C }) {
  const outerRef  = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH,     setViewH]     = useState(0);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalH    = files.length * ROW_H;
  const startIdx  = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visCount  = viewH > 0 ? Math.ceil(viewH / ROW_H) + OVERSCAN * 2 : 0;
  const endIdx    = Math.min(files.length, startIdx + visCount);
  const visible   = files.slice(startIdx, endIdx);

  // Objeto data estable — evita que FileRow re-renderice por nuevo objeto en cada render
  const rowData = useMemo(() => ({ files, selectedPath, setSelectedPath, setCtxMenu, C }),
    [files, selectedPath, setSelectedPath, setCtxMenu, C]);

  return (
    <div ref={outerRef}
         onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
         style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
      {/* spacer total */}
      <div style={{ height: totalH, position: "relative" }}>
        {visible.map((file, i) => {
          const index = startIdx + i;
          return (
            <div key={file.path} style={{ position: "absolute", top: index * ROW_H, left: 0, right: 0, height: ROW_H }}>
              <FileRow index={index} style={{}} data={rowData} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FileTableVirtual, FileRow };
