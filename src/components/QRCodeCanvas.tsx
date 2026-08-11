import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeCanvas({ value, size = 200, className = '' }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }, (error) => {
      if (error) {
        console.error('[QRCodeCanvas] Render error:', error);
      }
    });
  }, [value, size]);

  return (
    <div className={`p-3 bg-white rounded-2xl border border-gray-100 shadow-inner flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
