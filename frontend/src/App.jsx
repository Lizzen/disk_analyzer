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
  Star, GitCompare, Bell, BookOpen, Plus, Minus, ArrowRight, Image as ImageIcon
} from "lucide-react";

const API = "http://127.0.0.1:8000";
const APP_VERSION = import.meta.env?.VITE_APP_VERSION ?? "0.3.0";

// ── Constantes de chat ─────────────────────────────────────────────────────────
const CHAT_HISTORY_KEY  = "da-chat-history-v1";
const CHAT_MAX_PERSIST  = 60;
const FAVORITES_KEY     = "da-favorites-v1";    // rutas favoritas
const SCAN_HISTORY_KEY  = "da-scan-history-v1"; // historial de escaneos
const SCAN_HISTORY_MAX  = 10;                   // máximo de escaneos guardados
// Regexp para detectar rutas Windows absolutas en texto del asistente
const WIN_PATH_RE = /[A-Za-z]:\\(?:[^\s<>"'|?*\n\\]+\\)*[^\s<>"'|?*\n\\]*/g;

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  "dark-void": {
    label: "Dark Void", preview: ["#0a0a0f","#6366f1","#f0f0ff"],
    bgDark:"#0a0a0f", bgPanel:"#0f0f17", bgSurface:"#13131e",
    bgCard:"#1a1a28", bgCard2:"#1e1e2e", bgInput:"#0d0d18",
    bgHover:"#22223a", bgSelected:"#1d2b4f",
    border:"#2a2a40", borderFocus:"#4a4a7a",
    textPri:"#f0f0ff", textSec:"#9898b8", textMuted:"#4a4a6a", textAccent:"#a0a8ff",
    accent:"#6366f1", accentL:"#818cf8", accentD:"#4f46e5",
    green:"#10b981", amber:"#f59e0b", red:"#f43f5e",
    purple:"#a855f7", cyan:"#06b6d4", blue:"#3b82f6",
    diskTrack:"#1e1e30",
    tagHugeBg:"#1f0a14", tagLargeBg:"#1a1300", tagMedBg:"#071225",
    tagCacheBg:"#0d0d1a", tagCacheFg:"#a855f7", tagOddBg:"#0d0d17", tagEvenBg:"#0f0f1a",
  },
  "midnight-blue": {
    label: "Midnight Blue", preview: ["#050d1a","#38bdf8","#e2f0ff"],
    bgDark:"#050d1a", bgPanel:"#07111f", bgSurface:"#0c1829",
    bgCard:"#112030", bgCard2:"#142435", bgInput:"#060e1c",
    bgHover:"#1a2e45", bgSelected:"#0e2d4a",
    border:"#1a3050", borderFocus:"#2a5080",
    textPri:"#e2f0ff", textSec:"#7eacd0", textMuted:"#2e5070", textAccent:"#7dd3fc",
    accent:"#0ea5e9", accentL:"#38bdf8", accentD:"#0284c7",
    green:"#10b981", amber:"#f59e0b", red:"#f43f5e",
    purple:"#a855f7", cyan:"#06b6d4", blue:"#3b82f6",
    diskTrack:"#0e2035",
    tagHugeBg:"#1a0a12", tagLargeBg:"#141000", tagMedBg:"#040e20",
    tagCacheBg:"#080818", tagCacheFg:"#a855f7", tagOddBg:"#070f1c", tagEvenBg:"#08111e",
  },
  "forest": {
    label: "Forest Dark", preview: ["#060f08","#34d399","#e0ffe8"],
    bgDark:"#060f08", bgPanel:"#091410", bgSurface:"#0d1c14",
    bgCard:"#132519", bgCard2:"#162b1e", bgInput:"#071009",
    bgHover:"#1d3525", bgSelected:"#123a20",
    border:"#1e3a28", borderFocus:"#2e6040",
    textPri:"#e0ffe8", textSec:"#78b890", textMuted:"#2e5838", textAccent:"#6ee7b7",
    accent:"#10b981", accentL:"#34d399", accentD:"#059669",
    green:"#10b981", amber:"#f59e0b", red:"#f43f5e",
    purple:"#a855f7", cyan:"#06b6d4", blue:"#3b82f6",
    diskTrack:"#102018",
    tagHugeBg:"#1a0a0e", tagLargeBg:"#141200", tagMedBg:"#051408",
    tagCacheBg:"#070d08", tagCacheFg:"#a855f7", tagOddBg:"#080f09", tagEvenBg:"#09120a",
  },
  "light": {
    label: "Light Vanilla", preview: ["#f4f4f8","#6366f1","#1a1a2e"],
    bgDark:"#e8e8f0", bgPanel:"#f4f4f8", bgSurface:"#ffffff",
    bgCard:"#ebebf4", bgCard2:"#e2e2ee", bgInput:"#f8f8fc",
    bgHover:"#dcdcee", bgSelected:"#d0d4f8",
    border:"#c8c8dc", borderFocus:"#8888cc",
    textPri:"#1a1a2e", textSec:"#484868", textMuted:"#8888a8", textAccent:"#5558cc",
    accent:"#6366f1", accentL:"#4f52d0", accentD:"#4f46e5",
    green:"#059669", amber:"#d97706", red:"#e11d48",
    purple:"#9333ea", cyan:"#0891b2", blue:"#2563eb",
    diskTrack:"#d0d0e4",
    tagHugeBg:"#fce7ef", tagLargeBg:"#fef3c7", tagMedBg:"#dbeafe",
    tagCacheBg:"#f3e8ff", tagCacheFg:"#7c3aed", tagOddBg:"#f8f8fc", tagEvenBg:"#f0f0f8",
  },
  "logo-neon": {
    label: "Profile Neon", preview: ["#0b0811","#0ef0f0","#ebd4fa"],
    bgDark:"#0b0811", bgPanel:"#100b1a", bgSurface:"#161026",
    bgCard:"#1f1636", bgCard2:"#291e4a", bgInput:"#0a070f",
    bgHover:"#291e4a", bgSelected:"#1c1433",
    border:"#311f59", borderFocus:"#0ef0f0",
    textPri:"#ebd4fa", textSec:"#a68cce", textMuted:"#725a96", textAccent:"#0ef0f0",
    accent:"#0ef0f0", accentL:"#7cffff", accentD:"#08a8a8",
    green:"#00ff9d", amber:"#ffb000", red:"#ff357a",
    purple:"#c665f3", cyan:"#0ef0f0", blue:"#3b82f6",
    diskTrack:"#1f1636",
    tagHugeBg:"#330c1f", tagLargeBg:"#2e1f0a", tagMedBg:"#0a2424",
    tagCacheBg:"#1b0d29", tagCacheFg:"#c665f3", tagOddBg:"#0f0b18", tagEvenBg:"#120d1c",
  },
  "logo-pastel": {
    label: "Profile Pastel", preview: ["#ebd4fa","#c665f3","#161026"],
    bgDark:"#cfb6e4", bgPanel:"#ebd4fa", bgSurface:"#fdf4ff",
    bgCard:"#e6c8fa", bgCard2:"#dfbcf5", bgInput:"#f6e8ff",
    bgHover:"#d5acf0", bgSelected:"#cfa5eb",
    border:"#c49edf", borderFocus:"#c665f3",
    textPri:"#161026", textSec:"#473766", textMuted:"#6d5599", textAccent:"#7212a3",
    accent:"#c665f3", accentL:"#0ef0f0", accentD:"#a342ce",
    green:"#059669", amber:"#d97706", red:"#e11d48",
    purple:"#9333ea", cyan:"#0891b2", blue:"#2563eb",
    diskTrack:"#d5c0e8",
    tagHugeBg:"#ffeaf4", tagLargeBg:"#fff4d6", tagMedBg:"#e0f7fa",
    tagCacheBg:"#f3e8ff", tagCacheFg:"#7c3aed", tagOddBg:"#ebd4fa", tagEvenBg:"#eee0fa",
  },
  "dark-premium": {
    label: "Dark Premium", preview: ["#09090b","#6366f1","#f8f8f2"],
    bgDark:"#09090b", bgPanel:"#121216", bgSurface:"#18181b",
    bgCard:"#1f1f23", bgCard2:"#27272a", bgInput:"#000000",
    bgHover:"#27272a", bgSelected:"#18181b",
    border:"#27272a", borderFocus:"#6366f1",
    textPri:"#f8f8f2", textSec:"#a1a1aa", textMuted:"#52525b", textAccent:"#818cf8",
    accent:"#6366f1", accentL:"#818cf8", accentD:"#4f46e5",
    green:"#10b981", amber:"#f59e0b", red:"#ef4444",
    purple:"#8b5cf6", cyan:"#06b6d4", blue:"#3b82f6",
    diskTrack:"#27272a",
    tagHugeBg:"#3f1a1a", tagLargeBg:"#3f2c1a", tagMedBg:"#1a2f3f",
    tagCacheBg:"#2d1a3f", tagCacheFg:"#a78bfa", tagOddBg:"#121216", tagEvenBg:"#18181b",
  },
  "dracula": {
    label: "Dracula", preview: ["#282a36","#bd93f9","#f8f8f2"],
    bgDark:"#282a36", bgPanel:"#21222c", bgSurface:"#282a36",
    bgCard:"#383a59", bgCard2:"#44475a", bgInput:"#1e1f29",
    bgHover:"#44475a", bgSelected:"#44475a",
    border:"#6272a4", borderFocus:"#bd93f9",
    textPri:"#f8f8f2", textSec:"#bfbfbf", textMuted:"#6272a4", textAccent:"#ff79c6",
    accent:"#bd93f9", accentL:"#ff79c6", accentD:"#8be9fd",
    green:"#50fa7b", amber:"#f1fa8c", red:"#ff5555",
    purple:"#bd93f9", cyan:"#8be9fd", blue:"#3b82f6",
    diskTrack:"#44475a",
    tagHugeBg:"#442a2a", tagLargeBg:"#44442a", tagMedBg:"#2a4444",
    tagCacheBg:"#3f2a44", tagCacheFg:"#bd93f9", tagOddBg:"#21222c", tagEvenBg:"#282a36",
  },
  "nord": {
    label: "Nord", preview: ["#2e3440","#88c0d0","#eceff4"],
    bgDark:"#2e3440", bgPanel:"#3b4252", bgSurface:"#434c5e",
    bgCard:"#4c566a", bgCard2:"#434c5e", bgInput:"#2e3440",
    bgHover:"#4c566a", bgSelected:"#434c5e",
    border:"#4c566a", borderFocus:"#88c0d0",
    textPri:"#eceff4", textSec:"#e5e9f0", textMuted:"#d8dee9", textAccent:"#8fbcbb",
    accent:"#88c0d0", accentL:"#81a1c1", accentD:"#5e81ac",
    green:"#a3be8c", amber:"#ebcb8b", red:"#bf616a",
    purple:"#b48ead", cyan:"#88c0d0", blue:"#3b82f6",
    diskTrack:"#434c5e",
    tagHugeBg:"#4c383d", tagLargeBg:"#4c4638", tagMedBg:"#384c4c",
    tagCacheBg:"#46384c", tagCacheFg:"#b48ead", tagOddBg:"#3b4252", tagEvenBg:"#2e3440",
  },
  "tokyo-night": {
    label: "Tokyo Night", preview: ["#1a1b26","#7aa2f7","#c0caf5"],
    bgDark:"#1a1b26", bgPanel:"#24283b", bgSurface:"#1f2335",
    bgCard:"#292e42", bgCard2:"#3b4261", bgInput:"#1a1b26",
    bgHover:"#292e42", bgSelected:"#292e42",
    border:"#3b4261", borderFocus:"#7aa2f7",
    textPri:"#c0caf5", textSec:"#a9b1d6", textMuted:"#565f89", textAccent:"#bb9af7",
    accent:"#7aa2f7", accentL:"#89b4fa", accentD:"#3d59a1",
    green:"#9ece6a", amber:"#e0af68", red:"#f7768e",
    purple:"#bb9af7", cyan:"#7dcfff", blue:"#3b82f6",
    diskTrack:"#3b4261",
    tagHugeBg:"#422832", tagLargeBg:"#423828", tagMedBg:"#283842",
    tagCacheBg:"#382842", tagCacheFg:"#bb9af7", tagOddBg:"#1f2335", tagEvenBg:"#24283b",
  },
  "catppuccin-mocha": {
    label: "Catppuccin Mocha", preview: ["#11111b","#cba6f7","#cdd6f4"],
    bgDark:"#11111b", bgPanel:"#1e1e2e", bgSurface:"#181825",
    bgCard:"#313244", bgCard2:"#45475a", bgInput:"#11111b",
    bgHover:"#313244", bgSelected:"#45475a",
    border:"#313244", borderFocus:"#cba6f7",
    textPri:"#cdd6f4", textSec:"#bac2de", textMuted:"#6c7086", textAccent:"#f5c2e7",
    accent:"#cba6f7", accentL:"#f5c2e7", accentD:"#b4befe",
    green:"#a6e3a1", amber:"#f9e2af", red:"#f38ba8",
    purple:"#cba6f7", cyan:"#89dceb", blue:"#3b82f6",
    diskTrack:"#45475a",
    tagHugeBg:"#4a2a34", tagLargeBg:"#4a422a", tagMedBg:"#2a424a",
    tagCacheBg:"#3a2a4a", tagCacheFg:"#cba6f7", tagOddBg:"#181825", tagEvenBg:"#1e1e2e",
  },
  "github-dark": {
    label: "GitHub Dark", preview: ["#010409","#2f81f7","#c9d1d9"],
    bgDark:"#010409", bgPanel:"#0d1117", bgSurface:"#161b22",
    bgCard:"#21262d", bgCard2:"#30363d", bgInput:"#010409",
    bgHover:"#21262d", bgSelected:"#1f6feb",
    border:"#30363d", borderFocus:"#58a6ff",
    textPri:"#c9d1d9", textSec:"#8b949e", textMuted:"#484f58", textAccent:"#79c0ff",
    accent:"#2f81f7", accentL:"#58a6ff", accentD:"#1f6feb",
    green:"#238636", amber:"#d29922", red:"#da3633",
    purple:"#bc8cff", cyan:"#39c5cf", blue:"#3b82f6",
    diskTrack:"#21262d",
    tagHugeBg:"#3a1d1d", tagLargeBg:"#3d3016", tagMedBg:"#112e3e",
    tagCacheBg:"#2b1c3f", tagCacheFg:"#bc8cff", tagOddBg:"#0d1117", tagEvenBg:"#161b22",
  },
  // ── Variantes Logo Crystal ─────────────────────────────────────────────────
  // Variante 1: Crystal Dark — fondo negro-indigo, acento cyan neon
  "logo-crystal": {
    label: "Crystal Dark", preview: ["#0e0b18","#6ecce8","#e8dff8"],
    bgDark:"#0e0b18", bgPanel:"#14102a", bgSurface:"#1a1535",
    bgCard:"#211a42", bgCard2:"#2d2655", bgInput:"#090713",
    bgHover:"#2d2655", bgSelected:"#1e1840",
    border:"#3a2e6a", borderFocus:"#6ecce8",
    textPri:"#e8dff8", textSec:"#9b8ec4", textMuted:"#5c5080", textAccent:"#6ecce8",
    accent:"#6ecce8", accentL:"#aae4f4", accentD:"#2a9ab8",
    green:"#50e8b0", amber:"#f0b840", red:"#d070c0",
    purple:"#b070f0", cyan:"#6ecce8", blue:"#7878b8",
    diskTrack:"#2d2655",
    tagHugeBg:"#2a0b1e", tagLargeBg:"#281c06", tagMedBg:"#071e28",
    tagCacheBg:"#160b2c", tagCacheFg:"#b070f0", tagOddBg:"#110e1e", tagEvenBg:"#160f24",
  },
  // Variante 2: Crystal Dusk — indigo medio, acento violeta-perla
  "logo-dusk": {
    label: "Crystal Dusk", preview: ["#1e1a38","#a890d8","#e4ddf4"],
    bgDark:"#1e1a38", bgPanel:"#252048", bgSurface:"#2e2858",
    bgCard:"#383268", bgCard2:"#423c78", bgInput:"#181430",
    bgHover:"#423c78", bgSelected:"#302a60",
    border:"#504890", borderFocus:"#a890d8",
    textPri:"#e4ddf4", textSec:"#a090c8", textMuted:"#6a6098", textAccent:"#a890d8",
    accent:"#a890d8", accentL:"#ccc0ec", accentD:"#7860b0",
    green:"#50e8b0", amber:"#f0b840", red:"#d070c0",
    purple:"#a890d8", cyan:"#6ecce8", blue:"#7878b8",
    diskTrack:"#423c78",
    tagHugeBg:"#38182c", tagLargeBg:"#342808", tagMedBg:"#0e2034",
    tagCacheBg:"#28183e", tagCacheFg:"#a890d8", tagOddBg:"#201c38", tagEvenBg:"#252048",
  },
  // Variante 3: Crystal Mist — fondo lavanda claro (el fondo del logo)
  "logo-mist": {
    label: "Crystal Mist", preview: ["#c4b5d8","#3d3870","#12101e"],
    bgDark:"#c4b5d8", bgPanel:"#d4c8e8", bgSurface:"#e2d8f0",
    bgCard:"#cfc0e4", bgCard2:"#c8b8e0", bgInput:"#ddd0f0",
    bgHover:"#b8a8cc", bgSelected:"#a898c0",
    border:"#a898c4", borderFocus:"#3d3870",
    textPri:"#12101e", textSec:"#3d3870", textMuted:"#7878b8", textAccent:"#2a1860",
    accent:"#3d3870", accentL:"#6868a8", accentD:"#1e1a50",
    green:"#1a8060", amber:"#b07010", red:"#a03080",
    purple:"#6040a8", cyan:"#2a8ab0", blue:"#3848a0",
    diskTrack:"#b0a0c8",
    tagHugeBg:"#f0d4e4", tagLargeBg:"#f0e8cc", tagMedBg:"#cce4f0",
    tagCacheBg:"#e4ccf4", tagCacheFg:"#6040a8", tagOddBg:"#d4c8e8", tagEvenBg:"#ddd0f0",
  },
};

const _savedTheme = localStorage.getItem("da-theme") || "dark-void";

// Colores fijos de categoría — independientes del tema
const CAT_COLORS = {
  "Videos":                  "#f43f5e",
  "Imagenes":                "#a855f7",
  "Audio":                   "#06b6d4",
  "Documentos":              "#3b82f6",
  "Instaladores/ISO":        "#f59e0b",
  "Temporales/Cache":        "#ef4444",
  "Desarrollo (compilados)": "#10b981",
  "Bases de datos":          "#6366f1",
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

// Modelos con metadatos completos
const MODEL_INFO = {
  // ── Google Gemini ──
  "gemini-3.1-pro-preview":            { name:"Gemini 3.1 Pro",          ctx:"2M",   speed:2, desc:"Frontier, máximo razonamiento (preview)",       tags:["nuevo","potente","razonamiento"], rec:false },
  "gemini-3-flash-preview":            { name:"Gemini 3 Flash",          ctx:"1M",   speed:4, desc:"Balanceado y veloz, ideal para agentes",        tags:["nuevo","rápido"],          rec:true  },
  "gemini-3.1-flash-lite-preview":     { name:"Gemini 3.1 Flash-Lite",   ctx:"1M",   speed:5, desc:"Ultra rápido y económico (preview)",            tags:["nuevo","rápido","ligero"], rec:false },
  "gemini-2.5-pro":                    { name:"Gemini 2.5 Pro",          ctx:"2M",   speed:2, desc:"Estable, alta capacidad, producción",           tags:["potente","estable"],       rec:false },
  "gemini-2.5-flash":                  { name:"Gemini 2.5 Flash",        ctx:"1M",   speed:4, desc:"Estable y rápido, listo para producción",       tags:["estable","rápido"],        rec:false },
  "gemini-1.5-flash":                  { name:"Gemini 1.5 Flash",        ctx:"1M",   speed:4, desc:"Free tier recomendado, muy estable",            tags:["estable","free"],          rec:false },
  "gemini-1.5-pro":                    { name:"Gemini 1.5 Pro",          ctx:"2M",   speed:2, desc:"Pro 1.5 con ventana de 2M tokens",              tags:["estable","potente"],       rec:false },
  // ── Groq ──
  "llama-3.3-70b-versatile":               { name:"Llama 3.3 70B",              ctx:"128K", speed:3, desc:"Última versión Llama 70B, muy versátil",        tags:["nuevo","potente"],         rec:true  },
  "llama-3.1-70b-versatile":               { name:"Llama 3.1 70B",              ctx:"128K", speed:3, desc:"70B versátil de alto rendimiento",              tags:["versátil","potente"],      rec:false },
  "llama-3.1-8b-instant":                  { name:"Llama 3.1 8B Instant",       ctx:"128K", speed:5, desc:"Ultra rápido para respuestas inmediatas",        tags:["rápido","ligero"],         rec:false },
  "llama3-70b-8192":                       { name:"Llama 3 70B",                ctx:"8K",   speed:3, desc:"Llama 3 clásico de alto rendimiento",           tags:["estable","potente"],       rec:false },
  "llama3-8b-8192":                        { name:"Llama 3 8B",                 ctx:"8K",   speed:5, desc:"Pequeño y eficiente",                           tags:["ligero","rápido"],         rec:false },
  "llama-3.2-90b-vision-preview":          { name:"Llama 3.2 90B Vision",       ctx:"128K", speed:2, desc:"Visión + texto, 90B parámetros",                tags:["visión","potente"],        rec:false },
  "llama-3.2-11b-vision-preview":          { name:"Llama 3.2 11B Vision",       ctx:"128K", speed:4, desc:"Visión multimodal ligera 11B",                  tags:["visión","ligero"],         rec:false },
  "llama-3.2-3b-preview":                  { name:"Llama 3.2 3B",               ctx:"128K", speed:5, desc:"Modelo muy compacto 3B",                        tags:["ligero","económico"],      rec:false },
  "llama-3.2-1b-preview":                  { name:"Llama 3.2 1B",               ctx:"128K", speed:5, desc:"El más pequeño y rápido de Llama",              tags:["ligero","económico"],      rec:false },
  "meta-llama/llama-4-scout-17b-16e-instruct": { name:"Llama 4 Scout 17B",      ctx:"128K", speed:4, desc:"Llama 4 Scout — mezcla de expertos 17B",        tags:["nuevo","rápido"],          rec:true  },
  "moonshotai/kimi-k2-instruct-0905":      { name:"Kimi K2",                    ctx:"128K", speed:3, desc:"Kimi K2 de Moonshot AI — razonamiento avanzado", tags:["nuevo","razonamiento"],    rec:false },
  "qwen/qwen3-32b":                        { name:"Qwen 3 32B",                 ctx:"128K", speed:3, desc:"Qwen 3 32B — razonamiento y código",             tags:["nuevo","razonamiento"],    rec:false },
  "openai/gpt-oss-120b":                   { name:"GPT OSS 120B",               ctx:"128K", speed:2, desc:"Modelo open-source grande vía Groq",             tags:["potente","nuevo"],         rec:false },
  "openai/gpt-oss-20b":                    { name:"GPT OSS 20B",                ctx:"128K", speed:4, desc:"Modelo open-source ligero vía Groq",             tags:["ligero","nuevo"],          rec:false },
  "mixtral-8x7b-32768":                    { name:"Mixtral 8×7B",               ctx:"32K",  speed:4, desc:"MoE — excelente razonamiento y código",          tags:["razonamiento","código"],   rec:false },
  "gemma2-9b-it":                          { name:"Gemma 2 9B",                 ctx:"8K",   speed:4, desc:"Google Gemma 2 instrucciones",                  tags:["google","equilibrado"],    rec:false },
  "gemma-7b-it":                           { name:"Gemma 7B",                   ctx:"8K",   speed:5, desc:"Google Gemma 7B instrucciones",                  tags:["google","ligero"],         rec:false },
  "deepseek-r1-distill-llama-70b":         { name:"DeepSeek R1 70B",            ctx:"128K", speed:2, desc:"Razonamiento cadena de pensamiento",             tags:["razonamiento","lento"],    rec:false },
  "deepseek-r1-distill-qwen-32b":          { name:"DeepSeek R1 Qwen 32B",       ctx:"128K", speed:3, desc:"R1 destilado sobre Qwen 32B",                   tags:["razonamiento","nuevo"],    rec:false },
  "qwen-qwq-32b":                          { name:"QwQ 32B",                    ctx:"128K", speed:3, desc:"Razonamiento avanzado de Qwen",                  tags:["razonamiento","nuevo"],    rec:false },
  "qwen-2.5-72b-instruct":                 { name:"Qwen 2.5 72B",               ctx:"128K", speed:2, desc:"Qwen 2.5 grande con instrucciones",              tags:["potente","nuevo"],         rec:false },
  "qwen-2.5-coder-32b-instruct":           { name:"Qwen 2.5 Coder 32B",         ctx:"128K", speed:3, desc:"Especializado en programación",                  tags:["código","nuevo"],          rec:false },
  "meta-llama-guard-4-12b":                { name:"Llama Guard 4 12B",          ctx:"128K", speed:4, desc:"Modelo de seguridad y moderación",               tags:["seguridad"],               rec:false },
  "groq/compound":                         { name:"Groq Compound",              ctx:"128K", speed:3, desc:"Sistema agéntico compuesto de Groq",              tags:["nuevo","agéntico"],        rec:false },
  "groq/compound-mini":                    { name:"Groq Compound Mini",         ctx:"128K", speed:4, desc:"Sistema agéntico compuesto ligero de Groq",       tags:["nuevo","agéntico","rápido"],rec:false },
  // ── Anthropic Claude ──
  "claude-opus-4-6":                   { name:"Claude Opus 4.6",         ctx:"200K", speed:1, desc:"Máxima inteligencia, tareas muy complejas",    tags:["potente","lento"],         rec:false },
  "claude-sonnet-4-6":                 { name:"Claude Sonnet 4.6",       ctx:"200K", speed:4, desc:"Última versión Sonnet — equilibrio óptimo",    tags:["nuevo","equilibrado"],     rec:true  },
  "claude-sonnet-4-5":                 { name:"Claude Sonnet 4.5",       ctx:"200K", speed:4, desc:"Sonnet 4.5 — inteligencia y velocidad",        tags:["equilibrado"],             rec:false },
  "claude-haiku-4-5-20251001":         { name:"Claude Haiku 4.5",        ctx:"200K", speed:5, desc:"El más rápido y económico de Claude 4",        tags:["rápido","económico"],      rec:false },
  "claude-3-7-sonnet-20250219":        { name:"Claude 3.7 Sonnet",       ctx:"200K", speed:3, desc:"Razonamiento extendido paso a paso",           tags:["razonamiento","nuevo"],    rec:false },
  "claude-3-5-sonnet-20241022":        { name:"Claude 3.5 Sonnet",       ctx:"200K", speed:3, desc:"Sonnet 3.5 estable y muy versátil",            tags:["estable","equilibrado"],   rec:false },
  "claude-3-5-sonnet-20240620":        { name:"Claude 3.5 Sonnet (Jun)",  ctx:"200K", speed:3, desc:"Primera versión Sonnet 3.5",                  tags:["estable","legacy"],        rec:false },
  "claude-3-5-haiku-20241022":         { name:"Claude 3.5 Haiku",        ctx:"200K", speed:5, desc:"Haiku 3.5 — rápido y preciso",                 tags:["rápido","estable"],        rec:false },
  "claude-3-opus-20240229":            { name:"Claude 3 Opus",           ctx:"200K", speed:1, desc:"Opus 3 — máxima calidad generación anterior",  tags:["potente","legacy"],        rec:false },
  "claude-3-sonnet-20240229":          { name:"Claude 3 Sonnet",         ctx:"200K", speed:3, desc:"Sonnet 3 equilibrado",                         tags:["estable","legacy"],        rec:false },
  "claude-3-haiku-20240307":           { name:"Claude 3 Haiku",          ctx:"200K", speed:5, desc:"Haiku 3 — muy rápido y económico",             tags:["rápido","legacy"],         rec:false },
};

const KNOWN_MODELS = {
  gemini: [
    "gemini-3.1-pro-preview","gemini-3-flash-preview","gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro","gemini-2.5-flash",
    "gemini-1.5-flash","gemini-1.5-pro",
  ],
  groq: [
    // Producción
    "llama-3.3-70b-versatile","llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-120b","openai/gpt-oss-20b",
    "groq/compound","groq/compound-mini",
    // Preview
    "moonshotai/kimi-k2-instruct-0905","qwen/qwen3-32b",
    // Llama legado
    "llama-3.1-70b-versatile",
    "llama3-70b-8192","llama3-8b-8192",
    "llama-3.2-90b-vision-preview","llama-3.2-11b-vision-preview","llama-3.2-3b-preview","llama-3.2-1b-preview",
    // Otros
    "mixtral-8x7b-32768",
    "gemma2-9b-it","gemma-7b-it",
    "deepseek-r1-distill-llama-70b","deepseek-r1-distill-qwen-32b",
    "qwen-qwq-32b","qwen-2.5-72b-instruct","qwen-2.5-coder-32b-instruct",
    "meta-llama-guard-4-12b",
  ],
  claude: [
    "claude-sonnet-4-6","claude-opus-4-6","claude-sonnet-4-5","claude-haiku-4-5-20251001",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022","claude-3-5-sonnet-20240620","claude-3-5-haiku-20241022",
    "claude-3-opus-20240229","claude-3-sonnet-20240229","claude-3-haiku-20240307",
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

const _fmtSizeCache = new Map();
function fmtSize(b) {
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

function fmtNum(n) {
  return n == null ? "—" : Number(n).toLocaleString("es-ES");
}

// Barra de progreso relativa (0-100%)
function MiniBar({ pct, color, C }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
      <div className="h-full rounded-full transition-all duration-500"
           style={{ width: `${Math.min(pct,100)}%`, background: color }} />
    </div>
  );
}

// Icono de ordenación
function SortIcon({ col, sortCol, sortAsc, C }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="opacity-20 ml-0.5" />;
  return sortAsc
    ? <ChevronUp   size={11} className="ml-0.5" style={{ color: C.accentL }} />
    : <ChevronDown size={11} className="ml-0.5" style={{ color: C.accentL }} />;
}

// ── ChatMarkdown: renderiza markdown básico con listas, headers, bold, code ──
const ChatMarkdown = memo(function ChatMarkdown({ text, C }) {
  // Separar bloques de código primero
  const parts = [];
  const codeBlockRe = /```(?:\w+\n?)?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", val: text.slice(last, m.index) });
    parts.push({ type:"block", val: m[1].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", val: text.slice(last) });

  // Renderizar inline: **bold**, `code`, *italic*
  function renderInline(str, keyPfx) {
    const segs = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return segs.map((s, j) => {
      if (s.startsWith("**") && s.endsWith("**"))
        return <strong key={`${keyPfx}-${j}`} style={{ fontWeight:700, color: C?.textPri }}>{s.slice(2,-2)}</strong>;
      if (s.startsWith("`") && s.endsWith("`"))
        return <code key={`${keyPfx}-${j}`} className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                     style={{ background: C?.bgCard2 || "#1a1a2e", color: C?.accentL || "#a0f0c0" }}>{s.slice(1,-1)}</code>;
      if (s.startsWith("*") && s.endsWith("*") && s.length > 2)
        return <em key={`${keyPfx}-${j}`} style={{ fontStyle:"italic", opacity:0.85 }}>{s.slice(1,-1)}</em>;
      return s;
    });
  }

  // Renderizar bloque de texto con soporte para headers, listas y párrafos
  function renderTextBlock(val, blockIdx) {
    const lines = val.split("\n");
    const nodes = [];
    let listItems = [];

    const flushList = () => {
      if (listItems.length === 0) return;
      nodes.push(
        <ul key={`ul-${blockIdx}-${nodes.length}`} className="my-1.5 space-y-0.5 pl-0">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2 text-[11px]">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: C?.accentL || "#818cf8" }}/>
              <span>{renderInline(item, `${blockIdx}-li-${li}`)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) { flushList(); return; }

      // Header ## o ###
      if (trimmed.startsWith("### ")) {
        flushList();
        nodes.push(
          <p key={`h3-${blockIdx}-${li}`} className="text-[11px] font-bold mt-2 mb-0.5" style={{ color: C?.accentL }}>
            {renderInline(trimmed.slice(4), `h3-${blockIdx}-${li}`)}
          </p>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        flushList();
        nodes.push(
          <p key={`h2-${blockIdx}-${li}`} className="text-[12px] font-bold mt-2 mb-1" style={{ color: C?.accent }}>
            {renderInline(trimmed.slice(3), `h2-${blockIdx}-${li}`)}
          </p>
        );
        return;
      }

      // Lista con - o •
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        listItems.push(trimmed.slice(2));
        return;
      }
      // Lista numerada
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        flushList();
        nodes.push(
          <div key={`num-${blockIdx}-${li}`} className="flex items-start gap-2 text-[11px] my-0.5">
            <span className="shrink-0 font-bold text-[10px] mt-0.5 w-4 text-right" style={{ color: C?.accentL }}>
              {numMatch[1]}.
            </span>
            <span>{renderInline(numMatch[2], `num-${blockIdx}-${li}`)}</span>
          </div>
        );
        return;
      }

      flushList();
      nodes.push(
        <p key={`p-${blockIdx}-${li}`} className="text-[11px] leading-relaxed">
          {renderInline(trimmed, `p-${blockIdx}-${li}`)}
        </p>
      );
    });
    flushList();
    return nodes;
  }

  return (
    <div className="space-y-1">
      {parts.map((p, i) => {
        if (p.type === "block") return (
          <pre key={i} className="rounded-lg text-[10px] p-3 my-1.5 overflow-x-auto font-mono leading-relaxed"
               style={{ background: C?.bgDark || "#0a0a12", color: C?.green || "#a0f0c0",
                        border:`1px solid ${C?.border || "#2a2a40"}` }}>
            {p.val}
          </pre>
        );
        return <div key={i}>{renderTextBlock(p.val, i)}</div>;
      })}
    </div>
  );
});

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


// ── ChatActionBar: botones de acción para rutas detectadas en respuestas ───────
// Extrae rutas Windows del texto del asistente y ofrece acciones rápidas sobre ellas.
const ChatActionBar = memo(function ChatActionBar({ text, C, onAttach, onOpenExplorer }) {
  const paths = useMemo(() => {
    const found = [];
    let m;
    const re = new RegExp(WIN_PATH_RE.source, "g"); // nueva instancia para resetear lastIndex
    while ((m = re.exec(text)) !== null && found.length < 5) {
      if (!found.includes(m[0])) found.push(m[0]);
    }
    return found;
  }, [text]);

  if (paths.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {paths.map(path => {
        const name = path.split(/[\\/]/).pop() || path;
        return (
          <div key={path} className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[140px]"
                  style={{ background: C.bgInput, color: C.textMuted, border:`1px solid ${C.border}` }}
                  title={path}>
              {name}
            </span>
            <button onClick={() => onOpenExplorer(path)}
                    title="Abrir en Explorador"
                    className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background:`${C.accent}18`, color: C.accentL, border:`1px solid ${C.accent}30` }}>
              <ExternalLink size={9}/> Abrir
            </button>
            <button onClick={() => onAttach(path)}
                    title="Adjuntar al chat"
                    className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background:`${C.purple}18`, color: C.purple, border:`1px solid ${C.purple}30` }}>
              <Clipboard size={9}/> Adjuntar
            </button>
            <button onClick={() => navigator.clipboard?.writeText(path)}
                    title="Copiar ruta"
                    className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background:`${C.cyan}18`, color: C.cyan, border:`1px solid ${C.cyan}30` }}>
              <Clipboard size={9}/> Copiar
            </button>
          </div>
        );
      })}
    </div>
  );
});

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

// ── Helpers de fecha ──────────────────────────────────────────────────────────
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

    for (const item of remaining) {
      const testVal = stripVal + item.value;
      const testRatio = () => {
        const sz = (testVal / total) * (isWide ? rw : rh);
        const a = side * side * item.value / (testVal * testVal);
        const b = testVal * testVal / (side * side * item.value);
        return Math.max(a, b);
      };
      if (!strip.length || testRatio() < (() => {
        const sz = (stripVal / total) * (isWide ? rw : rh);
        const last = strip[strip.length - 1];
        const a = side * side * last.value / (stripVal * stripVal);
        const b = stripVal * stripVal / (side * side * last.value);
        return Math.max(a, b);
      })()) {
        strip.push(item);
        stripVal += item.value;
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
        const color = Object.values(CAT_COLORS)[i % Object.values(CAT_COLORS).length];
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

// ── TempCleanerModal ───────────────────────────────────────────────────────────

const TempCleanerModal = React.memo(function TempCleanerModal({ onClose, C }) {
  const [loading, setLoading]     = useState(true);
  const [groups,  setGroups]      = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [selected, setSelected]   = useState(new Set());
  const [cleaning, setCleaning]   = useState(false);
  const [done,     setDone]       = useState(null); // { deleted, errors }

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
    try {
      const r = await fetch(`${API}/api/temp-clean`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ paths: [...selected], mode }),
      });
      const d = await r.json();
      setDone(d);
      // Actualizar grupos eliminando los borrados
      const deletedSet = new Set(d.deleted || []);
      setGroups(prev => prev.map(g => ({
        ...g,
        files: g.files.filter(f => !deletedSet.has(f.path)),
        total_size: g.files.filter(f => !deletedSet.has(f.path)).reduce((s,f) => s+f.size, 0),
      })).filter(g => g.files.length > 0));
      setSelected(new Set());
    } catch {}
    finally { setCleaning(false); }
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
                    <button onClick={() => onAttach(alert.path)}
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
const _toastListeners = new Set();
function _emitToast(toast) { _toastListeners.forEach(fn => fn(toast)); }

function useToast() {
  return {
    show: (msg, type = "info", duration = 3500) => {
      _emitToast({ id: ++_toastId, msg, type, duration });
    },
  };
}

const ToastContainer = React.memo(function ToastContainer({ C }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts(prev => [...prev.slice(-4), toast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), toast.duration);
    };
    _toastListeners.add(handler);
    return () => _toastListeners.delete(handler);
  }, []);

  if (!toasts.length) return null;

  const TYPE_STYLE = {
    info:    { bg: C.bgCard2,        border: C.border,  color: C.textPri,  icon: "ℹ" },
    success: { bg: `${C.green}18`,   border: C.green,   color: C.green,    icon: "✓" },
    warning: { bg: `${C.amber}18`,   border: C.amber,   color: C.amber,    icon: "⚠" },
    error:   { bg: `${C.red}18`,     border: C.red,     color: C.red,      icon: "✗" },
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
         style={{ maxWidth: 320 }}>
      {toasts.map(t => {
        const s = TYPE_STYLE[t.type] || TYPE_STYLE.info;
        return (
          <div key={t.id}
               className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl shadow-2xl pointer-events-auto"
               style={{ background: s.bg, border: `1px solid ${s.border}44`, color: s.color,
                        animation: "toastIn 0.2s ease-out" }}>
            <span className="text-sm shrink-0 mt-0.5">{s.icon}</span>
            <span className="text-[11px] leading-relaxed flex-1">{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
});

// ── FolderCompareModal ─────────────────────────────────────────────────────────

const FolderCompareModal = React.memo(function FolderCompareModal({ folders, onClose, C }) {
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");

  const folderList = useMemo(() =>
    Object.values(folders || {}).sort((a, b) => b.size - a.size).slice(0, 300),
  [folders]);

  const nodeA = folders[pathA];
  const nodeB = folders[pathB];

  const diff = useMemo(() => {
    if (!nodeA || !nodeB) return null;
    const delta = nodeA.size - nodeB.size;
    const bigger = delta > 0 ? pathA : pathB;
    return { delta: Math.abs(delta), bigger, pct: nodeB.size > 0 ? Math.abs(delta) / Math.max(nodeA.size, nodeB.size) * 100 : 0 };
  }, [nodeA, nodeB, pathA, pathB]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ background:"rgba(0,0,0,0.75)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-xl overflow-hidden flex flex-col shadow-2xl"
           style={{ background: C.bgCard, border:`1px solid ${C.border}`, width: 560 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPri }}>
            <GitCompare size={14} style={{ color: C.accent }}/> Comparar carpetas
          </span>
          <button onClick={onClose} style={{ color: C.textMuted }} className="hover:text-white"><X size={15}/></button>
        </div>
        {/* Selectors */}
        <div className="p-4 grid grid-cols-2 gap-4">
          {[["A", pathA, setPathA], ["B", pathB, setPathB]].map(([label, val, setter]) => (
            <div key={label}>
              <p className="text-[10px] font-bold mb-1.5" style={{ color: C.textMuted }}>CARPETA {label}</p>
              <select value={val} onChange={e => setter(e.target.value)}
                      className="w-full text-[11px] px-2 py-1.5 rounded-lg outline-none"
                      style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.border}` }}>
                <option value="">— Seleccionar —</option>
                {folderList.map(f => (
                  <option key={f.path} value={f.path}>
                    {f.path.split(/[\\/]/).slice(-2).join("/")}  ({fmtSize(f.size)})
                  </option>
                ))}
              </select>
              {val && folders[val] && (
                <div className="mt-1.5 text-[10px] space-y-0.5 px-2" style={{ color: C.textSec }}>
                  <div>Tamaño: <span className="font-bold" style={{ color: C.accentL }}>{fmtSize(folders[val].size)}</span></div>
                  <div>Archivos: <span style={{ color: C.accentL }}>{fmtNum(folders[val].file_count)}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Result */}
        {diff && nodeA && nodeB && (
          <div className="mx-4 mb-4 rounded-xl p-4"
               style={{ background: C.bgCard2, border:`1px solid ${C.border}` }}>
            <p className="text-[10px] font-bold mb-3" style={{ color: C.textMuted }}>COMPARACIÓN</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[["A", nodeA, pathA], ["B", nodeB, pathB]].map(([l, node, p]) => (
                <div key={l} className="rounded-lg p-3" style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                  <p className="text-[9px] font-bold mb-1" style={{ color: C.textMuted }}>CARPETA {l}</p>
                  <p className="text-xs font-bold" style={{ color: diff.bigger === p ? C.amber : C.green }}>
                    {fmtSize(node.size)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: C.textSec }}>{fmtNum(node.file_count)} archivos</p>
                  <p className="text-[9px] mt-1 truncate font-mono" style={{ color: C.textMuted }}>
                    {p.split(/[\\/]/).pop()}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-center rounded-lg py-2"
                 style={{ background:`${C.accent}12`, border:`1px solid ${C.accent}30`, color: C.textPri }}>
              La carpeta <span style={{ color: C.amber }} className="font-bold">
                {diff.bigger.split(/[\\/]/).pop()}
              </span> es <span style={{ color: C.amber }} className="font-bold">{fmtSize(diff.delta)}</span> mayor
              {" "}({diff.pct.toFixed(1)}% de diferencia)
            </div>
          </div>
        )}
        {!diff && pathA && pathB && (
          <p className="text-center text-[11px] pb-4" style={{ color: C.textMuted }}>Selecciona dos carpetas para comparar</p>
        )}
        {!pathA && !pathB && (
          <p className="text-center text-[11px] pb-4" style={{ color: C.textMuted }}>Selecciona carpetas del escaneo actual</p>
        )}
      </div>
    </div>
  );
});

// ── ScanHistoryModal ───────────────────────────────────────────────────────────

const ScanHistoryModal = React.memo(function ScanHistoryModal({ history, onClose, onRescan, C }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ background:"rgba(0,0,0,0.75)" }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-xl overflow-hidden flex flex-col shadow-2xl"
           style={{ background: C.bgCard, border:`1px solid ${C.border}`, width: 480, maxHeight: "60vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
             style={{ background: C.bgSurface, borderColor: C.border }}>
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: C.textPri }}>
            <History size={14} style={{ color: C.accent }}/> Historial de escaneos
          </span>
          <button onClick={onClose} style={{ color: C.textMuted }} className="hover:text-white"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-[11px] py-8" style={{ color: C.textMuted }}>No hay escaneos anteriores</p>
          ) : (
            <div className="p-2 space-y-1">
              {history.map((item, i) => (
                <div key={i}
                     className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                     style={{ background: C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                       style={{ background:`${C.accent}20` }}>
                    <HardDrive size={13} style={{ color: C.accentL }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate" style={{ color: C.textPri }}>{item.path}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                      {item.files?.toLocaleString("es-ES") || "—"} archivos · {fmtSize(item.bytes || 0)}
                      {" · "}{new Date(item.ts).toLocaleDateString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => { onRescan(item.path); onClose(); }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] shrink-0 transition-all hover:brightness-110"
                          style={{ background:`${C.accent}20`, color: C.accentL, border:`1px solid ${C.accent}40` }}>
                    <Play size={9} fill="currentColor"/> Re-escanear
                  </button>
                </div>
              ))}
            </div>
          )}
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

// ── Componente principal ───────────────────────────────────────────────────────

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

  // ── Imagen adjunta al chat ────────────────────────────────────────────────────
  const [attachedImage, setAttachedImage] = useState(null); // {b64, mime, preview}
  const imageInputRef = useRef(null);

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
        _emitToast({ id: ++_toastId, msg: `Escaneo completado con ${m.errors} error(es) de acceso`, type: "warning", duration: 4000 });
      } else {
        _emitToast({ id: ++_toastId, msg: `✓ Escaneo completado en ${m.elapsed?.toFixed(1)}s`, type: "success", duration: 3500 });
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
  const filteredFiles = useMemo(() => {
    // Durante el escaneo: mostrar los últimos 500 sin ordenar (evita sort de array creciente)
    if (scanning) return allFiles.slice(-500);
    return allFiles
      .filter(f => {
        if (activeCategory && f.category !== activeCategory) return false;
        if (sizeFilter > 0 && f.size < sizeFilter) return false;
        if (nameFilterDeferred && !f.name.toLowerCase().includes(nameFilterDeferred.toLowerCase())) return false;
        if (selectedFolder && !f.path.startsWith(selectedFolder)) return false;
        if (atimeFilter > 0) {
          const atime = f.atime || 0;
          if (atime > 0 && atime > (Date.now()/1000 - atimeFilter)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
        if (sortCol === "size") { va = a.size; vb = b.size; }
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortAsc ? cmp : -cmp;
      });
  }, [allFiles, scanning, activeCategory, sizeFilter, nameFilterDeferred, selectedFolder, sortCol, sortAsc, atimeFilter]);

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
  useEffect(() => { chatHistoryRef.current  = chatHistory;  }, [chatHistory]);
  useEffect(() => { providerRef.current     = provider;     }, [provider]);
  useEffect(() => { selectedPathRef.current = selectedPath; }, [selectedPath]);
  useEffect(() => { chatInputRef.current    = chatInput;    }, [chatInput]);

  // ── Persistencia del historial en localStorage ─────────────────────────────
  // Sanitiza los mensajes antes de serializar: solo extrae campos primitivos
  // conocidos para evitar referencias circulares (elementos DOM, fibers de React, etc.)
  useEffect(() => {
    if (chatHistory.length === 0) {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      return;
    }
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
  }, [chatHistory]);

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
              id: ++_toastId,
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
    // Capturar imagen antes de limpiar el estado
    const imgSnapshot = attachedImage;
    setChatInput(""); setChatError(""); setAttachedImage(null);
    setChatHistory(prev => [...prev, { role:"user", content:msg }, { role:"assistant", content:"", provider: providerRef.current }]);
    setChatLoading(true);
    try {
      const body = {
        message:       msg,
        provider:      providerRef.current,
        selected_path: selectedPathRef.current,
        history:       chatHistoryRef.current.filter(m => m.role !== "system").slice(-20),
        temperature:   temperatureRef.current,
        max_tokens:    maxTokensRef.current,
      };
      if (imgSnapshot) { body.image_b64 = imgSnapshot.b64; body.image_mime = imgSnapshot.mime; }
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
              if (!flushId) flushId = setTimeout(flushChunk, 30);
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
        ]);
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

          {/* Favoritos */}
          <div className="relative shrink-0">
            <button onClick={() => setShowFavMenu(v => !v)} title="Rutas favoritas"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all hover:brightness-110"
                    style={{ background: favorites.length > 0 ? `${C.amber}18` : C.bgCard,
                             color: favorites.length > 0 ? C.amber : C.textMuted,
                             border:`1px solid ${favorites.length > 0 ? C.amber+"44" : C.border}` }}>
              <Star size={12} fill={favorites.length > 0 ? "currentColor" : "none"}/> {favorites.length > 0 && favorites.length}
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
                             onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                             onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
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
                                               _emitToast({ id: ++_toastId, msg: favorites.includes(targetPath) ? "Eliminado de favoritos" : `"${targetPath.split(/[\\/]/).pop()}" añadido a favoritos`, type: "success", duration: 2500 }); }}
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

          {/* Historial de escaneos */}
          <button onClick={() => setShowHistory(true)} title="Historial de escaneos"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all hover:brightness-110 shrink-0"
                  style={{ background: scanHistory.length > 0 ? `${C.cyan}18` : C.bgCard,
                           color: scanHistory.length > 0 ? C.cyan : C.textMuted,
                           border:`1px solid ${scanHistory.length > 0 ? C.cyan+"44" : C.border}` }}>
            <History size={12}/> {scanHistory.length > 0 && scanHistory.length}
          </button>

          {/* Comparador de carpetas */}
          {Object.keys(folders).length > 1 && (
            <button onClick={() => setShowCompare(true)} title="Comparar carpetas"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all hover:brightness-110 shrink-0"
                    style={{ background:`${C.purple}18`, color: C.purple, border:`1px solid ${C.purple}44` }}>
              <GitCompare size={12}/>
            </button>
          )}

          {/* Botón alertas de riesgo */}
          {riskAlerts.length > 0 && (
            <button onClick={() => setShowRiskPanel(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs shrink-0 transition-all hover:brightness-110"
                    style={{ background:`${riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber}22`,
                             color: riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber,
                             border:`1px solid ${riskAlerts.some(a=>a.severity==="high") ? C.red : C.amber}44` }}>
              <Bell size={12}/> {riskAlerts.length} riesgo{riskAlerts.length > 1 ? "s" : ""}
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
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] transition-all"
                      style={{
                        background: viewMode===id ? `${C.accent}30` : C.bgCard,
                        color:      viewMode===id ? C.accentL : C.textMuted,
                        borderRight: id!=="timeline" ? `1px solid ${C.border}` : undefined,
                      }}>
                <VIcon size={12}/> {title}
              </button>
            ))}
          </div>

          {/* Limpiador de temporales */}
          <button onClick={() => setShowTempCleaner(true)} title="Limpiar archivos temporales"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all hover:brightness-110 shrink-0"
                  style={{ background:`${C.amber}18`, color: C.amber, border:`1px solid ${C.amber}44` }}>
            <Trash2 size={12}/> Temp
          </button>

          {/* Exportar — solo cuando hay datos */}
          {allFiles.length > 0 && (
            <div className="relative shrink-0 group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:brightness-110"
                      style={{ background:`${C.green}18`, color: C.green, border:`1px solid ${C.green}35` }}>
                <Download size={12}/> Exportar
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-xl z-30 hidden group-hover:flex flex-col"
                   style={{ background: C.bgCard2, border:`1px solid ${C.border}`, minWidth: 130 }}>
                {[["CSV","csv"],["JSON","json"],["HTML","html"]].map(([label, fmt]) => (
                  <button key={fmt}
                          onClick={async () => {
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
                          className="flex items-center gap-2 px-3 py-2 text-xs text-left transition-all hover:brightness-125"
                          style={{ color: C.textPri }}
                          onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Download size={11}/> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botón Escanear / Cancelar */}
          {!scanning ? (
            <button onClick={() => startScan()}
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

          {/* Filtro por último acceso */}
          <select value={atimeFilter} onChange={e => setAtimeFilter(Number(e.target.value))}
                  title="Filtrar por último acceso (atime — puede no estar actualizado en Windows)"
                  className="text-[11px] px-2 py-1 rounded outline-none shrink-0"
                  style={{ background: atimeFilter > 0 ? `${C.purple}20` : C.bgCard,
                           color: atimeFilter > 0 ? C.purple : C.textSec,
                           border:`1px solid ${atimeFilter > 0 ? C.purple : C.border}` }}>
            <option value={0}>Cualquier acceso</option>
            <option value={15552000}>No accedido en 6 meses</option>
            <option value={31536000}>No accedido en 1 año</option>
            <option value={63072000}>No accedido en 2 años</option>
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
                          onMouseEnter={e => !sel && (e.currentTarget.style.background = C.bgHover)}
                          onMouseLeave={e => !sel && (e.currentTarget.style.background = "transparent")}>
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

            <div className="px-3 py-1 text-[10px] border-t shrink-0 flex justify-between"
                 style={{ color: C.textMuted, borderColor: C.border, background: C.bgSurface }}>
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
        <div className="shrink-0 border-b" style={{ background: C.bgSurface, borderColor: C.border }}>
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
              {chatHistory.filter(m => m.role !== "system").length > 0 && (
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded"
                      title={`${chatHistory.filter(m=>m.role!=="system").length} mensajes guardados`}
                      style={{ background:`${C.green}15`, color: C.green, border:`1px solid ${C.green}25` }}>
                  <History size={8}/> {chatHistory.filter(m=>m.role!=="system").length}
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
        {showSettings && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.6)" }}
                 onClick={() => setShowSettings(false)} />

            {/* Modal */}
            <div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden flex"
                 style={{
                   top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                   width: 580, maxHeight: "80vh",
                   background: C.bgSurface, border:`1px solid ${C.border}`,
                 }}>

              {/* ── Sidebar ── */}
              <div className="flex flex-col w-40 shrink-0 border-r"
                   style={{ background: C.bgPanel, borderColor: C.border }}>
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between"
                     style={{ borderColor: C.border }}>
                  <span className="text-xs font-bold tracking-wide" style={{ color: C.textPri }}>Ajustes</span>
                  <button onClick={() => setShowSettings(false)}
                          className="rounded p-0.5 hover:brightness-150 transition-all"
                          style={{ color: C.textMuted }}>
                    <X size={13}/>
                  </button>
                </div>

                {/* Nav items */}
                <nav className="flex flex-col gap-0.5 p-2 flex-1">
                  {[
                    { id:"keys",   Icon: Key,     label:"API Keys"  },
                    { id:"models", Icon: Cpu,     label:"Modelos"   },
                    { id:"params", Icon: Sliders,  label:"Parámetros"},
                    { id:"theme",  Icon: Palette,  label:"Tema"      },
                  ].map(({ id, Icon: NavIcon, label }) => (
                    <button key={id} onClick={() => setSettingsTab(id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                            style={{
                              background: settingsTab===id ? `${C.accent}20` : "transparent",
                              color:      settingsTab===id ? C.accentL : C.textSec,
                              borderLeft: `3px solid ${settingsTab===id ? C.accent : "transparent"}`,
                            }}>
                      <NavIcon size={13} />
                      {label}
                    </button>
                  ))}
                </nav>

                {/* Version badge */}
                <div className="px-4 py-2 border-t" style={{ borderColor: C.border }}>
                  <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>v{APP_VERSION}</span>
                </div>
              </div>

              {/* ── Content area ── */}
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Section header */}
                <div className="px-5 py-3 border-b shrink-0"
                     style={{ background: C.bgPanel, borderColor: C.border }}>
                  <h2 className="text-sm font-semibold" style={{ color: C.textPri }}>
                    { settingsTab==="keys"   ? "API Keys"
                    : settingsTab==="models" ? "Modelos de IA"
                    : settingsTab==="params" ? "Parámetros del chat"
                    : "Tema visual" }
                  </h2>
                  <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                    { settingsTab==="keys"   ? "Las claves se guardan localmente en %APPDATA%\\DiskAnalyzer"
                    : settingsTab==="models" ? "Selecciona el modelo a usar para cada proveedor"
                    : settingsTab==="params" ? "Controla la creatividad y longitud de las respuestas"
                    : "Cambia la apariencia de la interfaz" }
                  </p>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* ── Keys tab ── */}
                  {settingsTab === "keys" && (() => {
                    const KEY_DEFS = [
                      { id:"GEMINI_API_KEY",    label:"Google Gemini", ph:"AIza…",    hasKey:"has_gemini_key",    color: C.blue,   dot:"🔵" },
                      { id:"ANTHROPIC_API_KEY", label:"Anthropic Claude", ph:"sk-ant-…", hasKey:"has_anthropic_key", color: C.amber,  dot:"🟠" },
                      { id:"GROQ_API_KEY",      label:"Groq",          ph:"gsk_…",    hasKey:"has_groq_key",      color: C.purple, dot:"🟣" },
                    ];
                    return (
                      <div className="space-y-4">
                        {KEY_DEFS.map(({ id, label, ph, hasKey, color }) => (
                          <div key={id} className="rounded-lg p-3"
                               style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: color }}/>
                                <span className="text-xs font-semibold" style={{ color: C.textPri }}>{label}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      background: config[hasKey] ? `${C.green}20` : `${C.textMuted}15`,
                                      color: config[hasKey] ? C.green : C.textMuted,
                                    }}>
                                {config[hasKey] ? "✓ Configurada" : "Sin configurar"}
                              </span>
                            </div>
                            <div className="relative">
                              <input type={showKeys[id] ? "text" : "password"}
                                     value={apiKeys[id]}
                                     onChange={e => setApiKeys(p => ({...p, [id]: e.target.value}))}
                                     placeholder={ph}
                                     className="w-full px-3 py-1.5 text-[11px] rounded-lg outline-none font-mono pr-8"
                                     style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.borderFocus}` }} />
                              <button onClick={() => setShowKeys(p => ({...p, [id]: !p[id]}))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 hover:brightness-150"
                                      style={{ color: C.textMuted }}>
                                {showKeys[id] ? <EyeOff size={12}/> : <Eye size={12}/>}
                              </button>
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] leading-relaxed px-1" style={{ color: C.textMuted }}>
                          Las claves se almacenan en <span className="font-mono" style={{ color: C.textAccent }}>%APPDATA%\DiskAnalyzer\api_keys.json</span> y nunca se suben a ningún servidor.
                        </p>
                      </div>
                    );
                  })()}

                  {/* ── Models tab ── */}
                  {settingsTab === "models" && (() => {
                    const PROVS = [
                      { id:"GEMINI_MODEL",  label:"Google Gemini",    prov:"gemini", color: C.blue,   icon:"G" },
                      { id:"GROQ_MODEL",    label:"Groq",             prov:"groq",   color: C.purple, icon:"Q" },
                      { id:"CLAUDE_MODEL",  label:"Anthropic Claude", prov:"claude", color: C.amber,  icon:"A" },
                    ];
                    const q = modelSearch.toLowerCase();
                    const filterModels = (list) => !q ? list : list.filter(m => {
                      const mi = MODEL_INFO[m] || {};
                      return m.includes(q) || (mi.name||"").toLowerCase().includes(q)
                          || (mi.desc||"").toLowerCase().includes(q)
                          || (mi.tags||[]).some(t => t.includes(q));
                    });

                    return (
                      <div className="space-y-4">
                        {/* Search bar */}
                        <div className="relative">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                  style={{ color: C.textMuted }}/>
                          <input value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                                 placeholder="Buscar modelo por nombre, tag o descripción…"
                                 className="w-full pl-8 pr-3 py-2 text-xs rounded-lg outline-none"
                                 style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.borderFocus}` }}/>
                          {modelSearch && (
                            <button onClick={() => setModelSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:brightness-150"
                                    style={{ color: C.textMuted }}>
                              <X size={11}/>
                            </button>
                          )}
                        </div>

                        {/* Tag quick-filters */}
                        <div className="flex flex-wrap gap-1.5">
                          {["rápido","potente","razonamiento","económico","nuevo","ligero","código","visión","estable"].map(tag => (
                            <button key={tag} onClick={() => setModelSearch(modelSearch===tag ? "" : tag)}
                                    className="text-[9px] px-2 py-0.5 rounded-full transition-all"
                                    style={{
                                      background: modelSearch===tag ? `${C.accent}30` : C.bgCard2,
                                      color:      modelSearch===tag ? C.accentL : C.textMuted,
                                      border:     `1px solid ${modelSearch===tag ? C.accent+"60" : C.border}`,
                                    }}>
                              {tag}
                            </button>
                          ))}
                        </div>

                        {/* Provider sections */}
                        {PROVS.map(({ id, label, prov, color, icon }) => {
                          const selected = modelInputs[id];
                          const selInfo  = MODEL_INFO[selected] || {};
                          const filtered = filterModels(KNOWN_MODELS[prov] || []);
                          return (
                            <div key={id} className="rounded-xl overflow-hidden"
                                 style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>

                              {/* Header */}
                              <div className="flex items-center gap-3 px-4 py-2.5 border-b"
                                   style={{ background: C.bgCard2, borderColor: C.border }}>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                                     style={{ background:`${color}25`, color }}>
                                  {icon}
                                </div>
                                <span className="text-xs font-bold" style={{ color: C.textPri }}>{label}</span>
                                {/* Selected badge */}
                                {selected && selInfo.name && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]"
                                        style={{ background:`${color}20`, color }}>
                                    ✓ {selInfo.name}
                                  </span>
                                )}
                                <span className="ml-auto text-[9px] shrink-0" style={{ color: C.textMuted }}>
                                  {filtered.length}/{(KNOWN_MODELS[prov]||[]).length}
                                </span>
                              </div>

                              <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
                                {filtered.length === 0 && (
                                  <p className="text-center text-[10px] py-4" style={{ color: C.textMuted }}>
                                    Sin resultados para "{modelSearch}"
                                  </p>
                                )}
                                {filtered.map(m => {
                                  const mi    = MODEL_INFO[m] || {};
                                  const isSel = selected === m;
                                  return (
                                    <button key={m} onClick={() => setModelInputs(p => ({...p, [id]: m}))}
                                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all hover:brightness-110"
                                            style={{
                                              background: isSel ? `${color}18` : "transparent",
                                              border: `1px solid ${isSel ? color+"50" : "transparent"}`,
                                            }}>
                                      <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                                           style={{ background: isSel ? color : C.border }}/>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-medium leading-tight"
                                                style={{ color: isSel ? color : C.textPri }}>
                                            {mi.name || m}
                                          </span>
                                          {mi.rec && <span className="text-[8px] font-bold" style={{ color: C.green }}>★</span>}
                                          {(mi.tags||[]).slice(0,2).map(t => (
                                            <span key={t} className="text-[8px] px-1 rounded"
                                                  style={{ background: C.bgCard2, color: C.textMuted }}>{t}</span>
                                          ))}
                                        </div>
                                        <p className="text-[9px] truncate" style={{ color: C.textMuted }}>{mi.desc}</p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {mi.ctx && <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>{mi.ctx}</span>}
                                        <div className="flex gap-0.5">
                                          {[1,2,3,4,5].map(i => (
                                            <div key={i} className="w-1.5 h-1 rounded-sm"
                                                 style={{ background: i<=(mi.speed||0) ? color+"90" : C.border }}/>
                                          ))}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Ollama */}
                        <div className="rounded-xl overflow-hidden"
                             style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                          <div className="flex items-center gap-3 px-4 py-2.5 border-b"
                               style={{ background: C.bgCard2, borderColor: C.border }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                                 style={{ background:`${C.green}25`, color: C.green }}>O</div>
                            <span className="text-xs font-bold" style={{ color: C.textPri }}>Ollama (local)</span>
                            {modelInputs.OLLAMA_MODEL && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono truncate max-w-[120px]"
                                    style={{ background:`${C.green}20`, color: C.green }}>
                                ✓ {modelInputs.OLLAMA_MODEL}
                              </span>
                            )}
                            <button onClick={fetchOllamaModels} disabled={ollamaLoading}
                                    className="ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full transition-all hover:brightness-125 disabled:opacity-50"
                                    style={{ background:`${C.green}20`, color: C.green, border:`1px solid ${C.green}40` }}>
                              <RefreshCw size={10} className={ollamaLoading ? "animate-spin" : ""}/>
                              {ollamaLoading ? "Detectando…" : "Detectar"}
                            </button>
                          </div>
                          <div className="p-2">
                            {ollamaModels.length > 0 ? (
                              <div className="space-y-1">
                                {ollamaModels.map(m => (
                                  <button key={m} onClick={() => setModelInputs(p => ({...p, OLLAMA_MODEL: m}))}
                                          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all hover:brightness-110"
                                          style={{
                                            background: modelInputs.OLLAMA_MODEL===m ? `${C.green}18` : "transparent",
                                            border: `1px solid ${modelInputs.OLLAMA_MODEL===m ? C.green+"50" : "transparent"}`,
                                          }}>
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                         style={{ background: modelInputs.OLLAMA_MODEL===m ? C.green : C.border }}/>
                                    <span className="text-[11px] font-mono flex-1"
                                          style={{ color: modelInputs.OLLAMA_MODEL===m ? C.green : C.textPri }}>{m}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                                          style={{ background:`${C.green}15`, color: C.green }}>local</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2 space-y-2">
                                <input type="text" value={modelInputs.OLLAMA_MODEL}
                                       onChange={e => setModelInputs(p => ({...p, OLLAMA_MODEL: e.target.value}))}
                                       placeholder={ollamaLoading ? "Detectando…" : "ej: llama3.2, mistral, phi3…"}
                                       className="w-full px-3 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                                       style={{ background: C.bgInput, color: C.textPri, border:`1px solid ${C.borderFocus}` }}/>
                                {!ollamaLoading && (
                                  <p className="text-[10px]" style={{ color: C.textMuted }}>
                                    Ollama no detectado — instala desde <span style={{ color: C.accentL }}>ollama.com</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Params tab ── */}
                  {settingsTab === "params" && (
                    <div className="space-y-5">
                      {/* Proveedor */}
                      <div className="rounded-lg p-3" style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={13} style={{ color: C.accentL }}/>
                          <span className="text-xs font-semibold" style={{ color: C.textPri }}>Proveedor activo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PROVIDERS.map(p => (
                            <button key={p.id} onClick={() => setProvider(p.id)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                      background: provider===p.id ? `${C.accent}25` : C.bgCard2,
                                      color:      provider===p.id ? C.accentL : C.textSec,
                                      border:     `1px solid ${provider===p.id ? C.accent+"60" : C.border}`,
                                    }}>
                              <div className="w-1.5 h-1.5 rounded-full"
                                   style={{ background: provider===p.id ? C.accentL : C.textMuted }}/>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Temperatura */}
                      <div className="rounded-lg p-3" style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xs font-semibold" style={{ color: C.textPri }}>Temperatura</span>
                            <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                              {temperature < 0.4 ? "Determinista — respuestas consistentes y precisas"
                               : temperature < 0.8 ? "Equilibrado — balance entre precisión y creatividad"
                               : temperature < 1.4 ? "Creativo — respuestas más variadas"
                               : "Experimental — alta aleatoriedad"}
                            </p>
                          </div>
                          <span className="text-lg font-bold font-mono ml-3 shrink-0"
                                style={{ color: C.accentL }}>{temperature.toFixed(1)}</span>
                        </div>
                        <input type="range" min="0" max="2" step="0.1"
                               value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                               className="w-full cursor-pointer"
                               style={{ accentColor: C.accent }} />
                        <div className="flex justify-between mt-1 text-[9px]" style={{ color: C.textMuted }}>
                          <span>0.0 — Preciso</span><span>2.0 — Creativo</span>
                        </div>
                        {/* Quick presets */}
                        <div className="flex gap-1.5 mt-2">
                          {[["Preciso","0.2"],["Normal","0.7"],["Creativo","1.2"]].map(([l,v]) => (
                            <button key={v} onClick={() => setTemperature(parseFloat(v))}
                                    className="flex-1 text-[9px] py-0.5 rounded transition-all hover:brightness-125"
                                    style={{
                                      background: Math.abs(temperature - parseFloat(v)) < 0.15 ? `${C.accent}30` : C.bgCard2,
                                      color: Math.abs(temperature - parseFloat(v)) < 0.15 ? C.accentL : C.textMuted,
                                      border: `1px solid ${Math.abs(temperature - parseFloat(v)) < 0.15 ? C.accent+"50" : C.border}`,
                                    }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max tokens */}
                      <div className="rounded-lg p-3" style={{ background: C.bgCard, border:`1px solid ${C.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xs font-semibold" style={{ color: C.textPri }}>Longitud máxima</span>
                            <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>Tokens máximos en la respuesta</p>
                          </div>
                          <span className="text-lg font-bold font-mono ml-3 shrink-0"
                                style={{ color: C.accentL }}>{maxTokens}</span>
                        </div>
                        <input type="range" min="256" max="4096" step="256"
                               value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                               className="w-full cursor-pointer"
                               style={{ accentColor: C.accent }} />
                        <div className="flex justify-between mt-1 text-[9px]" style={{ color: C.textMuted }}>
                          <span>256 — Breve</span><span>4096 — Extenso</span>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {[["Breve","512"],["Normal","1024"],["Extenso","2048"]].map(([l,v]) => (
                            <button key={v} onClick={() => setMaxTokens(parseInt(v))}
                                    className="flex-1 text-[9px] py-0.5 rounded transition-all hover:brightness-125"
                                    style={{
                                      background: maxTokens===parseInt(v) ? `${C.accent}30` : C.bgCard2,
                                      color: maxTokens===parseInt(v) ? C.accentL : C.textMuted,
                                      border: `1px solid ${maxTokens===parseInt(v) ? C.accent+"50" : C.border}`,
                                    }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Theme tab ── */}
                  {settingsTab === "theme" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(THEMES).map(([id, t]) => (
                          <button key={id} onClick={() => setTheme(id)}
                                  className="flex flex-col gap-2 p-3 rounded-xl transition-all hover:scale-[1.02]"
                                  style={{
                                    background: t.bgCard,
                                    border: `2px solid ${themeId===id ? C.accent : t.border}`,
                                    boxShadow: themeId===id ? `0 0 12px ${C.accent}40` : "none",
                                  }}>
                            {/* Mini UI preview */}
                            <div className="rounded-lg overflow-hidden w-full"
                                 style={{ background: t.bgDark, border:`1px solid ${t.border}` }}>
                              <div className="flex items-center gap-1 px-2 py-1" style={{ background: t.bgPanel }}>
                                {[t.red, t.amber, t.green].map((c,i) => (
                                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }}/>
                                ))}
                                <div className="flex-1 h-1 rounded ml-1" style={{ background: t.bgCard }}/>
                              </div>
                              <div className="p-2 flex gap-1.5">
                                <div className="w-8 flex flex-col gap-1">
                                  {[1,0.6,0.4].map((o,i) => (
                                    <div key={i} className="h-1 rounded" style={{ background: t.accent, opacity: o }}/>
                                  ))}
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                  {[t.bgCard, t.bgCard2, t.bgCard].map((bg,i) => (
                                    <div key={i} className="h-1.5 rounded" style={{ background: bg }}/>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ color: t.textPri }}>{t.label}</span>
                              {themeId===id && (
                                <CheckCircle2 size={13} style={{ color: C.accent }}/>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* ── Footer actions (only for keys/models/params) ── */}
                {settingsTab !== "theme" && (
                  <div className="px-5 py-3 border-t shrink-0 flex items-center gap-3"
                       style={{ borderColor: C.border, background: C.bgPanel }}>
                    <button onClick={saveConfig} disabled={savingConfig}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: C.accent, color:"white" }}>
                      {savingConfig ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                      Guardar cambios
                    </button>
                    <button onClick={verifyApis} disabled={verifying}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: C.bgCard2, color: C.textSec, border:`1px solid ${C.border}` }}>
                      {verifying ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
                      Verificar APIs
                    </button>
                    {configMsg && (
                      <span className="text-xs flex items-center gap-1" style={{ color: C.green }}>
                        <CheckCircle2 size={11}/> {configMsg}
                      </span>
                    )}
                    <div className="flex-1"/>
                    {/* Verify results inline chips */}
                    {verifyResults && (
                      <div className="flex items-center gap-1.5">
                        {Object.entries(verifyResults || {}).map(([pid, val]) => {
                          const available = val?.available ?? false;
                          return (
                            <span key={pid} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: available ? `${C.green}20` : `${C.red}20`,
                                    color: available ? C.green : C.red,
                                  }}>
                              {available ? "✓" : "✗"} {pid}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Mensajes ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
             style={{ scrollbarWidth:"thin", scrollbarColor:`${C.border} transparent` }}>

          {/* Sugerencias iniciales */}
          {chatHistory.length === 0 && (
            <div className="space-y-3 pt-1">
              {/* Bienvenida */}
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background:`linear-gradient(135deg, ${C.accent}44, ${C.accentL}22)`,
                              border:`1px solid ${C.accent}55` }}>
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
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] text-left transition-all hover:scale-[1.01]"
                          style={{ background: C.bgCard, color: C.textSec,
                                   border:`1px solid ${C.border}` }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent+"55"; e.currentTarget.style.background = C.bgHover; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>
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
        <div className="px-3 pt-2 pb-3 shrink-0 border-t" style={{ background: C.bgPanel, borderColor: C.border }}>
          {/* Input oculto para imagen */}
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                 style={{ display:"none" }}
                 onChange={e => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   if (file.size > 5 * 1024 * 1024) {
                     _emitToast({ id: ++_toastId, msg: "La imagen supera los 5 MB permitidos", type:"warning", duration:3000 });
                     return;
                   }
                   const reader = new FileReader();
                   reader.onload = ev => {
                     const dataUrl = ev.target.result;
                     setAttachedImage({ b64: dataUrl.split(",")[1], mime: file.type, preview: URL.createObjectURL(file) });
                   };
                   reader.readAsDataURL(file);
                   e.target.value = "";
                 }} />

          {/* Chip de archivo adjunto */}
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

          {/* Chip de imagen adjunta */}
          {attachedImage && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1 rounded-lg"
                 style={{ background:`${C.green}12`, border:`1px solid ${C.green}30` }}>
              <img src={attachedImage.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0"/>
              <span className="text-[10px] flex-1" style={{ color: C.green }}>Imagen adjunta</span>
              <button onClick={() => setAttachedImage(null)} style={{ color: C.textMuted }}
                      className="hover:brightness-150 shrink-0"><X size={10}/></button>
            </div>
          )}

          {/* Área de texto */}
          <div className="rounded-xl overflow-hidden"
               style={{ border:`1.5px solid ${C.borderFocus}`, background: C.bgInput }}>
            <textarea value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      onFocus={e => e.currentTarget.parentElement.style.borderColor = C.accent}
                      onBlur={e  => e.currentTarget.parentElement.style.borderColor = C.borderFocus}
                      disabled={chatLoading}
                      rows={2}
                      placeholder="Pregunta sobre tus archivos…"
                      className="w-full text-[11px] px-3 pt-2.5 pb-1 outline-none resize-none bg-transparent"
                      style={{ color: C.textPri, caretColor: C.accent, lineHeight:"1.6" }} />
            {/* Toolbar inferior del input */}
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px]" style={{ color: C.textMuted }}>↵ enviar · Shift+↵ línea</span>
                <button onClick={() => imageInputRef.current?.click()}
                        title="Adjuntar imagen (Gemini/Claude)"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all hover:brightness-110"
                        style={{ background: attachedImage ? `${C.green}20` : C.bgCard2,
                                 color: attachedImage ? C.green : C.textMuted,
                                 border:`1px solid ${attachedImage ? C.green+"40" : C.border}` }}>
                  <ImageIcon size={9}/> Imagen
                </button>
              </div>
              <button onClick={() => sendChat()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: chatInput.trim() ? C.accent : C.bgCard2,
                               color: chatInput.trim() ? "white" : C.textMuted }}>
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
          MODALES: HISTORIAL / COMPARADOR
      ════════════════════════════════════════════════════════ */}
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
          onAttach={(path) => { setSelectedPath(path); setShowRiskPanel(false); }}
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

      {/* Toast notifications */}
      <ToastContainer C={C} />

    </div>
  );
}
