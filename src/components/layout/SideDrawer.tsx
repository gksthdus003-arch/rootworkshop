import { Lock, X } from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/cn";
import type { WorkshopGuide } from "../../types/workshop";

interface SideDrawerProps {
  guides: WorkshopGuide[];
  selectedGuideId: string;
  isOpen: boolean;
  onClose: () => void;
  onGuideSelect: (guideId: string) => void;
  onAdminClick: () => void;
}

export const SideDrawer = ({
  guides,
  selectedGuideId,
  isOpen,
  onClose,
  onGuideSelect,
  onAdminClick,
}: SideDrawerProps) => {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[80] bg-gray-950/40 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[90] flex w-[18rem] max-w-[82vw] flex-col bg-white shadow-2xl transition-transform",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">워크숍 회차</p>
            <h2 className="text-lg font-bold">가이드 선택</h2>
          </div>
          <button
            aria-label="닫기"
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {guides.map((guide) => {
            const isSelected = selectedGuideId === guide.id;

            return (
              <button
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition",
                  isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                )}
                key={guide.id}
                onClick={() => {
                  onGuideSelect(guide.id);
                  onClose();
                }}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold">{guide.title}</span>
                  {guide.isDefault ? (
                    <span className="rounded-full bg-brand-700 px-2 py-1 text-[11px] font-bold text-white">
                      기본
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-gray-500">{guide.locationLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-gray-200 p-4">
          <Button className="w-full" icon={<Lock className="h-4 w-4" />} onClick={onAdminClick}>
            관리자 페이지
          </Button>
        </div>
      </aside>
    </>
  );
};
