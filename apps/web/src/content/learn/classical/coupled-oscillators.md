---
title: Coupled oscillators and normal modes
summary: Masses joined by springs move in a tangle, but every motion is a sum of a few clean patterns called normal modes, each oscillating at its own single frequency.
level: intermediate
minutes: 15
prerequisites: [classical/simple-harmonic-motion, classical/damped-oscillations]
sim: /lab/coupled
status: draft
predict:
  type: choice
  prompt: Two identical masses are joined to each other and to two walls by identical springs. You pluck only the first mass and let go. What does the second mass do?
  options: [Stays still, Starts moving and gradually takes over all the energy, Moves exactly like the first mass]
  answer: Starts moving and gradually takes over all the energy
  reveal: The middle spring carries energy from the first mass to the second. The second mass swings up while the first dies down, until almost all of the energy has moved across. Then the energy flows back. This steady handing back and forth is called beating.
questions:
  - id: q1
    type: numeric
    prompt: A chain of N = 3 equal masses has ω₀ = 10 rad/s, and ω_k = 2ω₀ sin(kπ/(2(N+1))). What is the highest normal-mode frequency?
    answer: 18.48
    tolerance: 0.02
    unit: rad/s
    solution: The highest mode is k = 3. ω₃ = 2 × 10 × sin(3π/8) = 20 × sin(67.5°) = 20 × 0.9239 = 18.48 rad/s.
  - id: q2
    type: numeric
    prompt: Two masses with ω₀ = 3 rad/s are plucked on the first mass only. The two normal modes have frequencies 3 and 5.196 rad/s. How long until the energy first moves completely to the second mass?
    answer: 1.43
    tolerance: 0.01
    unit: s
    solution: The energy moves across after a time t = π/(ω₂ − ω₁) = π/(5.196 − 3) = π/2.196 = 1.43 s.
  - id: q3
    type: choice
    prompt: A chain is started in a single normal mode. How do the masses move?
    options: [Each at its own frequency, All at one shared frequency in a fixed pattern, Randomly]
    answer: All at one shared frequency in a fixed pattern
    solution: That is the definition of a normal mode. Every mass oscillates at one shared frequency, and the ratios between their displacements never change.
  - id: q4
    type: explain
    prompt: Why is it easier to describe a chain in terms of normal modes than mass by mass?
    model: The masses push on each other, so the equation for each one contains the others, and the equations are tangled together. A normal mode is a pattern in which the tangle disappears, and it behaves like a single independent oscillator with its own frequency. Any motion is a sum of these independent modes, so we can solve each one separately, and then add them up.
---

## The big picture

A bridge, a molecule and a guitar string are all made of parts that push on each other. Pull one part and the motion spreads to the rest, which looks complicated. The key idea of this lesson is that the tangle has a simple structure. By the end you will be able to find the natural frequencies of a chain of masses and explain how energy moves along it.

## Build the intuition

Hang two weights between walls on springs, like a pair of swings joined by a spring. There are two special ways to set them going. If they swing together, the middle spring is never stretched and each swings at its normal rate. If they swing in opposite directions, the middle spring is stretched twice as much, and they swing faster.

Those two patterns are the **normal modes**. Any other motion, such as plucking just one mass, is a mixture of the two. The two modes drift out of step because they have different frequencies, and that drifting is exactly why the energy slowly passes from one mass to the other.

## The math

For $N$ equal masses joined by identical springs, with both ends fixed, each normal mode $k$ has a fixed pattern and a single frequency:

$$u_j(t) = A\,\sin\frac{jk\pi}{N+1}\cos(\omega_k t), \qquad \omega_k = 2\omega_0\sin\frac{k\pi}{2(N+1)}$$

Here $u_j$ is the displacement of mass $j$, and $\omega_0 = \sqrt{k_s/m}$ is set by one spring and one mass. A general motion is a sum of all $N$ modes. For two masses with the first plucked by $A$, the two modes combine to

$$u_1 = A\cos\frac{\Delta t}{2}\cos\frac{\Sigma t}{2}, \qquad \Delta = \omega_2 - \omega_1,\ \ \Sigma = \omega_1 + \omega_2$$

The factor $\cos(\Delta t/2)$ is a slow envelope. The energy has moved completely to the second mass when the envelope reaches zero, after a time $t = \pi/\Delta$.

<details>
<summary>Why does this step follow? Why is the two-mass motion a product of two cosines</summary>

Plucking the first mass alone is the sum of the two modes, each with half the amplitude: $u_1 = \tfrac{A}{2}(\cos\omega_1 t + \cos\omega_2 t)$. The identity $\cos a + \cos b = 2\cos\frac{a+b}{2}\cos\frac{a-b}{2}$ turns that sum into the product above. The fast cosine has the average frequency $\Sigma/2$, and the slow cosine has half the difference frequency.

</details>

## Worked example

Take $N = 2$ and $\omega_0 = 2\ \text{rad/s}$, with the first mass plucked by $A = 1$.

- Mode frequencies: $\omega_1 = 2 \times 2\sin 30^\circ = 2.00\ \text{rad/s}$ and $\omega_2 = 4\sin 60^\circ = 3.46\ \text{rad/s}$.
- Difference: $\Delta = 1.46\ \text{rad/s}$.
- The energy first sits entirely in the second mass at $t = \pi/\Delta = 2.15\ \text{s}$.
- It is back in the first mass after $2\pi/\Delta = 4.29\ \text{s}$.

**Check.** At $t = 2.15\ \text{s}$ the envelope $\cos(\Delta t/2)$ is zero, so the first mass is momentarily still on average, while the second mass swings with the full amplitude 1.

## Try one yourself

A chain of $N = 3$ masses has $\omega_0 = 10\ \text{rad/s}$. Fill in the blanks, then open the answer.

- $\omega_1 = 2\omega_0\sin(\pi/8) = \_\_\_\ \text{rad/s}$
- $\omega_2 = 2\omega_0\sin(2\pi/8) = \_\_\_\ \text{rad/s}$
- How many normal modes does the chain have? $\_\_\_$

<details>
<summary>Answer and full solution</summary>

$\omega_1 = 20\sin 22.5^\circ = 20 \times 0.3827 = 7.65\ \text{rad/s}$.

$\omega_2 = 20\sin 45^\circ = 14.14\ \text{rad/s}$.

There are three, one for every mass. The highest is $\omega_3 = 18.48\ \text{rad/s}$.

</details>

## Common mistakes

- **Thinking the energy is lost** when one mass stops. It has passed to a neighbour.
- **Expecting modes to depend on how you start it.** The modes and their frequencies belong to the chain. The start decides only how much of each mode is present.
- **Forgetting that the number of modes equals the number of masses.**
- **Treating $\omega_0$ as a mode frequency.** It is a building block. Every mode frequency comes from the formula.

## Where this shows up in the lab

Open the coupled oscillators lab with $N = 2$ and $\omega_0 = 2\ \text{rad/s}$ and pluck the first mass. Plot one mass against time and watch it fade while the other grows. Set the start to mode 1 or mode 2 and the masses move in a single clean pattern at one frequency. Increase $N$ and the number of modes grows with it, spread between $0$ and $2\omega_0$.
