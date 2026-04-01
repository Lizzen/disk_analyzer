import React, { useState, useEffect, memo, useMemo } from "react";
import { Trash2, AlertTriangle, ShieldAlert, Folder, ExternalLink, X, PlusSquare, Loader2, CheckCircle2, Bell, MessageSquare } from "lucide-react";
import { fmtSize, fmtNum } from "../../utils/helpers";
import { API } from "../../utils/constants";
// ── TempCleanerModal ───────────────────────────────────────────────────────────

const TempCleanerModal = React.memo(function TempCleanerModal({ onClose, C }) {
  const [loading, setLoading]     = useState(true);
  const [groups,  setGroups]      = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [selected, setSelected]   = useState(new Set());
  const [cleaning, setCleaning]   = useState(false);
  const [done,     setDone]       = useState(null); // { deleted, errors }
  const [cleanError, setCleanError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/temp-files`)
      .then(r => r.json())
      .then(d => { setGroups(d.groups || []); setGrandTotal(d.grand_total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleFile = (path) => setSelected(prev => {
    const n = new Set(prev);
    n.has(path) ? n.delete(path) : n.add(path);
    return n;
  });

  const toggleGroup = (group) => {
    const allPaths = group.files.map(f => f.path);
    const allSelected = allPaths.every(p => selected.has(p));
    setSelected(prev => {
      const n = new Set(prev);
      allPaths.forEach(p => allSelected ? n.delete(p) : n.add(p));
      return n;
    });
  };

  const selectAll = () => {
    const all = groups.flatMap(g => g.files.map(f => f.path));
    setSelected(new Set(all));
  };

  const selectedSize = useMemo(() => {
    let total = 0;
    for (const g of groups) for (const f of g.files) if (selected.has(f.path)) total += f.size;
    return total;
  }, [selected, groups]);

  const clean = async (mode) => {
    if (!selected.size) return;
    setCleaning(true);
    setCleanError(null);
    try {
      const r = await fetch(`${API}/api/temp-clean`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ paths: [...selected], mode }),
      });
      const d = await r.json();
      setDone(d);
      // Actualizar grupos eliminando los borrados
      const normPath = p => p.replace(/\//g, "\\").toLowerCase();
      const deletedSet = new Set((d.deleted || []).map(normPath));
      setGroups(prev => prev.map(g => ({
        ...g,
        files: g.files.filter(f => !deletedSet.has(normPath(f.path))),
        total_size: g.files.filter(f => !deletedSet.has(normPath(f.path))).reduce((s,f) => s+f.size, 0),
      })).filter(g => g.files.length > 0));
      setSelected(new Set());
    } catch (err) {
      setCleanError(err?.message || "Error de red al limpiar archivos.");
    } finally { setCleaning(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ background:"rgba(0,0,0,0.8)" }}
         onClick={e => e.target === e.currentTarget && !cleaning && onClose()}>
      <div className="rounded-xl overflow-hidden flex flex-col shadow-2xl"
           style={{ background: C.bgCard, border:`1px solid ${C.border}`, width: 680, maxHeight:"80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPri }}>
            <Trash2 size={14} style={{ color: C.amber }}/> Limpiador de temporales
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: C.textMuted }}>
              Total detectado: <span style={{ color: C.amber }}>{fmtSize(grandTotal)}</span>
            </span>
            <button onClick={onClose} disabled={cleaning}
                    style={{ color: C.textMuted }} className="hover:text-white"><X size={15}/></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3" style={{ color: C.textMuted }}>
              <Loader2 size={18} className="animate-spin"/> Analizando temporales…
            </div>
          )}
          {!loading && groups.length === 0 && (
            <div className="text-center py-12" style={{ color: C.green }}>
              <CheckCircle2 size={32} className="mx-auto mb-2"/>
              <p className="text-sm font-semibold">No se encontraron archivos temporales</p>
            </div>
          )}
          {groups.map(group => {
            const allSelected = group.files.length > 0 && group.files.every(f => selected.has(f.path));
            return (
              <div key={group.path} className="rounded-xl overflow-hidden"
                   style={{ border:`1px solid ${C.border}` }}>
                {/* Group header */}
                <div className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                     style={{ background: C.bgCard2 }}
                     onClick={() => toggleGroup(group)}>
                  <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(group)}
                         className="shrink-0" onClick={e => e.stopPropagation()}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: C.textPri }}>{group.label}</p>
                    <p className="text-[10px] truncate font-mono" style={{ color: C.textMuted }}>{group.path}</p>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: C.amber }}>
                    {fmtSize(group.total_size)}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: C.textMuted }}>
                    {fmtNum(group.total_files)} archivos
                  </span>
                </div>
                {/* File list (top 20) */}
                <div className="divide-y" style={{ borderColor: `${C.border}44` }}>
                  {group.files.slice(0, 20).map(f => (
                    <div key={f.path}
                         className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer"
                         style={{ background: selected.has(f.path) ? `${C.amber}08` : "transparent" }}
                         onMouseEnter={e => e.currentTarget.style.background = selected.has(f.path) ? `${C.amber}12` : C.bgHover}
                         onMouseLeave={e => e.currentTarget.style.background = selected.has(f.path) ? `${C.amber}08` : "transparent"}
                         onClick={() => toggleFile(f.path)}>
                      <input type="checkbox" checked={selected.has(f.path)} onChange={() => toggleFile(f.path)}
                             className="shrink-0" onClick={e => e.stopPropagation()}/>
                      <span className="flex-1 text-[11px] truncate font-mono" style={{ color: C.textSec }}>{f.name}</span>
                      <span className="text-[10px] font-mono shrink-0" style={{ color: C.amber }}>{fmtSize(f.size)}</span>
                    </div>
                  ))}
                  {group.files.length > 20 && (
                    <div className="px-3 py-1 text-[10px]" style={{ color: C.textMuted }}>
                      … y {fmtNum(group.files.length - 20)} archivos más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {done && (
            <div className="rounded-xl p-3" style={{ background:`${C.green}10`, border:`1px solid ${C.green}30` }}>
              <p className="text-xs font-semibold" style={{ color: C.green }}>
                ✓ {done.deleted?.length || 0} archivos eliminados
                {done.errors?.length > 0 && <span style={{ color: C.amber }}> · {done.errors.length} errores</span>}
              </p>
            </div>
          )}
          {cleanError && (
            <div className="rounded-xl p-3" style={{ background:`${C.red}10`, border:`1px solid ${C.red}30` }}>
              <p className="text-xs font-semibold" style={{ color: C.red }}>
                ✗ {cleanError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t shrink-0"
             style={{ borderColor: C.border, background: C.bgSurface }}>
          <button onClick={selectAll} className="text-[10px] hover:brightness-125"
                  style={{ color: C.textMuted }}>Seleccionar todo</button>
          <div className="flex-1"/>
          {selected.size > 0 && (
            <span className="text-[11px]" style={{ color: C.textPri }}>
              {selected.size} seleccionados · <span style={{ color: C.amber }}>{fmtSize(selectedSize)}</span>
            </span>
          )}
          <button onClick={() => clean("trash")}
                  disabled={!selected.size || cleaning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background:`${C.amber}20`, color: C.amber, border:`1px solid ${C.amber}40` }}>
            {cleaning ? <Loader2 size={11} className="animate-spin"/> : <Trash2 size={11}/>}
            Papelera
          </button>
          <button onClick={() => clean("permanent")}
                  disabled={!selected.size || cleaning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background:`${C.red}20`, color: C.red, border:`1px solid ${C.red}40` }}>
            {cleaning ? <Loader2 size={11} className="animate-spin"/> : <X size={11}/>}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
});

// ── RiskAlertsPanel ───────────────────────────────────────────────────────────

const RISK_ICONS = { high: "🔴", medium: "🟠", low: "🟡" };
const RISK_COLORS = { high: "red", medium: "amber", low: "green" };

const RiskAlertsPanel = React.memo(function RiskAlertsPanel({ alerts, onClose, onOpenExplorer, onAttach, C }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ background:"rgba(0,0,0,0.75)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-xl overflow-hidden flex flex-col shadow-2xl"
           style={{ background: C.bgCard, border:`2px solid ${C.red}44`, width: 580, maxHeight:"75vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPri }}>
            <Bell size={14} style={{ color: C.red }}/> Alertas de riesgo detectadas
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background:`${C.red}20`, color: C.red }}>
              {alerts.filter(a => a.severity === "high").length} críticas
            </span>
            <button onClick={onClose} style={{ color: C.textMuted }} className="hover:text-white"><X size={15}/></button>
          </div>
        </div>
        {/* Alerts list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.map((alert, i) => {
            const colorKey = RISK_COLORS[alert.severity] || "amber";
            const clr = C[colorKey] || C.amber;
            return (
              <div key={i} className="rounded-xl overflow-hidden"
                   style={{ border:`1px solid ${clr}44` }}>
                {/* Alert header */}
                <div className="flex items-start gap-3 px-3 py-2.5"
                     style={{ background:`${clr}10` }}>
                  <span className="text-lg shrink-0 mt-0.5">{RISK_ICONS[alert.severity]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: clr }}>{alert.title}</p>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: C.textSec }}>
                      {alert.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: clr }}>
                    {alert.size > 0 ? fmtSize(alert.size) : ""}
                  </span>
                </div>
                {/* Path + actions */}
                {alert.path && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-t"
                       style={{ borderColor:`${clr}22`, background: C.bgCard2 }}>
                    <span className="flex-1 text-[10px] font-mono truncate"
                          style={{ color: C.textMuted }}>{alert.path}</span>
                    {alert.action === "open" && (
                      <button onClick={() => onOpenExplorer(alert.path)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all hover:brightness-110 shrink-0"
                              style={{ background:`${C.cyan}18`, color: C.cyan, border:`1px solid ${C.cyan}30` }}>
                        <ExternalLink size={9}/> Abrir
                      </button>
                    )}
                    <button onClick={() => onAttach(alert)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all hover:brightness-110 shrink-0"
                            style={{ background:`${C.accent}18`, color: C.accentL, border:`1px solid ${C.accent}30` }}>
                      <MessageSquare size={9}/> Preguntar IA
                    </button>
                  </div>
                )}
                {/* File list (top 5) */}
                {alert.files?.length > 0 && (
                  <div className="px-3 pb-2 pt-1 space-y-0.5">
                    {alert.files.slice(0,5).map((p, j) => (
                      <p key={j} className="text-[9px] font-mono truncate"
                         style={{ color: C.textMuted }}>{p}</p>
                    ))}
                    {alert.files.length > 5 && (
                      <p className="text-[9px]" style={{ color: C.textMuted }}>… y {alert.files.length - 5} más</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end px-4 py-3 border-t shrink-0" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="px-4 py-1.5 rounded text-xs"
                  style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Toast notification system ─────────────────────────────────────────────────

let _toastId = 0;
export { TempCleanerModal, RiskAlertsPanel, RISK_ICONS, RISK_COLORS };
