import { GraduationCap } from 'lucide-react';

export function Logo({ size = 'md', theme = 'light' }: { size?: 'sm' | 'md' | 'lg', theme?: 'light' | 'dark' }) {
  const dims = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 28, text: 'text-xl' },
    lg: { icon: 40, text: 'text-3xl' },
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/30" style={{ width: dims.icon + 12, height: dims.icon + 12 }}>
        <GraduationCap size={dims.icon} />
      </div>
      <span className={`font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-800'} ${dims.text}`}>
        Samsidh International School
      </span>
    </div>
  );
}
