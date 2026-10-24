// Session transitions live outside the HTTP server so they can be tested offline.

// Track which sockets hold a seat in each session, keyed by the session object
// itself so `sessions` keeps storing plain { users, maxUsers } records.
const membersBySession = new WeakMap()

function getMembers(session) {
  let members = membersBySession.get(session)
  if (!members) {
    members = new Set()
    membersBySession.set(session, members)
  }
  return members
}

export function createSession(sessions, sessionId, maxUsers) {
  const session = { users: 0, maxUsers }
  sessions.set(sessionId, session)
  membersBySession.set(session, new Set())
  return session
}

export function joinSession(sessions, room, socketId) {
  const session = sessions.get(room)
  if (!session) return { error: "Session not found" }
  const members = getMembers(session)
  if (members.has(socketId)) return { session }
  if (session.users >= session.maxUsers) return { error: "Session is full" }

  members.add(socketId)
  session.users++
  return { session }
}

export function leaveSession(sessions, room, socketId) {
  const session = sessions.get(room)
  if (!session) return null

  const members = membersBySession.get(session)
  if (members && members.delete(socketId)) {
    session.users = Math.max(0, session.users - 1)
  }
  if (session.users === 0) sessions.delete(room)
  return session
}
