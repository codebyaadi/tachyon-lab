//! A particle on a line: the time-dependent Schrödinger equation by the split-step Fourier method
//! (module Q2).
//!
//! Units: ħ = m = 1, so the equation is `i ∂ψ/∂t = −½ ∂²ψ/∂x² + V(x) ψ`, lengths are in units of
//! the page's length scale and energy ½k² belongs to a wave number k.
//!
//! One step of length dt applies half a step of the potential, a whole step of the kinetic energy,
//! then the second half of the potential (Strang splitting). The potential part is a multiplication
//! by a phase in position space and the kinetic part a multiplication by a phase in momentum space,
//! reached with a fast Fourier transform. Each factor has magnitude 1, so the total probability is
//! conserved to rounding error however large the step is. The grid is periodic: a packet that leaves
//! one side comes back on the other.

use std::f64::consts::PI;

/// Radix-2 fast Fourier transform for a fixed length that is a power of two.
pub struct Fft {
    n: usize,
    rev: Vec<usize>,
    cos: Vec<f64>,
    sin: Vec<f64>,
}

impl Fft {
    pub fn new(n: usize) -> Fft {
        assert!(
            n.is_power_of_two() && n >= 2,
            "length must be a power of two"
        );
        let bits = n.trailing_zeros();
        let rev = (0..n)
            .map(|i| i.reverse_bits() >> (usize::BITS - bits))
            .collect();
        let cos = (0..n / 2)
            .map(|k| (2.0 * PI * k as f64 / n as f64).cos())
            .collect();
        let sin = (0..n / 2)
            .map(|k| (2.0 * PI * k as f64 / n as f64).sin())
            .collect();
        Fft { n, rev, cos, sin }
    }

    /// Forward transform `X_k = Σ x_j e^{−2πi jk/n}`, or with `inverse` the inverse (including the 1/n).
    pub fn transform(&self, re: &mut [f64], im: &mut [f64], inverse: bool) {
        let n = self.n;
        assert!(re.len() == n && im.len() == n);
        for i in 0..n {
            let j = self.rev[i];
            if i < j {
                re.swap(i, j);
                im.swap(i, j);
            }
        }
        let sign = if inverse { 1.0 } else { -1.0 };
        let mut len = 2;
        while len <= n {
            let half = len / 2;
            let stride = n / len;
            for start in (0..n).step_by(len) {
                for k in 0..half {
                    let wr = self.cos[k * stride];
                    let wi = sign * self.sin[k * stride];
                    let (a, b) = (start + k, start + k + half);
                    let tr = re[b] * wr - im[b] * wi;
                    let ti = re[b] * wi + im[b] * wr;
                    re[b] = re[a] - tr;
                    im[b] = im[a] - ti;
                    re[a] += tr;
                    im[a] += ti;
                }
            }
            len *= 2;
        }
        if inverse {
            let s = 1.0 / n as f64;
            for i in 0..n {
                re[i] *= s;
                im[i] *= s;
            }
        }
    }
}

/// Wave number of FFT bin `j` on a periodic grid of `n` points spanning length `l`.
fn wave_number(j: usize, n: usize, l: f64) -> f64 {
    let m = if j <= n / 2 {
        j as f64
    } else {
        j as f64 - n as f64
    };
    2.0 * PI * m / l
}

/// A complex wavefunction on a periodic grid `x_j = −L/2 + j·dx`, with a real potential.
pub struct Wave1D {
    pub n: usize,
    pub l: f64,
    pub dx: f64,
    pub re: Vec<f64>,
    pub im: Vec<f64>,
    pub v: Vec<f64>,
    pub t: f64,
    dt: f64,
    fft: Fft,
    half_c: Vec<f64>,
    half_s: Vec<f64>,
    kin_c: Vec<f64>,
    kin_s: Vec<f64>,
    scratch_re: Vec<f64>,
    scratch_im: Vec<f64>,
}

impl Wave1D {
    /// `n` grid points (a power of two) over a length `l`, zero potential, empty wavefunction.
    pub fn new(n: usize, l: f64) -> Wave1D {
        Wave1D {
            n,
            l,
            dx: l / n as f64,
            re: vec![0.0; n],
            im: vec![0.0; n],
            v: vec![0.0; n],
            t: 0.0,
            dt: 0.0,
            fft: Fft::new(n),
            half_c: vec![1.0; n],
            half_s: vec![0.0; n],
            kin_c: vec![1.0; n],
            kin_s: vec![0.0; n],
            scratch_re: vec![0.0; n],
            scratch_im: vec![0.0; n],
        }
    }

    pub fn x(&self, j: usize) -> f64 {
        -0.5 * self.l + j as f64 * self.dx
    }

    /// Set the potential from a function of position, and rebuild the step tables.
    pub fn set_potential(&mut self, f: impl Fn(f64) -> f64) {
        for j in 0..self.n {
            self.v[j] = f(self.x(j));
        }
        self.rebuild();
    }

    /// Set the time step (and rebuild the tables).
    pub fn set_dt(&mut self, dt: f64) {
        self.dt = dt;
        self.rebuild();
    }

    pub fn dt(&self) -> f64 {
        self.dt
    }

    fn rebuild(&mut self) {
        for j in 0..self.n {
            let a = -0.5 * self.v[j] * self.dt;
            self.half_c[j] = a.cos();
            self.half_s[j] = a.sin();
            let k = wave_number(j, self.n, self.l);
            let b = -0.5 * k * k * self.dt;
            self.kin_c[j] = b.cos();
            self.kin_s[j] = b.sin();
        }
    }

    /// A Gaussian packet: |ψ|² has standard deviation `sigma` and is centred on `x0`,
    /// and the mean wave number is `k0`. Normalised on the grid.
    pub fn set_gaussian(&mut self, x0: f64, sigma: f64, k0: f64) {
        for j in 0..self.n {
            let x = self.x(j);
            let a = (-(x - x0) * (x - x0) / (4.0 * sigma * sigma)).exp();
            self.re[j] = a * (k0 * x).cos();
            self.im[j] = a * (k0 * x).sin();
        }
        self.normalise();
        self.t = 0.0;
    }

    pub fn normalise(&mut self) {
        let s = 1.0 / self.norm().sqrt();
        for j in 0..self.n {
            self.re[j] *= s;
            self.im[j] *= s;
        }
    }

    fn half_potential(&mut self) {
        for j in 0..self.n {
            let (c, s) = (self.half_c[j], self.half_s[j]);
            let (a, b) = (self.re[j], self.im[j]);
            self.re[j] = a * c - b * s;
            self.im[j] = a * s + b * c;
        }
    }

    /// Advance by one time step.
    pub fn step(&mut self) {
        self.half_potential();
        self.fft.transform(&mut self.re, &mut self.im, false);
        for j in 0..self.n {
            let (c, s) = (self.kin_c[j], self.kin_s[j]);
            let (a, b) = (self.re[j], self.im[j]);
            self.re[j] = a * c - b * s;
            self.im[j] = a * s + b * c;
        }
        self.fft.transform(&mut self.re, &mut self.im, true);
        self.half_potential();
        self.t += self.dt;
    }

    pub fn steps(&mut self, count: usize) {
        for _ in 0..count {
            self.step();
        }
    }

    /// |ψ(x_j)|².
    pub fn density(&self, j: usize) -> f64 {
        self.re[j] * self.re[j] + self.im[j] * self.im[j]
    }

    /// Total probability, ∫|ψ|² dx. It stays at 1.
    pub fn norm(&self) -> f64 {
        (0..self.n).map(|j| self.density(j)).sum::<f64>() * self.dx
    }

    pub fn mean_x(&self) -> f64 {
        (0..self.n)
            .map(|j| self.x(j) * self.density(j))
            .sum::<f64>()
            * self.dx
            / self.norm()
    }

    /// Standard deviation of position.
    pub fn std_x(&self) -> f64 {
        let m = self.mean_x();
        let var = (0..self.n)
            .map(|j| (self.x(j) - m).powi(2) * self.density(j))
            .sum::<f64>()
            * self.dx
            / self.norm();
        var.max(0.0).sqrt()
    }

    /// Probability of finding the particle in `a ≤ x < b`.
    pub fn probability_between(&self, a: f64, b: f64) -> f64 {
        (0..self.n)
            .filter(|&j| self.x(j) >= a && self.x(j) < b)
            .map(|j| self.density(j))
            .sum::<f64>()
            * self.dx
    }

    /// Mean and standard deviation of momentum (= wave number), and the mean kinetic energy ½⟨p²⟩.
    pub fn momentum_moments(&mut self) -> (f64, f64, f64) {
        self.scratch_re.copy_from_slice(&self.re);
        self.scratch_im.copy_from_slice(&self.im);
        self.fft
            .transform(&mut self.scratch_re, &mut self.scratch_im, false);
        let (mut w, mut p1, mut p2) = (0.0, 0.0, 0.0);
        for j in 0..self.n {
            let weight = self.scratch_re[j].powi(2) + self.scratch_im[j].powi(2);
            let k = wave_number(j, self.n, self.l);
            w += weight;
            p1 += k * weight;
            p2 += k * k * weight;
        }
        let mean = p1 / w;
        let std = (p2 / w - mean * mean).max(0.0).sqrt();
        (mean, std, 0.5 * p2 / w)
    }

    /// Mean energy ⟨T⟩ + ⟨V⟩.
    pub fn energy(&mut self) -> f64 {
        let (_, _, kinetic) = self.momentum_moments();
        let potential = (0..self.n)
            .map(|j| self.v[j] * self.density(j))
            .sum::<f64>()
            * self.dx
            / self.norm();
        kinetic + potential
    }
}

/// The lowest `count` energy levels and their (real, normalised, ∫ψ² dx = 1) wavefunctions for a
/// potential on a periodic grid, found by evolving in imaginary time.
///
/// Replacing `t → −iτ` turns the Schrödinger equation into a decay in which every state shrinks as
/// `e^{−Eτ}`, so higher energies die away fastest. Repeating steps and removing the components along
/// the states already found leaves the lowest levels in turn. Needs a potential that is symmetric
/// about the middle of the grid (the starting guesses are an even and an odd function in turn).
pub fn eigenstates(
    n: usize,
    l: f64,
    v: &[f64],
    count: usize,
    dtau: f64,
    steps: usize,
) -> Vec<(f64, Vec<f64>)> {
    let fft = Fft::new(n);
    let dx = l / n as f64;
    let half: Vec<f64> = v.iter().map(|v| (-0.5 * v * dtau).exp()).collect();
    let kin: Vec<f64> = (0..n)
        .map(|j| {
            let k = wave_number(j, n, l);
            (-0.5 * k * k * dtau).exp()
        })
        .collect();
    let x = |j: usize| -0.5 * l + j as f64 * dx;
    let width = l / 8.0;
    let mut states: Vec<Vec<f64>> = (0..count)
        .map(|s| {
            (0..n)
                .map(|j| x(j).powi(s as i32) * (-(x(j) * x(j)) / (2.0 * width * width)).exp())
                .collect()
        })
        .collect();
    let dot = |a: &[f64], b: &[f64]| a.iter().zip(b).map(|(p, q)| p * q).sum::<f64>() * dx;
    let mut im = vec![0.0; n];
    for _ in 0..steps {
        for s in 0..count {
            let psi = &mut states[s];
            for j in 0..n {
                psi[j] *= half[j];
            }
            im.fill(0.0);
            fft.transform(psi, &mut im, false);
            for j in 0..n {
                psi[j] *= kin[j];
                im[j] *= kin[j];
            }
            fft.transform(psi, &mut im, true);
            for j in 0..n {
                psi[j] *= half[j];
            }
        }
        for s in 0..count {
            for p in 0..s {
                let (lower, upper) = states.split_at_mut(s);
                let overlap = dot(&lower[p], &upper[0]);
                for j in 0..n {
                    upper[0][j] -= overlap * lower[p][j];
                }
            }
            let norm = dot(&states[s], &states[s]).sqrt();
            for value in states[s].iter_mut() {
                *value /= norm;
            }
        }
    }
    states
        .into_iter()
        .map(|psi| {
            let mut re = psi.clone();
            let mut imag = vec![0.0; n];
            fft.transform(&mut re, &mut imag, false);
            let mut kinetic = 0.0;
            let mut weight = 0.0;
            for j in 0..n {
                let k = wave_number(j, n, l);
                let w = re[j] * re[j] + imag[j] * imag[j];
                kinetic += 0.5 * k * k * w;
                weight += w;
            }
            let potential: f64 = (0..n).map(|j| v[j] * psi[j] * psi[j]).sum::<f64>() * dx;
            (kinetic / weight + potential, psi)
        })
        .collect()
}

/// Exact results the simulation is checked against.
pub mod exact {
    /// Standard deviation of |ψ|² for a free Gaussian packet that started with width `sigma`, after time `t`
    /// (ħ = m = 1): σ(t) = σ √(1 + (t / 2σ²)²).
    pub fn free_width(sigma: f64, t: f64) -> f64 {
        sigma * (1.0 + (t / (2.0 * sigma * sigma)).powi(2)).sqrt()
    }

    /// Probability of passing a rectangular barrier of height `v0` and width `a` for a plane wave of
    /// wave number `k` (energy ½k²), including the case of energy above the barrier.
    pub fn barrier_transmission(k: f64, v0: f64, a: f64) -> f64 {
        let e = 0.5 * k * k;
        if (e - v0).abs() < 1e-12 {
            // Exactly at the top: the limit of both formulas.
            let kappa_a = k * a;
            return 1.0 / (1.0 + 0.25 * kappa_a * kappa_a * 0.5 * k * k / (2.0 * e).max(1e-300));
        }
        if e < v0 {
            let kappa = (2.0 * (v0 - e)).sqrt();
            1.0 / (1.0 + v0 * v0 * (kappa * a).sinh().powi(2) / (4.0 * e * (v0 - e)))
        } else {
            let q = (2.0 * (e - v0)).sqrt();
            1.0 / (1.0 + v0 * v0 * (q * a).sin().powi(2) / (4.0 * e * (e - v0)))
        }
    }

    /// Probability of passing a step up of height `v0` for a plane wave of wave number `k`:
    /// zero below the step, and 4k·k′/(k + k′)² above it, where k′ = √(k² − 2v₀).
    pub fn step_transmission(k: f64, v0: f64) -> f64 {
        let e = 0.5 * k * k;
        if e <= v0 {
            return 0.0;
        }
        let q = (2.0 * (e - v0)).sqrt();
        4.0 * k * q / ((k + q) * (k + q))
    }

    /// The lowest `count` bound-state energies of a square well of width `a` with walls of height `v0`
    /// (zero inside), by solving the matching conditions. As `v0` grows they approach the infinite
    /// well's `n²π²/(2a²)`.
    pub fn finite_well_levels(a: f64, v0: f64, count: usize) -> Vec<f64> {
        let kmax = (2.0 * v0).sqrt();
        let kappa = |k: f64| (kmax * kmax - k * k).max(0.0).sqrt();
        let mut out = Vec::new();
        for n in 1..=count {
            let even = n % 2 == 1;
            let g = |k: f64| {
                let h = 0.5 * k * a;
                if even {
                    k * h.sin() - kappa(k) * h.cos()
                } else {
                    k * h.cos() + kappa(k) * h.sin()
                }
            };
            let mut lo = (n - 1) as f64 * std::f64::consts::PI / a;
            let mut hi = (n as f64 * std::f64::consts::PI / a).min(kmax);
            if lo >= kmax {
                break;
            }
            if even {
                lo += 1e-12;
            }
            for _ in 0..200 {
                let mid = 0.5 * (lo + hi);
                if g(lo).signum() == g(mid).signum() {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            let k = 0.5 * (lo + hi);
            out.push(0.5 * k * k);
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    #[test]
    fn fft_of_a_single_wave_is_a_single_spike() {
        let n = 64;
        let fft = Fft::new(n);
        let mut re: Vec<f64> = (0..n)
            .map(|j| (2.0 * PI * 5.0 * j as f64 / n as f64).cos())
            .collect();
        let mut im = vec![0.0; n];
        fft.transform(&mut re, &mut im, false);
        for k in 0..n {
            let want = if k == 5 || k == n - 5 {
                n as f64 / 2.0
            } else {
                0.0
            };
            assert!((re[k] - want).abs() < 1e-10, "bin {k}: {}", re[k]);
            assert!(im[k].abs() < 1e-10);
        }
    }

    #[test]
    fn fft_matches_the_slow_definition_and_inverts() {
        let n = 32;
        let fft = Fft::new(n);
        let xr: Vec<f64> = (0..n).map(|j| ((j * 7 + 3) % 11) as f64 - 5.0).collect();
        let xi: Vec<f64> = (0..n).map(|j| ((j * 5 + 1) % 13) as f64 - 6.0).collect();
        let (mut re, mut im) = (xr.clone(), xi.clone());
        fft.transform(&mut re, &mut im, false);
        for k in 0..n {
            let (mut sr, mut si) = (0.0, 0.0);
            for j in 0..n {
                let a = -2.0 * PI * (j * k) as f64 / n as f64;
                sr += xr[j] * a.cos() - xi[j] * a.sin();
                si += xr[j] * a.sin() + xi[j] * a.cos();
            }
            assert!((re[k] - sr).abs() < 1e-9 && (im[k] - si).abs() < 1e-9);
        }
        // Parseval: Σ|X|² = n Σ|x|².
        let e_time: f64 = (0..n).map(|j| xr[j] * xr[j] + xi[j] * xi[j]).sum();
        let e_freq: f64 = (0..n).map(|j| re[j] * re[j] + im[j] * im[j]).sum();
        assert!((e_freq - n as f64 * e_time).abs() < 1e-8 * e_freq);
        fft.transform(&mut re, &mut im, true);
        for j in 0..n {
            assert!((re[j] - xr[j]).abs() < 1e-12 && (im[j] - xi[j]).abs() < 1e-12);
        }
    }

    #[test]
    fn probability_is_conserved_even_through_a_barrier_with_a_large_step() {
        let mut w = Wave1D::new(1024, 160.0);
        w.set_potential(|x| if x.abs() < 1.0 { 0.8 } else { 0.0 });
        w.set_dt(0.2);
        w.set_gaussian(-30.0, 3.0, 1.0);
        w.steps(400);
        assert!((w.norm() - 1.0).abs() < 1e-12, "norm {}", w.norm());
    }

    #[test]
    fn a_free_packet_spreads_and_drifts_exactly() {
        let (sigma, k0, x0) = (2.0, 1.5, -40.0);
        let mut w = Wave1D::new(2048, 400.0);
        w.set_dt(0.05);
        w.set_gaussian(x0, sigma, k0);
        for &t in &[10.0, 25.0, 60.0] {
            while w.t < t - 1e-9 {
                w.step();
            }
            let want_width = exact::free_width(sigma, w.t);
            assert!(
                (w.std_x() - want_width).abs() < 1e-5 * want_width,
                "t = {}: width {} vs {}",
                w.t,
                w.std_x(),
                want_width
            );
            assert!((w.mean_x() - (x0 + k0 * w.t)).abs() < 1e-6, "t = {}", w.t);
        }
        // A free packet keeps its momentum distribution: k0 and 1/(2σ).
        let (mean, std, _) = w.momentum_moments();
        assert!((mean - k0).abs() < 1e-9);
        assert!((std - 1.0 / (2.0 * sigma)).abs() < 1e-6);
    }

    #[test]
    fn the_packet_obeys_the_uncertainty_principle_and_the_gaussian_saturates_it() {
        let mut w = Wave1D::new(1024, 160.0);
        w.set_dt(0.05);
        w.set_gaussian(0.0, 3.0, 0.7);
        let (_, sp, _) = w.momentum_moments();
        assert!((w.std_x() * sp - 0.5).abs() < 1e-6);
        w.steps(600);
        let (_, sp, _) = w.momentum_moments();
        assert!(w.std_x() * sp > 0.5, "spreading must not beat ħ/2");
    }

    #[test]
    fn the_harmonic_oscillator_levels_are_half_integers() {
        let (n, l, omega) = (1024, 40.0, 1.0);
        let mut w = Wave1D::new(n, l);
        w.set_potential(|x| 0.5 * omega * omega * x * x);
        let levels = eigenstates(n, l, &w.v, 4, 0.01, 2500);
        for (k, (e, _)) in levels.iter().enumerate() {
            let want = omega * (k as f64 + 0.5);
            assert!((e - want).abs() < 1e-5, "level {k}: {e} vs {want}");
        }
    }

    #[test]
    fn the_energy_expectation_of_the_ground_state_is_constant_in_time() {
        let (n, l) = (512, 40.0);
        let mut w = Wave1D::new(n, l);
        w.set_potential(|x| 0.5 * x * x);
        let ground = eigenstates(n, l, &w.v, 1, 0.01, 1500);
        w.re.copy_from_slice(&ground[0].1);
        w.set_dt(0.02);
        let e0 = w.energy();
        assert!((e0 - 0.5).abs() < 1e-5);
        w.steps(2000);
        assert!(
            (w.energy() - e0).abs() < 1e-4,
            "energy {} vs {}",
            w.energy(),
            e0
        );
        // |ψ|² of a stationary state does not change.
        let before: Vec<f64> = (0..n).map(|j| ground[0].1[j] * ground[0].1[j]).collect();
        let diff = (0..n)
            .map(|j| (w.density(j) - before[j]).abs())
            .fold(0.0, f64::max);
        assert!(diff < 1e-3, "density moved by {diff}");
    }

    #[test]
    fn box_levels_match_the_exact_square_well_and_the_infinite_well_limit() {
        // A box of width a = 4 with walls of height 100, on a grid fine enough to resolve the wall's
        // penetration depth 1/√(2V₀) = 0.07.
        // The width is a whole number of grid cells (171), so the box on the grid is the box in the formula.
        let (n, l, wall) = (1024, 24.0, 100.0);
        let a = 171.0 * l / n as f64;
        let mut w = Wave1D::new(n, l);
        w.set_potential(|x| if x.abs() < 0.5 * a { 0.0 } else { wall });
        let got = eigenstates(n, l, &w.v, 3, 0.001, 16000);
        let finite = exact::finite_well_levels(a, wall, 3);
        for k in 0..3 {
            let infinite = ((k + 1) as f64 * PI).powi(2) / (2.0 * a * a);
            assert!(
                (got[k].0 - finite[k]).abs() < 2e-3 * finite[k],
                "level {}: simulated {} vs finite well {}",
                k + 1,
                got[k].0,
                finite[k]
            );
            assert!(
                finite[k] < infinite && finite[k] > 0.9 * infinite,
                "level {}",
                k + 1
            );
        }
        // The levels grow as n²: E2/E1 → 4, E3/E1 → 9 for an infinite well.
        assert!((finite[1] / finite[0] - 4.0).abs() < 0.3);
        assert!((finite[2] / finite[0] - 9.0).abs() < 1.0);
    }

    #[test]
    fn exact_well_levels_tend_to_the_infinite_well() {
        let a = 3.0;
        for k in 1..=3 {
            let infinite = (k as f64 * PI).powi(2) / (2.0 * a * a);
            let e = exact::finite_well_levels(a, 1e6, 3)[k - 1];
            assert!(
                (e - infinite).abs() < 1e-3 * infinite,
                "level {k}: {e} vs {infinite}"
            );
        }
    }

    #[test]
    fn tunnelling_through_a_barrier_matches_the_exact_transmission() {
        // The barrier is 21 grid cells wide, so the barrier on the grid is the barrier in the formula.
        let (v0, k0, sigma) = (0.8, 1.0, 12.0);
        let a = 21.0 * 400.0 / 4096.0;
        let mut w = Wave1D::new(4096, 400.0);
        w.set_potential(|x| if x.abs() < 0.5 * a { v0 } else { 0.0 });
        w.set_dt(0.05);
        w.set_gaussian(-60.0, sigma, k0);
        while w.t < 120.0 {
            w.step();
        }
        let right = w.probability_between(0.5 * a, 200.0);
        let left = w.probability_between(-200.0, -0.5 * a);
        let inside = w.probability_between(-0.5 * a, 0.5 * a);
        assert!((left + right + inside - 1.0).abs() < 1e-9);
        assert!(
            inside < 1e-4,
            "packet should have left the barrier: {inside}"
        );
        // The expected value averages the plane-wave result over the packet's spread of wave numbers.
        let sk = 1.0 / (2.0 * sigma);
        let (mut num, mut den) = (0.0, 0.0);
        let m = 4000;
        for i in 0..=m {
            let k = k0 - 6.0 * sk + 12.0 * sk * i as f64 / m as f64;
            let weight = (-((k - k0) * (k - k0)) / (2.0 * sk * sk)).exp();
            num += weight * exact::barrier_transmission(k, v0, a);
            den += weight;
        }
        let expected = num / den;
        assert!(
            (right - expected).abs() < 0.01 * expected + 2e-3,
            "transmitted {right} vs expected {expected}"
        );
        // Plane wave at the central k for reference: close, not identical.
        let at_k0 = exact::barrier_transmission(k0, v0, a);
        assert!((at_k0 - expected).abs() < 0.03, "{at_k0} vs {expected}");
    }

    #[test]
    fn a_packet_hitting_a_step_splits_as_the_formula_says() {
        // Energy above the step (k = 2, E = 2, step 1.2): part is reflected, part transmitted.
        let (k0, v0, sigma) = (2.0, 1.2, 14.0);
        let mut w = Wave1D::new(4096, 400.0);
        w.set_potential(|x| if x >= 0.0 { v0 } else { 0.0 });
        w.set_dt(0.05);
        w.set_gaussian(-60.0, sigma, k0);
        while w.t < 60.0 {
            w.step();
        }
        let right = w.probability_between(0.0, 200.0);
        let want = exact::step_transmission(k0, v0);
        assert!((right - want).abs() < 0.01, "transmitted {right} vs {want}");
        // Below the step nothing is transmitted (apart from the evanescent tail).
        assert_eq!(exact::step_transmission(1.0, 1.2), 0.0);
    }

    #[test]
    fn transmission_formula_limits() {
        // Tall thick barrier: almost nothing gets through; no barrier: everything does.
        assert!(exact::barrier_transmission(1.0, 5.0, 5.0) < 1e-6);
        assert!((exact::barrier_transmission(1.0, 0.0, 3.0) - 1.0).abs() < 1e-12);
        // Above the barrier, an integer number of half wavelengths inside gives perfect transmission.
        let (v0, a) = (0.5, 2.0);
        let e = 2.0_f64;
        let q = (2.0 * (e - v0)).sqrt();
        let a_resonant = PI / q;
        let k = (2.0 * e).sqrt();
        assert!((exact::barrier_transmission(k, v0, a_resonant) - 1.0).abs() < 1e-12);
        assert!(exact::barrier_transmission(k, v0, a) < 1.0);
    }
}
