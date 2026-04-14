import React from 'react';

export default function TypingIndicator({ username }) {
  return (
    <div className="flex justify-start px-3 py-0.5 message-bubble">
      <div className="bubble-received" style={{ padding: '10px 14px' }}>
        {username && (
          <p className="text-[10px] font-semibold text-[var(--teal)] mb-1 truncate">{username}</p>
        )}
        <div className="flex items-center gap-[5px]">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="typing-dot w-2 h-2 rounded-full bg-[var(--subtext)] block"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
