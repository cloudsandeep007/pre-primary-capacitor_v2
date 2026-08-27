import { Users, Heart, ArrowRight, Sparkles, Shield, BookOpen } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Logo } from '@/components/Logo';

export function LandingPage() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-teal-50 to-white flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Logo />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full border border-amber-300 transition-colors shadow-sm"
          >
            👑 Admin Portal
          </button>
          <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-3 py-1.5 rounded-full hidden sm:inline-block">
            Preschool Daily Log
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center py-12">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-sky-100 rounded-full px-4 py-2 mb-6 shadow-sm">
          <Sparkles size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-gray-600">Every day, every moment, logged with care</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-800 mb-4 leading-tight">
          Your child's day,
          <span className="block bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
            beautifully documented
          </span>
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-md">
          Teachers log meals, naps, moods, and photos. Parents get a daily report card — all in one warm, simple app.
        </p>

        {/* Three portal buttons */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/staff')}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-sky-600 p-6 text-left shadow-xl shadow-sky-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-1 active:translate-y-0"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Users size={28} className="text-white" />
              </div>
              <ArrowRight size={24} className="text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Staff Portal</h2>
            <p className="text-sky-50 text-sm">Log activities and manage your class</p>
          </button>

          <button
            onClick={() => navigate('/parent')}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 p-6 text-left shadow-xl shadow-teal-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-1 active:translate-y-0"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Heart size={28} className="text-white" />
              </div>
              <ArrowRight size={24} className="text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Parent Portal</h2>
            <p className="text-teal-50 text-sm">View your child's daily report</p>
          </button>

          <button
            onClick={() => navigate('/gate')}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-left shadow-xl shadow-amber-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/30 hover:-translate-y-1 active:translate-y-0"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Shield size={28} className="text-white" />
              </div>
              <ArrowRight size={24} className="text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Gate Staff</h2>
            <p className="text-amber-50 text-sm">Scan QR & manage child handovers</p>
          </button>
        </div>



        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-3 w-full max-w-md">
          {[
            { icon: BookOpen, label: 'Activity Logs' },
            { icon: Shield, label: 'PIN Secure' },
            { icon: Heart, label: 'Photo Updates' },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                <feature.icon size={18} className="text-sky-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">{feature.label}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        Made with care for little ones
      </footer>
    </div>
  );
}
