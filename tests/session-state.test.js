import assert from "node:assert/strict"
import test from "node:test"
import { createSession, joinSession, leaveSession } from "../scripts/session-state.js"

test("creating a room starts with zero users and the requested capacity", () => {
  const sessions = new Map()
  const session = createSession(sessions, "room-1", 2)
  assert.deepEqual(session, { users: 0, maxUsers: 2 })
  assert.equal(sessions.get("room-1"), session)
})

test("a socket can join and leave a room", () => {
  const sessions = new Map()
  createSession(sessions, "room-1", 2)
  assert.equal(joinSession(sessions, "room-1", "socket-a").session.users, 1)
  assert.equal(leaveSession(sessions, "room-1", "socket-a").users, 0)
  assert.equal(sessions.has("room-1"), false)
})

test("a missing or full room rejects a join", () => {
  const sessions = new Map()
  assert.equal(joinSession(sessions, "missing", "socket-a").error, "Session not found")
  createSession(sessions, "room-1", 1)
  joinSession(sessions, "room-1", "socket-a")
  assert.equal(joinSession(sessions, "room-1", "socket-b").error, "Session is full")
})

test("a duplicate session ID is rejected without resetting the active room", () => {
  const sessions = new Map()
  createSession(sessions, "room-1", 2)
  joinSession(sessions, "room-1", "socket-a")

  const duplicate = createSession(sessions, "room-1", 5)

  assert.ok(duplicate && duplicate.error, "duplicate create should be rejected")
  assert.deepEqual(sessions.get("room-1"), { users: 1, maxUsers: 2 })
})
