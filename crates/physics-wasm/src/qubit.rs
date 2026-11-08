use physics::qubit::{Gate, Qubit, rotation_unitary};
use std::collections::VecDeque;
use wasm_bindgen::prelude::*;

/// How long (in seconds of wall-clock time) one gate takes to turn the state on screen.
const GATE_SECONDS: f64 = 0.6;

/// A gate partway through being applied, as a rotation about a Bloch-sphere axis.
struct Pending {
    axis: [f64; 3],
    angle: f64,
    /// Fraction of the rotation already done.
    progress: f64,
}

/// Module Q1: a single qubit on the Bloch sphere.
///
/// Two copies of the qubit run side by side: the **ideal** one only feels the gates and stays on the
/// surface of the sphere, and the **noisy** one also feels energy relaxation (T₁) and dephasing (T₂)
/// and drifts inside. Gates are turned into short rotations so they can be animated; the end result
/// is exactly the gate's matrix (up to a global phase, which no measurement can see).
#[wasm_bindgen]
pub struct QubitSim {
    noisy: Qubit,
    ideal: Qubit,
    start: u8,
    t1: f64,
    t2: f64,
    noise: bool,
    speed: f64,
    time: f64,
    gate_count: u32,
    queue: VecDeque<Pending>,
}

#[wasm_bindgen]
impl QubitSim {
    /// `start`: 0 = |0⟩, 1 = |1⟩, 2 = |+⟩, 3 = |−⟩, 4 = |+i⟩, 5 = |−i⟩. `t1` and `t2` are the
    /// relaxation and dephasing times in seconds (T₂ is limited to 2·T₁), `noise` switches them on,
    /// and `speed` scales how fast noise acts compared with the clock.
    #[wasm_bindgen(constructor)]
    pub fn new(start: u8, t1: f64, t2: f64, noise: bool, speed: f64) -> QubitSim {
        let mut sim = QubitSim {
            noisy: Qubit::pure([0.0, 0.0, 1.0]),
            ideal: Qubit::pure([0.0, 0.0, 1.0]),
            start,
            t1,
            t2,
            noise,
            speed,
            time: 0.0,
            gate_count: 0,
            queue: VecDeque::new(),
        };
        sim.set_params(start, t1, t2, noise, speed);
        sim
    }

    pub fn set_params(&mut self, start: u8, t1: f64, t2: f64, noise: bool, speed: f64) {
        self.start = start;
        self.t1 = t1.max(1e-3);
        self.t2 = t2.max(1e-3);
        self.noise = noise;
        self.speed = speed.max(0.0);
        self.reset();
    }

    pub fn reset(&mut self) {
        let r = match self.start {
            1 => [0.0, 0.0, -1.0],
            2 => [1.0, 0.0, 0.0],
            3 => [-1.0, 0.0, 0.0],
            4 => [0.0, 1.0, 0.0],
            5 => [0.0, -1.0, 0.0],
            _ => [0.0, 0.0, 1.0],
        };
        self.noisy = Qubit::pure(r);
        self.ideal = Qubit::pure(r);
        self.time = 0.0;
        self.gate_count = 0;
        self.queue.clear();
    }

    /// Queue a gate. `code`: 0 = X, 1 = Y, 2 = Z, 3 = H, 4 = S, 5 = S†, 6 = T, 7 = Rx, 8 = Ry,
    /// 9 = Rz. `angle_deg` is used only by the three rotations.
    pub fn queue_gate(&mut self, code: u8, angle_deg: f64) {
        let a = angle_deg.to_radians();
        let gate = match code {
            0 => Gate::X,
            1 => Gate::Y,
            2 => Gate::Z,
            3 => Gate::H,
            4 => Gate::S,
            5 => Gate::Sdg,
            6 => Gate::T,
            7 => Gate::Rx(a),
            8 => Gate::Ry(a),
            _ => Gate::Rz(a),
        };
        let (axis, angle) = gate.rotation();
        self.queue.push_back(Pending {
            axis,
            angle,
            progress: 0.0,
        });
        self.gate_count += 1;
    }

    /// Move on by `dt` seconds of wall-clock time: carry on turning the current gate, and, when
    /// `with_noise` is true (time is running) and noise is switched on, let it act. Returns true
    /// while a gate is still being applied.
    pub fn advance(&mut self, dt: f64, with_noise: bool) -> bool {
        let mut budget = dt;
        while budget > 0.0 {
            let Some(p) = self.queue.front_mut() else {
                break;
            };
            let step = (budget / GATE_SECONDS).min(1.0 - p.progress);
            let u = rotation_unitary(p.axis, p.angle * step);
            self.noisy.apply_unitary(&u);
            self.ideal.apply_unitary(&u);
            p.progress += step;
            budget -= step * GATE_SECONDS;
            if p.progress >= 1.0 - 1e-12 {
                self.queue.pop_front();
            }
        }
        if with_noise {
            if self.noise {
                self.noisy.decohere(dt * self.speed, self.t1, self.t2);
            }
            self.time += dt;
        }
        !self.queue.is_empty()
    }

    pub fn busy(&self) -> bool {
        !self.queue.is_empty()
    }
    pub fn queued(&self) -> usize {
        self.queue.len()
    }
    pub fn gate_count(&self) -> u32 {
        self.gate_count
    }
    pub fn time(&self) -> f64 {
        self.time
    }

    /// The noisy qubit's Bloch vector, and the ideal one's.
    pub fn x(&self) -> f64 {
        self.noisy.bloch()[0]
    }
    pub fn y(&self) -> f64 {
        self.noisy.bloch()[1]
    }
    pub fn z(&self) -> f64 {
        self.noisy.bloch()[2]
    }
    pub fn ideal_x(&self) -> f64 {
        self.ideal.bloch()[0]
    }
    pub fn ideal_y(&self) -> f64 {
        self.ideal.bloch()[1]
    }
    pub fn ideal_z(&self) -> f64 {
        self.ideal.bloch()[2]
    }
    /// Probability that measuring the (noisy) qubit gives 0, and 1.
    pub fn p0(&self) -> f64 {
        self.noisy.p0()
    }
    pub fn p1(&self) -> f64 {
        self.noisy.p1()
    }
    /// 1 for a pure state, ½ for the centre of the sphere.
    pub fn purity(&self) -> f64 {
        self.noisy.purity()
    }
    /// How close the noisy state is to the ideal one: ⟨ψ_ideal|ρ|ψ_ideal⟩ = ½(1 + r·r_ideal).
    pub fn fidelity(&self) -> f64 {
        let (a, b) = (self.noisy.bloch(), self.ideal.bloch());
        0.5 * (1.0 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2])
    }
    /// The effective T₂ actually used (never more than 2·T₁).
    pub fn effective_t2(&self) -> f64 {
        self.t2.min(2.0 * self.t1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use physics::qubit::rotate_vector;

    fn finish(sim: &mut QubitSim) {
        while sim.advance(1.0 / 60.0, true) {}
    }

    #[test]
    fn a_queued_gate_ends_exactly_where_the_matrix_says() {
        for (code, gate) in [
            (3, Gate::H),
            (4, Gate::S),
            (6, Gate::T),
            (0, Gate::X),
            (1, Gate::Y),
        ] {
            let mut sim = QubitSim::new(0, 5.0, 5.0, false, 1.0);
            sim.queue_gate(code, 0.0);
            finish(&mut sim);
            let mut q = Qubit::pure([0.0, 0.0, 1.0]);
            q.apply_gate(gate);
            let want = q.bloch();
            let got = [sim.x(), sim.y(), sim.z()];
            for k in 0..3 {
                assert!(
                    (got[k] - want[k]).abs() < 1e-12,
                    "{gate:?}: {got:?} vs {want:?}"
                );
            }
        }
    }

    #[test]
    fn irregular_frame_times_do_not_change_the_result() {
        let mut sim = QubitSim::new(2, 5.0, 5.0, false, 1.0);
        sim.queue_gate(7, 70.0);
        sim.queue_gate(3, 0.0);
        let mut t = 0.0;
        let mut k = 0;
        while sim.busy() {
            let dt = 0.001 + 0.03 * (((k * 7919) % 100) as f64 / 100.0);
            sim.advance(dt, true);
            t += dt;
            k += 1;
            assert!(t < 10.0, "gates never finished");
        }
        let (axis_a, a) = Gate::Rx(70.0_f64.to_radians()).rotation();
        let (axis_b, b) = Gate::H.rotation();
        let want = rotate_vector(rotate_vector([1.0, 0.0, 0.0], axis_a, a), axis_b, b);
        for (got, w) in [sim.x(), sim.y(), sim.z()].iter().zip(want) {
            assert!((got - w).abs() < 1e-12);
        }
        assert_eq!(sim.gate_count(), 2);
    }

    #[test]
    fn without_noise_the_state_stays_pure_and_matches_the_ideal_one() {
        let mut sim = QubitSim::new(0, 5.0, 5.0, false, 1.0);
        for code in [3, 6, 3, 4, 7] {
            sim.queue_gate(code, 33.0);
        }
        finish(&mut sim);
        for _ in 0..600 {
            sim.advance(1.0 / 60.0, true);
        }
        assert!((sim.purity() - 1.0).abs() < 1e-12);
        assert!((sim.fidelity() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn with_noise_the_state_leaves_the_surface_and_falls_to_the_ground_state() {
        let mut sim = QubitSim::new(2, 2.0, 1.5, true, 1.0);
        for _ in 0..60 {
            sim.advance(1.0 / 60.0, true);
        }
        assert!(sim.purity() < 0.99, "purity {}", sim.purity());
        assert!(sim.fidelity() < 1.0);
        for _ in 0..(60 * 60) {
            sim.advance(1.0 / 60.0, true);
        }
        assert!((sim.z() - 1.0).abs() < 1e-6 && sim.p0() > 0.999_999);
        // The ideal qubit is untouched by noise.
        assert!((sim.ideal_x() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn t2_is_limited_to_twice_t1_and_reset_restores_the_start() {
        let mut sim = QubitSim::new(1, 1.0, 50.0, true, 1.0);
        assert_eq!(sim.effective_t2(), 2.0);
        sim.queue_gate(3, 0.0);
        finish(&mut sim);
        sim.reset();
        assert!(!sim.busy() && sim.gate_count() == 0 && sim.time() == 0.0);
        assert!((sim.z() + 1.0).abs() < 1e-12, "started in |1⟩");
    }
}
