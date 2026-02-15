import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { mc } from '@/lib/microcopy';
import {
  FUNLAB_PACKS,
  FUNLAB_CATEGORIES,
  FUNLAB_CATEGORY_LABELS,
  type FunLabPack,
  type FunLabCategory,
} from '@/lib/funlab/packs';
import { useBreakpoint } from '@/hooks/use-mobile';

interface PackBrowserProps {
  onSelectPack: (pack: FunLabPack) => void;
}

export const PackBrowser: React.FC<PackBrowserProps> = ({ onSelectPack }) => {
  const [activeCategory, setActiveCategory] = useState<FunLabCategory>('portrait_identity');
  const [search, setSearch] = useState('');
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const filteredPacks = useMemo(() => {
    const categoryPacks = FUNLAB_PACKS.filter((p) => p.category === activeCategory);
    if (!search.trim()) return categoryPacks;
    const q = search.toLowerCase();
    return categoryPacks.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [activeCategory, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packs…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)]"
            aria-label="Search Fun Lab packs"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {FUNLAB_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSearch('');
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
                  : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/8'
              }`}
              aria-label={FUNLAB_CATEGORY_LABELS[cat]}
            >
              {FUNLAB_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Pack grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-white/40">{mc.workspace.empty.searchNoMatches.title}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{mc.workspace.empty.searchNoMatches.body}</p>
          </div>
        ) : (
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {filteredPacks.map((pack) => (
              <button
                key={pack.id}
                onClick={() => onSelectPack(pack)}
                className="text-left p-3 rounded-[var(--sw-radius-card)] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                aria-label={`${pack.name}: ${pack.description}`}
              >
                {/* Preview image */}
                <div className="w-full aspect-[16/10] rounded-lg overflow-hidden mb-2 bg-neutral-800 border border-white/5">
                  <img
                    src={pack.preview_image}
                    alt={pack.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs font-medium text-white/80 truncate">{pack.name}</p>
                <p className="text-[10px] text-white/35 mt-0.5 line-clamp-2 leading-relaxed">
                  {pack.description}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
