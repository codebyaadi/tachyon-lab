//! Browser bindings. Each simulation is a struct that owns its state and
//! history buffers; JavaScript reads the buffers directly through views on
//! WebAssembly memory (`*_ptr` + `len`), so nothing is copied per frame.

mod coupled;
mod decay;
mod orbit;
mod oscillator;
mod pendulum;
mod projectile;
mod qubit;

pub use coupled::CoupledSim;
pub use decay::DecaySim;
pub use orbit::OrbitSim;
pub use oscillator::OscillatorSim;
pub use pendulum::PendulumSim;
pub use projectile::ProjectileSim;
pub use qubit::QubitSim;
