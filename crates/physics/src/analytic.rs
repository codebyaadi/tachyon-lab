//! Closed-form solutions used by tests and by the theory overlays in the UI.

/// Exponential decay: y(t) = y0 · e^(−λt), the solution of dy/dt = −λy.
pub fn exp_decay(y0: f64, lambda: f64, t: f64) -> f64 {
    y0 * (-lambda * t).exp()
}

/// Simple harmonic oscillator: x(t) = x0 cos ωt + (v0/ω) sin ωt.
pub fn sho_position(x0: f64, v0: f64, omega: f64, t: f64) -> f64 {
    x0 * (omega * t).cos() + v0 / omega * (omega * t).sin()
}

/// Position and velocity of a point mass in the vertical plane (x horizontal, y up).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct State2 {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
}

/// Projectile with no drag: x = x0 + vx0·t, y = y0 + vy0·t − ½gt². `g` is positive (downward).
pub fn projectile_no_drag(s0: State2, g: f64, t: f64) -> State2 {
    State2 {
        x: s0.x + s0.vx * t,
        y: s0.y + s0.vy * t - 0.5 * g * t * t,
        vx: s0.vx,
        vy: s0.vy - g * t,
    }
}

/// Projectile with linear drag a = −k·v (k = b/m, units 1/time).
///
/// vx = vx0·e^(−kt), vy = (vy0 + g/k)·e^(−kt) − g/k, with positions from integrating those.
/// Falls back to the drag-free solution when k is negligible.
pub fn projectile_linear_drag(s0: State2, g: f64, k: f64, t: f64) -> State2 {
    if k < 1e-9 {
        return projectile_no_drag(s0, g, t);
    }
    let e = (-k * t).exp();
    // 1 − e^(−kt), accurate for small kt.
    let decay = -(-k * t).exp_m1();
    let w = s0.vy + g / k;
    State2 {
        x: s0.x + s0.vx / k * decay,
        y: s0.y + w / k * decay - g * t / k,
        vx: s0.vx * e,
        vy: w * e - g / k,
    }
}

/// Time at which a drag-free projectile launched from height `y0` with vertical speed `vy0`
/// returns to y = 0 (the positive root of y0 + vy0·t − ½gt² = 0).
pub fn landing_time_no_drag(y0: f64, vy0: f64, g: f64) -> f64 {
    (vy0 + (vy0 * vy0 + 2.0 * g * y0).sqrt()) / g
}

/// Terminal speed under quadratic drag a = −c·|v|·v: falling speed where drag balances gravity.
pub fn terminal_speed_quadratic(g: f64, c: f64) -> f64 {
    (g / c).sqrt()
}

/// Time at which a projectile with linear drag (a = −k·v) returns to y = 0, found by
/// bisection on the closed-form height (there is no elementary formula; it needs the Lambert W
/// function). Assumes the launch height is ≥ 0. Returns 0 if it starts on the ground moving down.
pub fn landing_time_linear_drag(s0: State2, g: f64, k: f64) -> f64 {
    if k < 1e-9 {
        return landing_time_no_drag(s0.y, s0.vy, g);
    }
    if s0.y <= 0.0 && s0.vy <= 0.0 {
        return 0.0;
    }
    let height = |t: f64| projectile_linear_drag(s0, g, k, t).y;
    // The highest point is where vy = 0; after it, y only decreases.
    let t_apex = if s0.vy > 0.0 {
        (1.0 + k * s0.vy / g).ln() / k
    } else {
        0.0
    };
    let mut hi = t_apex + 1.0;
    for _ in 0..200 {
        if height(hi) <= 0.0 {
            break;
        }
        hi *= 2.0;
    }
    let mut lo = t_apex;
    for _ in 0..200 {
        let mid = 0.5 * (lo + hi);
        if height(mid) > 0.0 {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    0.5 * (lo + hi)
}
