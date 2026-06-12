import { useMemo, useState } from "react";
import { MonitorSmartphone, Smartphone, X } from "lucide-react";
import { useWorkshopStore } from "../../store/workshopStore";

export const MobilePreview = () => {
  const { activeTab } = useWorkshopStore();
  const [isOpen, setIsOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    const url = new URL(window.location.href);
    url.searchParams.set("preview", "mobile");
    url.searchParams.set("tab", activeTab);
    url.searchParams.set("refresh", String(previewKey));

    return url.toString();
  }, [activeTab, previewKey]);
  const isInsidePreview =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "mobile";

  if (isInsidePreview) {
    return null;
  }

  return (
    <>
      <button
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-5 z-40 hidden min-h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)] transition hover:bg-brand-900 md:inline-flex"
        onClick={() => {
          setPreviewKey((key) => key + 1);
          setIsOpen(true);
        }}
        type="button"
      >
        <MonitorSmartphone className="h-4 w-4" />
        모바일 미리보기
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] hidden items-center justify-center bg-gray-950/55 p-5 md:flex">
          <div className="flex h-[min(52rem,calc(100dvh-2.5rem))] w-[min(25rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[2rem] border-[10px] border-gray-950 bg-gray-950 shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-between bg-gray-950 px-3 text-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Smartphone className="h-4 w-4" />
                모바일 미리보기
              </div>
              <button
                aria-label="모바일 미리보기 닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              key={previewKey}
              className="min-h-0 flex-1 bg-white"
              src={previewUrl}
              title="모바일 미리보기"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
