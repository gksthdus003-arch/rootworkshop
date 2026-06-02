import React from 'react'

export default function MapPage(){
  return (
    <div className="p-4 pt-20 max-w-xl mx-auto">
      <div className="bg-green-50 rounded-lg h-96 flex items-center justify-center text-green-700">지도 영역 (모형)</div>
      <div className="mt-4">
        <label className="inline-flex items-center"><input type="checkbox" className="mr-2"/> 장소 이름 표시</label>
      </div>
    </div>
  )
}
