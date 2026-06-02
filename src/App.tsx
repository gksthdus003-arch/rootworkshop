import React, { useEffect, useState } from 'react'
import TopBar from './components/TopBar'
import BottomTabs from './components/BottomTabs'
import SideDrawer from './components/SideDrawer'
import MapPage from './pages/MapPage'
import SchedulePage from './pages/SchedulePage'
import EventsPage from './pages/EventsPage'
import RecommendationsPage from './pages/RecommendationsPage'
import { storage } from './lib/storage'

type Tab = 'map'|'schedule'|'events'|'reco'

export default function App(){
  const [tab, setTab] = useState<Tab>('map')
  const [drawer, setDrawer] = useState(false)
  const [name, setName] = useState<string | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(()=>{
    setName(storage.getName())
  },[])

  function saveName(v:string){
    storage.setName(v)
    setName(v)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <header className="p-4 max-w-xl mx-auto flex items-center justify-between">
        <button onClick={()=>setDrawer(true)} className="text-gray-700">☰</button>
        <div className="text-lg font-semibold">워크숍 가이드</div>
        <div className="text-sm text-gray-500">{name ?? '게스트'}</div>
      </header>

      <main className="pt-2 pb-24">
        {tab==='map' && <MapPage />}
        {tab==='schedule' && <SchedulePage />}
        {tab==='events' && <EventsPage />}
        {tab==='reco' && <RecommendationsPage />}
      </main>

      <BottomTabs active={tab} onChange={(t)=>setTab(t)} />

      <SideDrawer open={drawer} onClose={()=>setDrawer(false)} onAdmin={()=>{setAdminOpen(true); setDrawer(false)}} />

      {/* Name modal */}
      {!name && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-40">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full max-w-md p-4">
            <div className="text-lg font-medium mb-2">이름을 입력해주세요</div>
            <NameForm onSave={saveName} />
          </div>
        </div>
      )}

      {/* Admin modal */}
      {adminOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded max-w-sm w-full">
            <div className="text-lg font-medium mb-2">관리자 접근</div>
            <AdminForm onClose={()=>setAdminOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function NameForm({ onSave }: { onSave: (v:string)=>void }){
  const [v, setV] = useState('')
  return (
    <div>
      <input value={v} onChange={e=>setV(e.target.value)} className="w-full border p-2 rounded mb-3" placeholder="이름" />
      <div className="flex justify-end">
        <button className="bg-green-700 text-white px-4 py-2 rounded" onClick={()=>{ if(v.trim()) onSave(v.trim()) }}>확인</button>
      </div>
    </div>
  )
}

function AdminForm({ onClose }: { onClose: ()=>void }){
  const [pw, setPw] = useState('')
  const [ok, setOk] = useState(false)
  function tryPw(){
    if(pw==='admin123') setOk(true)
    else alert('비밀번호가 일치하지 않습니다')
  }
  return (
    <div>
      {!ok ? (
        <>
          <input value={pw} onChange={e=>setPw(e.target.value)} className="w-full border p-2 rounded mb-3" placeholder="비밀번호" />
          <div className="flex justify-end space-x-2">
            <button className="px-3 py-2" onClick={onClose}>취소</button>
            <button className="bg-green-700 text-white px-4 py-2 rounded" onClick={tryPw}>확인</button>
          </div>
        </>
      ) : (
        <div>
          <div className="mb-3">관리자 페이지(간단 보호)</div>
          <div className="text-sm text-gray-600">(추후 기능 추가)</div>
          <div className="flex justify-end mt-3"><button className="px-3 py-2" onClick={onClose}>닫기</button></div>
        </div>
      )}
    </div>
  )
}
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
