"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const [serverAddress, setServerAddress] = useState("http://localhost:4000")
  const [sessionId, setSessionId] = useState("")
  const [maxUsers, setMaxUsers] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreateSession = async () => {
    try {
      setLoading(true)
      setError("")

      if (!serverAddress.trim()) {
        setError("Please enter a server address")
        setLoading(false)
        return
      }

      const newSessionId = Math.random().toString(36).substring(2, 15)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${serverAddress}/api/sessions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newSessionId, maxUsers: Math.max(1, Math.min(10, maxUsers)) }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) throw new Error("Failed to create session")

      router.push(`/canvas?room=${newSessionId}&server=${encodeURIComponent(serverAddress)}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.name === "AbortError"
            ? "Connection timeout. Check server address."
            : err.message
          : "Failed to create session",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleJoinSession = async () => {
    try {
      setLoading(true)
      setError("")

      if (!sessionId.trim()) {
        setError("Please enter a session ID")
        setLoading(false)
        return
      }

      if (!serverAddress.trim()) {
        setError("Please enter a server address")
        setLoading(false)
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${serverAddress}/api/sessions/${sessionId}`, {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 404) {
        setError("Session not found")
        setLoading(false)
        return
      }

      if (!response.ok) throw new Error("Failed to join session")

      const data = await response.json()
      if (data.isFull) {
        setError("This session is full")
        setLoading(false)
        return
      }

      router.push(`/canvas?room=${sessionId}&server=${encodeURIComponent(serverAddress)}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.name === "AbortError"
            ? "Connection timeout. Check server address."
            : err.message
          : "Failed to join session",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700 bg-slate-800/90 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-white">✏️</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-50">Whiteboard</CardTitle>
            <CardDescription className="text-slate-400">Real-time collaborative drawing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Server Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Server Address</label>
              <Input
                placeholder="http://localhost:4000"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                disabled={loading}
                className="bg-slate-700/50 border-slate-600 text-slate-50 placeholder-slate-400"
              />
              <p className="text-xs text-slate-500">For LAN: use your machine IP (e.g., http://192.168.1.7:4000)</p>
            </div>

            {/* Create Session Section */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Max Users</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(Math.max(1, Number.parseInt(e.target.value) || 2))}
                  disabled={loading}
                  className="bg-slate-700/50 border-slate-600 text-slate-50"
                />
              </div>
              <Button
                onClick={handleCreateSession}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </div>

            {/* Join Session Section */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Session ID</label>
                <Input
                  placeholder="Enter session ID to join"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  disabled={loading}
                  className="bg-slate-700/50 border-slate-600 text-slate-50 placeholder-slate-400"
                />
              </div>
              <Button
                onClick={handleJoinSession}
                disabled={loading}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Session"
                )}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Help Text */}
            <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">How to use:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Create a session to start drawing</li>
                <li>Share the Session ID with others to collaborate</li>
                <li>All changes sync in real-time across all users</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
