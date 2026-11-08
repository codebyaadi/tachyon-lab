//! Tachyon Lab physics core.
//!
//! Pure Rust with no UI or WebAssembly dependencies, so every routine can be
//! tested natively with `cargo test`. The `physics-wasm` crate wraps it for the browser.

// Index loops mirror the math (y[i] + h·k[i]) and keep multi-array kernels readable.
#![allow(clippy::needless_range_loop)]

pub mod analytic;
pub mod ode;
pub mod projectile;
