import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

export const ReferenceDock = () => {
  const [collapsed, setCollapsed] = useState(true);
  const items = useCanvasStore(s => s.items);
  const references = items.filter(i => i.type === 'reference' && !i.deleted_at);

  return (
    <div className={`
      absolute left-0 top-0 bottom-0 z-20
      transition-all duration-200 ease-out
      ${collapsed ? 'w-10' : 'w-52'}
    `}>
      <div className="h-full bg-neutral-950/90 backdrop-blur-sm border-r border-white/5 flex flex-col">
        {/* Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-white/30 hover:text-white/60 transition-colors self-end"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {!collapsed && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 px-1">References</p>
            {references.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-white/20">
                <ImageIcon className="w-5 h-5" />
                <p className="text-[10px] text-center">Drop references onto the canvas</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {references.map(ref => {
                  const data = ref.data as any;
                  return (
                    <div key={ref.id} className="aspect-square rounded overflow-hidden bg-neutral-900">
                      <img src={data.url || data.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {collapsed && references.length > 0 && (
          <div className="flex flex-col items-center gap-1 px-1 pb-2">
            {references.slice(0, 4).map(ref => {
              const data = ref.data as any;
              return (
                <div key={ref.id} className="w-7 h-7 rounded overflow-hidden bg-neutral-900">
                  <img src={data.url || data.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              );
            })}
            {references.length > 4 && (
              <span className="text-[9px] text-white/30">+{references.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
