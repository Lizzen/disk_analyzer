import {
  Film, Image, Music, FileText, Archive, Clock, Code, Database
} from "lucide-react";

export const API = "http://127.0.0.1:8000";
export const APP_VERSION = import.meta.env?.VITE_APP_VERSION ?? "1.0.1";

// ── Constantes de chat ─────────────────────────────────────────────────────────
export const CHAT_HISTORY_KEY  = "da-chat-history-v1";
export const CHAT_MAX_PERSIST  = 60;
export const CHAT_MAX_MEMORY   = 100; // máximo de mensajes en memoria durante la sesión
export const FAVORITES_KEY     = "da-favorites-v1";    // rutas favoritas
export const SCAN_HISTORY_KEY  = "da-scan-history-v1"; // historial de escaneos
export const SCAN_HISTORY_MAX  = 10;                   // máximo de escaneos guardados
// Regexp para detectar rutas Windows absolutas en texto del asistente
export const WIN_PATH_RE = /[A-Za-z]:\\(?:[^\s<>"'|?*\n\\]+\\)*[^\s<>"'|?*\n\\]*/g;

// ── Themes ────────────────────────────────────────────────────────────────────
export const THEMES = {
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

export const _savedTheme = localStorage.getItem("da-theme") || "dark-void";

// Colores fijos de categoría — independientes del tema
export const CAT_COLORS = {
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

export const CAT_ICONS = {
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

export const CATEGORIES = Object.keys(CAT_COLORS);

export const PROVIDERS = [
  { id: "gemini", label: "Google Gemini" },
  { id: "groq",   label: "Groq (Llama)"  },
  { id: "claude", label: "Claude"        },
  { id: "ollama", label: "Ollama Local"  },
];

// Modelos con metadatos completos
export const MODEL_INFO = {
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

export const KNOWN_MODELS = {
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

export const SIZE_FILTERS = [
  { label: "Todo",     min: 0                    },
  { label: "> 1 MB",   min: 1024**2              },
  { label: "> 10 MB",  min: 10*1024**2           },
  { label: "> 100 MB", min: 100*1024**2          },
  { label: "> 500 MB", min: 500*1024**2          },
  { label: "> 1 GB",   min: 1024**3              },
];
