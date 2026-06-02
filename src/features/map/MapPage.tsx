import { InteractiveMap } from "./InteractiveMap";
import konjiamMapImageUrl from "../../assets/konjiam-map-base.png";
import { useCurrentSchedule } from "../../hooks/useCurrentSchedule";
import { useWorkshopStore } from "../../store/workshopStore";

export const MapPage = () => {
  const { selectedGuide } = useWorkshopStore();
  const { displaySchedule } = useCurrentSchedule(
    selectedGuide.schedule,
    selectedGuide.scheduleControl,
  );

  return (
    <section className="-mx-4 -mt-5 h-[calc(100%+1.25rem)] min-h-[28rem] overflow-hidden bg-[#dce8c8] md:mx-0 md:h-[calc(100%+1.25rem)] md:rounded-lg md:border md:border-gray-200">
      <InteractiveMap
        fallbackImageUrl={konjiamMapImageUrl}
        focusLocationId={displaySchedule?.locationId}
        imageUrl={selectedGuide.map.imageUrl}
        locations={selectedGuide.map.locations}
        title={selectedGuide.map.title}
      />
    </section>
  );
};
