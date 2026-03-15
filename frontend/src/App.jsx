import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  Play, Square, FolderOpen, HardDrive, Search,
  MessageSquare, X, Send, Bot, User, Loader2,
  AlertCircle, CheckCircle2, Folder, Settings,
  ChevronUp, ChevronDown, ChevronsUpDown,
  FileText, Film, Image, Music, Archive, Database, Code, Clock,
  AlertTriangle, BarChart2,
  Key, Cpu, Sliders, Palette, Eye, EyeOff, RefreshCw, Save, Zap
} from "lucide-react";

const API = "http://127.0.0.1:8000";

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
};

const _savedTheme = localStorage.getItem("da-theme") || "logo-neon";

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
      let pendingChunk = "";
      let flushId = null;
      const flushChunk = () => {
        flushId = null;
        if (!pendingChunk) return;
        const toFlush = pendingChunk;
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
          if (raw === "[DONE]") { flushChunk(); return; }
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
              {/* Botón limpiar historial */}
              <button onClick={() => { setChatHistory([]); setChatError(""); }}
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
            <span className="ml-auto text-[9px] font-mono shrink-0" style={{ color: C.textMuted }}>
              t={temperature.toFixed(1)} · {maxTokens}tk
            </span>
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
                  <span className="text-[9px] font-mono" style={{ color: C.textMuted }}>v0.2.2</span>
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
                    {msg.content
                      ? <ChatMarkdown text={msg.content} C={C} />
                      : <span className="flex items-center gap-2 py-0.5" style={{ color: C.textMuted }}>
                          <TypingDots />
                        </span>
                    }
                  </div>
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
              <span className="text-[9px]" style={{ color: C.textMuted }}>↵ enviar · Shift+↵ nueva línea</span>
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
