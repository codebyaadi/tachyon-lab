//! The nonlinear pendulum (module C4), and the elliptic functions behind its exact solution.

use crate::ode::System;

/// State vector layout used by [`Pendulum`]: `[theta, omega]`, the angle from straight down and its rate.
pub const THETA: usize = 0;
pub const OMEGA: usize = 1;

/// `θ'' = −ω₀² sin θ − 2ζω₀ θ' + F cos(ω_d t)`.
///
/// `omega0` is the small-swing angular frequency √(g/L), `zeta` the damping ratio, and `force`
/// and `omega_drive` the strength and frequency of a driving push.
pub struct Pendulum {
    pub omega0: f64,
    pub zeta: f64,
    pub force: f64,
    pub omega_drive: f64,
}

impl Pendulum {
    /// Energy per unit moment of inertia: ½θ'² + ω₀²(1 − cos θ). Zero at rest at the bottom.
    pub fn energy(&self, y: &[f64]) -> f64 {
        0.5 * y[OMEGA] * y[OMEGA] + self.omega0 * self.omega0 * (1.0 - y[THETA].cos())
    }
}

impl System for Pendulum {
    fn dim(&self) -> usize {
        2
    }
    fn deriv(&self, t: f64, y: &[f64], dy: &mut [f64]) {
        dy[THETA] = y[OMEGA];
        dy[OMEGA] = -self.omega0 * self.omega0 * y[THETA].sin()
            - 2.0 * self.zeta * self.omega0 * y[OMEGA]
            + self.force * (self.omega_drive * t).cos();
    }
}

/// Arithmetic-geometric mean of `a` and `b`.
fn agm(mut a: f64, mut b: f64) -> f64 {
    for _ in 0..40 {
        let next = (a + b) / 2.0;
        b = (a * b).sqrt();
        a = next;
        if (a - b).abs() <= 1e-16 * a {
            break;
        }
    }
    a
}

/// Complete elliptic integral of the first kind, K(m) with parameter m = k² in [0, 1).
pub fn ellipk(m: f64) -> f64 {
    std::f64::consts::FRAC_PI_2 / agm(1.0, (1.0 - m).sqrt())
}

/// Jacobi elliptic functions `(sn, cn, dn)` of `u` with parameter `m = k²` in [0, 1),
/// by descending Landen (AGM) transformations.
pub fn jacobi(u: f64, m: f64) -> (f64, f64, f64) {
    if m < 1e-14 {
        return (u.sin(), u.cos(), 1.0);
    }
    let mut a = vec![1.0];
    let mut c = vec![m.sqrt()];
    let mut b = (1.0 - m).sqrt();
    let mut n = 0;
    while c[n].abs() > 1e-16 && n < 30 {
        let next_a = (a[n] + b) / 2.0;
        c.push((a[n] - b) / 2.0);
        b = (a[n] * b).sqrt();
        a.push(next_a);
        n += 1;
    }
    let mut phi = (2.0_f64).powi(n as i32) * a[n] * u;
    let mut phi_prev = phi;
    for i in (1..=n).rev() {
        phi_prev = phi;
        phi = (phi + (c[i] * phi.sin() / a[i]).asin()) / 2.0;
    }
    let sn = phi.sin();
    let cn = phi.cos();
    let dn = if n == 0 {
        1.0
    } else {
        cn / (phi_prev - phi).cos()
    };
    (sn, cn, dn)
}

/// The swing-limit angle θ_max of an undriven, undamped pendulum with energy `e` (see
/// [`Pendulum::energy`]), or `None` if it has enough energy to go all the way round.
pub fn libration_amplitude(omega0: f64, e: f64) -> Option<f64> {
    let s = (e / (2.0 * omega0 * omega0)).sqrt();
    (s < 1.0).then(|| 2.0 * s.asin())
}

/// Exact period of an undriven, undamped pendulum swinging to ±`theta_max`: T = 4K(k)/ω₀,
/// k = sin(θ_max/2). It grows with the amplitude and diverges as θ_max → π.
pub fn libration_period(omega0: f64, theta_max: f64) -> f64 {
    let k = (theta_max / 2.0).sin();
    4.0 * ellipk(k * k) / omega0
}

/// Exact `(θ, θ')` for an undriven, undamped pendulum released from rest at `theta0` in (0, π):
/// `sin(θ/2) = k cd(ω₀ t)`, with `k = sin(θ₀/2)` and `cd = cn/dn`.
pub fn pendulum_from_rest(theta0: f64, omega0: f64, t: f64) -> (f64, f64) {
    let k = (theta0 / 2.0).sin();
    let m = k * k;
    let (sn, cn, dn) = jacobi(omega0 * t, m);
    let cd = cn / dn;
    let theta = 2.0 * (k * cd).asin();
    // d(cd)/du = −(1 − m) sn / dn²
    let dcd = -(1.0 - m) * sn / (dn * dn);
    let omega = 2.0 * k * dcd * omega0 / (1.0 - m * cd * cd).sqrt();
    (theta, omega)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ode::{Euler, Integrator, Rk4, SemiImplicitEuler};

    #[test]
    fn complete_elliptic_integral_matches_known_values() {
        let pi = std::f64::consts::PI;
        assert!((ellipk(0.0) - pi / 2.0).abs() < 1e-15);
        assert!((ellipk(0.5) - 1.854_074_677_301_372).abs() < 1e-13);
        assert!((ellipk(0.9) - 2.578_092_113_348_173).abs() < 1e-12);
    }

    #[test]
    fn jacobi_functions_satisfy_their_identities() {
        for m in [0.0, 0.1, 0.5, 0.9, 0.99] {
            for k in 0..30 {
                let u = k as f64 * 0.37 - 5.0;
                let (sn, cn, dn) = jacobi(u, m);
                assert!((sn * sn + cn * cn - 1.0).abs() < 1e-12, "m {m} u {u}");
                assert!((dn * dn + m * sn * sn - 1.0).abs() < 1e-12, "m {m} u {u}");
            }
            let (sn, cn, _) = jacobi(ellipk(m), m);
            assert!(
                (sn - 1.0).abs() < 1e-12 && cn.abs() < 1e-7,
                "sn(K) = 1, cn(K) = 0 at m {m}"
            );
        }
    }

    #[test]
    fn exact_solution_starts_at_rest_conserves_energy_and_repeats() {
        let (w, th0) = (3.0, 2.0);
        let sys = Pendulum {
            omega0: w,
            zeta: 0.0,
            force: 0.0,
            omega_drive: 1.0,
        };
        let (t, o) = pendulum_from_rest(th0, w, 0.0);
        assert!((t - th0).abs() < 1e-12 && o.abs() < 1e-12);
        let e0 = sys.energy(&[th0, 0.0]);
        for k in 1..50 {
            let (t, o) = pendulum_from_rest(th0, w, k as f64 * 0.173);
            assert!(
                (sys.energy(&[t, o]) - e0).abs() < 1e-10,
                "energy at step {k}"
            );
        }
        let period = libration_period(w, th0);
        let (t, o) = pendulum_from_rest(th0, w, period);
        assert!((t - th0).abs() < 1e-9 && o.abs() < 1e-8, "{t} {o}");
        // Half a period later it is on the other side.
        let (t, _) = pendulum_from_rest(th0, w, period / 2.0);
        assert!((t + th0).abs() < 1e-9);
    }

    #[test]
    fn rk4_matches_the_exact_pendulum() {
        // docs/VALIDATION.md: nonlinear pendulum vs the elliptic-function solution.
        for th0 in [0.3, 1.5, 2.5, 3.0] {
            let w = 3.0;
            let sys = Pendulum {
                omega0: w,
                zeta: 0.0,
                force: 0.0,
                omega_drive: 1.0,
            };
            let mut y = [th0, 0.0];
            let mut rk4 = Rk4::new(2);
            let dt = 5e-4;
            let steps = (10.0 / dt) as usize;
            for i in 0..steps {
                rk4.step(&sys, i as f64 * dt, &mut y, dt);
            }
            let (t, o) = pendulum_from_rest(th0, w, steps as f64 * dt);
            assert!(
                (y[THETA] - t).abs() < 1e-7,
                "theta0 {th0}: {} vs {t}",
                y[THETA]
            );
            assert!(
                (y[OMEGA] - o).abs() < 1e-6,
                "theta0 {th0}: {} vs {o}",
                y[OMEGA]
            );
        }
    }

    #[test]
    fn period_grows_with_amplitude_as_the_textbook_says() {
        let small = libration_period(2.0, 0.01) / (std::f64::consts::TAU / 2.0);
        assert!(
            (small - 1.0).abs() < 1e-5,
            "small swings follow 2π/ω₀: {small}"
        );
        // At 90° the true period is 1.1803… times the small-angle value.
        let ninety = libration_period(1.0, std::f64::consts::FRAC_PI_2) / std::f64::consts::TAU;
        assert!((ninety - 1.180_340_599_016_096).abs() < 1e-9, "{ninety}");
        assert!(libration_period(1.0, 3.0) > 2.4 * std::f64::consts::TAU);
    }

    #[test]
    fn libration_amplitude_separates_swinging_from_rotating() {
        let w = 2.0;
        let e_swing = 0.5 * 1.0_f64.powi(2) + w * w * (1.0 - 0.5_f64.cos());
        let amp = libration_amplitude(w, e_swing).expect("swings");
        assert!(amp > 0.5);
        // Energy exactly at the top of the swing (the separatrix) or above rotates.
        assert!(libration_amplitude(w, 2.0 * w * w).is_none());
        assert!(libration_amplitude(w, 3.0 * w * w).is_none());
    }

    #[test]
    fn euler_gains_energy_and_semi_implicit_does_not() {
        let sys = Pendulum {
            omega0: 3.0,
            zeta: 0.0,
            force: 0.0,
            omega_drive: 1.0,
        };
        let (mut e, mut s) = ([1.0, 0.0], [1.0, 0.0]);
        let (mut euler, mut semi) = (Euler::new(2), SemiImplicitEuler::new(2));
        let e0 = sys.energy(&e);
        let dt = 0.01;
        let mut worst_semi = 0.0_f64;
        for i in 0..50_000 {
            euler.step(&sys, i as f64 * dt, &mut e, dt);
            semi.step(&sys, i as f64 * dt, &mut s, dt);
            worst_semi = worst_semi.max(((sys.energy(&s) - e0) / e0).abs());
        }
        assert!(sys.energy(&e) > 2.0 * e0, "Euler energy {}", sys.energy(&e));
        assert!(worst_semi < 0.2, "semi-implicit drift {worst_semi}");
    }
}
