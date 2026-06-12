import { useEffect, useMemo, useState } from "react";
import { preGuideOverlay } from "../../config/preGuideOverlay";
import { getDayCountdownLabel } from "../../lib/preGuide";
import { useWorkshopStore } from "../../store/workshopStore";

const ROUGHMAP_TIMESTAMP = "1781064159753";
const ROUGHMAP_CONTAINER_ID = `daumRoughmapContainer${ROUGHMAP_TIMESTAMP}`;
const ROUGHMAP_KEY = "pacd5e4gjha";
const ROUGHMAP_WIDTH = "100%";
const ROUGHMAP_HEIGHT = "360";
const PRE_GUIDE_IMAGE_WIDTH = 2263;
const PRE_GUIDE_IMAGE_HEIGHT = 6788;

type DaumRoughMapLander = new (options: {
  timestamp: string;
  key: string;
  mapWidth: string;
  mapHeight: string;
}) => {
  render: () => void;
};

declare global {
  interface Window {
    daum?: {
      roughmap?: {
        Lander?: DaumRoughMapLander;
      };
    };
  }
}

interface PreGuidePageProps {
  onBack: () => void;
  onSurveyClick: () => void;
}

type ModalState =
  | {
      title: string;
      body: string;
    }
  | undefined;

export const PreGuidePage = ({ onBack, onSurveyClick }: PreGuidePageProps) => {
  const { participantProfile, selectedGuide } = useWorkshopStore();
  const [modal, setModal] = useState<ModalState>();
  const participantName = participantProfile?.name;
  const assignedTeam = selectedGuide.events
    .flatMap((event) => event.teams)
    .find((team) => (participantName ? team.members.includes(participantName) : false));
  const hasActiveSurvey = selectedGuide.events.some((event) => event.status === "active");

  const naverMapQuery = "곤지암리조트 7번주차장";
  const kakaoMapQuery = "곤지암리조트 주차장7";

  const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(naverMapQuery)}`;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(kakaoMapQuery)}`;

  useEffect(() => {
    const hasRenderedMap = (container: HTMLElement) =>
      container.children.length > 0 || Boolean(container.querySelector(".wrap_map, iframe, canvas"));

    const renderRoughMap = () => {
      const Lander = window.daum?.roughmap?.Lander;
      if (!Lander) {
        console.warn("[pre-guide] window.daum.roughmap.Lander is not available.");
        return;
      }

      const container = document.getElementById(ROUGHMAP_CONTAINER_ID);

      if (!container) {
        console.warn(`[pre-guide] Kakao RoughMap container not found: ${ROUGHMAP_CONTAINER_ID}`);
        return;
      }

      if (hasRenderedMap(container)) {
        return;
      }

      try {
        new Lander({
          timestamp: ROUGHMAP_TIMESTAMP,
          key: ROUGHMAP_KEY,
          mapWidth: ROUGHMAP_WIDTH,
          mapHeight: ROUGHMAP_HEIGHT,
        }).render();
      } catch (error) {
        console.warn("[pre-guide] Kakao RoughMap render failed.", error);
      }
    };

    if (!window.daum?.roughmap?.Lander) {
      console.warn("[pre-guide] window.daum.roughmap.Lander is not available.");
      return;
    }

    const timeoutId = window.setTimeout(renderRoughMap, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleTeamClick = () => {
    if (!participantName) {
      setModal({
        title: "이동 조 확인",
        body: "이름 입력 후 이동 조를 확인할 수 있습니다.",
      });
      return;
    }

    if (!assignedTeam) {
      setModal({
        title: "이동 조 확인",
        body: `${participantName}님의 이동 조 정보가 아직 등록되지 않았습니다.`,
      });
      return;
    }

    setModal({
      title: `${assignedTeam.name}`,
      body: `${assignedTeam.members.join(", ")}${assignedTeam.memo ? `\n${assignedTeam.memo}` : ""}`,
    });
  };

  const handleSurveyClick = () => {
    if (hasActiveSurvey) {
      onSurveyClick();
      return;
    }

    setModal({
      title: "사전 설문",
      body: "현재 참여 가능한 사전 설문이 없습니다.",
    });
  };

  return (
    <section className="w-full overflow-x-hidden bg-surface pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <button
        aria-label="뒤로가기"
        className="fixed z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-lg font-black text-emerald-950 shadow-sm backdrop-blur transition hover:bg-white/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        onClick={onBack}
        style={{ ...preGuideOverlay.backButton }}
        type="button"
      >
        ←
      </button>

      <div className="mx-auto w-full max-w-[700px]">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${PRE_GUIDE_IMAGE_WIDTH} / ${PRE_GUIDE_IMAGE_HEIGHT}` }}
        >
          <img
            alt="워크숍 사전 안내"
            className="block h-auto w-full select-none"
            decoding="async"
            draggable={false}
            fetchPriority="high"
            height={PRE_GUIDE_IMAGE_HEIGHT}
            loading="eager"
            src="/assets/output.png"
            width={PRE_GUIDE_IMAGE_WIDTH}
          />

          <p
            className="absolute text-center text-[clamp(1.4rem,6vw,2.2rem)] font-extrabold leading-none text-[#064e3b]"
            style={{ ...preGuideOverlay.dDay }}
          >
            {getDayCountdownLabel(selectedGuide.startDate)}
          </p>

          <button
            aria-label="차량 이동 조 확인하기"
            className="absolute rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            onClick={handleTeamClick}
            style={{ ...preGuideOverlay.transportButton }}
            type="button"
          />

          <button
            aria-label="사전 설문하기"
            className="absolute rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            onClick={handleSurveyClick}
            style={{ ...preGuideOverlay.surveyButton }}
            type="button"
          />

          <div
            className="pre-guide-kakao-map absolute z-20 overflow-hidden rounded-2xl bg-white"
            style={{ ...preGuideOverlay.kakaoMap }}
          >
            <div
              id={ROUGHMAP_CONTAINER_ID}
              className="root_daum_roughmap root_daum_roughmap_landing"
              style={{ width: "100%", height: "360px" }}
            />
          </div>

          <div className="absolute z-20 grid grid-cols-2 gap-2" style={{ ...preGuideOverlay.mapButton }}>
            <a
              aria-label="네이버 지도에서 보기"
              className="flex h-full min-h-6 items-center justify-center rounded-full bg-emerald-900/90 px-2 text-center text-[clamp(0.85rem,2.8vw,1.08rem)] font-bold leading-tight text-white shadow-sm transition hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              href={naverMapUrl}
              rel="noreferrer"
              target="_blank"
            >
              네이버 지도에서 보기
            </a>
            <a
              aria-label="카카오맵에서 보기"
              className="flex h-full min-h-6 items-center justify-center rounded-full bg-emerald-600/90 px-2 text-center text-[clamp(0.85rem,2.8vw,1.08rem)] font-bold leading-tight text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              href={kakaoMapUrl}
              rel="noreferrer"
              target="_blank"
            >
              카카오맵에서 보기
            </a>
          </div>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4">
          <div className="w-full max-w-xs rounded-lg bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-950">{modal.title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">{modal.body}</p>
            <button
              className="mt-5 min-h-10 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
              onClick={() => setModal(undefined)}
              type="button"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
