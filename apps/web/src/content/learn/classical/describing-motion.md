---
title: Describing motion
summary: Position, velocity and acceleration, and the three equations for motion with constant acceleration.
level: beginner
minutes: 9
prerequisites: [classical/units-and-dimensions, classical/calculus-for-physics]
status: draft
predict:
  type: choice
  prompt: A ball is thrown straight up. At the very top of its flight, what is its acceleration?
  options: [Zero, 9.8 m/s² downward, 9.8 m/s² upward]
  answer: 9.8 m/s² downward
  reveal: At the top the velocity is momentarily zero, but it is still changing, from upward to downward. A changing velocity means a non-zero acceleration. Gravity pulls down the whole time, so the acceleration is 9.8 m/s² downward at every moment of the flight, including the top.
questions:
  - id: q1
    type: numeric
    prompt: A car travelling at 20 m/s brakes steadily at 5 m/s². How far does it travel before it stops?
    answer: 40
    tolerance: 0.5
    unit: m
    solution: Use v² = v₀² + 2a(x − x₀) with v = 0, v₀ = 20 m/s and a = −5 m/s². Then 0 = 400 − 10·Δx, so Δx = 40 m. Check with the average velocity, 10 m/s, over the 4 s it takes to stop (t = 20/5), which also gives 40 m.
  - id: q2
    type: numeric
    prompt: A cyclist speeds up from 2 m/s to 8 m/s in 3 s at a steady rate. What is the acceleration?
    answer: 2
    tolerance: 0.05
    unit: m/s²
    solution: a = (v − v₀)/t = (8 − 2)/3 = 2 m/s².
  - id: q3
    type: choice
    prompt: An object's velocity is zero for one instant. Must its acceleration also be zero then?
    options: [Yes, No]
    answer: "No"
    solution: Not necessarily. Acceleration is the rate at which velocity is changing, not the velocity itself. A ball at the top of its flight has zero velocity but is still accelerating at 9.8 m/s² downward.
  - id: q4
    type: explain
    prompt: Why can't you use v = v₀ + at when the acceleration keeps changing?
    model: That formula assumes the acceleration is the same throughout, so the velocity changes at one steady rate and you can just multiply by the time. If the acceleration changes, you have to add up many small changes (an integral) instead of doing a single multiplication.
---

## The big picture

Kinematics is the language for describing how something moves: where it is, how fast it is going, and how quickly that speed is changing. It deliberately ignores _why_ it moves. Every later lesson, from projectiles to planets, is written in these three ideas. By the end you will be able to read a motion graph and solve problems with constant acceleration.

## Build the intuition

Picture a car trip. The **odometer** tells you how far you have gone: that is **position**. The **speedometer** tells you how fast you are going, and with a direction attached it is **velocity**. When you press the pedal or the brake, the speedometer needle moves: that change is **acceleration**.

On a graph of position against time, velocity is the **steepness** of the line: a steep line means fast, a flat line means standing still. On a graph of velocity against time, acceleration is the steepness. Braking is acceleration too. It just points opposite to the direction you are moving.

## The math

Measure position $x$ (in metres, m) along a straight line, and time $t$ (in seconds, s).

- **Velocity** is the rate of change of position: $v = \dfrac{dx}{dt}$, in m/s. Over a short time $\Delta t$ it is $\Delta x / \Delta t$; the derivative is what that becomes as $\Delta t$ shrinks to zero.
- **Acceleration** is the rate of change of velocity: $a = \dfrac{dv}{dt}$, in m/s².

Now suppose the acceleration $a$ is **constant**, with starting position $x_0$ and starting velocity $v_0$. Three equations follow.

**1. Velocity.** A constant rate of change means $a = \dfrac{v - v_0}{t}$, so

$$v = v_0 + at$$

**2. Position.** The velocity rises steadily from $v_0$ to $v$, so the average velocity is $\tfrac12(v_0 + v)$. Distance is average velocity times time:

$$x - x_0 = \tfrac12 (v_0 + v)\,t$$

Substituting $v = v_0 + at$ gives

$$x - x_0 = v_0 t + \tfrac12 a t^2$$

**3. No time.** From equation 1, $t = (v - v_0)/a$. Put that into $x - x_0 = \tfrac12 (v_0 + v)\,t$:

$$x - x_0 = \frac{(v_0 + v)(v - v_0)}{2a} = \frac{v^2 - v_0^2}{2a} \quad\Longrightarrow\quad v^2 = v_0^2 + 2a\,(x - x_0)$$

<details>
<summary>Why does this step follow? The average velocity is just (v₀ + v)/2</summary>

Because the acceleration is constant, a velocity–time graph is a straight line. The average height of a straight line is the midpoint of its two ends. This shortcut works **only** for constant acceleration; if the acceleration changed, the graph would curve and the midpoint would no longer be the average.

</details>

The signs matter: choose which direction is positive, and then $v$ and $a$ can be negative. Slowing down simply means $a$ points opposite to $v$.

## Worked example

A car moving at $20\ \text{m/s}$ brakes steadily at $5\ \text{m/s}^2$, so $a = -5\ \text{m/s}^2$. How long does it take to stop, and how far does it go?

**Time.** Set $v = 0$ in $v = v_0 + at$: $0 = 20 - 5t$, so $t = 4\ \text{s}$.

**Distance.** Use $x - x_0 = v_0 t + \tfrac12 a t^2 = 20(4) + \tfrac12(-5)(4^2) = 80 - 40 = 40\ \text{m}$.

**Check a second way.** The speed falls evenly from 20 to 0, so the average is $10\ \text{m/s}$, and $10 \times 4 = 40\ \text{m}$. Equation 3 agrees too: $0 = 20^2 + 2(-5)\,\Delta x$ gives $\Delta x = 40\ \text{m}$.

A useful consequence: start at $40\ \text{m/s}$ instead and equation 3 gives $1600/10 = 160\ \text{m}$. **Double the speed and the stopping distance quadruples.**

## Try one yourself

A scooter moving at $6\ \text{m/s}$ speeds up at $1.5\ \text{m/s}^2$ for $4\ \text{s}$. Fill in the blanks, then open the answer.

- (a) Final speed: $v = v_0 + at = 6 + \_\_\_ = \_\_\_\ \text{m/s}$
- (b) Distance: $x - x_0 = v_0 t + \tfrac12 a t^2 = \_\_\_ + \_\_\_ = \_\_\_\ \text{m}$

<details>
<summary>Answer and full solution</summary>

(a) $v = 6 + 1.5 \times 4 = 12\ \text{m/s}$.

(b) $x - x_0 = 6(4) + \tfrac12(1.5)(4^2) = 24 + 12 = 36\ \text{m}$.

Check: the average speed is $(6 + 12)/2 = 9\ \text{m/s}$, and $9 \times 4 = 36\ \text{m}$.

</details>

## Common mistakes

- **"Zero velocity means zero acceleration."** A ball at the top of its flight has zero velocity but is still accelerating downward.
- **Mixing up speed and velocity.** Speed is just how fast; velocity also has a direction, and its sign matters.
- **Using the three equations when the acceleration changes.** They are only valid for constant acceleration.
- **Forgetting the sign of $a$.** If forward is positive, braking has a negative $a$. The sign depends on the direction you chose, not on "slowing down" alone.
- **Mixing units.** Convert before you calculate: $72\ \text{km/h} = 20\ \text{m/s}$ (divide by 3.6).

## Where this shows up in the lab

Every simulation here moves things forward in tiny time steps, using "new value = old value + rate × time step", which is the same idea as $v = v_0 + at$ applied again and again. You can watch that in the [exponential decay lab](/lab/decay), where the numerical curve is built step by step. A projectile lab, which applies exactly these equations in two directions, is coming next. Continue with **Projectile motion**.
