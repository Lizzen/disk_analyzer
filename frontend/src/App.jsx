import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  Play, Square, FolderOpen, HardDrive, Search,
  MessageSquare, X, Send, Bot, User, Loader2,
  AlertCircle, CheckCircle2, Folder, Settings,
  ChevronUp, ChevronDown, ChevronsUpDown,
  FileText, Film, Image, Music, Archive, Database, Code, Clock,
  AlertTriangle, BarChart2,
  Key, Cpu, Sliders, Palette, Eye, EyeOff, RefreshCw, Save, Zap,
  Trash2, ExternalLink, PlayCircle, Clipboard, ScanLine, History,
  LayoutGrid, CalendarDays, Download, Table2,
  Star, GitCompare, Bell, BookOpen, Plus, Minus, ArrowRight,
  Monitor, MemoryStick, Thermometer, Timer, RotateCw, Battery, PenLine, Disc, Activity,
  CheckCircle, HelpCircle
} from "lucide-react";
import mermaid from "mermaid";

import { 
  API, APP_VERSION, CHAT_HISTORY_KEY, CHAT_MAX_PERSIST, CHAT_MAX_MEMORY, FAVORITES_KEY, SCAN_HISTORY_KEY, SCAN_HISTORY_MAX,
  CAT_COLORS, CAT_ICONS, PROVIDERS, THEMES, CATEGORIES, 
  WIN_PATH_RE, _savedTheme, SIZE_FILTERS 
} from "./utils/constants";
import { fmtSize, fmtNum, MiniBar, SortIcon } from "./utils/helpers";
import { MermaidLightbox, ensureMermaid, MermaidDiagram, CodeBlock, ChatMarkdown, TypingDots, ChatActionBar } from "./components/chat/ChatMarkdown";
import { FileTableVirtual, FileRow } from "./components/files/FileTableVirtual";
import { mtimeBucket, squarify, Treemap, Timeline, HorizontalBarChart } from "./components/visualizations/Visualizations";
import { SettingsModal } from './components/modals/SettingsModal';
import { TempCleanerModal, RiskAlertsPanel, RISK_ICONS, RISK_COLORS } from "./components/modals/TempAndRiskModals";
import { _toastListeners, _emitToast, _nextToastId, useToast, ToastContainer } from "./components/ui/Toast";
import { FolderCompareModal, ScanHistoryModal, SysInfoModal } from "./components/modals/OtherModals";


export default function App() {

  // ── Theme ─────────────────────────────────────────────────────────────────────
  const [themeId, setThemeId] = useState(_savedTheme);
  const C = THEMES[themeId] || THEMES["logo-neon"];
  const setTheme = (id) => { setThemeId(id); localStorage.setItem("da-theme", id); };

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

  // ── Vista activa ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("table"); // "table" | "treemap" | "timeline"

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const toast = useToast();

  // ── Alertas de riesgo ────────────────────────────────────────────────────────
  const [riskAlerts, setRiskAlerts]     = useState([]);
  const [showRiskPanel, setShowRiskPanel] = useState(false);

  // ── Favoritos ─────────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });
  const [showFavMenu, setShowFavMenu] = useState(false);
  const toggleFavorite = (path) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Historial de escaneos ─────────────────────────────────────────────────────
  const [scanHistory, setScanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  // ── Comparador de carpetas ────────────────────────────────────────────────────
  const [showCompare, setShowCompare] = useState(false);

  // ── Info del sistema ──────────────────────────────────────────────────────────
  const [showSysInfo, setShowSysInfo] = useState(false);

  // ── UI responsive ─────────────────────────────────────────────────────────────
  const [showMoreMenu, setShowMoreMenu] = useState(false);   // menú "Más" del toolbar
  const [chatCollapsed, setChatCollapsed] = useState(false); // panel chat colapsado

  // ── Limpiador de temporales ───────────────────────────────────────────────────
  const [showTempCleaner, setShowTempCleaner] = useState(false);

  // ── Carpetas pesadas conocidas ────────────────────────────────────────────────
  const [heavyFolders, setHeavyFolders] = useState([]);

  // ── Filtro por fecha de último acceso ─────────────────────────────────────────
  const [atimeFilter, setAtimeFilter] = useState(0); // 0 = sin filtro, valor en segundos

  // ── Menú contextual de la tabla ───────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, file } | null
  // { file, mode: "trash"|"permanent" } | null
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteStatus,  setDeleteStatus]  = useState(""); // "", "loading", "ok", "error:..."

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const [provider, setProvider]         = useState("gemini");
  const [chatInput, setChatInput]       = useState("");
  // Historial inicializado desde localStorage (memoria persistente entre sesiones).
  // Sanitiza los datos cargados: solo acepta campos primitivos conocidos.
  const [chatHistory, setChatHistory]   = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(m => m && typeof m.role === "string" && typeof m.content === "string")
        .map(({ role, content, provider: p }) => ({
          role, content,
          ...(p && typeof p === "string" ? { provider: p } : {}),
        }));
    } catch {
      return [];
    }
  });
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatError, setChatError]       = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  // Alerta de riesgo activa en el chat (objeto completo del backend)
  const [pendingRiskAlert, setPendingRiskAlert] = useState(null);
  const pendingRiskAlertRef                     = useRef(null);
  // Imagen adjunta al chat: { b64: string, mime: string, preview: string } | null
  const [attachedImage, setAttachedImage] = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const attachedImageRef                  = useRef(null);
  const fileInputRef                      = useRef(null);
  const chatBottomRef = useRef(null);
  // Modo agente: indica que la IA ha solicitado un escaneo automático
  const [agentMode, setAgentMode]       = useState(false);

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
  const [showKeys, setShowKeys]           = useState({});
  const [modelSearch, setModelSearch]     = useState("");
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

  const scrollThrottleRef = useRef(null);
  useEffect(() => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      scrollThrottleRef.current = null;
    }, 80);
    return () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
        scrollThrottleRef.current = null;
      }
    };
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
      setHeavyFolders([]);
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
    } else if (t === "heavy_folder") {
      setHeavyFolders(prev => {
        // Evitar duplicados por path
        if (prev.some(h => h.path === m.path)) return prev;
        return [...prev, { path: m.path, name: m.name, parent: m.parent, size: m.size }];
      });
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
      // Guardar en historial de escaneos (con resumen de carpetas y categorías)
      setScanHistory(prev => {
        const catTotals = {};
        for (const f of allFilesRef.current) {
          catTotals[f.category] = (catTotals[f.category] || 0) + f.size;
        }
        const entry = {
          path:       targetPath,
          ts:         Date.now(),
          files:      allFilesRef.current.length,
          bytes:      m.total_bytes || 0,
          categories: catTotals,
          topFolders: Object.values(foldersRef.current)
            .sort((a,b) => b.size - a.size).slice(0, 50)
            .map(f => ({ path: f.path, name: f.name || f.path.split(/[\\/]/).pop(), size: f.size, file_count: f.file_count })),
        };
        const next = [entry, ...prev.filter(e => e.path !== targetPath)].slice(0, SCAN_HISTORY_MAX);
        localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      // Toast de finalización
      if (hasErrors) {
        _emitToast({ id: _nextToastId(), msg: `Escaneo completado con ${m.errors} error(es) de acceso`, type: "warning", duration: 4000 });
      } else {
        _emitToast({ id: _nextToastId(), msg: `✓ Escaneo completado en ${m.elapsed?.toFixed(1)}s`, type: "success", duration: 3500 });
      }
    }
  };

  const startScan = useCallback((overridePath) => {
    const path = overridePath || targetPath;
    if (scanning) return;
    fetchDiskInfo(path);
    const send = () => ws.current?.send(JSON.stringify({ action:"start", path }));
    if (ws.current?.readyState === WebSocket.OPEN) send();
    else { connectWs(); setTimeout(send, 400); }
  }, [scanning, targetPath]);

  // Mantener ref de startScan para modo agente (evitar closure stale en sendChat)
  useEffect(() => { startScanRef.current = startScan; }, [startScan]);

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
  // Paso 1: filtrar — solo re-ejecuta cuando cambian los filtros o allFiles
  const _filteredOnly = useMemo(() => {
    if (scanning) return allFiles.slice(-500);
    return allFiles.filter(f => {
      if (activeCategory && f.category !== activeCategory) return false;
      if (sizeFilter > 0 && f.size < sizeFilter) return false;
      if (nameFilterDeferred && !f.name.toLowerCase().includes(nameFilterDeferred.toLowerCase())) return false;
      if (selectedFolder && !f.path.startsWith(selectedFolder)) return false;
      if (atimeFilter > 0) {
        const atime = f.atime || 0;
        if (atime > 0 && atime > (Date.now()/1000 - atimeFilter)) return false;
      }
      return true;
    });
  }, [allFiles, scanning, activeCategory, sizeFilter, nameFilterDeferred, selectedFolder, atimeFilter]);

  // Paso 2: ordenar — solo re-ejecuta cuando cambia el orden o el array filtrado.
  // _filteredOnly ya es un array nuevo (creado por .filter()), podemos ordenarlo in-place
  // sin spread, ahorrando la copia O(n) completa.
  const filteredFiles = useMemo(() => {
    if (scanning) return _filteredOnly;
    const isSize = sortCol === "size";
    return _filteredOnly.slice().sort((a, b) => {
      const va = isSize ? a.size : (a[sortCol] ?? "");
      const vb = isSize ? b.size : (b[sortCol] ?? "");
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  }, [_filteredOnly, scanning, sortCol, sortAsc]);

  const sortedFolders = useMemo(() =>
    Object.values(folders || {}).sort((a, b) => b.size - a.size),
  [folders]);

  const topFolders = useMemo(() => sortedFolders.slice(0, 200), [sortedFolders]);

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
  useEffect(() => { chatHistoryRef.current       = chatHistory;       }, [chatHistory]);
  useEffect(() => { providerRef.current          = provider;          }, [provider]);
  useEffect(() => { selectedPathRef.current      = selectedPath;      }, [selectedPath]);
  useEffect(() => { pendingRiskAlertRef.current  = pendingRiskAlert;  }, [pendingRiskAlert]);
  useEffect(() => { chatInputRef.current    = chatInput;    }, [chatInput]);

  // ── Persistencia del historial en localStorage (debounced 500ms) ───────────
  // Evita escribir en cada chunk del streaming — solo persiste cuando hay pausa.
  useEffect(() => {
    if (chatHistory.length === 0) {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      return;
    }
    const tid = setTimeout(() => {
      try {
        const sanitized = chatHistory
          .slice(-CHAT_MAX_PERSIST)
          .map(({ role, content, provider: p }) => ({
            role:     String(role    ?? ""),
            content:  String(content ?? ""),
            ...(p ? { provider: String(p) } : {}),
          }));
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(sanitized));
      } catch {
        // Si localStorage está lleno o hay un error inesperado, omitir silenciosamente
      }
    }, 500);
    return () => clearTimeout(tid);
  }, [chatHistory]);

  // ── Handlers de hover reutilizables (estables, evitan crear funciones en cada render) ──
  const onHoverIn  = useCallback(e => { e.currentTarget.style.background = C.bgHover; }, [C.bgHover]);
  const onHoverOut = useCallback(e => { e.currentTarget.style.background = "transparent"; }, []);
  const onHoverInCard  = useCallback(e => { e.currentTarget.style.borderColor = C.accent+"55"; e.currentTarget.style.background = C.bgHover; }, [C.accent, C.bgHover]);
  const onHoverOutCard = useCallback(e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }, [C.border, C.bgCard]);

  // ── Imagen adjunta: helpers ───────────────────────────────────────────────────
  // Tipos MIME aceptados por el backend
  const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

  const _loadImageFile = useCallback((file) => {
    if (!file || !ACCEPTED_MIME.includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;               // data:image/png;base64,XXXX
      const b64  = dataUrl.split(",")[1];
      const mime = file.type;
      const img  = { b64, mime, preview: dataUrl, name: file.name || "imagen" };
      setAttachedImage(img);
      attachedImageRef.current = img;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleChatPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && ACCEPTED_MIME.includes(item.type)) {
        e.preventDefault();
        _loadImageFile(item.getAsFile());
        return;
      }
    }
  }, [_loadImageFile]);

  const handleChatDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) _loadImageFile(file);
  }, [_loadImageFile]);

  const handleChatDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleChatDragLeave = useCallback(() => setDragOver(false), []);

  const clearAttachedImage = useCallback(() => {
    setAttachedImage(null);
    attachedImageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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
      // Detectar riesgos automáticamente al terminar
      fetch(`${API}/api/risks`)
        .then(r => r.json())
        .then(d => {
          if (d.alerts?.length > 0) {
            setRiskAlerts(d.alerts);
            const highs = d.alerts.filter(a => a.severity === "high").length;
            _emitToast({
              id: _nextToastId(),
              msg: highs > 0
                ? `⚠ ${highs} riesgo(s) crítico(s) detectado(s) — pulsa 🔔 para ver`
                : `${d.alerts.length} alerta(s) de riesgo detectada(s)`,
              type: highs > 0 ? "warning" : "info",
              duration: 5000,
            });
          } else {
            setRiskAlerts([]);
          }
        })
        .catch(() => {});
    }
  }, [progress]);

  // Ref para acceder a startScan desde sendChat sin closure stale
  const startScanRef = useRef(null);

  const sendChat = useCallback(async (text) => {
    const msg = (text ?? chatInputRef.current).trim();
    if (!msg || chatLoadingRef.current) return;
    chatLoadingRef.current = true;
    const imgSnap       = attachedImageRef.current;      // captura antes de limpiar
    const riskSnap      = pendingRiskAlertRef.current;   // captura alerta activa
    setChatInput(""); setChatError("");
    clearAttachedImage();
    setPendingRiskAlert(null); pendingRiskAlertRef.current = null;
    setChatHistory(prev => [...prev, { role:"user", content:msg }, { role:"assistant", content:"", provider: providerRef.current }].slice(-CHAT_MAX_MEMORY));
    setChatLoading(true);
    try {
      const body = {
        message:       msg,
        provider:      providerRef.current,
        selected_path: selectedPathRef.current,
        history:       chatHistoryRef.current.filter(m => m.role !== "system").slice(-20),
        temperature:   temperatureRef.current,
        max_tokens:    maxTokensRef.current,
        ...(imgSnap   ? { image_b64: imgSnap.b64, image_mime: imgSnap.mime } : {}),
        ...(riskSnap  ? { alert_risk: riskSnap } : {}),
      };
      const res = await fetch(`${API}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let pendingChunk = "";
      let flushId = null;
      let fullResponse = "";
      const flushChunk = () => {
        flushId = null;
        if (!pendingChunk) return;
        const toFlush = pendingChunk;
        fullResponse += toFlush;
        pendingChunk = "";
        setChatHistory(prev => {
          const c = [...prev];
          c[c.length-1] = { ...c[c.length-1], content: c[c.length-1].content + toFlush };
          return c;
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { flushChunk(); break; }
          try {
            const item = JSON.parse(raw);
            if (item.error) {
              if (flushId) { clearTimeout(flushId); flushId = null; }
              setChatHistory(prev => { const c=[...prev]; c[c.length-1]={ role:"assistant", content:`⚠️ ${item.error}` }; return c; });
              setChatError(item.error); return;
            }
            if (item.chunk) {
              pendingChunk += item.chunk;
              if (!flushId) flushId = setTimeout(flushChunk, 100);
            }
          } catch {}
        }
      }
      if (flushId) { clearTimeout(flushId); flushChunk(); }

      // ── Modo agente: detectar instrucción [SCAN:<ruta>] en la respuesta ──────
      // El LLM puede incluir [SCAN:C:\Users\...] para solicitar un escaneo automático.
      const agentMatch = fullResponse.match(/\[SCAN:([A-Za-z]:[^\]]+)\]/);
      if (agentMatch) {
        const scanPath = agentMatch[1].trim();
        setAgentMode(true);
        setChatHistory(prev => [
          ...prev,
          { role:"system", content:`🤖 Modo agente — iniciando escaneo de ${scanPath}…` },
        ].slice(-CHAT_MAX_MEMORY));
        // Pequeño delay para que el mensaje sea visible antes del scan
        setTimeout(() => {
          if (startScanRef.current) {
            setTargetPath(scanPath);
            // startScan usa targetPath via closure; necesitamos dispararlo después del setState
            setTimeout(() => startScanRef.current?.(), 100);
          }
          setAgentMode(false);
        }, 600);
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
  // Memoizado para evitar 3 llamadas a .filter() separadas en el render del chat
  const chatHistoryVisible = useMemo(
    () => chatHistory.filter(m => m.role !== "system"),
    [chatHistory]
  );

  const diskPct  = diskInfo?.pct ?? 0;
  const diskClr  = diskPct > 90 ? C.red : diskPct > 75 ? C.amber : C.green;
  const dotClr   = { idle: C.textMuted, scanning: C.accent, ok: C.green, warn: C.amber }[statusDot];
  const msgClr   = { idle: C.textSec,   scanning: C.textPri, ok: C.green, warn: C.amber }[statusDot];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden font-sans select-none"
         style={{ background: C.bgDark, color: C.textPri, '--bg-panel': C.bgPanel, '--bg-surface': C.bgSurface, '--bg-card': C.bgCard, '--bg-panel-glass': C.bgPanel+'d9', '--bg-surface-glass': C.bgSurface+'bf', '--bg-card-glass': C.bgCard+'a6', '--border': C.border, '--border-focus': C.borderFocus, '--accent': C.accent, '--accent-L': C.accentL, '--text-pri': C.textPri, '--text-sec': C.textSec, '--text-muted': C.textMuted }}>

      {/* ════════════════════════════════════════════════════════
          COLUMNA PRINCIPAL
      ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>

        {/* ── Toolbar ── */}
        <header className="flex items-center px-3 gap-2 shrink-0 border-b glass-surface" style={{ borderColor: C.border, minHeight: 48, flexWrap: "nowrap" }}>
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 pr-2 border-r" style={{ borderColor: C.border }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                 style={{ background: `radial-gradient(circle, ${C.accentL}, ${C.accent})` }}>
              <HardDrive size={14} color="white" />
            </div>
            <div className="leading-none hidden sm:block">
              <span className="text-sm font-bold" style={{ color: C.textPri }}>Disk</span>
              <span className="text-sm font-medium ml-0.5" style={{ color: C.accentL }}>Analyzer</span>
            </div>
          </div>

          {/* Ruta */}
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded min-w-0"
               style={{ background: C.bgInput, border: `1px solid ${C.border}` }}>
            <FolderOpen size={14} style={{ color: C.textMuted }} className="shrink-0" />
            <input type="text" value={targetPath}
                   onChange={e => setTargetPath(e.target.value)}
                   onKeyDown={e => e.key==="Enter" && startScan()}
                   disabled={scanning}
                   className="flex-1 bg-transparent outline-none text-xs min-w-0"
                   style={{ color: C.textPri, caretColor: C.accent }}
                   onFocus={e  => e.currentTarget.parentElement.style.borderColor = C.borderFocus}
                   onBlur={e   => e.currentTarget.parentElement.style.borderColor = C.border}
                   placeholder="C:/" />
          </div>

          {/* Favoritos */}
          <div className="relative shrink-0">
            <button onClick={() => setShowFavMenu(v => !v)} title="Rutas favoritas"
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-all hover:brightness-110"
                    style={{ background: favorites.length > 0 ? `${C.amber}18` : C.bgCard,
                             color: favorites.length > 0 ? C.amber : C.textMuted,
                             border:`1px solid ${favorites.length > 0 ? C.amber+"44" : C.border}` }}>
              <Star size={12} fill={favorites.length > 0 ? "currentColor" : "none"}/>
              {favorites.length > 0 && <span className="hidden md:inline">{favorites.length}</span>}
            </button>
            {showFavMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFavMenu(false)}/>
                <div className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl z-40 min-w-[240px]"
                     style={{ background: C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="px-3 py-2 border-b text-[10px] font-bold tracking-widest flex items-center justify-between"
                       style={{ borderColor: C.border, color: C.textMuted }}>
                    <span className="flex items-center gap-1.5"><Star size={9}/> FAVORITOS</span>
                    {favorites.length === 0 && <span>vacío</span>}
                  </div>
                  {favorites.length === 0 ? (
                    <p className="text-center text-[10px] py-4" style={{ color: C.textMuted }}>
                      Añade rutas pulsando ★ en el árbol
                    </p>
                  ) : (
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {favorites.map(path => (
                        <div key={path}
                             className="flex items-center gap-2 px-3 py-1.5 group"
                             onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                          <button className="flex-1 text-left text-[11px] truncate"
                                  style={{ color: C.textPri }}
                                  onClick={() => { setTargetPath(path); setShowFavMenu(false); }}>
                            {path}
                          </button>
                          <button onClick={() => toggleFavorite(path)}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: C.textMuted }}>
                            <X size={10}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {targetPath && (
                    <div className="border-t px-3 py-2" style={{ borderColor: C.border }}>
                      <button onClick={() => { toggleFavorite(targetPath); setShowFavMenu(false);
                                               _emitToast({ id: _nextToastId(), msg: favorites.includes(targetPath) ? "Eliminado de favoritos" : `"${targetPath.split(/[\\/]/).pop()}" añadido a favoritos`, type: "success", duration: 2500 }); }}
                              className="w-full flex items-center gap-2 text-[10px] py-1 transition-all hover:brightness-110"
                              style={{ color: favorites.includes(targetPath) ? C.amber : C.green }}>
                        <Star size={9} fill={favorites.includes(targetPath) ? "currentColor" : "none"}/>
                        {favorites.includes(targetPath) ? "Quitar de favoritos" : "Añadir ruta actual"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Alertas de riesgo — siempre visible si hay */}
          {riskAlerts.length > 0 && (
            <button onClick={() => setShowRiskPanel(true)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-xs shrink-0 transition-all hover:brightness-110"
                    style={{ background:`${riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber}22`,
                             color: riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber,
                             border:`1px solid ${riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber}44` }}>
              <Bell size={12}/> <span className="hidden sm:inline">{riskAlerts.length} riesgo{riskAlerts.length > 1 ? "s" : ""}</span>
              <span className="sm:hidden">{riskAlerts.length}</span>
            </button>
          )}

          {/* Duplicados — siempre visible si hay */}
          {duplicates.length > 0 && (
            <button onClick={() => setShowDups(true)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-xs shrink-0 transition-all hover:brightness-110"
                    style={{ background:`${C.amber}22`, color:C.amber, border:`1px solid ${C.amber}44` }}>
              <AlertTriangle size={12} /> <span className="hidden sm:inline">{duplicates.length} dup.</span>
              <span className="sm:hidden">{duplicates.length}</span>
            </button>
          )}

          {/* Selector de vista */}
          <div className="flex items-center rounded overflow-hidden shrink-0"
               style={{ border:`1px solid ${C.border}` }}>
            {[
              { id:"table",    Icon: Table2,      title:"Tabla"    },
              { id:"treemap",  Icon: LayoutGrid,  title:"Treemap"  },
              { id:"timeline", Icon: CalendarDays,title:"Tiempo"   },
              { id:"barchart", Icon: BarChart2,   title:"Barras"   },
            ].map(({ id, Icon: VIcon, title }) => (
              <button key={id} onClick={() => setViewMode(id)} title={title}
                      className="flex items-center gap-1 px-2 py-1.5 text-[10px] transition-all"
                      style={{
                        background: viewMode===id ? `${C.accent}30` : C.bgCard,
                        color:      viewMode===id ? C.accentL : C.textMuted,
                        borderRight: id!=="barchart" ? `1px solid ${C.border}` : undefined,
                      }}>
                <VIcon size={12}/>
                <span className="hidden lg:inline">{title}</span>
              </button>
            ))}
          </div>

          {/* ── Menú "Más" — agrupa herramientas secundarias ── */}
          <div className="relative shrink-0">
            <button onClick={() => setShowMoreMenu(v => !v)} title="Más opciones"
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-all hover:brightness-110"
                    style={{ background: showMoreMenu ? `${C.accent}22` : C.bgCard,
                             color: showMoreMenu ? C.accentL : C.textMuted,
                             border:`1px solid ${showMoreMenu ? C.accent+"55" : C.border}` }}>
              <Sliders size={13}/>
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)}/>
                <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl z-40 min-w-[180px]"
                     style={{ background: C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="px-3 py-2 border-b text-[9px] font-bold tracking-widest"
                       style={{ borderColor: C.border, color: C.textMuted }}>HERRAMIENTAS</div>

                  {/* Historial */}
                  <button onClick={() => { setShowHistory(true); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                          style={{ color: scanHistory.length > 0 ? C.cyan : C.textSec }}
                          onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                    <History size={13}/> Historial
                    {scanHistory.length > 0 && <span className="ml-auto text-[10px] font-bold">{scanHistory.length}</span>}
                  </button>

                  {/* Comparador */}
                  {Object.keys(folders).length > 1 && (
                    <button onClick={() => { setShowCompare(true); setShowMoreMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                            style={{ color: C.purple }}
                            onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                      <GitCompare size={13}/> Comparar carpetas
                    </button>
                  )}

                  {/* Info del sistema */}
                  <button onClick={() => { setShowSysInfo(true); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                          style={{ color: C.textSec }}
                          onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                    <Cpu size={13}/> Info del sistema
                  </button>

                  {/* Limpiador temporales */}
                  <button onClick={() => { setShowTempCleaner(true); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                          style={{ color: C.amber }}
                          onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                    <Trash2 size={13}/> Temp. cleaner
                  </button>

                  {/* Exportar */}
                  {allFiles.length > 0 && (
                    <>
                      <div className="h-px mx-3" style={{ background: C.border }}/>
                      <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest" style={{ color: C.textMuted }}>EXPORTAR</div>
                      {[["CSV","csv"],["JSON","json"],["HTML","html"]].map(([label, fmt]) => (
                        <button key={fmt}
                                onClick={async () => {
                                  setShowMoreMenu(false);
                                  const r = await fetch(`${API}/api/export`, {
                                    method:"POST", headers:{"Content-Type":"application/json"},
                                    body: JSON.stringify({ format: fmt, limit: 10000 }),
                                  });
                                  if (!r.ok) return;
                                  const blob = await r.blob();
                                  const url  = URL.createObjectURL(blob);
                                  const a    = document.createElement("a");
                                  a.href = url; a.download = `scan_export.${fmt}`; a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                                style={{ color: C.green }}
                                onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
                          <Download size={13}/> {label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botón Escanear / Cancelar */}
          {!scanning ? (
            <button onClick={() => startScan()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-all duration-150 hover:brightness-110 active:scale-95"
                    style={{ background: C.accent, color:"white" }}>
              <Play size={12} fill="currentColor" />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          ) : (
            <button onClick={cancelScan}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-all duration-150 hover:brightness-110 active:scale-95"
                    style={{ background: C.bgCard2, color: C.red, border:`1px solid ${C.border}` }}>
              <Square size={12} fill="currentColor" />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          )}

          {/* Toggle chat panel */}
          <button onClick={() => setChatCollapsed(v => !v)} title={chatCollapsed ? "Mostrar chat" : "Ocultar chat"}
                  className="flex items-center justify-center p-1.5 rounded shrink-0 transition-all hover:brightness-110"
                  style={{ background: chatCollapsed ? `${C.accent}22` : C.bgCard,
                           color: chatCollapsed ? C.accentL : C.textMuted,
                           border:`1px solid ${chatCollapsed ? C.accent+"44" : C.border}` }}>
            <MessageSquare size={13}/>
          </button>
        </header>

        {/* ── DiskBar ── */}
        <div className="px-3 py-2 flex items-center gap-3 shrink-0 border-b glass-surface" style={{ borderColor: C.border }}>
          {/* Donut */}
          <div className="relative w-10 h-10 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke={C.diskTrack} />
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4"
                      stroke={diskClr}
                      strokeDasharray={`${diskPct * 94.2 / 100} 94.2`}
                      style={{ transition:"stroke-dasharray 0.6s ease" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold" style={{ color: diskClr }}>{diskPct}%</span>
            </div>
          </div>

          {/* Barra horizontal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 text-[10px]" style={{ color: C.textMuted }}>
              <span style={{ color: diskClr }} className="font-semibold truncate max-w-[40%]">{diskInfo?.path?.replace(/\//g,"\\") || targetPath}</span>
              <span className="shrink-0">{fmtSize(diskInfo?.free)} libres de {fmtSize(diskInfo?.total)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.diskTrack }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width:`${diskPct}%`, background: diskClr }} />
            </div>
          </div>

          {/* Cards — ocultas en pantallas muy pequeñas */}
          <div className="hidden sm:flex gap-2 shrink-0">
            {[
              { label:"USADO", val: fmtSize(diskInfo?.used),  clr: C.textPri },
              { label:"LIBRE", val: fmtSize(diskInfo?.free),  clr: diskClr   },
              { label:"TOTAL", val: fmtSize(diskInfo?.total), clr: C.textSec },
            ].map(({ label, val, clr }) => (
              <div key={label} className="flex flex-col items-center px-2 py-1 rounded"
                   style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                <span className="text-[9px] font-bold mb-0.5" style={{ color: C.textMuted }}>{label}</span>
                <span className="text-xs font-bold font-mono" style={{ color: clr }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Summary Panel ── */}
        {showSummary && summary && (
          <div className="shrink-0 border-b glass-card" style={{  borderColor: C.border, borderTopColor: C.accent, borderTopWidth: 2 }}>
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
                        <MiniBar pct={pct} color={clr} C={C} />
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
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 shrink-0 border-b glass-panel" style={{ borderColor: C.border }}>
          {/* Pills de categoría */}
          <button onClick={() => setActiveCategory("")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] shrink-0 transition-all"
                  style={{
                    background: activeCategory==="" ? `${C.accent}28` : C.bgCard,
                    color:      activeCategory==="" ? C.accentL : C.textSec,
                    border:     `1px solid ${activeCategory==="" ? C.accent+"66" : C.border}`,
                    fontWeight: activeCategory==="" ? 700 : 400,
                  }}>
            <BarChart2 size={11} /> <span className="hidden sm:inline">Todos</span>
          </button>

          {CATEGORIES.map(cat => {
            const clr = CAT_COLORS[cat];
            const Icon = CAT_ICONS[cat] || FileText;
            const active = activeCategory === cat;
            return (
              <button key={cat}
                      onClick={() => setActiveCategory(active ? "" : cat)}
                      title={cat}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] shrink-0 transition-all"
                      style={{
                        background: active ? `${clr}22` : C.bgCard,
                        color:      active ? clr : C.textSec,
                        border:     `1px solid ${active ? clr+"55" : C.border}`,
                        fontWeight: active ? 700 : 400,
                      }}>
                <Icon size={11} />
                <span className="hidden md:inline">{cat.split(" ")[0].split("/")[0]}</span>
              </button>
            );
          })}

          <div className="h-4 w-px mx-0.5 shrink-0" style={{ background: C.border }} />

          {/* Size filter */}
          <select value={sizeFilter} onChange={e => setSizeFilter(Number(e.target.value))}
                  className="text-[11px] px-2 py-1 rounded outline-none shrink-0"
                  style={{ background: C.bgCard, color: C.textSec, border:`1px solid ${C.border}` }}>
            {SIZE_FILTERS.map(f => (
              <option key={f.min} value={f.min}>{f.label}</option>
            ))}
          </select>

          {/* Filtro por último acceso */}
          <select value={atimeFilter} onChange={e => setAtimeFilter(Number(e.target.value))}
                  title="Filtrar por último acceso"
                  className="text-[11px] px-2 py-1 rounded outline-none shrink-0"
                  style={{ background: atimeFilter > 0 ? `${C.purple}20` : C.bgCard,
                           color: atimeFilter > 0 ? C.purple : C.textSec,
                           border:`1px solid ${atimeFilter > 0 ? C.purple : C.border}` }}>
            <option value={0}>Cualquier acceso</option>
            <option value={15552000}>Sin acceso &gt;6m</option>
            <option value={31536000}>Sin acceso &gt;1a</option>
            <option value={63072000}>Sin acceso &gt;2a</option>
          </select>

          {/* Búsqueda — empuja al final */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded ml-auto shrink-0"
               style={{ background: C.bgInput, border:`1px solid ${C.border}` }}>
            <Search size={12} style={{ color: C.textMuted }} />
            <input type="text" value={nameFilter}
                   onChange={e => setNameFilter(e.target.value)}
                   placeholder="Filtrar…"
                   className="bg-transparent outline-none text-[11px] w-24 sm:w-32"
                   style={{ color: C.textPri }} />
            {nameFilter && (
              <X size={12} className="cursor-pointer hover:opacity-80"
                 style={{ color: C.textMuted }} onClick={() => setNameFilter("")} />
            )}
          </div>
        </div>

        {/* ── Zona de trabajo ── */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

          {/* ── Treemap view ── */}
          {viewMode === "treemap" && (
            <div className="flex-1 overflow-hidden">
              <Treemap folders={sortedFolders} C={C}
                       onSelect={(path) => { setSelectedFolder(path); setViewMode("table"); }} />
            </div>
          )}

          {/* ── Timeline view ── */}
          {viewMode === "timeline" && (
            <div className="flex-1 overflow-hidden">
              <Timeline files={filteredFiles} C={C} />
            </div>
          )}

          {/* ── Bar chart view ── */}
          {viewMode === "barchart" && (
            <div className="flex-1 flex overflow-hidden">
              <HorizontalBarChart folders={sortedFolders} C={C} />
            </div>
          )}

          {/* ── Table view (original) ── */}
          {viewMode === "table" && <>

          {/* ── Tree Panel ── */}
          <div className="w-44 md:w-52 xl:w-60 flex flex-col shrink-0 border-r overflow-hidden glass-panel" style={{ borderColor: C.border }}>
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

              {topFolders.map((f, i) => {
                const name  = f.path.split(/[\\/]/).filter(Boolean).pop() || f.path;
                const sel   = selectedFolder === f.path;
                const nl    = name.toLowerCase();
                const icon  = nl.includes("users") ? "👥"
                            : nl.includes("program") ? "🗂"
                            : nl.includes("downloads") || nl.includes("descargas") ? "⬇"
                            : nl.includes("documents") || nl.includes("documentos") ? "📁"
                            : nl.includes("desktop") || nl.includes("escritorio") ? "🖥"
                            : nl.includes("appdata") ? "⚙"
                            : "📂";
                return (
                  <button key={i}
                          onClick={() => { setSelectedFolder(f.path); setSelectedPath(f.path); }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors group"
                          style={{
                            background: sel ? C.bgSelected : "transparent",
                            color:      sel ? C.accentL : C.textSec,
                          }}
                          onMouseEnter={e => !sel && onHoverIn(e)} onMouseLeave={e => !sel && onHoverOut(e)}>
                    <span className="text-sm shrink-0">{icon}</span>
                    <span className="flex-1 truncate">{name}</span>
                    <span className="shrink-0 text-[10px] font-mono" style={{ color: C.textMuted }}>{fmtSize(f.size)}</span>
                  </button>
                );
              })}
              {topFolders.length === 0 && !scanning && (
                <p className="text-[11px] px-3 py-4" style={{ color: C.textMuted }}>Sin datos. Inicia un escaneo.</p>
              )}

              {/* Carpetas pesadas conocidas */}
              {heavyFolders.length > 0 && (
                <div className="mt-2 mx-2 rounded-lg overflow-hidden"
                     style={{ border:`1px solid ${C.amber}44` }}>
                  <div className="px-2 py-1.5 text-[9px] font-bold tracking-widest flex items-center gap-1.5"
                       style={{ background:`${C.amber}12`, color: C.amber }}>
                    <AlertTriangle size={9}/> CARPETAS PESADAS DETECTADAS
                  </div>
                  {heavyFolders.sort((a,b) => b.size - a.size).map(h => (
                    <div key={h.path}
                         className="flex items-center gap-2 px-2 py-1.5 text-[10px]"
                         style={{ borderTop:`1px solid ${C.amber}22` }}>
                      <span className="flex-1 truncate font-mono" style={{ color: C.textSec }}
                            title={h.path}>{h.name}</span>
                      <span className="shrink-0 font-bold" style={{ color: C.amber }}>{fmtSize(h.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── File Table ── */}
          <div className="flex-1 flex flex-col overflow-hidden glass-panel" style={{  minHeight: 0 }}>
            {/* Cabecera de columnas */}
            <div className="grid gap-2 px-3 py-2 border-b text-[10px] font-bold tracking-widest shrink-0 select-none glass-surface file-table-grid" style={{ borderColor: C.border }}>
              {[
                { col:"name",      label:"NOMBRE"                    },
                { col:"size",      label:"TAMAÑO",    right:true     },
                { col:"category",  label:"CATEGORÍA", hideSm:true    },
                { col:"extension", label:"EXT",       center:true    },
                { col:"path",      label:"RUTA",      hideMd:true    },
              ].map(({ col, label, right, center, hideSm, hideMd }) => (
                <button key={col}
                        onClick={() => handleSort(col)}
                        className={`flex items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer${hideSm ? " hidden sm:flex" : ""}${hideMd ? " hidden md:flex" : ""}`}
                        style={{
                          color: sortCol===col ? C.accentL : C.textMuted,
                          justifyContent: right?"flex-end" : center?"center" : "flex-start",
                        }}>
                  {label}
                  <SortIcon col={col} sortCol={sortCol} sortAsc={sortAsc} C={C} />
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
                C={C}
              />
            )}

            <div className="px-3 py-1 text-[10px] border-t shrink-0 flex justify-between glass-surface" style={{ color: C.textMuted, borderColor: C.border,  }}>
              <span>{fmtNum(filteredFiles.length)} archivos{allFiles.length !== filteredFiles.length && !scanning ? ` / ${fmtNum(allFiles.length)} total` : ""}</span>
              {scanning && <span style={{ color: C.accent }}>escaneando…</span>}
            </div>
          </div>
          </>}
        </div>

        {/* ── Status Bar ── */}
        <div className="shrink-0 border-t" style={{ borderColor: C.border }}>
          {/* Progress line */}
          <div className="h-0.5" style={{ background: C.border }}>
            <div className="h-full transition-all duration-300"
                 style={{ width:`${progress}%`, background: C.accent }} />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 glass-surface" >
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
      <div className={`flex flex-col shrink-0 border-l glass-panel transition-all duration-300 ${chatCollapsed ? "w-0 overflow-hidden border-l-0" : "w-64 md:w-72 xl:w-80"}`}
           style={{ borderColor: C.border }}>

        {/* ── Header ── */}
        <div className="shrink-0 border-b glass-surface" style={{  borderColor: C.border }}>
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {/* Icono animado */}
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: `linear-gradient(135deg, ${C.accent}33, ${C.accentL}22)`,
                            border:`1px solid ${C.accent}44` }}>
                <Bot size={14} style={{ color: C.accentL }} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight" style={{ color: C.textPri }}>Asistente IA</p>
                <p className="text-[9px] leading-tight" style={{ color: C.textMuted }}>
                  {chatLoading ? (
                    <span style={{ color: C.accentL }}>● escribiendo…</span>
                  ) : chatHistory.length > 0 ? (
                    <span style={{ color: C.green }}>● en línea</span>
                  ) : (
                    <span>listo para ayudar</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Selector proveedor compacto */}
              <select value={provider} onChange={e => setProvider(e.target.value)}
                      className="text-[10px] px-2 py-1 rounded-lg outline-none"
                      style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {/* Botón limpiar historial (también limpia localStorage) */}
              <button onClick={() => { setChatHistory([]); setChatError(""); localStorage.removeItem(CHAT_HISTORY_KEY); }}
                      title="Limpiar historial"
                      className="p-1.5 rounded-lg transition-all hover:brightness-125"
                      style={{ color: C.textMuted, background: "transparent" }}>
                <RefreshCw size={12} />
              </button>
              {/* Botón settings */}
              <button onClick={() => setShowSettings(s => !s)} title="Configuración"
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: showSettings ? C.accentL : C.textMuted,
                               background: showSettings ? `${C.accent}22` : "transparent" }}>
                <Settings size={13} />
              </button>
            </div>
          </div>
          {/* Barra del modelo activo */}
          <div className="px-3 pb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: { gemini:"#4285f4", groq:"#f55036", claude:"#d97706", ollama:"#10b981" }[provider] || C.green }} />
            <span className="text-[9px] font-mono truncate" style={{ color: C.textMuted }}>
              {config[`${provider==="gemini"?"GEMINI":provider==="groq"?"GROQ":provider==="claude"?"CLAUDE":"OLLAMA"}_MODEL`] || provider}
            </span>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {/* Indicador de historial persistente */}
              {chatHistoryVisible.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded"
                      title={`${chatHistoryVisible.length} mensajes guardados`}
                      style={{ background:`${C.green}15`, color: C.green, border:`1px solid ${C.green}25` }}>
                  <History size={8}/> {chatHistoryVisible.length}
                </span>
              )}
              {/* Badge modo agente */}
              {agentMode && (
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded animate-pulse"
                      style={{ background:`${C.accent}20`, color: C.accentL, border:`1px solid ${C.accent}40` }}>
                  <ScanLine size={8}/> agente
                </span>
              )}
              <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>
                t={temperature.toFixed(1)} · {maxTokens}tk
              </span>
            </div>
          </div>
        </div>

        {/* ── Settings modal ── */}
        <SettingsModal
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          showKeys={showKeys}
          setShowKeys={setShowKeys}

          provider={provider}
          setProvider={setProvider}
          fetchOllamaModels={fetchOllamaModels}
          ollamaModels={ollamaModels}
          ollamaLoading={ollamaLoading}

          config={config}
          savingConfig={savingConfig}
          configMsg={configMsg}
          verifying={verifying}
          verifyResults={verifyResults}
          saveConfig={saveConfig}
          verifyApis={verifyApis}
          C={C}
          themeId={themeId}
          setTheme={setTheme}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          modelSearch={modelSearch}
          setModelSearch={setModelSearch}
          modelInputs={modelInputs}
          setModelInputs={setModelInputs}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
        />
        {/* ── Mensajes ── */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scroll-smooth"
             style={{ scrollbarWidth:"thin", scrollbarColor:`${C.border} transparent` }}>

          {/* Sugerencias iniciales */}
          {chatHistory.length === 0 && (
            <div className="space-y-3 pt-1">
              {/* Bienvenida */}
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background:`linear-gradient(135deg, ${C.accent}44, ${C.accentL}22)`,
                              border:`1px solid ${C.accent}55`, boxShadow:`0 10px 25px -5px ${C.accent}40` }}>
                  <Bot size={22} style={{ color: C.accentL }} />
                </div>
                <p className="text-xs font-semibold text-center" style={{ color: C.textPri }}>¿En qué puedo ayudarte?</p>
                <p className="text-[10px] text-center leading-relaxed" style={{ color: C.textMuted }}>
                  Escanea una carpeta y pregúntame<br/>sobre tus archivos y espacio en disco.
                </p>
              </div>
              {/* Sugerencias en grid */}
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { icon:"📁", q:"¿Qué carpeta ocupa más espacio?" },
                  { icon:"🗑️", q:"¿Puedo eliminar archivos temporales?" },
                  { icon:"📊", q:"Muéstrame los archivos más grandes" },
                  { icon:"🔁", q:"¿Cuántos duplicados hay?" },
                  { icon:"✅", q:"¿Hay archivos seguros de borrar?" },
                ].map(({ icon, q }) => (
                  <button key={q} onClick={() => sendChat(q)}
                          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left glass-card glass-border hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                          style={{ background: C.bgCard, color: C.textSec,
                                   border:`1px solid ${C.border}` }}
                          onMouseEnter={onHoverInCard} onMouseLeave={onHoverOutCard}>
                    <span className="text-sm">{icon}</span>
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {chatHistory.map((msg, i) => {
            if (msg.role === "system") return (
              <div key={i} className="flex items-center gap-2 text-[10px] py-1.5 px-3 rounded-xl mx-2"
                   style={{ color: C.green, background:`${C.green}0d`, border:`1px solid ${C.green}22` }}>
                <CheckCircle2 size={10} className="shrink-0"/>
                {msg.content}
              </div>
            );
            const isUser = msg.role === "user";
            const msgProvider = msg.provider || provider;
            const PROV_COLORS = { gemini:"#4285f4", groq:"#f55036", claude:"#d97706", ollama:"#10b981" };
            const provClr = PROV_COLORS[msgProvider] || C.green;
            // Limpiar instrucciones [SCAN:...] del texto visible
            const visibleContent = msg.content?.replace(/\[SCAN:[^\]]+\]/g, "").trim();
            return (
              <div key={i} className={`flex gap-2 items-end ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
                     style={{ background: isUser ? `${C.accent}30` : `${provClr}25`,
                              border:`1px solid ${isUser ? C.accent+"44" : provClr+"33"}` }}>
                  {isUser
                    ? <User size={11} style={{ color: C.accentL }}/>
                    : <Bot  size={11} style={{ color: provClr }}/>}
                </div>
                {/* Burbuja */}
                <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                     style={{ maxWidth:"82%" }}>
                  <div className="rounded-2xl px-3 py-2.5"
                       style={{
                         background: isUser ? `${C.accent}28` : C.bgCard,
                         border: `1px solid ${isUser ? C.accent+"44" : C.border}`,
                         borderBottomRightRadius: isUser ? 4 : undefined,
                         borderBottomLeftRadius:  isUser ? undefined : 4,
                         color: C.textPri,
                         wordBreak:"break-word",
                       }}>
                    {visibleContent
                      ? <ChatMarkdown text={visibleContent} C={C} />
                      : <span className="flex items-center gap-2 py-0.5" style={{ color: C.textMuted }}>
                          <TypingDots />
                        </span>
                    }
                  </div>
                  {/* Botones de acción para rutas detectadas (solo en mensajes del asistente) */}
                  {!isUser && visibleContent && (
                    <ChatActionBar
                      text={visibleContent}
                      C={C}
                      onAttach={(path) => setSelectedPath(path)}
                      onOpenExplorer={async (path) => {
                        await fetch(`${API}/api/open-in-explorer`, {
                          method:"POST", headers:{"Content-Type":"application/json"},
                          body: JSON.stringify({ path }),
                        });
                      }}
                    />
                  )}
                  {/* Timestamp / label */}
                  <span className="text-[9px] px-1" style={{ color: C.textMuted }}>
                    {isUser ? "Tú" : (PROVIDERS.find(p=>p.id===msgProvider)?.label || msgProvider)}
                  </span>
                </div>
              </div>
            );
          })}

          {chatError && (
            <div className="flex items-start gap-2 text-[11px] p-2.5 rounded-xl"
                 style={{ background:`${C.red}10`, color:C.red, border:`1px solid ${C.red}30` }}>
              <AlertCircle size={12} className="shrink-0 mt-0.5"/> {chatError}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-3 pt-2 pb-3 shrink-0 border-t glass-panel" style={{  borderColor: C.border }}>
          {/* Input file oculto para seleccionar imagen */}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                 className="hidden" onChange={e => { _loadImageFile(e.target.files?.[0]); }} />

          {/* Chip de archivo adjunto (ruta seleccionada) */}
          {selectedPath && (
            <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-lg"
                 style={{ background:`${C.accent}14`, border:`1px solid ${C.accent}30` }}>
              <span className="text-[10px]">📎</span>
              <span className="text-[10px] truncate flex-1 font-mono" style={{ color: C.accentL }}>
                {selectedPath.split(/[\\/]/).pop()}
              </span>
              <button onClick={() => setSelectedPath("")} style={{ color: C.textMuted }}
                      className="hover:brightness-150 shrink-0">
                <X size={10}/>
              </button>
            </div>
          )}

          {/* Preview de imagen adjunta */}
          {attachedImage && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg"
                 style={{ background:`${C.green}12`, border:`1px solid ${C.green}30` }}>
              <img src={attachedImage.preview} alt="adjunto"
                   className="w-10 h-10 object-cover rounded shrink-0"
                   style={{ border:`1px solid ${C.border}` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: C.green }}>
                  Imagen adjunta
                </p>
                <p className="text-[9px] truncate font-mono" style={{ color: C.textMuted }}>
                  {attachedImage.name} · {attachedImage.mime.split("/")[1].toUpperCase()}
                </p>
              </div>
              <button onClick={clearAttachedImage} style={{ color: C.textMuted }}
                      className="hover:brightness-150 shrink-0" title="Eliminar imagen">
                <X size={10}/>
              </button>
            </div>
          )}

          {/* Área de texto con drag-and-drop */}
          <div className="rounded-xl overflow-hidden transition-all"
               style={{ border:`1.5px solid ${dragOver ? C.accent : C.borderFocus}`,
                        background: dragOver ? `${C.accent}0a` : C.bgInput }}
               onDragOver={handleChatDragOver}
               onDragLeave={handleChatDragLeave}
               onDrop={handleChatDrop}>
            <textarea value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      onPaste={handleChatPaste}
                      onFocus={e => e.currentTarget.parentElement.style.borderColor = C.accent}
                      onBlur={e  => { if (!dragOver) e.currentTarget.parentElement.style.borderColor = C.borderFocus; }}
                      disabled={chatLoading}
                      rows={2}
                      placeholder={dragOver ? "Suelta la imagen aquí…" : "Pregunta sobre tus archivos…"}
                      className="w-full text-[11px] px-3 pt-2.5 pb-1 outline-none resize-none bg-transparent"
                      style={{ color: C.textPri, caretColor: C.accent, lineHeight:"1.6" }} />
            {/* Toolbar inferior del input */}
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="flex items-center gap-2">
                {/* Botón adjuntar imagen */}
                <button onClick={() => fileInputRef.current?.click()}
                        disabled={chatLoading}
                        title="Adjuntar imagen (PNG/JPG/WEBP) — también puedes pegar con Ctrl+V o arrastrar"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all hover:brightness-125 disabled:opacity-40"
                        style={{ color: attachedImage ? C.green : C.textMuted,
                                 background: attachedImage ? `${C.green}15` : "transparent",
                                 border: `1px solid ${attachedImage ? C.green+"40" : "transparent"}` }}>
                  <Image size={10}/> {attachedImage ? "✓ imagen" : "imagen"}
                </button>
                <span className="text-[9px]" style={{ color: C.textMuted }}>↵ enviar · Shift+↵ línea</span>
              </div>
              <button onClick={() => sendChat()}
                      disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: (chatInput.trim() || attachedImage) ? C.accent : C.bgCard2,
                               color: (chatInput.trim() || attachedImage) ? "white" : C.textMuted }}>
                {chatLoading
                  ? <><Loader2 size={10} className="animate-spin"/> Enviando</>
                  : <><Send size={10}/> Enviar</>}
              </button>
            </div>
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
                      onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
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
              onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
              <span>🗑️</span>Mover a la Papelera
            </button>
            {/* Eliminar permanentemente */}
            <button
              onClick={() => { setCtxMenu(null); setDeleteConfirm({ file: ctxMenu.file, mode: "permanent" }); setDeleteStatus(""); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left"
              style={{ color: C.red }}
              onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
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
            <div className="flex items-center gap-3 px-4 py-3 border-b glass-surface" style={{ borderColor: C.border,  }}>
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
          MODALES: HISTORIAL / COMPARADOR
      ════════════════════════════════════════════════════════ */}
      {showSysInfo && (
        <SysInfoModal onClose={() => setShowSysInfo(false)} C={C} />
      )}
      {showTempCleaner && (
        <TempCleanerModal onClose={() => setShowTempCleaner(false)} C={C} />
      )}
      {showRiskPanel && riskAlerts.length > 0 && (
        <RiskAlertsPanel
          alerts={riskAlerts}
          onClose={() => setShowRiskPanel(false)}
          onOpenExplorer={async (path) => {
            await fetch(`${API}/api/open-in-explorer`, {
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ path }),
            });
          }}
          onAttach={(alert) => {
            setSelectedPath(alert.path || "");
            setPendingRiskAlert(alert);
            pendingRiskAlertRef.current = alert;
            // Pre-rellenar el textarea con una pregunta contextualizada
            const severityLabel = { high: "crítico", medium: "moderado", low: "bajo" }[alert.severity] || alert.severity;
            setChatInput(`Tengo una alerta de riesgo ${severityLabel}: "${alert.title}". ${alert.description} ¿Qué debo hacer?`);
            setShowRiskPanel(false);
          }}
          C={C}
        />
      )}
      {showHistory && (
        <ScanHistoryModal
          history={scanHistory}
          onClose={() => setShowHistory(false)}
          onRescan={(path) => { setTargetPath(path); setTimeout(() => startScanRef.current?.(path), 100); }}
          C={C}
        />
      )}
      {showCompare && (
        <FolderCompareModal
          folders={folders}
          onClose={() => setShowCompare(false)}
          C={C}
        />
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
            <div className="flex items-center justify-between px-4 py-3 border-b glass-surface" style={{  borderColor: C.border }}>
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
              <div className="grid gap-2 px-4 py-2 text-[10px] font-bold tracking-widest border-b sticky top-0 glass-surface" style={{ borderColor: C.border,  color: C.textMuted,
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
            <div className="flex justify-end px-4 py-3 border-t glass-surface" style={{ borderColor: C.border,  }}>
              <button onClick={() => setShowDups(false)}
                      className="px-4 py-1.5 rounded text-sm transition-all hover:brightness-110"
                      style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer C={C} />

    </div>
  );
}
