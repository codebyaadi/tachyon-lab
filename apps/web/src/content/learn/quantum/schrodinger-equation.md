---
title: The Schrödinger equation
summary: One equation tells a wavefunction how to change in time. From it follow wave packets that spread, the uncertainty principle at work, and particles that tunnel through barriers they cannot climb.
level: intermediate
minutes: 16
prerequisites: [quantum/wavefunction-born-rule, quantum/expectation-uncertainty]
sim: /lab/wave
status: draft
predict:
  type: choice
  prompt: A ball with less energy than a barrier's height always bounces back. A quantum particle with less energy than the barrier's height hits a thin barrier. What do you expect?
  options: [It always bounces back, It always passes through, There is a definite chance it appears on the far side]
  answer: There is a definite chance it appears on the far side
  reveal: The wavefunction does not stop at the barrier. Inside it the wave dies away quickly but not instantly, and if the barrier is thin enough, some of it is still there on the other side. That part of the wavefunction is the chance of finding the particle there. This is tunnelling, and it falls off quickly as the barrier gets thicker or taller.
questions:
  - id: q1
    type: numeric
    prompt: A free wave packet starts with width σ = 1 in units where ħ = m = 1. What is its width after t = 4?
    answer: 2.24
    tolerance: 0.01
    solution: The width grows as σ(t) = σ√(1 + (t/2σ²)²). With σ = 1 and t = 4, σ(4) = √(1 + 2²) = √5 = 2.24.
  - id: q2
    type: numeric
    prompt: A packet with k₀ = 1.5 starts centred at x = −40 (ħ = m = 1, so its speed is k₀). Where is its centre at t = 30?
    answer: 5
    tolerance: 0.05
    solution: The centre moves at speed k₀ = 1.5, so it travels 1.5 × 30 = 45. The centre is at −40 + 45 = 5.
  - id: q3
    type: numeric
    prompt: A packet has position spread σₓ = 2 at the start, shaped as a Gaussian (the least uncertain shape). What is its momentum spread σₚ with ħ = 1?
    answer: 0.25
    tolerance: 0.005
    solution: A Gaussian reaches the limit σₓσₚ = ½, so σₚ = 1/(2σₓ) = 1/4 = 0.25.
  - id: q4
    type: choice
    prompt: A barrier is made twice as thick, with the same height and energy. What happens to the chance of tunnelling through it?
    options: [It halves, It falls by a much larger factor, It stays the same]
    answer: It falls by a much larger factor
    solution: Inside a barrier the wave decays exponentially with distance, so doubling the thickness squares the decay factor. For V₀ = 0.8 and E = 0.5 the chance falls from 0.157 at width 2 to 0.0076 at width 4, a factor of about 21.
  - id: q5
    type: explain
    prompt: Why does a free wave packet spread out as it moves?
    model: A packet is made of many waves with slightly different wave numbers. Each wave has its own speed, and higher wave numbers travel faster. As time passes the faster components pull ahead and the slower ones fall behind, so the bump stretches out. A narrow packet needs a wider mix of wave numbers to build, so it spreads faster than a wide one. That is the uncertainty principle showing up as motion.
---

## The big picture

Newton's second law tells you how a ball moves. For an electron, an atom or a qubit, the matching rule is the **Schrödinger equation**. It does not track a path. It tells a wavefunction, the thing that holds the probabilities, how to change from one instant to the next. By the end you will be able to explain why packets spread and why particles can tunnel.

## Build the intuition

Picture a ripple on a pond. A single endless wave has an exact wavelength but no position. A short bump has a position but a mixture of wavelengths. A quantum particle's **wave packet** is such a bump, and the Schrödinger equation says how each wavelength in the mix travels.

The probability of finding the particle near $x$ is the square of the wave's height, $|\psi(x)|^2$. A particle meeting a barrier is like a ripple meeting a thin ledge. Part reflects. Part leaks through and carries on.

## The math

In one dimension, with a potential energy $V(x)$:

$$i\hbar\,\frac{\partial\psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2\psi}{\partial x^2} + V(x)\,\psi$$

The lab uses units where $\hbar = m = 1$. A plane wave $e^{i(kx - \omega t)}$ solves the free equation when $\omega = \hbar k^2/2m$. It has energy $\hbar^2k^2/2m$, and a packet built from waves near $k$ moves at the **group speed** $d\omega/dk = \hbar k/m$, which is the speed of the particle. A Gaussian packet of width $\sigma$ centred at $x_0$ with mean wave number $k_0$ keeps its centre at $x_0 + k_0 t$, but its width grows:

$$\sigma(t) = \sigma\sqrt{1 + \left(\frac{\hbar t}{2m\sigma^2}\right)^2}, \qquad \sigma_x\sigma_p \ge \frac{\hbar}{2}$$

A particle trapped in a box of width $a$ can only have certain energies. The wavefunction must fit inside, so its energy levels are

$$E_n = \frac{n^2\pi^2\hbar^2}{2ma^2}, \qquad n = 1, 2, 3, \dots$$

For $a = 4$ and $\hbar = m = 1$ the first three are $0.308$, $1.234$ and $2.776$. A packet is a mixture of these levels. In a box of width 30, a packet with $k_0 = 1$ is centred near level $n = ak_0/\pi \approx 10$.

For a barrier of height $V_0$ and width $a$, and a wave with energy $E < V_0$, the chance of getting through is

$$T = \left[1 + \frac{V_0^2\sinh^2(\kappa a)}{4E(V_0 - E)}\right]^{-1}, \qquad \kappa = \frac{\sqrt{2m(V_0 - E)}}{\hbar}$$

<details>
<summary>Why does this step follow? Why does ω equal ħk²/2m</summary>

Put $\psi = e^{i(kx - \omega t)}$ into the free equation, with $V = 0$. The left side gives $i\hbar(-i\omega)\psi = \hbar\omega\,\psi$. The right side gives $-\frac{\hbar^2}{2m}(ik)^2\psi = \frac{\hbar^2k^2}{2m}\psi$. Setting the two equal gives $\hbar\omega = \hbar^2k^2/2m$. Because $\omega$ is proportional to $k^2$ and not to $k$, different wave numbers drift apart in phase, and that is why a packet spreads.

</details>

## Worked example

Take $\hbar = m = 1$, a packet with $\sigma = 2$, $k_0 = 1.5$ and $x_0 = -40$, and look at $t = 20$.

- Centre: $-40 + 1.5 \times 20 = -10$.
- Width: $\sigma(20) = 2\sqrt{1 + (20/8)^2} = 2\sqrt{7.25} = 5.39$, which is 2.7 times wider.
- Momentum spread: $\sigma_p = 1/(2\sigma) = 0.25$, which does not change in free space.
- Product: $5.39 \times 0.25 = 1.35$, well above the minimum $\tfrac12$.

Now send a packet with $E = \tfrac12 k_0^2 = 0.5$ at a barrier with $V_0 = 0.8$ and $a = 2$. Here $\kappa = \sqrt{2 \times 0.3} = 0.775$ and the formula gives $T = 0.157$.

**Check.** The width grew while $\sigma_p$ stayed fixed, which is why the product rose above the minimum. About 16% of the barrier-bound packet gets through, although a ball with this energy never would.

## Try one yourself

A free packet has $\sigma = 3$ with $\hbar = m = 1$. Fill in the blanks at $t = 12$, then open the answer.

- Width: $\sigma(12) = 3\sqrt{1 + (12/18)^2} = \_\_\_$
- Momentum spread: $\sigma_p = 1/(2\sigma) = \_\_\_$
- Product $\sigma_x\sigma_p = \_\_\_$

<details>
<summary>Answer and full solution</summary>

$12/18 = 0.667$, so $\sigma(12) = 3\sqrt{1.444} = 3.61$.

$\sigma_p = 1/6 = 0.167$.

The product is $3.61 \times 0.167 = 0.60$, above $\tfrac12$ because the packet has spread.

</details>

## Common mistakes

- **Treating ψ as a probability.** The probability density is $|\psi|^2$, and the wavefunction itself can be negative or complex.
- **Picturing a small ball hiding somewhere inside the packet.** The packet is the complete description. It says where the particle is likely to be found, not where a hidden ball already sits.
- **Expecting tunnelling to cost energy.** The average energy stays 0.5 in the lab. Nothing climbs the barrier.
- **Thinking a narrow packet is a good approximation of a single wave.** It is a wide mix of wave numbers, and that is why it spreads.

## Where this shows up in the lab

Open the wave packet lab and choose free space. The packet spreads, and the exact formula, drawn over it, agrees. Then choose the barrier with $V_0 = 0.8$, width 2 and $k_0 = 1$, and press Run. The page shows about 16% transmitted, close to the formula's 0.157. The lab snaps the barrier to whole grid cells, so its own exact value is 0.150. Try the box to see the packet bounce, and the harmonic oscillator to see it swing.
