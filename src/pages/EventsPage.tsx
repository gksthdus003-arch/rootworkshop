import React from 'react'
import { events } from '../lib/mockData'

export default function EventsPage(){
  return (
    <div className="p-4 pt-20 max-w-xl mx-auto">
      <div className="space-y-3">
        {events.map(e=> (
          <div key={e.id} className="p-4 bg-white rounded shadow-sm">
            <div className="text-xs text-gray-500">{e.status} · 종료까지 {e.endsIn}</div>
            <div className="font-medium mt-1">{e.title}</div>
            <div className="mt-3">
              <button className="bg-green-700 text-white px-3 py-2 rounded">참여하기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
