import React from 'react'
import { recommendations } from '../lib/mockData'

export default function RecommendationsPage(){
  return (
    <div className="p-4 pt-20 max-w-xl mx-auto">
      <div className="space-y-3">
        {recommendations.map(r=> (
          <div key={r.id} className="p-3 bg-white rounded shadow-sm flex items-center">
            <div className="flex-1">
              <div className="text-xs text-green-700">{r.tag}</div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-gray-500">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
