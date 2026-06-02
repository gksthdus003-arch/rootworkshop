import React from 'react'

type Tab = 'map' | 'schedule' | 'events' | 'reco'

export default function BottomTabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area z-20">
      <div className="max-w-xl mx-auto flex justify-between px-4 py-2">
        <button className={`flex-1 py-2 ${active==='map'?'text-green-700':''}`} onClick={()=>onChange('map')}>지도</button>
        <button className={`flex-1 py-2 ${active==='schedule'?'text-green-700':''}`} onClick={()=>onChange('schedule')}>일정</button>
        <button className={`flex-1 py-2 ${active==='events'?'text-green-700':''}`} onClick={()=>onChange('events')}>이벤트</button>
        <button className={`flex-1 py-2 ${active==='reco'?'text-green-700':''}`} onClick={()=>onChange('reco')}>추천</button>
      </div>
    </div>
  )
}
