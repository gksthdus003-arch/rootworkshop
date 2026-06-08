import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { MobilePreview } from "./MobilePreview";
import { SideDrawer } from "./SideDrawer";
import { Button } from "../common/Button";
import { CurrentSessionStrip } from "../workshop/CurrentSessionStrip";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";

interface AppShellProps {
  children: ReactNode;
  isDrawerOpen: boolean;
  showBottomNav: boolean;
  onDrawerOpen: () => void;
  onDrawerClose: () => void;
  onAdminClick: () => void;
}

export const AppShell = ({
  children,
  isDrawerOpen,
  showBottomNav,
  onDrawerOpen,
  onDrawerClose,
  onAdminClick,
}: AppShellProps) => {
  const {
    activeTab,
    defaultGuide,
    guides,
    participantProfile,
    openScheduleTab,
    selectedGuide,
    selectedGuideId,
    selectGuide,
    setActiveTab,
  } = useWorkshopStore();
  const scheduleStripGuide = selectedGuide.schedule.length > 0 ? selectedGuide : defaultGuide;
  const hasScheduleStrip = scheduleStripGuide.schedule.length > 0;
  const visibleGuides = [
    defaultGuide,
    ...guides.filter((guide) => guide.id !== defaultGuide.id && guide.isPublished),
  ];
  const isMapTab = showBottomNav && activeTab === "map";

  return (
    <div className="flex h-[100dvh] min-h-[32rem] flex-col overflow-hidden bg-surface">
      {hasScheduleStrip ? (
        <CurrentSessionStrip
          onShortcutClick={openScheduleTab}
          schedule={scheduleStripGuide.schedule}
          scheduleControl={scheduleStripGuide.scheduleControl}
        />
      ) : null}

      <header
        className="z-20 shrink-0 border-b border-gray-200 bg-surface/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="사이드탭 열기"
              className="rounded-full p-2 text-brand-900 hover:bg-brand-50"
              onClick={onDrawerOpen}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-brand-900">워크숍 가이드</p>
              <p className="truncate text-xs text-gray-500">
                {selectedGuide.id === defaultGuide.id ? "기본 회차" : "이전 회차"} ·{" "}
                {selectedGuide.title}
              </p>
            </div>
          </div>

          <Button className="hidden sm:inline-flex" onClick={openScheduleTab} variant="ghost">
            일정 바로가기
          </Button>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto min-h-0 w-full max-w-screen-md flex-1",
          isMapTab
            ? "overflow-hidden p-0"
            : cn("overflow-y-auto px-4 pt-5", showBottomNav ? "pb-4" : "pb-8"),
        )}
      >
        {!isMapTab ? (
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <p className="truncate text-sm font-semibold text-gray-500">
            {participantProfile?.name ? `${participantProfile.name}님` : "참가자"}
          </p>
          <Button onClick={openScheduleTab} variant="ghost">
            일정 바로가기
          </Button>
        </div>
        ) : null}
        {children}
      </main>

      {showBottomNav ? (
        <>
          <MobilePreview />
          <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        </>
      ) : null}

      <SideDrawer
        guides={visibleGuides}
        isOpen={isDrawerOpen}
        onAdminClick={onAdminClick}
        onClose={onDrawerClose}
        onGuideSelect={selectGuide}
        selectedGuideId={selectedGuideId}
      />
    </div>
  );
};
