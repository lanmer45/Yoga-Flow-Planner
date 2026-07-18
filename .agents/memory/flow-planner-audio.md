---
name: Flow Planner chime / mobile audio
description: Why the runner chime can be silent on iPhone and how audio unlock is set up
---

The Runner chime is synthesized with the Web Audio API (a shared AudioContext),
not an `<audio>` element.

**iOS "volume up but no sound" gotcha:** iOS silences Web Audio whenever the
physical ring/silent switch is on — regardless of the volume level. Calling
`ctx.resume()` inside a user gesture is NOT enough to override this. Two things
are needed, both triggered from a real gesture (Play / Skip → `unlockAudio()`):
- `navigator.audioSession.type = "playback"` (Safari 16.4+, enabled by default
  in 17) declares the page as primary media so audio plays with the switch on.
  Guard it in try/catch — the API is `undefined` off Safari (no-op on
  Android/desktop).
- Start a 1-sample silent `AudioBufferSource` inside the gesture; some iOS
  versions only fully unlock the context after an actual sound starts.

**Decision — "playback" vs "transient":** we use `"playback"` to prioritize the
chime always being audible (the user's explicit complaint was inaudible chimes).
**Why:** guaranteeing the chime beats mixing politeness for a yoga timer.
**Trade-off / how to apply:** a `"playback"` session is non-mixable on iOS — the
first sound (including the silent unlock buffer on the first Play tap) PAUSES the
user's background music/podcast. If a user wants their own music to keep playing,
switch `primeAudioSession()` to `type = "transient"` (mixes/ducks instead of
pausing) and re-test the mute-switch case on a real device — transient's
mute-switch-override behavior is less documented, so it must be phone-verified.
On iOS < 16.4 the API doesn't exist, so the switch still mutes the chime there —
nothing more can be done via Web Audio.
