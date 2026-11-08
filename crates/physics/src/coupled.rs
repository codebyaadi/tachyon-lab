//! A chain of identical masses joined by identical springs, with both ends fixed (module C5).
//!
//! `N` unit masses at positions `u₁…u_N`; each is pulled by the springs on its two sides, whose
//! stiffness is `ω₀²`, and the walls hold `u₀ = u_{N+1} = 0`. The motion is a sum of **normal
//! modes**: standing waves that each oscillate at one frequency.

use crate::ode::System;

/// The most masses the [`System`] implementation handles (it uses a fixed scratch buffer).
pub const MAX_MASSES: usize = 16;

/// `u_j'' = ω₀² (u_{j−1} − 2u_j + u_{j+1})` with state `[u₁…u_N, v₁…v_N]`.
pub struct Chain {
    pub n: usize,
    pub omega0: f64,
}

impl Chain {
    /// Total energy per unit mass: ½Σv² + ½ω₀² Σ (u_{j+1} − u_j)², walls included.
    pub fn energy(&self, y: &[f64]) -> f64 {
        let n = self.n;
        let kinetic: f64 = y[n..2 * n].iter().map(|v| v * v).sum();
        let mut stretch = 0.0;
        for j in 0..=n {
            let left = if j == 0 { 0.0 } else { y[j - 1] };
            let right = if j == n { 0.0 } else { y[j] };
            stretch += (right - left).powi(2);
        }
        0.5 * kinetic + 0.5 * self.omega0 * self.omega0 * stretch
    }

    /// Accelerations of the `n` masses for positions `u`.
    pub fn accel(&self, u: &[f64], a: &mut [f64]) {
        let w2 = self.omega0 * self.omega0;
        for j in 0..self.n {
            let left = if j == 0 { 0.0 } else { u[j - 1] };
            let right = if j + 1 == self.n { 0.0 } else { u[j + 1] };
            a[j] = w2 * (left - 2.0 * u[j] + right);
        }
    }

    /// Angular frequency of normal mode `k` (1-based): ω_k = 2ω₀ sin(kπ / (2(N+1))).
    pub fn mode_frequency(&self, k: usize) -> f64 {
        2.0 * self.omega0 * (k as f64 * std::f64::consts::PI / (2.0 * (self.n + 1) as f64)).sin()
    }

    /// Shape of normal mode `k` at mass `j` (both 1-based): sin(jkπ / (N+1)).
    pub fn mode_shape(&self, k: usize, j: usize) -> f64 {
        (j as f64 * k as f64 * std::f64::consts::PI / (self.n + 1) as f64).sin()
    }
}

impl System for Chain {
    fn dim(&self) -> usize {
        2 * self.n
    }
    fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
        let n = self.n;
        dy[..n].copy_from_slice(&y[n..2 * n]);
        assert!(
            n <= MAX_MASSES,
            "chains longer than {MAX_MASSES} masses are not supported"
        );
        let mut a = [0.0; MAX_MASSES];
        self.accel(&y[..n], &mut a[..n]);
        dy[n..2 * n].copy_from_slice(&a[..n]);
    }
}

/// The exact motion from given starting positions and velocities, as a sum over normal modes:
/// `u_j(t) = Σ_k (a_k cos ω_k t + (b_k/ω_k) sin ω_k t) · sin(jkπ/(N+1))`.
pub struct Modal {
    chain_n: usize,
    omegas: Vec<f64>,
    shapes: Vec<Vec<f64>>,
    a: Vec<f64>,
    b: Vec<f64>,
}

impl Modal {
    pub fn new(chain: &Chain, u0: &[f64], v0: &[f64]) -> Self {
        let n = chain.n;
        let norm = 2.0 / (n + 1) as f64;
        let omegas: Vec<f64> = (1..=n).map(|k| chain.mode_frequency(k)).collect();
        let shapes: Vec<Vec<f64>> = (1..=n)
            .map(|k| (1..=n).map(|j| chain.mode_shape(k, j)).collect())
            .collect();
        let project = |x: &[f64], k: usize| norm * (0..n).map(|j| x[j] * shapes[k][j]).sum::<f64>();
        let a = (0..n).map(|k| project(u0, k)).collect();
        let b = (0..n).map(|k| project(v0, k)).collect();
        Modal {
            chain_n: n,
            omegas,
            shapes,
            a,
            b,
        }
    }

    /// Positions and velocities of all masses at time `t`.
    pub fn at(&self, t: f64, u: &mut [f64], v: &mut [f64]) {
        u[..self.chain_n].fill(0.0);
        v[..self.chain_n].fill(0.0);
        for k in 0..self.chain_n {
            let w = self.omegas[k];
            let (sin, cos) = (w * t).sin_cos();
            let pos = self.a[k] * cos + self.b[k] / w * sin;
            let vel = -self.a[k] * w * sin + self.b[k] * cos;
            for j in 0..self.chain_n {
                u[j] += pos * self.shapes[k][j];
                v[j] += vel * self.shapes[k][j];
            }
        }
    }
}

/// Eigenvalues of a symmetric matrix by cyclic Jacobi rotations (fine for the small matrices here).
pub fn symmetric_eigenvalues(a: &[Vec<f64>]) -> Vec<f64> {
    let n = a.len();
    let mut m: Vec<Vec<f64>> = a.to_vec();
    for _ in 0..100 {
        let off: f64 = (0..n)
            .flat_map(|i| (0..n).filter(move |&j| j != i).map(move |j| (i, j)))
            .map(|(i, j)| m[i][j] * m[i][j])
            .sum();
        if off < 1e-30 {
            break;
        }
        for p in 0..n {
            for q in (p + 1)..n {
                if m[p][q].abs() < 1e-300 {
                    continue;
                }
                let theta = (m[q][q] - m[p][p]) / (2.0 * m[p][q]);
                let t = theta.signum() / (theta.abs() + (theta * theta + 1.0).sqrt());
                let t = if theta == 0.0 { 1.0 } else { t };
                let c = 1.0 / (t * t + 1.0).sqrt();
                let s = t * c;
                for k in 0..n {
                    let (kp, kq) = (m[k][p], m[k][q]);
                    m[k][p] = c * kp - s * kq;
                    m[k][q] = s * kp + c * kq;
                }
                for k in 0..n {
                    let (pk, qk) = (m[p][k], m[q][k]);
                    m[p][k] = c * pk - s * qk;
                    m[q][k] = s * pk + c * qk;
                }
            }
        }
    }
    let mut eig: Vec<f64> = (0..n).map(|i| m[i][i]).collect();
    eig.sort_by(|x, y| x.partial_cmp(y).expect("finite eigenvalues"));
    eig
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ode::{Euler, Integrator, Rk4, velocity_verlet_step};

    /// The stiffness matrix K of the chain: u'' = −K u.
    fn stiffness(n: usize, omega0: f64) -> Vec<Vec<f64>> {
        let w2 = omega0 * omega0;
        (0..n)
            .map(|i| {
                (0..n)
                    .map(|j| {
                        if i == j {
                            2.0 * w2
                        } else if i.abs_diff(j) == 1 {
                            -w2
                        } else {
                            0.0
                        }
                    })
                    .collect()
            })
            .collect()
    }

    #[test]
    fn eigenvalues_of_the_chain_match_the_normal_mode_formula() {
        // docs/VALIDATION.md: normal-mode frequencies of N masses vs ω_k = 2ω₀ sin(kπ / (2(N+1))).
        for n in 1..=12 {
            for omega0 in [0.7, 1.0, 2.5] {
                let chain = Chain { n, omega0 };
                let eig = symmetric_eigenvalues(&stiffness(n, omega0));
                // λ = ω², and the formula's frequencies increase with k, like the sorted eigenvalues.
                for (k, lambda) in eig.iter().enumerate() {
                    let expected = chain.mode_frequency(k + 1);
                    let got = lambda.sqrt();
                    assert!(
                        (got - expected).abs() / expected < 1e-10,
                        "n {n} omega0 {omega0} mode {}: {got} vs {expected}",
                        k + 1
                    );
                }
            }
        }
    }

    #[test]
    fn modes_are_orthogonal_standing_waves() {
        let chain = Chain { n: 6, omega0: 1.0 };
        for k in 1..=6 {
            for l in 1..=6 {
                let dot: f64 = (1..=6)
                    .map(|j| chain.mode_shape(k, j) * chain.mode_shape(l, j))
                    .sum();
                let expected = if k == l { 7.0 / 2.0 } else { 0.0 };
                assert!((dot - expected).abs() < 1e-12, "modes {k} and {l}: {dot}");
            }
        }
    }

    #[test]
    fn exact_motion_starts_from_the_initial_conditions() {
        let chain = Chain { n: 5, omega0: 2.0 };
        let u0 = [0.3, -0.1, 0.8, 0.0, 0.25];
        let v0 = [0.0, 0.5, -0.2, 0.1, 0.0];
        let modal = Modal::new(&chain, &u0, &v0);
        let (mut u, mut v) = ([0.0; 5], [0.0; 5]);
        modal.at(0.0, &mut u, &mut v);
        for j in 0..5 {
            assert!(
                (u[j] - u0[j]).abs() < 1e-12 && (v[j] - v0[j]).abs() < 1e-12,
                "mass {j}"
            );
        }
    }

    #[test]
    fn a_single_mode_is_a_standing_wave_at_its_own_frequency() {
        let chain = Chain { n: 4, omega0: 1.5 };
        let k = 3;
        let u0: Vec<f64> = (1..=4).map(|j| chain.mode_shape(k, j)).collect();
        let modal = Modal::new(&chain, &u0, &[0.0; 4]);
        let (mut u, mut v) = ([0.0; 4], [0.0; 4]);
        for step in 0..20 {
            let t = step as f64 * 0.31;
            modal.at(t, &mut u, &mut v);
            for j in 1..=4 {
                let want = chain.mode_shape(k, j) * (chain.mode_frequency(k) * t).cos();
                assert!((u[j - 1] - want).abs() < 1e-12, "t {t} mass {j}");
            }
        }
    }

    #[test]
    fn rk4_matches_the_exact_motion_when_one_mass_is_plucked() {
        // docs/VALIDATION.md: chain of masses vs the exact normal-mode solution.
        let chain = Chain { n: 5, omega0: 2.0 };
        let mut u0 = [0.0; 5];
        u0[0] = 1.0;
        let modal = Modal::new(&chain, &u0, &[0.0; 5]);
        let mut y = [0.0; 10];
        y[0] = 1.0;
        let mut rk4 = Rk4::new(10);
        let dt = 1e-3;
        let steps = 15_000;
        for i in 0..steps {
            rk4.step(&chain, i as f64 * dt, &mut y, dt);
        }
        let (mut u, mut v) = ([0.0; 5], [0.0; 5]);
        modal.at(steps as f64 * dt, &mut u, &mut v);
        for j in 0..5 {
            assert!((y[j] - u[j]).abs() < 1e-8, "mass {j}: {} vs {}", y[j], u[j]);
            assert!((y[5 + j] - v[j]).abs() < 1e-8, "velocity {j}");
        }
    }

    #[test]
    fn energy_is_conserved_by_verlet_and_grows_under_euler() {
        let chain = Chain { n: 4, omega0: 2.0 };
        let mut u = [1.0, 0.0, 0.0, 0.0];
        let mut v = [0.0; 4];
        let mut a = [0.0; 4];
        chain.accel(&u, &mut a);
        let start = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        let e0 = chain.energy(&start);
        let dt = 0.01;
        let mut worst = 0.0_f64;
        for _ in 0..50_000 {
            velocity_verlet_step(&mut u, &mut v, &mut a, dt, |x, acc| chain.accel(x, acc));
            let y = [u[0], u[1], u[2], u[3], v[0], v[1], v[2], v[3]];
            worst = worst.max(((chain.energy(&y) - e0) / e0).abs());
        }
        assert!(worst < 1e-3, "Verlet energy error {worst}");

        let mut y = start;
        let mut euler = Euler::new(8);
        for i in 0..5_000 {
            euler.step(&chain, i as f64 * dt, &mut y, dt);
        }
        assert!(
            chain.energy(&y) > 3.0 * e0,
            "Euler energy {}",
            chain.energy(&y)
        );
    }
}
