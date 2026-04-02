import React, { useState } from 'react';

import { EyeOff, Eye, Search, RefreshCw, Zap, CheckCircle2, Loader2, Save, X, Key, Cpu, Sliders, Palette, Link2, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { THEMES, PROVIDERS, APP_VERSION, MODEL_INFO, KNOWN_MODELS } from '../../utils/constants';

export const SettingsModal = ({
  showSettings, setShowSettings,
  apiKeys, setApiKeys,
  showKeys, setShowKeys,
  provider, setProvider,
  fetchOllamaModels, ollamaModels, ollamaLoading,
  config, savingConfig, configMsg,
  testingProvider, testResults, saveConfig, testProvider,
  C, themeId, setTheme,
  settingsTab, setSettingsTab,
  modelSearch, setModelSearch,
  modelInputs, setModelInputs,
  temperature, setTemperature,
  maxTokens, setMaxTokens,
}) => {
  const [openDoc, setOpenDoc] = useState(null);
  if (!showSettings) return null;

  return (
    <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md fade-in" onClick={() => setShowSettings(false)} />

            {/* Modal */}
<div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden flex glass-surface"
             style={{
               top:"50%", left:"50%", transform:"translate(-50%,-50%)",
               width: 580, maxHeight: "80vh",
               border:`1px solid ${C.border}`,
                 }}>

              {/* ── Sidebar ── */}
              <div className="flex flex-col w-40 shrink-0 border-r glass-panel" style={{  borderColor: C.border }}>
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
                    { id:"keys",   Icon: Key,      label:"API Keys"     },
                    { id:"models", Icon: Cpu,      label:"Modelos"      },
                    { id:"params", Icon: Sliders,  label:"Parámetros"   },
                    { id:"theme",  Icon: Palette,  label:"Tema"         },
                    { id:"docs",   Icon: BookOpen, label:"Documentación" },
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
                <div className="px-5 py-3 border-b shrink-0 glass-panel" style={{  borderColor: C.border }}>
                  <h2 className="text-sm font-semibold" style={{ color: C.textPri }}>
                    { settingsTab==="keys"   ? "API Keys"
                    : settingsTab==="models" ? "Modelos de IA"
                    : settingsTab==="params" ? "Parámetros del chat"
                    : settingsTab==="docs"   ? "Documentación"
                    : "Tema visual" }
                  </h2>
                  <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                    { settingsTab==="keys"   ? "Las claves se guardan localmente en %APPDATA%\\DiskAnalyzer"
                    : settingsTab==="models" ? "Selecciona el modelo a usar para cada proveedor"
                    : settingsTab==="params" ? "Controla la creatividad y longitud de las respuestas"
                    : settingsTab==="docs"   ? "Guías y recursos para usar la aplicación"
                    : "Cambia la apariencia de la interfaz" }
                  </p>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* ── Keys tab ── */}
                  {settingsTab === "keys" && (() => {
                    const KEY_DEFS = [
                      { id:"GEMINI_API_KEY",    provId:"gemini", label:"Google Gemini",    ph:"AIza…",    hasKey:"has_gemini_key",    color: C.blue   },
                      { id:"ANTHROPIC_API_KEY", provId:"claude", label:"Anthropic Claude", ph:"sk-ant-…", hasKey:"has_anthropic_key", color: C.amber  },
                      { id:"GROQ_API_KEY",      provId:"groq",   label:"Groq",             ph:"gsk_…",    hasKey:"has_groq_key",      color: C.purple },
                    ];
                    return (
                      <div className="space-y-4">
                        {KEY_DEFS.map(({ id, provId, label, ph, hasKey, color }) => {
                          const res     = testResults?.[provId];
                          const testing = testingProvider === provId;
                          return (
                          <div key={id} className="glass-card rounded-lg p-3" style={{ border:`1px solid ${C.border}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: color }}/>
                                <span className="text-xs font-semibold" style={{ color: C.textPri }}>{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                      style={{
                                        background: config[hasKey] ? `${C.green}20` : `${C.textMuted}15`,
                                        color: config[hasKey] ? C.green : C.textMuted,
                                      }}>
                                  {config[hasKey] ? "✓ Configurada" : "Sin configurar"}
                                </span>
                                <button
                                  onClick={() => testProvider(provId)}
                                  disabled={testing || testingProvider !== null}
                                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all hover:brightness-125 disabled:opacity-40"
                                  style={{ background:`${color}20`, color, border:`1px solid ${color}40` }}>
                                  {testing
                                    ? <><Loader2 size={9} className="animate-spin"/> Probando…</>
                                    : <><Zap size={9}/> Probar</>}
                                </button>
                              </div>
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
                            {/* Resultado del test */}
                            {res !== undefined && res !== null && (
                              <div className="mt-2 px-2 py-1.5 rounded-lg text-[10px] flex items-start gap-1.5"
                                   style={{
                                     background: res.ok ? `${C.green}15` : `${C.red}15`,
                                     border: `1px solid ${res.ok ? C.green : C.red}30`,
                                   }}>
                                <span style={{ color: res.ok ? C.green : C.red }}>{res.ok ? "✓" : "✗"}</span>
                                <span style={{ color: res.ok ? C.green : C.red }}>
                                  {res.ok ? `Respuesta: "${res.response}"` : res.error}
                                </span>
                              </div>
                            )}
                          </div>
                          );
                        })}
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
                            <div key={id} className="rounded-xl overflow-hidden glass-card" style={{ border:`1px solid ${C.border}` }}>

                              {/* Header */}
                              <div className="flex items-center gap-3 px-4 py-2.5 border-b glass-card" style={{ borderColor: C.border }}>
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
                                            <span key={t} className="text-[8px] px-1 rounded glass-card" style={{ color: C.textMuted }}>{t}</span>
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
                        <div className="rounded-xl overflow-hidden glass-card" style={{ border:`1px solid ${C.border}` }}>
                          <div className="flex items-center gap-3 px-4 py-2.5 border-b glass-card" style={{ borderColor: C.border }}>
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
                      <div className="glass-card rounded-lg p-3" style={{ border:`1px solid ${C.border}` }}>
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
                      <div className="glass-card rounded-lg p-3" style={{ border:`1px solid ${C.border}` }}>
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
                      <div className="glass-card rounded-lg p-3" style={{ border:`1px solid ${C.border}` }}>
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

                  {/* ── Docs tab ── */}
                  {settingsTab === "docs" && (() => {
                    const DOCS = [
                      {
                        id: "usage",
                        Icon: BookOpen,
                        title: "Cómo usar la aplicación",
                        subtitle: "Guía completa de características y funcionalidades",
                        color: C.blue,
                        sections: [
                          {
                            heading: "1. Escanear una carpeta",
                            body: "Haz clic en «Seleccionar carpeta» o arrastra una carpeta a la ventana. El escáner recorre todos los subdirectorios y muestra el uso de disco en tiempo real.",
                          },
                          {
                            heading: "2. Explorar los resultados",
                            body: "La tabla muestra archivos ordenables por nombre, tamaño, tipo y fecha. Usa los filtros de tamaño y categoría para acotar la búsqueda. Haz doble clic en una carpeta para entrar en ella.",
                          },
                          {
                            heading: "3. Visualizaciones",
                            body: "El panel de gráficos incluye un treemap interactivo, un histograma de distribución por tamaño y una línea de tiempo. Pasa el cursor sobre cada elemento para ver el detalle.",
                          },
                          {
                            heading: "4. Chat con IA",
                            body: "Abre el panel de chat y pregunta al asistente sobre los archivos escaneados. El modelo recibe contexto del escaneo actual para darte recomendaciones de limpieza.",
                          },
                          {
                            heading: "5. Limpiador de temporales",
                            body: "Accede desde el menú de herramientas. Detecta carpetas de caché del sistema, temporales de aplicaciones y archivos de log. Revisa la lista antes de eliminar.",
                          },
                          {
                            heading: "6. Historial de escaneos",
                            body: "Cada escaneo se guarda automáticamente (máx. 10 entradas). Puedes comparar tamaños entre escaneos pasados o re-escanear una ruta con un clic.",
                          },
                        ],
                      },
                      {
                        id: "apikeys",
                        Icon: Key,
                        title: "Configurar claves de API",
                        subtitle: "Cómo obtener y configurar claves para los proveedores de IA",
                        color: C.amber,
                        sections: [
                          {
                            heading: "Google Gemini",
                            body: "Ve a aistudio.google.com → «Get API key» → «Create API key». Copia la clave (empieza por AIza…) y pégala en Ajustes › API Keys › Google Gemini.",
                            link: "https://aistudio.google.com/app/apikey",
                            linkLabel: "aistudio.google.com",
                          },
                          {
                            heading: "Anthropic Claude",
                            body: "Entra en console.anthropic.com → «API Keys» → «Create Key». La clave empieza por sk-ant-… Pégala en Ajustes › API Keys › Anthropic Claude.",
                            link: "https://console.anthropic.com/settings/keys",
                            linkLabel: "console.anthropic.com",
                          },
                          {
                            heading: "Groq",
                            body: "Accede a console.groq.com → «API Keys» → «Create API Key». La clave empieza por gsk_… Pégala en Ajustes › API Keys › Groq.",
                            link: "https://console.groq.com/keys",
                            linkLabel: "console.groq.com",
                          },
                          {
                            heading: "Ollama (local, sin clave)",
                            body: "Descarga e instala Ollama desde ollama.com. Ejecuta «ollama pull llama3.2» en la terminal. En Ajustes › Modelos › Ollama pulsa «Detectar» para auto-descubrir los modelos instalados.",
                            link: "https://ollama.com/download",
                            linkLabel: "ollama.com/download",
                          },
                          {
                            heading: "¿Dónde se guardan las claves?",
                            body: "Las claves se almacenan únicamente en tu equipo en %APPDATA%\\DiskAnalyzer\\api_keys.json y nunca se envían a ningún servidor externo.",
                          },
                        ],
                      },
                    ];

                    return (
                      <div className="space-y-3">
                        {DOCS.map(({ id, Icon: DocIcon, title, subtitle, color, sections }) => {
                          const isOpen = openDoc === id;
                          return (
                            <div key={id} className="rounded-xl overflow-hidden glass-card" style={{ border:`1px solid ${C.border}` }}>
                              {/* Header button */}
                              <button
                                onClick={() => setOpenDoc(isOpen ? null : id)}
                                className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:brightness-110 text-left"
                                style={{ background: isOpen ? `${color}12` : "transparent" }}
                              >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                     style={{ background:`${color}25`, color }}>
                                  <DocIcon size={14}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold" style={{ color: C.textPri }}>{title}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{subtitle}</p>
                                </div>
                                {isOpen ? <ChevronUp size={13} style={{ color: C.textMuted }}/> : <ChevronDown size={13} style={{ color: C.textMuted }}/>}
                              </button>

                              {/* Expandable content */}
                              {isOpen && (
                                <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: C.border }}>
                                  {sections.map((s, i) => (
                                    <div key={i}>
                                      <p className="text-[11px] font-semibold mb-0.5" style={{ color }}>{s.heading}</p>
                                      <p className="text-[10px] leading-relaxed" style={{ color: C.textSec }}>{s.body}</p>
                                      {s.link && (
                                        <a href={s.link} target="_blank" rel="noreferrer"
                                           className="inline-flex items-center gap-1 mt-1 text-[10px] hover:underline"
                                           style={{ color: C.accentL }}>
                                          <ExternalLink size={9}/>{s.linkLabel}
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

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
                {settingsTab !== "theme" && settingsTab !== "docs" && (
                  <div className="px-5 py-3 border-t shrink-0 flex items-center gap-3 glass-panel" style={{ borderColor: C.border }}>
                    <button onClick={saveConfig} disabled={savingConfig}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: C.accent, color:"white" }}>
                      {savingConfig ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                      Guardar cambios
                    </button>
                    {configMsg && (
                      <span className="text-xs flex items-center gap-1" style={{ color: C.green }}>
                        <CheckCircle2 size={11}/> {configMsg}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
    </>
  );
};
