import React, { useState, useEffect, useCallback, memo } from "react";
export let _toastId = 0;
export function _nextToastId() { return ++_toastId; }
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

export { _toastListeners, _emitToast, useToast, ToastContainer };
