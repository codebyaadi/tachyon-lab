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
