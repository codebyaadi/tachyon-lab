---
title: Simple harmonic motion
summary: Anything pulled back toward a middle point in proportion to how far it has moved swings back and forth at a steady rhythm, and the same few equations describe all of it.
level: beginner
minutes: 12
prerequisites: [classical/newtons-laws, classical/common-forces, classical/differential-equations]
sim: /lab/oscillator
status: draft
predict:
  type: choice
  prompt: A mass on a spring is pulled back 2 cm and released. It takes 1 second to swing out and back. If you pull it back 4 cm instead, how long does one swing take?
  options: [Longer than 1 s, Exactly 1 s, Shorter than 1 s]
  answer: Exactly 1 s
  reveal: The period does not depend on the amplitude. A bigger stretch means a bigger pull, so the mass accelerates harder, and it also has further to go. The two effects cancel exactly, and the swing still takes 1 s. Only the speed is different, it is twice as fast at the middle.
questions:
  - id: q1
    type: numeric
    prompt: A 0.25 kg mass hangs on a spring with k = 25 N/m. What is the period of its oscillation?
    answer: 0.628
    tolerance: 0.005
    unit: s
    solution: ω = √(k/m) = √(25/0.25) = √100 = 10 rad/s. The period is T = 2π/ω = 2π/10 ≈ 0.628 s.
  - id: q2
    type: numeric
    prompt: A 0.4 kg mass on a spring with k = 160 N/m is pulled 0.03 m from the middle and released. What is its greatest speed?
    answer: 0.6
    tolerance: 0.01
    unit: m/s
    solution: ω = √(160/0.4) = √400 = 20 rad/s. The greatest speed is at the middle, v_max = Aω = 0.03 × 20 = 0.6 m/s. Energy agrees. ½kA² = ½(160)(0.03²) = 0.072 J, and ½mv² = ½(0.4)(0.6²) = 0.072 J.
  - id: q3
    type: choice
    prompt: You replace the mass with one four times as heavy, on the same spring. What happens to the period?
    options: [It halves, It stays the same, It doubles, It quadruples]
    answer: It doubles
    solution: The period is T = 2π√(m/k), so it grows with the square root of the mass. Four times the mass gives √4 = 2 times the period.
  - id: q4
    type: explain
    prompt: Why is the speed greatest as the mass passes the middle, and zero at the ends?
    model: The pull toward the middle slows the mass on the way out and speeds it up on the way back in. At the middle that pull is zero, so the mass has finished speeding up and is going fastest. At the ends it has run out of speed and is just turning around. In energy terms, the stretch stores energy in the spring at the ends and all of it has turned into motion at the middle.
---

## The big picture

Push a child on a swing, pluck a guitar string, or watch a weight bob on a spring. The motion is different in each case, but the pattern is the same: a steady back-and-forth with a fixed rhythm. That pattern is called **simple harmonic motion**. It matters far beyond springs, because almost anything near a stable resting point behaves this way for small movements. By the end you will be able to find the period, the top speed and the energy of such a motion.

## Build the intuition

Hold a mass on a spring and pull it to one side. The spring pulls back, harder the further you pulled. Let go, and the mass speeds up toward the middle. At the middle the spring pulls with no force at all, but the mass is moving, so it carries on past. Now the spring pulls the other way, slows it, stops it, and sends it back.

The key rule is that **the pull is proportional to the distance from the middle**. Twice as far, twice the pull. That one rule produces a motion whose rhythm does not depend on how far you start. This is why a pendulum clock (whose small swings behave the same way) keeps good time even as its swing slowly shrinks.

Energy tells the same story. At the ends of the swing the mass is momentarily still and all the energy is stored in the stretched spring. At the middle the spring is relaxed and all the energy is motion. In between it is shared, and the total never changes, because nothing here takes energy away.

This pattern is far more general than springs. Near the bottom of almost any smooth dip in a potential energy curve, the restoring force is very nearly proportional to the distance from the bottom. A small push on a marble in a bowl, on an atom in a crystal or on a molecule's bond therefore gives the same equation.

## The math

Measure the position $x$ from the middle, in metres. A spring of stiffness $k$ (in N/m) pulls with force $F = -kx$. The minus sign says the force points back toward the middle. Newton's second law, $F = ma$, gives

$$m\,\ddot{x} = -kx \quad\Longrightarrow\quad \ddot{x} = -\omega^2 x, \qquad \omega = \sqrt{\frac{k}{m}}$$

Here $\ddot x$ is the acceleration, and $\omega$ (in rad/s) is called the **angular frequency**. The solution that starts at $x = A$ at rest is

$$x(t) = A\cos\omega t$$

where $A$ is the **amplitude**, the largest distance from the middle. The time for one full swing, the **period**, is the time for $\omega t$ to advance by $2\pi$:

$$T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{m}{k}}$$

Differentiating $x(t)$ gives the velocity and acceleration:

$$v = -A\omega\sin\omega t, \qquad a = -A\omega^2\cos\omega t$$

So the greatest speed is $v_\text{max} = A\omega$ and the greatest acceleration is $A\omega^2$. The energy is constant:

$$E = \tfrac12 m v^2 + \tfrac12 k x^2 = \tfrac12 k A^2$$

<details>
<summary>Why does this step follow? How do we know a cosine solves the equation</summary>

Try it. If $x = A\cos\omega t$, then $\dot x = -A\omega\sin\omega t$ and $\ddot x = -A\omega^2\cos\omega t = -\omega^2 x$. That is exactly the equation $\ddot x = -\omega^2 x$, so a cosine of any amplitude works. The amplitude does not appear in $\omega$, which is why the period does not depend on it.

</details>

## Worked example

A mass of $m = 0.50\ \text{kg}$ sits on a spring with $k = 200\ \text{N/m}$. It is pulled $A = 0.04\ \text{m}$ and released.

- Angular frequency: $\omega = \sqrt{200/0.50} = \sqrt{400} = 20\ \text{rad/s}$
- Period: $T = 2\pi/20 = 0.314\ \text{s}$
- Greatest speed: $v_\text{max} = A\omega = 0.04 \times 20 = 0.80\ \text{m/s}$
- Greatest acceleration: $A\omega^2 = 0.04 \times 400 = 16\ \text{m/s}^2$
- Energy: $E = \tfrac12 kA^2 = \tfrac12(200)(0.04^2) = 0.16\ \text{J}$

**Check with energy.** At the middle all of it is motion: $\tfrac12 m v_\text{max}^2 = \tfrac12(0.50)(0.80^2) = 0.16\ \text{J}$. It matches.

Where is the mass after $0.1\ \text{s}$? $x = 0.04\cos(20 \times 0.1) = 0.04\cos 2 = -0.0166\ \text{m}$, so it has already passed the middle and is on the far side. Remember to use radians for the cosine.

## Try one yourself

A mass of $2.0\ \text{kg}$ is on a spring with $k = 50\ \text{N/m}$ and released from $A = 0.10\ \text{m}$. Fill in the blanks, then open the answer.

- $\omega = \sqrt{k/m} = \sqrt{\_\_\_} = \_\_\_\ \text{rad/s}$, so $T = 2\pi/\omega = \_\_\_\ \text{s}$
- $v_\text{max} = A\omega = \_\_\_\ \text{m/s}$
- $E = \tfrac12 kA^2 = \_\_\_\ \text{J}$

<details>
<summary>Answer and full solution</summary>

$\omega = \sqrt{50/2.0} = \sqrt{25} = 5\ \text{rad/s}$, so $T = 2\pi/5 = 1.26\ \text{s}$.

$v_\text{max} = 0.10 \times 5 = 0.50\ \text{m/s}$.

$E = \tfrac12(50)(0.10^2) = 0.25\ \text{J}$.

Check: $\tfrac12 m v_\text{max}^2 = \tfrac12(2.0)(0.50^2) = 0.25\ \text{J}$.

</details>

## Common mistakes

- **"A bigger swing takes longer."** For a spring the period does not depend on the amplitude. A larger swing is faster, not slower.
- **Using degrees in the cosine.** $\omega t$ is in radians. Set your calculator to radians.
- **Mixing up $\omega$ and $f$.** $\omega$ is in rad/s and the frequency $f = 1/T$ is in swings per second. They differ by a factor $2\pi$.
- **Forgetting the minus sign.** The force always points back toward the middle. Without the minus sign the mass would run away instead of oscillating.
- **Thinking the acceleration is largest at the middle.** It is largest at the ends, where the pull is strongest. At the middle it is zero.

## Where this shows up in the lab

Open the oscillator lab and set damping $\zeta = 0$ and the drive strength to $0$, so you get pure simple harmonic motion. Set the natural frequency to $2\ \text{rad/s}$ and check that one swing takes $2\pi/2 = 3.14\ \text{s}$. Switch the plot to phase space and you will see a closed loop: position against velocity, a perfect ellipse. Then choose Euler with a large time step and watch the loop spiral outward. That growth is not physics, it is the integrator adding energy. Continue with **Damped oscillations**.
