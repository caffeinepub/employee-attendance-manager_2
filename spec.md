# Employee Attendance Manager

## Current State
Login page shows "Connecting to server..." based on whether the JS actor object is created. However, creating the actor object does not verify the backend canister is actually responding. If login is attempted right after the actor is created but before the canister is ready, any backend error (network, canister cold-start, etc.) surfaces as "Invalid username or password."

## Requested Changes (Diff)

### Add
- `ping` query function to backend that simply returns `true`
- Actor readiness check in `useActor`: after actor is created, call `ping()` to confirm backend is responsive; only mark actor as ready once ping succeeds

### Modify
- `useActor` hook: add ping verification step so `actor` is only non-null when the backend has confirmed it is reachable
- `LoginPage`: distinguish between credential errors and connection/unexpected errors with clearer messages

### Remove
- Nothing

## Implementation Plan
1. Add `public query func ping() : async Bool` to `src/backend/main.mo`
2. Update `useActor.ts` to call `actor.ping()` after creation and only return a ready actor on success, retrying on failure
3. Update `LoginPage.tsx` error handling to show "Connection error, please try again" for non-credential errors
