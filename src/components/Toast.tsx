import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;
const listeners: ((toast: ToastMessage) => void)[] = [];

export function showToast(type: ToastType, message: string) {
  const toast: ToastMessage = { id: ++toastIdCounter, type, message };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const config = {
          success: { icon: CheckCircle2, bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
          error: { icon: XCircle, bg: 'bg-rose-500', ring: 'ring-rose-500/20' },
          info: { icon: Info, bg: 'bg-sky-500', ring: 'ring-sky-500/20' },
        }[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl ring-4 ${config.bg} ${config.ring} animate-[slideDown_0.3s_ease-out]`}
          >
            <Icon size={20} className="text-white flex-shrink-0" />
            <p className="text-white text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="text-white/80 hover:text-white flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
