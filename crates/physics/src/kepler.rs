//! A planet orbiting a fixed star: the Kepler problem (module C3).

use crate::analytic::State2;
use crate::ode::System;

/// State vector layout used by [`Kepler`]: `[x, y, vx, vy]`, with the star at the origin.
pub const X: usize = 0;
pub const Y: usize = 1;
pub const VX: usize = 2;
pub const VY: usize = 3;

/// Acceleration a = −μ r̂ / r², where `mu` = GM is the star's gravitational parameter.
pub struct Kepler {
    pub mu: f64,
}

impl Kepler {
    /// Acceleration at position (x, y).
    pub fn accel(&self, x: f64, y: f64) -> [f64; 2] {
        let r2 = x * x + y * y;
        let k = -self.mu / (r2 * r2.sqrt());
        [k * x, k * y]
    }

    /// Energy per unit mass: ½v² − μ/r. Conserved.
    pub fn energy(&self, y: &[f64]) -> f64 {
        0.5 * (y[VX] * y[VX] + y[VY] * y[VY]) - self.mu / y[X].hypot(y[Y])
    }

    /// Angular momentum per unit mass: x·vy − y·vx. Conserved (the force is central).
    pub fn angular_momentum(&self, y: &[f64]) -> f64 {
        y[X] * y[VY] - y[Y] * y[VX]
    }
}

impl System for Kepler {
    fn dim(&self) -> usize {
        4
    }
    fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
        let a = self.accel(y[X], y[Y]);
        dy[X] = y[VX];
        dy[Y] = y[VY];
        dy[VX] = a[0];
        dy[VY] = a[1];
    }
}

/// The exact bound orbit that starts at (r₀, 0) moving in +y with speed `ratio` × the circular
/// speed √(μ/r₀). `ratio` below 1 starts at the farthest point (apoapsis), above 1 at the
/// nearest (periapsis), and exactly 1 is a circle. It must stay below √2, or the orbit is not bound.
#[derive(Clone, Copy, Debug)]
pub struct KeplerOrbit {
    pub mu: f64,
    /// Semi-major axis.
    pub a: f64,
    /// Eccentricity, 0 for a circle.
    pub e: f64,
    /// Mean motion √(μ/a³), the angle swept per unit time by a circular orbit of the same period.
    pub n: f64,
    /// Mean anomaly at t = 0: π when starting at apoapsis, otherwise 0.
    m0: f64,
    /// −1 when the starting point is apoapsis (the orbit is rotated half a turn), otherwise 1.
    rot: f64,
}

impl KeplerOrbit {
    pub fn new(mu: f64, r0: f64, ratio: f64) -> Self {
        assert!(ratio > 0.0 && ratio * ratio < 2.0, "orbit must be bound");
        let s2 = ratio * ratio;
        let a = r0 / (2.0 - s2);
        let e = (s2 - 1.0).abs();
        let apo = ratio < 1.0;
        KeplerOrbit {
            mu,
            a,
            e,
            n: (mu / (a * a * a)).sqrt(),
            m0: if apo { std::f64::consts::PI } else { 0.0 },
            rot: if apo { -1.0 } else { 1.0 },
        }
    }

    /// Orbital period T = 2π√(a³/μ) (Kepler's third law).
    pub fn period(&self) -> f64 {
        std::f64::consts::TAU / self.n
    }
    /// Closest distance to the star.
    pub fn periapsis(&self) -> f64 {
        self.a * (1.0 - self.e)
    }
    /// Farthest distance from the star.
    pub fn apoapsis(&self) -> f64 {
        self.a * (1.0 + self.e)
    }

    /// Position and velocity at time `t`, by solving Kepler's equation E − e sin E = M.
    pub fn state(&self, t: f64) -> State2 {
        let ecc_anomaly = solve_kepler(self.m0 + self.n * t, self.e);
        let (sin, cos) = ecc_anomaly.sin_cos();
        let b = self.a * (1.0 - self.e * self.e).sqrt();
        let rate = self.n / (1.0 - self.e * cos); // dE/dt
        State2 {
            x: self.rot * self.a * (cos - self.e),
            y: self.rot * b * sin,
            vx: -self.rot * self.a * sin * rate,
            vy: self.rot * b * cos * rate,
        }
    }
}

/// Solve Kepler's equation E − e sin E = M for the eccentric anomaly E (Newton's method).
pub fn solve_kepler(mean_anomaly: f64, e: f64) -> f64 {
    let tau = std::f64::consts::TAU;
    let m = mean_anomaly.rem_euclid(tau);
    let mut big_e = if e < 0.8 { m } else { std::f64::consts::PI };
    for _ in 0..50 {
        let f = big_e - e * big_e.sin() - m;
        let step = f / (1.0 - e * big_e.cos());
        big_e -= step;
        if step.abs() < 1e-15 {
            break;
        }
    }
    // Return an angle continuous with the input (same number of whole turns).
    big_e + (mean_anomaly - m)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ode::{Euler, Integrator, Rk4, SemiImplicitEuler, velocity_verlet_step};

    const RATIOS: [f64; 6] = [0.5, 0.8, 1.0, 1.1, 1.25, 1.4];

    fn start(ratio: f64, mu: f64) -> [f64; 4] {
        [1.0, 0.0, 0.0, ratio * mu.sqrt()]
    }

    #[test]
    fn kepler_equation_is_solved() {
        for e in [0.0, 0.3, 0.7, 0.95, 0.99] {
            for k in 0..64 {
                let m = k as f64 * 0.1 - 3.0;
                let big_e = solve_kepler(m, e);
                assert!((big_e - e * big_e.sin() - m).abs() < 1e-12, "e {e} m {m}");
            }
        }
    }

    #[test]
    fn exact_orbit_starts_where_the_lab_starts_it() {
        for ratio in RATIOS {
            let orbit = KeplerOrbit::new(1.0, 1.0, ratio);
            let s = orbit.state(0.0);
            assert!(
                (s.x - 1.0).abs() < 1e-12 && s.y.abs() < 1e-12,
                "ratio {ratio}"
            );
            assert!(
                s.vx.abs() < 1e-12 && (s.vy - ratio).abs() < 1e-12,
                "ratio {ratio}"
            );
        }
    }

    #[test]
    fn exact_orbit_conserves_energy_and_angular_momentum_and_repeats() {
        for ratio in RATIOS {
            let orbit = KeplerOrbit::new(1.0, 1.0, ratio);
            let sys = Kepler { mu: 1.0 };
            let s0 = orbit.state(0.0);
            let y0 = [s0.x, s0.y, s0.vx, s0.vy];
            let (e0, l0) = (sys.energy(&y0), sys.angular_momentum(&y0));
            for k in 1..40 {
                let s = orbit.state(k as f64 * 0.37 * orbit.period() / 7.0);
                let y = [s.x, s.y, s.vx, s.vy];
                assert!((sys.energy(&y) - e0).abs() < 1e-10, "energy, ratio {ratio}");
                assert!(
                    (sys.angular_momentum(&y) - l0).abs() < 1e-10,
                    "L, ratio {ratio}"
                );
            }
            let p = orbit.state(orbit.period());
            assert!(
                (p.x - 1.0).abs() < 1e-9 && p.y.abs() < 1e-9,
                "ratio {ratio}"
            );
        }
    }

    #[test]
    fn rk4_matches_the_exact_orbit() {
        // docs/VALIDATION.md: orbit vs the analytic Kepler solution.
        for ratio in RATIOS {
            let orbit = KeplerOrbit::new(1.0, 1.0, ratio);
            let sys = Kepler { mu: 1.0 };
            let mut y = start(ratio, 1.0);
            let mut rk4 = Rk4::new(4);
            let dt = 2e-4;
            let steps = (2.0 * orbit.period() / dt).round() as usize;
            for i in 0..steps {
                rk4.step(&sys, i as f64 * dt, &mut y, dt);
            }
            let want = orbit.state(steps as f64 * dt);
            let err = (y[X] - want.x).hypot(y[Y] - want.y);
            assert!(err < 1e-6, "ratio {ratio}: position error {err}");
        }
    }

    /// Time of the first full return to the start, found from the upward crossing of y = 0 with x > 0.
    fn measured_period(mu: f64, ratio: f64, guess: f64) -> f64 {
        let sys = Kepler { mu };
        let mut y = start(ratio, mu);
        let mut rk4 = Rk4::new(4);
        let dt = 1e-4 * guess.clamp(0.01, 1.0);
        let mut t = 0.0;
        loop {
            let prev = y;
            rk4.step(&sys, t, &mut y, dt);
            t += dt;
            if t > 0.5 * guess && prev[Y] < 0.0 && y[Y] >= 0.0 && y[X] > 0.0 {
                return t - dt + dt * (-prev[Y]) / (y[Y] - prev[Y]);
            }
        }
    }

    #[test]
    fn kepler_third_law_holds_in_the_integrated_orbit() {
        // docs/VALIDATION.md: Kepler period vs T² ∝ a³, rel. error < 1e-5.
        for (mu, ratio) in [(1.0, 0.7), (1.0, 1.0), (1.0, 1.2), (3.0, 0.9), (0.5, 1.3)] {
            let orbit = KeplerOrbit::new(mu, 1.0, ratio);
            let t = measured_period(mu, ratio, orbit.period());
            let law = t * t / orbit.a.powi(3);
            let want = 4.0 * std::f64::consts::PI.powi(2) / mu;
            assert!(
                (law - want).abs() / want < 1e-5,
                "mu {mu} ratio {ratio}: T²/a³ = {law}, expected {want}"
            );
        }
    }

    #[test]
    fn verlet_conserves_angular_momentum_and_bounds_the_energy() {
        // Velocity Verlet is symplectic and rotation-symmetric: L is kept to round-off, and the
        // energy error oscillates instead of growing.
        let sys = Kepler { mu: 1.0 };
        let ratio = 0.8;
        let y0 = start(ratio, 1.0);
        let (mut pos, mut vel) = ([y0[X], y0[Y]], [y0[VX], y0[VY]]);
        let mut acc = sys.accel(pos[0], pos[1]);
        let (e0, l0) = (sys.energy(&y0), sys.angular_momentum(&y0));
        let (mut worst_e, mut worst_l) = (0.0_f64, 0.0_f64);
        let dt = 0.005;
        for _ in 0..400_000 {
            velocity_verlet_step(&mut pos, &mut vel, &mut acc, dt, |p, a| {
                let g = sys.accel(p[0], p[1]);
                a[0] = g[0];
                a[1] = g[1];
            });
            let y = [pos[0], pos[1], vel[0], vel[1]];
            worst_e = worst_e.max(((sys.energy(&y) - e0) / e0).abs());
            worst_l = worst_l.max(((sys.angular_momentum(&y) - l0) / l0).abs());
        }
        assert!(worst_l < 1e-10, "angular momentum drift {worst_l}");
        assert!(worst_e < 5e-3, "energy error {worst_e}");
    }

    #[test]
    fn euler_gains_energy_and_angular_momentum_so_the_orbit_spirals_out() {
        let sys = Kepler { mu: 1.0 };
        let mut y = start(1.0, 1.0);
        let mut euler = Euler::new(4);
        let (e0, l0) = (sys.energy(&y), sys.angular_momentum(&y));
        let dt = 0.002;
        for i in 0..20_000 {
            euler.step(&sys, i as f64 * dt, &mut y, dt);
        }
        assert!(
            sys.energy(&y) > e0 + 1e-3,
            "energy {} vs {e0}",
            sys.energy(&y)
        );
        assert!(
            sys.angular_momentum(&y) > l0 + 1e-3,
            "L {}",
            sys.angular_momentum(&y)
        );
        assert!(y[X].hypot(y[Y]) > 1.01, "radius {}", y[X].hypot(y[Y]));
    }

    #[test]
    fn semi_implicit_euler_keeps_the_orbit_closed() {
        let sys = Kepler { mu: 1.0 };
        let mut y = start(1.0, 1.0);
        let mut semi = SemiImplicitEuler::new(4);
        let dt = 0.002;
        let mut worst = 0.0_f64;
        for i in 0..200_000 {
            semi.step(&sys, i as f64 * dt, &mut y, dt);
            worst = worst.max((y[X].hypot(y[Y]) - 1.0).abs());
        }
        assert!(worst < 0.01, "radius wandered by {worst}");
    }
}
