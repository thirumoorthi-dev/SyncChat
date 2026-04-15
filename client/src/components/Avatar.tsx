import React from 'react';

interface AvatarProps {
  name?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ name = '?', color = '#25D366', size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');

  const sizes = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-[13px]',
    lg: 'w-12 h-12 text-[15px]',
    xl: 'w-16 h-16 text-[20px]'
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none ${sizes[size]}`}
      style={{
        backgroundColor: color,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
      }}
    >
      {initials}
    </div>
  );
}
