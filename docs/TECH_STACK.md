# Tachyon Lab Tech Stack (performance-first)

**Decided 8 Nov 2026.** Versions are the current majors as of this date; pin exact versions in the lockfile.

## 0. Where performance actually comes from in this app

A physics simulator is not a typical web app. A frame does three things:

1. **Solver step(s):** FFTs, ODE steps, matrix-vector work on arrays of 10³–10⁵ numbers.
2. **Drawing:** pushing those arrays to pixels.
3. **UI:** sliders, readouts, panels. This updates a few times per second at most.

So the stack is chosen in that order of importance:

- Compute goes to **Rust → WebAssembly (SIMD)** in a **Web Worker**.
- Drawing goes to the **GPU (WebGL2 now, WebGPU later)** on an **OffscreenCanvas** inside that same worker, so data never crosses threads per frame.
- The UI framework only has to be small and fine-grained, because it never touches the per-frame data path.

## 1. The stack

| Layer                        | Choice                                                                                                                                                                                                        | Why this over the alternatives                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Physics core**             | **Rust (stable) → `wasm32-unknown-unknown`** with **SIMD128** enabled, `f64` everywhere                                                                                                                       | Predictable speed with no GC pauses, real SIMD, and native `cargo test` for fast physics validation. Rust is also a pleasant language for numerical code. WASM SIMD is supported in all current browsers. |
| WASM bindings                | **wasm-bindgen** + **wasm-opt** (Binaryen), driven by a small `build-wasm` script                                                                                                                             | The rustwasm org was sunset in 2025. wasm-bindgen continues under its own org, and wasm-pack is now a thin, individually maintained wrapper, so call the three tools directly.                            |
| Numerics you write           | FFT (radix-2/4, then split-radix), RK4, velocity Verlet, symplectic Yoshida-4, symmetric tridiagonal eigensolver, split-step & Crank–Nicolson TDSE, 2×2 complex linalg, Kraus maps                            | You learn the methods by writing them. They're also small enough to optimize by hand.                                                                                                                     |
| Test oracles (dev-deps only) | **rustfft**, **nalgebra**, **approx**, **proptest**; **criterion** for benchmarks                                                                                                                             | Your code is checked against trusted libraries without shipping them.                                                                                                                                     |
| **Threading**                | One **dedicated Worker per active simulation**: owns the WASM instance, the solver loop and the plot canvas                                                                                                   | The main thread stays free for input. Per-frame data stays inside the worker.                                                                                                                             |
| Shared state                 | **SharedArrayBuffer** ring for live readouts and params (needs COOP/COEP headers); **Comlink** for control RPC                                                                                                | Zero-copy readouts, and simple typed calls for start/stop/reset.                                                                                                                                          |
| **2D plots (real-time)**     | **Custom WebGL2 renderer on OffscreenCanvas**: instanced line strips, phase-colored                                                                                                                           | ψ                                                                                                                                                                                                         | ² fill, heatmaps (for the 2D solver later) | About 300–500 lines you own. Draws any N in under 1 ms, and the cyclic phase colormap is just a shader. |
| 2D plots (static/analysis)   | **uPlot**                                                                                                                                                                                                     | The fastest Canvas chart library, ~50 KB. Used for T(E), resonance curves and energy-drift plots, which don't redraw every frame.                                                                         |
| **3D**                       | **Three.js** (`WebGLRenderer`) via **Threlte 8**                                                                                                                                                              | Bloch sphere, orbits, double pendulum. Threlte's docs still advise against WebGPU in production, so switch to `WebGPURenderer` later; it falls back to WebGL2.                                            |
| GPU compute (v1.5)           | **Raw WebGPU + WGSL** compute shaders, WebGL2/WASM fallback                                                                                                                                                   | Planned for the 2D TDSE. WebGPU ships in Chrome/Edge and Safari 26; Firefox is partial, so a fallback is required.                                                                                        |
| **UI framework**             | **Svelte 5** (runes)                                                                                                                                                                                          | Compiles to small direct DOM updates with no virtual DOM. Benchmarks place it near vanilla JS with the smallest bundles, and it needs less code than React for a solo builder.                            |
| App framework                | **SvelteKit** + `adapter-static` (fully prerendered)                                                                                                                                                          | File-based routes (one per module), per-route code splitting, docs pages prerendered to static HTML.                                                                                                      |
| Build                        | **Vite+** (`vp` CLI) on **Vite 8** (Rolldown bundler, Oxc transforms)                                                                                                                                                                 | Rust-based; production builds are ~10–30× faster than Vite 7 (vendor figure; independent test: ~13×). Native worker and `.wasm` imports. Vite+ puts dev, build, lint, format and test behind one `vp` command.                                                                  |
| Package manager              | **pnpm** workspaces                                                                                                                                                                                           | Fast, strict, disk-efficient; standard for monorepos.                                                                                                                                                     |
| Language (UI)                | **TypeScript** (strict), with types generated from Rust (`tsify` / wasm-bindgen typings)                                                                                                                      | One source of truth for parameter types.                                                                                                                                                                  |
| Param schema                 | **Valibot**                                                                                                                                                                                                   | Tree-shakes to a few KB, much smaller than Zod. One schema drives sliders, URL parsing, validation and migrations.                                                                                        |
| URL state                    | Native **CompressionStream("deflate-raw")** + base64url in the hash, schema-versioned                                                                                                                         | No dependency; built into every current browser.                                                                                                                                                          |
| Styling                      | **Tailwind CSS v4** (Vite plugin) + CSS custom properties for themes (light default, dark via OS or toggle). Fonts: **Outfit** (UI) and **Geist Mono** (numbers), self-hosted via Fontsource                                                                                                                                          | Zero-runtime CSS; very fast engine; easy dark mode. Fonts are self-hosted because the COEP `require-corp` header blocks third-party font CSS.                                                                                                                                                       |
| UI primitives                | **Bits UI** (headless, accessible Svelte components), **added when a component needs it**; native controls (range, select) until then                                                                                                                                                          | Accessible sliders, tabs and dialogs, keyboard-operable by default.                                                                                                                                       |
| Equations                    | **KaTeX**: prerendered at build time for docs (via **mdsvex** + rehype-katex); runtime only for live equations                                                                                                | No math-rendering cost on page load.                                                                                                                                                                      |
| Lesson content (Learn track) | **unified** (remark-parse, remark-math, remark-gfm, remark-rehype with raw HTML, **rehype-raw**, **rehype-katex**, rehype-stringify) run at build time in `+page.server.ts`; lessons are Markdown files with YAML frontmatter validated by **Valibot**, loaded with `import.meta.glob`. Raw HTML (`<details>`) is allowed because lesson files are trusted repo content | Zero client JS and no KaTeX in the browser bundle; lessons stay portable Markdown. Adopt **mdsvex** later, only when a lesson needs an embedded live simulation. |
| Docs / lab notebook          | **mdsvex** (Markdown + Svelte components)                                                                                                                                                                     | Notebook entries can embed live mini-simulations.                                                                                                                                                         |
| Spaced review           | **ts-fsrs** (FSRS scheduler); review state kept locally in **IndexedDB** (every read and write wrapped in try/catch; the app must work without it) | Best-supported scheduling algorithm, tiny, no backend or accounts. |
| Experiment log          | IndexedDB, same wrapper; Markdown export built in the browser | Local-only, matches the no-accounts goal. |
| Offline                | **Service worker** precaching the static site and WASM; cached responses must keep the COOP/COEP headers | Works offline and installs to a home screen; check that cross-origin isolation survives the cache. |
| Sonification            | **Web Audio API** (an oscillator whose pitch follows the plotted value) | No dependency; opt-in. |
| Lesson figures          | The Rust/WASM core run **in Node at build time** (a `wasm-bindgen --target nodejs` build, or the web build loaded under Node) writes static SVG plots | A figure can never disagree with the simulation, and each is a tested artifact. `scripts/build-wasm.mjs` currently builds only the web target. |
| Lint / format                | **Vite+** `vp check` (Oxlint + Oxfmt, type-aware) + **svelte-check** + **clippy** / **rustfmt**                                                                                                      | Rust-based and fast; one command for lint, format and type checks, part of the same Vite+ toolchain as build and test.                                                                                                |
| Tests                        | **cargo test** (physics, native speed) · **Vitest** via `vp test` (TS unit) · **Vitest browser mode** + Playwright provider (WebGL screenshots, visual regression) · **Python/NumPy/SciPy** golden data in `/reference` | Physics is checked natively, rendering in a real browser, and results against an independent implementation.                                                                                              |
| Benchmarks                   | **criterion** (native) + an in-app `/bench` page (WASM in the browser, reports ms/step)                                                                                                                       | Performance budgets are tested, not hoped for.                                                                                                                                                            |
| CI                           | **GitHub Actions**: clippy, cargo test, wasm build, vp check, svelte-check, vp test, size budget check, deploy                                                                                                    | A failing physics test or blown budget blocks deploy.                                                                                                                                                     |
| Hosting                      | **Cloudflare** (Workers static assets or Pages) with a `_headers` file for `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`                                           | Free, global CDN, preview per PR; the headers enable SharedArrayBuffer.                                                                                                                                   |
| Analytics (later)            | Plausible, or none                                                                                                                                                                                            | Cookie-free.                                                                                                                                                                                              |

## 2. Performance budgets (enforced in CI / `/bench`)

| Budget          | Target                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Frame rate      | **60 fps** (raised from 30) for QM grids up to N = 4096 and all classical modules, mid-range laptop |
| Solver          | ≤ 4 ms per frame (all steps in that frame) at N = 4096                                              |
| Draw            | ≤ 2 ms per frame                                                                                    |
| Main thread     | No long tasks (> 50 ms) during simulation                                                           |
| Shell JS        | ≤ 80 KB gzipped (initial route)                                                                     |
| Lesson page     | No page-specific JS (equations prerendered to HTML); shell budget above still applies               |
| Per-module WASM | ≤ 150 KB gzipped, lazy-loaded with its route                                                        |
| First load      | LCP < 1.5 s on broadband; interactive < 2.5 s                                                       |

Rough feasibility check: a complex FFT of N = 4096 is about 250k flops. Split-step needs two per step, so even 20 steps per frame stays well under 4 ms in SIMD WASM.

## 3. Data flow per frame

```
 main thread (Svelte UI)                    simulation worker
 ─────────────────────────                  ───────────────────────────────────────
 slider change ──Comlink──► setParams() ──► WASM: rebuild potential / propagators
                                            loop (requestAnimationFrame in worker):
                                              WASM: k solver steps (SIMD)
                                              WASM: observables → SharedArrayBuffer
                                              WebGL2: upload ψ view of WASM memory
                                                      → draw on OffscreenCanvas
 readout panel ◄── reads SharedArrayBuffer (throttled to ~10 Hz)
```

The array view into WASM memory (`Float64Array` over `memory.buffer`) is uploaded straight to the GPU. No copies, no serialization.

## 4. Why not…

| Option                              | Verdict                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React 19 + R3F**                  | Biggest ecosystem and still a fine choice, but heavier runtime (~45 KB) and virtual-DOM overhead. None of its strengths matter on the hot path here.                 |
| **SolidJS**                         | Similar speed to Svelte, but its 3D bindings are less mature than Threlte, and its ecosystem is smaller.                                                             |
| **Pure TypeScript numerics**        | Simpler (one language), but no SIMD and possible GC pauses. Fine for C1–C2, but the plan is to grow to 2D grids. Writing Rust from the start avoids a rewrite later. |
| **C++/Emscripten**                  | Fast, but heavier toolchain and less safe. Rust + cargo is nicer to learn and test.                                                                                  |
| **Next.js / any server**            | No backend needed; a static site is faster, cheaper and simpler.                                                                                                     |
| **Chart.js / Plotly / ECharts**     | Far too slow for 60 fps array redraws.                                                                                                                               |
| **WebGPU as the only renderer now** | Firefox support is partial, and Threlte advises against it in production. Planned for v1.5 with fallback.                                                            |

## 5. Repo layout

```
qmproj/
├─ crates/
│  ├─ physics/            # pure Rust: ode/, fft/, linalg/, tdse/, observables/, analytic/  (no wasm deps)
│  └─ physics-wasm/       # thin wasm-bindgen layer: exported sim structs, memory views
├─ apps/web/              # SvelteKit app
│  └─ src/
│     ├─ lib/shell/       # time controls, URL state, Learn/Inspect, Predict panel, export
│     ├─ lib/gl/          # WebGL2 plot renderer (runs in worker)
│     ├─ lib/workers/     # sim.worker.ts: loads WASM, owns OffscreenCanvas
│     ├─ lib/modules/     # cm-integrators/, cm-oscillator/, …, qm-1d/, qubit/
│     ├─ lib/learn/       # curriculum.ts (topic map), lesson loader and Markdown renderer (server-only)
│     ├─ content/learn/   # classical/<slug>.md, quantum/<slug>.md, _template.md
│     ├─ lib/review/      # spaced review (ts-fsrs + IndexedDB wrapper)
│     └─ routes/          # /lab/[module], /learn, /learn/[track]/[slug], /docs/[module], /notebook/[entry], /bench
├─ scripts/               # build-wasm.mjs, build-figures.mjs (lesson figures from the solver)
├─ reference/             # Python notebooks → golden JSON for tests
├─ docs/                  # CURRICULUM, VALIDATION, TECH_STACK, notebook/
├─ Cargo.toml             # Rust workspace
├─ pnpm-workspace.yaml
└─ .github/workflows/ci.yml
```

## 6. Getting started

Prerequisites (inside WSL recommended): Rust via rustup, Node 24 (Vite+ requires ^22.18 or ^24.11), pnpm, Python 3.12+.

```bash
rustup target add wasm32-unknown-unknown
```
```bash
cargo install wasm-bindgen-cli --version 0.2.130 --locked
```
```bash
pnpm dlx sv create apps/web
```
```bash
cargo new --lib crates/physics
```

Enable SIMD for the wasm target in `.cargo/config.toml`:

```toml
[target.wasm32-unknown-unknown]
rustflags = ["-C", "target-feature=+simd128"]
```

## Sources

- [Vite+](https://viteplus.dev/)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) · [independent Vite 8 benchmark](https://var.gg/en/blog/vite-8-rolldown)
- [SolidJS vs Svelte 5 vs React reactivity, 2026](https://www.pkgpulse.com/guides/solidjs-vs-svelte-5-vs-react-reactivity-2026) · [SolidJS vs React vs Svelte, 2026](https://tech-insider.org/solidjs-vs-react-vs-svelte-2026/)
- [WebGPU browser support (vrarwiki)](https://vrarwiki.com/wiki/WebGPU) · [WebGPU vs WebGL, 2026](https://app.cinevva.com/guides/webgpu-vs-webgl-games)
- [Three.js WebGPU migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) · [Threlte WebGPU docs](https://threlte.xyz/docs/learn/advanced/webgpu)
- [Sunsetting the rustwasm GitHub org](https://blog.rust-lang.org/inside-rust/2025/07/21/sunsetting-the-rustwasm-github-org)
- [RustFFT WASM SIMD support](https://users.rust-lang.org/t/release-rustfft-6-2-now-with-support-for-wasm-simd-acceleration/105675) · [box2d-rust benchmarks](https://docs.rs/crate/box2d-rust/latest/source/README.md)
- [uPlot](https://github.com/leeoniya/uPlot)
- [Oxfmt beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)
- [Vitest 4 browser mode (InfoQ)](https://www.infoq.com/news/2025/12/vitest-4-browser-mode)
