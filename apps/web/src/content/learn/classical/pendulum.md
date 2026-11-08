---
title: The pendulum and nonlinear oscillations
summary: A pendulum is only a simple harmonic oscillator for small swings. Big swings take longer, and a hard enough push turns swinging into spinning.
level: beginner
minutes: 14
prerequisites: [classical/simple-harmonic-motion, classical/damped-oscillations]
sim: /lab/pendulum
status: draft
predict:
  type: choice
  prompt: A pendulum swings through 10° and one swing takes 2.00 s. You pull it back to 120° and release it. What is the time of one swing now?
  options: [Shorter than 2 s, About 2 s, Longer than 2.5 s]
  answer: Longer than 2.5 s
  reveal: The pull of gravity along the arc is proportional to sin θ, which is smaller than θ for big angles. The restoring pull is weaker than a spring's would be, so the bob moves more slowly. At 120° the swing takes about 1.37 times as long, roughly 2.75 s.
questions:
  - id: q1
    type: numeric
    prompt: A pendulum is 0.5 m long. Taking g = 9.8 m/s² and a small swing, what is its period?
    answer: 1.42
    tolerance: 0.01
    unit: s
    solution: The period is T₀ = 2π√(L/g) = 2π√(0.5/9.8) = 2π × 0.2259 ≈ 1.42 s.
  - id: q2
    type: numeric
    prompt: How long must a pendulum be to have a small-swing period of 2.00 s? Use g = 9.81 m/s².
    answer: 0.994
    tolerance: 0.005
    unit: m
    solution: Solve T = 2π√(L/g) for L. L = g(T/2π)² = 9.81 × (2/2π)² = 9.81 × 0.1013 ≈ 0.994 m.
  - id: q3
    type: choice
    prompt: A pendulum swings through 170°, almost to the top. How does its period compare with a small swing?
    options: [About the same, About 10% longer, More than twice as long]
    answer: More than twice as long
    solution: Near the top the bob moves very slowly, since gravity there almost balances the string. The exact period at 170° is about 2.4 times the small-swing period.
  - id: q4
    type: explain
    prompt: What decides whether a pendulum swings back and forth or spins all the way round?
    model: It depends on whether the bob has enough energy to reach the top. If the energy at the bottom is less than the energy needed to lift the bob to the top, it turns around and swings. If it is more, it keeps going and spins. The borderline case reaches the top and stops there. In phase space that borderline is the separatrix, the curve between the closed loops and the spinning tracks.
---

## The big picture

The pendulum is the standard example of an oscillator, and also the standard example of where the simple picture stops working. For small swings it is a harmonic oscillator with a period that never changes. For bigger swings the period grows, and past a certain energy the motion is a different kind altogether. By the end you will be able to estimate how much slower a big swing is and say when a pendulum will spin.

## Build the intuition

Gravity pulls the bob down, but only the part along the arc moves it. When the bob hangs straight down, that part is zero. When the string is horizontal it is as large as it gets. When the bob is near the top, gravity almost balances the string, and the part along the arc shrinks again.

A spring keeps pulling harder the further you stretch it. A pendulum does not. So for large angles the restoring pull is weaker than the spring-like estimate, the motion is slower, and the swing takes longer.

## The math

Writing the angle as $\theta$ and using Newton's second law around the pivot:

$$\ddot{\theta} = -\omega_0^2 \sin\theta, \qquad \omega_0 = \sqrt{\frac{g}{L}}$$

For small angles $\sin\theta \approx \theta$, and this is simple harmonic motion with period $T_0 = 2\pi/\omega_0$. For a swing of amplitude $\theta_0$, the exact period is

$$T = T_0\,\frac{2}{\pi}K\!\left(\sin\frac{\theta_0}{2}\right) \approx T_0\left(1 + \frac{\theta_0^2}{16}\right)$$

where $K$ is a standard function (the complete elliptic integral). The approximation works well up to about $60^\circ$. The total energy per unit mass is

$$E = \tfrac12 L^2\dot{\theta}^2 + gL(1-\cos\theta)$$

To reach the top, $\theta = \pi$, from the bottom, the bob needs $\dot{\theta} = 2\omega_0$ there. A launch speed above that makes it spin.

<details>
<summary>Why does this step follow? Why does a launch speed of 2ω₀ just reach the top</summary>

At the bottom $\theta = 0$, so $1 - \cos\theta = 0$ and all the energy is motion: $E = \tfrac12 L^2\dot{\theta}^2$. At the top $1 - \cos\pi = 2$, so reaching it with zero speed needs $E = 2gL$. Setting these equal gives $\dot{\theta}^2 = 4g/L = 4\omega_0^2$, so $\dot{\theta} = 2\omega_0$.

</details>

## Worked example

Take a pendulum with $L = 1.0\ \text{m}$ and $g = 9.81\ \text{m/s}^2$, released from rest at $60^\circ$.

- Natural frequency: $\omega_0 = \sqrt{9.81} = 3.13\ \text{rad/s}$.
- Small-swing period: $T_0 = 2\pi/3.13 = 2.006\ \text{s}$.
- The exact factor at $60^\circ$ is $\frac{2}{\pi}K(0.5) = 1.0732$, so $T = 2.153\ \text{s}$.
- The estimate $1 + \theta_0^2/16$ with $\theta_0 = 1.047\ \text{rad}$ gives $1.069$, which is $0.4\%$ below the exact factor.

**Check.** The estimate and the exact value agree to a fraction of a percent at $60^\circ$. A $60^\circ$ swing takes about 7% longer than a tiny one, which matches the prediction that bigger swings are slower.

## Try one yourself

A pendulum has $\omega_0 = 3\ \text{rad/s}$. Fill in the blanks, then open the answer.

- Small-swing period: $T_0 = 2\pi/\omega_0 = \_\_\_\ \text{s}$
- Launch speed from the bottom needed to spin: $2\omega_0 = \_\_\_\ \text{rad/s}$
- At a starting angle of $120^\circ$ the exact period is $1.373\,T_0 = \_\_\_\ \text{s}$

<details>
<summary>Answer and full solution</summary>

$T_0 = 6.283/3 = 2.094\ \text{s}$.

The speed needed is $2 \times 3 = 6\ \text{rad/s}$. Below that the pendulum swings, and above it the pendulum spins.

$1.373 \times 2.094 = 2.875\ \text{s}$.

</details>

## Common mistakes

- **Using $T = 2\pi\sqrt{L/g}$ for large swings.** It is only right for small ones, where $\sin\theta \approx \theta$.
- **Believing the mass changes the period.** It cancels out, because gravity's pull is proportional to the mass.
- **Forgetting that the angle must be in radians** in $\theta_0^2/16$.
- **Treating spinning as a failure of the equation.** The same equation describes both, and the change is only in the energy.

## Where this shows up in the lab

Open the pendulum lab with the small-swing frequency $\omega_0 = 3\ \text{rad/s}$ and a start angle of $120^\circ$. The page shows the exact period, 2.875 s, next to the small-swing value, 2.094 s. Switch to phase space to see the loop stretched out of its small-swing ellipse. Then set the start angle to $0^\circ$ and raise the start speed past $6\ \text{rad/s}$: the closed loop opens into a spinning track. The curve that separates the two is the separatrix.
