use physics::coupled::{Chain, Modal};
use physics::ode::{Euler, Integrator, Rk4, SemiImplicitEuler, velocity_verlet_step};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (2 buffers × 200k × 8 B ≈ 3.2 MB).
const MAX_SAMPLES: usize = 200_000;
/// Points in the exact curve drawn under the simulation.
const REF_POINTS: usize = 2001;
/// Smallest time step accepted.
const MIN_DT: f64 = 1e-4;
/// Most masses in the chain.
const MAX_N: usize = 8;

/// Module C5: a chain of masses joined by springs, with both ends fixed.
///
/// Starts either with one mass plucked (`mode` 0) or in a single normal mode (`mode` 1…N), and
/// integrates with Euler (0), semi-implicit Euler (1), RK4 (2) or velocity Verlet (3). The exact
/// motion, a sum over normal modes, is kept alongside to compare against.
#[wasm_bindgen]
pub struct CoupledSim {
    chain: Chain,
    mode: usize,
    amp: f64,
    watch: usize,
    duration: f64,
    dt: f64,
    method: u8,
    euler: Euler,
    semi: SemiImplicitEuler,
    rk4: Rk4,
    modal: Modal,
    /// State `[u₁…u_N, v₁…v_N]`.
    y: Vec<f64>,
    acc: Vec<f64>,
    scratch_u: Vec<f64>,
    scratch_v: Vec<f64>,
    t: f64,
    total_steps: usize,
    e0: f64,
    max_err: f64,
    ref_max_u: f64,
    diverged: bool,
    ts: Vec<f64>,
    us: Vec<f64>,
    shape: Vec<f64>,
    exact_shape: Vec<f64>,
    ref_t: Vec<f64>,
    ref_u: Vec<f64>,
}

#[wasm_bindgen]
impl CoupledSim {
    /// `n` masses (1…8). `mode` 0 plucks the first mass by `amp`, `mode` k starts normal mode k
    /// with amplitude `amp`. `watch` is the mass (1-based) whose motion is plotted against time.
    /// `omega0` is the spring frequency √(k/m). `method`: 0 = Euler, 1 = semi-implicit Euler,
    /// 2 = RK4, 3 = velocity Verlet.
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        n: u32,
        mode: u32,
        amp: f64,
        watch: u32,
        omega0: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) -> CoupledSim {
        let chain = Chain { n: 1, omega0 };
        let modal = Modal::new(&chain, &[0.0], &[0.0]);
        let mut sim = CoupledSim {
            chain,
            mode: 0,
            amp,
            watch: 1,
            duration,
            dt,
            method,
            euler: Euler::new(2),
            semi: SemiImplicitEuler::new(2),
            rk4: Rk4::new(2),
            modal,
            y: Vec::new(),
            acc: Vec::new(),
            scratch_u: Vec::new(),
            scratch_v: Vec::new(),
            t: 0.0,
            total_steps: 0,
            e0: 0.0,
            max_err: 0.0,
            ref_max_u: 0.0,
            diverged: false,
            ts: Vec::with_capacity(MAX_SAMPLES),
            us: Vec::with_capacity(MAX_SAMPLES),
            shape: Vec::new(),
            exact_shape: Vec::new(),
            ref_t: Vec::with_capacity(REF_POINTS),
            ref_u: Vec::with_capacity(REF_POINTS),
        };
        sim.set_params(n, mode, amp, watch, omega0, duration, dt, method);
        sim
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_params(
        &mut self,
        n: u32,
        mode: u32,
        amp: f64,
        watch: u32,
        omega0: f64,
        duration: f64,
        dt: f64,
        method: u8,
    ) {
        let n = (n as usize).clamp(1, MAX_N);
        self.chain = Chain { n, omega0 };
        self.mode = (mode as usize).min(n);
        self.amp = amp;
        self.watch = (watch as usize).clamp(1, n);
        self.duration = duration.max(MIN_DT);
        // Never exceed the buffer capacity: clamp dt so the run fits.
        self.dt = dt.max(MIN_DT).max(self.duration / (MAX_SAMPLES - 1) as f64);
        self.method = method;
        self.euler = Euler::new(2 * n);
        self.semi = SemiImplicitEuler::new(2 * n);
        self.rk4 = Rk4::new(2 * n);
        self.reset();
    }

    pub fn reset(&mut self) {
        let n = self.chain.n;
        let mut u0 = vec![0.0; n];
        if self.mode == 0 {
            u0[0] = self.amp;
        } else {
            for (j, u) in u0.iter_mut().enumerate() {
                *u = self.amp * self.chain.mode_shape(self.mode, j + 1);
            }
        }
        let v0 = vec![0.0; n];
        self.modal = Modal::new(&self.chain, &u0, &v0);
        self.y = u0.iter().chain(&v0).copied().collect();
        self.acc = vec![0.0; n];
        self.chain.accel(&self.y[..n], &mut self.acc);
        self.scratch_u = vec![0.0; n];
        self.scratch_v = vec![0.0; n];
        self.shape = vec![0.0; n + 2];
        self.exact_shape = vec![0.0; n + 2];
        self.t = 0.0;
        self.total_steps = (self.duration / self.dt).ceil() as usize;
        self.e0 = self.chain.energy(&self.y);
        self.max_err = 0.0;
        self.diverged = false;
        self.ts.clear();
        self.us.clear();
        self.record();

        // The exact curve for the watched mass, and the widest swing any mass makes.
        self.ref_t.clear();
        self.ref_u.clear();
        self.ref_max_u = 0.0;
        let (mut u, mut v) = (vec![0.0; n], vec![0.0; n]);
        for i in 0..REF_POINTS {
            let t = self.duration * i as f64 / (REF_POINTS - 1) as f64;
            self.modal.at(t, &mut u, &mut v);
            self.ref_t.push(t);
            self.ref_u.push(u[self.watch - 1]);
            for x in &u {
                self.ref_max_u = self.ref_max_u.max(x.abs());
            }
        }
        self.refresh();
    }

    /// Advance up to `steps` steps; returns false once the run is finished.
    pub fn advance(&mut self, steps: u32) -> bool {
        let n = self.chain.n;
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            match self.method {
                0 => self.euler.step(&self.chain, self.t, &mut self.y, self.dt),
                1 => self.semi.step(&self.chain, self.t, &mut self.y, self.dt),
                2 => self.rk4.step(&self.chain, self.t, &mut self.y, self.dt),
                _ => {
                    let (u, v) = self.y.split_at_mut(n);
                    let chain = &self.chain;
                    velocity_verlet_step(u, v, &mut self.acc, self.dt, |x, a| chain.accel(x, a));
                }
            }
            self.t += self.dt;
            self.record();
            if !self.y.iter().all(|x| x.is_finite()) {
                self.diverged = true;
            }
        }
        !self.finished()
    }

    /// Update the snapshot buffers (`shape_ptr`, `exact_shape_ptr`) to the current time.
    pub fn refresh(&mut self) {
        let n = self.chain.n;
        self.modal
            .at(self.t, &mut self.scratch_u, &mut self.scratch_v);
        for j in 0..n {
            self.shape[j + 1] = self.y[j];
            self.exact_shape[j + 1] = self.scratch_u[j];
        }
    }

    pub fn finished(&self) -> bool {
        self.diverged || self.us.len() > self.total_steps
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
    pub fn n(&self) -> usize {
        self.chain.n
    }
    /// Angular frequency of normal mode `k` (1-based).
    pub fn mode_frequency(&self, k: u32) -> f64 {
        self.chain.mode_frequency(k as usize)
    }
    /// Position of the watched mass now, and where the exact motion puts it.
    pub fn watched(&self) -> f64 {
        self.y[self.watch - 1]
    }
    pub fn exact_watched(&self) -> f64 {
        let n = self.chain.n;
        let (mut u, mut v) = (vec![0.0; n], vec![0.0; n]);
        self.modal.at(self.t, &mut u, &mut v);
        u[self.watch - 1]
    }
    /// (E − E₀)/E₀: how far the energy has drifted from its starting value.
    pub fn energy_drift(&self) -> f64 {
        (self.chain.energy(&self.y) - self.e0) / self.e0
    }
    /// Largest distance between any mass and its exact position, over the run so far.
    pub fn max_abs_error(&self) -> f64 {
        self.max_err
    }
    /// Widest swing any mass makes in the exact motion, for sizing the axes.
    pub fn reference_max_u(&self) -> f64 {
        self.ref_max_u
    }

    pub fn len(&self) -> usize {
        self.us.len()
    }
    pub fn is_empty(&self) -> bool {
        self.us.is_empty()
    }
    pub fn ts_ptr(&self) -> *const f64 {
        self.ts.as_ptr()
    }
    pub fn us_ptr(&self) -> *const f64 {
        self.us.as_ptr()
    }
    pub fn reference_len(&self) -> usize {
        self.ref_t.len()
    }
    pub fn reference_t_ptr(&self) -> *const f64 {
        self.ref_t.as_ptr()
    }
    pub fn reference_u_ptr(&self) -> *const f64 {
        self.ref_u.as_ptr()
    }
    /// Snapshot of the chain, walls included (`n + 2` values).
    pub fn shape_len(&self) -> usize {
        self.shape.len()
    }
    pub fn shape_ptr(&self) -> *const f64 {
        self.shape.as_ptr()
    }
    pub fn exact_shape_ptr(&self) -> *const f64 {
        self.exact_shape.as_ptr()
    }
}

impl CoupledSim {
    fn record(&mut self) {
        let n = self.chain.n;
        self.ts.push(self.t);
        self.us.push(self.y[self.watch - 1]);
        self.modal
            .at(self.t, &mut self.scratch_u, &mut self.scratch_v);
        let err = (0..n)
            .map(|j| (self.y[j] - self.scratch_u[j]).abs())
            .fold(0.0, f64::max);
        if err.is_finite() {
            self.max_err = self.max_err.max(err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(sim: &mut CoupledSim) {
        while sim.advance(10_000) {}
    }

    #[test]
    fn rk4_follows_the_exact_motion_of_every_mass() {
        let mut sim = CoupledSim::new(5, 0, 1.0, 2, 2.0, 15.0, 1e-3, 2);
        run(&mut sim);
        assert!(sim.finished() && !sim.diverged());
        assert!(sim.max_abs_error() < 1e-8, "{}", sim.max_abs_error());
    }

    #[test]
    fn two_masses_exchange_energy_in_beats() {
        // Plucking mass 1 of two: u₁ = ½A(cos ω₁t + cos ω₂t), so mass 1 goes nearly still when the
        // two modes are half a cycle apart, at t = π/(ω₂ − ω₁).
        let sim = CoupledSim::new(2, 0, 1.0, 1, 2.0, 20.0, 1e-3, 2);
        let (w1, w2) = (sim.mode_frequency(1), sim.mode_frequency(2));
        let t_still = std::f64::consts::PI / (w2 - w1);
        let i = (t_still / 20.0 * 2000.0).round() as usize;
        assert!(
            sim.ref_u[i].abs() < 0.02,
            "{} at t = {}",
            sim.ref_u[i],
            sim.ref_t[i]
        );
        assert!(sim.ref_u[0] > 0.99);
    }

    #[test]
    fn a_normal_mode_started_alone_stays_alone() {
        let mut sim = CoupledSim::new(4, 2, 0.5, 1, 1.5, 10.0, 1e-3, 2);
        run(&mut sim);
        // Standing wave: every mass swings at ω₂ with fixed relative amplitudes.
        sim.refresh();
        for j in 1..=4 {
            let want = 0.5 * sim.chain.mode_shape(2, j) * (sim.mode_frequency(2) * sim.t()).cos();
            assert!((sim.shape[j] - want).abs() < 1e-7, "mass {j}");
        }
        assert_eq!(
            (sim.shape[0], sim.shape[5]),
            (0.0, 0.0),
            "the walls do not move"
        );
    }

    #[test]
    fn verlet_keeps_the_energy_and_euler_gains_it() {
        let mut verlet = CoupledSim::new(4, 0, 1.0, 1, 2.0, 30.0, 0.01, 3);
        let mut euler = CoupledSim::new(4, 0, 1.0, 1, 2.0, 30.0, 0.01, 0);
        run(&mut verlet);
        run(&mut euler);
        assert!(
            verlet.energy_drift().abs() < 1e-3,
            "{}",
            verlet.energy_drift()
        );
        assert!(euler.energy_drift() > 1.0, "{}", euler.energy_drift());
    }

    #[test]
    fn inputs_are_clamped() {
        let sim = CoupledSim::new(50, 99, 1.0, 99, 2.0, 5.0, 0.01, 2);
        assert_eq!(sim.n(), MAX_N);
        assert_eq!(sim.shape_len(), MAX_N + 2);
        let sim = CoupledSim::new(3, 0, 1.0, 1, 2.0, 60.0, 1e-6, 2);
        assert!(sim.estimated_steps() < MAX_SAMPLES);
    }
}
