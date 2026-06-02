import { MapPin, Sparkles } from "lucide-react";
import { Card } from "../../components/common/Card";
import { useWorkshopStore } from "../../store/workshopStore";

export const RecommendationsPage = () => {
  const { selectedGuide } = useWorkshopStore();
  const visibleRecommendations = selectedGuide.recommendations.filter((item) => item.isVisible);
  const bannerAnnouncements = selectedGuide.announcements.filter(
    (announcement) => announcement.showOnHomeBanner,
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">추천 코스</h1>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          자유시간에 방문하기 좋은 코스와 콘텐츠입니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleRecommendations.length > 0 ? (
          visibleRecommendations.map((item) => (
            <Card className="overflow-hidden p-0" key={item.id}>
              <div className="aspect-[16/10] w-full overflow-hidden bg-gray-100">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/assets/konjiam-map-base.png";
                  }}
                  src={item.imageUrl}
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-brand-700">{item.category}</p>
                    <h2 className="mt-1 truncate text-lg font-bold">{item.title}</h2>
                  </div>
                  <div className="shrink-0 rounded-full bg-yellow-100 p-2 text-yellow-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <MapPin className="h-4 w-4 text-brand-700" />
                  {item.locationLabel}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                  {item.description}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-gray-100 p-2 text-gray-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">등록된 추천 코스가 없습니다.</h2>
                <p className="mt-1 text-sm text-gray-500">
                  관리자 페이지에서 추천 코스를 추가할 수 있습니다.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {bannerAnnouncements.length > 0 ? (
        <div className="space-y-2">
          {bannerAnnouncements.map((announcement) => (
            <Card className="border-brand-100 bg-brand-50 shadow-none" key={announcement.id}>
              <p className="text-xs font-bold text-brand-700">
                {announcement.isImportant ? "중요 공지" : "공지"}
              </p>
              <h2 className="mt-1 font-bold text-brand-950">{announcement.title}</h2>
              <p className="mt-1 text-sm leading-6 text-brand-900">{announcement.body}</p>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
};
