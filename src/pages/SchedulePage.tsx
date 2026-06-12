import React from 'react'
import { sessions } from '../lib/mockData'

export default function SchedulePage(){
  const day1 = sessions.slice(0, 7)
  const day2 = sessions.slice(7)

  return (
    <div className="p-4 pt-20 max-w-xl mx-auto">
      {[day1, day2].map((items, index) => (
        <section key={index} className="mb-4 space-y-3">
          <h2 className="font-bold">{index + 1}일차</h2>
          {items.map(s=> (
            <div key={s.id} className="p-3 bg-white rounded shadow-sm">
              <div className="whitespace-nowrap text-sm text-gray-500">{s.time}</div>
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-gray-500">{s.desc}</div>
              <div className="text-xs text-gray-400">장소: {s.place}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
