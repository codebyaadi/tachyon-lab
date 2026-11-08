use super::{Integrator, System};

/// Forward Euler: y ← y + dt·f(t, y). First order; included to *see* its error.
pub struct Euler {
    k: Vec<f64>,
}

impl Euler {
    pub fn new(dim: usize) -> Self {
        Self { k: vec![0.0; dim] }
    }
}

impl Integrator for Euler {
    fn step<S: System>(&mut self, sys: &S, t: f64, y: &mut [f64], dt: f64) {
        sys.deriv(t, y, &mut self.k);
        for (yi, ki) in y.iter_mut().zip(&self.k) {
            *yi += dt * ki;
        }
    }
}
