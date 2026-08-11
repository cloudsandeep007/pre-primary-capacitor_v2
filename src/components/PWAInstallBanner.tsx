import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const safari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    setIsIOS(ios && safari);

    // Detect already-installed PWA (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000); // Show after 3s
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS — show manual instructions after delay if not installed
    if (ios && safari) {
      setTimeout(() => setShow(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!show || isInstalled) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[9999] animate-[slideUp_0.4s_ease-out]"
      style={{ maxWidth: '420px', margin: '0 auto' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-sky-100">
          <img src="/icon-192.png" alt="Samsidh" className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Install Samsidh App</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Tap <span className="font-semibold text-sky-600">Share</span> → 
              <span className="font-semibold text-sky-600"> Add to Home Screen</span> to install
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Install for quick access, offline support & a native app feel
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-bold shadow-sm shadow-sky-400/30 hover:opacity-90 transition-opacity"
              >
                <Download size={12} />
                Install App
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* iOS arrow indicator */}
      {isIOS && (
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/90 text-white text-xs font-semibold rounded-full shadow-md backdrop-blur-sm">
            <Smartphone size={12} />
            Tap ↑ Share button at the bottom of Safari
          </div>
        </div>
      )}
    </div>
  );
}
