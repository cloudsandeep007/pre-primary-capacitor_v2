import { useState, useRef } from 'react';
import { Camera, Upload, Check, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PhotoUploadInputProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  aspectShape?: 'circle' | 'square';
}

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&q=80',
  'https://images.unsplash.com/photo-1595454038955-498d87741763?w=300&q=80',
];

export function PhotoUploadInput({
  label,
  sublabel,
  value,
  onChange,
  required = false,
  aspectShape = 'circle',
}: PhotoUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert to compressed Base64 data URL for fast reliable preview & storage
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const dataUrl = evt.target?.result as string;
        // Optionally upload to Supabase Storage bucket 'child-photos' if available
        try {
          const fileName = `upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { data, error } = await supabase.storage
            .from('child-photos')
            .upload(fileName, file, { upsert: true });

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage
              .from('child-photos')
              .getPublicUrl(fileName);

            if (publicUrlData?.publicUrl) {
              onChange(publicUrlData.publicUrl);
              setUploading(false);
              return;
            }
          }
        } catch (storageErr) {
          console.warn('[PhotoUploadInput] Supabase storage upload skipped, using dataUrl');
        }

        onChange(dataUrl);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[PhotoUploadInput] Read file error:', err);
      setUploading(false);
    }
  };

  const startWebcam = async () => {
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('[PhotoUploadInput] Webcam stream access failed:', err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onChange(dataUrl);
    }
    stopWebcam();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/80 border border-gray-200/80 p-4 rounded-2xl">
        {/* Preview Container */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-24 h-24 overflow-hidden border-2 border-sky-300 bg-white flex items-center justify-center shadow-sm ${
              aspectShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
          >
            {value ? (
              <img src={value} alt={label} className="w-full h-full object-cover" />
            ) : (
              <Camera size={32} className="text-gray-300" />
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-rose-600 transition-colors"
              title="Remove photo"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 w-full space-y-2 text-center sm:text-left">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-sky-50 hover:border-sky-300 text-xs font-semibold shadow-sm transition-all"
            >
              {uploading ? (
                <RefreshCw size={14} className="animate-spin text-sky-500" />
              ) : (
                <Upload size={14} className="text-sky-600" />
              )}
              {uploading ? 'Processing...' : 'Upload File'}
            </button>

            <button
              type="button"
              onClick={startWebcam}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-semibold transition-all"
            >
              <Camera size={14} /> Camera
            </button>

            <button
              type="button"
              onClick={() => setShowSamplePicker(!showSamplePicker)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
            >
              <ImageIcon size={14} /> Sample
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            JPG, PNG or WEBP (Max 5MB). Photo will be verified at gate handover.
          </p>
        </div>
      </div>

      {/* Sample Avatar Picker */}
      {showSamplePicker && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-md animate-[fadeIn_0.2s_ease-out]">
          <p className="text-xs font-semibold text-gray-600 mb-2">Choose sample photo:</p>
          <div className="grid grid-cols-6 gap-2">
            {SAMPLE_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(url);
                  setShowSamplePicker(false);
                }}
                className={`relative rounded-xl overflow-hidden border-2 aspect-square transition-all ${
                  value === url ? 'border-sky-500 scale-105 shadow' : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img src={url} alt={`Sample ${i}`} className="w-full h-full object-cover" />
                {value === url && (
                  <div className="absolute inset-0 bg-sky-500/30 flex items-center justify-center">
                    <Check size={16} className="text-white drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Webcam Modal */}
      {showWebcam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Camera size={18} className="text-sky-500" /> Take Snapshot
              </h3>
              <button onClick={stopWebcam} className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-square relative flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={stopWebcam}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold text-sm shadow-md shadow-sky-500/20"
              >
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
