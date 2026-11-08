//! Validation tests: each one checks an integrator against an analytic result
//! (docs/VALIDATION.md). Tolerances here are the published ones.

use super::*;
use crate::analytic::{exp_decay, sho_position};
use approx::assert_relative_eq;

struct Decay {
    lambda: f64,
}

impl System for Decay {
    fn dim(&self) -> usize {
        1
    }
    fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
        dy[0] = -self.lambda * y[0];
    }
}

/// Integrate decay from 0 to `t_end` and return the absolute error at the end.
fn decay_error<I: Integrator>(integ: &mut I, dt: f64, t_end: f64) -> f64 {
    let sys = Decay { lambda: 1.0 };
    let mut y = [1.0];
    let steps = (t_end / dt).round() as usize;
    for i in 0..steps {
        integ.step(&sys, i as f64 * dt, &mut y, dt);
    }
    (y[0] - exp_decay(1.0, 1.0, t_end)).abs()
}

#[test]
fn rk4_matches_exponential_decay() {
    let err = decay_error(&mut Rk4::new(1), 1e-3, 1.0);
    assert!(err < 1e-12, "RK4 decay error {err:e}");
}

#[test]
fn euler_is_first_order() {
    let e1 = decay_error(&mut Euler::new(1), 1e-3, 1.0);
    let e2 = decay_error(&mut Euler::new(1), 5e-4, 1.0);
    // Halving dt should halve the error.
    assert_relative_eq!(e1 / e2, 2.0, epsilon = 0.01);
}

#[test]
fn rk4_is_fourth_order() {
    let e1 = decay_error(&mut Rk4::new(1), 0.02, 1.0);
    let e2 = decay_error(&mut Rk4::new(1), 0.01, 1.0);
    // Halving dt should divide the error by 2⁴ = 16.
    assert_relative_eq!(e1 / e2, 16.0, epsilon = 0.5);
}

#[test]
fn verlet_sho_energy_bounded_and_phase_accurate() {
    // x'' = −ω²x with ω = 1, x0 = 1, v0 = 0.
    let omega2 = 1.0;
    let (mut x, mut v, mut a) = ([1.0], [0.0], [-1.0]);
    let dt = 1e-3;
    let energy = |x: f64, v: f64| 0.5 * v * v + 0.5 * omega2 * x * x;
    let e0 = energy(x[0], v[0]);
    let mut max_rel = 0.0_f64;
    let steps = 1_000_000;
    for _ in 0..steps {
        velocity_verlet_step(&mut x, &mut v, &mut a, dt, |x, a| a[0] = -omega2 * x[0]);
        max_rel = max_rel.max(((energy(x[0], v[0]) - e0) / e0).abs());
    }
    assert!(max_rel < 1e-4, "Verlet energy drift {max_rel:e}");
    let t = steps as f64 * dt;
    assert!((x[0] - sho_position(1.0, 0.0, 1.0, t)).abs() < 1e-3);
}

/// x'' = −x as a first-order system y = [x, v].
struct Sho;

impl System for Sho {
    fn dim(&self) -> usize {
        2
    }
    fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
        dy[0] = y[1];
        dy[1] = -y[0];
    }
}

fn sho_energy(x: f64, v: f64) -> f64 {
    0.5 * (x * x + v * v)
}

#[test]
fn explicit_euler_gains_energy_on_an_oscillator() {
    // Each step multiplies E by (1 + dt²), so energy grows without bound. The roadmap's
    // prediction: forward Euler drifts upward (the orbit spirals outward).
    let dt = 1e-3;
    let steps: i32 = 10_000;
    let mut y = [1.0, 0.0];
    let mut euler = Euler::new(2);
    for i in 0..steps {
        euler.step(&Sho, i as f64 * dt, &mut y, dt);
    }
    let growth = sho_energy(y[0], y[1]) / sho_energy(1.0, 0.0);
    assert_relative_eq!(growth, (1.0 + dt * dt).powi(steps), max_relative = 1e-9);
    assert!(growth > 1.005, "expected upward drift, got {growth}");
}

#[test]
fn semi_implicit_euler_energy_stays_bounded() {
    // Symplectic: the energy error oscillates within O(dt) forever instead of drifting.
    let dt = 1e-3;
    let (mut x, mut v, mut a) = ([1.0], [0.0], [0.0]);
    let e0 = sho_energy(x[0], v[0]);
    let mut max_rel = 0.0_f64;
    for _ in 0..1_000_000 {
        semi_implicit_euler_step(&mut x, &mut v, &mut a, dt, |x, a| a[0] = -x[0]);
        max_rel = max_rel.max(((sho_energy(x[0], v[0]) - e0) / e0).abs());
    }
    assert!(max_rel < 2.0 * dt, "semi-implicit energy error {max_rel:e}");
}

#[test]
fn semi_implicit_euler_is_first_order() {
    let error_at = |dt: f64| {
        let (mut x, mut v, mut a) = ([1.0], [0.0], [0.0]);
        let steps = (1.0 / dt).round() as usize;
        for _ in 0..steps {
            semi_implicit_euler_step(&mut x, &mut v, &mut a, dt, |x, a| a[0] = -x[0]);
        }
        (x[0] - sho_position(1.0, 0.0, 1.0, 1.0)).abs()
    };
    // Halving dt should halve the error.
    assert_relative_eq!(error_at(1e-3) / error_at(5e-4), 2.0, epsilon = 0.05);
}

#[test]
fn semi_implicit_integrator_matches_the_slice_function() {
    // The Integrator version must follow exactly the same path as the x'' = a(x) function.
    let dt = 1e-2;
    let mut y = [1.0, 0.0];
    let mut integ = SemiImplicitEuler::new(2);
    let (mut x, mut v, mut a) = ([1.0], [0.0], [0.0]);
    for i in 0..1000 {
        integ.step(&Sho, i as f64 * dt, &mut y, dt);
        semi_implicit_euler_step(&mut x, &mut v, &mut a, dt, |x, a| a[0] = -x[0]);
    }
    assert_relative_eq!(y[0], x[0], epsilon = 1e-12);
    assert_relative_eq!(y[1], v[0], epsilon = 1e-12);
}

#[test]
fn semi_implicit_integrator_uses_velocity_dependent_forces() {
    // Linear drag only (no gravity): v' = v − dt·k·v, then x' = x + dt·v'.
    struct Drag {
        k: f64,
    }
    impl System for Drag {
        fn dim(&self) -> usize {
            2
        }
        fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
            dy[0] = y[1];
            dy[1] = -self.k * y[1];
        }
    }
    let (k, dt) = (0.5, 0.1);
    let mut y = [0.0, 10.0];
    SemiImplicitEuler::new(2).step(&Drag { k }, 0.0, &mut y, dt);
    let v1 = 10.0 * (1.0 - dt * k);
    assert_relative_eq!(y[1], v1, epsilon = 1e-12);
    assert_relative_eq!(y[0], dt * v1, epsilon = 1e-12);
}
