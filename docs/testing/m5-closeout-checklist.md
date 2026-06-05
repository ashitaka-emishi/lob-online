# M5 Manual Verification Checklist

Use this checklist to confirm all M5 surfaces are working before closing the milestone.
Run against the local dev environment (`npm run dev` / `npm start`).

---

## Setup

- [ ] `npm start` starts the server on port 3000 with no errors
- [ ] `npm run dev` starts the Vite client on port 5173 with no errors
- [ ] Server log shows `[server] listening on port 3000`

---

## Lobby — Create and Join

- [ ] Navigate to `http://localhost:5173` → redirects to `/lobby`
- [ ] Click **Create Game** → game appears in the lobby list
- [ ] Open a second browser tab, navigate to `/lobby`
- [ ] Click **Join** on the created game → both tabs redirect to `/games/:id`

---

## GameView — Map and Counters

- [ ] `GameView` loads without a white screen or console errors
- [ ] The South Mountain map image renders in the map viewport
- [ ] Unit counters appear on the map at their starting hex positions
- [ ] Counters are sized and positioned correctly (no obvious off-grid drift)

---

## UnitStatsPanel

- [ ] Click a unit counter on the map
- [ ] `UnitStatsPanel` in the sidebar updates to show that unit's stats
  - Unit name / id is displayed
  - `moraleState`, `orders`, `ammo` fields are visible
- [ ] Click elsewhere (deselect) → panel clears or shows placeholder

---

## ActionPanel

- [ ] `ActionPanel` renders in the sidebar below `UnitStatsPanel`
- [ ] Turn, phase, and step are displayed (e.g. "Turn 1 — command (initiative)")
- [ ] If it is the local player's turn, action buttons are rendered
- [ ] Buttons are not `disabled` — they use `aria-disabled` only
- [ ] If `END_PHASE` is in `validActions`, clicking it submits the action
  - A spinner appears on the button while the request is in flight
  - After response, the phase/step line updates to reflect the new state

---

## Socket.io State Refresh

- [ ] After submitting an action in one tab, the second tab's `ActionPanel`
      and phase line update without a manual refresh
  - `game:state-updated` event triggers `refreshGame` + `refreshValidActions`

---

## Error States

- [ ] Navigate to `/games/nonexistent-id` → shows an error message (not a blank screen)
- [ ] Disconnect the server while on GameView → client degrades gracefully (no crash)

---

_Last updated: 2026-06-05. Covers M5 deliverables per `docs/milestones/m5-closeout.md`._
