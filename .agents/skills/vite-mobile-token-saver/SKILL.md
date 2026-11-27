---
name: vite-mobile-token-saver
description: Optimize token usage and enforce mobile-first web development standards in Vite projects. Use for UI implementation, responsive styling, component edits, and Vite build/dev tasks.
---

# 1. Token-Saving Workflow

- **Targeted Reads:** Read only relevant component/style sections (`sed -n`, `head`, `tail`) instead of full files. Never read lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`), `dist/`, `node_modules/`, or `.vite/`.
- **Scoped Search:** Use `rg` restricted to `src/` and `public/`. Ignore SVGs, base64 assets, and minified files.
- **Minimal Output:** Return only modified code blocks, unified diffs, or specific JSX/CSS snippets—never rewrite untouched parts of a file.
- **Concise Explanations:** Limit explanations to max 3 short bullet points unless deep architectural review is requested.
- **Quiet Commands:** Run targeted checks (e.g., `npx tsc --noEmit` or single-file tests) and report only error lines, omitting passing logs.

# 2. Vite Project Conventions

- Keep `vite.config.*` clean; avoid adding heavy plugins unless requested.
- Use Vite's native asset imports and `import.meta.env` instead of Node-specific globals (`process.env`).
- Prefer lazy loading (`React.lazy` / dynamic `import()`) for heavy routes or modals to keep initial mobile bundle small.

# 3. Mobile-First Web Standards

- **Layout & Viewport:** Design mobile-first (`375px`–`430px` baseline) before scaling up (`sm:`, `md:`, `lg:`). Use `dvh`/`svh` instead of `100vh` to prevent mobile browser bar clipping.
- **Touch & Ergonomics:** Keep interactive targets at least `44x44px` with `8px+` spacing. Place primary actions within thumb reach (bottom/lower-middle screen).
- **Performance & Assets:** Prefer modern CSS (Flexbox/Grid, `clamp()`, container queries) over JS resize listeners. Enforce `loading="lazy"` and explicit `width`/`height` on images to avoid CLS.
- **Forms & Input:** Set proper mobile `inputmode`, `type` (`tel`, `email`, `numeric`), and `autocomplete` attributes; keep input font-size `>= 16px` to prevent iOS auto-zoom.
