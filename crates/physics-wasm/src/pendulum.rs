use physics::ode::{Euler, Integrator, Rk4, SemiImplicitEuler};
use physics::pendulum::{OMEGA, Pendulum, THETA, libration_amplitude, libration_period};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (3 buffers × 200k × 8 B ≈ 4.8 MB).
const MAX_SAMPLES: usize = 200_000;
/// Points in the reference curve drawn under the simulation.
const REF_POINTS: usize = 2001;
/// Smallest time step accepted.
const MIN_DT: f64 = 1e-4;
/// The reference solution is RK4 with steps no larger than this (accurate to about 1e-9).
const REF_DT: f64 = 1e-3;

/// Module C4: a damped, driven pendulum `θ'' = −ω₀² sin θ − 2ζω₀ θ' + F cos(ω_d t)`.
///
/// Integrates with Euler (0), semi-implicit Euler (1) or RK4 (2). The reference it is compared
/// against is the same equation solved by RK4 with a tiny step, run alongside in lock-step. The
/// tests check that reference against the exact elliptic-function solution. (A strongly driven
/// pendulum can be chaotic: even two accurate solutions then drift apart.)
#[wasm_bindgen]
pub struct PendulumSim {
    sys: Pendulum,
    theta0: f64,
    omega_start: f64,
    duration: f64,
    dt: f64,
    method: u8,
    euler: Euler,
    semi: SemiImplicitEuler,
    rk4: Rk4,
    ref_rk4: Rk4,
    y: [f64; 2],
    y_ref: [f64; 2],
    t: f64,
    total_steps: usize,
    e0: f64,
    max_err: f64,
    diverged: bool,
    ts: Vec<f64>,
    thetas: Vec<f64>,
    omegas: Vec<f64>,
    ref_t: Vec<f64>,
    ref_theta: Vec<f64>,
    ref_omega: Vec<f64>,
}

#[wasm_bindgen]
impl PendulumSim {
    /// `theta0_deg` is the start angle from straight down in degrees, `omega_start` the start
    /// angular velocity (rad/s), `omega0` the small-swing frequency, `zeta` the damping ratio,
    /// `force` and `omega_drive` the drive, `duration` and `dt` in s,
    /// `method`: 0 = Euler, 1 = semi-implicit Euler, 2 = RK4.
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        theta0_deg: f64,
        omega_start: f64,
        omega0: f64,
        zeta: f64,
        force: f64,
        omega_drive: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) -> PendulumSim {
        let mut sim = PendulumSim {
            sys: Pendulum {
                omega0,
                zeta,
                force,
                omega_drive,
            },
            theta0: theta0_deg.to_radians(),
            omega_start,
            duration,
            dt,
            method,
            euler: Euler::new(2),
            semi: SemiImplicitEuler::new(2),
            rk4: Rk4::new(2),
            ref_rk4: Rk4::new(2),
            y: [0.0; 2],
            y_ref: [0.0; 2],
            t: 0.0,
            total_steps: 0,
            e0: 0.0,
            max_err: 0.0,
            diverged: false,
            ts: Vec::with_capacity(MAX_SAMPLES),
            thetas: Vec::with_capacity(MAX_SAMPLES),
            omegas: Vec::with_capacity(MAX_SAMPLES),
            ref_t: Vec::with_capacity(REF_POINTS),
            ref_theta: Vec::with_capacity(REF_POINTS),
            ref_omega: Vec::with_capacity(REF_POINTS),
        };
        sim.set_params(
            theta0_deg,
            omega_start,
            omega0,
            zeta,
            force,
            omega_drive,
            duration,
            dt,
            method,
        );
        sim
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_params(
        &mut self,
        theta0_deg: f64,
        omega_start: f64,
        omega0: f64,
        zeta: f64,
        force: f64,
        omega_drive: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) {
        self.theta0 = theta0_deg.to_radians();
        self.omega_start = omega_start;
        self.sys = Pendulum {
            omega0,
            zeta,
            force,
            omega_drive,
        };
        self.duration = duration.max(MIN_DT);
        // Never exceed the buffer capacity: clamp dt so the run fits.
        self.dt = dt.max(MIN_DT).max(self.duration / (MAX_SAMPLES - 1) as f64);
        self.method = method;
        self.reset();
    }

    pub fn reset(&mut self) {
        self.y = [self.theta0, self.omega_start];
        self.y_ref = self.y;
        self.t = 0.0;
        self.total_steps = (self.duration / self.dt).ceil() as usize;
        self.e0 = self.sys.energy(&self.y);
        self.max_err = 0.0;
        self.diverged = false;
        self.ts.clear();
        self.thetas.clear();
        self.omegas.clear();
        self.record();

        // The drawn reference curve: the same fine RK4, sampled REF_POINTS times.
        self.ref_t.clear();
        self.ref_theta.clear();
        self.ref_omega.clear();
        let spacing = self.duration / (REF_POINTS - 1) as f64;
        let sub = (spacing / REF_DT).ceil().max(1.0) as usize;
        let h = spacing / sub as f64;
        let mut y = [self.theta0, self.omega_start];
        let mut t = 0.0;
        for i in 0..REF_POINTS {
            self.ref_t.push(i as f64 * spacing);
            self.ref_theta.push(y[THETA]);
            self.ref_omega.push(y[OMEGA]);
            for _ in 0..sub {
                self.ref_rk4.step(&self.sys, t, &mut y, h);
                t += h;
            }
        }
    }

    /// Advance up to `steps` steps; returns false once the run is finished.
    pub fn advance(&mut self, steps: u32) -> bool {
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            match self.method {
                0 => self.euler.step(&self.sys, self.t, &mut self.y, self.dt),
                1 => self.semi.step(&self.sys, self.t, &mut self.y, self.dt),
                _ => self.rk4.step(&self.sys, self.t, &mut self.y, self.dt),
            }
            // Keep the reference at the same time as the simulation.
            let sub = (self.dt / REF_DT).ceil().max(1.0) as usize;
            let h = self.dt / sub as f64;
            let mut tr = self.t;
            for _ in 0..sub {
                self.ref_rk4.step(&self.sys, tr, &mut self.y_ref, h);
                tr += h;
            }
            self.t += self.dt;
            self.record();
            if !self.y[THETA].is_finite() || !self.y[OMEGA].is_finite() {
                self.diverged = true;
            }
        }
        !self.finished()
    }

    pub fn finished(&self) -> bool {
        self.diverged || self.thetas.len() > self.total_steps
    }
    /// True if the numerical solution overflowed (an unstable step size).
    pub fn diverged(&self) -> bool {
        self.diverged
    }
    pub fn estimated_steps(&self) -> usize {
        self.total_steps
    }
    pub fn dt(&self) -> f64 {
        self.dt
    }
    pub fn t(&self) -> f64 {
        self.t
    }
    /// Angle in degrees.
    pub fn theta_deg(&self) -> f64 {
        self.y[THETA].to_degrees()
    }
    pub fn omega(&self) -> f64 {
        self.y[OMEGA]
    }
    pub fn energy(&self) -> f64 {
        self.sys.energy(&self.y)
    }
    pub fn energy0(&self) -> f64 {
        self.e0
    }
    /// Reference angle in degrees at the current time.
    pub fn reference_theta_deg(&self) -> f64 {
        self.y_ref[THETA].to_degrees()
    }
    /// |θ − θ_reference| in radians at the current time.
    pub fn abs_error(&self) -> f64 {
        (self.y[THETA] - self.y_ref[THETA]).abs()
    }
    pub fn max_abs_error(&self) -> f64 {
        self.max_err
    }
    /// The small-swing period 2π/ω₀, which the real period approaches for tiny amplitudes.
    pub fn small_angle_period(&self) -> f64 {
        std::f64::consts::TAU / self.sys.omega0
    }
    /// The exact period of an undamped, undriven pendulum that swings (4K(k)/ω₀), or NaN if it
    /// is damped, driven, or has enough energy to rotate.
    pub fn exact_period(&self) -> f64 {
        if self.sys.zeta > 0.0 || self.sys.force > 0.0 {
            return f64::NAN;
        }
        match libration_amplitude(self.sys.omega0, self.e0) {
            Some(amp) => libration_period(self.sys.omega0, amp),
            None => f64::NAN,
        }
    }
    /// The swing limit in degrees for an undamped, undriven pendulum, or NaN if it rotates.
    pub fn swing_limit_deg(&self) -> f64 {
        if self.sys.zeta > 0.0 || self.sys.force > 0.0 {
            return f64::NAN;
        }
        libration_amplitude(self.sys.omega0, self.e0).map_or(f64::NAN, f64::to_degrees)
    }
    /// Largest |θ| and |θ'| on the reference curve, used to size the axes.
    pub fn reference_max_theta(&self) -> f64 {
        self.ref_theta.iter().fold(0.0, |m, x| m.max(x.abs()))
    }
    pub fn reference_max_omega(&self) -> f64 {
        self.ref_omega.iter().fold(0.0, |m, v| m.max(v.abs()))
    }

    pub fn len(&self) -> usize {
        self.thetas.len()
    }
    pub fn is_empty(&self) -> bool {
        self.thetas.is_empty()
    }
    pub fn ts_ptr(&self) -> *const f64 {
        self.ts.as_ptr()
    }
    pub fn thetas_ptr(&self) -> *const f64 {
        self.thetas.as_ptr()
    }
    pub fn omegas_ptr(&self) -> *const f64 {
        self.omegas.as_ptr()
    }
    pub fn reference_len(&self) -> usize {
        self.ref_t.len()
    }
    pub fn reference_t_ptr(&self) -> *const f64 {
        self.ref_t.as_ptr()
    }
    pub fn reference_theta_ptr(&self) -> *const f64 {
        self.ref_theta.as_ptr()
    }
    pub fn reference_omega_ptr(&self) -> *const f64 {
        self.ref_omega.as_ptr()
    }
}

impl PendulumSim {
    fn record(&mut self) {
        self.ts.push(self.t);
        self.thetas.push(self.y[THETA]);
        self.omegas.push(self.y[OMEGA]);
        let err = (self.y[THETA] - self.y_ref[THETA]).abs();
        if err.is_finite() {
            self.max_err = self.max_err.max(err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use physics::pendulum::pendulum_from_rest;

    fn run(sim: &mut PendulumSim) {
        while sim.advance(10_000) {}
    }

    #[test]
    fn the_reference_curve_matches_the_exact_elliptic_solution() {
        // The lab's reference is fine RK4; it must agree with the exact solution.
        for deg in [20.0, 90.0, 150.0] {
            let sim = PendulumSim::new(deg, 0.0, 3.0, 0.0, 0.0, 1.0, 20.0, 0.01, 2);
            let theta0 = f64::to_radians(deg);
            for (i, (t, th)) in sim.ref_t.iter().zip(&sim.ref_theta).enumerate().step_by(50) {
                let (exact, _) = pendulum_from_rest(theta0, 3.0, *t);
                assert!(
                    (th - exact).abs() < 1e-8,
                    "deg {deg}, sample {i}: {th} vs {exact}"
                );
            }
        }
    }

    #[test]
    fn rk4_follows_the_reference_and_euler_does_not() {
        let mut rk4 = PendulumSim::new(120.0, 0.0, 3.0, 0.0, 0.0, 1.0, 20.0, 0.01, 2);
        let mut euler = PendulumSim::new(120.0, 0.0, 3.0, 0.0, 0.0, 1.0, 20.0, 0.01, 0);
        run(&mut rk4);
        run(&mut euler);
        assert!(rk4.max_abs_error() < 1e-6, "{}", rk4.max_abs_error());
        assert!(euler.max_abs_error() > 0.1, "{}", euler.max_abs_error());
        assert!(euler.energy() > 1.5 * euler.energy0());
    }

    #[test]
    fn period_and_swing_limit_come_from_the_energy() {
        let sim = PendulumSim::new(90.0, 0.0, 2.0, 0.0, 0.0, 1.0, 10.0, 0.01, 2);
        assert!((sim.swing_limit_deg() - 90.0).abs() < 1e-9);
        assert!((sim.exact_period() / sim.small_angle_period() - 1.180_340_599).abs() < 1e-8);
        // Damped, driven or rotating: no closed-form period.
        assert!(
            PendulumSim::new(90.0, 0.0, 2.0, 0.1, 0.0, 1.0, 10.0, 0.01, 2)
                .exact_period()
                .is_nan()
        );
        assert!(
            PendulumSim::new(90.0, 0.0, 2.0, 0.0, 0.5, 1.0, 10.0, 0.01, 2)
                .exact_period()
                .is_nan()
        );
        // 30° with a hard push down at 5 rad/s has more energy than the top: it goes round.
        assert!(
            PendulumSim::new(30.0, 5.0, 2.0, 0.0, 0.0, 1.0, 10.0, 0.01, 2)
                .exact_period()
                .is_nan()
        );
    }

    #[test]
    fn a_big_push_makes_it_rotate() {
        let mut sim = PendulumSim::new(0.0, 6.0, 2.0, 0.0, 0.0, 1.0, 10.0, 0.005, 2);
        run(&mut sim);
        // 2ω₀ = 4 rad/s is the separatrix; 6 rad/s keeps going round, so θ grows without bound.
        assert!(sim.theta_deg() > 360.0, "{}", sim.theta_deg());
    }

    #[test]
    fn unstable_euler_is_flagged() {
        let mut sim = PendulumSim::new(170.0, 0.0, 6.0, 0.0, 0.0, 1.0, 2000.0, 0.5, 0);
        run(&mut sim);
        assert!(sim.finished());
    }

    #[test]
    fn dt_is_clamped_to_capacity() {
        let sim = PendulumSim::new(60.0, 0.0, 2.0, 0.0, 0.0, 1.0, 60.0, 1e-6, 2);
        assert!(sim.estimated_steps() < MAX_SAMPLES);
    }
}
