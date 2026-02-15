import React, { useState, useMemo } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import type { FunLabPack, PackControl } from '@/lib/funlab/packs';

interface PackOptionsProps {
  pack: FunLabPack;
  imageUrl?: string;
  onBack: () => void;
  onGenerate: (controlValues: Record<string, string | number>) => void;
  isGenerating: boolean;
  isReserving: boolean;
  creditsAvailable: number;
}

export const PackOptions: React.FC<PackOptionsProps> = ({
  pack,
  imageUrl,
  onBack,
  onGenerate,
  isGenerating,
  isReserving,
  creditsAvailable,
}) => {
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    if (pack.controls) {
      for (const ctrl of pack.controls) {
        if (ctrl.type === 'slider' && ctrl.default !== undefined) {
          initial[ctrl.id] = ctrl.default;
        } else if (ctrl.type === 'select' && ctrl.options?.[0]) {
          initial[ctrl.id] = ctrl.options[0].value;
        } else {
          initial[ctrl.id] = '';
        }
      }
    }
    return initial;
  });

  const isTypography = pack.category === 'typography_structure';
  const textInput = String(values['user_text'] || '');
  const insufficientCredits = creditsAvailable < pack.cost;
  const disabled = isGenerating || isReserving || insufficientCredits;

  const handleChange = (id: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  // Lightweight CSS text mask preview for typography packs
  const hintPreview = useMemo(() => {
    if (!isTypography || !textInput.trim() || !imageUrl) return null;
    return (
      <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            mixBlendMode: 'overlay',
          }}
        >
          <span
            className="text-white font-bold leading-none text-center break-all"
            style={{
              fontSize: `${Math.max(12, Math.min(48, 200 / Math.max(textInput.length, 1)))}px`,
              opacity: 0.5,
              textShadow: '0 0 8px rgba(0,0,0,0.5)',
              maxWidth: '90%',
              wordBreak: 'break-all',
            }}
          >
            {textInput.repeat(Math.ceil(80 / Math.max(textInput.length, 1))).slice(0, 200)}
          </span>
        </div>
      </div>
    );
  }, [isTypography, textInput, imageUrl]);

  const renderControl = (ctrl: PackControl) => {
    switch (ctrl.type) {
      case 'textarea':
        return (
          <div key={ctrl.id}>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">
              {ctrl.label}
            </label>
            <textarea
              value={String(values[ctrl.id] || '')}
              onChange={(e) => handleChange(ctrl.id, e.target.value)}
              placeholder={ctrl.placeholder}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)] resize-none"
            />
          </div>
        );

      case 'text':
        return (
          <div key={ctrl.id}>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">
              {ctrl.label}
            </label>
            <input
              type="text"
              value={String(values[ctrl.id] || '')}
              onChange={(e) => handleChange(ctrl.id, e.target.value)}
              placeholder={ctrl.placeholder}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)]"
            />
          </div>
        );

      case 'select':
        return (
          <div key={ctrl.id}>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">
              {ctrl.label}
            </label>
            <select
              value={String(values[ctrl.id] || '')}
              onChange={(e) => handleChange(ctrl.id, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)] appearance-none"
            >
              {ctrl.options?.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-neutral-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'slider':
        return (
          <div key={ctrl.id}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                {ctrl.label}
              </label>
              <span className="text-[10px] text-white/50 tabular-nums">
                {Number(values[ctrl.id] ?? ctrl.default ?? 0).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={ctrl.min ?? 0}
              max={ctrl.max ?? 1}
              step={ctrl.step ?? 0.01}
              value={Number(values[ctrl.id] ?? ctrl.default ?? 0)}
              onChange={(e) => handleChange(ctrl.id, parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-[var(--sw-accent)]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button
          onClick={onBack}
          className="p-1 text-white/40 hover:text-white/70 rounded transition-colors"
          aria-label="Back to pack browser"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-medium text-white/80 truncate">{pack.name}</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <p className="text-xs text-white/40">{pack.description}</p>

        {/* Typography hint preview */}
        {hintPreview}

        {/* Pack controls */}
        {pack.controls?.map(renderControl)}
      </div>

      {/* Generate button - always visible at bottom */}
      <div className="px-4 py-3 border-t border-white/5 shrink-0">
        <button
          onClick={() => onGenerate(values)}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          aria-label={mc.buttons.primary.generate3}
        >
          {(isGenerating || isReserving) && <Loader2 className="w-4 h-4 animate-spin" />}
          {isGenerating
            ? mc.progress.generating3Options
            : insufficientCredits
              ? 'Not enough credits'
              : `${mc.buttons.primary.generate3} (cost: ${pack.cost})`}
        </button>
        {insufficientCredits && (
          <p className="text-[10px] text-amber-400/70 text-center mt-1.5">
            {mc.buttons.secondary.buyCredits}
          </p>
        )}
      </div>
    </div>
  );
};
