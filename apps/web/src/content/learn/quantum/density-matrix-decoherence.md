---
title: Density matrices and decoherence
summary: A real qubit is never perfectly isolated. Two clocks, T₁ for energy loss and T₂ for loss of phase, describe how its state decays from the surface of the Bloch sphere toward the inside.
level: intermediate
minutes: 15
prerequisites: [quantum/bloch-sphere]
sim: /lab/qubit
status: draft
predict:
  type: choice
  prompt: A qubit starts in |+⟩ on the equator of the Bloch sphere, and noise slowly acts on it. Where does its state end up?
  options: [Back on the equator, At the north pole at once, Inside the sphere and sinking toward the north pole]
  answer: Inside the sphere and sinking toward the north pole
  reveal: Energy loss pulls the arrow toward |0⟩, the north pole. Loss of phase shrinks its horizontal part. Together the arrow gets shorter, which means moving inside the sphere, while also sinking. In the end it reaches the north pole.
questions:
  - id: q1
    type: numeric
    prompt: A qubit starts in |+⟩ with dephasing time T₂ = 4 s. What is the horizontal component r_x after 2 s?
    answer: 0.607
    tolerance: 0.005
    solution: The horizontal part decays as e^(−t/T₂) = e^(−2/4) = e^(−0.5) = 0.607.
  - id: q2
    type: numeric
    prompt: A qubit is prepared in |1⟩ (z = −1) with relaxation time T₁ = 5 s. At what time does z reach zero?
    answer: 3.47
    tolerance: 0.01
    unit: s
    solution: z(t) = 1 − 2e^(−t/T₁). Setting z = 0 gives e^(−t/T₁) = ½, so t = T₁ ln 2 = 5 × 0.693 = 3.47 s.
  - id: q3
    type: numeric
    prompt: A qubit starts in |+⟩, so |r| = 1, and loses phase only, with r_x = 0.607 after 2 s. What is its purity, ½(1 + |r|²)?
    answer: 0.684
    tolerance: 0.005
    solution: "The length squared is |r|² = 0.607² = 0.368, so the purity is ½(1 + 0.368) = 0.684."
  - id: q4
    type: explain
    prompt: Why can T₂ never be longer than 2T₁?
    model: Energy loss itself destroys phase. When the qubit decays from |1⟩ to |0⟩, the superposition between them is lost, so the coherence cannot outlast the energy by more than a factor of two. Other noise can only add to the dephasing. The phase can therefore decay faster than 2T₁ would suggest, but never slower.
---

## The big picture

A perfect qubit is a point on the surface of the Bloch sphere. A real qubit is coupled to its surroundings, stray fields and heat, and its state slowly leaks away. Quantum computers need qubits that last long enough to finish a calculation, so measuring and understanding this decay is central. By the end you will be able to follow a qubit's state as it decays and say how pure it still is.

## Build the intuition

There are two different ways to lose a state. In the first, the qubit loses energy and falls from $|1\rangle$ toward $|0\rangle$. That is **relaxation**, with timescale $T_1$. In the second, the qubit's energy stays the same but the exact phase of a superposition drifts at random until its phase means nothing. That is **dephasing**, with timescale $T_2$.

On the Bloch sphere, relaxation lowers the arrow toward the north pole. Dephasing shortens the arrow's horizontal part. Either one pulls the arrow inside the sphere, and a point inside is a **mixed state**, a blend of possibilities that is less quantum than a state on the surface.

A coin gives a good picture of the centre of the sphere. A qubit at the centre is just a fair coin toss, with no quantum superposition left in it. A qubit on the surface is more like a coin that is balanced on its edge in a definite way. Moving inward means losing track of which definite state you have.

This is why decoherence is the central problem of quantum computing. A gate takes time, and the qubit has only about $T_2$ before its phase is gone. As an illustration, if a gate took $50\ \text{ns}$ and $T_2$ were $50\ \mu\text{s}$, you could run about $50\,\mu\text{s}/50\,\text{ns} = 1000$ gates before the state was badly spoiled. Longer-lived qubits and faster gates both help.

## The math

A state with Bloch vector $\mathbf r$ has the density matrix $\rho = \tfrac12(I + \mathbf r\cdot\boldsymbol\sigma)$. Noise acts on $\mathbf r$ simply:

$$z(t) = 1 + (z_0 - 1)\,e^{-t/T_1}, \qquad r_x(t),\ r_y(t) \propto e^{-t/T_2}$$

Three numbers summarise the state. The **purity** is 1 on the surface and $\tfrac12$ at the centre, the chance of 0 depends only on the height, and the **fidelity** with the ideal state measures how far the noise has pushed it:

$$\text{purity} = \tfrac12\left(1 + |\mathbf r|^2\right), \qquad P(0) = \frac{1+z}{2}, \qquad F = \tfrac12\left(1 + \mathbf r\cdot\mathbf r_\text{ideal}\right)$$

The two clocks are linked by $1/T_2 = 1/(2T_1) + 1/T_\varphi$, where $T_\varphi$ is the extra, pure dephasing. Since $1/T_\varphi \ge 0$, we get $T_2 \le 2T_1$.

<details>
<summary>Why does this step follow? Why does relaxation also shrink the horizontal part</summary>

Relaxation moves population from $|1\rangle$ to $|0\rangle$ with probability $\gamma = 1 - e^{-t/T_1}$. The amplitude of $|1\rangle$ falls by a factor $\sqrt{1-\gamma} = e^{-t/2T_1}$, and the coherence between the two states is proportional to that amplitude. So relaxation alone shrinks the horizontal part as $e^{-t/2T_1}$, which is a decay time of $2T_1$. This is the best case for the horizontal part, so $T_2$ can never be longer.

</details>

## Worked example

Start in $|+\rangle$ with $\mathbf r = (1, 0, 0)$, and use $T_1 = 6\ \text{s}$ and $T_2 = 4\ \text{s}$. Look at the state at $t = 3\ \text{s}$.

- Horizontal: $r_x = e^{-3/4} = 0.472$.
- Height: $z = 1 - e^{-3/6} = 0.393$.
- Length: $|\mathbf r| = \sqrt{0.472^2 + 0.393^2} = 0.615$, so the purity is $\tfrac12(1 + 0.378) = 0.689$.
- Chance of 0: $(1 + 0.393)/2 = 0.697$.
- Fidelity with the ideal $|+\rangle$: $\tfrac12(1 + 0.472) = 0.736$.

**Check.** The arrow has shrunk from length 1 to 0.615 and tilted up toward $|0\rangle$, which is what the prediction said. The chance of 0 has risen from 0.5 to 0.7.

## Try one yourself

A qubit starts in $|+\rangle$ with $T_1 = 10\ \text{s}$ and $T_2 = 5\ \text{s}$. Fill in the blanks at $t = 5\ \text{s}$, then open the answer.

- $r_x = e^{-t/T_2} = \_\_\_$
- $z = 1 - e^{-t/T_1} = \_\_\_$
- Purity $= \tfrac12(1 + r_x^2 + z^2) = \_\_\_$

<details>
<summary>Answer and full solution</summary>

$r_x = e^{-1} = 0.368$.

$z = 1 - e^{-0.5} = 0.393$.

$|\mathbf r|^2 = 0.135 + 0.155 = 0.290$, so the purity is $\tfrac12(1.290) = 0.645$.

</details>

## Common mistakes

- **Mixing up the two clocks.** $T_1$ is about energy and the poles. $T_2$ is about phase and the horizontal part.
- **Thinking noise always lowers the chance of 0.** Relaxation raises it, because the qubit falls toward $|0\rangle$.
- **Reading purity as the length of the arrow.** The purity is $\tfrac12(1 + |\mathbf r|^2)$, so it never falls below one half.
- **Choosing $T_2 > 2T_1$.** It is impossible, and the lab limits it.

## Where this shows up in the lab

Open the qubit lab, press H to start on the equator, switch noise on with $T_1 = 6\ \text{s}$ and $T_2 = 4\ \text{s}$, and press Let time pass. The arrow shortens and rises, and the readouts show the chance of 0, the purity and the fidelity changing. After about 3 seconds they match the worked example. Left to run, the arrow ends at the north pole.
