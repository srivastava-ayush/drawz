"use client"

import { useEffect, useRef, useState } from "react"
import io, { type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Users, Home, Trash2, Copy, Check } from "lucide-react"
import Link from "next/link"

interface DrawingEvent {
  x0: number
  y0: number
  x1: number
  y1: number
  color: string
  size: number
  tool: "brush" | "eraser"
}

export default function CanvasComponent({ room, serverAddress }: { room: string; serverAddress: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const dprRef = useRef(1)

  const [color, setColor] = useState("#FFFFFF")
  const [brushSize, setBrushSize] = useState(2)
  const [tool, setTool] = useState<"brush" | "eraser">("brush")
  const [userCount, setUserCount] = useState(0)
  const [maxUsers, setMaxUsers] = useState(0)
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      ctx.fillStyle = "#1e293b"
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    let socketUrl = serverAddress.trim()
    if (!socketUrl.startsWith("http://") && !socketUrl.startsWith("https://")) {
      socketUrl = `http://${socketUrl}`
    }
    // Remove trailing slash if present
    socketUrl = socketUrl.replace(/\/$/, "")

    console.log("[v0] Connecting to server:", socketUrl)

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      transports: ["websocket", "polling"],
      forceNew: false,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("[v0] ✅ Socket connected:", socket.id)
      setConnected(true)
      socket.emit("join", { room })
    })

    socket.on("connect_error", (error) => {
      console.error("[v0] ❌ Connection error:", error.message)
      setConnected(false)
    })

    socket.on("disconnect", (reason) => {
      console.log("[v0] ❌ Socket disconnected:", reason)
      setConnected(false)
    })

    socket.on("room-info", (data: { users: number; maxUsers: number }) => {
      console.log("[v0] Room info updated:", data)
      setUserCount(data.users)
      setMaxUsers(data.maxUsers)
    })

    socket.on("draw", (data: DrawingEvent) => {
      console.log("[v0] Drawing received from remote user")
      drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.tool, dpr)
    })

    socket.on("clear", () => {
      console.log("[v0] Canvas cleared")
      const rect = canvas.getBoundingClientRect()
      ctx.fillStyle = "#1e293b"
      ctx.fillRect(0, 0, rect.width, rect.height)
    })

    socket.on("error", (error: string) => {
      console.error("[v0] Socket error:", error)
    })

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // Only left click
      isDrawingRef.current = true
      const rect = canvas.getBoundingClientRect()
      lastPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleMouseUp = () => {
      isDrawingRef.current = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const x0 = lastPosRef.current.x
      const y0 = lastPosRef.current.y
      lastPosRef.current = { x, y }

      const drawColor = tool === "eraser" ? "#1e293b" : color
      drawLine(ctx, x0, y0, x, y, drawColor, brushSize, tool, dpr)

      socket.emit("draw", {
        x0,
        y0,
        x1: x,
        y1: y,
        color: drawColor,
        size: brushSize,
        tool,
      })
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseUp)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseUp)
      window.removeEventListener("resize", resizeCanvas)
      socket.disconnect()
    }
  }, [room, serverAddress, color, brushSize, tool])

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    size: number,
    toolType: "brush" | "eraser",
    dpr: number,
  ) => {
    ctx.lineWidth = size
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (toolType === "eraser") {
      ctx.clearRect(x0 - size / 2, y0 - size / 2, size, size)
      ctx.clearRect(x1 - size / 2, y1 - size / 2, size, size)
    } else {
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = dprRef.current
    const rect = canvas.getBoundingClientRect()

    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, rect.width, rect.height)
    socketRef.current?.emit("clear")
  }

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(room)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full bg-slate-800" />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-3 bg-slate-900/90 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-lg">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-300">Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={tool === "eraser"}
            className="w-8 h-8 rounded cursor-pointer disabled:opacity-50 transition-opacity"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-300">Size:</label>
          <span className="text-xs text-slate-400 w-6">{brushSize}px</span>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
            className="w-24"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setTool("brush")}
            variant={tool === "brush" ? "default" : "outline"}
            size="sm"
            className={tool === "brush" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300"}
          >
            Brush
          </Button>

          <Button
            onClick={() => setTool("eraser")}
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            className={tool === "eraser" ? "bg-red-600 hover:bg-red-700" : "border-slate-600 text-slate-300"}
          >
            Eraser
          </Button>

          <Button
            onClick={handleClear}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-red-900/20 bg-transparent"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-between items-center gap-3 bg-slate-900/90 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Room:</span>
            <span className="font-mono text-sm text-blue-400">{room}</span>
            <button
              onClick={handleCopyRoom}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Copy room ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users className="w-4 h-4" />
            <span>
              {userCount}/{maxUsers}
            </span>
            <span className={`w-2 h-2 rounded-full transition-colors ${connected ? "bg-green-500" : "bg-red-500"}`} />
          </div>
        </div>

        <Link href="/">
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 bg-transparent">
            <Home className="w-4 h-4 mr-1" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
