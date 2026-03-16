import sys

filepath = r"C:/Users/Deiviss/Desktop/disk_analyzer/frontend/src/App.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "// \u2500\u2500 SysInfoModal"
end_marker   = "// \u2500\u2500 Componente principal"

start_idx = content.find(start_marker)
end_idx   = content.find(end_marker)

if start_idx == -1:
    raise RuntimeError("Start marker not found")
if end_idx == -1:
    raise RuntimeError("End marker not found")

print(f"Start at char {start_idx}, end at char {end_idx}")

new_component = """\
// \u2500\u2500 SysInfoModal (Task Manager) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const SysInfoModal = React.memo(function SysInfoModal({ onClose, C }) {
  const [loading, setLoading]   = useState(true);
  const [data,    setData]      = useState(null);
  const [error,   setError]     = useState("");
  const [diskData,setDiskData]  = useState(null);
  const [procs,   setProcs]     = useState([]);
  const [tab,     setTab]       = useState("processes");
  const [procSearch, setProcSearch] = useState("");
  const [procSort,   setProcSort]   = useState("mem");

  const fetchSys   = () => fetch(`${API}/api/system-info`).then(r=>r.json()).then(d=>{ if(d.ok) setData(d); }).catch(()=>{});
  const fetchDisk  = () => fetch(`${API}/api/disk-health`).then(r=>r.json()).then(d=>{ if(d.ok) setDiskData(d); }).catch(()=>{});
  const fetchProcs = () => fetch(`${API}/api/processes`).then(r=>r.json()).then(d=>{ if(d.ok) setProcs(d.processes||[]); }).catch(()=>{});

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/system-info`).then(r=>r.json()),
      fetch(`${API}/api/disk-health`).then(r=>r.json()),
      fetch(`${API}/api/processes`).then(r=>r.json()),
    ]).then(([sys,disk,p]) => {
      if(sys.ok) setData(sys); else setError(sys.error||"Error");
      if(disk.ok) setDiskData(disk);
      if(p.ok) setProcs(p.processes||[]);
    }).catch(e=>setError(e.message)).finally(()=>setLoading(false));

    const sysT  = setInterval(fetchSys,   2000);
    const diskT = setInterval(fetchDisk,  30000);
    const procT = setInterval(fetchProcs, 2000);
    return () => { clearInterval(sysT); clearInterval(diskT); clearInterval(procT); };
  }, []);

  const lc = (p) => p > 85 ? C.red : p > 60 ? C.amber : C.green;
  const tc = (t) => t >= 75 ? C.red : t >= 55 ? C.amber : C.green;
  const hc = (h) => h?.toLowerCase() === "good" ? C.green : h?.toLowerCase() === "caution" ? C.amber : h?.toLowerCase() === "bad" ? C.red : C.textMuted;

  const Bar = ({ pct, color, h = "h-1.5" }) => (
    <div className={`w-full ${h} rounded-full overflow-hidden`} style={{ background: C.diskTrack }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct??0,100)}%`, background: color }}/>
    </div>
  );

  const fmtUptime = (sec) => {
    if (!sec) return "\u2014";
    const d=Math.floor(sec/86400), h=Math.floor((sec%86400)/3600), m=Math.floor((sec%3600)/60);
    return [d&&`${d}d`,h&&`${h}h`,`${m}m`].filter(Boolean).join(" ");
  };

  const StatRow = ({ label, value }) => (
    <div className="flex items-baseline gap-2 py-1.5" style={{ borderBottom:`1px solid ${C.border}44` }}>
      <span className="text-[10px] font-medium w-32 shrink-0" style={{ color:C.textMuted }}>{label}</span>
      <span className="text-[11px] font-mono flex-1 break-all" style={{ color:C.textSec }}>{value||"\u2014"}</span>
    </div>
  );

  const TABS = [
    { id:"processes", label:"Procesos",       Icon: Activity    },
    { id:"cpu",       label:"CPU",             Icon: Cpu         },
    { id:"memory",    label:"Memoria",         Icon: MemoryStick },
    { id:"storage",   label:"Almacenamiento",  Icon: HardDrive   },
    { id:"overview",  label:"Sistema",         Icon: Monitor     },
  ];

  const { machine, cpu, ram, gpus } = data || {};

  const filteredProcs = procs
    .filter(p => p.name.toLowerCase().includes(procSearch.toLowerCase()))
    .sort((a,b) => procSort==="cpu" ? b.cpu-a.cpu : procSort==="name" ? a.name.localeCompare(b.name) : b.mem-a.mem)
    .slice(0, 100);

  const totalMem = ram?.total || 1;
  const cpuLoad  = cpu?.load_pct ?? 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ background:"rgba(0,0,0,0.75)" }}
         onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rounded-2xl overflow-hidden flex flex-col shadow-2xl"
           style={{ background:C.bgCard, border:`1px solid ${C.border}`, width:860, maxHeight:"92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
             style={{ background:C.bgSurface, borderBottom:`1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <Activity size={14} style={{ color:C.accentL }}/>
            <span className="text-sm font-semibold" style={{ color:C.textPri }}>Administrador de tareas</span>
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background:`${C.green}20`, color:C.green }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:C.green }}/>LIVE
            </span>
          </div>
          {!loading && cpu && ram && (
            <div className="flex items-center gap-4 mr-4">
              <div className="flex items-center gap-1.5">
                <Cpu size={10} style={{ color:C.textMuted }}/>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:C.diskTrack }}>
                  <div className="h-full rounded-full" style={{ width:`${cpuLoad}%`, background:lc(cpuLoad) }}/>
                </div>
                <span className="text-[9px] font-mono w-7 text-right" style={{ color:lc(cpuLoad) }}>{cpuLoad}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MemoryStick size={10} style={{ color:C.textMuted }}/>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background:C.diskTrack }}>
                  <div className="h-full rounded-full" style={{ width:`${ram.pct}%`, background:lc(ram.pct) }}/>
                </div>
                <span className="text-[9px] font-mono w-7 text-right" style={{ color:lc(ram.pct) }}>{ram.pct}%</span>
              </div>
            </div>
          )}
          <button onClick={onClose} style={{ color:C.textMuted }} className="hover:brightness-150 transition-all"><X size={15}/></button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 px-1 pt-1 gap-0.5"
             style={{ background:C.bgSurface, borderBottom:`1px solid ${C.border}` }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = tab===id;
            return (
              <button key={id} onClick={()=>setTab(id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-all"
                      style={{
                        color:        active ? C.accentL  : C.textMuted,
                        background:   active ? C.bgCard   : "transparent",
                        borderBottom: active ? `2px solid ${C.accentL}` : "2px solid transparent",
                      }}>
                <Icon size={11}/>{label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && (
            <div className="flex items-center justify-center py-20 gap-3 flex-1" style={{ color:C.textMuted }}>
              <Loader2 size={20} className="animate-spin"/> Cargando\u2026
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 flex-1" style={{ color:C.red }}>
              <AlertCircle size={28}/><p className="text-sm">{error}</p>
            </div>
          )}

          {/* PROCESOS */}
          {!loading && tab==="processes" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 shrink-0"
                   style={{ background:C.bgCard2, borderBottom:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1 rounded-lg"
                     style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
                  <Search size={11} style={{ color:C.textMuted }}/>
                  <input value={procSearch} onChange={e=>setProcSearch(e.target.value)}
                         placeholder="Buscar proceso\u2026"
                         className="bg-transparent outline-none text-xs flex-1"
                         style={{ color:C.textPri }}/>
                </div>
                <span className="text-[10px]" style={{ color:C.textMuted }}>{filteredProcs.length} procesos</span>
                {[["mem","RAM"],["cpu","CPU"],["name","Nombre"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setProcSort(k)}
                          className="text-[9px] px-2 py-0.5 rounded font-medium transition-all"
                          style={{ background:procSort===k?`${C.accentL}25`:"transparent", color:procSort===k?C.accentL:C.textMuted, border:`1px solid ${procSort===k?C.accentL+"44":C.border}` }}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
                   style={{ gridTemplateColumns:"1fr 80px 80px 60px 120px", color:C.textMuted, borderBottom:`1px solid ${C.border}`, background:C.bgCard2 }}>
                <span>Nombre</span>
                <span className="text-right">CPU</span>
                <span className="text-right">RAM</span>
                <span className="text-right">PID</span>
                <span className="text-right">Usuario</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredProcs.map((p, i) => {
                  const cpuColor = p.cpu > 20 ? C.red : p.cpu > 5 ? C.amber : C.textMuted;
                  const memPct   = (p.mem / totalMem) * 100;
                  const memColor = memPct > 10 ? C.red : memPct > 3 ? C.amber : C.textMuted;
                  return (
                    <div key={p.pid}
                         className="grid items-center px-4 py-1 hover:brightness-110 transition-all"
                         style={{ gridTemplateColumns:"1fr 80px 80px 60px 120px", background: i%2===0 ? "transparent" : `${C.bgCard2}66`, borderBottom:`1px solid ${C.border}18` }}>
                      <span className="text-[11px] truncate font-medium" style={{ color:C.textPri }}>{p.name}</span>
                      <div className="flex items-center justify-end gap-1.5">
                        {p.cpu > 0.5 && <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background:C.diskTrack }}><div className="h-full rounded-full" style={{ width:`${Math.min(p.cpu*2,100)}%`, background:cpuColor }}/></div>}
                        <span className="text-[10px] font-mono w-8 text-right" style={{ color:cpuColor }}>{p.cpu > 0 ? `${p.cpu}%` : "\u2014"}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        {p.mem > 10*1024*1024 && <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background:C.diskTrack }}><div className="h-full rounded-full" style={{ width:`${Math.min(memPct*10,100)}%`, background:memColor }}/></div>}
                        <span className="text-[10px] font-mono w-14 text-right" style={{ color:memColor }}>{fmtSize(p.mem)}</span>
                      </div>
                      <span className="text-[10px] font-mono text-right" style={{ color:C.textMuted }}>{p.pid}</span>
                      <span className="text-[9px] truncate text-right" style={{ color:C.textMuted }}>{p.user?.split("\\\\").pop()||"\u2014"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CPU */}
          {!loading && data && tab==="cpu" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                <p className="text-sm font-semibold mb-1" style={{ color:C.textPri }}>{cpu.name}</p>
                <p className="text-[10px] mb-4" style={{ color:C.textMuted }}>{cpu.cores} n\u00facleos \u00b7 {cpu.threads} hilos \u00b7 {cpu.max_mhz} MHz m\u00e1x</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color:C.textMuted }}>Carga global</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color:lc(cpu.load_pct) }}>{cpu.load_pct}%</span>
                </div>
                <Bar pct={cpu.load_pct} color={lc(cpu.load_pct)} h="h-2.5"/>
                {cpu.temperature != null && (
                  <div className="flex items-center gap-2 mt-3">
                    <Thermometer size={12} style={{ color:tc(cpu.temperature) }}/>
                    <span className="text-[10px]" style={{ color:C.textMuted }}>Temperatura</span>
                    <span className="text-sm font-mono font-bold ml-auto" style={{ color:tc(cpu.temperature) }}>{cpu.temperature}\u00b0C</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px]" style={{ color:C.textMuted }}>Frecuencia actual</span>
                  <span className="text-[11px] font-mono ml-auto" style={{ color:C.textSec }}>{cpu.current_mhz} MHz</span>
                </div>
              </div>
              {cpu.per_core_pct?.length > 0 && (
                <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color:C.textMuted }}>Carga por n\u00facleo</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns:`repeat(${Math.min(cpu.per_core_pct.length,8)},1fr)` }}>
                    {cpu.per_core_pct.map((p,i)=>(
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-[9px]" style={{ color:C.textMuted }}>C{i+1}</span>
                        <div className="w-full rounded overflow-hidden flex flex-col justify-end" style={{ height:56, background:C.diskTrack }}>
                          <div className="w-full transition-all duration-300" style={{ height:`${p}%`, background:lc(p), minHeight:p>0?2:0 }}/>
                        </div>
                        <span className="text-[9px] font-mono" style={{ color:lc(p) }}>{p}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {gpus?.map((g,i)=>(
                <div key={i} className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} style={{ color:C.accentL }}/>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:C.textMuted }}>GPU {gpus.length>1?i+1:""}</span>
                    </div>
                    {g.utilization_pct!=null && <span className="text-sm font-bold font-mono" style={{ color:lc(g.utilization_pct) }}>{g.utilization_pct}%</span>}
                  </div>
                  <p className="text-[11px] font-medium mb-2 truncate" style={{ color:C.textPri }}>{g.name}</p>
                  {g.utilization_pct!=null && <Bar pct={g.utilization_pct} color={lc(g.utilization_pct)} h="h-2"/>}
                  <div className="flex gap-4 mt-2 flex-wrap items-center">
                    {g.temperature!=null && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={11} style={{ color:tc(g.temperature) }}/>
                        <span className="text-[11px] font-mono font-bold" style={{ color:tc(g.temperature) }}>{g.temperature}\u00b0C</span>
                      </div>
                    )}
                    {g.vram_bytes>0 && <span className="text-[9px]" style={{ color:C.textMuted }}>VRAM <span className="font-mono" style={{ color:C.textSec }}>{fmtSize(g.vram_bytes)}</span></span>}
                    {g.vram_used_bytes!=null && <span className="text-[9px]" style={{ color:C.textMuted }}>Usada <span className="font-mono" style={{ color:C.textSec }}>{fmtSize(g.vram_used_bytes)}</span></span>}
                    {g.resolution && <span className="text-[9px]" style={{ color:C.textMuted }}>Res <span className="font-mono" style={{ color:C.textSec }}>{g.resolution}</span></span>}
                    {g.driver && <span className="text-[9px]" style={{ color:C.textMuted }}>Driver <span className="font-mono" style={{ color:C.textSec }}>{g.driver}</span></span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MEMORIA */}
          {!loading && data && tab==="memory" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:C.textMuted }}>Uso de RAM</span>
                  <span className="text-sm font-bold font-mono" style={{ color:lc(ram.pct) }}>{ram.pct}%</span>
                </div>
                <Bar pct={ram.pct} color={lc(ram.pct)} h="h-3"/>
                <div className="flex justify-between mt-2 text-[10px]" style={{ color:C.textMuted }}>
                  <span>Usada: <span className="font-mono" style={{ color:C.textSec }}>{fmtSize(ram.used)}</span></span>
                  <span>Libre: <span className="font-mono" style={{ color:C.green }}>{fmtSize(ram.available)}</span></span>
                  <span>Total: <span className="font-mono" style={{ color:C.textSec }}>{fmtSize(ram.total)}</span></span>
                </div>
              </div>
              {ram.slots?.length>0 && (
                <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color:C.textMuted }}>M\u00f3dulos instalados</p>
                  <div className="grid grid-cols-2 gap-3">
                    {ram.slots.map((s,i)=>(
                      <div key={i} className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold uppercase" style={{ color:C.accentL }}>Slot {i+1}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.accent}20`, color:C.textMuted }}>{s.type}</span>
                        </div>
                        <p className="text-base font-bold font-mono" style={{ color:C.textPri }}>{fmtSize(s.capacity)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color:C.textMuted }}>{s.speed_mhz?`${s.speed_mhz} MHz \u00b7 `:""}{s.manufacturer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {gpus?.some(g=>g.vram_bytes>0) && (
                <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color:C.textMuted }}>VRAM</p>
                  {gpus.filter(g=>g.vram_bytes>0).map((g,i)=>{
                    const vp=g.vram_used_bytes&&g.vram_bytes?Math.round(g.vram_used_bytes/g.vram_bytes*100):null;
                    return (
                      <div key={i} className={i>0?"mt-3":""}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] truncate" style={{ color:C.textPri }}>{g.name}</span>
                          <span className="text-[10px] font-mono ml-2 shrink-0" style={{ color:C.textMuted }}>{g.vram_used_bytes?`${fmtSize(g.vram_used_bytes)} / `:""}{fmtSize(g.vram_bytes)}</span>
                        </div>
                        {vp!=null && <Bar pct={vp} color={lc(vp)}/>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ALMACENAMIENTO */}
          {!loading && tab==="storage" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!diskData?.disks?.length && (
                <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color:C.textMuted }}>
                  <HardDrive size={28} className="opacity-30"/>
                  <p className="text-sm">No se detectaron discos</p>
                </div>
              )}
              {diskData?.disks?.map((disk,i)=>{
                const hColor=hc(disk.health);
                const usage=disk.disk_usage;
                const isSSD=disk.media_type?.toLowerCase().includes("ssd")||disk.media_type?.toLowerCase().includes("solid");
                const HealthIcon = disk.health?.toLowerCase()==="good" ? CheckCircle2
                                 : disk.health?.toLowerCase()==="caution" ? AlertTriangle
                                 : disk.health?.toLowerCase()==="bad" ? AlertCircle
                                 : HelpCircle;
                const metrics=[
                  disk.temperature       !=null && { label:"Temperatura",  Icon:Thermometer, value:`${disk.temperature}\u00b0C`,                     color:tc(disk.temperature) },
                  disk.power_on_hours    !=null && { label:"Horas de uso", Icon:Timer,       value:disk.power_on_hours.toLocaleString("es-ES"),  color:C.accentL, sub:`\u2248 ${(disk.power_on_hours/8760).toFixed(1)} a\u00f1os` },
                  disk.start_stop_cycles !=null && { label:"Ciclos E/A",   Icon:RotateCw,    value:disk.start_stop_cycles.toLocaleString("es-ES"),color:C.accentL },
                  disk.wear_pct          !=null && { label:"Vida usada",   Icon:Battery,     value:`${disk.wear_pct}%`,                           color:disk.wear_pct>80?C.red:disk.wear_pct>50?C.amber:C.green, sub:`${100-disk.wear_pct}% restante` },
                  disk.read_errors       !=null && { label:"Err. lectura", Icon:BookOpen,    value:disk.read_errors.toLocaleString("es-ES"),      color:disk.read_errors>0?C.amber:C.green },
                  disk.write_errors      !=null && { label:"Err. escritura",Icon:PenLine,    value:disk.write_errors.toLocaleString("es-ES"),     color:disk.write_errors>0?C.red:C.green },
                ].filter(Boolean);
                return (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border:`1px solid ${hColor}50` }}>
                    {/* Disk header */}
                    <div className="px-4 py-3 flex items-center gap-3" style={{ background:`${hColor}10`, borderBottom:`1px solid ${hColor}30` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background:`${hColor}20` }}>
                        {isSSD ? <Zap size={14} style={{ color:hColor }}/> : <Disc size={14} style={{ color:hColor }}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold truncate" style={{ color:C.textPri }}>{disk.model}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background:`${C.accent}18`, color:C.textMuted }}>{disk.media_type} \u00b7 {disk.bus_type}</span>
                          {disk.is_boot && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background:`${C.green}20`, color:C.green }}>BOOT</span>}
                        </div>
                        <div className="text-[9px] mt-0.5 flex gap-x-3 flex-wrap" style={{ color:C.textMuted }}>
                          {disk.serial && disk.serial!=="\u2014" && <span>S/N: {disk.serial}</span>}
                          {disk.size_bytes>0 && <span>{fmtSize(disk.size_bytes)}</span>}
                          {disk.firmware && disk.firmware!=="\u2014" && <span>FW: {disk.firmware}</span>}
                          {disk.partition_style && disk.partition_style!=="\u2014" && <span>{disk.partition_style}</span>}
                        </div>
                      </div>
                      {/* Health badge — Lucide icon, no emoji */}
                      <div className="shrink-0 px-3 py-1.5 rounded-lg flex flex-col items-center gap-0.5 min-w-[52px]"
                           style={{ background:`${hColor}20`, border:`1px solid ${hColor}40` }}>
                        <HealthIcon size={15} style={{ color:hColor }}/>
                        <p className="text-[9px] font-bold" style={{ color:hColor }}>{disk.health||"?"}</p>
                      </div>
                    </div>
                    {/* Disk body */}
                    <div className="px-4 py-3 space-y-3" style={{ background:C.bgCard2 }}>
                      {usage && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-semibold flex items-center gap-1" style={{ color:C.textMuted }}><HardDrive size={9}/> Espacio</span>
                            <span className="text-[10px] font-mono" style={{ color:C.textSec }}>{fmtSize(usage.used)} / {fmtSize(usage.total)} \u00b7 {usage.pct}%</span>
                          </div>
                          <Bar pct={usage.pct} color={usage.pct>90?C.red:usage.pct>75?C.amber:C.accent} h="h-2"/>
                        </div>
                      )}
                      {metrics.length>0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {metrics.map((m,mi)=>(
                            <div key={mi} className="rounded-lg px-3 py-2" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
                              <div className="flex items-center gap-1 mb-1">
                                <m.Icon size={9} style={{ color:C.textMuted }}/>
                                <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color:C.textMuted }}>{m.label}</span>
                              </div>
                              <p className="text-sm font-bold font-mono" style={{ color:m.color }}>{m.value}</p>
                              {m.sub && <p className="text-[8px] mt-0.5" style={{ color:C.textMuted }}>{m.sub}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {metrics.length===0 && !usage && (
                        <p className="text-[10px] text-center py-2" style={{ color:C.textMuted }}>Sin datos SMART disponibles (requiere administrador)</p>
                      )}
                      {(disk.read_errors>0||disk.write_errors>0||disk.wear_pct>80) && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:`${C.red}10`, border:`1px solid ${C.red}30` }}>
                          <AlertTriangle size={11} style={{ color:C.red }}/>
                          <span className="text-[9px]" style={{ color:C.red }}>Problemas detectados. Haz una copia de seguridad.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SISTEMA — vista resumen + specs */}
          {!loading && data && tab==="overview" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {/* CPU */}
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><Cpu size={11} style={{ color:C.accentL }}/><span className="text-[9px] font-bold uppercase tracking-wide" style={{ color:C.textMuted }}>CPU</span></div>
                    <span className="text-[11px] font-mono font-bold" style={{ color:lc(cpuLoad) }}>{cpuLoad}%</span>
                  </div>
                  <Bar pct={cpuLoad} color={lc(cpuLoad)} h="h-1.5"/>
                  <p className="text-[9px]" style={{ color:C.textSec }}>{cpu.cores}C / {cpu.threads}T \u00b7 {cpu.current_mhz} MHz</p>
                  {cpu.temperature!=null && (
                    <div className="flex items-center gap-1"><Thermometer size={9} style={{ color:tc(cpu.temperature) }}/><span className="text-[9px] font-mono font-bold" style={{ color:tc(cpu.temperature) }}>{cpu.temperature}\u00b0C</span></div>
                  )}
                </div>

                {/* RAM */}
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><MemoryStick size={11} style={{ color:C.accentL }}/><span className="text-[9px] font-bold uppercase tracking-wide" style={{ color:C.textMuted }}>RAM</span></div>
                    <span className="text-[11px] font-mono font-bold" style={{ color:lc(ram.pct) }}>{ram.pct}%</span>
                  </div>
                  <Bar pct={ram.pct} color={lc(ram.pct)} h="h-1.5"/>
                  <p className="text-[9px]" style={{ color:C.textSec }}>{fmtSize(ram.used)} / {fmtSize(ram.total)}</p>
                  {ram.slots?.length>0 && <p className="text-[9px]" style={{ color:C.textMuted }}>{ram.slots.length} m\u00f3dulo{ram.slots.length!==1?"s":""} \u00b7 {ram.slots[0]?.type}</p>}
                </div>

                {/* GPU (first one) */}
                {gpus?.length>0 && (
                  <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><Activity size={11} style={{ color:C.accentL }}/><span className="text-[9px] font-bold uppercase tracking-wide" style={{ color:C.textMuted }}>GPU</span></div>
                      {gpus[0].utilization_pct!=null && <span className="text-[11px] font-mono font-bold" style={{ color:lc(gpus[0].utilization_pct) }}>{gpus[0].utilization_pct}%</span>}
                    </div>
                    {gpus[0].utilization_pct!=null && <Bar pct={gpus[0].utilization_pct} color={lc(gpus[0].utilization_pct)} h="h-1.5"/>}
                    <p className="text-[9px] truncate" style={{ color:C.textSec }}>{gpus[0].vram_bytes>0?fmtSize(gpus[0].vram_bytes)+" VRAM":gpus[0].name}</p>
                    {gpus[0].temperature!=null && (
                      <div className="flex items-center gap-1"><Thermometer size={9} style={{ color:tc(gpus[0].temperature) }}/><span className="text-[9px] font-mono font-bold" style={{ color:tc(gpus[0].temperature) }}>{gpus[0].temperature}\u00b0C</span></div>
                    )}
                  </div>
                )}

                {/* Uptime */}
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center gap-1.5"><Timer size={11} style={{ color:C.accentL }}/><span className="text-[9px] font-bold uppercase tracking-wide" style={{ color:C.textMuted }}>Encendido</span></div>
                  <p className="text-base font-bold font-mono leading-tight" style={{ color:C.textPri }}>{fmtUptime(machine.uptime_sec)}</p>
                  <p className="text-[9px] truncate" style={{ color:C.textMuted }}>{machine.os?.replace("Microsoft ","")}</p>
                </div>
              </div>

              {/* Machine specs */}
              <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor size={12} style={{ color:C.accentL }}/>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:C.textMuted }}>Equipo</span>
                </div>
                {[
                  ["Fabricante",  machine.manufacturer],
                  ["Modelo",      machine.model],
                  ["Sistema",     machine.os],
                  ["Versi\u00f3n OS",  machine.os_version ? `${machine.os_version} (build ${machine.os_build})` : null],
                  ["BIOS",        machine.bios_version],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <StatRow key={k} label={k} value={v}/>
                ))}
              </div>

              {/* CPU specs */}
              <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={12} style={{ color:C.accentL }}/>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:C.textMuted }}>Procesador</span>
                </div>
                {[
                  ["Modelo",      cpu.name],
                  ["N\u00facleos",     cpu.cores!=null ? `${cpu.cores} f\u00edsicos \u00b7 ${cpu.threads} l\u00f3gicos` : null],
                  ["Velocidad",   cpu.max_mhz ? `${cpu.current_mhz} MHz actual \u00b7 ${cpu.max_mhz} MHz m\u00e1x` : null],
                  ["Temperatura", cpu.temperature!=null ? `${cpu.temperature}\u00b0C` : null],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <StatRow key={k} label={k} value={v}/>
                ))}
              </div>

              {/* GPU specs */}
              {gpus?.length>0 && (
                <div className="rounded-xl p-4" style={{ background:C.bgCard2, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={12} style={{ color:C.accentL }}/>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:C.textMuted }}>Tarjeta gr\u00e1fica</span>
                  </div>
                  {gpus.map((g,i)=>(
                    <div key={i} className={i>0?"mt-3 pt-3":""}
                         style={{ borderTop:i>0?`1px solid ${C.border}44`:"none" }}>
                      {gpus.length>1 && <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color:C.accentL }}>GPU {i+1}</p>}
                      {[
                        ["Modelo",       g.name],
                        ["VRAM",         g.vram_bytes>0 ? fmtSize(g.vram_bytes) : null],
                        ["Resoluci\u00f3n",   g.resolution],
                        ["Driver",       g.driver],
                        ["Temperatura",  g.temperature!=null ? `${g.temperature}\u00b0C` : null],
                      ].filter(([,v])=>v).map(([k,v])=>(
                        <StatRow key={k} label={k} value={v}/>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-2.5 border-t shrink-0"
             style={{ borderColor:C.border, background:C.bgSurface }}>
          <span className="text-[9px]" style={{ color:C.textMuted }}>
            {tab==="processes" ? `${procs.length} procesos en total` : ""}
          </span>
          <button onClick={onClose}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                  style={{ background:C.bgCard2, color:C.textSec, border:`1px solid ${C.border}` }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
});

"""

new_content = content[:start_idx] + new_component + content[end_idx:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Done! Original: {len(content)} chars, New: {len(new_content)} chars")
