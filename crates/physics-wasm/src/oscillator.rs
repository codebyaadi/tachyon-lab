use physics::analytic::damped_driven_oscillator;
use physics::ode::{Euler, Integrator, Rk4, SemiImplicitEuler};
use physics::oscillator::{Oscillator, V, X};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (3 buffers × 200k × 8 B ≈ 4.8 MB).
const MAX_SAMPLES: usize = 200_000;
/// Points in the exact curve drawn under the simulation.
const REF_POINTS: usize = 2001;
/// Smallest time step accepted.
const MIN_DT: f64 = 1e-4;

/// Module C2: a damped, driven oscillator `x'' + 2ζω₀x' + ω₀²x = F cos(ω_d t)`.
///
/// Integrates with Euler (0), semi-implicit Euler (1), RK4 (2) or velocity Verlet (3, which needs
/// ζ = 0; with damping it falls back to RK4) for `duration` seconds and
/// keeps the exact solution to compare against, both as x(t) and as a phase-space path (x, v).
#[wasm_bindgen]
pub struct OscillatorSim {
    sys: Oscillator,
    x0: f64,
    v0: f64,
    duration: f64,
    dt: f64,
    method: u8,
    euler: Euler,
    semi: SemiImplicitEuler,
    rk4: Rk4,
    y: [f64; 2],
    t: f64,
    total_steps: usize,
    e0: f64,
    max_err: f64,
    diverged: bool,
    ts: Vec<f64>,
    xs: Vec<f64>,
    vs: Vec<f64>,
    drifts: Vec<f64>,
    ref_t: Vec<f64>,
    ref_x: Vec<f64>,
    ref_v: Vec<f64>,
}

#[wasm_bindgen]
impl OscillatorSim {
    /// `x0` and `v0` are the start position and velocity, `omega0` the natural angular
    /// frequency (rad/s), `zeta` the damping ratio, `force` and `omega_drive` the drive,
    /// `duration` and `dt` in s, `method`: 0 = Euler, 1 = semi-implicit Euler, 2 = RK4.
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        x0: f64,
        v0: f64,
        omega0: f64,
        zeta: f64,
        force: f64,
        omega_drive: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) -> OscillatorSim {
        let mut sim = OscillatorSim {
            sys: Oscillator {
                omega0,
                zeta,
                force,
                omega_drive,
            },
            x0,
            v0,
            duration,
            dt,
            method,
            euler: Euler::new(2),
            semi: SemiImplicitEuler::new(2),
            rk4: Rk4::new(2),
            y: [0.0; 2],
            t: 0.0,
            total_steps: 0,
            e0: 0.0,
            max_err: 0.0,
            diverged: false,
            ts: Vec::with_capacity(MAX_SAMPLES),
            xs: Vec::with_capacity(MAX_SAMPLES),
            vs: Vec::with_capacity(MAX_SAMPLES),
            drifts: Vec::with_capacity(MAX_SAMPLES),
            ref_t: Vec::with_capacity(REF_POINTS),
            ref_x: Vec::with_capacity(REF_POINTS),
            ref_v: Vec::with_capacity(REF_POINTS),
        };
        sim.set_params(
            x0,
            v0,
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
        x0: f64,
        v0: f64,
        omega0: f64,
        zeta: f64,
        force: f64,
        omega_drive: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) {
        self.x0 = x0;
        self.v0 = v0;
        self.sys = Oscillator {
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
        self.y = [self.x0, self.v0];
        self.t = 0.0;
        self.total_steps = (self.duration / self.dt).ceil() as usize;
        self.e0 = self.sys.energy(&self.y);
        self.max_err = 0.0;
        self.diverged = false;
        self.ts.clear();
        self.xs.clear();
        self.vs.clear();
        self.drifts.clear();
        self.record();

        self.ref_t.clear();
        self.ref_x.clear();
        self.ref_v.clear();
        for i in 0..REF_POINTS {
            let t = self.duration * i as f64 / (REF_POINTS - 1) as f64;
            let s = self.exact(t);
            self.ref_t.push(t);
            self.ref_x.push(s.0);
            self.ref_v.push(s.1);
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
                3 if self.sys.zeta == 0.0 => self.verlet_step(),
                _ => self.rk4.step(&self.sys, self.t, &mut self.y, self.dt),
            }
            self.t += self.dt;
            self.record();
            if !self.y[X].is_finite() || !self.y[V].is_finite() {
                self.diverged = true;
            }
        }
        !self.finished()
    }

    pub fn finished(&self) -> bool {
        self.diverged || self.xs.len() > self.total_steps
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
    pub fn x(&self) -> f64 {
        self.y[X]
    }
    pub fn v(&self) -> f64 {
        self.y[V]
    }
    /// Energy per unit mass now, ½v² + ½ω₀²x².
    pub fn energy(&self) -> f64 {
        self.sys.energy(&self.y)
    }
    /// Energy at the start.
    pub fn energy0(&self) -> f64 {
        self.e0
    }
    pub fn exact_x(&self) -> f64 {
        self.exact(self.t).0
    }
    pub fn exact_v(&self) -> f64 {
        self.exact(self.t).1
    }
    /// |x − x_exact| at the current time.
    pub fn abs_error(&self) -> f64 {
        (self.y[X] - self.exact_x()).abs()
    }
    /// Largest |x − x_exact| over the run so far.
    pub fn max_abs_error(&self) -> f64 {
        self.max_err
    }
    /// Largest |x| and |v| on the exact curve, used to size the axes.
    pub fn reference_max_x(&self) -> f64 {
        self.ref_x.iter().fold(0.0, |m, x| m.max(x.abs()))
    }
    pub fn reference_max_v(&self) -> f64 {
        self.ref_v.iter().fold(0.0, |m, v| m.max(v.abs()))
    }

    pub fn len(&self) -> usize {
        self.xs.len()
    }
    pub fn is_empty(&self) -> bool {
        self.xs.is_empty()
    }
    pub fn ts_ptr(&self) -> *const f64 {
        self.ts.as_ptr()
    }
    pub fn xs_ptr(&self) -> *const f64 {
        self.xs.as_ptr()
    }
    pub fn vs_ptr(&self) -> *const f64 {
        self.vs.as_ptr()
    }
    /// Energy drift (E − E₀)/E₀ at every sample; sample `i` is at time `i·dt`.
    pub fn drift_ptr(&self) -> *const f64 {
        self.drifts.as_ptr()
    }
    pub fn reference_len(&self) -> usize {
        self.ref_t.len()
    }
    pub fn reference_t_ptr(&self) -> *const f64 {
        self.ref_t.as_ptr()
    }
    pub fn reference_x_ptr(&self) -> *const f64 {
        self.ref_x.as_ptr()
    }
    pub fn reference_v_ptr(&self) -> *const f64 {
        self.ref_v.as_ptr()
    }
}

impl OscillatorSim {
    /// One velocity-Verlet step for x'' = −ω₀²x + F cos(ω_d t) (no damping).
    fn verlet_step(&mut self) {
        let (w2, f, wd) = (
            self.sys.omega0 * self.sys.omega0,
            self.sys.force,
            self.sys.omega_drive,
        );
        let (t0, dt) = (self.t, self.dt);
        let a0 = -w2 * self.y[X] + f * (wd * t0).cos();
        let v_half = self.y[V] + 0.5 * dt * a0;
        self.y[X] += dt * v_half;
        let a1 = -w2 * self.y[X] + f * (wd * (t0 + dt)).cos();
        self.y[V] = v_half + 0.5 * dt * a1;
    }

    fn exact(&self, t: f64) -> (f64, f64) {
        let s = damped_driven_oscillator(
            self.x0,
            self.v0,
            self.sys.omega0,
            self.sys.zeta,
            self.sys.force,
            self.sys.omega_drive,
            t,
        );
        (s.x, s.v)
    }

    fn record(&mut self) {
        self.ts.push(self.t);
        self.xs.push(self.y[X]);
        self.vs.push(self.y[V]);
        self.drifts.push(if self.e0 > 0.0 {
            (self.sys.energy(&self.y) - self.e0) / self.e0
        } else {
            0.0
        });
        let err = (self.y[X] - self.exact(self.t).0).abs();
        if err.is_finite() {
            self.max_err = self.max_err.max(err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(sim: &mut OscillatorSim) {
        while sim.advance(10_000) {}
    }

    #[test]
    fn rk4_tracks_the_exact_solution() {
        let mut sim = OscillatorSim::new(1.0, 0.0, 2.0, 0.2, 1.0, 1.5, 20.0, 1e-3, 2);
        run(&mut sim);
        assert!(sim.finished() && !sim.diverged());
        assert!(sim.max_abs_error() < 1e-8, "{}", sim.max_abs_error());
    }

    #[test]
    fn euler_gains_energy_and_semi_implicit_does_not() {
        let mut euler = OscillatorSim::new(1.0, 0.0, 2.0, 0.0, 0.0, 1.0, 20.0, 0.05, 0);
        let mut semi = OscillatorSim::new(1.0, 0.0, 2.0, 0.0, 0.0, 1.0, 20.0, 0.05, 1);
        run(&mut euler);
        run(&mut semi);
        // Euler: E grows by (1 + (ω₀dt)²) every step.
        let n = euler.estimated_steps() as f64;
        let growth = (1.0 + (2.0_f64 * 0.05).powi(2)).powf(n);
        assert!((euler.energy() / euler.energy0() - growth).abs() / growth < 1e-9);
        assert!((semi.energy() / semi.energy0() - 1.0).abs() < 0.2);
    }

    #[test]
    fn default_free_setting_has_a_finite_exact_curve() {
        // The page's defaults: drive frequency equal to ω₀ but no force and no damping.
        let sim = OscillatorSim::new(1.0, 0.0, 2.0, 0.0, 0.0, 2.0, 20.0, 0.02, 2);
        assert!((sim.reference_max_x() - 1.0).abs() < 0.01);
        assert!((sim.reference_max_v() - 2.0).abs() < 0.01);
    }

    #[test]
    fn verlet_keeps_the_energy_bounded_and_the_history_is_recorded() {
        let mut sim = OscillatorSim::new(1.0, 0.0, 2.0, 0.0, 0.0, 1.0, 100.0, 0.05, 3);
        run(&mut sim);
        assert_eq!(sim.drifts.len(), sim.len());
        let worst = sim.drifts.iter().fold(0.0_f64, |m, d| m.max(d.abs()));
        assert!(worst < 0.01 * 2.0, "Verlet drift {worst}");
        // Second order: the phase error over 100 s is a few hundredths of a metre, not 1e-8.
        assert!(sim.max_abs_error() < 0.2, "{}", sim.max_abs_error());
        assert!((sim.drifts[sim.len() - 1] - (sim.energy() / sim.energy0() - 1.0)).abs() < 1e-12);
    }

    #[test]
    fn exact_curve_is_available_before_running() {
        let sim = OscillatorSim::new(1.0, 0.0, 2.0, 0.1, 0.0, 1.0, 10.0, 0.01, 2);
        assert_eq!(sim.reference_len(), REF_POINTS);
        assert!((sim.reference_max_x() - 1.0).abs() < 0.01);
        assert_eq!(sim.len(), 1);
    }

    #[test]
    fn unstable_euler_is_flagged_instead_of_plotting_infinity() {
        // Each step multiplies the energy by 10, so a long run overflows an f64.
        let mut sim = OscillatorSim::new(1.0, 0.0, 6.0, 0.0, 0.0, 1.0, 2000.0, 0.5, 0);
        run(&mut sim);
        assert!(sim.diverged());
        assert!(sim.finished());
    }

    #[test]
    fn dt_is_clamped_to_capacity() {
        let sim = OscillatorSim::new(1.0, 0.0, 2.0, 0.0, 0.0, 1.0, 60.0, 1e-6, 2);
        assert!(sim.estimated_steps() < MAX_SAMPLES);
    }
}
