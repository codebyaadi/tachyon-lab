# Validation and accuracy

Tachyon Lab only works if you can trust it, so every solver is checked against a known answer, and a failing physics test blocks the build. This document lists what is checked, how tightly, and what is still planned.

**Status key:** ✅ implemented and run in CI · 🔜 planned with its module.

## Solver checks

| Module                       | Method       | Check                                                              | Tolerance                                              | Status |
| ---------------------------- | ------------ | ------------------------------------------------------------------ | ------------------------------------------------------ | ------ |
| Motion & integrators         | RK4          | Projectile without drag vs the exact parabola                      | rel. error < 1e-8 (dt = 1e-3)                          | ✅     |
| Motion & integrators         | RK4          | Projectile with linear drag vs the closed-form solution            | rel. error < 1e-8 (dt = 1e-3)                          | ✅     |
| Motion & integrators         | RK4          | Quadratic-drag fall reaches the terminal speed √(g/c)              | rel. error < 1e-6                                      | ✅     |
| Motion & integrators         | Euler, RK4   | Convergence order: halving dt divides the error by 2 (Euler), 16 (RK4) | ratio within a few percent                         | ✅     |
| Motion & integrators         | Verlet       | Energy of a harmonic oscillator, 10⁶ steps                         | bounded, no secular drift; \|ΔE/E\| < 1e-4             | ✅     |
| Motion & integrators         | Semi-implicit Euler | Energy of a harmonic oscillator, 10⁶ steps                  | bounded; \|ΔE/E\| < 2·dt                               | ✅     |
| Motion & integrators         | Euler        | Energy of a harmonic oscillator grows exactly as (1 + dt²)ⁿ        | rel. error < 1e-9                                      | ✅     |
| Motion & integrators         | Euler, semi-implicit | With gravity only, height errs by ±½·g·t·dt (Euler high, semi-implicit low) | abs. error < 1e-9                       | ✅     |
| Motion & integrators         | Closed form  | Linear-drag landing time vs RK4 (dt = 1e-3) and as a root of the height | rel. error < 1e-6                                 | ✅     |
| Projectile lab               | RK4          | Landing distance and time vs exact, no drag and linear drag (dt = 1e-3) | rel. error < 1e-6                                 | ✅     |
| Projectile lab               | RK4          | Landing at a coarse step (dt = 0.05) with cubic-Hermite interpolation | rel. error < 1e-9                                   | ✅     |
| Projectile lab               | RK4          | A drag-free ball lands at its launch speed (energy conserved)      | abs. error < 1e-9                                      | ✅     |
| Oscillators & phase space    | RK4          | Damped and driven oscillator vs the analytic solution (undamped, under-, critically and overdamped) | abs. error < 1e-8 (dt = 1e-3) | ✅     |
| Oscillators & phase space    | RK4          | Undamped resonance (ω_d = ω₀) vs the closed form (x = F t sin ω₀t / 2ω₀) | abs. error < 1e-8 (dt = 1e-3)                     | ✅     |
| Oscillators & phase space    | Closed form  | Steady amplitude at resonance equals F / (2ζω₀²)                   | rel. error < 1e-3                                      | ✅     |
| Oscillators & phase space    | Euler        | Energy ratio after n steps equals (1 + (ω₀dt)²)ⁿ in the lab sim    | rel. error < 1e-9                                      | ✅     |
| Oscillators & phase space    | Semi-implicit Euler | Energy stays bounded on the lab sim                         | within 20% of start (dt = 0.05)                        | ✅     |
| Orbits & central forces      | Verlet       | Kepler period vs T² ∝ a³                                           | rel. error < 1e-5                                      | 🔜     |
| Coupled oscillators          | Eigen        | Normal-mode frequencies of N masses vs ωₖ = 2ω₀ sin(kπ / (2(N+1))) | rel. error < 1e-10                                     | 🔜     |
| 1D wavefunction              | Split-step   | Norm after 10⁴ steps                                               | \|1 − ‖ψ‖²\| < 1e-10                                   | 🔜     |
| 1D wavefunction              | Split-step   | Free Gaussian width σ(t) vs the analytic spreading                 | rel. error < 1e-4                                      | 🔜     |
| 1D wavefunction              | Split-step   | Coherent state in a harmonic well: ⟨x⟩(t) vs x₀ cos(ωt)            | abs. error < 1e-3 (N = 1024)                           | 🔜     |
| 1D wavefunction              | FD eigen     | Harmonic-oscillator energies Eₙ = (n + ½)ħω, n ≤ 10                | rel. error < 1e-4                                      | 🔜     |
| 1D wavefunction              | FD eigen     | Infinite-well energies, n ≤ 10                                     | rel. error < 1e-4                                      | 🔜     |
| 1D wavefunction              | Scattering   | Numerical T vs momentum-averaged analytic T, rectangular barrier   | abs. error < 0.01                                      | 🔜     |
| Qubit & Bloch sphere         | Matrix       | Gate identities (H² = I, HZH = X, S² = Z, T² = S)                  | error < 1e-12                                          | 🔜     |
| Qubit & Bloch sphere         | Kraus        | ρ stays positive semidefinite with trace 1 under decoherence       | trace error < 1e-12; eigenvalues ≥ −1e-12              | 🔜     |
| Two-level systems            | ODE          | Rabi populations vs the generalized Rabi formula                   | abs. error < 1e-6                                      | 🔜     |

The implemented rows live in `crates/physics/src/ode/tests.rs`, `crates/physics/src/projectile.rs`, `crates/physics/src/oscillator.rs` and the `physics-wasm` simulation tests. Run them with `cargo test --workspace`.

## Lesson accuracy

Lessons are held to the same standard as the solvers (full standard in [CURRICULUM.md](CURRICULUM.md)):

- Every number in a worked example or answer is recomputed independently by a test, so a wrong value fails CI.
- Equations are rendered in strict mode at build time; an invalid equation fails the build.
- Every lesson passes an automated structure check: required sections, word range, valid prerequisites with no cycles, and links to simulations that exist.
- A lesson is labelled **draft** until its author has derived the key steps by hand and marked it **reviewed**.
- Notation is defined once and reused consistently; a symbol never changes meaning between lessons.

## Known limits (shown in the interface when relevant)

- **Split-step is periodic.** Without absorbing boundaries, a wave packet leaving one side comes back on the other.
- **Grid resolution.** The packet's momentum must satisfy |p| ≪ πħ/dx, otherwise the result aliases. The interface warns when p₀ + 3Δp approaches this limit.
- **Drawn potentials are clamped.** Very steep walls need a smaller time step (the interface warns).
- **A packet is not a single energy.** The analytic T(E) for one energy differs from the transmission of a packet; the interface shows both.

## Units

Natural units (ħ = m = 1) by default: lengths in arbitrary units _a_, times in _ma²/ħ_. Atomic units and SI scaling are display-only conversions; solvers always work in natural units.
