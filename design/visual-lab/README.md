# Chronicle Visual Lab

The first implementation of [`../05-visual-reset.md`](../05-visual-reset.md): one React vertical
slice using the real Andaria map and Eron figures, with the map as the stage and the interface as
floating instruments.

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Production check:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Deterministic states:

- `/` — concealed threshold;
- `/?moment=reveal` — revealed result, before canon confirmation;
- `/?moment=minted` — minted paragraph.

The marker, the right-hand action or the `R` key starts the reveal. Role and display axes sit in
the top bar. The settings dialog controls campaign art, reduced motion and high contrast.

## Evidence

- [`artifacts/desktop-idle.png`](artifacts/desktop-idle.png)
- [`artifacts/desktop-reveal.png`](artifacts/desktop-reveal.png)
- [`artifacts/mobile-idle.png`](artifacts/mobile-idle.png)
- [`artifacts/mobile-reveal.png`](artifacts/mobile-reveal.png)

The screenshots are captured through
[`scripts/capture.mjs`](scripts/capture.mjs), which sets exact browser device metrics through the
Chrome DevTools Protocol. The mobile evidence records a real `390 × 844` CSS viewport.

## What this proves

- a React 19 composition can make the real Eron map the dominant surface;
- the concealed and revealed states have materially different staging;
- the context lens can preview who learns what without becoming a permanent spreadsheet;
- the same slice composes at 1600×1000 and 390×844;
- missing portraits, reduced motion, high contrast and art-off are designed states;
- the reveal, roll result and human canon confirmation are distinct interactions.

## What this does not prove

- no server, persistence, multiplayer or permission boundary;
- no Pixi frame or `MapRenderer` implementation — this lab uses a DOM image to settle visual
  hierarchy before the renderer is built;
- no tile streaming, fog calculation or GPU performance result;
- no sound design despite the sound control being present;
- no claim that this exploratory component tree is production architecture.
