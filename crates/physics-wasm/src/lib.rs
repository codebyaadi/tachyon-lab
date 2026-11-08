//! Browser bindings. Each simulation is a struct that owns its state and
//! history buffers; JavaScript reads the buffers directly through views on
//! WebAssembly memory (`*_ptr` + `len`), so nothing is copied per frame.

mod decay;
mod orbit;
mod oscillator;
mod pendulum;
mod projectile;

pub use decay::DecaySim;
pub use orbit::OrbitSim;
pub use oscillator::OscillatorSim;
pub use pendulum::PendulumSim;
pub use projectile::ProjectileSim;
