import React from 'react'

export default function TopBar({ current }: { current?: string }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur z-20 shadow-sm">
      <div className="max-w-xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-green-700 font-medium">현재 세션</div>
          <div className="text-xs text-gray-600">종료까지 24분</div>
        </div>
      </div>
    </div>
  )
}
