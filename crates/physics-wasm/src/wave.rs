use physics::schrodinger::{Wave1D, exact};
use wasm_bindgen::prelude::*;

/// Grid points and domain length (positions −80 … 80). The grid is periodic.
const N: usize = 1024;
const L: f64 = 160.0;
/// Time step. The split-step method conserves probability for any step; this one resolves the
/// fastest waves on the grid well.
const DT: f64 = 0.02;
/// Height of the walls of the box, much more than any packet's energy.
const WALL: f64 = 100.0;

/// Module Q2: a wave packet on a line, evolved with the split-step Fourier method.
///
/// `kind`: 0 = free space, 1 = barrier, 2 = well, 3 = step, 4 = harmonic oscillator, 5 = box with
/// hard walls. Units are ħ = m = 1.
#[wasm_bindgen]
pub struct WaveSim {
    wave: Wave1D,
    kind: u8,
    v0: f64,
    width: f64,
    omega: f64,
    x0: f64,
    sigma: f64,
    k0: f64,
    duration: f64,
    /// Width of the barrier, well or box actually on the grid (a whole number of cells).
    a_eff: f64,
    x: Vec<f64>,
    density: Vec<f64>,
    exact_density: Vec<f64>,
    vdisp: Vec<f64>,
    level: f64,
    energy0: f64,
}

#[wasm_bindgen]
impl WaveSim {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        kind: u8,
        v0: f64,
        width: f64,
        omega: f64,
        x0: f64,
        sigma: f64,
        k0: f64,
        duration: f64,
    ) -> WaveSim {
        let wave = Wave1D::new(N, L);
        let x = (0..N).map(|j| wave.x(j)).collect();
        let mut sim = WaveSim {
            wave,
            kind,
            v0,
            width,
            omega,
            x0,
            sigma,
            k0,
            duration,
            a_eff: 0.0,
            x,
            density: vec![0.0; N],
            exact_density: vec![0.0; N],
            vdisp: vec![0.0; N],
            level: 0.0,
            energy0: 0.0,
        };
        sim.set_params(kind, v0, width, omega, x0, sigma, k0, duration);
        sim
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_params(
        &mut self,
        kind: u8,
        v0: f64,
        width: f64,
        omega: f64,
        x0: f64,
        sigma: f64,
        k0: f64,
        duration: f64,
    ) {
        self.kind = kind;
        self.v0 = v0.max(0.0);
        self.width = width.max(0.1);
        self.omega = omega.max(0.0);
        self.sigma = sigma.clamp(0.5, 20.0);
        self.k0 = k0;
        self.duration = duration.max(DT);
        // The feature is a whole, odd number of cells wide, so that the width on the grid is exactly
        // the width the formulas use.
        let dx = L / N as f64;
        let cells = ((self.width / dx).round() as usize).max(1) | 1;
        self.a_eff = cells as f64 * dx;
        self.x0 = x0;
        if kind == 5 {
            // A packet in a box starts a quarter of the way in, and must fit inside.
            self.x0 = -0.25 * self.a_eff;
            self.sigma = self.sigma.min(self.a_eff / 8.0);
        }
        self.reset();
    }

    pub fn reset(&mut self) {
        let (v0, a, omega, kind) = (self.v0, self.a_eff, self.omega, self.kind);
        self.wave.set_potential(|x| match kind {
            1 => {
                if x.abs() < 0.5 * a {
                    v0
                } else {
                    0.0
                }
            }
            2 => {
                if x.abs() < 0.5 * a {
                    -v0
                } else {
                    0.0
                }
            }
            3 => {
                if x >= 0.0 {
                    v0
                } else {
                    0.0
                }
            }
            4 => 0.5 * omega * omega * x * x,
            5 => {
                if x.abs() < 0.5 * a {
                    0.0
                } else {
                    WALL
                }
            }
            _ => 0.0,
        });
        self.wave.set_dt(DT);
        self.wave.set_gaussian(self.x0, self.sigma, self.k0);
        self.energy0 = self.wave.energy();

        // The potential and the packet's energy, both drawn on one scale from the lowest value of the
        // potential up. The top is a little above the highest finite feature or the packet's energy.
        let vmin = match kind {
            2 => -self.v0,
            _ => 0.0,
        };
        let feature = match kind {
            1 | 3 => self.v0,
            _ => 0.0,
        };
        let top = 1.25 * feature.max(self.energy0).max(0.05);
        let span = (top - vmin).max(1e-9);
        for j in 0..N {
            self.vdisp[j] = ((self.wave.v[j] - vmin) / span).clamp(0.0, 1.0);
        }
        self.level = ((self.energy0 - vmin) / span).clamp(0.0, 1.0);
        self.refresh();
    }

    /// Advance up to `steps` steps; returns false once the run is finished.
    pub fn advance(&mut self, steps: u32) -> bool {
        for _ in 0..steps {
            if self.finished() {
                return false;
            }
            self.wave.step();
        }
        !self.finished()
    }

    /// Update the density buffers (`density_ptr`, `exact_density_ptr`) to the current time.
    pub fn refresh(&mut self) {
        for j in 0..N {
            self.density[j] = self.wave.density(j);
        }
        if self.kind == 0 {
            let s = exact::free_width(self.sigma, self.wave.t);
            let centre = self.x0 + self.k0 * self.wave.t;
            let norm = 1.0 / (s * (2.0 * std::f64::consts::PI).sqrt());
            for j in 0..N {
                let d = self.x[j] - centre;
                self.exact_density[j] = norm * (-d * d / (2.0 * s * s)).exp();
            }
        }
    }

    pub fn finished(&self) -> bool {
        self.wave.t >= self.duration - 1e-9
    }
    pub fn estimated_steps(&self) -> usize {
        (self.duration / DT).ceil() as usize
    }
    pub fn t(&self) -> f64 {
        self.wave.t
    }
    pub fn dt(&self) -> f64 {
        DT
    }
    pub fn n(&self) -> usize {
        N
    }
    /// Width of the barrier, well or box as it sits on the grid.
    pub fn effective_width(&self) -> f64 {
        self.a_eff
    }
    pub fn norm(&self) -> f64 {
        self.wave.norm()
    }
    pub fn mean_x(&self) -> f64 {
        self.wave.mean_x()
    }
    pub fn std_x(&self) -> f64 {
        self.wave.std_x()
    }
    /// The mean energy at the start (it does not change).
    pub fn initial_energy(&mut self) -> f64 {
        self.energy0
    }
    pub fn energy(&mut self) -> f64 {
        self.wave.energy()
    }
    /// Mean momentum, spread of momentum.
    pub fn mean_p(&mut self) -> f64 {
        self.wave.momentum_moments().0
    }
    pub fn std_p(&mut self) -> f64 {
        self.wave.momentum_moments().1
    }
    /// Probability left of the feature (or of the middle), inside it, and right of it.
    pub fn p_left(&self) -> f64 {
        self.wave.probability_between(-0.5 * L, self.edge())
    }
    pub fn p_inside(&self) -> f64 {
        match self.kind {
            1 | 2 | 5 => self
                .wave
                .probability_between(-0.5 * self.a_eff, 0.5 * self.a_eff),
            _ => 0.0,
        }
    }
    pub fn p_right(&self) -> f64 {
        let right_edge = match self.kind {
            1 | 2 | 5 => 0.5 * self.a_eff,
            _ => 0.0,
        };
        self.wave.probability_between(right_edge, 0.5 * L + 1.0)
    }
    /// The exact probability of passing for a plane wave at the packet's mean wave number, for a barrier
    /// or a step. NaN for the other potentials.
    pub fn exact_transmission(&self) -> f64 {
        match self.kind {
            1 => exact::barrier_transmission(self.k0, self.v0, self.a_eff),
            3 => exact::step_transmission(self.k0, self.v0),
            _ => f64::NAN,
        }
    }
    /// The packet's mean energy as a fraction of the way up the drawn potential scale, and the
    /// potential on that scale.
    pub fn level(&self) -> f64 {
        self.level
    }
    pub fn density_ptr(&self) -> *const f64 {
        self.density.as_ptr()
    }
    pub fn exact_density_ptr(&self) -> *const f64 {
        self.exact_density.as_ptr()
    }
    pub fn re_ptr(&self) -> *const f64 {
        self.wave.re.as_ptr()
    }
    pub fn x_ptr(&self) -> *const f64 {
        self.x.as_ptr()
    }
    pub fn potential_ptr(&self) -> *const f64 {
        self.vdisp.as_ptr()
    }
    /// True if an exact curve is available to draw (free space).
    pub fn has_exact(&self) -> bool {
        self.kind == 0
    }
}

impl WaveSim {
    /// Where "left" ends: the barrier's or box's left edge, otherwise the middle of the grid.
    fn edge(&self) -> f64 {
        match self.kind {
            1 | 2 | 5 => -0.5 * self.a_eff,
            _ => 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(sim: &mut WaveSim) {
        while sim.advance(500) {}
    }

    #[test]
    fn a_free_packet_matches_its_exact_curve_and_keeps_its_probability() {
        let mut sim = WaveSim::new(0, 0.0, 1.0, 0.0, -40.0, 2.0, 1.5, 30.0);
        run(&mut sim);
        sim.refresh();
        assert!((sim.norm() - 1.0).abs() < 1e-12);
        let worst = (0..N)
            .map(|j| (sim.density[j] - sim.exact_density[j]).abs())
            .fold(0.0, f64::max);
        assert!(worst < 1e-4, "largest difference {worst}");
    }

    #[test]
    fn the_barrier_splits_the_packet_as_the_exact_formula_says() {
        let mut sim = WaveSim::new(1, 0.8, 2.0, 0.0, -40.0, 6.0, 1.0, 70.0);
        run(&mut sim);
        let sum = sim.p_left() + sim.p_inside() + sim.p_right();
        assert!((sum - 1.0).abs() < 1e-9, "sum {sum}");
        let exact = sim.exact_transmission();
        // A real packet has a spread of wave numbers, so it differs a little from the plane wave.
        assert!(
            (sim.p_right() - exact).abs() < 0.03,
            "{} vs {exact}",
            sim.p_right()
        );
        assert!(sim.p_inside() < 1e-3);
    }

    #[test]
    fn width_snaps_to_an_odd_number_of_cells() {
        let sim = WaveSim::new(1, 1.0, 2.0, 0.0, -40.0, 3.0, 1.0, 10.0);
        let cells = sim.effective_width() / (L / N as f64);
        assert!((cells - cells.round()).abs() < 1e-9 && (cells.round() as usize) % 2 == 1);
    }

    #[test]
    fn the_box_keeps_the_packet_inside_and_energy_fixed() {
        let mut sim = WaveSim::new(5, 0.0, 30.0, 0.0, 0.0, 2.0, 1.0, 120.0);
        let e0 = sim.initial_energy();
        // The split-step method keeps a slightly different energy (of a nearby Hamiltonian), which
        // wobbles within about 1% as the packet hits the hard walls and does not drift away.
        for _ in 0..12 {
            sim.advance(500);
            assert!(
                (sim.energy() - e0).abs() < 0.015 * e0,
                "energy {} vs {e0}",
                sim.energy()
            );
        }
        assert!(sim.p_inside() > 0.999, "inside {}", sim.p_inside());
    }

    #[test]
    fn the_potential_is_drawn_on_the_same_scale_as_the_packet_energy() {
        let sim = WaveSim::new(1, 0.8, 2.0, 0.0, -40.0, 4.0, 1.0, 10.0);
        let top = sim.vdisp.iter().cloned().fold(0.0, f64::max);
        // Barrier height 0.8 sits above the packet energy 0.5, and both are below the top of the scale.
        assert!(top > sim.level() && sim.level() > 0.0 && top < 1.0 + 1e-12);
        assert!((top - 0.8 / (1.25 * 0.8)).abs() < 1e-9);
    }
}
