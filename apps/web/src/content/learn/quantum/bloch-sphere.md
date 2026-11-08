---
title: The qubit and the Bloch sphere
summary: Every state of a qubit is a point on a sphere. Gates turn the sphere, measurement reads its height, and noise pulls the point toward the inside.
level: beginner
minutes: 15
prerequisites: [quantum/spin-half]
sim: /lab/qubit
status: draft
predict:
  type: choice
  prompt: A qubit starts in state |0⟩. A Hadamard gate (H) turns it onto the equator of the Bloch sphere. If you now measure it, what is the chance of getting 0?
  options: [0%, 50%, 100%]
  answer: 50%
  reveal: On the equator the state is an equal mixture of |0⟩ and |1⟩. Measurement only cares about height, and the equator is exactly halfway between the poles. The chance of 0 is (1 + 0)/2 = 50%.
questions:
  - id: q1
    type: numeric
    prompt: A qubit sits at polar angle θ = 60° from the north pole. What is the probability of measuring 0?
    answer: 0.75
    tolerance: 0.005
    solution: P(0) = cos²(θ/2) = cos²(30°) = 0.866² = 0.75.
  - id: q2
    type: numeric
    prompt: A qubit has Bloch vector component z = 0.6. What is the probability of measuring 1?
    answer: 0.2
    tolerance: 0.005
    solution: P(1) = (1 − z)/2 = (1 − 0.6)/2 = 0.2.
  - id: q3
    type: numeric
    prompt: A qubit starts in |1⟩ (z = −1) and relaxes with T₁ = 5 s. What is z after 5 s?
    answer: 0.264
    tolerance: 0.005
    solution: Relaxation follows z(t) = 1 + (z₀ − 1)e^(−t/T₁). With z₀ = −1 and t = T₁, z = 1 − 2e⁻¹ = 1 − 0.736 = 0.264.
  - id: q4
    type: explain
    prompt: Why does noise move the arrow inside the sphere, and what does that mean for the qubit?
    model: A state on the surface is a pure state, with definite amplitudes for 0 and 1. Noise leaks energy and scrambles the phase, so the qubit becomes a probabilistic mixture of states instead of one definite one. A mixture has a shorter arrow. The closer to the centre, the less quantum the qubit is, and at the exact centre it is a plain coin toss with nothing quantum left.
---

## The big picture

A classical bit is 0 or 1. A **qubit** is the smallest quantum system, and its state can be 0, 1 or a blend of both. The Bloch sphere is a map that fits all of those states, and the gates that act on them, into one picture. By the end you will be able to read a state off the sphere, work out a measurement chance, and follow a short sequence of gates.

## Build the intuition

Picture a globe. The north pole is $|0\rangle$ and the south pole is $|1\rangle$. Every other point on the surface is a superposition. Its height sets how likely each outcome is, and its longitude is a **phase**, a hidden angle that matters when gates are applied later.

A gate turns the whole globe about an axis. **X** flips it over the $x$ axis, so north goes to south. **H** turns the north pole onto the equator. **S** and **T** turn it about the vertical axis, which moves a point round its latitude and changes only the phase. Measurement only reads the height.

## The math

A pure state with polar angle $\theta$ and longitude $\varphi$ is

$$|\psi\rangle = \cos\frac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\frac{\theta}{2}\,|1\rangle$$

Its Bloch vector is $\mathbf{r} = (\sin\theta\cos\varphi,\ \sin\theta\sin\varphi,\ \cos\theta)$, a point on a sphere of radius 1. The measurement chances depend only on $z$:

$$P(0) = \frac{1+z}{2}, \qquad P(1) = \frac{1-z}{2}$$

Gates turn the sphere: $S$ is a $90^\circ$ turn about the $z$ axis, $T$ is a $45^\circ$ turn about it, $X$ is a $180^\circ$ turn about $x$, and $H$ is a $180^\circ$ turn about the axis halfway between $x$ and $z$. That last one sends $(x, y, z)$ to $(z, -y, x)$.

Noise shrinks the vector. Energy loss pulls $z$ toward $+1$ at a rate set by $T_1$. Phase scrambling shrinks $x$ and $y$ at a rate set by $T_2$:

$$z(t) = 1 + (z_0 - 1)\,e^{-t/T_1}, \qquad x(t),\,y(t) \propto e^{-t/T_2}$$

<details>
<summary>Why does this step follow? Why is the chance of 0 equal to (1 + z)/2</summary>

With $z = \cos\theta$, the chance of 0 is $\cos^2(\theta/2)$. The half-angle identity says $\cos^2(\theta/2) = (1 + \cos\theta)/2$, which is $(1+z)/2$. At the north pole, $z = 1$, the chance is 1. At the equator it is $1/2$. At the south pole it is 0.

</details>

## Worked example

Start in $|0\rangle$, so $\mathbf{r} = (0, 0, 1)$, and apply the sequence H, T, H.

- After H: $\mathbf{r} = (1, 0, 0)$, on the equator pointing along $x$.
- After T, a $45^\circ$ turn about $z$: $\mathbf{r} = (0.707, 0.707, 0)$.
- After the second H, using $(x, y, z) \to (z, -y, x)$: $\mathbf{r} = (0, -0.707, 0.707)$.
- Measurement chance: $P(0) = (1 + 0.707)/2 = 0.854$.

**Check.** The state is again a point on the sphere, since $0.707^2 + 0.707^2 = 1$. The exact value is $\cos^2(\pi/8) = 0.854$, which agrees.

## Try one yourself

Start in $|0\rangle$ and apply H, then S, then H. Fill in the blanks, then open the answer.

- After H: $\mathbf{r} = (\_\_\_, \_\_\_, \_\_\_)$
- After S (a $90^\circ$ turn about $z$ takes $x$ toward $y$): $\mathbf{r} = (\_\_\_, \_\_\_, \_\_\_)$
- After the second H: $\mathbf{r} = (\_\_\_, \_\_\_, \_\_\_)$, so $P(0) = \_\_\_$

<details>
<summary>Answer and full solution</summary>

After H, $\mathbf{r} = (1, 0, 0)$. After S, $\mathbf{r} = (0, 1, 0)$. After the second H, using $(x, y, z) \to (z, -y, x)$, $\mathbf{r} = (0, -1, 0)$, which is on the equator.

So $P(0) = (1 + 0)/2 = 0.5$.

</details>

## Common mistakes

- **Thinking the poles are the only states.** Every point on the sphere is a valid state, and the equator is an equal blend.
- **Reading phase from the height.** Height gives the measurement chance. The phase is the longitude, and it does not show up in a single measurement.
- **Expecting S and T to change the chance of 0.** They turn about the vertical axis, so $z$ stays the same.
- **Choosing $T_2$ longer than $2T_1$.** It cannot happen, because energy loss itself destroys the phase. The lab caps $T_2$ at $2T_1$.

## Where this shows up in the lab

Open the qubit lab, press H, then T, then H, and the arrow lands at $(0, -0.707, 0.707)$ with $P(0) = 0.854$. Drag the sphere to look at it from any side. The circuit is saved in the share link. Then switch noise on, press Let time pass, and watch the arrow sink toward $|0\rangle$ and shrink toward the vertical axis. Purity falls from 1 toward ½ as the arrow moves into the sphere.
