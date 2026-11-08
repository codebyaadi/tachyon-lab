use super::{Integrator, System};

/// Classic 4th-order Runge–Kutta. Global error O(dt⁴); not symplectic.
pub struct Rk4 {
    k1: Vec<f64>,
    k2: Vec<f64>,
    k3: Vec<f64>,
    k4: Vec<f64>,
    tmp: Vec<f64>,
}

impl Rk4 {
    pub fn new(dim: usize) -> Self {
        Self {
            k1: vec![0.0; dim],
            k2: vec![0.0; dim],
            k3: vec![0.0; dim],
            k4: vec![0.0; dim],
            tmp: vec![0.0; dim],
        }
    }
}

impl Integrator for Rk4 {
    fn step<S: System>(&mut self, sys: &S, t: f64, y: &mut [f64], dt: f64) {
        let n = y.len();
        let h2 = 0.5 * dt;

        sys.deriv(t, y, &mut self.k1);
        for i in 0..n {
            self.tmp[i] = y[i] + h2 * self.k1[i];
        }
        sys.deriv(t + h2, &self.tmp, &mut self.k2);
        for i in 0..n {
            self.tmp[i] = y[i] + h2 * self.k2[i];
        }
        sys.deriv(t + h2, &self.tmp, &mut self.k3);
        for i in 0..n {
            self.tmp[i] = y[i] + dt * self.k3[i];
        }
        sys.deriv(t + dt, &self.tmp, &mut self.k4);

        let h6 = dt / 6.0;
        for i in 0..n {
            y[i] += h6 * (self.k1[i] + 2.0 * self.k2[i] + 2.0 * self.k3[i] + self.k4[i]);
        }
    }
}
