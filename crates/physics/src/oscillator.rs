//! A damped, driven harmonic oscillator (module C2).

use crate::ode::System;

/// State vector layout used by [`Oscillator`]: `[x, v]`.
pub const X: usize = 0;
pub const V: usize = 1;

/// Unit-mass oscillator `x'' = −ω₀²x − 2ζω₀v + F cos(ω_d t)`.
///
/// `omega0` is the natural angular frequency, `zeta` the damping ratio (0 = none,
/// 1 = critical), `force` the drive amplitude per unit mass and `omega_drive` its frequency.
pub struct Oscillator {
    pub omega0: f64,
    pub zeta: f64,
    pub force: f64,
    pub omega_drive: f64,
}

impl Oscillator {
    /// Energy per unit mass of the undriven oscillator: ½v² + ½ω₀²x².
    pub fn energy(&self, y: &[f64]) -> f64 {
        0.5 * (y[V] * y[V] + self.omega0 * self.omega0 * y[X] * y[X])
    }
}

impl System for Oscillator {
    fn dim(&self) -> usize {
        2
    }
    fn deriv(&self, t: f64, y: &[f64], dy: &mut [f64]) {
        dy[X] = y[V];
        dy[V] = -self.omega0 * self.omega0 * y[X] - 2.0 * self.zeta * self.omega0 * y[V]
            + self.force * (self.omega_drive * t).cos();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analytic::{damped_driven_oscillator, sho_position};
    use crate::ode::{Integrator, Rk4, SemiImplicitEuler};

    fn run_rk4(osc: &Oscillator, x0: f64, v0: f64, dt: f64, t_end: f64) -> [f64; 2] {
        let mut y = [x0, v0];
        let mut rk4 = Rk4::new(2);
        let steps = (t_end / dt).round() as usize;
        for i in 0..steps {
            rk4.step(osc, i as f64 * dt, &mut y, dt);
        }
        y
    }

    #[test]
    fn rk4_matches_exact_in_every_damping_regime() {
        // docs/VALIDATION.md: damped and driven oscillator vs the analytic solution.
        // Underdamped, critical, overdamped, and undamped, each with a drive.
        for zeta in [0.0, 0.1, 0.5, 1.0, 1.7] {
            let osc = Oscillator {
                omega0: 2.0,
                zeta,
                force: 3.0,
                omega_drive: 1.3,
            };
            let got = run_rk4(&osc, 1.5, -0.7, 1e-3, 12.0);
            let want = damped_driven_oscillator(1.5, -0.7, 2.0, zeta, 3.0, 1.3, 12.0);
            assert!(
                (got[X] - want.x).abs() < 1e-8,
                "zeta {zeta}: x {} vs {}",
                got[X],
                want.x
            );
            assert!(
                (got[V] - want.v).abs() < 1e-8,
                "zeta {zeta}: v {} vs {}",
                got[V],
                want.v
            );
        }
    }

    #[test]
    fn undamped_resonance_matches_rk4() {
        // ω_d = ω₀ with no damping: the swing grows linearly, x = (F/2ω₀) t sin ω₀t.
        let osc = Oscillator {
            omega0: 2.0,
            zeta: 0.0,
            force: 1.0,
            omega_drive: 2.0,
        };
        let got = run_rk4(&osc, 0.3, 0.5, 1e-3, 10.0);
        let want = damped_driven_oscillator(0.3, 0.5, 2.0, 0.0, 1.0, 2.0, 10.0);
        assert!((got[X] - want.x).abs() < 1e-8, "{} vs {}", got[X], want.x);
        assert!((got[V] - want.v).abs() < 1e-8, "{} vs {}", got[V], want.v);
    }

    #[test]
    fn no_force_at_the_natural_frequency_is_just_free_motion() {
        // Regression: ω_d = ω₀, ζ = 0, F = 0 used to evaluate 0/0 and return NaN.
        let s = damped_driven_oscillator(1.0, 0.0, 2.0, 0.0, 0.0, 2.0, 3.0);
        assert!(s.x.is_finite() && (s.x - (2.0_f64 * 3.0).cos()).abs() < 1e-12);
    }

    #[test]
    fn free_undamped_matches_cosine() {
        let w = 3.0;
        let got = damped_driven_oscillator(0.8, 1.2, w, 0.0, 0.0, 1.0, 5.0);
        assert!((got.x - sho_position(0.8, 1.2, w, 5.0)).abs() < 1e-12);
    }

    #[test]
    fn exact_solution_starts_from_the_initial_conditions() {
        for zeta in [0.0, 0.3, 1.0, 2.5] {
            let s = damped_driven_oscillator(-0.4, 2.2, 1.7, zeta, 1.0, 0.9, 0.0);
            assert!((s.x + 0.4).abs() < 1e-12 && (s.v - 2.2).abs() < 1e-12);
        }
    }

    #[test]
    fn driving_at_resonance_reaches_the_expected_amplitude() {
        // Steady state at ω_d = ω₀ has amplitude F / (2ζω₀²).
        let (w, zeta, f) = (2.0, 0.05, 1.0);
        let expected = f / (2.0 * zeta * w * w);
        let mut peak = 0.0_f64;
        for i in 0..20_000 {
            let t = 200.0 + i as f64 * 0.005; // long after the transient has died away
            peak = peak.max(damped_driven_oscillator(0.0, 0.0, w, zeta, f, w, t).x.abs());
        }
        assert!(
            (peak - expected).abs() / expected < 1e-3,
            "{peak} vs {expected}"
        );
    }

    #[test]
    fn semi_implicit_euler_keeps_the_energy_bounded() {
        // docs/VALIDATION.md: bounded energy, |ΔE/E| < 2·dt.
        let osc = Oscillator {
            omega0: 1.0,
            zeta: 0.0,
            force: 0.0,
            omega_drive: 1.0,
        };
        let dt = 0.01;
        let mut y = [1.0, 0.0];
        let mut integ = SemiImplicitEuler::new(2);
        let e0 = osc.energy(&y);
        let mut worst = 0.0_f64;
        for i in 0..200_000 {
            integ.step(&osc, i as f64 * dt, &mut y, dt);
            worst = worst.max(((osc.energy(&y) - e0) / e0).abs());
        }
        assert!(worst < 2.0 * dt, "worst {worst}");
    }
}
