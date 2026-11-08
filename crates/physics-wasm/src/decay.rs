use physics::analytic::exp_decay;
use physics::ode::{Euler, Integrator, Rk4, System};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (3 buffers × 200k × 8 B ≈ 4.8 MB).
const MAX_SAMPLES: usize = 200_000;

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

/// Phase 0 demo module: dy/dt = −λy integrated with Euler or RK4, stored
/// alongside the exact solution so the UI can plot both and the error.
#[wasm_bindgen]
pub struct DecaySim {
    sys: Decay,
    y0: f64,
    dt: f64,
    rk4: bool,
    euler: Euler,
    rk4_integ: Rk4,
    y: [f64; 1],
    t: f64,
    total_steps: usize,
    ts: Vec<f64>,
    ys: Vec<f64>,
    exact: Vec<f64>,
}

#[wasm_bindgen]
impl DecaySim {
    /// `method`: 0 = Euler, 1 = RK4. Runs from t = 0 to t = 8/λ.
    #[wasm_bindgen(constructor)]
    pub fn new(lambda: f64, y0: f64, dt: f64, method: u8) -> DecaySim {
        let mut sim = DecaySim {
            sys: Decay { lambda },
            y0,
            dt,
            rk4: method == 1,
            euler: Euler::new(1),
            rk4_integ: Rk4::new(1),
            y: [y0],
            t: 0.0,
            total_steps: 0,
            ts: Vec::with_capacity(MAX_SAMPLES),
            ys: Vec::with_capacity(MAX_SAMPLES),
            exact: Vec::with_capacity(MAX_SAMPLES),
        };
        sim.reset();
        sim
    }

    pub fn set_params(&mut self, lambda: f64, y0: f64, dt: f64, method: u8) {
        self.sys.lambda = lambda;
        self.y0 = y0;
        self.dt = dt;
        self.rk4 = method == 1;
        self.reset();
    }

    pub fn reset(&mut self) {
        let t_end = self.t_end();
        // Never exceed the buffer capacity: clamp dt so the run fits.
        self.dt = self.dt.max(t_end / (MAX_SAMPLES - 1) as f64);
        self.total_steps = (t_end / self.dt).ceil() as usize;
        self.t = 0.0;
        self.y = [self.y0];
        self.ts.clear();
        self.ys.clear();
        self.exact.clear();
        self.record();
    }

    /// Advance up to `steps` steps; returns false once the run is finished.
    pub fn advance(&mut self, steps: u32) -> bool {
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            if self.rk4 {
                self.rk4_integ.step(&self.sys, self.t, &mut self.y, self.dt);
            } else {
                self.euler.step(&self.sys, self.t, &mut self.y, self.dt);
            }
            self.t += self.dt;
            self.record();
        }
        !self.finished()
    }

    pub fn finished(&self) -> bool {
        self.ts.len() > self.total_steps
    }

    pub fn total_steps(&self) -> usize {
        self.total_steps
    }
    pub fn t_end(&self) -> f64 {
        8.0 / self.sys.lambda
    }
    pub fn dt(&self) -> f64 {
        self.dt
    }
    pub fn t(&self) -> f64 {
        self.t
    }
    pub fn y(&self) -> f64 {
        self.y[0]
    }
    pub fn exact_now(&self) -> f64 {
        exp_decay(self.y0, self.sys.lambda, self.t)
    }
    /// Absolute error |y − y_exact| at the current time.
    pub fn abs_error(&self) -> f64 {
        (self.y() - self.exact_now()).abs()
    }

    pub fn len(&self) -> usize {
        self.ts.len()
    }
    pub fn is_empty(&self) -> bool {
        self.ts.is_empty()
    }
    pub fn ts_ptr(&self) -> *const f64 {
        self.ts.as_ptr()
    }
    pub fn ys_ptr(&self) -> *const f64 {
        self.ys.as_ptr()
    }
    pub fn exact_ptr(&self) -> *const f64 {
        self.exact.as_ptr()
    }
}

impl DecaySim {
    fn record(&mut self) {
        self.ts.push(self.t);
        self.ys.push(self.y[0]);
        self.exact.push(exp_decay(self.y0, self.sys.lambda, self.t));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rk4_run_tracks_exact() {
        let mut sim = DecaySim::new(1.0, 1.0, 1e-3, 1);
        while sim.advance(1000) {}
        assert!(sim.finished());
        assert_eq!(sim.len(), sim.total_steps() + 1);
        assert!(sim.abs_error() < 1e-12);
    }

    #[test]
    fn dt_is_clamped_to_capacity() {
        let sim = DecaySim::new(0.1, 1.0, 1e-6, 0);
        assert!(sim.total_steps() < MAX_SAMPLES);
    }
}
