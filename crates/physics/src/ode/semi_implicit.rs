use super::{Integrator, System};

/// One semi-implicit (symplectic) Euler step for x'' = a(x): update the velocity first,
/// then move the position with the *new* velocity.
///
/// First order like forward Euler, but symplectic: for oscillators the energy error stays
/// bounded instead of growing. `a` is scratch space for the acceleration.
pub fn semi_implicit_euler_step<F>(
    x: &mut [f64],
    v: &mut [f64],
    a: &mut [f64],
    dt: f64,
    mut accel: F,
) where
    F: FnMut(&[f64], &mut [f64]),
{
    accel(x, a);
    for i in 0..x.len() {
        v[i] += dt * a[i];
        x[i] += dt * v[i];
    }
}

/// Semi-implicit Euler as an [`Integrator`], for second-order systems whose state is laid
/// out as `[q₀ … qₙ₋₁, v₀ … vₙ₋₁]` (positions first, then velocities).
///
/// Unlike [`semi_implicit_euler_step`], the acceleration may depend on velocity (drag), because
/// it is evaluated from the full state: v ← v + dt·a(q, v), then q ← q + dt·v (new v).
pub struct SemiImplicitEuler {
    k: Vec<f64>,
}

impl SemiImplicitEuler {
    /// `dim` is the full state length and must be even (n positions + n velocities).
    pub fn new(dim: usize) -> Self {
        assert!(
            dim.is_multiple_of(2),
            "state must be [positions, velocities]"
        );
        Self { k: vec![0.0; dim] }
    }
}

impl Integrator for SemiImplicitEuler {
    fn step<S: System>(&mut self, sys: &S, t: f64, y: &mut [f64], dt: f64) {
        let n = y.len() / 2;
        sys.deriv(t, y, &mut self.k);
        for i in 0..n {
            y[n + i] += dt * self.k[n + i];
        }
        for i in 0..n {
            y[i] += dt * y[n + i];
        }
    }
}
