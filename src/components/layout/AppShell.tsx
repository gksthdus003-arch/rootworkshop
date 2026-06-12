import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { MobilePreview } from "./MobilePreview";
import { SideDrawer } from "./SideDrawer";
import { CurrentSessionStrip } from "../workshop/CurrentSessionStrip";
import { PreGuideStrip } from "../workshop/PreGuideStrip";
import { cn } from "../../lib/cn";
import { useWorkshopStore } from "../../store/workshopStore";

interface AppShellProps {
  children: ReactNode;
  isDrawerOpen: boolean;
  showBottomNav: boolean;
  onDrawerOpen: () => void;
  onDrawerClose: () => void;
  onAdminClick: () => void;
  onPreGuideClick: () => void;
  isFullScreenContent?: boolean;
  onParticipantTabSelect?: () => void;
  showStatusStrip?: boolean;
}

export const AppShell = ({
  children,
  isDrawerOpen,
  showBottomNav,
  onDrawerOpen,
  onDrawerClose,
  onAdminClick,
  onPreGuideClick,
  isFullScreenContent = false,
  onParticipantTabSelect,
  showStatusStrip = true,
}: AppShellProps) => {
  const {
    activeTab,
    defaultGuide,
    guides,
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
  const isMobilePreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "mobile";
  const isMapTab = showBottomNav && activeTab === "map";
  const showPreGuideStrip = showStatusStrip && showBottomNav && selectedGuide.status === "pre";
  const showScheduleStrip =
    showStatusStrip && showBottomNav && selectedGuide.status === "live" && hasScheduleStrip;

  return (
    <div
      className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-surface"
    >
      {showPreGuideStrip ? (
        <PreGuideStrip onClick={onPreGuideClick} startDate={selectedGuide.startDate} />
      ) : null}

      {showScheduleStrip ? (
        <CurrentSessionStrip
          onShortcutClick={openScheduleTab}
          schedule={scheduleStripGuide.schedule}
          scheduleControl={scheduleStripGuide.scheduleControl}
        />
      ) : null}

      {isMapTab ? (
        <header className="z-20 shrink-0 border-b border-gray-200 bg-surface/95 backdrop-blur">
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
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "mx-auto min-h-0 w-full flex-1",
          isMapTab
            ? "max-w-none overflow-hidden p-0"
            : isFullScreenContent
              ? "max-w-none overflow-x-hidden overflow-y-auto p-0"
            : cn(
                "max-w-screen-md flex flex-col overflow-y-auto px-4",
                isMobilePreview ? "pt-2" : "pt-3",
                showBottomNav ? (isMobilePreview ? "pb-2" : "pb-3") : "pb-6",
              ),
        )}
      >
        {children}
      </main>

      {showBottomNav ? (
        <>
          <MobilePreview />
          <BottomNav
            activeTab={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              onParticipantTabSelect?.();
            }}
          />
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
