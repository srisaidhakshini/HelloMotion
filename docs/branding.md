# HelloMotion brand assets

The approved second logo concept uses a coral, violet, and mint folded ribbon that suggests a butterfly in flight and a subtle lowercase m. The emblem represents movement turning into something playful.

## Files

| Asset | Use |
| --- | --- |
| [hellomotion-logo.png](../app/assets/hellomotion-logo.png) | Original approved logo with the HelloMotion wordmark, on a transparent background. |
| [hellomotion-icon.png](../app/assets/hellomotion-icon.png) | Symbol-only transparent PNG for the app header, camera placeholder, and favicon. |
| [hellomotion-icon.ico](../app/assets/hellomotion-icon.ico) | Windows app, installer, uninstaller, and installed shortcut icon. Contains 16, 24, 32, 48, 64, 128, and 256 pixel images. |

Preserve the emblem's proportions, gradient colours, and transparent background. Use the symbol at small sizes; keep the full wordmark for larger brand placements. These are raster assets, not editable vector originals.

## Integration

The Electron window and Windows build configuration reference the ICO. Executable resource editing is enabled so the compiled app contains the icon. NSIS uses the same asset for the installer and uninstaller. Existing installed shortcuts acquire the new executable icon after updating; an already-running app keeps its existing appearance until restarted.

## Creation record

Created with built-in image generation. The user approved the second concept. The symbol-only version was derived from that approved image with the wordmark removed; the PNG was then encoded into a standard multi-resolution Windows ICO.

### Approved concept prompt

```text
Tool: built-in image generation
Intent: preview-only logo concept; not applied to the app.

Use case: logo-brand. Design a genuinely distinctive, beautifully resolved brand logo for HelloMotion, a playful Windows app where hand gestures create magical animated video-call reactions. This is a completely fresh concept; DO NOT use a literal hand, a capital H, fingers, orbit rings, or a four-point sparkle. Visual idea: 'a little motion becomes something wonderful'. Design a compact, asymmetrical folded ribbon emblem that reads as an abstract butterfly taking flight and subtly suggests a lowercase m through its flowing negative space. Three or four broad, graceful interlocking ribbon folds; a small left coral wing, a larger violet-blue rising wing to the upper right, and a mint/turquoise fold curling below. Beautiful bespoke silhouette, purposeful folds, a sense of lightness and transformation. Precise vector-style edges with tasteful smoothly shaded gradients that reveal the ribbon folds, not heavy 3D or noisy texture. Premium modern creative-software identity, visually memorable and joyful, sculptural yet simple enough for a small app icon. Colours: saturated periwinkle violet #7665f5, warm coral #ff827d, soft turquoise #67d6c5, dark ink #23283e. Composition: one generous emblem centered above an expertly spaced custom rounded sans-serif wordmark reading exactly 'HelloMotion', capital H and M, dark ink. The wordmark should feel friendly and confident, not a generic office font. Comfortable breathing room, balanced complete vertical logo lockup, square output. Actual transparent background, not a mockup, no drop shadows, no app tile frame, no taglines, no explanation text, no decorative objects, no extra variants. Focus on an elegant original identity, not clipart. Make the ribbon design feel alive and carefully crafted.
```

### Icon adaptation prompt

```text
Tool: built-in image generation
Edit target: approved HelloMotion-logo-concept-v2.png

Edit the supplied approved HelloMotion logo only to create its app icon asset. Preserve EXACTLY the existing butterfly-like folded ribbon emblem, its silhouette, fold geometry, violet/periwinkle upper right wing, coral left wing and turquoise/mint lower folds, gradients and proportions. Remove only the 'HelloMotion' wordmark below it and remove any tiny stray edge specks. Do NOT redesign, reinterpret, add shapes, recolor, simplify, rotate or change the ribbon symbol. Place this same emblem optically centered on a square genuinely transparent canvas, sized to occupy about 80 percent of the square in width, leaving at least 10 percent clear padding on all edges. No lettering, no typography, no surrounding tile, no frame, no shadows, no backdrop. This is the exact approved design adapted for the Windows taskbar and desktop app icon, so visual identity fidelity matters most.
```
