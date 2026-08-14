import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'image.jpg'; // We can add better extension handling later if needed
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-end items-center p-4 gap-3 z-50">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-medium backdrop-blur-md"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Download</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 pb-8 overflow-hidden relative">
        <img
          src={imageUrl}
          alt="Full screen view"
          className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-2xl"
        />
      </div>
    </div>
  );
}
