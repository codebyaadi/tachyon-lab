---
title: Projectile motion
summary: A thrown ball is two simple motions at once, steady sideways drift and constant-acceleration up and down, and that gives its height, range and flight time.
level: beginner
minutes: 10
prerequisites: [classical/describing-motion]
sim: /lab/projectile
status: draft
predict:
  type: choice
  prompt: Ball A is dropped from 20 m. At the same moment ball B is thrown horizontally from the same height. With no air resistance, which hits the ground first?
  options: [A (dropped), B (thrown), They land at the same time]
  answer: They land at the same time
  reveal: Sideways motion and falling motion are independent. B's sideways speed does not change how fast it falls, so both balls fall 20 m in the same time, t = √(2h/g) ≈ 2.0 s.
questions:
  - id: q1
    type: numeric
    prompt: A ball is thrown straight up at 12 m/s. How high does it rise? (use g = 9.8 m/s²)
    answer: 7.35
    tolerance: 0.05
    unit: m
    solution: At the top v = 0, so v² = v₀² − 2gh gives h = v₀²/(2g) = 144/19.6 ≈ 7.35 m.
  - id: q2
    type: numeric
    prompt: A ball is launched at 10 m/s at 45° above the horizontal on level ground. How far does it travel? (use g = 9.81 m/s²)
    answer: 10.19
    tolerance: 0.05
    unit: m
    solution: R = v₀² sin 2θ / g = 100 × sin 90° / 9.81 = 100/9.81 ≈ 10.19 m.
  - id: q3
    type: choice
    prompt: At the same speed on level ground, which other launch angle gives the same range as 30°?
    options: [15°, 45°, 60°, 75°]
    answer: 60°
    solution: The range depends on sin 2θ. sin 60° = sin 120°, and 2 × 60° = 120°, so 60° (which is 90° − 30°) matches 30°.
  - id: q4
    type: explain
    prompt: Why does a projectile's horizontal speed stay constant (with no air resistance) while its vertical speed keeps changing?
    model: Gravity pulls only downward, so there is no horizontal force and therefore no horizontal acceleration. The vertical direction has a constant downward acceleration, so the vertical speed changes at a steady rate.
---

## The big picture

A thrown ball follows a curved path, but that curve is just two simple motions happening together: steady drift sideways, and constant-acceleration motion up and down. Splitting a motion into independent parts is one of the most useful tricks in physics. By the end you will be able to find how high, how far and for how long a projectile flies.

## Build the intuition

Imagine filming a ball thrown across a room, once from above and once from the side. From above it just drifts at a steady speed. From the side it rises, slows, stops and falls, like a ball tossed straight up. The real path is both at once, and it is a curve called a **parabola**.

Gravity pulls only downward, so it cannot speed up or slow down the sideways drift. That is why a coin dropped from a table and a coin flicked off the edge hit the floor together.

## The math

Take $x$ horizontal and $y$ upward, and let $g = 9.81\ \text{m/s}^2$ (a positive number, so the acceleration is $-g$). Launch at speed $v_0$ and angle $\theta$ above the horizontal. The starting velocity splits into components:

$$v_{x0} = v_0\cos\theta, \qquad v_{y0} = v_0\sin\theta$$

**Horizontal.** No horizontal force, so $a_x = 0$ and $x = v_{x0}\,t$.

**Vertical.** $a_y = -g$, so using the constant-acceleration equations from the last lesson:

$$v_y = v_{y0} - g t, \qquad y = v_{y0}\,t - \tfrac12 g t^2$$

<details>
<summary>Why does this step follow? We can treat the two directions separately</summary>

Force and acceleration are vectors, and Newton's second law holds for each component on its own. Gravity has no sideways component, so the sideways acceleration is zero. The two directions are linked only through time $t$, which is the same for both.

</details>

Now launch from the ground and land on level ground ($y = 0$ at the end).

**Time in the air.** Set $y = 0$: $t\left(v_{y0} - \tfrac12 g t\right) = 0$, so

$$t_\text{flight} = \frac{2v_{y0}}{g} = \frac{2v_0\sin\theta}{g}$$

**Maximum height.** At the top $v_y = 0$, which happens at $t = v_{y0}/g$. Then

$$H = \frac{v_{y0}^2}{2g} = \frac{v_0^2\sin^2\theta}{2g}$$

**Range.** Sideways speed times flight time: $R = v_0\cos\theta \cdot \dfrac{2v_0\sin\theta}{g}$. Using $2\sin\theta\cos\theta = \sin 2\theta$:

$$R = \frac{v_0^2 \sin 2\theta}{g}$$

The range is largest when $\sin 2\theta = 1$, that is at $\theta = 45^\circ$.

**The shape of the path.** Solve $x = v_{x0}t$ for $t$ and put it into the equation for $y$ to remove time:

$$y = x\tan\theta - \frac{g\,x^2}{2v_0^2\cos^2\theta}$$

This is a straight line, $x\tan\theta$, pulled down by a term that grows as $x^2$. That is the equation of a **parabola**. It is symmetric: the top is exactly halfway along the range, at $x = R/2$, and on level ground the ball comes down at the same angle and the same speed it went up with.

<details>
<summary>Why does θ and 90° − θ give the same range?</summary>

Because $\sin 2\theta = \sin(180^\circ - 2\theta) = \sin\big(2(90^\circ - \theta)\big)$. A steep, high throw and a shallow, flat throw cover the same distance; the steep one just stays up longer.

</details>

## Worked example

A ball is kicked at $v_0 = 20\ \text{m/s}$ at $\theta = 30^\circ$ on level ground. Components: $v_{x0} = 20\cos 30^\circ = 17.32\ \text{m/s}$ and $v_{y0} = 20\sin 30^\circ = 10\ \text{m/s}$.

- Time in the air: $t = 2(10)/9.81 = 2.04\ \text{s}$
- Maximum height: $H = 10^2/(2 \times 9.81) = 5.10\ \text{m}$
- Range: $R = 17.32 \times 2.04 = 35.3\ \text{m}$

**Check with the range formula:** $R = 20^2\sin 60^\circ / 9.81 = 400 \times 0.8660 / 9.81 = 35.3\ \text{m}$. Both routes agree.

## Try one yourself

A ball is kicked at $15\ \text{m/s}$ at $40^\circ$ on level ground ($g = 9.81\ \text{m/s}^2$). Find the time in the air and the range.

- $v_{y0} = 15\sin 40^\circ = \_\_\_\ \text{m/s}$, so $t = 2v_{y0}/g = \_\_\_\ \text{s}$
- $v_{x0} = 15\cos 40^\circ = \_\_\_\ \text{m/s}$, so $R = v_{x0}\,t = \_\_\_\ \text{m}$

<details>
<summary>Answer and full solution</summary>

$v_{y0} = 15 \times 0.6428 = 9.64\ \text{m/s}$, so $t = 2 \times 9.64 / 9.81 = 1.97\ \text{s}$.

$v_{x0} = 15 \times 0.7660 = 11.49\ \text{m/s}$, so $R = 11.49 \times 1.97 = 22.6\ \text{m}$.

Check with the formula: $R = 15^2 \sin 80^\circ / 9.81 = 225 \times 0.9848 / 9.81 = 22.6\ \text{m}$.

</details>

## Common mistakes

- **"Heavier things fall faster."** With no air, every object has the same downward acceleration $g$, so mass does not matter.
- **Swapping sine and cosine.** Sine goes with the vertical component when $\theta$ is measured from the horizontal.
- **Using $R = v_0^2\sin 2\theta/g$ when the ball lands at a different height.** That formula needs level ground. Otherwise solve $y(t) = 0$, a quadratic. For example, a launch from 2 m above the ground at 30 m/s sideways and 40 m/s upward stays up 8.20 s and travels 246 m (see the lab notebook, entry 01); the best angle is also a little under $45^\circ$.
- **Believing the acceleration is zero at the top.** It is $g$ downward all the way.
- **Forgetting air.** Real balls land short of these predictions. The drag lesson explains by how much.

## Where this shows up in the lab

Open the projectile lab and try the worked example: speed 20 m/s, angle 30°, no drag. Before you press Launch, type your predicted landing distance (35.3 m) in the Predict box, then compare. Next, turn on a little air drag and watch the ball fall short, and switch the integrator to Euler with a large time step to see a numerical method land in the wrong place. Continue with **Newton's laws** once it is written.
