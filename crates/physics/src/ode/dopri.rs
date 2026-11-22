//! Dormand–Prince 5(4): an embedded Runge–Kutta pair with adaptive step size.
//!
//! Each step computes a 5th-order and an embedded 4th-order solution from the same seven
//! derivative evaluations. The 5th-order one is propagated (local extrapolation), and the
//! difference between the two estimates the local error. The step is accepted when the
//! error norm is at most 1, and the next step size is chosen from that norm.
//!
//! * **FSAL** (first same as last): the seventh stage is f(t + h, y_new), which is exactly the
//!   first stage of the next step. An accepted step therefore costs six derivative evaluations,
//!   not seven. The cached stage is only reused when the caller passes back the very state the
//!   last accepted step produced (bit for bit); otherwise it is recomputed.
//! * **Error norm:** RMS over components of `err_i / (atol + rtol · max(|y_i|, |y_new_i|))`.
//! * **Step control:** `h_next = h · min(fac_max, max(fac_min, 0.9 · norm^(−1/5)))`, with
//!   `fac_min = 0.2` and `fac_max = 5` by default. The step is never grown right after a
//!   rejection. There is no PI controller.
//! * **No allocation while stepping:** all scratch vectors are created in [`DormandPrince::new`].
//!
//! Dense output (the 4th-order interpolant) is not implemented.

use super::System;

/// Why an adaptive step could not be completed.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum DopriError {
    /// The step size fell below `h_min`, or is too small to advance `t` in floating point.
    StepTooSmall { t: f64, h: f64 },
    /// The requested step size was not a positive finite number.
    InvalidStep { h: f64 },
}

impl std::fmt::Display for DopriError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DopriError::StepTooSmall { t, h } => {
                write!(f, "step size {h:e} fell below the minimum at t = {t}")
            }
            DopriError::InvalidStep { h } => write!(f, "invalid step size {h}"),
        }
    }
}

impl std::error::Error for DopriError {}

// Butcher tableau (Dormand & Prince 1980). Row `a7*` is also the 5th-order weights `b`.
const C2: f64 = 1.0 / 5.0;
const C3: f64 = 3.0 / 10.0;
const C4: f64 = 4.0 / 5.0;
const C5: f64 = 8.0 / 9.0;

const A21: f64 = 1.0 / 5.0;
const A31: f64 = 3.0 / 40.0;
const A32: f64 = 9.0 / 40.0;
const A41: f64 = 44.0 / 45.0;
const A42: f64 = -56.0 / 15.0;
const A43: f64 = 32.0 / 9.0;
const A51: f64 = 19372.0 / 6561.0;
const A52: f64 = -25360.0 / 2187.0;
const A53: f64 = 64448.0 / 6561.0;
const A54: f64 = -212.0 / 729.0;
const A61: f64 = 9017.0 / 3168.0;
const A62: f64 = -355.0 / 33.0;
const A63: f64 = 46732.0 / 5247.0;
const A64: f64 = 49.0 / 176.0;
const A65: f64 = -5103.0 / 18656.0;
const B1: f64 = 35.0 / 384.0;
const B3: f64 = 500.0 / 1113.0;
const B4: f64 = 125.0 / 192.0;
const B5: f64 = -2187.0 / 6784.0;
const B6: f64 = 11.0 / 84.0;

// Error weights: b (5th order) minus b* (4th order).
const E1: f64 = 71.0 / 57600.0;
const E3: f64 = -71.0 / 16695.0;
const E4: f64 = 71.0 / 1920.0;
const E5: f64 = -17253.0 / 339200.0;
const E6: f64 = 22.0 / 525.0;
const E7: f64 = -1.0 / 40.0;

/// Adaptive Dormand–Prince 5(4) integrator. See the module docs.
pub struct DormandPrince {
    /// Relative tolerance.
    pub rtol: f64,
    /// Absolute tolerance.
    pub atol: f64,
    /// Smallest allowed step; a rejection that would shrink h below it is a failure.
    pub h_min: f64,
    /// Largest allowed step; h is clamped to it.
    pub h_max: f64,
    /// Smallest factor by which h may shrink in one step (default 0.2).
    pub fac_min: f64,
    /// Largest factor by which h may grow in one step (default 5).
    pub fac_max: f64,
    /// Safety factor in the step-size formula (default 0.9).
    pub safety: f64,

    k1: Vec<f64>,
    k2: Vec<f64>,
    k3: Vec<f64>,
    k4: Vec<f64>,
    k5: Vec<f64>,
    k6: Vec<f64>,
    k7: Vec<f64>,
    tmp: Vec<f64>,
    y_new: Vec<f64>,
    err: Vec<f64>,
    /// State and time for which `k1` holds f(t, y); `fsal_valid` says whether it is usable.
    y_last: Vec<f64>,
    t_last: f64,
    fsal_valid: bool,

    last_rejected: bool,
    failure: Option<DopriError>,
    n_accepted: u64,
    n_rejected: u64,
    n_evals: u64,
}

impl DormandPrince {
    /// An integrator for a system of `dim` variables. `h_min` defaults to 0 (only a step too
    /// small to move `t` fails) and `h_max` to infinity.
    pub fn new(dim: usize, rtol: f64, atol: f64) -> Self {
        let v = || vec![0.0; dim];
        Self {
            rtol,
            atol,
            h_min: 0.0,
            h_max: f64::INFINITY,
            fac_min: 0.2,
            fac_max: 5.0,
            safety: 0.9,
            k1: v(),
            k2: v(),
            k3: v(),
            k4: v(),
            k5: v(),
            k6: v(),
            k7: v(),
            tmp: v(),
            y_new: v(),
            err: v(),
            y_last: v(),
            t_last: 0.0,
            fsal_valid: false,
            last_rejected: false,
            failure: None,
            n_accepted: 0,
            n_rejected: 0,
            n_evals: 0,
        }
    }

    /// Number of accepted steps since construction or the last [`reset_stats`](Self::reset_stats).
    pub fn accepted(&self) -> u64 {
        self.n_accepted
    }
    /// Number of rejected steps.
    pub fn rejected(&self) -> u64 {
        self.n_rejected
    }
    /// Number of derivative evaluations.
    pub fn evals(&self) -> u64 {
        self.n_evals
    }
    /// Zero the three counters.
    pub fn reset_stats(&mut self) {
        self.n_accepted = 0;
        self.n_rejected = 0;
        self.n_evals = 0;
    }
    /// The failure from the most recent `try_step` / `integrate_to` call, if it failed.
    pub fn failure(&self) -> Option<DopriError> {
        self.failure
    }
    /// Forget the cached first stage (call after changing the system's parameters).
    pub fn invalidate(&mut self) {
        self.fsal_valid = false;
    }

    /// One attempt to advance from `*t` by `*h`. Returns whether the step was accepted.
    ///
    /// On acceptance `t` and `y` advance and `h` becomes the suggested next step. On rejection
    /// `t` and `y` are untouched and `h` is the smaller step to retry with. If `h` falls below
    /// `h_min`, the attempt returns `false` and [`failure`](Self::failure) reports why.
    pub fn try_step<S: System>(
        &mut self,
        sys: &S,
        t: &mut f64,
        y: &mut [f64],
        h: &mut f64,
    ) -> bool {
        self.core(sys, t, y, h, None)
    }

    /// Integrate from `*t` to `t_end` (forward in time), landing on it exactly: the last step is
    /// shortened and `t` is set to `t_end` bit for bit. `h` carries the step size across calls.
    /// Fails with [`DopriError`] if the step size collapses; `t` and `y` then hold the last
    /// accepted state.
    pub fn integrate_to<S: System>(
        &mut self,
        sys: &S,
        t: &mut f64,
        y: &mut [f64],
        t_end: f64,
        h: &mut f64,
    ) -> Result<(), DopriError> {
        self.failure = None;
        while *t < t_end {
            if !self.core(sys, t, y, h, Some(t_end))
                && let Some(e) = self.failure
            {
                return Err(e);
            }
        }
        Ok(())
    }

    fn core<S: System>(
        &mut self,
        sys: &S,
        t: &mut f64,
        y: &mut [f64],
        h: &mut f64,
        t_end: Option<f64>,
    ) -> bool {
        self.failure = None;
        let h_orig = (*h).min(self.h_max);
        if !(h_orig > 0.0 && h_orig.is_finite()) {
            self.failure = Some(DopriError::InvalidStep { h: *h });
            return false;
        }
        let mut hh = h_orig;
        let mut landing = false;
        if let Some(te) = t_end
            && te - *t <= 1.01 * hh
        {
            hh = te - *t;
            landing = true;
        }
        if *t + hh == *t {
            self.failure = Some(DopriError::StepTooSmall { t: *t, h: hh });
            return false;
        }

        let norm = self.attempt(sys, *t, y, hh);
        let exponent_factor = if norm > 0.0 {
            self.safety * norm.powf(-0.2)
        } else {
            f64::INFINITY
        };

        if norm <= 1.0 {
            // Accept: commit the 5th-order solution and keep the last stage for FSAL.
            y.copy_from_slice(&self.y_new);
            *t = if landing {
                t_end.unwrap_or(*t + hh)
            } else {
                *t + hh
            };
            std::mem::swap(&mut self.k1, &mut self.k7);
            self.y_last.copy_from_slice(y);
            self.t_last = *t;
            self.fsal_valid = true;
            self.n_accepted += 1;

            let mut factor = exponent_factor.clamp(self.fac_min, self.fac_max);
            if self.last_rejected {
                factor = factor.min(1.0);
            }
            let mut next = (hh * factor).min(self.h_max);
            if landing {
                // The last step was shortened to hit t_end; don't let that shrink the next one.
                next = next.max(h_orig);
            }
            *h = next;
            self.last_rejected = false;
            true
        } else {
            // Reject: shrink (a non-finite norm shrinks as far as allowed).
            let factor = if norm.is_finite() {
                exponent_factor.clamp(self.fac_min, 1.0)
            } else {
                self.fac_min
            };
            *h = hh * factor;
            self.n_rejected += 1;
            self.last_rejected = true;
            if *h < self.h_min {
                self.failure = Some(DopriError::StepTooSmall { t: *t, h: *h });
            }
            false
        }
    }

    /// Compute the 5th-order solution into `y_new` and return the error norm. `y` is untouched.
    fn attempt<S: System>(&mut self, sys: &S, t: f64, y: &[f64], h: f64) -> f64 {
        let n = y.len();

        let reuse = self.fsal_valid && self.t_last == t && self.y_last.as_slice() == y;
        if !reuse {
            sys.deriv(t, y, &mut self.k1);
            self.n_evals += 1;
        }

        for i in 0..n {
            self.tmp[i] = y[i] + h * A21 * self.k1[i];
        }
        sys.deriv(t + C2 * h, &self.tmp, &mut self.k2);
        for i in 0..n {
            self.tmp[i] = y[i] + h * (A31 * self.k1[i] + A32 * self.k2[i]);
        }
        sys.deriv(t + C3 * h, &self.tmp, &mut self.k3);
        for i in 0..n {
            self.tmp[i] = y[i] + h * (A41 * self.k1[i] + A42 * self.k2[i] + A43 * self.k3[i]);
        }
        sys.deriv(t + C4 * h, &self.tmp, &mut self.k4);
        for i in 0..n {
            self.tmp[i] = y[i]
                + h * (A51 * self.k1[i] + A52 * self.k2[i] + A53 * self.k3[i] + A54 * self.k4[i]);
        }
        sys.deriv(t + C5 * h, &self.tmp, &mut self.k5);
        for i in 0..n {
            self.tmp[i] = y[i]
                + h * (A61 * self.k1[i]
                    + A62 * self.k2[i]
                    + A63 * self.k3[i]
                    + A64 * self.k4[i]
                    + A65 * self.k5[i]);
        }
        sys.deriv(t + h, &self.tmp, &mut self.k6);
        for i in 0..n {
            self.y_new[i] = y[i]
                + h * (B1 * self.k1[i]
                    + B3 * self.k3[i]
                    + B4 * self.k4[i]
                    + B5 * self.k5[i]
                    + B6 * self.k6[i]);
        }
        sys.deriv(t + h, &self.y_new, &mut self.k7);
        self.n_evals += 6;

        let mut sum = 0.0;
        for i in 0..n {
            self.err[i] = h
                * (E1 * self.k1[i]
                    + E3 * self.k3[i]
                    + E4 * self.k4[i]
                    + E5 * self.k5[i]
                    + E6 * self.k6[i]
                    + E7 * self.k7[i]);
            let scale = self.atol + self.rtol * y[i].abs().max(self.y_new[i].abs());
            let r = self.err[i] / scale;
            sum += r * r;
        }
        (sum / n.max(1) as f64).sqrt()
    }
}

#[cfg(test)]
mod tests {
    //! Validation tests (docs/VALIDATION.md, "Adaptive Dormand–Prince 5(4)").

    use super::*;
    use crate::analytic::exp_decay;
    use crate::kepler::{Kepler, KeplerOrbit, X, Y};

    struct Decay;
    impl System for Decay {
        fn dim(&self) -> usize {
            1
        }
        fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
            dy[0] = -y[0];
        }
    }

    /// x'' = −x as a first-order system [x, v]; exact solution x = cos t, v = −sin t.
    struct Sho;
    impl System for Sho {
        fn dim(&self) -> usize {
            2
        }
        fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
            dy[0] = y[1];
            dy[1] = -y[0];
        }
    }

    fn decay_error(tol: f64, t_end: f64) -> f64 {
        let mut dp = DormandPrince::new(1, tol, tol);
        let (mut t, mut y, mut h) = (0.0, [1.0], 0.01);
        dp.integrate_to(&Decay, &mut t, &mut y, t_end, &mut h)
            .unwrap();
        (y[0] - exp_decay(1.0, 1.0, t_end)).abs()
    }

    fn sho_error(tol: f64, t_end: f64) -> f64 {
        let mut dp = DormandPrince::new(2, tol, tol);
        let (mut t, mut y, mut h) = (0.0, [1.0, 0.0], 0.01);
        dp.integrate_to(&Sho, &mut t, &mut y, t_end, &mut h)
            .unwrap();
        (y[0] - t_end.cos()).hypot(y[1] + t_end.sin())
    }

    #[test]
    fn decay_and_oscillator_match_the_exact_solution_at_1e_10() {
        let e_decay = decay_error(1e-10, 10.0);
        assert!(e_decay < 1e-8, "decay global error {e_decay:e}");
        let e_sho = sho_error(1e-10, 20.0);
        assert!(e_sho < 1e-8, "oscillator global error {e_sho:e}");
        println!("decay {e_decay:e}, oscillator {e_sho:e}");
    }

    #[test]
    fn error_falls_with_the_tolerance() {
        for (name, f) in [
            ("decay", decay_error as fn(f64, f64) -> f64),
            ("oscillator", sho_error as fn(f64, f64) -> f64),
        ] {
            let e: Vec<f64> = [1e-6, 1e-8, 1e-10]
                .iter()
                .map(|&tol| f(tol, 10.0))
                .collect();
            println!("{name}: errors {e:?}");
            for w in e.windows(2) {
                // One decade-pair (two decades of rtol): between 1 and 4 decades of error.
                let decades = (w[0] / w[1]).log10();
                assert!(
                    (1.0..=4.0).contains(&decades),
                    "{name}: error fell by {decades} decades for 2 decades of rtol ({e:?})"
                );
            }
        }
    }

    #[test]
    fn fixed_step_mode_is_fifth_order() {
        // fac_min = fac_max = 1 and a huge tolerance: every step is accepted at constant h.
        let err = |h0: f64, t_end: f64| {
            let mut dp = DormandPrince::new(2, 1e30, 1e30);
            dp.fac_min = 1.0;
            dp.fac_max = 1.0;
            let (mut t, mut y, mut h) = (0.0, [1.0, 0.0], h0);
            let n = (t_end / h0).round() as usize;
            for _ in 0..n {
                assert!(dp.try_step(&Sho, &mut t, &mut y, &mut h));
                assert_eq!(h, h0);
            }
            assert_eq!(dp.rejected(), 0);
            (y[0] - t.cos()).hypot(y[1] + t.sin())
        };
        let (e1, e2, e3) = (err(0.4, 4.0), err(0.2, 4.0), err(0.1, 4.0));
        let (r1, r2) = (e1 / e2, e2 / e3);
        println!("fixed-step errors {e1:e} {e2:e} {e3:e}; ratios {r1:.2} {r2:.2}");
        for r in [r1, r2] {
            assert!((25.0..=40.0).contains(&r), "ratio {r}");
        }
    }

    /// A Kepler orbit with e = 0.9 starting at periapsis (r = 1, a = 10).
    fn eccentric() -> (KeplerOrbit, Kepler, [f64; 4]) {
        let ratio = 1.9_f64.sqrt();
        let orbit = KeplerOrbit::new(1.0, 1.0, ratio);
        assert!((orbit.e - 0.9).abs() < 1e-12);
        let s = orbit.state(0.0);
        (orbit, Kepler { mu: 1.0 }, [s.x, s.y, s.vx, s.vy])
    }

    #[test]
    fn kepler_e09_conserves_invariants_and_closes_over_ten_periods() {
        let (orbit, sys, y0) = eccentric();
        let (e0, l0) = (sys.energy(&y0), sys.angular_momentum(&y0));
        let mut dp = DormandPrince::new(4, 1e-12, 1e-12);
        let (mut t, mut y, mut h) = (0.0, y0, 1e-3);
        let period = orbit.period();
        let (mut worst_close, mut worst_e, mut worst_l) = (0.0_f64, 0.0_f64, 0.0_f64);
        for k in 1..=10 {
            dp.integrate_to(&sys, &mut t, &mut y, k as f64 * period, &mut h)
                .unwrap();
            worst_close = worst_close.max((y[X] - y0[X]).hypot(y[Y] - y0[Y]) / orbit.a);
            worst_e = worst_e.max(((sys.energy(&y) - e0) / e0).abs());
            worst_l = worst_l.max(((sys.angular_momentum(&y) - l0) / l0).abs());
        }
        println!(
            "e=0.9, 10 periods: closure {worst_close:e} a, dE/E {worst_e:e}, dL/L {worst_l:e}, \
             accepted {} rejected {} evals {}",
            dp.accepted(),
            dp.rejected(),
            dp.evals()
        );
        assert!(worst_e < 1e-9, "energy error {worst_e:e}");
        assert!(worst_l < 1e-9, "angular momentum error {worst_l:e}");
        assert!(worst_close < 1e-6, "orbit closure {worst_close:e} a");
    }

    #[test]
    fn steps_are_much_smaller_near_pericentre() {
        let (orbit, sys, y0) = eccentric();
        let mut dp = DormandPrince::new(4, 1e-10, 1e-10);
        let (mut t, mut y, mut h) = (0.0, y0, 1e-3);
        let t_end = 2.0 * orbit.period();
        let (mut peri, mut apo) = ((0.0, 0), (0.0, 0));
        while t < t_end {
            let (h_used, r) = (h, y[X].hypot(y[Y]));
            if dp.try_step(&sys, &mut t, &mut y, &mut h) {
                if r < 3.0 * orbit.periapsis() {
                    peri = (peri.0 + h_used, peri.1 + 1);
                } else if r > 0.8 * orbit.apoapsis() {
                    apo = (apo.0 + h_used, apo.1 + 1);
                }
            }
            assert!(dp.failure().is_none());
        }
        assert!(peri.1 > 0 && apo.1 > 0);
        let (mean_peri, mean_apo) = (peri.0 / peri.1 as f64, apo.0 / apo.1 as f64);
        println!(
            "mean h: pericentre {mean_peri:e}, apocentre {mean_apo:e}, ratio {:.1}",
            mean_apo / mean_peri
        );
        assert!(mean_apo >= 10.0 * mean_peri, "{mean_apo} vs {mean_peri}");
    }

    #[test]
    fn integrate_to_lands_exactly_on_t_end() {
        for t_end in [1.0, std::f64::consts::PI, 7.123456789, 1e-3] {
            let mut dp = DormandPrince::new(2, 1e-8, 1e-8);
            let (mut t, mut y, mut h) = (0.0, [1.0, 0.0], 0.3);
            dp.integrate_to(&Sho, &mut t, &mut y, t_end, &mut h)
                .unwrap();
            assert_eq!(t.to_bits(), t_end.to_bits(), "t_end {t_end}");
            assert!((y[0] - t_end.cos()).abs() < 1e-6);
        }
        // Chained calls also land exactly, and the step size carries over.
        let mut dp = DormandPrince::new(2, 1e-8, 1e-8);
        let (mut t, mut y, mut h) = (0.0, [1.0, 0.0], 0.3);
        for k in 1..=20 {
            let t_end = k as f64 * 0.37;
            dp.integrate_to(&Sho, &mut t, &mut y, t_end, &mut h)
                .unwrap();
            assert_eq!(t.to_bits(), t_end.to_bits());
        }
    }

    #[test]
    fn an_accepted_step_costs_six_evaluations() {
        let mut dp = DormandPrince::new(2, 1e-6, 1e-6);
        let (mut t, mut y, mut h) = (0.0, [1.0, 0.0], 1e-2);
        let mut steps = 0;
        // First accepted step needs the extra initial evaluation; afterwards FSAL saves it.
        while steps < 50 {
            if dp.try_step(&Sho, &mut t, &mut y, &mut h) {
                steps += 1;
            }
        }
        assert_eq!(dp.evals(), 6 * (dp.accepted() + dp.rejected()) + 1);
    }

    #[test]
    fn a_collapsing_step_is_an_error_not_a_panic() {
        // y' = y², y(0) = 1 blows up at t = 1: the step must shrink without bound.
        struct Blowup;
        impl System for Blowup {
            fn dim(&self) -> usize {
                1
            }
            fn deriv(&self, _t: f64, y: &[f64], dy: &mut [f64]) {
                dy[0] = y[0] * y[0];
            }
        }
        let mut dp = DormandPrince::new(1, 1e-10, 1e-10);
        dp.h_min = 1e-9;
        let (mut t, mut y, mut h) = (0.0, [1.0], 0.1);
        let r = dp.integrate_to(&Blowup, &mut t, &mut y, 2.0, &mut h);
        assert!(matches!(r, Err(DopriError::StepTooSmall { .. })), "{r:?}");
        assert!(t < 1.0);
        let mut dp = DormandPrince::new(1, 1e-10, 1e-10);
        assert!(!dp.try_step(&Decay, &mut 0.0, &mut [1.0], &mut -1.0));
        assert!(matches!(dp.failure(), Some(DopriError::InvalidStep { .. })));
    }
}
