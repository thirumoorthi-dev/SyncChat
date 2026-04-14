import React from 'react';

const GRADIENT_PAIRS = [
  ['#128C7E', '#075E54'],
  ['#25D366', '#128C7E'],
  ['#34B7F1', '#1a7abf'],
  ['#FF6B6B', '#c0392b'],
  ['#4ECDC4', '#1a9e96'],
  ['#A29BFE', '#6C5CE7'],
  ['#FD79A8', '#c0185a'],
  ['#FDCB6E', '#e17055'],
  ['#00CEC9', '#00796B'],
  ['#6C5CE7', '#5a4bd1'],
];

function getGradient(name = '') {
  const code = [...(name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENT_PAIRS[code % GRADIENT_PAIRS.length];
}

export default function Avatar({ name = '?', color, size = 'md', isOnline = false }) {
  const sizeMap = {
    xs: { box: 'w-6 h-6',   text: 'text-xs',  ring: 'w-2 h-2', border: 'border-[1.5px]' },
    sm: { box: 'w-8 h-8',   text: 'text-sm',  ring: 'w-2.5 h-2.5', border: 'border-2' },
    md: { box: 'w-10 h-10', text: 'text-base', ring: 'w-3 h-3',   border: 'border-2' },
    lg: { box: 'w-12 h-12', text: 'text-lg',  ring: 'w-3.5 h-3.5', border: 'border-2' },
    xl: { box: 'w-16 h-16', text: 'text-2xl', ring: 'w-4 h-4',   border: 'border-2' },
  };

  const s = sizeMap[size] || sizeMap.md;
  const initial = (name || '?')[0].toUpperCase();
  const [from, to] = color ? [color, color] : getGradient(name);

  return (
    <div className="relative flex-shrink-0 select-none">
      <div
        className={`${s.box} ${s.text} rounded-full flex items-center justify-center font-semibold text-white shadow-sm`}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        aria-label={name}
      >
        {initial}
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0">
          {/* pulse ring */}
          <span
            className={`absolute bottom-0 right-0 ${s.ring} rounded-full bg-[var(--green)] animate-[pulseRing_2s_ease-out_infinite]`}
          />
          {/* solid dot */}
          <span
            className={`absolute bottom-0 right-0 ${s.ring} rounded-full bg-[var(--green)] ${s.border} border-[var(--panel)]`}
          />
        </span>
      )}
    </div>
  );
}
