import { InteractiveMap } from "./InteractiveMap";
import konjiamMapImageUrl from "../../assets/konjiam-map-base.png";
import { useWorkshopStore } from "../../store/workshopStore";

interface MapPageProps {
  onPreGuideClick?: () => void;
}

export const MapPage = ({ onPreGuideClick }: MapPageProps) => {
  const { selectedGuide } = useWorkshopStore();

  return (
    <section className="h-full min-h-0 overflow-hidden bg-[#dce8c8] md:rounded-lg md:border md:border-gray-200">
      <InteractiveMap
        fallbackImageUrl={konjiamMapImageUrl}
        guideStatus={selectedGuide.status}
        imageUrl={selectedGuide.map.imageUrl}
        locations={selectedGuide.map.locations}
        onPreGuideClick={onPreGuideClick}
        schedule={selectedGuide.schedule}
        title={selectedGuide.map.title}
      />
    </section>
  );
};
