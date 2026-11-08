/// One velocity-Verlet step for x'' = a(x). Symplectic: energy error stays
/// bounded instead of drifting.
///
/// `a` holds a(x) on entry and is updated to a(x_new) on exit, so each step
/// costs one force evaluation.
pub fn velocity_verlet_step<F>(x: &mut [f64], v: &mut [f64], a: &mut [f64], dt: f64, mut accel: F)
where
    F: FnMut(&[f64], &mut [f64]),
{
    let n = x.len();
    for i in 0..n {
        v[i] += 0.5 * dt * a[i];
        x[i] += dt * v[i];
    }
    accel(x, a);
    for i in 0..n {
        v[i] += 0.5 * dt * a[i];
    }
}
