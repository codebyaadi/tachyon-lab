# Tachyon Lab

**Learn classical and quantum mechanics by running the experiment.** Tachyon Lab is a free, open-source web lab of interactive, physically correct simulations, paired with plain-language theory lessons. It runs entirely in your browser: no accounts, no server.

**Live site: [tachyon-lab.pages.dev](https://tachyon-lab.pages.dev)**

> **Status: early.** The foundations work end to end (a Rust/WebAssembly solver, a GPU plot, shareable links, a lesson system), with four simulations and four draft lessons so far. The rest is planned and documented. See [Status](#status).

## The idea

Every simulation follows one loop:

1. **Predict.** Commit a guess before you run anything. This is the step that makes demos teach.
2. **Run.** The simulation plays in real time. Pause it, change a parameter, run it again.
3. **Compare.** The result is drawn next to the exact or theoretical answer, with the error.
4. **Record.** Every state is a shareable link.

Each simulation shows its physics: the equations, parameters, units, numerical method and known limits. Each one is backed by lessons that explain _why_ it behaves as it does.

## What is planned

| Track | Contents |
|---|---|
| **Classical mechanics** | Motion and numerical integrators, oscillators and phase space, Lagrangian mechanics, orbits and central forces, coupled oscillators and chaos |
| **The bridge** | Waves and Fourier analysis, then a classical particle overlaid on a quantum wave packet (Ehrenfest's theorem, the classical limit) |
| **Quantum mechanics** | A 1D wavefunction playground (tunnelling, eigenstates, scattering), the qubit and Bloch sphere, two-level systems and Rabi oscillations |
| **Learn** | 88 theory topics (46 classical, 42 quantum), each a short lesson in plain language: predict first, every step derived, worked and faded examples, check-yourself questions |

Accuracy is a feature: every solver is tested against analytic results, and every number in a lesson is checked by code. A failing physics test blocks the build.

## Status

| | |
|---|---|
| **Works today** | **Projectile lab**: launch with or without air drag, predict the landing point, and compare Euler, semi-implicit Euler and RK4 with the exact answer · **Orbit lab**: a planet around a star against the exact Kepler ellipse, with Euler, semi-implicit Euler, RK4 and velocity Verlet, and live energy and angular-momentum drift · **Oscillator lab**: a damped, driven spring in time and in phase space, with resonance and the energy an integrator adds or loses · exponential-decay lab · Rust physics core (Euler, semi-implicit Euler, RK4, velocity Verlet, 2D projectile with linear and quadratic drag, damped driven oscillator, Kepler orbit, analytic solutions) · WebGL2 plotting in a worker · URL-shareable state · light and dark themes · the Learn pipeline and `/learn` pages |
| **Written** | 2 of 88 lessons (`describing-motion`, `projectile-motion`), both marked _draft_ until the author has reviewed them |
| **Next** | The shared module shell (the two labs still duplicate some page code), sketch-your-prediction, misconception presets, and an energy-versus-time plot comparing integrators |

Lessons carry a visible **draft / reviewed** label because physics errors destroy trust. A lesson is only marked reviewed after its key steps have been derived by hand.

More detail: the [tech stack and performance budgets](docs/TECH_STACK.md), the [curriculum and lesson standard](docs/CURRICULUM.md), how results are [validated](docs/VALIDATION.md), and the builder's [lab notebook](docs/notebook/) of derivations and predictions.

## How it works

```
crates/physics          Pure Rust physics: integrators, analytic solutions. No UI or WASM
                        dependencies, so it is tested natively with cargo test.
crates/physics-wasm     Thin wasm-bindgen layer exposing simulations to the browser.
scripts/build-wasm.mjs  cargo build (wasm32 + SIMD) → wasm-bindgen → wasm-opt.
apps/web                SvelteKit app, fully prerendered. Each simulation runs in a Web Worker
                        that owns both the WASM solver and a WebGL2 plot on an OffscreenCanvas,
                        so the page never blocks.
apps/web/src/content/learn   Theory lessons as Markdown (classical/, quantum/).
apps/web/src/lib/learn       The topic map (curriculum.ts), lesson schema, loader and tests.
```

**Stack:** Rust compiled to WebAssembly (SIMD) · Svelte 5 and SvelteKit · [Vite+](https://viteplus.dev/) (build, lint, format, test) · Tailwind CSS v4 · Valibot · KaTeX, rendered at build time so equations cost no client JavaScript.

## Getting started

You need Rust (stable), Node 24+ and pnpm 10+. Then, once:

```bash
rustup target add wasm32-unknown-unknown
```

```bash
cargo install wasm-bindgen-cli --version 0.2.130 --locked
```

```bash
pnpm install
```

```bash
pnpm dev
```

The dev server runs at http://localhost:5173.

### Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | Build WASM (debug) and start the dev server |
| `pnpm build` | Build WASM (release, optimized) and the static site into `apps/web/build` |
| `pnpm preview` | Serve the production build at http://localhost:4173 |
| `pnpm test` | Physics tests (`cargo test`) and TypeScript tests (Vitest via Vite+), including the lesson checks |
| `pnpm check` | Type-check the Svelte and TypeScript code |
| `pnpm lint` | `vp check` (Oxlint, Oxfmt, types) plus clippy and rustfmt; this is what CI runs |
| `pnpm format` | Auto-format TypeScript and Rust |

After changing Rust code, re-run `pnpm wasm:dev` (or restart `pnpm dev`) to rebuild the WebAssembly.

## Contributing

Corrections are the most valuable contribution: if a lesson or a simulation gets the physics wrong, please [open an issue](https://github.com/codebyaadi/tachyon-lab/issues/new). Larger changes are easiest to discuss in an issue first.

### Adding a simulation module

1. Physics in `crates/physics/src/…`, with tests against analytic results (see [docs/VALIDATION.md](docs/VALIDATION.md)).
2. A simulation struct in `crates/physics-wasm/src/` exposing `advance`, readouts and `*_ptr()` buffers.
3. In `apps/web/src/lib/`: `modules/<name>/params.ts` (parameter specs and defaults) and `workers/<name>.worker.ts`.
4. A route at `apps/web/src/routes/lab/<name>/` with its page and build-time equations in `+page.server.ts`.

`modules/decay` is the reference example.

### Adding a lesson

1. Make sure the topic is in `apps/web/src/lib/learn/curriculum.ts`.
2. Copy `apps/web/src/content/learn/_template.md` to `apps/web/src/content/learn/<track>/<slug>.md`.
3. Write it to the lesson standard in [docs/CURRICULUM.md](docs/CURRICULUM.md): plain words first, every step derived, every number verified. Start with `status: draft`.
4. Run `pnpm test`, which checks structure, prerequisites, LaTeX and numeric answers, then read it with `pnpm dev`.

## License

MIT. See [LICENSE](LICENSE).
