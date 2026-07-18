'use client';

export type MiniAppTab = 'play' | 'rank' | 'invite' | 'claim';

const TABS: { id: MiniAppTab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'rank', label: 'Rank' },
  { id: 'invite', label: 'Invite' },
  { id: 'claim', label: 'Claim' },
];

interface MiniAppBottomNavProps {
  active: MiniAppTab;
  onChange: (tab: MiniAppTab) => void;
  onHaptic?: () => void;
}

export function MiniAppBottomNav({ active, onChange, onHaptic }: MiniAppBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-grid bg-void/95 backdrop-blur-sm"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Mini app navigation"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-2 pt-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onHaptic?.();
                onChange(tab.id);
              }}
              className={`flex-1 rounded-sm border-2 px-2 py-2.5 font-pixel text-[10px] uppercase tracking-[0.12em] transition-colors ${
                isActive
                  ? 'border-phosphor bg-phosphor/10 text-phosphor glow-text'
                  : 'border-grid bg-slate/30 text-ash hover:border-ash hover:text-bone'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
