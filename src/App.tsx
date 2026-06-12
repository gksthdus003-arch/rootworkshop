import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { NameEntryDialog } from "./components/onboarding/NameEntryDialog";
import { SplashScreen } from "./components/workshop/SplashScreen";
import { AdminPage } from "./features/admin/AdminPage";
import { EventsPage } from "./features/events/EventsPage";
import { MapPage } from "./features/map/MapPage";
import { PreGuidePage } from "./features/preGuide/PreGuidePage";
import { RecommendationsPage } from "./features/recommendations/RecommendationsPage";
import { SchedulePage } from "./features/schedule/SchedulePage";
import { WorkshopProvider, useWorkshopStore } from "./store/workshopStore";
import type { BottomTabId } from "./types/workshop";

type AppView = "participant" | "preGuide" | "admin";

interface ParticipantViewProps {
  onPreGuideClick: () => void;
}

const ParticipantView = ({ onPreGuideClick }: ParticipantViewProps) => {
  const { activeTab } = useWorkshopStore();

  if (activeTab === "schedule") {
    return <SchedulePage />;
  }

  if (activeTab === "events") {
    return <EventsPage />;
  }

  if (activeTab === "recommendations") {
    return <RecommendationsPage />;
  }

  return <MapPage onPreGuideClick={onPreGuideClick} />;
};

const WorkshopApp = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appView, setAppView] = useState<AppView>("participant");
  const [preGuideReturnTab, setPreGuideReturnTab] = useState<BottomTabId>();
  const { activeTab, selectedGuide, setActiveTab } = useWorkshopStore();

  const openPreGuide = () => {
    setPreGuideReturnTab(activeTab);
    setAppView("preGuide");
  };

  return (
    <>
      <AppShell
        isDrawerOpen={isDrawerOpen}
        onAdminClick={() => {
          setAppView("admin");
          setIsDrawerOpen(false);
        }}
        onDrawerClose={() => setIsDrawerOpen(false)}
        onDrawerOpen={() => setIsDrawerOpen(true)}
        onParticipantTabSelect={() => {
          setPreGuideReturnTab(undefined);
          setAppView("participant");
        }}
        onPreGuideClick={openPreGuide}
        isFullScreenContent={appView === "preGuide"}
        showBottomNav={appView === "participant"}
        showStatusStrip={appView === "participant"}
      >
        {appView === "admin" ? (
          <AdminPage onBack={() => setAppView("participant")} />
        ) : appView === "preGuide" ? (
          <PreGuidePage
            onBack={() => {
              setActiveTab(preGuideReturnTab ?? "map");
              setPreGuideReturnTab(undefined);
              setAppView("participant");
            }}
            onSurveyClick={() => {
              setActiveTab("events");
              setPreGuideReturnTab(undefined);
              setAppView("participant");
            }}
          />
        ) : (
          <ParticipantView onPreGuideClick={openPreGuide} />
        )}
      </AppShell>
      <NameEntryDialog />
      <SplashScreen guide={selectedGuide} />
    </>
  );
};

const App = () => (
  <WorkshopProvider>
    <WorkshopApp />
  </WorkshopProvider>
);

export default App;
