import React from 'react'

export default function SideDrawer({ open, onClose, onAdmin }: { open: boolean; onClose: ()=>void; onAdmin: ()=>void }){
  return (
    <div className={`${open? 'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30 transform transition-transform`}> 
      <div className="p-4">
        <h3 className="text-lg font-semibold">워크숍 회차</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>2026.06.01 - 세션 A</li>
          <li>2025.05.12 - 세션 B</li>
        </ul>
        <div className="mt-6">
          <button className="bg-green-700 text-white px-3 py-2 rounded" onClick={onAdmin}>관리자</button>
        </div>
        <div className="mt-4">
          <button className="text-sm text-gray-500" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
