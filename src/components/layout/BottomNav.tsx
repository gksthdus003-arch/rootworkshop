import { bottomTabs } from "../../constants/navigation";
import { cn } from "../../lib/cn";
import type { BottomTabId } from "../../types/workshop";

interface BottomNavProps {
  activeTab: BottomTabId;
  onChange: (tabId: BottomTabId) => void;
}

export const BottomNav = ({ activeTab, onChange }: BottomNavProps) => {
  return (
    <nav
      aria-label="참가자 하단 탭"
      className="safe-bottom z-30 shrink-0 border-t border-gray-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
      style={{
        minHeight: "calc(4rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto grid max-w-screen-md grid-cols-4 px-2 py-1">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition",
                isActive ? "bg-yellow-300 text-gray-950" : "text-gray-600 hover:bg-gray-100",
              )}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <Icon aria-hidden className="h-5 w-5" strokeWidth={2.2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
