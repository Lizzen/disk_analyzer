import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Square, FolderOpen, HardDrive, Search,
  MessageSquare, X, Send, Bot, User, Loader2,
  AlertCircle, CheckCircle2, Folder, Settings,
  ChevronUp, ChevronDown, ChevronsUpDown,
  FileText, Film, Image, Music, Archive, Database, Code, Clock,
  AlertTriangle, BarChart2
} from "lucide-react";

const API = "http://127.0.0.1:8000";

// ── Paleta (espeja theme.py) ───────────────────────────────────────────────────
const C = {
  // Fondos — espeja BG_* de theme.py
  bgDark:    "#0a0a0f",
  bgPanel:   "#0f0f17",
  bgSurface: "#13131e",
  bgCard:    "#1a1a28",
  bgCard2:   "#1e1e2e",
  bgInput:   "#0d0d18",
  bgHover:   "#22223a",
  bgSelected:"#1d2b4f",   // BG_SELECTED
  // Bordes
  border:     "#2a2a40",
  borderFocus:"#4a4a7a",  // BORDER_FOCUS
  // Texto
  textPri:   "#f0f0ff",
  textSec:   "#9898b8",
  textMuted: "#4a4a6a",
  textAccent:"#a0a8ff",
  // Accentos
  accent:    "#6366f1",
  accentL:   "#818cf8",
  accentD:   "#4f46e5",
  green:     "#10b981",
  amber:     "#f59e0b",
  red:       "#f43f5e",
  purple:    "#a855f7",
  cyan:      "#06b6d4",
  blue:      "#3b82f6",
  // DiskBar track — DISK_TRACK
  diskTrack: "#1e1e30",
  // Tags FileTable — TAG_* de theme.py
  tagHugeBg:  "#1f0a14",
  tagLargeBg: "#1a1300",
  tagMedBg:   "#071225",
  tagCacheBg: "#0d0d1a",
  tagCacheFg: "#a855f7",
  tagOddBg:   "#0d0d17",
  tagEvenBg:  "#0f0f1a",
};

const CAT_COLORS = {
  "Videos":                  C.red,
  "Imagenes":                C.purple,
  "Audio":                   C.cyan,
  "Documentos":              C.blue,
  "Instaladores/ISO":        C.amber,
  "Temporales/Cache":        "#ef4444",
  "Desarrollo (compilados)": C.green,
  "Bases de datos":          C.accent,
  "Otros":                   "#6b7280",
};

const CAT_ICONS = {
  "Videos":                  Film,
  "Imagenes":                Image,
  "Audio":                   Music,
  "Documentos":              FileText,
  "Instaladores/ISO":        Archive,
  "Temporales/Cache":        Clock,
  "Desarrollo (compilados)": Code,
  "Bases de datos":          Database,
  "Otros":                   FileText,
};

const CATEGORIES = Object.keys(CAT_COLORS);

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini" },
  { id: "groq",   label: "Groq (Llama)"  },
  { id: "claude", label: "Claude"        },
  { id: "ollama", label: "Ollama Local"  },
];

// Modelos disponibles por proveedor (lista fija para cloud)
const KNOWN_MODELS = {
  gemini: [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-pro-preview-05-06",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
  ],
  groq: [
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
    "gemma-7b-it",
    "deepseek-r1-distill-llama-70b",
    "qwen-qwq-32b",
  ],
  claude: [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
  ],
};

const SIZE_FILTERS = [
  { label: "Todo",     min: 0                    },
  { label: "> 1 MB",   min: 1024**2              },
  { label: "> 10 MB",  min: 10*1024**2           },
  { label: "> 100 MB", min: 100*1024**2          },
  { label: "> 500 MB", min: 500*1024**2          },
  { label: "> 1 GB",   min: 1024**3              },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSize(b) {
  if (b == null || isNaN(b)) return "—";
  const u = ["B","KB","MB","GB","TB"];
  let v = b, i = 0;
  while (v >= 1024 && i < u.length-1) { v /= 1024; i++; }
  return `${v.toFixed(i===0?0:1)} ${u[i]}`;
}

function fmtNum(n) {
  return n == null ? "—" : Number(n).toLocaleString("es-ES");
}

// Barra de progreso relativa (0-100%)
function MiniBar({ pct, color }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
      <div className="h-full rounded-full transition-all duration-500"
           style={{ width: `${Math.min(pct,100)}%`, background: color }} />
    </div>
  );
}

// Icono de ordenación
function SortIcon({ col, sortCol, sortAsc }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="opacity-20 ml-0.5" />;
  return sortAsc
    ? <ChevronUp   size={11} className="ml-0.5" style={{ color: C.accentL }} />
    : <ChevronDown size={11} className="ml-0.5" style={{ color: C.accentL }} />;
}

// ── ChatMarkdown: renderiza **bold**, `code`, ```bloques``` ───────────────────
function ChatMarkdown({ text }) {
  // Parsear bloques de código, negrita e inline-code
  const parts = [];
  const codeBlockRe = /```(?:\w+\n)?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", val: text.slice(last, m.index) });
    parts.push({ type:"block", val: m[1].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", val: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "block") return (
          <pre key={i} className="rounded text-[10px] p-2 my-1 overflow-x-auto font-mono"
               style={{ background:"#0a0a12", color:"#a0f0c0", border:"1px solid #2a2a40" }}>
            {p.val}
          </pre>
        );
        // Inline formatting: **bold** and `code`
        const inline = p.val.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {inline.map((seg, j) => {
              if (seg.startsWith("**") && seg.endsWith("**"))
                return <strong key={j} style={{ fontWeight:700 }}>{seg.slice(2,-2)}</strong>;
              if (seg.startsWith("`") && seg.endsWith("`"))
                return <code key={j} className="font-mono text-[10px] px-1 rounded"
                             style={{ background:"#1a1a2e", color:"#a0f0c0" }}>{seg.slice(1,-1)}</code>;
              return seg;
            })}
          </span>
        );
      })}
    </>
  );
}

// ── TypingDots: animación de puntos "· · ·" ────────────────────────────────
function TypingDots() {
  const frames = ["·", "· ·", "· · ·"];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % frames.length), 500);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm tracking-widest">{frames[frame]}</span>;
}


// Fila virtualizada de la tabla de archivos (memoizada para evitar re-renders)
const FileRow = ({ index, style, data }) => {
  const { files, selectedPath, setSelectedPath, setCtxMenu } = data;
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
         className="grid gap-2 px-3 text-xs cursor-pointer"
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
};

// Virtualización propia — sin dependencias externas, inmune al bug de react-window
const ROW_H = 32;
const OVERSCAN = 8;

function FileTableVirtual({ files, selectedPath, setSelectedPath, setCtxMenu }) {
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
              <FileRow index={index} style={{}} data={{ files, selectedPath, setSelectedPath, setCtxMenu }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function App() {

  // ── Escaneo ──────────────────────────────────────────────────────────────────
  const [targetPath, setTargetPath] = useState("C:/");
  const [scanning, setScanning]     = useState(false);
  const [progress, setProgress]     = useState(0);
  const [statusDot, setStatusDot]   = useState("idle"); // idle|scanning|ok|warn
  const [statusMsg, setStatusMsg]   = useState("Listo — selecciona una carpeta y pulsa Escanear");
  const [statusStats, setStatusStats] = useState("");
  const [allFiles, setAllFiles]     = useState([]);
  const [folders, setFolders]       = useState({});
  const ws = useRef(null);
  const wsRetryTimer  = useRef(null);
  // Refs para acumular datos durante el escaneo sin disparar re-renders por cada lote
  const allFilesRef   = useRef([]);
  const foldersRef    = useRef({});
  const flushTimer    = useRef(null);
  const handleMsgRef  = useRef(null); // siempre apunta a la versión más reciente

  // ── Disco ─────────────────────────────────────────────────────────────────────
  const [diskInfo, setDiskInfo] = useState(null);

  // ── Filtros / Ordenación ──────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState("");
  const [sizeFilter, setSizeFilter]         = useState(0);
  const [nameFilter, setNameFilter]         = useState("");       // input inmediato
  const [nameFilterDeferred, setNameFilterDeferred] = useState(""); // debounced 200ms
  const [selectedFolder, setSelectedFolder] = useState("");
  const [sortCol, setSortCol] = useState("size");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(col !== "size"); }
  };

  // ── Summary ───────────────────────────────────────────────────────────────────
  const [summary, setSummary]           = useState(null);
  const [showSummary, setShowSummary]   = useState(false);
  const [duplicates, setDuplicates]     = useState([]);
  const [showDups, setShowDups]         = useState(false);

  // ── Menú contextual de la tabla ───────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, file } | null
  // { file, mode: "trash"|"permanent" } | null
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteStatus,  setDeleteStatus]  = useState(""); // "", "loading", "ok", "error:..."

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const [provider, setProvider]         = useState("gemini");
  const [chatInput, setChatInput]       = useState("");
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatError, setChatError]       = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const chatBottomRef = useRef(null);

  // ── Config ────────────────────────────────────────────────────────────────────
  const [showSettings, setShowSettings]   = useState(false);
  const [settingsTab, setSettingsTab]     = useState("keys"); // keys | models | params
  const [config, setConfig]               = useState({});
  const [apiKeys, setApiKeys]             = useState({ GEMINI_API_KEY:"", ANTHROPIC_API_KEY:"", GROQ_API_KEY:"" });
  const [modelInputs, setModelInputs]     = useState({ GEMINI_MODEL:"", GROQ_MODEL:"", CLAUDE_MODEL:"", OLLAMA_MODEL:"" });
  const [savingConfig, setSavingConfig]   = useState(false);
  const [configMsg, setConfigMsg]         = useState("");
  const [verifying, setVerifying]         = useState(false);
  const [verifyResults, setVerifyResults] = useState(null);
  // Parámetros del LLM
  const [temperature, setTemperature]     = useState(0.7);
  const [maxTokens, setMaxTokens]         = useState(1024);
  // Modelos Ollama detectados localmente
  const [ollamaModels, setOllamaModels]   = useState([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);

  const fetchOllamaModels = async () => {
    setOllamaLoading(true);
    try {
      const r = await fetch(`${API}/api/ollama/models`);
      if (r.ok) {
        const d = await r.json();
        setOllamaModels(d.models || []);
      }
    } catch {}
    finally { setOllamaLoading(false); }
  };

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    connectWs();
    fetchDiskInfo(targetPath);
    fetchConfig();
    fetchOllamaModels();
    return () => {
      if (wsRetryTimer.current) clearTimeout(wsRetryTimer.current);
      if (flushTimer.current)   clearTimeout(flushTimer.current);
      ws.current?.close();
    };
  }, []);

  // Debounce nameFilter → nameFilterDeferred (200 ms)
  useEffect(() => {
    const t = setTimeout(() => setNameFilterDeferred(nameFilter), 200);
    return () => clearTimeout(t);
  }, [nameFilter]);

  // Mantener handleMsgRef siempre actualizado (evita closure stale en onmessage)
  useEffect(() => { handleMsgRef.current = handleMsg; });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // ── WebSocket ─────────────────────────────────────────────────────────────────
  const connectWs = () => {
    if (ws.current && ws.current.readyState < 2) ws.current.close();
    const sock = new WebSocket("ws://127.0.0.1:8000/ws/scan");
    sock.onopen  = () => {
      setStatusMsg("Listo — selecciona una carpeta y pulsa Escanear");
      if (wsRetryTimer.current) { clearTimeout(wsRetryTimer.current); wsRetryTimer.current = null; }
    };
    sock.onclose = () => {};
    sock.onerror = () => {
      wsRetryTimer.current = setTimeout(connectWs, 2000);
      setStatusMsg("Conectando con el servidor…");
    };
    // Usar ref para siempre llamar a la versión más reciente de handleMsg
    sock.onmessage = (ev) => {
      let msgs; try { msgs = JSON.parse(ev.data); } catch { return; }
      if (!Array.isArray(msgs)) return;
      msgs.forEach(m => handleMsgRef.current?.(m));
    };
    ws.current = sock;
  };

  // Vuelca refs → estado (llamado por timer periódico y al finalizar)
  const flushToState = useCallback(() => {
    flushTimer.current = null;
    setAllFiles([...allFilesRef.current]);
    setFolders({...foldersRef.current});
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(flushToState, 500);
    }
  }, [flushToState]);

  const handleMsg = (m) => {
    const t = m.type;
    if (t === "start") {
      // Limpiar refs y estado
      allFilesRef.current = [];
      foldersRef.current  = {};
      if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
      setScanning(true); setProgress(0);
      setAllFiles([]); setFolders({});
      setSummary(null); setShowSummary(false); setDuplicates([]);
      setStatusDot("scanning");
      setStatusMsg(`Escaneando…  ${m.root || targetPath}`);
      setStatusStats("");
    } else if (t === "folder") {
      // Mutar ref directamente — sin spread del objeto completo
      const ex = foldersRef.current[m.path];
      foldersRef.current[m.path] = {
        ...m,
        size:       (ex?.size       || 0) + (m.size       || 0),
        file_count: (ex?.file_count || 0) + (m.file_count || 0),
      };
      scheduleFlush();
    } else if (t === "file_batch") {
      // Acumular en ref sin disparar re-render por cada lote
      for (let i = 0; i < m.entries.length; i++) allFilesRef.current.push(m.entries[i]);
      scheduleFlush();
    } else if (t === "progress") {
      const pct = m.total > 0 ? Math.round(m.done / m.total * 100) : 0;
      setProgress(pct);
      const cur = m.current?.split(/[\\/]/).pop() || m.current || "";
      setStatusMsg(`Escaneando…  ${cur}`);
      setStatusStats(`${fmtNum(m.done)} / ${fmtNum(m.total)} carpetas · ${fmtSize(m.bytes)}`);
    } else if (t === "done") {
      // Flush final garantizado antes de marcar como terminado
      if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
      setAllFiles([...allFilesRef.current]);
      setFolders({...foldersRef.current});
      setScanning(false); setProgress(100);
      const dups = Array.isArray(m.duplicates) ? m.duplicates : [];
      setDuplicates(dups);
      const hasErrors = (m.errors || 0) > 0;
      setStatusDot(hasErrors ? "warn" : "ok");
      setStatusMsg(
        hasErrors
          ? `Completado en ${m.elapsed?.toFixed(1)}s — ⚠ ${m.errors} carpeta(s) inaccesible(s)`
          : `✓ Completado en ${m.elapsed?.toFixed(1)}s`
      );
      setStatusStats("");
    }
  };

  const startScan = () => {
    if (scanning) return;
    fetchDiskInfo(targetPath);
    const send = () => ws.current?.send(JSON.stringify({ action:"start", path: targetPath }));
    if (ws.current?.readyState === WebSocket.OPEN) send();
    else { connectWs(); setTimeout(send, 400); }
  };

  const cancelScan = () => {
    ws.current?.send(JSON.stringify({ action:"cancel" }));
    setScanning(false);
    setStatusDot("idle");
    setStatusMsg("Escaneo cancelado.");
  };

  // ── Disco ─────────────────────────────────────────────────────────────────────
  const fetchDiskInfo = async (path) => {
    try {
      const r = await fetch(`${API}/api/disk-info?path=${encodeURIComponent(path)}`);
      if (r.ok) setDiskInfo(await r.json());
    } catch {}
  };

  // ── Config ────────────────────────────────────────────────────────────────────
  const fetchConfig = async () => {
    try {
      const r = await fetch(`${API}/api/config`);
      if (r.ok) {
        const d = await r.json();
        setConfig(d);
        if (d.DEFAULT_PROVIDER) setProvider(d.DEFAULT_PROVIDER);
        setModelInputs({
          GEMINI_MODEL:  d.GEMINI_MODEL  || "",
          GROQ_MODEL:    d.GROQ_MODEL    || "",
          CLAUDE_MODEL:  d.CLAUDE_MODEL  || "",
          OLLAMA_MODEL:  d.OLLAMA_MODEL  || "",
        });
      }
    } catch {}
  };

  const saveConfig = async () => {
    setSavingConfig(true); setConfigMsg("");
    try {
      const body = { ...apiKeys, ...modelInputs, DEFAULT_PROVIDER: provider };
      Object.keys(body).forEach(k => { if (!body[k]) delete body[k]; });
      const r = await fetch(`${API}/api/config`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body),
      });
      if (r.ok) { setConfigMsg("✓ Guardado"); fetchConfig(); }
      else setConfigMsg("✗ Error");
    } catch (e) { setConfigMsg(`✗ ${e.message}`); }
    finally { setSavingConfig(false); }
  };

  const verifyApis = async () => {
    setVerifying(true); setVerifyResults(null);
    try {
      const r = await fetch(`${API}/api/providers/status`);
      if (r.ok) setVerifyResults(await r.json());
    } catch (e) { setVerifyResults({ _error:{ available:false, reason:e.message }}); }
    finally { setVerifying(false); }
  };

  // ── Filtros / Orden ───────────────────────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    // Durante el escaneo: mostrar los últimos 500 sin ordenar (evita sort de array creciente)
    if (scanning) return allFiles.slice(-500);
    return allFiles
      .filter(f => {
        if (activeCategory && f.category !== activeCategory) return false;
        if (sizeFilter > 0 && f.size < sizeFilter) return false;
        if (nameFilterDeferred && !f.name.toLowerCase().includes(nameFilterDeferred.toLowerCase())) return false;
        if (selectedFolder && !f.path.startsWith(selectedFolder)) return false;
        return true;
      })
      .sort((a, b) => {
        let va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
        if (sortCol === "size") { va = a.size; vb = b.size; }
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortAsc ? cmp : -cmp;
      });
  }, [allFiles, scanning, activeCategory, sizeFilter, nameFilterDeferred, selectedFolder, sortCol, sortAsc]);

  const sortedFolders = useMemo(() =>
    Object.values(folders || {}).sort((a, b) => b.size - a.size),
  [folders]);

  // ── Summary (se calcula al terminar, diferido para no bloquear el render) ─────
  useEffect(() => {
    if (progress === 100 && allFiles.length > 0) {
      // setTimeout(0) libera el hilo principal para que React pinte "done" primero
      setTimeout(() => {
        const cats = {};
        let totalBytes = 0;
        for (let i = 0; i < allFiles.length; i++) {
          const f = allFiles[i];
          cats[f.category] = (cats[f.category] || 0) + f.size;
          totalBytes += f.size;
        }
        setSummary({
          files: allFiles.length,
          folders: Object.keys(folders || {}).length,
          totalBytes,
          duplicates: duplicates.length,
          categories: cats,
        });
        setShowSummary(true);
      }, 0);
    }
  }, [progress]);

  // ── Chat ──────────────────────────────────────────────────────────────────────
  // Refs para evitar closures stale en la función async de larga duración
  const chatLoadingRef  = useRef(false);
  const chatHistoryRef  = useRef([]);
  const providerRef     = useRef(provider);
  const selectedPathRef = useRef(selectedPath);
  const chatInputRef    = useRef(chatInput);

  // Mantener refs sincronizados con el estado
  useEffect(() => { chatHistoryRef.current  = chatHistory;  }, [chatHistory]);
  useEffect(() => { providerRef.current     = provider;     }, [provider]);
  useEffect(() => { selectedPathRef.current = selectedPath; }, [selectedPath]);
  useEffect(() => { chatInputRef.current    = chatInput;    }, [chatInput]);

  // Refs para parámetros LLM (evitar closure stale)
  const temperatureRef = useRef(temperature);
  const maxTokensRef   = useRef(maxTokens);
  useEffect(() => { temperatureRef.current = temperature; }, [temperature]);
  useEffect(() => { maxTokensRef.current   = maxTokens;   }, [maxTokens]);

  // Notificar al chat cuando termina un escaneo
  useEffect(() => {
    if (progress === 100 && allFiles.length > 0) {
      setChatHistory(prev => [
        ...prev,
        { role:"system", content:`✓ Escaneo completado — ${allFiles.length.toLocaleString("es-ES")} archivos indexados. Puedes preguntarme sobre ellos.` }
      ]);
    }
  }, [progress]);

  const sendChat = useCallback(async (text) => {
    const msg = (text ?? chatInputRef.current).trim();
    if (!msg || chatLoadingRef.current) return;
    chatLoadingRef.current = true;
    setChatInput(""); setChatError("");
    setChatHistory(prev => [...prev, { role:"user", content:msg }, { role:"assistant", content:"" }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          message:       msg,
          provider:      providerRef.current,
          selected_path: selectedPathRef.current,
          history:       chatHistoryRef.current.filter(m => m.role !== "system").slice(-20),
          temperature:   temperatureRef.current,
          max_tokens:    maxTokensRef.current,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return;
          try {
            const item = JSON.parse(raw);
            if (item.error) {
              setChatHistory(prev => { const c=[...prev]; c[c.length-1]={ role:"assistant", content:`⚠️ ${item.error}` }; return c; });
              setChatError(item.error); return;
            }
            if (item.chunk) {
              setChatHistory(prev => { const c=[...prev]; c[c.length-1]={ ...c[c.length-1], content: c[c.length-1].content + item.chunk }; return c; });
            }
          } catch {}
        }
      }
    } catch (e) {
      setChatHistory(prev => { const c=[...prev]; c[c.length-1]={ role:"assistant", content:`⚠️ ${e.message}` }; return c; });
      setChatError(e.message);
    } finally {
      chatLoadingRef.current = false;
      setChatLoading(false);
    }
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────────
  const diskPct  = diskInfo?.pct ?? 0;
  const diskClr  = diskPct > 90 ? C.red : diskPct > 75 ? C.amber : C.green;
  const dotClr   = { idle: C.textMuted, scanning: C.accent, ok: C.green, warn: C.amber }[statusDot];
  const msgClr   = { idle: C.textSec,   scanning: C.textPri, ok: C.green, warn: C.amber }[statusDot];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden font-sans select-none"
         style={{ background: C.bgDark, color: C.textPri }}>

      {/* ════════════════════════════════════════════════════════
          COLUMNA PRINCIPAL
      ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>

        {/* ── Toolbar ── */}
        <header className="h-13 flex items-center px-4 gap-3 shrink-0 border-b"
                style={{ background: C.bgSurface, borderColor: C.border }}>
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r" style={{ borderColor: C.border }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
                 style={{ background: `radial-gradient(circle, ${C.accentL}, ${C.accent})` }}>
              <HardDrive size={14} color="white" />
            </div>
            <div className="leading-none">
              <span className="text-sm font-bold" style={{ color: C.textPri }}>Disk</span>
              <span className="text-sm font-medium ml-0.5" style={{ color: C.accentL }}>Analyzer</span>
            </div>
          </div>

          {/* Ruta */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded min-w-0"
               style={{ background: C.bgInput, border: `1px solid ${C.border}` }}>
            <FolderOpen size={15} style={{ color: C.textMuted }} className="shrink-0" />
            <input type="text" value={targetPath}
                   onChange={e => setTargetPath(e.target.value)}
                   onKeyDown={e => e.key==="Enter" && startScan()}
                   disabled={scanning}
                   className="flex-1 bg-transparent outline-none text-sm min-w-0"
                   style={{ color: C.textPri, caretColor: C.accent }}
                   onFocus={e  => e.currentTarget.parentElement.style.borderColor = C.borderFocus}
                   onBlur={e   => e.currentTarget.parentElement.style.borderColor = C.border}
                   placeholder="C:/" />
          </div>

          {/* Botones */}
          {!scanning ? (
            <button onClick={startScan}
                    className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-semibold shrink-0 transition-all duration-150 hover:brightness-110 active:scale-95"
                    style={{ background: C.accent, color:"white" }}>
              <Play size={13} fill="currentColor" /> Escanear
            </button>
          ) : (
            <button onClick={cancelScan}
                    className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-semibold shrink-0 transition-all duration-150 hover:brightness-110 active:scale-95"
                    style={{ background: C.bgCard2, color: C.red, border:`1px solid ${C.border}` }}>
              <Square size={13} fill="currentColor" /> Cancelar
            </button>
          )}

          {/* Botón Duplicados */}
          {duplicates.length > 0 && (
            <button onClick={() => setShowDups(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs shrink-0 transition-all hover:brightness-110"
                    style={{ background:`${C.amber}22`, color:C.amber, border:`1px solid ${C.amber}44` }}>
              <AlertTriangle size={12} /> {duplicates.length} duplicados
            </button>
          )}
        </header>

        {/* ── DiskBar ── */}
        <div className="px-4 py-2.5 flex items-center gap-5 shrink-0 border-b"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          {/* Donut simplificado */}
          <div className="relative w-12 h-12 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4"
                      stroke={C.diskTrack} />
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4"
                      stroke={diskClr}
                      strokeDasharray={`${diskPct * 94.2 / 100} 94.2`}
                      style={{ transition:"stroke-dasharray 0.6s ease" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold" style={{ color: diskClr }}>{diskPct}%</span>
            </div>
          </div>

          {/* Barra horizontal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 text-[10px]" style={{ color: C.textMuted }}>
              <span style={{ color: diskClr }} className="font-semibold">{diskInfo?.path?.replace(/\//g,"\\") || targetPath}</span>
              <span>{fmtSize(diskInfo?.free)} libres de {fmtSize(diskInfo?.total)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: C.diskTrack }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width:`${diskPct}%`, background: diskClr }} />
            </div>
          </div>

          {/* Cards */}
          <div className="flex gap-3 shrink-0">
            {[
              { label:"USADO",  val: fmtSize(diskInfo?.used),  clr: C.textPri },
              { label:"LIBRE",  val: fmtSize(diskInfo?.free),  clr: diskClr   },
              { label:"TOTAL",  val: fmtSize(diskInfo?.total), clr: C.textSec },
            ].map(({ label, val, clr }) => (
              <div key={label} className="flex flex-col items-center px-3 py-1 rounded"
                   style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                <span className="text-[9px] font-bold mb-0.5" style={{ color: C.textMuted }}>{label}</span>
                <span className="text-sm font-bold font-mono" style={{ color: clr }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Summary Panel ── */}
        {showSummary && summary && (
          <div className="shrink-0 border-b" style={{ background: C.bgCard, borderColor: C.border, borderTopColor: C.accent, borderTopWidth: 2 }}>
            <div className="px-4 py-2 flex items-center gap-4">
              <span className="text-xs font-semibold" style={{ color: C.textAccent }}>✦ Resumen del escaneo</span>
              <div className="flex gap-3 flex-1">
                {[
                  { label:"ARCHIVOS",    val: fmtNum(summary.files),       clr: C.accent  },
                  { label:"CARPETAS",    val: fmtNum(summary.folders),     clr: C.cyan    },
                  { label:"TAMAÑO",      val: fmtSize(summary.totalBytes), clr: C.green   },
                  { label:"DUPLICADOS",  val: fmtNum(summary.duplicates),  clr: C.amber   },
                ].map(({ label, val, clr }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-1 rounded"
                       style={{ background: C.bgCard2, borderLeft:`3px solid ${clr}` }}>
                    <div>
                      <div className="text-[9px] font-bold" style={{ color: C.textMuted }}>{label}</div>
                      <div className="text-sm font-bold" style={{ color: clr }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Top categorías */}
              <div className="hidden xl:flex flex-col gap-0.5 min-w-[200px]">
                {Object.entries(summary.categories || {})
                  .sort((a,b)=>b[1]-a[1]).slice(0,4)
                  .map(([cat, bytes]) => {
                    const pct = summary.totalBytes > 0 ? bytes/summary.totalBytes*100 : 0;
                    const clr = CAT_COLORS[cat] || C.textMuted;
                    return (
                      <div key={cat} className="flex items-center gap-2 text-[10px]">
                        <span className="w-20 truncate" style={{ color: C.textSec }}>{cat.split(" ")[0]}</span>
                        <MiniBar pct={pct} color={clr} />
                        <span className="w-14 text-right font-mono" style={{ color: clr }}>{fmtSize(bytes)}</span>
                      </div>
                    );
                  })}
              </div>
              <button onClick={() => setShowSummary(false)} style={{ color: C.textMuted }}
                      className="hover:text-white transition-colors ml-2 shrink-0">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 border-b overflow-x-auto"
             style={{ background: C.bgPanel, borderColor: C.border }}>
          {/* Pills de categoría */}
          <button onClick={() => setActiveCategory("")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] shrink-0 transition-all"
                  style={{
                    background: activeCategory==="" ? `${C.accent}28` : C.bgCard,
                    color:      activeCategory==="" ? C.accentL : C.textSec,
                    border:     `1px solid ${activeCategory==="" ? C.accent+"66" : C.border}`,
                    fontWeight: activeCategory==="" ? 700 : 400,
                  }}>
            <BarChart2 size={11} /> Todos
          </button>

          {CATEGORIES.map(cat => {
            const clr = CAT_COLORS[cat];
            const Icon = CAT_ICONS[cat] || FileText;
            const active = activeCategory === cat;
            return (
              <button key={cat}
                      onClick={() => setActiveCategory(active ? "" : cat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] shrink-0 transition-all"
                      style={{
                        background: active ? `${clr}22` : C.bgCard,
                        color:      active ? clr : C.textSec,
                        border:     `1px solid ${active ? clr+"55" : C.border}`,
                        fontWeight: active ? 700 : 400,
                      }}>
                <Icon size={11} /> {cat.split(" ")[0].split("/")[0]}
              </button>
            );
          })}

          <div className="h-4 w-px mx-1 shrink-0" style={{ background: C.border }} />

          {/* Size filter */}
          <select value={sizeFilter} onChange={e => setSizeFilter(Number(e.target.value))}
                  className="text-[11px] px-2 py-1 rounded outline-none shrink-0"
                  style={{ background: C.bgCard, color: C.textSec, border:`1px solid ${C.border}` }}>
            {SIZE_FILTERS.map(f => (
              <option key={f.min} value={f.min}>{f.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Búsqueda */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded shrink-0"
               style={{ background: C.bgInput, border:`1px solid ${C.border}` }}>
            <Search size={12} style={{ color: C.textMuted }} />
            <input type="text" value={nameFilter}
                   onChange={e => setNameFilter(e.target.value)}
                   placeholder="Filtrar nombre…"
                   className="bg-transparent outline-none text-[11px] w-36"
                   style={{ color: C.textPri }} />
            {nameFilter && (
              <X size={12} className="cursor-pointer hover:opacity-80"
                 style={{ color: C.textMuted }} onClick={() => setNameFilter("")} />
            )}
          </div>
        </div>

        {/* ── Zona de trabajo ── */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

          {/* ── Tree Panel ── */}
          <div className="w-56 xl:w-64 flex flex-col shrink-0 border-r overflow-hidden"
               style={{ background: C.bgPanel, borderColor: C.border }}>
            <div className="flex items-center justify-between px-3 py-2 border-b text-[10px] font-bold tracking-widest"
                 style={{ color: C.textMuted, borderColor: C.border }}>
              <span className="flex items-center gap-1"><Folder size={11}/> CARPETAS</span>
              <span>TAMAÑO</span>
            </div>
            <div className="flex-1 overflow-y-auto py-0.5">
              {/* Todas */}
              <button onClick={() => { setSelectedFolder(""); setSelectedPath(""); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors"
                      style={{
                        background: selectedFolder==="" ? C.bgSelected : "transparent",
                        color:      selectedFolder==="" ? C.accentL : C.textSec,
                      }}>
                <HardDrive size={13} style={{ color: selectedFolder==="" ? C.accentL : C.textMuted }} className="shrink-0" />
                <span className="flex-1 truncate font-medium">Todas las carpetas</span>
              </button>

              {sortedFolders.slice(0, 200).map((f, i) => {
                const name  = f.path.split(/[\\/]/).filter(Boolean).pop() || f.path;
                const sel   = selectedFolder === f.path;
                const icon  = name.toLowerCase().includes("users") ? "👥"
                            : name.toLowerCase().includes("program") ? "🗂"
                            : name.toLowerCase().includes("downloads") || name.toLowerCase().includes("descargas") ? "⬇"
                            : name.toLowerCase().includes("documents") || name.toLowerCase().includes("documentos") ? "📁"
                            : name.toLowerCase().includes("desktop") || name.toLowerCase().includes("escritorio") ? "🖥"
                            : name.toLowerCase().includes("appdata") ? "⚙"
                            : "📂";
                return (
                  <button key={i}
                          onClick={() => { setSelectedFolder(f.path); setSelectedPath(f.path); }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors group"
                          style={{
                            background: sel ? C.bgSelected : "transparent",
                            color:      sel ? C.accentL : C.textSec,
                          }}
                          onMouseEnter={e => !sel && (e.currentTarget.style.background = C.bgHover)}
                          onMouseLeave={e => !sel && (e.currentTarget.style.background = "transparent")}>
                    <span className="text-sm shrink-0">{icon}</span>
                    <span className="flex-1 truncate">{name}</span>
                    <span className="shrink-0 text-[10px] font-mono" style={{ color: C.textMuted }}>{fmtSize(f.size)}</span>
                  </button>
                );
              })}
              {sortedFolders.length === 0 && !scanning && (
                <p className="text-[11px] px-3 py-4" style={{ color: C.textMuted }}>Sin datos. Inicia un escaneo.</p>
              )}
            </div>
          </div>

          {/* ── File Table ── */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: C.bgPanel, minHeight: 0 }}>
            {/* Cabecera de columnas */}
            <div className="grid gap-2 px-3 py-2 border-b text-[10px] font-bold tracking-widest shrink-0 select-none"
                 style={{ borderColor: C.border, background: C.bgSurface,
                          gridTemplateColumns:"1fr 90px 130px 55px 1fr" }}>
              {[
                { col:"name",      label:"NOMBRE"    },
                { col:"size",      label:"TAMAÑO",    right:true },
                { col:"category",  label:"CATEGORÍA" },
                { col:"extension", label:"EXT",       center:true },
                { col:"path",      label:"RUTA"       },
              ].map(({ col, label, right, center }) => (
                <button key={col}
                        onClick={() => handleSort(col)}
                        className="flex items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer"
                        style={{
                          color: sortCol===col ? C.accentL : C.textMuted,
                          justifyContent: right?"flex-end" : center?"center" : "flex-start",
                        }}>
                  {label}
                  <SortIcon col={col} sortCol={sortCol} sortAsc={sortAsc} />
                </button>
              ))}
            </div>

            {/* Filas virtualizadas */}
            {filteredFiles.length === 0 && !scanning ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3"
                   style={{ color: C.textMuted }}>
                <HardDrive size={40} className="opacity-20" />
                <p className="text-sm">{allFiles.length>0 ? "Sin resultados con los filtros actuales." : "Inicia un escaneo."}</p>
              </div>
            ) : scanning && allFiles.length === 0 ? (
              <div className="flex items-center justify-center h-32 gap-2" style={{ color: C.textMuted }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Escaneando…</span>
              </div>
            ) : (
              <FileTableVirtual
                files={filteredFiles}
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
                setCtxMenu={setCtxMenu}
              />
            )}

            <div className="px-3 py-1 text-[10px] border-t shrink-0 flex justify-between"
                 style={{ color: C.textMuted, borderColor: C.border, background: C.bgSurface }}>
              <span>{fmtNum(filteredFiles.length)} archivos{allFiles.length !== filteredFiles.length && !scanning ? ` / ${fmtNum(allFiles.length)} total` : ""}</span>
              {scanning && <span style={{ color: C.accent }}>escaneando…</span>}
            </div>
          </div>
        </div>

        {/* ── Status Bar ── */}
        <div className="shrink-0 border-t" style={{ borderColor: C.border }}>
          {/* Progress line */}
          <div className="h-0.5" style={{ background: C.border }}>
            <div className="h-full transition-all duration-300"
                 style={{ width:`${progress}%`, background: C.accent }} />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5"
               style={{ background: C.bgSurface }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotClr }} />
              <span className="text-[11px]" style={{ color: msgClr }}>{statusMsg}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: C.textMuted }}>
              {statusStats && <span>{statusStats}</span>}
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          PANEL DE CHAT
      ════════════════════════════════════════════════════════ */}
      <div className="w-72 xl:w-80 flex flex-col shrink-0 border-l" style={{ background: C.bgPanel, borderColor: C.border }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <div className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: C.accent }} />
            <span className="text-xs font-bold" style={{ color: C.textPri }}>Asistente IA</span>
            {/* Dot de estado del proveedor */}
            <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: { gemini:"#4285f4", groq:"#f55036", claude:"#d97706", ollama:"#10b981" }[provider] || C.green }} />
          </div>
          <div className="flex items-center gap-1">
            {/* Selector proveedor compacto */}
            <select value={provider} onChange={e => setProvider(e.target.value)}
                    className="text-[10px] px-1.5 py-0.5 rounded outline-none"
                    style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {/* Botón limpiar historial */}
            <button onClick={() => { setChatHistory([]); setChatError(""); }}
                    title="Limpiar historial"
                    className="p-1 rounded transition-colors hover:brightness-125"
                    style={{ color: C.textMuted }}>
              <X size={12} />
            </button>
            {/* Botón settings */}
            <button onClick={() => setShowSettings(s => !s)} title="Configuración"
                    className="p-1 rounded transition-colors"
                    style={{ color: showSettings ? C.accentL : C.textMuted,
                             background: showSettings ? `${C.accent}22` : "transparent" }}>
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* ── Settings panel con tabs ── */}
        {showSettings && (
          <div className="border-b shrink-0 overflow-y-auto" style={{ background: C.bgSurface, borderColor: C.border, maxHeight:"60vh" }}>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: C.border }}>
              {[["keys","🔑 Keys"],["models","🤖 Modelos"],["params","⚙ Params"]].map(([id, label]) => (
                <button key={id} onClick={() => setSettingsTab(id)}
                        className="flex-1 py-1.5 text-[10px] font-semibold transition-colors"
                        style={{
                          color: settingsTab===id ? C.accentL : C.textMuted,
                          borderBottom: `2px solid ${settingsTab===id ? C.accent : "transparent"}`,
                          background: "transparent",
                        }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* Tab: API Keys */}
              {settingsTab === "keys" && (
                <>
                  {[
                    { id:"GEMINI_API_KEY",    label:"Google Gemini", ph:"AIza…",    hasKey:"has_gemini_key"    },
                    { id:"ANTHROPIC_API_KEY", label:"Anthropic",     ph:"sk-ant-…", hasKey:"has_anthropic_key" },
                    { id:"GROQ_API_KEY",      label:"Groq",          ph:"gsk_…",    hasKey:"has_groq_key"      },
                  ].map(({ id, label, ph, hasKey }) => (
                    <div key={id} className="mb-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</span>
                        <span className="text-[9px]" style={{ color: config[hasKey] ? C.green : C.textMuted }}>
                          {config[hasKey] ? "● activa" : "○ sin key"}
                        </span>
                      </div>
                      <input type="password" value={apiKeys[id]}
                             onChange={e => setApiKeys(p => ({...p, [id]: e.target.value}))}
                             placeholder={ph}
                             className="w-full px-2 py-1 text-[10px] rounded outline-none font-mono"
                             style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }} />
                    </div>
                  ))}
                </>
              )}

              {/* Tab: Modelos */}
              {settingsTab === "models" && (
                <>
                  {/* Cloud providers: input con datalist de modelos conocidos */}
                  {[
                    { id:"GEMINI_MODEL",  label:"Gemini",  ph:"gemini-2.0-flash-lite",       prov:"gemini" },
                    { id:"GROQ_MODEL",    label:"Groq",    ph:"llama-3.1-70b-versatile",      prov:"groq"   },
                    { id:"CLAUDE_MODEL",  label:"Claude",  ph:"claude-haiku-4-5-20251001",    prov:"claude" },
                  ].map(({ id, label, ph, prov }) => (
                    <div key={id} className="mb-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5" style={{ color: C.textMuted }}>{label}</span>
                      <input type="text" list={`list-${prov}`} value={modelInputs[id]}
                             onChange={e => setModelInputs(p => ({...p, [id]: e.target.value}))}
                             placeholder={ph}
                             className="w-full px-2 py-1 text-[10px] rounded outline-none font-mono"
                             style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }} />
                      <datalist id={`list-${prov}`}>
                        {(KNOWN_MODELS[prov] || []).map(m => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                  ))}

                  {/* Ollama: selector dinámico con modelos locales detectados */}
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>Ollama (local)</span>
                      <button onClick={fetchOllamaModels} disabled={ollamaLoading}
                              className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:brightness-125 disabled:opacity-50"
                              style={{ background: C.bgCard2, color: C.green, border:`1px solid ${C.border}` }}>
                        {ollamaLoading ? "…" : "↺ detectar"}
                      </button>
                    </div>
                    {ollamaModels.length > 0 ? (
                      <select value={modelInputs.OLLAMA_MODEL}
                              onChange={e => setModelInputs(p => ({...p, OLLAMA_MODEL: e.target.value}))}
                              className="w-full px-2 py-1 text-[10px] rounded outline-none font-mono"
                              style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }}>
                        {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={modelInputs.OLLAMA_MODEL}
                             onChange={e => setModelInputs(p => ({...p, OLLAMA_MODEL: e.target.value}))}
                             placeholder={ollamaLoading ? "Detectando modelos…" : "llama3.2 (Ollama no detectado)"}
                             className="w-full px-2 py-1 text-[10px] rounded outline-none font-mono"
                             style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }} />
                    )}
                    {ollamaModels.length > 0 && (
                      <p className="mt-0.5 text-[9px]" style={{ color: C.green }}>
                        ✓ {ollamaModels.length} modelo{ollamaModels.length !== 1 ? "s" : ""} instalado{ollamaModels.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Tab: Params */}
              {settingsTab === "params" && (
                <>
                  {/* Temperatura */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>Temperatura</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: C.accentL }}>{temperature.toFixed(1)}</span>
                    </div>
                    <input type="range" min="0" max="2" step="0.1"
                           value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                           className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                           style={{ accentColor: C.accent }} />
                    <div className="flex justify-between mt-0.5 text-[9px]" style={{ color: C.textMuted }}>
                      <span>Preciso</span><span>Creativo</span>
                    </div>
                    <p className="mt-1 text-[9px] leading-snug" style={{ color: C.textMuted }}>
                      {temperature < 0.4 ? "Respuestas muy deterministas y conservadoras."
                       : temperature < 0.8 ? "Equilibrio entre precisión y creatividad."
                       : temperature < 1.4 ? "Respuestas más variadas y creativas."
                       : "Alta aleatoriedad — puede producir texto impredecible."}
                    </p>
                  </div>
                  {/* Max tokens */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>Máx. tokens</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: C.accentL }}>{maxTokens}</span>
                    </div>
                    <input type="range" min="256" max="4096" step="256"
                           value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                           className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                           style={{ accentColor: C.accent }} />
                    <div className="flex justify-between mt-0.5 text-[9px]" style={{ color: C.textMuted }}>
                      <span>256</span><span>4096</span>
                    </div>
                  </div>
                  {/* Proveedor por defecto */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>Proveedor por defecto</span>
                    <select value={provider} onChange={e => setProvider(e.target.value)}
                            className="w-full text-[10px] px-2 py-1 rounded outline-none"
                            style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }}>
                      {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Botones guardar / verificar */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: C.border }}>
                <button onClick={saveConfig} disabled={savingConfig}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ background: C.accent, color:"white" }}>
                  {savingConfig ? <Loader2 size={10} className="animate-spin"/> : <CheckCircle2 size={10}/>}
                  Guardar
                </button>
                <button onClick={verifyApis} disabled={verifying}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
                  {verifying ? <Loader2 size={10} className="animate-spin"/> : <AlertCircle size={10}/>}
                  Verificar
                </button>
                {configMsg && <span className="text-[10px]" style={{ color: C.green }}>{configMsg}</span>}
              </div>

              {/* Resultados verificación */}
              {verifyResults && (
                <div className="mt-2 space-y-1">
                  {Object.entries(verifyResults || {}).map(([pid, val]) => {
                    const available = val?.available ?? false;
                    const reason    = val?.reason ?? "";
                    return (
                      <div key={pid} className="flex items-start gap-1.5 text-[10px] px-2 py-1 rounded"
                           style={{ background: available ? `${C.green}12` : `${C.red}12`,
                                    color: available ? C.green : C.red }}>
                        {available
                          ? <CheckCircle2 size={10} className="mt-0.5 shrink-0"/>
                          : <AlertCircle  size={10} className="mt-0.5 shrink-0"/>}
                        <span><b className="capitalize">{pid}</b>{!available && reason ? `: ${reason}` : " ✓"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Contexto adjunto (📎 Attach selection) ── */}
        {selectedPath && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0"
               style={{ background:`${C.accent}0d`, borderColor: C.border }}>
            <span className="text-[10px]">📎</span>
            <span className="text-[10px] truncate flex-1 font-mono" style={{ color: C.textAccent }}>
              {selectedPath.split(/[\\/]/).pop()}
            </span>
            <button onClick={() => setSelectedPath("")} style={{ color: C.textMuted }} className="hover:brightness-150 shrink-0">
              <X size={10} />
            </button>
          </div>
        )}

        {/* ── Mensajes ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">

          {/* Sugerencias iniciales */}
          {chatHistory.length === 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold pt-1 pb-0.5" style={{ color: C.textPri }}>¿En qué puedo ayudarte?</p>
              <p className="text-[10px] pb-2" style={{ color: C.textSec }}>Escanea una carpeta y pregúntame sobre tus archivos.</p>
              {[
                "¿Qué carpeta ocupa más espacio?",
                "¿Puedo eliminar archivos temporales?",
                "Muéstrame los archivos más grandes",
                "¿Cuántos duplicados hay?",
                "¿Hay archivos que se puedan borrar de forma segura?",
              ].map(q => (
                <button key={q} onClick={() => sendChat(q)}
                        className="w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-colors"
                        style={{ background: C.bgCard, color: C.textSec, border:`1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Historial */}
          {chatHistory.map((msg, i) => {
            if (msg.role === "system") return (
              <div key={i} className="text-center text-[10px] py-1 px-2 rounded"
                   style={{ color: C.textMuted, background: `${C.green}0a`, border:`1px solid ${C.green}22` }}>
                {msg.content}
              </div>
            );
            const isUser = msg.role === "user";
            const msgProvider = msg.provider || provider;
            const provClr = { gemini:"#4285f4", groq:"#f55036", claude:"#d97706", ollama:"#10b981" }[msgProvider] || C.green;
            return (
              <div key={i} className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                     style={{ background: isUser ? `${C.accent}33` : `${provClr}22`,
                              color: isUser ? C.accentL : provClr }}>
                  {isUser ? <User size={10}/> : <Bot size={10}/>}
                </div>
                <div className="flex flex-col gap-0.5 max-w-[85%]">
                  <span className="text-[9px] font-bold px-1"
                        style={{ color: isUser ? C.accentL : provClr, textAlign: isUser ? "right" : "left" }}>
                    {isUser ? "Tú" : (PROVIDERS.find(p=>p.id===msgProvider)?.label || msgProvider)}
                  </span>
                  <div className="rounded-lg px-2.5 py-2 text-[11px] leading-relaxed"
                       style={{
                         background: isUser ? "#0f1e3d" : "#111113",
                         color: isUser ? "#e8f0fe" : "#fafafa",
                         border: `1px solid ${isUser ? C.accent+"22" : C.border}`,
                         whiteSpace: "pre-wrap", wordBreak:"break-word",
                       }}>
                    {msg.content
                      ? <ChatMarkdown text={msg.content} />
                      : <span className="flex items-center gap-1.5" style={{ color: C.textMuted }}>
                          <TypingDots />
                        </span>
                    }
                  </div>
                </div>
              </div>
            );
          })}

          {chatError && (
            <div className="flex items-start gap-2 text-[11px] p-2 rounded"
                 style={{ background:`${C.red}12`, color:C.red, border:`1px solid ${C.red}33` }}>
              <AlertCircle size={12} className="shrink-0 mt-0.5"/> {chatError}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* ── Footer: modelo activo + temp ── */}
        <div className="px-3 py-1 flex items-center justify-between border-t"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <span className="text-[9px] font-mono truncate" style={{ color: C.textMuted }}>
            {config[`${provider === "gemini" ? "GEMINI" : provider === "groq" ? "GROQ" : provider === "claude" ? "CLAUDE" : "OLLAMA"}_MODEL`] || provider}
          </span>
          <span className="text-[9px] font-mono shrink-0 ml-2" style={{ color: C.textMuted }}>
            t={temperature.toFixed(1)} · {maxTokens}tk
          </span>
        </div>

        {/* ── Input ── */}
        <div className="px-3 pt-2 pb-3 shrink-0" style={{ background: C.bgSurface }}>
          {/* Botón attach selection */}
          <button onClick={() => {
                    if (selectedPath) setSelectedPath("");
                    else if (allFiles.length > 0) {
                      // usar el path más reciente seleccionado en la tabla, o el folder seleccionado
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] mb-1.5 transition-colors hover:brightness-125"
                  style={{ color: selectedPath ? C.accentL : C.textMuted }}>
            <span>📎</span>
            <span>{selectedPath ? `Adjunto: ${selectedPath.split(/[\\/]/).pop()}` : "Adjuntar selección"}</span>
          </button>

          <div className="relative">
            <textarea value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      disabled={chatLoading}
                      rows={2}
                      placeholder="Pregunta sobre tus archivos… (Enter)"
                      className="w-full text-[11px] rounded-lg px-3 py-2 pr-9 outline-none resize-none"
                      style={{ background: C.bgInput, color: C.textPri,
                               border:`1px solid ${C.border}`, caretColor: C.accent,
                               lineHeight:"1.5" }} />
            <button onClick={() => sendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="absolute right-1.5 bottom-1.5 w-6 h-6 flex items-center justify-center rounded transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ background: C.accent }}>
              {chatLoading
                ? <Loader2 size={11} color="white" className="animate-spin"/>
                : <Send size={11} color="white"/>}
            </button>
          </div>
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[9px]" style={{ color: C.textMuted }}>Shift+Enter para nueva línea</span>
            <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>{chatInput.length} car</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MENÚ CONTEXTUAL DE LA TABLA
      ════════════════════════════════════════════════════════ */}
      {ctxMenu && (
        <>
          {/* Overlay invisible para cerrar al clickar fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 rounded-lg overflow-hidden shadow-2xl py-1"
               style={{ left: ctxMenu.x, top: ctxMenu.y, minWidth: 200,
                        background: C.bgCard2, border: `1px solid ${C.border}` }}>
            {/* Nombre del archivo */}
            <div className="px-3 py-1.5 border-b mb-1" style={{ borderColor: C.border }}>
              <p className="text-[10px] font-mono truncate" style={{ color: C.textMuted, maxWidth: 220 }}>
                {ctxMenu.file.name}
              </p>
              <p className="text-[9px] font-mono truncate" style={{ color: C.textMuted, maxWidth: 220 }}>
                {fmtSize(ctxMenu.file.size)} · {ctxMenu.file.category}
              </p>
            </div>
            {[
              { icon:"📂", label:"Abrir en Explorador", color: C.textPri, action: async () => {
                  await fetch(`${API}/api/open-in-explorer`, {
                    method:"POST", headers:{"Content-Type":"application/json"},
                    body: JSON.stringify({ path: ctxMenu.file.path }),
                  });
              }},
              { icon:"📋", label:"Copiar ruta", color: C.textPri, action: () => {
                  navigator.clipboard?.writeText(ctxMenu.file.path);
              }},
              { icon:"📎", label:"Adjuntar al chat", color: C.textPri, action: () => {
                  setSelectedPath(ctxMenu.file.path);
              }},
            ].map(({ icon, label, color, action }) => (
              <button key={label}
                      onClick={() => { action(); setCtxMenu(null); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left transition-colors"
                      style={{ color }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span>{icon}</span>{label}
              </button>
            ))}
            {/* Separador */}
            <div className="my-1 border-t" style={{ borderColor: C.border }} />
            {/* Eliminar a papelera */}
            <button
              onClick={() => { setCtxMenu(null); setDeleteConfirm({ file: ctxMenu.file, mode: "trash" }); setDeleteStatus(""); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left"
              style={{ color: C.amber }}
              onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>🗑️</span>Mover a la Papelera
            </button>
            {/* Eliminar permanentemente */}
            <button
              onClick={() => { setCtxMenu(null); setDeleteConfirm({ file: ctxMenu.file, mode: "permanent" }); setDeleteStatus(""); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left"
              style={{ color: C.red }}
              onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>⛔</span>Eliminar permanentemente
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL CONFIRMAR ELIMINACIÓN
      ════════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
             style={{ background:"rgba(0,0,0,0.75)" }}
             onClick={e => { if (e.target === e.currentTarget && deleteStatus !== "loading") setDeleteConfirm(null); }}>
          <div className="rounded-xl overflow-hidden w-[420px] shadow-2xl"
               style={{ background: C.bgCard, border: `1px solid ${deleteConfirm.mode === "permanent" ? C.red : C.amber}` }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b"
                 style={{ borderColor: C.border, background: C.bgSurface }}>
              <span className="text-lg">{deleteConfirm.mode === "permanent" ? "⛔" : "🗑️"}</span>
              <span className="text-sm font-semibold" style={{ color: deleteConfirm.mode === "permanent" ? C.red : C.amber }}>
                {deleteConfirm.mode === "permanent" ? "Eliminar permanentemente" : "Mover a la Papelera"}
              </span>
            </div>
            {/* Body */}
            <div className="px-4 py-4">
              <p className="text-[11px] mb-2" style={{ color: C.textSec }}>
                {deleteConfirm.mode === "permanent"
                  ? "Esta acción no se puede deshacer. El archivo será eliminado definitivamente."
                  : "El archivo se moverá a la Papelera de reciclaje. Podrás recuperarlo desde allí."}
              </p>
              <div className="rounded px-3 py-2 font-mono text-[10px] truncate"
                   style={{ background: C.bgInput, color: C.textMuted, border: `1px solid ${C.border}` }}>
                {deleteConfirm.file.path}
              </div>
              <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                {fmtSize(deleteConfirm.file.size)} · {deleteConfirm.file.category}
              </p>
              {/* Error message */}
              {deleteStatus.startsWith("error:") && (
                <p className="text-[11px] mt-2 rounded px-2 py-1" style={{ color: C.red, background:"#1f0a14", border:`1px solid ${C.red}` }}>
                  {deleteStatus.slice(6)}
                </p>
              )}
              {deleteStatus === "ok" && (
                <p className="text-[11px] mt-2" style={{ color: C.green }}>✓ Eliminado correctamente</p>
              )}
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: C.border }}>
              <button
                disabled={deleteStatus === "loading" || deleteStatus === "ok"}
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded text-[11px]"
                style={{ background: C.bgSurface, color: C.textSec, border: `1px solid ${C.border}` }}>
                Cancelar
              </button>
              {deleteStatus !== "ok" && (
                <button
                  disabled={deleteStatus === "loading"}
                  onClick={async () => {
                    setDeleteStatus("loading");
                    const endpoint = deleteConfirm.mode === "permanent" ? "/api/delete-permanent" : "/api/trash";
                    try {
                      const r = await fetch(`${API}${endpoint}`, {
                        method: "POST", headers: { "Content-Type":"application/json" },
                        body: JSON.stringify({ path: deleteConfirm.file.path }),
                      });
                      const d = await r.json();
                      if (d.ok) {
                        setDeleteStatus("ok");
                        // Quitar el archivo de la lista local
                        setAllFiles(prev => prev.filter(f => f.path !== deleteConfirm.file.path));
                        setTimeout(() => setDeleteConfirm(null), 1200);
                      } else {
                        setDeleteStatus(`error:${d.error || "Error desconocido"}`);
                      }
                    } catch (e) {
                      setDeleteStatus(`error:${e.message}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded text-[11px] font-semibold"
                  style={{ background: deleteConfirm.mode === "permanent" ? C.red : C.amber,
                           color: "#fff", opacity: deleteStatus === "loading" ? 0.6 : 1 }}>
                  {deleteStatus === "loading" ? "Eliminando…" : (deleteConfirm.mode === "permanent" ? "Eliminar" : "Mover a Papelera")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL DUPLICADOS
      ════════════════════════════════════════════════════════ */}
      {showDups && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
             style={{ background:"rgba(0,0,0,0.7)" }}
             onClick={e => e.target===e.currentTarget && setShowDups(false)}>
          <div className="rounded-xl overflow-hidden flex flex-col w-[700px] max-h-[70vh] shadow-2xl"
               style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
                 style={{ background: C.bgSurface, borderColor: C.border }}>
              <span className="text-sm font-semibold" style={{ color: C.textSec }}>
                {duplicates.length} grupos de duplicados (mismo nombre y tamaño, &gt;1 MB)
              </span>
              <button onClick={() => setShowDups(false)} style={{ color: C.textMuted }} className="hover:text-white">
                <X size={16}/>
              </button>
            </div>
            {/* Tabla */}
            <div className="overflow-y-auto flex-1">
              {/* Cabecera */}
              <div className="grid gap-2 px-4 py-2 text-[10px] font-bold tracking-widest border-b sticky top-0"
                   style={{ borderColor: C.border, background: C.bgSurface, color: C.textMuted,
                            gridTemplateColumns:"2fr 80px 60px 80px 3fr" }}>
                <div>NOMBRE</div>
                <div className="text-right">TAMAÑO</div>
                <div className="text-center">COPIAS</div>
                <div className="text-right">DESPERD.</div>
                <div>RUTAS</div>
              </div>
              {duplicates.slice(0, 200).map((dup, i) => {
                const wasted = dup.size * (dup.paths.length - 1);
                const bg = i%2===0 ? C.bgPanel : "#0f0f17";
                return (
                  <div key={i} className="grid gap-2 px-4 py-2 text-xs border-b items-start"
                       style={{ borderColor:`${C.border}44`, background: bg,
                                gridTemplateColumns:"2fr 80px 60px 80px 3fr" }}>
                    <div className="truncate font-medium" style={{ color: C.textPri }}>{dup.name}</div>
                    <div className="text-right font-mono" style={{ color: C.textSec }}>{fmtSize(dup.size)}</div>
                    <div className="text-center" style={{ color: C.amber }}>{dup.paths.length}</div>
                    <div className="text-right font-mono" style={{ color: C.red }}>{fmtSize(wasted)}</div>
                    <div className="space-y-0.5">
                      {dup.paths.slice(0, 3).map((p, j) => (
                        <div key={j} className="truncate font-mono text-[10px]" style={{ color: C.textMuted }}>{p}</div>
                      ))}
                      {dup.paths.length > 3 && (
                        <div className="text-[10px]" style={{ color: C.textMuted }}>…+{dup.paths.length-3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div className="flex justify-end px-4 py-3 border-t" style={{ borderColor: C.border, background: C.bgSurface }}>
              <button onClick={() => setShowDups(false)}
                      className="px-4 py-1.5 rounded text-sm transition-all hover:brightness-110"
                      style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
