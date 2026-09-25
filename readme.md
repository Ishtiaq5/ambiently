# Ambiently — Premium Focus Sound Mixer

A single-page, browser-native sound mixer for deep work. Six living ambiences
(rain, ocean, fire, wind, night, cafe) are synthesised in real time with the
Web Audio API — no audio files, no CDN, no build step.

## Features

- Six ambiences built from filtered white / pink / brown noise
- Per-sound volume faders with smooth gain ramping
- Four tuned one-tap presets (Deep Focus, Rainy Night, Coastal Calm, Fireplace)
- Fire crackle bursts and slow LFO modulation so nothing loops identically
- Animated visualiser bars driven by `requestAnimationFrame`
- Dark premium aesthetic: gradient headline, glow accents, glassmorphism
- Responsive from 360px up, semantic HTML with ARIA roles, reduced-motion aware

## Stack

Vanilla HTML, CSS and JavaScript. No frameworks, no dependencies, no backend.

## Run

Open `index.html` in any modern browser, then press **Start listening**
(browsers require a user gesture before audio can start).

## Structure

```
index.html
css/styles.css
js/main.js
```
