---
title: Damped oscillations
summary: Friction steadily drains an oscillator's energy, and one number, the damping ratio, decides whether it rings and fades, returns as fast as possible, or creeps back slowly.
level: beginner
minutes: 12
prerequisites: [classical/simple-harmonic-motion, classical/drag]
sim: /lab/oscillator
status: draft
predict:
  type: choice
  prompt: A door closer should shut the door as quickly as possible without letting it bounce. Which kind of damping does the best job?
  options: [Light damping, Critical damping, Heavy damping]
  answer: Critical damping
  reveal: Light damping lets the door swing past shut and bounce back. Heavy damping stops it bouncing but makes it creep, so it takes a long time. Critical damping sits exactly between them, and it brings the door to rest in the shortest time without overshooting.
questions:
  - id: q1
    type: numeric
    prompt: A 0.25 kg mass hangs on a spring with k = 100 N/m. What damping coefficient b makes the motion critically damped?
    answer: 10
    tolerance: 0.05
    unit: kg/s
    solution: Critical damping needs ζ = 1, which means b = 2√(km) = 2√(100 × 0.25) = 2√25 = 10 kg/s.
  - id: q2
    type: numeric
    prompt: An underdamped oscillator has m = 1.0 kg and damping b = 0.5 kg/s. How long does it take for the amplitude to fall to half?
    answer: 2.77
    tolerance: 0.02
    unit: s
    solution: The amplitude shrinks as e^(−bt/2m) = e^(−0.25t). Set that equal to ½. Then 0.25t = ln 2, so t = 0.693/0.25 ≈ 2.77 s.
  - id: q3
    type: choice
    prompt: An oscillator with ζ = 1.5 is pulled aside and released from rest. What does it do?
    options: [Rings many times before stopping, Overshoots once and stops, Creeps back to the middle without crossing it]
    answer: Creeps back to the middle without crossing it
    solution: ζ above 1 is overdamped. The friction is so strong that the mass never gains enough speed to cross the middle. It slides back slowly and settles.
  - id: q4
    type: explain
    prompt: Why does the amplitude of an underdamped oscillation shrink by the same fraction every swing, instead of by the same amount?
    model: The friction force grows with speed, and the speed is proportional to the amplitude. A larger swing therefore loses more energy per swing than a smaller one. The loss is a fixed fraction of what is left, so the amplitude shrinks by the same factor each time, an exponential decay.
---

## The big picture

A real swing slows down, a plucked string goes quiet, and a car stops bouncing after a bump. In each case friction drains the energy a little at a time. This lesson adds that friction to the oscillator from the last lesson. One number, the damping ratio, tells you which of three very different behaviours you will get. By the end you will be able to name the behaviour from the numbers and say how fast the swing fades.

## Build the intuition

Think of the mass on a spring dipped in honey. The honey pushes back against the motion, and the faster the mass moves, the harder it pushes.

With a little honey, the mass still swings, but each swing is a bit smaller than the last. That is **underdamped**. With a lot of honey, the mass cannot even complete one swing. It oozes back to the middle slowly. That is **overdamped**. Somewhere between lies a sweet spot, where the mass returns to the middle as fast as it can without crossing it. That is **critical damping**, and it is what a door closer or the needle of a measuring instrument aims for. A car's suspension is different. It is deliberately underdamped, with a damping ratio usually well below 1, because critical damping would make the ride harsh. Engineers choose the regime to suit the job.

## The math

Add a friction force $-b\,\dot x$ (proportional to speed, with $b$ in kg/s) to the spring force. Newton's second law becomes $m\ddot x = -kx - b\dot x$. Divide by $m$ and use two combinations of the constants:

$$\ddot{x} + 2\zeta\omega_0\,\dot{x} + \omega_0^2\,x = 0, \qquad \omega_0 = \sqrt{\frac{k}{m}}, \qquad \zeta = \frac{b}{2\sqrt{km}}$$

Here $\omega_0$ is the natural frequency from the last lesson and $\zeta$ (zeta) is the **damping ratio**. It has no units, and it decides the behaviour:

- $\zeta < 1$ is **underdamped**. It oscillates, with an amplitude that shrinks as $e^{-\zeta\omega_0 t}$:

$$x(t) = A\,e^{-\zeta\omega_0 t}\cos(\omega_1 t + \varphi), \qquad \omega_1 = \omega_0\sqrt{1-\zeta^2}$$

where $A$ and the phase $\varphi$ are set by how you start it.

- $\zeta = 1$ is **critically damped**. It returns fastest with no overshoot. This needs $b = 2\sqrt{km}$.
- $\zeta > 1$ is **overdamped**. It never oscillates and creeps back, more slowly the larger $\zeta$ is.

The decay rate $\zeta\omega_0$ equals $b/2m$, so the amplitude halves after a time $\ln 2 / (b/2m)$.

<details>
<summary>Why does this step follow? Why is the oscillation slower than the undamped one</summary>

Friction does not only remove energy. It also fights the spring, so the mass takes slightly longer to complete each swing. That is the factor $\sqrt{1-\zeta^2}$, which is below 1, so $\omega_1 < \omega_0$. For light damping the change is tiny. At $\zeta = 0.1$ it is only half a percent. As $\zeta$ approaches 1, $\omega_1$ falls toward zero, and the swing disappears.

</details>

## Worked example

Take $m = 0.50\ \text{kg}$, $k = 200\ \text{N/m}$, so $\omega_0 = 20\ \text{rad/s}$, and add friction with $b = 2.0\ \text{kg/s}$.

- Damping ratio: $\zeta = 2.0/(2\sqrt{200 \times 0.50}) = 2.0/(2 \times 10) = 0.1$, so it is underdamped.
- Decay rate: $\zeta\omega_0 = 0.1 \times 20 = 2\ \text{s}^{-1}$, which agrees with $b/2m = 2.0/1.0$.
- Oscillation frequency: $\omega_1 = 20\sqrt{1 - 0.01} = 19.9\ \text{rad/s}$, so one swing takes $2\pi/19.9 = 0.316\ \text{s}$.
- Amplitude after one swing: $e^{-2 \times 0.316} = 0.53$, so each swing is about 53% as big as the last.
- Time for the amplitude to halve: $\ln 2 / 2 = 0.35\ \text{s}$.

**Check.** One swing takes 0.316 s, and the amplitude halves in 0.35 s, which is a little longer than one swing. That agrees with each swing keeping 53% of the last one.

The critical value for this spring is $b = 2\sqrt{km} = 2 \times 10 = 20\ \text{kg/s}$, ten times larger.

## Try one yourself

A mass of $2.0\ \text{kg}$ on a spring with $k = 50\ \text{N/m}$ (so $\omega_0 = 5\ \text{rad/s}$) has friction $b = 4.0\ \text{kg/s}$. Fill in the blanks, then open the answer.

- $\zeta = b/(2\sqrt{km}) = 4.0/(2\sqrt{\_\_\_}) = \_\_\_$
- Decay rate $b/2m = \_\_\_\ \text{s}^{-1}$, so the amplitude halves in $\_\_\_\ \text{s}$
- $\omega_1 = \omega_0\sqrt{1-\zeta^2} = \_\_\_\ \text{rad/s}$

<details>
<summary>Answer and full solution</summary>

$\sqrt{km} = \sqrt{50 \times 2.0} = 10$, so $\zeta = 4.0/20 = 0.2$. It is underdamped.

Decay rate $b/2m = 4.0/4.0 = 1\ \text{s}^{-1}$, so the amplitude halves in $\ln 2 / 1 = 0.69\ \text{s}$.

$\omega_1 = 5\sqrt{1 - 0.04} = 5 \times 0.980 = 4.90\ \text{rad/s}$.

</details>

## Common mistakes

- **"More damping always settles faster."** Past critical damping it settles more slowly. The best value is exactly $\zeta = 1$.
- **Expecting the swing to stop at once when $\zeta$ is large.** Overdamped motion still takes time, it just never crosses the middle.
- **Mixing up $\zeta$ and $b$.** $\zeta$ is a ratio and has no units. $b$ is in kg/s. Compare $b$ with $2\sqrt{km}$ to find $\zeta$.
- **Assuming the energy loss is the same every swing.** It is a fixed fraction, so the amplitude decays exponentially, not in equal steps.
- **Forgetting the real period is a little longer.** The ringing frequency is $\omega_1$, not $\omega_0$, though for small $\zeta$ they are very close.

## Where this shows up in the lab

Open the oscillator lab with drive strength $0$ and $\omega_0 = 2\ \text{rad/s}$. Slide the damping ratio $\zeta$ from 0 up to 2 and watch the three behaviours: a ringing swing at $0.1$, the fastest no-overshoot return at exactly $1$, and a slow creep at $2$. Switch to phase space and the closed loop becomes a spiral that winds into the middle. Under the plot, the lab shows which regime you are in and its natural period. Try turning the drive on at $\omega_d = \omega_0$ with little damping to see resonance, which is the subject of the next lesson.
