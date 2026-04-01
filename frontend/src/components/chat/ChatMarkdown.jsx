import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { Maximize2, X, ChevronUp, ChevronDown, ExternalLink, Paperclip, Folder, FileText, ChevronRight, Clipboard } from "lucide-react";
import mermaid from "mermaid";
import { WIN_PATH_RE } from "../../utils/constants";
// ── MermaidLightbox: overlay de diagrama ampliado ────────────────────────────
function MermaidLightbox({ svg, onClose }) {
  const svgRef = useRef(null);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (svgRef.current && svg) {
      svgRef.current.innerHTML = svg;
    }
  }, [svg]);
  return (
    <div onClick={onClose}
         style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)",
                  display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
      <div onClick={e => e.stopPropagation()}
           style={{ maxWidth:"92vw", maxHeight:"88vh", overflow:"auto", background:"#0f0f1a",
                    borderRadius:"16px", padding:"24px", position:"relative",
                    border:"1px solid #4f46e5", cursor:"default" }}>
        <button onClick={onClose}
                style={{ position:"absolute", top:10, right:12, background:"none", border:"none",
                         color:"#a5b4fc", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        <div ref={svgRef}
             style={{ minWidth:"400px", display:"flex", justifyContent:"center" }} />
      </div>
    </div>
  );
}

// ── MermaidDiagram: renderiza un diagrama Mermaid en el chat ─────────────────
let _mermaidReady = false;
function ensureMermaid() {
  if (_mermaidReady) return;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict",
    themeVariables: { primaryColor: "#6366f1", primaryTextColor: "#e2e8f0",
      primaryBorderColor: "#4f46e5", lineColor: "#818cf8", background: "#0f0f1a",
      mainBkg: "#1a1a2e", nodeBorder: "#4f46e5", clusterBkg: "#1a1a2e",
      titleColor: "#a5b4fc", edgeLabelBackground: "#1a1a2e", fontFamily: "monospace" } });
  _mermaidReady = true;
}
let _mermaidCounter = 0;
const MermaidDiagram = memo(function MermaidDiagram({ code, C }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);
  const [svg, setSvg] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ensureMermaid();
    const id = `mermaid-render-${++_mermaidCounter}`;
    setError(null);
    document.getElementById(id)?.remove();
    mermaid.render(id, code.trim()).then(({ svg: s }) => {
      setSvg(s);
      if (ref.current) ref.current.innerHTML = s;
    }).catch(err => setError(String(err?.message || err)));
  }, [code]);

  const copyCode = () => {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (error) return (
    <pre className="rounded-lg text-[10px] p-3 my-1.5 overflow-x-auto font-mono leading-relaxed"
         style={{ background: C?.bgDark || "#0a0a12", color: "#f87171", border:`1px solid #f8717140` }}>
      {`[Mermaid error]\n${error}\n\n${code}`}
    </pre>
  );
  return (
    <>
      {lightbox && svg && <MermaidLightbox svg={svg} onClose={() => setLightbox(false)} />}
      <div className="my-2 rounded-xl overflow-hidden" style={{ border:`1px solid ${C?.border || "#2a2a40"}` }}>
        <div className="flex items-center justify-between px-3 py-1.5"
             style={{ background:"#0a0a18", borderBottom:`1px solid ${C?.border || "#2a2a40"}` }}>
          <span className="text-[9px] font-mono opacity-40">mermaid</span>
          <div className="flex gap-2">
            <button onClick={copyCode}
                    style={{ background: copied ? "#22c55e22" : "#ffffff0a", color: copied ? "#4ade80" : "#a5b4fc",
                             border:"none", cursor:"pointer", fontSize:10, padding:"2px 8px", borderRadius:4 }}>
              {copied ? "✓ copiado" : "copiar"}
            </button>
            <button onClick={() => setLightbox(true)}
                    style={{ background:"#ffffff0a", color:"#a5b4fc", border:"none",
                             cursor:"pointer", fontSize:10, padding:"2px 8px", borderRadius:4 }}>
              ⤢ ampliar
            </button>
          </div>
        </div>
        <div ref={ref} className="overflow-x-auto flex justify-center"
             style={{ background:"#0f0f1a", padding:"16px", minHeight:"60px",
                      cursor: svg ? "zoom-in" : "default" }}
             onClick={() => svg && setLightbox(true)} />
      </div>
    </>
  );
});

// ── CodeBlock: bloque de código estilo Claude Code con líneas numeradas ──────
function CodeBlock({ code, lang, C }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState(null);
  const lines = code.split("\n");

  const copyAll = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    });
  };
  const copyLine = (i, line) => {
    navigator.clipboard.writeText(line).then(() => {
      setCopiedLine(i);
      setTimeout(() => setCopiedLine(null), 1200);
    });
  };

  const bg     = "#0b0b14";
  const bgHov  = "#ffffff09";
  const border = C?.border || "#2a2a40";
  const accent = C?.accentL || "#a5b4fc";
  const green  = "#a0f0c0";

  return (
    <div className="my-2 rounded-xl overflow-hidden text-[11px] font-mono"
         style={{ border:`1px solid ${border}`, background: bg }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2"
           style={{ background:"#0d0d1c", borderBottom:`1px solid ${border}` }}>
        <div className="flex items-center gap-2">
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#ff5f57", display:"inline-block" }}/>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#febc2e", display:"inline-block" }}/>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#28c840", display:"inline-block" }}/>
          {lang && <span className="ml-2 text-[9px] opacity-40 font-mono">{lang}</span>}
        </div>
        <button onClick={copyAll}
                style={{ background: copiedAll ? "#22c55e18" : "transparent",
                         color: copiedAll ? "#4ade80" : accent, border:"none",
                         cursor:"pointer", fontSize:10, padding:"2px 10px",
                         borderRadius:6, transition:"all 0.15s" }}>
          {copiedAll ? "✓ copiado" : "copiar todo"}
        </button>
      </div>
      {/* lines */}
      <div className="overflow-x-auto" style={{ maxHeight: lines.length > 40 ? "480px" : "none", overflowY: lines.length > 40 ? "auto" : "visible" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}
                  onClick={() => copyLine(i, line)}
                  title="Click para copiar esta línea"
                  style={{ cursor:"pointer", background: copiedLine === i ? "#22c55e10" : "transparent",
                           transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = copiedLine === i ? "#22c55e10" : bgHov}
                  onMouseLeave={e => e.currentTarget.style.background = copiedLine === i ? "#22c55e10" : "transparent"}>
                <td style={{ color:"#ffffff20", textAlign:"right", paddingRight:12, paddingLeft:12,
                             userSelect:"none", width:1, whiteSpace:"nowrap", fontSize:10,
                             paddingTop:1, paddingBottom:1 }}>
                  {copiedLine === i ? "✓" : i + 1}
                </td>
                <td style={{ color: green, paddingRight:16, whiteSpace:"pre", paddingTop:1, paddingBottom:1 }}>
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ChatMarkdown: renderiza markdown estilo Claude Code ───────────────────────
const ChatMarkdown = memo(function ChatMarkdown({ text, C }) {
  const accent  = C?.accentL  || "#a5b4fc";
  const accent2 = C?.accent   || "#6366f1";
  const textSec = C?.textSec  || "#94a3b8";
  const bgInline = C?.bgCard2 || "#1a1a2e";

  // ── split en bloques de código (capturando lenguaje) ────────────────────
  const parts = [];
  const codeBlockRe = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", val: text.slice(last, m.index) });
    const lang = (m[1] || "").toLowerCase();
    parts.push({ type: lang === "mermaid" ? "mermaid" : "block", val: m[2].trimEnd(), lang });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", val: text.slice(last) });

  // ── inline: **bold**, `code`, *italic*, ~~strike~~ ──────────────────────
  function renderInline(str, keyPfx) {
    const segs = str.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*\n]+\*|~~[^~]+~~)/g);
    return segs.map((s, j) => {
      const k = `${keyPfx}-${j}`;
      if (s.startsWith("**") && s.endsWith("**") && s.length > 4)
        return <strong key={k} style={{ fontWeight:700, color:"#e2e8f0" }}>{s.slice(2,-2)}</strong>;
      if (s.startsWith("`") && s.endsWith("`") && s.length > 2)
        return (
          <code key={k} style={{ fontFamily:"monospace", fontSize:11, padding:"1px 6px",
                                  borderRadius:4, background: bgInline, color:"#a0f0c0",
                                  border:"1px solid #ffffff10" }}>
            {s.slice(1,-1)}
          </code>
        );
      if (s.startsWith("*") && s.endsWith("*") && s.length > 2)
        return <em key={k} style={{ fontStyle:"italic", color: textSec }}>{s.slice(1,-1)}</em>;
      if (s.startsWith("~~") && s.endsWith("~~") && s.length > 4)
        return <span key={k} style={{ textDecoration:"line-through", opacity:0.5 }}>{s.slice(2,-2)}</span>;
      return s;
    });
  }

  // ── bloque de texto: headers, listas, hr, párrafos ──────────────────────
  function renderTextBlock(val, blockIdx) {
    const lines = val.split("\n");
    const nodes = [];
    let listItems   = [];  // bullet list buffer
    let numItems    = [];  // numbered list buffer
    let tableRows   = [];  // table buffer

    const flushList = () => {
      if (listItems.length) {
        nodes.push(
          <ul key={`ul-${blockIdx}-${nodes.length}`}
              style={{ margin:"8px 0", padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:4 }}>
            {listItems.map((item, li) => (
              <li key={li} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, lineHeight:1.55 }}>
                <span style={{ marginTop:6, width:5, height:5, borderRadius:"50%", flexShrink:0,
                               background: accent, opacity:0.7 }}/>
                <span>{renderInline(item, `${blockIdx}-li-${li}`)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
      if (numItems.length) {
        nodes.push(
          <ol key={`ol-${blockIdx}-${nodes.length}`}
              style={{ margin:"8px 0", padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:3 }}>
            {numItems.map(({ n, text: t }, li) => (
              <li key={li} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, lineHeight:1.55 }}>
                <span style={{ flexShrink:0, fontVariantNumeric:"tabular-nums", fontSize:11,
                               color: accent, fontWeight:600, minWidth:18, textAlign:"right" }}>{n}.</span>
                <span>{renderInline(t, `${blockIdx}-ol-${li}`)}</span>
              </li>
            ))}
          </ol>
        );
        numItems = [];
      }
    };

    const flushTable = () => {
      if (!tableRows.length) return;
      const [header, , ...body] = tableRows; // skip separator row
      const cols = (header || []);
      nodes.push(
        <div key={`tbl-${blockIdx}-${nodes.length}`} style={{ overflowX:"auto", margin:"10px 0" }}>
          <table style={{ borderCollapse:"collapse", fontSize:11, width:"100%" }}>
            <thead>
              <tr>
                {cols.map((c, ci) => (
                  <th key={ci} style={{ padding:"4px 12px", textAlign:"left", color: accent,
                                        borderBottom:`1px solid ${C?.border || "#2a2a40"}`,
                                        fontWeight:600, whiteSpace:"nowrap" }}>
                    {renderInline(c.trim(), `th-${blockIdx}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} style={{ borderBottom:`1px solid #ffffff08` }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding:"3px 12px", color:"#cbd5e1", verticalAlign:"top" }}>
                      {renderInline(cell.trim(), `td-${blockIdx}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    };

    lines.forEach((line, li) => {
      const trimmed = line.trim();

      // tabla markdown |col|col|
      if (trimmed.startsWith("|")) {
        flushList();
        const cells = trimmed.split("|").slice(1,-1);
        tableRows.push(cells);
        return;
      } else if (tableRows.length) { flushTable(); }

      if (!trimmed) { flushList(); nodes.push(<div key={`sp-${blockIdx}-${li}`} style={{ height:6 }}/>); return; }

      // separador ---
      if (/^[-*_]{3,}$/.test(trimmed)) {
        flushList();
        nodes.push(<hr key={`hr-${blockIdx}-${li}`} style={{ border:"none", borderTop:`1px solid ${C?.border || "#2a2a40"}`, margin:"10px 0", opacity:0.5 }}/>);
        return;
      }

      // H1 #
      if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
        flushList();
        nodes.push(
          <div key={`h1-${blockIdx}-${li}`}
               style={{ fontSize:15, fontWeight:700, color:"#e2e8f0", margin:"14px 0 6px",
                        paddingBottom:6, borderBottom:`1px solid ${C?.border || "#2a2a40"}` }}>
            {renderInline(trimmed.slice(2), `h1-${blockIdx}-${li}`)}
          </div>
        );
        return;
      }
      // H2 ##
      if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
        flushList();
        nodes.push(
          <div key={`h2-${blockIdx}-${li}`}
               style={{ fontSize:13, fontWeight:700, color: accent2, margin:"12px 0 4px",
                        display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:3, height:14, borderRadius:2, background: accent2, flexShrink:0 }}/>
            {renderInline(trimmed.slice(3), `h2-${blockIdx}-${li}`)}
          </div>
        );
        return;
      }
      // H3 ###
      if (trimmed.startsWith("### ")) {
        flushList();
        nodes.push(
          <div key={`h3-${blockIdx}-${li}`}
               style={{ fontSize:12, fontWeight:600, color: accent, margin:"8px 0 2px" }}>
            {renderInline(trimmed.slice(4), `h3-${blockIdx}-${li}`)}
          </div>
        );
        return;
      }

      // bullet list
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
        numItems.length && flushList();
        listItems.push(trimmed.slice(2));
        return;
      }
      // numbered list
      const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
      if (numMatch) {
        listItems.length && flushList();
        numItems.push({ n: numMatch[1], text: numMatch[2] });
        return;
      }

      // blockquote >
      if (trimmed.startsWith("> ")) {
        flushList();
        nodes.push(
          <div key={`bq-${blockIdx}-${li}`}
               style={{ borderLeft:`3px solid ${accent}`, paddingLeft:12, margin:"4px 0",
                        color: textSec, fontSize:12, fontStyle:"italic" }}>
            {renderInline(trimmed.slice(2), `bq-${blockIdx}-${li}`)}
          </div>
        );
        return;
      }

      // párrafo
      flushList();
      nodes.push(
        <p key={`p-${blockIdx}-${li}`}
           style={{ fontSize:12, lineHeight:1.6, margin:"2px 0", color:"#cbd5e1" }}>
          {renderInline(trimmed, `p-${blockIdx}-${li}`)}
        </p>
      );
    });
    flushList();
    flushTable();
    return nodes;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
      {parts.map((p, i) => {
        if (p.type === "mermaid") return <MermaidDiagram key={i} code={p.val} C={C} />;
        if (p.type === "block")   return <CodeBlock key={i} code={p.val} lang={p.lang} C={C} />;
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
export { MermaidLightbox, ensureMermaid, MermaidDiagram, CodeBlock, ChatMarkdown, TypingDots, ChatActionBar };
