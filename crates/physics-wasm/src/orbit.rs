use physics::kepler::{Kepler, KeplerOrbit, VX, VY, X, Y};
use physics::ode::{Euler, Integrator, Rk4, SemiImplicitEuler, velocity_verlet_step};
use wasm_bindgen::prelude::*;

/// Hard cap on stored samples (2 buffers × 200k × 8 B ≈ 3.2 MB).
const MAX_SAMPLES: usize = 200_000;
/// Points in the exact orbit drawn under the simulation (one full loop).
const REF_POINTS: usize = 721;
/// Smallest time step accepted.
const MIN_DT: f64 = 1e-4;
/// The star's gravitational parameter and the starting distance: natural units.
const MU: f64 = 1.0;
const R0: f64 = 1.0;

/// Module C3: a planet orbiting a fixed star (the Kepler problem).
///
/// The planet starts at distance 1 moving sideways at `ratio` × the circular speed, and is
/// integrated with Euler (0), semi-implicit Euler (1), RK4 (2) or velocity Verlet (3) for a number
/// of orbital periods. The exact ellipse (from Kepler's equation) is kept to compare against.
#[wasm_bindgen]
pub struct OrbitSim {
    sys: Kepler,
    orbit: KeplerOrbit,
    orbits: f64,
    dt: f64,
    method: u8,
    euler: Euler,
    semi: SemiImplicitEuler,
    rk4: Rk4,
    y: [f64; 4],
    acc: [f64; 2],
    t: f64,
    total_steps: usize,
    e0: f64,
    l0: f64,
    max_err: f64,
    r_min: f64,
    r_max: f64,
    diverged: bool,
    xs: Vec<f64>,
    ys: Vec<f64>,
    ref_x: Vec<f64>,
    ref_y: Vec<f64>,
}

#[wasm_bindgen]
impl OrbitSim {
    /// `ratio` is the launch speed over the circular speed (between 0 and √2, exclusive),
    /// `orbits` the number of periods to simulate, `dt` the time step in natural units, and
    /// `method`: 0 = Euler, 1 = semi-implicit Euler, 2 = RK4, 3 = velocity Verlet.
    #[wasm_bindgen(constructor)]
    pub fn new(ratio: f64, orbits: f64, dt: f64, method: u8) -> OrbitSim {
        let mut sim = OrbitSim {
            sys: Kepler { mu: MU },
            orbit: KeplerOrbit::new(MU, R0, 1.0),
            orbits,
            dt,
            method,
            euler: Euler::new(4),
            semi: SemiImplicitEuler::new(4),
            rk4: Rk4::new(4),
            y: [0.0; 4],
            acc: [0.0; 2],
            t: 0.0,
            total_steps: 0,
            e0: 0.0,
            l0: 0.0,
            max_err: 0.0,
            r_min: f64::INFINITY,
            r_max: 0.0,
            diverged: false,
            xs: Vec::with_capacity(MAX_SAMPLES),
            ys: Vec::with_capacity(MAX_SAMPLES),
            ref_x: Vec::with_capacity(REF_POINTS),
            ref_y: Vec::with_capacity(REF_POINTS),
        };
        sim.set_params(ratio, orbits, dt, method);
        sim
    }

    pub fn set_params(&mut self, ratio: f64, orbits: f64, dt: f64, method: u8) {
        // Keep the launch strictly bound so the exact orbit exists.
        let ratio = ratio.clamp(0.05, 1.41);
        self.orbit = KeplerOrbit::new(MU, R0, ratio);
        self.orbits = orbits.max(0.1);
        let duration = self.orbits * self.orbit.period();
        // Never exceed the buffer capacity: clamp dt so the run fits.
        self.dt = dt.max(MIN_DT).max(duration / (MAX_SAMPLES - 1) as f64);
        self.method = method;
        self.reset();
    }

    pub fn reset(&mut self) {
        let s = self.orbit.state(0.0);
        self.y = [s.x, s.y, s.vx, s.vy];
        self.acc = self.sys.accel(self.y[X], self.y[Y]);
        self.t = 0.0;
        self.total_steps = (self.orbits * self.orbit.period() / self.dt).ceil() as usize;
        self.e0 = self.sys.energy(&self.y);
        self.l0 = self.sys.angular_momentum(&self.y);
        self.max_err = 0.0;
        self.r_min = f64::INFINITY;
        self.r_max = 0.0;
        self.diverged = false;
        self.xs.clear();
        self.ys.clear();
        self.record();

        self.ref_x.clear();
        self.ref_y.clear();
        let period = self.orbit.period();
        for i in 0..REF_POINTS {
            let p = self
                .orbit
                .state(period * i as f64 / (REF_POINTS - 1) as f64);
            self.ref_x.push(p.x);
            self.ref_y.push(p.y);
        }
    }

    /// Advance up to `steps` steps; returns false once the run is finished.
    pub fn advance(&mut self, steps: u32) -> bool {
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            self.step();
            self.t += self.dt;
            self.record();
            if !self.y.iter().all(|v| v.is_finite()) {
                self.diverged = true;
            }
        }
        !self.finished()
    }

    pub fn finished(&self) -> bool {
        self.diverged || self.xs.len() > self.total_steps
    }
    /// True if the numerical solution overflowed (the planet was flung away or hit the star).
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
    pub fn y(&self) -> f64 {
        self.y[Y]
    }
    pub fn r(&self) -> f64 {
        self.y[X].hypot(self.y[Y])
    }
    pub fn speed(&self) -> f64 {
        self.y[VX].hypot(self.y[VY])
    }
    /// (E − E₀)/|E₀|: how far the energy has drifted from its starting value.
    pub fn energy_drift(&self) -> f64 {
        (self.sys.energy(&self.y) - self.e0) / self.e0.abs()
    }
    /// (L − L₀)/L₀: how far the angular momentum has drifted.
    pub fn angular_momentum_drift(&self) -> f64 {
        (self.sys.angular_momentum(&self.y) - self.l0) / self.l0
    }
    /// Distance between the planet and where the exact orbit says it should be.
    pub fn position_error(&self) -> f64 {
        let s = self.orbit.state(self.t);
        (self.y[X] - s.x).hypot(self.y[Y] - s.y)
    }
    pub fn max_position_error(&self) -> f64 {
        self.max_err
    }
    /// Closest and farthest distance the simulated planet has reached so far.
    pub fn min_r(&self) -> f64 {
        self.r_min
    }
    pub fn max_r(&self) -> f64 {
        self.r_max
    }
    pub fn semi_major_axis(&self) -> f64 {
        self.orbit.a
    }
    pub fn eccentricity(&self) -> f64 {
        self.orbit.e
    }
    pub fn period(&self) -> f64 {
        self.orbit.period()
    }
    pub fn periapsis(&self) -> f64 {
        self.orbit.periapsis()
    }
    pub fn apoapsis(&self) -> f64 {
        self.orbit.apoapsis()
    }
    /// Largest |x| and |y| on the exact orbit, used to size the axes.
    pub fn reference_max_x(&self) -> f64 {
        self.ref_x.iter().fold(0.0, |m, x| m.max(x.abs()))
    }
    pub fn reference_max_y(&self) -> f64 {
        self.ref_y.iter().fold(0.0, |m, y| m.max(y.abs()))
    }

    pub fn len(&self) -> usize {
        self.xs.len()
    }
    pub fn is_empty(&self) -> bool {
        self.xs.is_empty()
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

impl OrbitSim {
    fn step(&mut self) {
        match self.method {
            0 => self.euler.step(&self.sys, self.t, &mut self.y, self.dt),
            1 => self.semi.step(&self.sys, self.t, &mut self.y, self.dt),
            2 => self.rk4.step(&self.sys, self.t, &mut self.y, self.dt),
            _ => {
                let sys = &self.sys;
                let mut pos = [self.y[X], self.y[Y]];
                let mut vel = [self.y[VX], self.y[VY]];
                velocity_verlet_step(&mut pos, &mut vel, &mut self.acc, self.dt, |p, a| {
                    let g = sys.accel(p[0], p[1]);
                    a[0] = g[0];
                    a[1] = g[1];
                });
                self.y = [pos[0], pos[1], vel[0], vel[1]];
            }
        }
    }

    fn record(&mut self) {
        self.xs.push(self.y[X]);
        self.ys.push(self.y[Y]);
        let r = self.y[X].hypot(self.y[Y]);
        if r.is_finite() {
            self.r_min = self.r_min.min(r);
            self.r_max = self.r_max.max(r);
        }
        let s = self.orbit.state(self.t);
        let err = (self.y[X] - s.x).hypot(self.y[Y] - s.y);
        if err.is_finite() {
            self.max_err = self.max_err.max(err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(sim: &mut OrbitSim) {
        while sim.advance(10_000) {}
    }

    #[test]
    fn rk4_follows_the_exact_orbit() {
        let mut sim = OrbitSim::new(0.8, 3.0, 5e-4, 2);
        run(&mut sim);
        assert!(sim.finished() && !sim.diverged());
        assert!(
            sim.max_position_error() < 1e-6,
            "{}",
            sim.max_position_error()
        );
    }

    #[test]
    fn verlet_keeps_angular_momentum_exactly_and_euler_does_not() {
        let mut verlet = OrbitSim::new(0.8, 10.0, 0.01, 3);
        let mut euler = OrbitSim::new(0.8, 10.0, 0.01, 0);
        run(&mut verlet);
        run(&mut euler);
        assert!(verlet.angular_momentum_drift().abs() < 1e-10);
        assert!(euler.angular_momentum_drift() > 0.01);
        assert!(euler.energy_drift() > verlet.energy_drift().abs());
    }

    #[test]
    fn orbit_properties_match_kepler() {
        let sim = OrbitSim::new(1.0, 1.0, 0.01, 2);
        assert!((sim.semi_major_axis() - 1.0).abs() < 1e-12);
        assert!(sim.eccentricity().abs() < 1e-12);
        assert!((sim.period() - std::f64::consts::TAU).abs() < 1e-12);
        let sim = OrbitSim::new(0.8, 1.0, 0.01, 2);
        // Starting at the farthest point: apoapsis is the start distance.
        assert!((sim.apoapsis() - 1.0).abs() < 1e-12);
        assert!(sim.periapsis() < 1.0);
        assert!((sim.reference_max_x() - 1.0).abs() < 1e-3);
    }

    #[test]
    fn rk4_reaches_the_exact_closest_and_farthest_distances() {
        let mut sim = OrbitSim::new(0.8, 1.0, 1e-3, 2);
        run(&mut sim);
        assert!(
            (sim.min_r() - sim.periapsis()).abs() < 1e-4,
            "{} vs {}",
            sim.min_r(),
            sim.periapsis()
        );
        assert!((sim.max_r() - sim.apoapsis()).abs() < 1e-9);
    }

    #[test]
    fn launch_speed_is_kept_bound() {
        // Even a request for escape speed must not panic: it is clamped below √2.
        let sim = OrbitSim::new(2.0, 1.0, 0.01, 2);
        assert!(sim.period().is_finite());
    }

    #[test]
    fn a_plunging_euler_orbit_is_flagged_not_plotted_as_infinity() {
        let mut sim = OrbitSim::new(0.1, 30.0, 0.05, 0);
        run(&mut sim);
        assert!(sim.finished());
        assert!(sim.estimated_steps() > 0);
    }

    #[test]
    fn dt_is_clamped_to_capacity() {
        let sim = OrbitSim::new(1.3, 50.0, 1e-5, 2);
        assert!(sim.estimated_steps() < MAX_SAMPLES);
    }
}
