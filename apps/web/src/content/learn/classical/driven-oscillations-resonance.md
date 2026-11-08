---
title: Driven oscillations and resonance
summary: Push an oscillator at the right rhythm and a tiny force builds a huge motion. Resonance depends on one number, the damping, which sets how tall and how narrow the peak is.
level: beginner
minutes: 14
prerequisites: [classical/simple-harmonic-motion, classical/damped-oscillations]
sim: /lab/oscillator
status: draft
predict:
  type: choice
  prompt: You push a child on a swing with the same small push every time. Which timing builds the biggest swing?
  options: [Push as fast as you can, Push once each time the swing returns to you, Push at random moments]
  answer: Push once each time the swing returns to you
  reveal: A swing has its own rhythm. If each push arrives just as the swing starts forward, every push adds to the motion already there. Pushing too fast or at random means some pushes fight the swing and cancel the others. Matching the swing's own rhythm is resonance.
questions:
  - id: q1
    type: numeric
    prompt: A 0.5 kg mass on a spring with k = 200 N/m has damping b = 2 kg/s and is driven at its natural frequency by a force of amplitude 4 N. What is the amplitude of its motion?
    answer: 0.1
    tolerance: 0.002
    unit: m
    solution: At resonance the amplitude is F/(bω₀). Here ω₀ = √(200/0.5) = 20 rad/s, so the amplitude is 4/(2 × 20) = 0.1 m. For comparison, the same force held steady would stretch the spring by only 4/200 = 0.02 m.
  - id: q2
    type: numeric
    prompt: A tuning fork has a damping ratio ζ = 0.02. By what factor does resonance magnify its response compared with a steady push of the same strength?
    answer: 25
    tolerance: 0.5
    solution: The magnification at resonance is Q = 1/(2ζ) = 1/0.04 = 25.
  - id: q3
    type: choice
    prompt: An oscillator with no damping at all is driven exactly at its natural frequency. What happens to the amplitude?
    options: [It settles at a large steady value, It grows steadily without limit, It shrinks to zero]
    answer: It grows steadily without limit
    solution: With nothing to remove energy, every push adds energy and none leaves. The amplitude grows in proportion to time. A real oscillator breaks, or friction becomes important, long before that.
  - id: q4
    type: explain
    prompt: Why does lighter damping give a taller and narrower resonance peak?
    model: At resonance the force is always in step with the velocity, so it does positive work all the time. The motion grows until friction removes energy as fast as the force supplies it. Less friction means the motion must grow larger before the two balance, so the peak is taller. Away from resonance, the force is out of step and the response is small whatever the damping. Lower damping therefore leaves only a narrow range of frequencies that are close enough to be in step.
---

## The big picture

A singer can shatter a wine glass, a marching column can shake a bridge, and a radio picks one station out of thousands. All three rely on **resonance**. A system with a natural rhythm responds enormously to a small force that matches it. By the end you will be able to say how big the response is at resonance and why it depends so strongly on the damping.

## Build the intuition

Think of the swing again. Each push is small. If the pushes arrive in step with the swing, they add up, and the swing grows until friction takes as much energy each cycle as the pushes give it.

Change the rhythm of the pushes and they drift out of step. Some arrive when the swing is moving toward you and slow it down. The pushes cancel each other and the motion stays small. So the response depends sharply on the **driving frequency** $\omega_d$ compared with the natural frequency $\omega_0$.

## The math

Add a steady back-and-forth force $F\cos(\omega_d t)$ to the damped oscillator:

$$m\ddot{x} + b\dot{x} + kx = F\cos(\omega_d t)$$

After the start-up transient fades, the mass moves at the driving frequency with a constant amplitude:

$$A(\omega_d) = \frac{F/m}{\sqrt{(\omega_0^2 - \omega_d^2)^2 + (2\zeta\omega_0\omega_d)^2}}$$

Look at the two terms under the root. Far from resonance the first one dominates and the amplitude is small. At $\omega_d = \omega_0$ it vanishes, and only the damping term is left:

$$A(\omega_0) = \frac{F}{b\,\omega_0}, \qquad \frac{A(\omega_0)}{F/k} = \frac{1}{2\zeta} = Q$$

The number $Q$, the **quality factor**, says how many times larger the response is than a steady push of the same strength. The peak is about $\omega_0/Q$ wide, so a high $Q$ gives a tall, narrow peak. A radio tuner uses exactly this: a high-$Q$ circuit answers strongly to one station's frequency and ignores its neighbours.

The motion also lags behind the push by a phase $\varphi$:

$$\tan\varphi = \frac{2\zeta\omega_0\omega_d}{\omega_0^2 - \omega_d^2}$$

Well below resonance the mass keeps pace with the push, so $\varphi$ is near $0^\circ$. At resonance it lags by exactly a quarter of a cycle, $90^\circ$. That is the timing at which the push is always in step with the velocity, so it does positive work all the time. Well above resonance the mass moves opposite to the push, and $\varphi$ is near $180^\circ$.

<details>
<summary>Why does this step follow? Why does the amplitude at resonance equal F/(bω₀)</summary>

At $\omega_d = \omega_0$ the spring force and the inertia force cancel each other exactly, because $m\omega_0^2 = k$. The only thing left to balance the driving force is the friction force $b\dot{x}$. Its amplitude is $b\omega_0 A$. Setting $F = b\omega_0 A$ gives $A = F/(b\omega_0)$. The tiny shift of the true peak to $\omega_0\sqrt{1-2\zeta^2}$ is only 0.25% at $\zeta = 0.05$.

</details>

## Worked example

Take $m = 1\ \text{kg}$, $k = 100\ \text{N/m}$, $b = 1\ \text{kg/s}$ and $F = 2\ \text{N}$. Then $\omega_0 = 10\ \text{rad/s}$.

- Damping ratio: $\zeta = 1/(2\sqrt{100}) = 0.05$.
- Steady push: $F/k = 2/100 = 0.02\ \text{m}$.
- At resonance: $A = F/(b\omega_0) = 2/10 = 0.2\ \text{m}$.
- Quality factor: $Q = 1/(2 \times 0.05) = 10$, and $0.2/0.02 = 10$.
- At half the natural frequency, $\omega_d = 5\ \text{rad/s}$: the root is $\sqrt{75^2 + 5^2} = 75.2$, so $A = 2/75.2 = 0.027\ \text{m}$.
- Width of the peak: the response falls to 71% of its top (half the energy) at $9.46$ and $10.46\ \text{rad/s}$, a width of $1.0\ \text{rad/s}$, which is $\omega_0/Q = 10/10$.
- Phase lag: $4^\circ$ at $\omega_d = 5$, exactly $90^\circ$ at $\omega_d = 10$, and $176^\circ$ at $\omega_d = 20$.

**Check.** The two ways of finding $Q$ agree. Moving the drive away from resonance cuts the response from 0.2 m to 0.027 m, nearly eight times smaller. The measured width of the peak matches $\omega_0/Q$.

## Try one yourself

A mass of $2\ \text{kg}$ on a spring with $k = 50\ \text{N/m}$ (so $\omega_0 = 5\ \text{rad/s}$) has damping $b = 2\ \text{kg/s}$ and is driven at $\omega_0$ by $F = 1\ \text{N}$. Fill in the blanks, then open the answer.

- $\zeta = b/(2\sqrt{km}) = \_\_\_$
- $A = F/(b\omega_0) = \_\_\_\ \text{m}$
- $F/k = \_\_\_\ \text{m}$, so $Q = \_\_\_$

<details>
<summary>Answer and full solution</summary>

$\sqrt{km} = 10$, so $\zeta = 2/20 = 0.1$.

$A = 1/(2 \times 5) = 0.1\ \text{m}$.

$F/k = 1/50 = 0.02\ \text{m}$, so $Q = 0.1/0.02 = 5$, which agrees with $1/(2\zeta) = 5$.

</details>

## Common mistakes

- **Thinking resonance needs a large force.** The force can be tiny. The size of the response comes from the rhythm and the weak damping.
- **Expecting the peak at exactly $\omega_0$ with heavy damping.** The peak moves lower, and for $\zeta > 0.71$ it disappears.
- **Forgetting that the drive wins in the end.** After a transient, the motion is at the driving frequency, not the natural one.
- **Reading $Q$ as an energy.** It is a ratio of amplitudes, with no units.

## Where this shows up in the lab

Open the oscillator lab, set the damping ratio $\zeta$ to $0.05$ and the natural frequency $\omega_0$ to $2\ \text{rad/s}$, and turn on a drive strength $F$. Sweep the drive frequency $\omega_d$ from low to high. The response swells as $\omega_d$ approaches $\omega_0$ and falls away again. Set $\zeta$ to $0$ and drive at exactly $\omega_0$ and the amplitude grows steadily with no limit. In phase space the motion spirals outward, and with damping it settles onto a steady loop.
