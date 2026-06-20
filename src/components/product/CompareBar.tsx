import { X, GitCompareArrows, Scale } from 'lucide-react';
import { useCompareStore } from '@/store/compareStore';

interface CompareBarProps {
  onCompare: () => void;
}

export function CompareBar({ onCompare }: CompareBarProps) {
  const { items, remove, clear } = useCompareStore();
  const count = items.length;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 animate-in slide-in-from-bottom-4 duration-300">
      {/* Backdrop blur strip */}
      <div className="bg-[#0f1e13]/95 backdrop-blur-md border-t border-white/10 shadow-2xl">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center gap-3">

          {/* Left label */}
          <div className="flex items-center gap-2 shrink-0">
            <Scale className="w-4 h-4 text-[#4ade80]" />
            <span className="text-white text-sm font-semibold whitespace-nowrap">
              Comparing{' '}
              <span className="text-[#4ade80] font-bold">{count}</span>
              <span className="text-white/50"> / 4</span>
            </span>
          </div>

          {/* Thumbnails */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-0.5">
            {items.map((p) => (
              <div key={p.id} className="relative shrink-0 group">
                <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white/20 bg-white">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/56x56/e2e8f0/333?text=?'; }}
                  />
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                <p className="text-[9px] text-white/60 text-center mt-0.5 max-w-[56px] truncate">{p.name}</p>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - count) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center"
              >
                <span className="text-white/25 text-lg leading-none">+</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clear}
              className="text-xs text-white/50 hover:text-white/80 transition-colors underline-offset-2 hover:underline whitespace-nowrap"
            >
              Clear
            </button>
            <button
              onClick={onCompare}
              disabled={count < 2}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                count < 2
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#1e5631] hover:bg-[#27723f] text-white shadow-lg shadow-[#1e5631]/30 hover:shadow-[#1e5631]/50 active:scale-95'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              {count < 2 ? `Add ${2 - count} more` : 'View comparison'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
