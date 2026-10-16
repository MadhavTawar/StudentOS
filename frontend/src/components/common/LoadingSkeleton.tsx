import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({ rows = 3, height = '48px' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse-glow"
          style={{
            height,
            backgroundColor: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            width: '100%',
          }}
        />
      ))}
    </div>
  );
};
