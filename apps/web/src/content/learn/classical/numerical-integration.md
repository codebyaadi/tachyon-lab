---
title: "Why we simulate: from Euler to RK4"
summary: Most equations of motion cannot be solved with a formula, so a computer steps through time. The recipe for each step decides whether energy stays put, wanders, or grows without limit.
level: intermediate
minutes: 15
prerequisites: [classical/differential-equations, classical/newtons-laws, classical/common-forces]
sim: /lab/integrators
status: draft
predict:
  type: choice
  prompt: You simulate a mass on a spring with the simplest rule, "new position = old position + velocity × dt" and "new velocity = old velocity + acceleration × dt", and a small time step. After many swings, what has happened to the energy?
  options: [It stays exactly the same, It slowly grows, It slowly shrinks]
  answer: It slowly grows
  reveal: The rule always uses the old position and the old velocity, so each step pushes the mass a little further out along its path than the true motion would. Every step adds a small amount of energy and none is taken away. The swing grows without limit, however small the step is, if you wait long enough.
questions:
  - id: q1
    type: numeric
    prompt: Euler's method on a spring with ω = 1 rad/s and dt = 0.1 s multiplies the energy by 1 + ω²dt² at every step. By what factor has the energy grown after 100 steps (10 s)?
    answer: 2.70
    tolerance: 0.01
    solution: Each step multiplies the energy by 1 + 1 × 0.01 = 1.01. After 100 steps the factor is 1.01¹⁰⁰ = 2.7048, so the energy has almost tripled in 10 seconds.
  - id: q2
    type: numeric
    prompt: RK4 is a fourth-order method, so its error shrinks like dt⁴. By what factor does the error fall when you halve the time step?
    answer: 16
    tolerance: 0.5
    solution: Halving dt multiplies dt⁴ by (1/2)⁴ = 1/16, so the error falls by a factor of 16. For Euler, a first-order method, the same halving only cuts the error in half.
  - id: q3
    type: choice
    prompt: You must simulate a planet for thousands of orbits with a fixed step. Which method keeps the energy from drifting?
    options: [Euler, Velocity Verlet, A smaller step with Euler]
    answer: Velocity Verlet
    solution: Velocity Verlet is symplectic. Its energy error wobbles within a narrow band and never grows. Euler gains energy steadily, and a smaller step only delays the problem.
  - id: q4
    type: explain
    prompt: Why can a method with a tiny error per step still give a badly wrong answer after many steps?
    model: The errors add up, and what matters is whether they add up in a consistent direction. In Euler's method every step adds a little energy and none is removed, so the small errors all push the same way and grow into a large one. A good method has errors that cancel or stay bounded, so they do not pile up. The size of the error per step is not the whole story. Its direction is.
---

## The big picture

Newton's second law tells you the acceleration at every instant. It does not hand you the position at a later time. For a spring or a falling ball you can find a formula, but for almost every real system, such as a planet pulled by several others, you cannot. So a computer takes a small step in time, uses the new state to work out the next acceleration, and repeats. By the end you will know why the choice of step rule matters and which rules to trust.

## Build the intuition

Imagine walking along a curved path while looking only at the direction you face right now. If you walk straight ahead for one step and then look again, you drift to the outside of the curve. After many steps you are far from the path.

That is **Euler's method**. It drifts outward on a spring or a planet's orbit, and the swing grows. The fix is not just a smaller step. Better rules, such as **RK4**, look at the direction at several places within a step. The **symplectic** rules, such as **semi-implicit Euler** and **velocity Verlet**, are built so that the energy error cannot grow.

## The math

For $\ddot{x} = -\omega^2 x$ the energy is $E = \tfrac12 v^2 + \tfrac12\omega^2 x^2$. Euler's rule is $x_{n+1} = x_n + v_n\,dt$ and $v_{n+1} = v_n - \omega^2 x_n\,dt$. Working out the new energy gives an exact result:

$$E_{n+1} = \left(1 + \omega^2 dt^2\right) E_n$$

It is always larger, by a fixed factor each step. Semi-implicit Euler uses the new velocity to update the position, $x_{n+1} = x_n + v_{n+1}\,dt$, and the energy then wobbles in a band instead. The **order** of a method says how its error shrinks with the step:

$$\text{error} \propto dt^{p}, \qquad p = 1 \text{ (Euler)},\ 2 \text{ (Verlet)},\ 4 \text{ (RK4)}$$

Accuracy costs work. Euler, semi-implicit Euler and velocity Verlet each need the force once per step. RK4 needs it four times, because it samples the direction at four places within the step. That extra work buys a much smaller error per step, but it does not make the energy error bounded.

A symplectic method such as semi-implicit Euler or Verlet does not follow the true energy exactly. It follows a slightly different energy exactly. The true energy wobbles around that one, and the wobble is the gap between the two, which is why it stays in a narrow band instead of growing.

<details>
<summary>Why does this step follow? Why is the factor exactly 1 + ω²dt²</summary>

Write the state as the pair $(\omega x, v)$. Euler's step is $\omega x_{n+1} = \omega x_n + (\omega\,dt)\,v_n$ and $v_{n+1} = v_n - (\omega\,dt)\,\omega x_n$. That is a rotation by a small angle combined with a stretch. The two new components squared add to $(1 + \omega^2 dt^2)(\omega^2 x_n^2 + v_n^2)$, since the cross terms cancel. A true spring would only rotate the pair, which keeps its length and the energy constant.

</details>

## Worked example

Take $\omega = 1\ \text{rad/s}$, $dt = 0.1\ \text{s}$ and start at $x = 1,\ v = 0$, so $E_0 = 0.5$.

- Euler multiplies the energy by $1.01$ per step. After 10 steps, $1.01^{10} = 1.105$. After 100 steps, $1.01^{100} = 2.70$.
- Semi-implicit Euler's energy stays between $0.952\,E_0$ and $1.053\,E_0$, even after 100,000 steps.
- Velocity Verlet stays between $0.9975\,E_0$ and $E_0$.
- RK4 loses only $0.0001\%$ in 100 steps, and 0.014% after 10,000 steps.

**Check.** Euler's formula gives 2.70, and a direct simulation gives the same number. The symplectic methods are bounded, while Euler's factor keeps compounding.

## Try one yourself

A spring with $\omega = 2\ \text{rad/s}$ is simulated with Euler and $dt = 0.05\ \text{s}$. Fill in the blanks, then open the answer.

- Energy factor per step: $1 + \omega^2 dt^2 = \_\_\_$
- One swing takes $2\pi/\omega = 3.14\ \text{s}$, which is $\_\_\_$ steps
- Energy factor after one swing: $\_\_\_$

<details>
<summary>Answer and full solution</summary>

$1 + 4 \times 0.0025 = 1.01$ per step.

$3.14/0.05 = 62.8$ steps.

$1.01^{62.8} = 1.87$. The energy has nearly doubled in a single swing.

</details>

## Common mistakes

- **Trusting a small step.** Euler's drift is slower with a smaller step, but it never stops.
- **Judging a method by one short run.** A method that looks fine for ten seconds can be far off after a thousand.
- **Thinking higher order always means better for long runs.** RK4 is very accurate per step, but only the symplectic methods guarantee bounded energy.
- **Mixing up the order of the updates.** Semi-implicit Euler and Euler differ only in whether the position update uses the old or the new velocity, and that single change matters.

## Where this shows up in the lab

Open the integrators page. On the spring, with the step $dt = 0.05$, Euler's energy error climbs steadily while semi-implicit Euler and velocity Verlet stay in a narrow band. Switch to the planet and the same pattern appears over many orbits. Make $dt$ larger and watch Euler's error grow faster, as the factor $1 + \omega^2 dt^2$ says it should.
