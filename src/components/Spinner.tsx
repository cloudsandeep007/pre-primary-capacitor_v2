import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-sky-500 ${className}`} />;
};

export function FullScreenSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <Spinner size={32} />
      <p className="text-gray-500 text-sm font-medium">{label}</p>
    </div>
  );
}
