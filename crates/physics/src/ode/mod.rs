//! ODE integrators.
//!
//! A first-order system dy/dt = f(t, y) implements [`System`]. Integrators own
//! their scratch buffers so stepping never allocates (important at 60 fps).

mod euler;
mod rk4;
mod semi_implicit;
mod verlet;

pub use euler::Euler;
pub use rk4::Rk4;
pub use semi_implicit::semi_implicit_euler_step;
pub use verlet::velocity_verlet_step;

/// A first-order ODE system dy/dt = f(t, y).
pub trait System {
    /// Number of state variables.
    fn dim(&self) -> usize;
    /// Write f(t, y) into `dy`.
    fn deriv(&self, t: f64, y: &[f64], dy: &mut [f64]);
}

/// Common interface so the UI can switch integrators at runtime.
pub trait Integrator {
    /// Advance `y` from `t` to `t + dt` in place.
    fn step<S: System>(&mut self, sys: &S, t: f64, y: &mut [f64], dt: f64);
}

#[cfg(test)]
mod tests;
