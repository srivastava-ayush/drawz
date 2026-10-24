import express from "express"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import cors from "cors"
import os from "os"
import { createSession, joinSession, leaveSession } from "./session-state.js"

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
})

app.use(cors())
app.use(express.json())

const sessions = new Map()

// GET /api/sessions/:id - Check session status
app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) {
    return res.status(404).json({ error: "Session not found" })
  }
  res.json({
    sessionId: req.params.id,
    users: session.users,
    maxUsers: session.maxUsers,
    isFull: session.users >= session.maxUsers,
  })
})

// POST /api/sessions/create - Create new session
app.post("/api/sessions/create", (req, res) => {
  const { sessionId, maxUsers } = req.body
  if (!sessionId || !maxUsers) {
    return res.status(400).json({ error: "Missing required fields" })
  }
  createSession(sessions, sessionId, maxUsers)
  res.json({ sessionId, maxUsers })
})

// WebSocket events
io.on("connection", (socket) => {
  console.log("[v0] New connection:", socket.id)

  socket.on("join", (data) => {
    const { room } = data
    const session = sessions.get(room)

    console.log("[v0] Join attempt - Room:", room, "Session exists:", !!session)

    const result = joinSession(sessions, room, socket.id)
    if (result.error) {
      socket.emit("error", result.error)
      return
    }

    socket.join(room)
    console.log("[v0] User joined room:", room, "Total users:", session.users)

    // Notify all users in the room (including the joining user)
    io.to(room).emit("room-info", {
      users: session.users,
      maxUsers: session.maxUsers,
    })
  })

  socket.on("draw", (data) => {
    const rooms = Object.keys(socket.rooms).filter((r) => r !== socket.id)
    if (rooms.length > 0) {
      const room = rooms[0]
      console.log("[v0] Broadcasting draw to room:", room)
      io.to(room).emit("draw", data)
    }
  })

  socket.on("clear", () => {
    const rooms = Object.keys(socket.rooms).filter((r) => r !== socket.id)
    if (rooms.length > 0) {
      const room = rooms[0]
      console.log("[v0] Broadcasting clear to room:", room)
      io.to(room).emit("clear")
    }
  })

  socket.on("disconnecting", () => {
    const rooms = Object.keys(socket.rooms).filter((r) => r !== socket.id)
    rooms.forEach((room) => {
      const session = leaveSession(sessions, room, socket.id)
      if (session) {
        console.log("[v0] User disconnected from:", room, "Remaining users:", session.users)
        io.to(room).emit("room-info", {
          users: session.users,
          maxUsers: session.maxUsers,
        })
        if (session.users === 0) {
          console.log("[v0] Session deleted:", room)
        }
      }
    })
  })
})

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address
      }
    }
  }
  return "localhost"
}

const PORT = process.env.PORT || 4000
const LOCAL_IP = getLocalIP()

server.listen(PORT, "0.0.0.0", () => {
  console.log("")
  console.log("===============================================")
  console.log("[v0] 🎨 Whiteboard Server Running")
  console.log("===============================================")
  console.log(`[v0] Local (same machine): http://localhost:${PORT}`)
  console.log(`[v0] LAN (other machines): http://${LOCAL_IP}:${PORT}`)
  console.log("===============================================")
  console.log("")
})
