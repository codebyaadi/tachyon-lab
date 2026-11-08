# 01 — Motion & Integrators (C1)

8 Nov 2026 · Taylor Ch. 1–2 (Newton's laws, projectiles, drag), Ch. 4 (energy)

> Derivations drafted with Claude; re-derive each one on paper before trusting it. The numbers were checked by running the code.

## Question

A projectile feels gravity and air drag. Which numerical integrators reproduce its motion, and which ones quietly add or remove energy?

## Theory

Per unit mass, with `g > 0`, linear drag `k = b/m` (1/s) and quadratic drag `c` (1/m):

$$\mathbf a = -g\,\hat y \;-\; (k + c\,|\mathbf v|)\,\mathbf v$$

### 1. No drag (k = c = 0)

The axes decouple: `ẍ = 0`, `ÿ = −g`. Integrate twice:

$$x = x_0 + v_{x0}t,\qquad y = y_0 + v_{y0}t - \tfrac12 g t^2,\qquad v_y = v_{y0} - gt$$

Landing (`y = 0`) is the positive root of a quadratic:

$$t_\text{land} = \frac{v_{y0} + \sqrt{v_{y0}^2 + 2 g y_0}}{g}$$

### 2. Linear drag (c = 0)

Still decoupled, because the drag force is linear in each component.

Horizontal: `v̇ₓ = −k vₓ`, so `vₓ = vₓ₀ e^(−kt)` and

$$x = x_0 + \frac{v_{x0}}{k}\left(1 - e^{-kt}\right)$$

Vertical: `v̇ᵧ = −g − k vᵧ`. Let `u = vᵧ + g/k`. Then `u̇ = −k u`, so `u = u₀ e^(−kt)`:

$$v_y = \left(v_{y0} + \tfrac{g}{k}\right)e^{-kt} - \tfrac gk,\qquad y = y_0 + \frac{v_{y0} + g/k}{k}\left(1 - e^{-kt}\right) - \frac{g t}{k}$$

Checks: as `t → ∞`, `vᵧ → −g/k` (terminal velocity). Expand `1 − e^(−kt) = kt − k²t²/2 + …` and the formulas reduce to the no-drag result when `k → 0`.

### 3. Quadratic drag (c ≠ 0)

The two components couple through `|v| = √(vₓ² + vᵧ²)`, so there is **no closed form** in 2D. This is why we need numerical integration. A 1D vertical fall does have a terminal speed: set `a = 0` → `v_t = √(g/c)`.

### 4. Integrators and energy (the oscillator test)

Take `ẋ = v`, `v̇ = −x` (ω = 1). The exact energy `E = ½(x² + v²)` is constant.

**Forward Euler:** `x' = x + dt·v`, `v' = v − dt·x`. Then

$$x'^2 + v'^2 = (1 + dt^2)(x^2 + v^2)$$

so `E` is multiplied by `(1 + dt²)` every step and **grows without bound** (the orbit spirals outward).

**Semi-implicit Euler:** `v' = v − dt·x`, then `x' = x + dt·v'` (use the *new* velocity). The map has determinant `(1 − dt²) + dt² = 1`, so it preserves phase-space area (symplectic). It also conserves exactly

$$Q = v^2 + x^2 - dt\,x\,v$$

Since `E = ½Q + ½·dt·x·v` and `|x·v| ≤ E` (Cauchy–Schwarz on `x² + v²`), the true energy stays within about **±dt/2** (relative) of its starting value and never drifts.

**Velocity Verlet:** also symplectic and second order; energy error is bounded at O(dt²).

**RK4:** accurate (4th order) but not symplectic. Its amplification factor satisfies `|R(i·dt)|² = 1 − dt⁶/72 + …`, so energy *very slowly decays*.

### 5. A subtlety: unbounded motion

Symplectic only guarantees bounded energy error when the motion is bounded. For a pure-gravity projectile the velocity grows, and the errors grow too. With one step of each method on `y`:

- Explicit Euler (uses old `v`): `y = y_exact + ½·g·t·dt`, so `E` gains `+½ g² dt·t`.
- Semi-implicit (uses new `v`): `y = y_exact − ½·g·t·dt`, so `E` changes by `−½ g² dt·t`.

Same size, **opposite sign**, both growing linearly. Velocity Verlet and RK4 are exact for constant acceleration.

## Predictions

Launch: `y₀ = 2 m`, `vₓ₀ = 30 m/s`, `vᵧ₀ = 40 m/s`, `g = 9.81`.

| Quantity                      | No drag     | Linear drag, k = 0.3 |
| ----------------------------- | ----------- | -------------------- |
| Time of flight                | 8.20 s      | 6.38 s               |
| Landing distance              | 246.1 m     | 85.2 m               |
| Terminal vertical speed       | none        | 32.7 m/s             |

Oscillator energy after `T = 100`, starting from `E₀`:

| Integrator             | dt = 0.01                | dt = 0.1                      |
| ---------------------- | ------------------------ | ----------------------------- |
| Forward Euler          | **×2.718** (grows)       | **×20 959** (explodes)        |
| Semi-implicit Euler    | bounded, ±0.5 %          | bounded, ±5.3 %               |
| Velocity Verlet        | bounded, ±0.0025 % (dt²/4) | bounded, ±0.25 % (dt²/4)    |
| RK4                     | −1.4e-8 % (decays)       | −1.4e-3 % (decays)            |

**Expect to see:** forward Euler spirals outward (drifts up); semi-implicit and Verlet wobble but stay put; RK4 looks perfect on screen and only loses energy over very long runs.

## Method

RK4 and the other integrators in `crates/physics/src/ode/`. Tests: RK4 at `dt = 1e-3` against the closed forms (relative error < 1e-8), `(1 + dt²)ⁿ` energy growth for Euler, bounded energy over 10⁶ steps for semi-implicit Euler, first-order convergence, and terminal speed `√(g/c)` for quadratic drag.

## Results

All C1 tests in `cargo test -p physics` pass. Numbers in the tables above were checked by running the integrators (semi-implicit and Verlet deviations are the measured maxima over `T = 100`) (explicit/semi-implicit projectile energy drift matched `±½ g² dt·t` to 4 decimals; `Q` stayed constant to 2e-15).

## What surprised me / what I got wrong

_Fill this in after you run the simulation and compare it with the predictions._

## Open questions

- Why does Verlet beat semi-implicit Euler at the same cost? (Hint: look at the shadow Hamiltonian's leading error term.)
- Why is a velocity-dependent force (drag) awkward for Verlet?
