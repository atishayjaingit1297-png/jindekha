# Jin-Dekha ruleset (v1)

This is Jin-Dekha's own ruleset. It follows the familiar taboo-style format, but it doesn't claim to copy any other app's exact rules. Every value marked *configurable* can be changed on the setup screen. All of them live in one place: `src/core/rules.ts` (`DEFAULT_RULES`, `pointsFor`).

## Terms

- **Turn**: one team describes cards until its timer runs out.
- **Round**: every team has played one turn.
- **Describer**: the player holding the phone. If player names were entered, the describer rotates within the team every time that team plays. Otherwise "anyone from the team" describes.

## Flow

1. **Ready.** The app shows whose turn it is and who describes. The timer has not started yet.
2. **Active turn.** The timer runs and one card is shown: the target word plus 4 forbidden words.
   - **सही (correct):** the team guessed the target. The next card appears.
   - **छोड़ें (skip):** the next card appears.
   - **मना शब्द (violation):** the describer said the target or a forbidden word. The card is discarded and the next one appears.
3. **Time up.** The card still on screen is recorded as **समय गया (time up)** and scores nothing.
4. **Review.** Players can fix a mis-tap by choosing a different outcome for any card before confirming. Scores update immediately.
5. **Confirm.** Play passes to the next team. After the last team in a round, a **round summary** is shown (or the results, if the game is over).

Forbidden words are reported manually. The app doesn't listen to speech. The opposing team watches and calls it out, and the player holding the phone taps the button.

## Scoring (defaults)

| Event | Describing team | Other teams | Configurable |
|---|---|---|---|
| Correct | +1 | — | 1–10 |
| Skip | 0 | — | penalty 0–10 |
| Violation | −1 | 0 | penalty 0–10; optionally +penalty to **every** other team |
| Time up (card on screen) | 0 | — | — |

Scores can go negative. They are never stored as running totals. They are always recalculated from the recorded card results (`getScores`), so a review edit or a reload can't put them out of sync. One exception: if a content update removes a card, results for it are dropped from saved games.

Review edits respect the skip limit: a result can't be changed to "skip" if that would exceed the per-turn maximum.

## Other rules

| Rule | Default | Configurable |
|---|---|---|
| Turn length | 60 s | presets 30/45/60/90/120 s on the setup screen (the engine accepts 15–300 s) |
| Max skips per turn | unlimited | 0–20 or unlimited |
| Skipped cards come back later | off | on: a card skipped in a turn goes to the bottom of the pile when the turn is confirmed. It never repeats within the same turn |
| Game end | after 3 rounds | 1–20 rounds, **or** a target score of 5–200 |
| Teams | 2 | 2–6 |
| Decks | all | any non-empty selection |

- **Target-score games** end at the end of the round in which any team reaches the target. That way every team gets the same number of turns, as long as cards last.
- **Ties:** teams with equal scores share a rank. If the top score is shared, the result is shown as a tie. There is no sudden-death round in v1.
- **No repeats:** each card appears at most once per game, unless "skipped cards come back later" is on.
- **Deck exhausted:** if the pile runs out mid-turn, the turn ends. If it is empty when a turn would start, the game ends with the reason "all cards played", even mid-round. With 94 cards this is unlikely for 2–3 teams over 3 rounds of 60 s, but likely with many teams, long turns or many rounds.
- **End early:** players can end the game from the ready screen or the pause menu. Results already played are kept. The card on screen at that moment is not scored.
- **Turn order:** teams always rotate after each turn. Every team has a turn in each round. There is no "same team keeps playing" mode in v1.

## Timer behaviour

- Remaining time is computed from a stored deadline (`endsAt`) every 100 ms and on every render. It is never computed by counting ticks, so browser throttling can't make it drift.
- Leaving the app, locking the phone or closing the tab **pauses** the turn at that moment. The card is hidden while paused. Only the **जारी रखें** button resumes; Escape and taps outside the sheet don't.
- Ready, turn-summary and round-summary buttons are disabled for 0.4 s when their screen appears, so a double-tap can't skip a screen or start the next team's timer.
- After a reload or crash, a running turn comes back **paused** with the time it had at its last save.
- A tap that lands after the deadline does not score. The turn simply ends.
- Expiry is processed exactly once. Repeated time-up events are ignored by the engine.
