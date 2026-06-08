import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { NameEntryDialog } from "./components/onboarding/NameEntryDialog";
import { AdminPage } from "./features/admin/AdminPage";
import { EventsPage } from "./features/events/EventsPage";
import { MapPage } from "./features/map/MapPage";
import { RecommendationsPage } from "./features/recommendations/RecommendationsPage";
import { SchedulePage } from "./features/schedule/SchedulePage";
import { WorkshopProvider, useWorkshopStore } from "./store/workshopStore";

type AppView = "participant" | "admin";

const ParticipantView = () => {
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

  return <MapPage />;
};

const WorkshopApp = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appView, setAppView] = useState<AppView>("participant");

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
        showBottomNav={appView === "participant"}
      >
        {appView === "admin" ? (
          <AdminPage onBack={() => setAppView("participant")} />
        ) : (
          <ParticipantView />
        )}
      </AppShell>
      <NameEntryDialog />
    </>
  );
};

const App = () => (
  <WorkshopProvider>
    <WorkshopApp />
  </WorkshopProvider>
);

export default App;
