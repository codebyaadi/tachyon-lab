use physics::analytic::{
    State2, landing_time_linear_drag, landing_time_no_drag, projectile_linear_drag,
    projectile_no_drag,
};
use physics::ode::{Euler, Integrator, Rk4, SemiImplicitEuler};
use physics::projectile::{Projectile, VX, VY, X, Y};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (3 buffers × 200k × 8 B ≈ 4.8 MB).
const MAX_SAMPLES: usize = 200_000;
/// Points in the reference curve drawn under the simulation.
const REF_POINTS: usize = 257;
/// Smallest time step accepted (keeps long flights within the sample cap).
const MIN_DT: f64 = 1e-4;

/// Module C1: a point mass launched in the vertical plane under gravity and air drag.
///
/// Integrates with Euler (0), semi-implicit Euler (1) or RK4 (2) until it lands, and keeps a
/// *reference* curve to compare against: the exact closed-form trajectory when the drag is
/// linear (or absent), or the drag-free parabola when quadratic drag makes an exact answer
/// impossible (see [`ProjectileSim::reference_is_exact`]).
#[wasm_bindgen]
pub struct ProjectileSim {
    sys: Projectile,
    s0: State2,
    dt: f64,
    method: u8,
    euler: Euler,
    semi: SemiImplicitEuler,
    rk4: Rk4,
    y: [f64; 4],
    t: f64,
    landed: bool,
    truncated: bool,
    land_t: f64,
    land_x: f64,
    max_h: f64,
    e0: f64,
    ts: Vec<f64>,
    xs: Vec<f64>,
    ys: Vec<f64>,
    ref_x: Vec<f64>,
    ref_y: Vec<f64>,
    ref_exact: bool,
    ref_t: f64,
}

#[wasm_bindgen]
impl ProjectileSim {
    /// `speed` in m/s, `angle_deg` above the horizontal, `height` in m (≥ 0), `g` in m/s²,
    /// `linear` drag k in 1/s, `quadratic` drag c in 1/m, `dt` in s,
    /// `method`: 0 = Euler, 1 = semi-implicit Euler, 2 = RK4.
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        speed: f64,
        angle_deg: f64,
        height: f64,
        g: f64,
        linear: f64,
        quadratic: f64,
        dt: f64,
        method: u8,
    ) -> ProjectileSim {
        let mut sim = ProjectileSim {
            sys: Projectile {
                g,
                linear,
                quadratic,
            },
            s0: State2 {
                x: 0.0,
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
            },
            dt,
            method,
            euler: Euler::new(4),
            semi: SemiImplicitEuler::new(4),
            rk4: Rk4::new(4),
            y: [0.0; 4],
            t: 0.0,
            landed: false,
            truncated: false,
            land_t: 0.0,
            land_x: 0.0,
            max_h: 0.0,
            e0: 0.0,
            ts: Vec::with_capacity(MAX_SAMPLES),
            xs: Vec::with_capacity(MAX_SAMPLES),
            ys: Vec::with_capacity(MAX_SAMPLES),
            ref_x: Vec::with_capacity(REF_POINTS),
            ref_y: Vec::with_capacity(REF_POINTS),
            ref_exact: true,
            ref_t: 0.0,
        };
        sim.set_params(speed, angle_deg, height, g, linear, quadratic, dt, method);
        sim
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_params(
        &mut self,
        speed: f64,
        angle_deg: f64,
        height: f64,
        g: f64,
        linear: f64,
        quadratic: f64,
        dt: f64,
        method: u8,
    ) {
        let a = angle_deg.to_radians();
        self.s0 = State2 {
            x: 0.0,
            y: height.max(0.0),
            vx: speed * a.cos(),
            vy: speed * a.sin(),
        };
        self.sys = Projectile {
            g,
            linear,
            quadratic,
        };
        self.dt = dt.max(MIN_DT);
        self.method = method;
        self.reset();
    }

    pub fn reset(&mut self) {
        let s0 = self.s0;
        self.y = [s0.x, s0.y, s0.vx, s0.vy];
        self.t = 0.0;
        self.landed = false;
        self.truncated = false;
        self.land_t = 0.0;
        self.land_x = 0.0;
        self.max_h = s0.y;
        self.e0 = self.sys.energy(&self.y);
        self.ts.clear();
        self.xs.clear();
        self.ys.clear();
        self.build_reference();
        // Starting on the ground and not moving upward: it has already landed.
        if s0.y <= 0.0 && s0.vy <= 0.0 {
            self.landed = true;
            self.land_x = s0.x;
        }
        self.record();
    }

    /// Advance up to `steps` steps; returns false once the flight is over.
    pub fn advance(&mut self, steps: u32) -> bool {
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            let prev = self.y;
            let prev_t = self.t;
            match self.method {
                0 => self.euler.step(&self.sys, self.t, &mut self.y, self.dt),
                1 => self.semi.step(&self.sys, self.t, &mut self.y, self.dt),
                _ => self.rk4.step(&self.sys, self.t, &mut self.y, self.dt),
            }
            self.t += self.dt;
            if self.y[Y] < 0.0 {
                // Crossed the ground during this step. Find where, using a cubic Hermite curve
                // through both ends (it uses the velocities, so it is exact for a parabola), and
                // end the curve there with the velocity at that moment.
                let next = self.y;
                let (mut lo, mut hi) = (0.0_f64, 1.0_f64);
                for _ in 0..60 {
                    let mid = 0.5 * (lo + hi);
                    let h = hermite(prev[Y], prev[VY], next[Y], next[VY], self.dt, mid);
                    if h > 0.0 {
                        lo = mid;
                    } else {
                        hi = mid;
                    }
                }
                let s = 0.5 * (lo + hi);
                self.land_x = hermite(prev[X], prev[VX], next[X], next[VX], self.dt, s);
                self.land_t = prev_t + s * self.dt;
                self.y = [
                    self.land_x,
                    0.0,
                    prev[VX] + s * (next[VX] - prev[VX]),
                    prev[VY] + s * (next[VY] - prev[VY]),
                ];
                self.t = self.land_t;
                self.landed = true;
            }
            self.max_h = self.max_h.max(self.y[Y]);
            self.record();
            if !self.landed && self.ts.len() >= MAX_SAMPLES {
                self.truncated = true;
            }
        }
        !self.finished()
    }

    /// True once the projectile has landed (or the sample limit was hit).
    pub fn finished(&self) -> bool {
        self.landed || self.truncated
    }
    pub fn landed(&self) -> bool {
        self.landed
    }
    pub fn truncated(&self) -> bool {
        self.truncated
    }

    /// Rough number of steps a full flight needs, for pacing the animation.
    pub fn estimated_steps(&self) -> usize {
        ((self.ref_t / self.dt).ceil() as usize).clamp(1, MAX_SAMPLES)
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
    pub fn y(&self) -> f64 {
        self.y[Y]
    }
    pub fn speed(&self) -> f64 {
        self.y[VX].hypot(self.y[VY])
    }
    pub fn max_height(&self) -> f64 {
        self.max_h
    }
    /// Mechanical energy per unit mass lost so far (initial minus current); negative if gained.
    pub fn energy_lost(&self) -> f64 {
        self.e0 - self.sys.energy(&self.y)
    }
    pub fn land_t(&self) -> f64 {
        self.land_t
    }
    pub fn land_x(&self) -> f64 {
        self.land_x
    }

    /// True when the reference curve is the exact solution for this drag (none or linear);
    /// false when it is only the drag-free parabola (quadratic drag has no closed form).
    pub fn reference_is_exact(&self) -> bool {
        self.ref_exact
    }
    pub fn reference_land_t(&self) -> f64 {
        self.ref_t
    }
    pub fn reference_range(&self) -> f64 {
        self.ref_x.last().copied().unwrap_or(0.0)
    }
    pub fn reference_max_x(&self) -> f64 {
        self.ref_x.iter().copied().fold(0.0, f64::max)
    }
    pub fn reference_max_y(&self) -> f64 {
        self.ref_y.iter().copied().fold(self.s0.y, f64::max)
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
    pub fn xs_ptr(&self) -> *const f64 {
        self.xs.as_ptr()
    }
    pub fn ys_ptr(&self) -> *const f64 {
        self.ys.as_ptr()
    }
    pub fn reference_len(&self) -> usize {
        self.ref_x.len()
    }
    pub fn reference_x_ptr(&self) -> *const f64 {
        self.ref_x.as_ptr()
    }
    pub fn reference_y_ptr(&self) -> *const f64 {
        self.ref_y.as_ptr()
    }
}

impl ProjectileSim {
    fn record(&mut self) {
        self.ts.push(self.t);
        self.xs.push(self.y[X]);
        self.ys.push(self.y[Y]);
    }

    /// Sample the reference trajectory from launch to its own landing.
    fn build_reference(&mut self) {
        let (s0, g, k) = (self.s0, self.sys.g, self.sys.linear);
        self.ref_exact = self.sys.quadratic == 0.0;
        self.ref_t = if self.ref_exact {
            landing_time_linear_drag(s0, g, k)
        } else {
            landing_time_no_drag(s0.y, s0.vy, g)
        };
        self.ref_x.clear();
        self.ref_y.clear();
        for i in 0..REF_POINTS {
            let t = self.ref_t * i as f64 / (REF_POINTS - 1) as f64;
            let s = if self.ref_exact {
                projectile_linear_drag(s0, g, k, t)
            } else {
                projectile_no_drag(s0, g, t)
            };
            self.ref_x.push(s.x);
            self.ref_y.push(s.y.max(0.0));
        }
    }
}

/// Cubic Hermite interpolation of a quantity from its values `p0`, `p1` and its rates of change
/// `m0`, `m1` (per unit time) at the two ends of a step of length `dt`; `s` in [0, 1] is the
/// fraction of the step. Exact for any quadratic, so a parabolic path is reproduced exactly.
fn hermite(p0: f64, m0: f64, p1: f64, m1: f64, dt: f64, s: f64) -> f64 {
    let (s2, s3) = (s * s, s * s * s);
    (2.0 * s3 - 3.0 * s2 + 1.0) * p0
        + (s3 - 2.0 * s2 + s) * dt * m0
        + (3.0 * s2 - 2.0 * s3) * p1
        + (s3 - s2) * dt * m1
}

#[cfg(test)]
mod tests {
    use super::*;

    const RK4: u8 = 2;
    const EULER: u8 = 0;
    const SEMI: u8 = 1;

    fn fly(sim: &mut ProjectileSim) {
        while sim.advance(10_000) {}
    }

    #[test]
    fn rk4_lands_where_the_parabola_says() {
        let mut sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 1e-3, RK4);
        assert!(sim.reference_is_exact());
        fly(&mut sim);
        assert!(sim.landed());
        assert!((sim.land_x() / sim.reference_range() - 1.0).abs() < 1e-6);
        assert!((sim.land_t() / sim.reference_land_t() - 1.0).abs() < 1e-6);
    }

    #[test]
    fn rk4_matches_the_exact_linear_drag_solution() {
        let mut sim = ProjectileSim::new(50.0, 35.0, 3.0, 9.81, 0.3, 0.0, 1e-3, RK4);
        assert!(sim.reference_is_exact());
        fly(&mut sim);
        assert!((sim.land_x() / sim.reference_range() - 1.0).abs() < 1e-6);
        assert!((sim.land_t() / sim.reference_land_t() - 1.0).abs() < 1e-6);
    }

    #[test]
    fn euler_overshoots_and_semi_implicit_falls_short() {
        // Notebook 01: with gravity only, forward Euler's height is high by ½·g·t·dt and
        // semi-implicit Euler's is low by the same amount, so one lands late and one early.
        let exact = {
            let sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.05, RK4);
            sim.reference_range()
        };
        let mut euler = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.05, EULER);
        let mut semi = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.05, SEMI);
        fly(&mut euler);
        fly(&mut semi);
        assert!(
            euler.land_x() > exact,
            "Euler {} vs {}",
            euler.land_x(),
            exact
        );
        assert!(semi.land_x() < exact, "semi {} vs {}", semi.land_x(), exact);
    }

    #[test]
    fn quadratic_drag_has_only_a_drag_free_reference_and_shortens_the_flight() {
        let mut sim = ProjectileSim::new(40.0, 45.0, 0.0, 9.81, 0.0, 0.01, 1e-3, RK4);
        assert!(!sim.reference_is_exact());
        fly(&mut sim);
        assert!(sim.land_x() < sim.reference_range());
        assert!(sim.energy_lost() > 0.0);
    }

    #[test]
    fn the_curve_ends_exactly_on_the_ground() {
        let mut sim = ProjectileSim::new(25.0, 40.0, 2.0, 9.81, 0.1, 0.0, 0.02, EULER);
        fly(&mut sim);
        let n = sim.len();
        assert_eq!(sim.ys[n - 1], 0.0);
        assert_eq!(sim.xs[n - 1], sim.land_x());
        assert_eq!(sim.ts[n - 1], sim.land_t());
        assert!(sim.ys.iter().all(|&y| y >= 0.0));
        assert_eq!(sim.ts.len(), sim.xs.len());
        assert_eq!(sim.ts.len(), sim.ys.len());
    }

    #[test]
    fn starting_on_the_ground_without_lift_lands_immediately() {
        let mut sim = ProjectileSim::new(10.0, 0.0, 0.0, 9.81, 0.0, 0.0, 0.01, RK4);
        assert!(sim.finished());
        assert!(!sim.advance(10));
        assert_eq!(sim.land_x(), 0.0);
        assert_eq!(sim.len(), 1);
    }

    #[test]
    fn a_drop_from_height_lands_after_sqrt_2h_over_g() {
        let mut sim = ProjectileSim::new(0.0, 0.0, 20.0, 9.81, 0.0, 0.0, 1e-3, RK4);
        fly(&mut sim);
        assert!((sim.land_t() - (2.0_f64 * 20.0 / 9.81).sqrt()).abs() < 1e-6);
    }

    #[test]
    fn reset_restarts_and_set_params_rebuilds_the_reference() {
        let mut sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.01, RK4);
        fly(&mut sim);
        let first = sim.land_x();
        sim.reset();
        assert!(!sim.finished());
        assert_eq!(sim.len(), 1);
        fly(&mut sim);
        assert_eq!(sim.land_x(), first);
        let before = sim.reference_range();
        sim.set_params(30.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.01, RK4);
        assert!(sim.reference_range() > before);
        assert_eq!(sim.reference_len(), REF_POINTS);
    }

    #[test]
    fn a_flight_longer_than_the_sample_cap_is_truncated_not_unbounded() {
        let mut sim = ProjectileSim::new(100.0, 90.0, 0.0, 9.81, 0.0, 0.0, MIN_DT, RK4);
        fly(&mut sim);
        assert!(sim.truncated());
        assert!(!sim.landed());
        assert!(sim.len() <= MAX_SAMPLES);
    }

    #[test]
    fn dt_below_the_minimum_is_clamped() {
        let sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 1e-9, RK4);
        assert_eq!(sim.dt(), MIN_DT);
        assert!(sim.estimated_steps() <= MAX_SAMPLES);
    }

    #[test]
    fn landing_is_exact_for_a_parabola_even_with_a_coarse_step() {
        // dt = 0.05 s is coarse, yet RK4 plus Hermite landing reproduces the parabola.
        let mut sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.05, RK4);
        fly(&mut sim);
        assert!((sim.land_x() / sim.reference_range() - 1.0).abs() < 1e-9);
        assert!((sim.land_t() / sim.reference_land_t() - 1.0).abs() < 1e-9);
    }

    #[test]
    fn without_drag_it_lands_at_the_launch_speed_and_loses_no_energy() {
        // Level ground, no drag: the ball comes back at exactly its launch speed.
        let mut sim = ProjectileSim::new(25.0, 40.0, 0.0, 9.81, 0.0, 0.0, 0.05, RK4);
        fly(&mut sim);
        assert!(
            (sim.speed() - 25.0).abs() < 1e-9,
            "landing speed {}",
            sim.speed()
        );
        assert!(
            sim.energy_lost().abs() < 1e-9,
            "energy lost {}",
            sim.energy_lost()
        );
    }

    #[test]
    fn hermite_reproduces_a_quadratic_exactly() {
        // y(t) = 3 + 2t − 5t² over a step of 0.4 s.
        let f = |t: f64| 3.0 + 2.0 * t - 5.0 * t * t;
        let df = |t: f64| 2.0 - 10.0 * t;
        let dt = 0.4;
        for s in [0.0, 0.1, 0.5, 0.9, 1.0] {
            let h = hermite(f(0.0), df(0.0), f(dt), df(dt), dt, s);
            assert!((h - f(s * dt)).abs() < 1e-12);
        }
    }
}
