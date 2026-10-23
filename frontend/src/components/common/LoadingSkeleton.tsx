import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({ rows = 3, height = '48px' }) => {
  return (
    <div className="loading-skeleton" aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="loading-skeleton-row animate-pulse-glow"
          style={{
            height,
          }}
        />
      ))}
    </div>
  );
};
