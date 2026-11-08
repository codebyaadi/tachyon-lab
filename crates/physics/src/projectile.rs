//! A point mass in the vertical plane under gravity and air drag (module C1).

use crate::ode::System;

/// State vector layout used by [`Projectile`]: `[x, y, vx, vy]`.
pub const X: usize = 0;
pub const Y: usize = 1;
pub const VX: usize = 2;
pub const VY: usize = 3;

/// Acceleration a = −g·ŷ − (linear + quadratic·|v|)·v, per unit mass.
///
/// `linear` is k = b/m (1/time); `quadratic` is c = ρC_dA/2m (1/length).
pub struct Projectile {
    pub g: f64,
    pub linear: f64,
    pub quadratic: f64,
}

impl Projectile {
    /// Mechanical energy per unit mass: ½|v|² + g·y. Conserved only when there is no drag.
    pub fn energy(&self, y: &[f64]) -> f64 {
        0.5 * (y[VX] * y[VX] + y[VY] * y[VY]) + self.g * y[Y]
    }
}

impl System for Projectile {
    fn dim(&self) -> usize {
        4
    }
    fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
        let speed = y[VX].hypot(y[VY]);
        let drag = self.linear + self.quadratic * speed;
        dy[X] = y[VX];
        dy[Y] = y[VY];
        dy[VX] = -drag * y[VX];
        dy[VY] = -self.g - drag * y[VY];
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analytic::{
        State2, landing_time_no_drag, projectile_linear_drag, projectile_no_drag,
        terminal_speed_quadratic,
    };
    use crate::ode::{Integrator, Rk4};
    use approx::assert_relative_eq;

    const G: f64 = 9.81;
    const LAUNCH: State2 = State2 {
        x: 0.0,
        y: 2.0,
        vx: 30.0,
        vy: 40.0,
    };

    fn run_rk4(sys: &Projectile, dt: f64, t_end: f64) -> [f64; 4] {
        let mut y = [LAUNCH.x, LAUNCH.y, LAUNCH.vx, LAUNCH.vy];
        let mut rk4 = Rk4::new(4);
        let steps = (t_end / dt).round() as usize;
        for i in 0..steps {
            rk4.step(sys, i as f64 * dt, &mut y, dt);
        }
        y
    }

    fn assert_state(y: [f64; 4], s: State2, tol: f64) {
        for (got, want) in y.iter().zip([s.x, s.y, s.vx, s.vy]) {
            assert_relative_eq!(*got, want, epsilon = 1e-9, max_relative = tol);
        }
    }

    #[test]
    fn rk4_no_drag_matches_parabola() {
        // docs/VALIDATION.md: relative error < 1e-8 (RK4, dt = 1e-3).
        let sys = Projectile {
            g: G,
            linear: 0.0,
            quadratic: 0.0,
        };
        let y = run_rk4(&sys, 1e-3, 5.0);
        assert_state(y, projectile_no_drag(LAUNCH, G, 5.0), 1e-8);
    }

    #[test]
    fn rk4_linear_drag_matches_analytic() {
        let k = 0.3;
        let sys = Projectile {
            g: G,
            linear: k,
            quadratic: 0.0,
        };
        let y = run_rk4(&sys, 1e-3, 5.0);
        assert_state(y, projectile_linear_drag(LAUNCH, G, k, 5.0), 1e-8);
    }

    #[test]
    fn linear_drag_tends_to_no_drag_as_k_vanishes() {
        let a = projectile_linear_drag(LAUNCH, G, 1e-7, 4.0);
        let b = projectile_no_drag(LAUNCH, G, 4.0);
        assert_relative_eq!(a.x, b.x, max_relative = 1e-6);
        assert_relative_eq!(a.y, b.y, max_relative = 1e-6);
    }

    #[test]
    fn landing_time_is_the_root_of_height() {
        let t = landing_time_no_drag(LAUNCH.y, LAUNCH.vy, G);
        assert!(projectile_no_drag(LAUNCH, G, t).y.abs() < 1e-9);
    }

    #[test]
    fn quadratic_drag_reaches_terminal_speed() {
        let c = 0.02;
        let sys = Projectile {
            g: G,
            linear: 0.0,
            quadratic: c,
        };
        let mut y = [0.0, 1.0e4, 0.0, 0.0];
        let mut rk4 = Rk4::new(4);
        for i in 0..20_000 {
            rk4.step(&sys, i as f64 * 1e-3, &mut y, 1e-3);
        }
        assert_relative_eq!(-y[VY], terminal_speed_quadratic(G, c), max_relative = 1e-6);
    }

    #[test]
    fn drag_dissipates_energy_and_no_drag_conserves_it() {
        let free = Projectile {
            g: G,
            linear: 0.0,
            quadratic: 0.0,
        };
        let drag = Projectile {
            g: G,
            linear: 0.1,
            quadratic: 0.0,
        };
        let e0 = free.energy(&[LAUNCH.x, LAUNCH.y, LAUNCH.vx, LAUNCH.vy]);
        assert_relative_eq!(
            free.energy(&run_rk4(&free, 1e-3, 3.0)),
            e0,
            max_relative = 1e-9
        );
        assert!(drag.energy(&run_rk4(&drag, 1e-3, 3.0)) < e0);
    }
}

#[cfg(test)]
mod landing_tests {
    use super::*;
    use crate::analytic::{
        State2, landing_time_linear_drag, landing_time_no_drag, projectile_linear_drag,
    };
    use crate::ode::{Integrator, Rk4, SemiImplicitEuler};
    use approx::assert_relative_eq;

    const G: f64 = 9.81;
    const LAUNCH: State2 = State2 {
        x: 0.0,
        y: 2.0,
        vx: 30.0,
        vy: 40.0,
    };

    #[test]
    fn linear_drag_landing_time_reduces_to_no_drag() {
        let t = landing_time_linear_drag(LAUNCH, G, 0.0);
        assert_relative_eq!(t, landing_time_no_drag(2.0, 40.0, G), epsilon = 1e-12);
    }

    #[test]
    fn linear_drag_landing_time_is_a_root_of_the_height() {
        for k in [0.01, 0.3, 2.0] {
            let t = landing_time_linear_drag(LAUNCH, G, k);
            assert!(
                projectile_linear_drag(LAUNCH, G, k, t).y.abs() < 1e-9,
                "k = {k}"
            );
        }
        // Worked value used in the lab notebook: k = 0.3 lands after about 6.38 s, 85.2 m away.
        let t = landing_time_linear_drag(LAUNCH, G, 0.3);
        assert_relative_eq!(t, 6.3784, max_relative = 1e-4);
        assert_relative_eq!(
            projectile_linear_drag(LAUNCH, G, 0.3, t).x,
            85.24,
            max_relative = 1e-3
        );
    }

    #[test]
    fn linear_drag_landing_handles_a_drop_from_rest() {
        // Released horizontally from 100 m: drag makes the fall take longer than √(2h/g).
        let s0 = State2 {
            x: 0.0,
            y: 100.0,
            vx: 10.0,
            vy: 0.0,
        };
        let free = landing_time_no_drag(100.0, 0.0, G);
        assert!(landing_time_linear_drag(s0, G, 0.5) > free);
        // Already on the ground and moving down: lands immediately.
        let ground = State2 {
            x: 0.0,
            y: 0.0,
            vx: 1.0,
            vy: -1.0,
        };
        assert_eq!(landing_time_linear_drag(ground, G, 0.5), 0.0);
    }

    #[test]
    fn rk4_landing_agrees_with_the_closed_form_for_linear_drag() {
        let (k, dt) = (0.3, 1e-3);
        let sys = Projectile {
            g: G,
            linear: k,
            quadratic: 0.0,
        };
        let mut y = [LAUNCH.x, LAUNCH.y, LAUNCH.vx, LAUNCH.vy];
        let mut rk4 = Rk4::new(4);
        let mut t = 0.0;
        loop {
            let prev = y;
            rk4.step(&sys, t, &mut y, dt);
            if y[Y] < 0.0 {
                // linear interpolation to y = 0
                let f = prev[Y] / (prev[Y] - y[Y]);
                t += f * dt;
                break;
            }
            t += dt;
        }
        assert_relative_eq!(
            t,
            landing_time_linear_drag(LAUNCH, G, k),
            max_relative = 1e-6
        );
    }

    #[test]
    fn semi_implicit_projectile_loses_the_predicted_height() {
        // With gravity only, semi-implicit Euler's height is low by exactly ½·g·t·dt
        // (docs/notebook/01), so it lands early. Check the height error at t = 2 s.
        let (dt, t_end): (f64, f64) = (0.01, 2.0);
        let sys = Projectile {
            g: G,
            linear: 0.0,
            quadratic: 0.0,
        };
        let mut y = [0.0, 0.0, 10.0, 20.0];
        let mut integ = SemiImplicitEuler::new(4);
        let steps = (t_end / dt).round() as usize;
        for i in 0..steps {
            integ.step(&sys, i as f64 * dt, &mut y, dt);
        }
        let exact = 20.0 * t_end - 0.5 * G * t_end * t_end;
        assert_relative_eq!(y[Y] - exact, -0.5 * G * t_end * dt, epsilon = 1e-9);
    }
}
