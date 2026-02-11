import React from 'react';
import { Upload } from 'lucide-react';

interface EmptyStateProps {
  isDragOver: boolean;
}

export const EmptyState = React.memo(({ isDragOver }: EmptyStateProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`
        flex flex-col items-center gap-4 p-12 rounded-2xl
        border-2 border-dashed transition-all duration-200
        ${isDragOver
          ? 'border-white/30 bg-white/5 scale-105'
          : 'border-white/10 bg-transparent'}
      `}
      >
        <div
          className={`
          p-4 rounded-full transition-colors duration-200
          ${isDragOver ? 'bg-white/10' : 'bg-white/5'}
        `}
        >
          <Upload className="w-8 h-8 text-white/40" />
        </div>
        <div className="text-center">
          <p className="text-white/50 text-base font-medium">
            Drop something to start
          </p>
          <p className="text-white/25 text-sm mt-1">
            Images, references, or ideas
          </p>
        </div>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
