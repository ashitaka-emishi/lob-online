# Product Guidelines: lob-online

## Voice and Tone

Technical and precise. UI text should use wargame terminology familiar to LOB players (e.g. "hex", "unit", "brigade", "turn"). Error messages should be direct and actionable.

## Design Principles

1. **Rules fidelity first** — game mechanics must match LOB v2.0 and SM errata exactly; gameplay correctness outweighs UX convenience.
2. **Simplicity over features** — scope each track tightly; no speculative features.
3. **Tested foundations** — no untested game logic lands in main; 70% line coverage minimum enforced.
4. **Data-driven** — game state lives in versioned JSON files validated by Zod; no hardcoded scenario data in application code.
5. **Dev-tool quality** — map/scenario editors are internal tools; polish matters less than accuracy and reliability.
