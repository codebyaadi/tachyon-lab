//! Browser bindings. Each simulation is a struct that owns its state and
//! history buffers; JavaScript reads the buffers directly through views on
//! WebAssembly memory (`*_ptr` + `len`), so nothing is copied per frame.

mod decay;
mod oscillator;
mod projectile;

pub use decay::DecaySim;
pub use oscillator::OscillatorSim;
pub use projectile::ProjectileSim;
