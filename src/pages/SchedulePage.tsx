import React from 'react'
import { sessions } from '../lib/mockData'

export default function SchedulePage(){
  return (
    <div className="p-4 pt-20 max-w-xl mx-auto">
      <div className="space-y-3">
        {sessions.map(s=> (
          <div key={s.id} className="p-3 bg-white rounded shadow-sm">
            <div className="text-sm text-gray-500">{s.time}</div>
            <div className="font-medium">{s.title}</div>
            <div className="text-xs text-gray-400">장소: {s.place}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
