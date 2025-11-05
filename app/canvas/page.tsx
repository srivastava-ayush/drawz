"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CanvasComponent from "@/components/canvas-component"

function CanvasContent() {
  const searchParams = useSearchParams()
  const room = searchParams.get("room")
  const server = searchParams.get("server") ? decodeURIComponent(searchParams.get("server")!) : "http://localhost:4000"

  if (!room) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-50 mb-4">Invalid Session</h1>
          <p className="text-slate-400 mb-6">No room ID provided</p>
          <a href="/" className="text-blue-400 hover:text-blue-300">
            Back to home
          </a>
        </div>
      </main>
    )
  }

  return <CanvasComponent room={room} serverAddress={server} />
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <CanvasContent />
    </Suspense>
  )
}
