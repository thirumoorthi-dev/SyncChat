import React from 'react';

interface LightboxProps {
  url: string;
  type: 'image' | 'video' | 'document';
  onClose: () => void;
}

export default function Lightbox({ url, type, onClose }: LightboxProps) {
  if (!url) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[210]"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div 
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in duration-300"
        onClick={e => e.stopPropagation()}
      >
        {type === 'image' && (
          <img 
            src={url} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-black/50" 
          />
        )}
        {type === 'video' && (
          <video 
            src={url} 
            controls 
            autoPlay 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" 
          />
        )}
        {type === 'document' && (
          <div className="bg-[var(--panel)] p-12 rounded-[32px] flex flex-col items-center gap-6 border border-[var(--border)] shadow-2xl">
            <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Document Preview</h3>
              <p className="text-sm opacity-60 mb-6" style={{ color: 'var(--text)' }}>Opening file in a new tab...</p>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-xl bg-[var(--teal)] text-white font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                Open Original File
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <a 
          href={url} 
          download 
          className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-md border border-white/10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>
    </div>
  );
}
