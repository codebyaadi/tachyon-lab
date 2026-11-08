//! One qubit: gates, the Bloch sphere, and decoherence (module Q1).
//!
//! The state is a 2×2 **density matrix** ρ, which describes both pure states and the mixed
//! states that noise produces. ρ is always `½(I + r·σ)` for a **Bloch vector** `r` with
//! |r| ≤ 1: a pure state sits on the surface of the sphere, noise pulls it inside.
//!
//! Every single-qubit gate is a rotation of the Bloch sphere (up to an unobservable global phase),
//! so the same gate exists here twice: as an exact complex matrix, and as a rotation axis and angle.
//! The tests check that the two agree.

use std::f64::consts::{FRAC_1_SQRT_2, FRAC_PI_2, FRAC_PI_4, PI};
use std::ops::{Add, Mul, Sub};

/// A complex number (just enough for 2×2 matrices; no external dependency).
#[derive(Clone, Copy, Debug, PartialEq, Default)]
pub struct C {
    pub re: f64,
    pub im: f64,
}

impl C {
    pub const ZERO: C = C { re: 0.0, im: 0.0 };
    pub const ONE: C = C { re: 1.0, im: 0.0 };
    pub const I: C = C { re: 0.0, im: 1.0 };

    pub fn new(re: f64, im: f64) -> C {
        C { re, im }
    }
    pub fn real(re: f64) -> C {
        C { re, im: 0.0 }
    }
    pub fn conj(self) -> C {
        C {
            re: self.re,
            im: -self.im,
        }
    }
    pub fn norm_sqr(self) -> f64 {
        self.re * self.re + self.im * self.im
    }
    pub fn scale(self, k: f64) -> C {
        C {
            re: self.re * k,
            im: self.im * k,
        }
    }
    /// e^{iφ}.
    pub fn cis(phi: f64) -> C {
        C {
            re: phi.cos(),
            im: phi.sin(),
        }
    }
}

impl Add for C {
    type Output = C;
    fn add(self, o: C) -> C {
        C::new(self.re + o.re, self.im + o.im)
    }
}
impl Sub for C {
    type Output = C;
    fn sub(self, o: C) -> C {
        C::new(self.re - o.re, self.im - o.im)
    }
}
impl Mul for C {
    type Output = C;
    fn mul(self, o: C) -> C {
        C::new(
            self.re * o.re - self.im * o.im,
            self.re * o.im + self.im * o.re,
        )
    }
}

/// A 2×2 complex matrix, `m[row][col]`.
pub type M2 = [[C; 2]; 2];

pub const IDENTITY: M2 = [[C::ONE, C::ZERO], [C::ZERO, C::ONE]];

pub fn mul(a: &M2, b: &M2) -> M2 {
    let mut out = [[C::ZERO; 2]; 2];
    for i in 0..2 {
        for j in 0..2 {
            out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j];
        }
    }
    out
}

pub fn dagger(a: &M2) -> M2 {
    [
        [a[0][0].conj(), a[1][0].conj()],
        [a[0][1].conj(), a[1][1].conj()],
    ]
}

/// The largest entry-wise difference between two matrices.
pub fn max_diff(a: &M2, b: &M2) -> f64 {
    let mut worst = 0.0_f64;
    for i in 0..2 {
        for j in 0..2 {
            worst = worst.max((a[i][j] - b[i][j]).norm_sqr().sqrt());
        }
    }
    worst
}

/// The Pauli matrices.
pub fn pauli_x() -> M2 {
    [[C::ZERO, C::ONE], [C::ONE, C::ZERO]]
}
pub fn pauli_y() -> M2 {
    [[C::ZERO, C::new(0.0, -1.0)], [C::I, C::ZERO]]
}
pub fn pauli_z() -> M2 {
    [[C::ONE, C::ZERO], [C::ZERO, C::real(-1.0)]]
}

/// The gates available in the lab.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Gate {
    X,
    Y,
    Z,
    /// Hadamard.
    H,
    /// Phase gate, a quarter turn about z.
    S,
    /// Its inverse.
    Sdg,
    /// The π/8 gate, an eighth of a turn about z.
    T,
    /// Rotations about an axis by an angle in radians.
    Rx(f64),
    Ry(f64),
    Rz(f64),
}

impl Gate {
    /// The exact unitary matrix, including its global phase (the usual textbook definition).
    pub fn unitary(&self) -> M2 {
        let s = FRAC_1_SQRT_2;
        match *self {
            Gate::X => pauli_x(),
            Gate::Y => pauli_y(),
            Gate::Z => pauli_z(),
            Gate::H => [[C::real(s), C::real(s)], [C::real(s), C::real(-s)]],
            Gate::S => [[C::ONE, C::ZERO], [C::ZERO, C::I]],
            Gate::Sdg => [[C::ONE, C::ZERO], [C::ZERO, C::new(0.0, -1.0)]],
            Gate::T => [[C::ONE, C::ZERO], [C::ZERO, C::cis(FRAC_PI_4)]],
            Gate::Rx(a) => rotation_unitary([1.0, 0.0, 0.0], a),
            Gate::Ry(a) => rotation_unitary([0.0, 1.0, 0.0], a),
            Gate::Rz(a) => rotation_unitary([0.0, 0.0, 1.0], a),
        }
    }

    /// The same gate as a rotation of the Bloch sphere: a unit axis and an angle (radians).
    /// It differs from [`Gate::unitary`] only by a global phase.
    pub fn rotation(&self) -> ([f64; 3], f64) {
        let s = FRAC_1_SQRT_2;
        match *self {
            Gate::X => ([1.0, 0.0, 0.0], PI),
            Gate::Y => ([0.0, 1.0, 0.0], PI),
            Gate::Z => ([0.0, 0.0, 1.0], PI),
            Gate::H => ([s, 0.0, s], PI),
            Gate::S => ([0.0, 0.0, 1.0], FRAC_PI_2),
            Gate::Sdg => ([0.0, 0.0, 1.0], -FRAC_PI_2),
            Gate::T => ([0.0, 0.0, 1.0], FRAC_PI_4),
            Gate::Rx(a) => ([1.0, 0.0, 0.0], a),
            Gate::Ry(a) => ([0.0, 1.0, 0.0], a),
            Gate::Rz(a) => ([0.0, 0.0, 1.0], a),
        }
    }
}

/// `exp(−i θ/2 · n·σ) = cos(θ/2) I − i sin(θ/2) (n·σ)`: a rotation by θ about the unit axis `n`.
pub fn rotation_unitary(n: [f64; 3], theta: f64) -> M2 {
    let (c, s) = ((theta / 2.0).cos(), (theta / 2.0).sin());
    let mut out = [[C::ZERO; 2]; 2];
    let (px, py, pz) = (pauli_x(), pauli_y(), pauli_z());
    for i in 0..2 {
        for j in 0..2 {
            let n_sigma = px[i][j].scale(n[0]) + py[i][j].scale(n[1]) + pz[i][j].scale(n[2]);
            let id = if i == j { C::ONE } else { C::ZERO };
            out[i][j] = id.scale(c) - C::I * n_sigma.scale(s);
        }
    }
    out
}

/// Rodrigues' formula: the vector `r` turned by `theta` about the unit axis `n`.
pub fn rotate_vector(r: [f64; 3], n: [f64; 3], theta: f64) -> [f64; 3] {
    let (c, s) = (theta.cos(), theta.sin());
    let dot = n[0] * r[0] + n[1] * r[1] + n[2] * r[2];
    let cross = [
        n[1] * r[2] - n[2] * r[1],
        n[2] * r[0] - n[0] * r[2],
        n[0] * r[1] - n[1] * r[0],
    ];
    [
        r[0] * c + cross[0] * s + n[0] * dot * (1.0 - c),
        r[1] * c + cross[1] * s + n[1] * dot * (1.0 - c),
        r[2] * c + cross[2] * s + n[2] * dot * (1.0 - c),
    ]
}

/// A qubit as a 2×2 density matrix.
#[derive(Clone, Copy, Debug)]
pub struct Qubit {
    pub rho: M2,
}

impl Qubit {
    /// The pure state with Bloch vector `r` (any length is accepted; it is scaled to the surface).
    pub fn pure(r: [f64; 3]) -> Qubit {
        let len = (r[0] * r[0] + r[1] * r[1] + r[2] * r[2]).sqrt();
        let u = if len > 0.0 {
            [r[0] / len, r[1] / len, r[2] / len]
        } else {
            [0.0, 0.0, 1.0]
        };
        Qubit::from_bloch(u)
    }

    /// ρ = ½(I + r·σ).
    pub fn from_bloch(r: [f64; 3]) -> Qubit {
        Qubit {
            rho: [
                [C::real(0.5 * (1.0 + r[2])), C::new(0.5 * r[0], -0.5 * r[1])],
                [C::new(0.5 * r[0], 0.5 * r[1]), C::real(0.5 * (1.0 - r[2]))],
            ],
        }
    }

    /// The Bloch vector: r_k = Tr(ρ σ_k).
    pub fn bloch(&self) -> [f64; 3] {
        [
            2.0 * self.rho[0][1].re,
            -2.0 * self.rho[0][1].im,
            self.rho[0][0].re - self.rho[1][1].re,
        ]
    }

    /// Probability of measuring 0 (the north pole) or 1 (the south pole).
    pub fn p0(&self) -> f64 {
        self.rho[0][0].re
    }
    pub fn p1(&self) -> f64 {
        self.rho[1][1].re
    }

    /// Tr(ρ²): 1 for a pure state, ½ for the maximally mixed state at the centre.
    pub fn purity(&self) -> f64 {
        let r = self.bloch();
        0.5 * (1.0 + r[0] * r[0] + r[1] * r[1] + r[2] * r[2])
    }

    /// Smallest eigenvalue of ρ, ½(1 − |r|). Never negative for a valid state.
    pub fn min_eigenvalue(&self) -> f64 {
        let r = self.bloch();
        0.5 * (1.0 - (r[0] * r[0] + r[1] * r[1] + r[2] * r[2]).sqrt())
    }

    pub fn trace(&self) -> f64 {
        self.rho[0][0].re + self.rho[1][1].re
    }

    /// ρ → U ρ U†.
    pub fn apply_unitary(&mut self, u: &M2) {
        self.rho = mul(&mul(u, &self.rho), &dagger(u));
    }

    pub fn apply_gate(&mut self, gate: Gate) {
        self.apply_unitary(&gate.unitary());
    }

    /// ρ → Σ K ρ K†, a noise channel given by its Kraus operators.
    pub fn apply_channel(&mut self, kraus: &[M2]) {
        let mut out = [[C::ZERO; 2]; 2];
        for k in kraus {
            let term = mul(&mul(k, &self.rho), &dagger(k));
            for i in 0..2 {
                for j in 0..2 {
                    out[i][j] = out[i][j] + term[i][j];
                }
            }
        }
        self.rho = out;
    }

    /// Amplitude damping (energy loss toward |0⟩) with probability `gamma` of decay this step.
    pub fn amplitude_damping(&mut self, gamma: f64) {
        let k0 = [[C::ONE, C::ZERO], [C::ZERO, C::real((1.0 - gamma).sqrt())]];
        let k1 = [[C::ZERO, C::real(gamma.sqrt())], [C::ZERO, C::ZERO]];
        self.apply_channel(&[k0, k1]);
    }

    /// Pure dephasing: the populations stay, the coherences shrink by √(1 − lambda).
    pub fn dephasing(&mut self, lambda: f64) {
        let k0 = [[C::ONE, C::ZERO], [C::ZERO, C::real((1.0 - lambda).sqrt())]];
        let k1 = [[C::ZERO, C::ZERO], [C::ZERO, C::real(lambda.sqrt())]];
        self.apply_channel(&[k0, k1]);
    }

    /// Depolarizing noise: with probability `p` the state is replaced by the maximally mixed one.
    pub fn depolarize(&mut self, p: f64) {
        let a = C::real((1.0 - 0.75 * p).sqrt());
        let b = (p / 4.0).sqrt();
        let scaled = |m: M2| -> M2 {
            let mut o = m;
            for row in &mut o {
                for x in row {
                    *x = x.scale(b);
                }
            }
            o
        };
        let k0 = [[a, C::ZERO], [C::ZERO, a]];
        self.apply_channel(&[k0, scaled(pauli_x()), scaled(pauli_y()), scaled(pauli_z())]);
    }

    /// Let `dt` of time pass with energy relaxation time `t1` and dephasing time `t2`
    /// (both in the same unit as `dt`). Needs `t2 ≤ 2·t1`, as in any real qubit: pass a larger `t2`
    /// and it is limited to `2·t1`. The populations relax as e^{−t/T₁} and the coherences as e^{−t/T₂},
    /// exactly, however `dt` is chosen.
    pub fn decohere(&mut self, dt: f64, t1: f64, t2: f64) {
        let t2 = t2.min(2.0 * t1);
        let gamma = 1.0 - (-dt / t1).exp();
        // Amplitude damping already shrinks coherences by √(1 − γ) = e^{−dt/2T₁}. Dephasing supplies the rest.
        let lambda = 1.0 - (-2.0 * dt / t2 + dt / t1).exp();
        self.amplitude_damping(gamma);
        self.dephasing(lambda.max(0.0));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const GATES: [Gate; 10] = [
        Gate::X,
        Gate::Y,
        Gate::Z,
        Gate::H,
        Gate::S,
        Gate::Sdg,
        Gate::T,
        Gate::Rx(0.7),
        Gate::Ry(-1.9),
        Gate::Rz(2.4),
    ];

    /// A deterministic spread of pure states, for tests that should hold for any state.
    fn states() -> Vec<Qubit> {
        let mut v = Vec::new();
        for i in 0..6 {
            for j in 0..6 {
                let theta = PI * (i as f64 + 0.5) / 6.0;
                let phi = std::f64::consts::TAU * j as f64 / 6.0;
                v.push(Qubit::pure([
                    theta.sin() * phi.cos(),
                    theta.sin() * phi.sin(),
                    theta.cos(),
                ]));
            }
        }
        v
    }

    #[test]
    fn gate_identities_hold() {
        // docs/VALIDATION.md: gate identities (H² = I, HZH = X, S² = Z, T² = S), error < 1e-12.
        let (x, y, z, h) = (
            Gate::X.unitary(),
            Gate::Y.unitary(),
            Gate::Z.unitary(),
            Gate::H.unitary(),
        );
        let (s, t) = (Gate::S.unitary(), Gate::T.unitary());
        assert!(max_diff(&mul(&h, &h), &IDENTITY) < 1e-12, "H² = I");
        assert!(max_diff(&mul(&mul(&h, &z), &h), &x) < 1e-12, "HZH = X");
        assert!(max_diff(&mul(&mul(&h, &x), &h), &z) < 1e-12, "HXH = Z");
        assert!(max_diff(&mul(&s, &s), &z) < 1e-12, "S² = Z");
        assert!(max_diff(&mul(&t, &t), &s) < 1e-12, "T² = S");
        assert!(
            max_diff(&mul(&s, &Gate::Sdg.unitary()), &IDENTITY) < 1e-12,
            "S S† = I"
        );
        for g in [&x, &y, &z] {
            assert!(
                max_diff(&mul(g, g), &IDENTITY) < 1e-12,
                "Paulis square to I"
            );
        }
        // XY = iZ
        let xy = mul(&x, &y);
        let iz = [
            [C::I * z[0][0], C::I * z[0][1]],
            [C::I * z[1][0], C::I * z[1][1]],
        ];
        assert!(max_diff(&xy, &iz) < 1e-12, "XY = iZ");
    }

    #[test]
    fn every_gate_is_unitary() {
        for g in GATES {
            let u = g.unitary();
            assert!(max_diff(&mul(&u, &dagger(&u)), &IDENTITY) < 1e-12, "{g:?}");
        }
    }

    #[test]
    fn rotation_form_matches_the_matrix_form_up_to_a_global_phase() {
        // The lab animates gates as Bloch-sphere rotations. They must match the exact matrices.
        for g in GATES {
            let (axis, angle) = g.rotation();
            for q in states() {
                let mut by_matrix = q;
                by_matrix.apply_gate(g);
                let want = rotate_vector(q.bloch(), axis, angle);
                let got = by_matrix.bloch();
                for k in 0..3 {
                    assert!(
                        (got[k] - want[k]).abs() < 1e-12,
                        "{g:?} component {k}: {got:?} vs {want:?}"
                    );
                }
            }
            // And the rotation's unitary equals the named matrix times a phase: |Tr(U_named† U_rot)| = 2.
            let overlap = mul(&dagger(&g.unitary()), &rotation_unitary(axis, angle));
            let tr = overlap[0][0] + overlap[1][1];
            assert!((tr.norm_sqr().sqrt() - 2.0).abs() < 1e-12, "{g:?}");
        }
    }

    #[test]
    fn named_gates_move_the_poles_where_they_should() {
        let zero = Qubit::pure([0.0, 0.0, 1.0]);
        let mut q = zero;
        q.apply_gate(Gate::H);
        let r = q.bloch();
        assert!(
            (r[0] - 1.0).abs() < 1e-12 && r[1].abs() < 1e-12 && r[2].abs() < 1e-12,
            "H|0⟩ = |+⟩"
        );
        assert!((q.p0() - 0.5).abs() < 1e-12, "a fair coin");
        let mut q = zero;
        q.apply_gate(Gate::X);
        assert!((q.p1() - 1.0).abs() < 1e-12, "X|0⟩ = |1⟩");
        let mut q = Qubit::pure([1.0, 0.0, 0.0]);
        q.apply_gate(Gate::S);
        let r = q.bloch();
        assert!((r[1] - 1.0).abs() < 1e-12, "S|+⟩ = |+i⟩");
    }

    #[test]
    fn hadamard_phase_hadamard_gives_cos_squared_of_pi_over_eight() {
        // The lab's "predict" question: H, then T, then H on |0⟩, then measure.
        let mut q = Qubit::pure([0.0, 0.0, 1.0]);
        for g in [Gate::H, Gate::T, Gate::H] {
            q.apply_gate(g);
        }
        let want = (PI / 8.0).cos().powi(2);
        assert!((q.p0() - want).abs() < 1e-12, "{} vs {want}", q.p0());
        assert!((want - 0.853_553_390_593_273_8).abs() < 1e-12);
    }

    #[test]
    fn unitaries_keep_a_pure_state_pure() {
        let mut q = Qubit::pure([0.3, -0.5, 0.8]);
        for i in 0..200 {
            q.apply_gate(GATES[(i * 7) % GATES.len()]);
        }
        let r = q.bloch();
        let len = (r[0] * r[0] + r[1] * r[1] + r[2] * r[2]).sqrt();
        assert!((len - 1.0).abs() < 1e-12, "|r| = {len}");
        assert!((q.purity() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn noise_keeps_the_density_matrix_valid() {
        // docs/VALIDATION.md: ρ stays positive semidefinite with trace 1 under decoherence.
        let mut q = Qubit::pure([0.6, 0.0, 0.8]);
        for i in 0..3000 {
            q.apply_gate(GATES[(i * 5) % GATES.len()]);
            match i % 3 {
                0 => q.amplitude_damping(0.01),
                1 => q.dephasing(0.02),
                _ => q.depolarize(0.015),
            }
            assert!(
                (q.trace() - 1.0).abs() < 1e-12,
                "trace {} at step {i}",
                q.trace()
            );
            assert!(
                q.min_eigenvalue() > -1e-12,
                "eigenvalue {} at step {i}",
                q.min_eigenvalue()
            );
            // Hermitian: ρ01 = ρ10*
            assert!((q.rho[0][1] - q.rho[1][0].conj()).norm_sqr().sqrt() < 1e-12);
        }
    }

    #[test]
    fn relaxation_follows_exp_minus_t_over_t1_whatever_the_step() {
        let (t1, t2) = (4.0, 3.0);
        for steps in [10, 100, 1000] {
            let mut q = Qubit::pure([0.0, 0.0, -1.0]); // |1⟩
            let total = 6.0;
            for _ in 0..steps {
                q.decohere(total / steps as f64, t1, t2);
            }
            let want = (-total / t1).exp();
            assert!(
                (q.p1() - want).abs() < 1e-12,
                "steps {steps}: {} vs {want}",
                q.p1()
            );
        }
    }

    #[test]
    fn coherence_follows_exp_minus_t_over_t2() {
        let (t1, t2) = (5.0, 2.0);
        let mut q = Qubit::pure([1.0, 0.0, 0.0]); // |+⟩
        let (steps, total) = (500, 3.0);
        for _ in 0..steps {
            q.decohere(total / steps as f64, t1, t2);
        }
        let r = q.bloch();
        let transverse = r[0].hypot(r[1]);
        assert!(
            (transverse - (-total / t2).exp()).abs() < 1e-12,
            "{transverse}"
        );
    }

    #[test]
    fn t2_cannot_exceed_twice_t1() {
        // Asked for T₂ = 100 with T₁ = 1, the qubit behaves as T₂ = 2: a valid, physical state.
        let mut q = Qubit::pure([1.0, 0.0, 0.0]);
        for _ in 0..200 {
            q.decohere(0.02, 1.0, 100.0);
            assert!(q.min_eigenvalue() > -1e-12);
        }
        let r = q.bloch();
        assert!((r[0].hypot(r[1]) - (-4.0_f64 / 2.0).exp()).abs() < 1e-9);
    }

    #[test]
    fn long_noise_ends_in_the_ground_state() {
        let mut q = Qubit::pure([0.5, 0.5, -0.7]);
        for _ in 0..4000 {
            q.decohere(0.05, 1.0, 1.5);
        }
        let r = q.bloch();
        assert!(
            r[0].abs() < 1e-6 && r[1].abs() < 1e-6 && (r[2] - 1.0).abs() < 1e-6,
            "{r:?}"
        );
    }

    #[test]
    fn depolarizing_shrinks_the_whole_sphere_equally() {
        let mut q = Qubit::pure([0.0, 0.6, 0.8]);
        q.depolarize(0.4);
        let r = q.bloch();
        // The Bloch vector shrinks by 1 − p.
        assert!(
            (r[1] - 0.6 * 0.6).abs() < 1e-12 && (r[2] - 0.8 * 0.6).abs() < 1e-12,
            "{r:?}"
        );
        assert!(q.purity() < 1.0);
    }
}
