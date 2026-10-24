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

test("an invalid capacity is rejected without creating a room", () => {
  const sessions = new Map()

  for (const capacity of ["not-a-number", null, 0, -1, 2.5]) {
    let result = null
    try {
      result = createSession(sessions, "room-invalid", capacity)
    } catch {
      // Throwing is also an acceptable way to reject the request.
    }

    // A rejection may be signalled by a falsy result or an error object; the
    // one thing that must never happen is a stored, usable session returned.
    const usableSession =
      result != null &&
      typeof result === "object" &&
      "users" in result &&
      sessions.get("room-invalid") === result

    assert.ok(!usableSession, `capacity ${JSON.stringify(capacity)} must be rejected`)
    assert.equal(
      sessions.has("room-invalid"),
      false,
      `capacity ${JSON.stringify(capacity)} must not create a room`,
    )
  }
})

test("a valid capacity still enforces the room limit", () => {
  const sessions = new Map()
  createSession(sessions, "room-1", 2)
  assert.equal(joinSession(sessions, "room-1", "socket-a").session.users, 1)
  assert.equal(joinSession(sessions, "room-1", "socket-b").session.users, 2)
  assert.equal(joinSession(sessions, "room-1", "socket-c").error, "Session is full")
})
