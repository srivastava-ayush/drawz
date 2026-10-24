// Session transitions live outside the HTTP server so they can be tested offline.
export function createSession(sessions, sessionId, maxUsers) {
  const session = { users: 0, maxUsers }
  sessions.set(sessionId, session)
  return session
}

export function joinSession(sessions, room, socketId) {
  const session = sessions.get(room)
  if (!session) return { error: "Session not found" }
  if (session.users >= session.maxUsers) return { error: "Session is full" }

  session.users++
  return { session }
}

export function leaveSession(sessions, room, socketId) {
  const session = sessions.get(room)
  if (!session) return null

  session.users = Math.max(0, session.users - 1)
  if (session.users === 0) sessions.delete(room)
  return session
}
