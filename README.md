# CINDER & STONE — Urban Bathhouse

**Live:** https://cindorandstone.vercel.app

Website designed & built by [kookyweb](https://kookyweb.vercel.app) — bathhouse with a **real-time 3D cairn**.

**Wow moments**
- Preloader, custom cursor, magnetic buttons, progress bar
- Three.js cairn of procedurally sculpted basalt stones glowing from an ember light beneath, fbm-shader steam and rising embers; the stack drifts apart as you scroll
- Manifesto line that de-blurs word by word
- Pinned 4-step ritual with clip-path photo wipes, per-step progress lines and a live temperature counter (85° → 8° → 45° → 22°)
- Bathing menu rows fill on hover while a photo preview trails the cursor

Static site, no build step — deploy on Vercel with preset **Other**. GSAP + ScrollTrigger + Lenis + Three.js 0.160 via CDN. Photos via Unsplash.

## Built with Claude

I made this site with [Claude](https://claude.ai) by Anthropic as my coding partner. I described the brand, the look and the animations I wanted, and Claude helped write and refine the code while I directed the design and reviewed every step.

## Run locally

No build step. Serve the folder with any static server, for example:

```bash
npx serve .
```

