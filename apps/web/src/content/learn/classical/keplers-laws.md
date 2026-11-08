---
title: Kepler's laws and orbit shapes
summary: Three simple rules describe every orbit under gravity. Each planet sweeps equal areas in equal times, and its year depends only on the size of its orbit.
level: intermediate
minutes: 14
prerequisites: [classical/universal-gravitation, classical/angular-momentum, classical/central-forces-orbits]
sim: /lab/orbit
status: draft
predict:
  type: choice
  prompt: Planet B orbits the same star as planet A, with an orbit four times as large. How long is B's year compared with A's?
  options: [4 times as long, 8 times as long, 16 times as long]
  answer: 8 times as long
  reveal: The year grows faster than the size, because a bigger orbit is both longer and slower. Kepler's third law says the year squared is proportional to the size cubed. A size of 4 gives a year of 4 to the power 3/2, which is 8.
questions:
  - id: q1
    type: numeric
    prompt: An asteroid orbits the Sun with a semi-major axis of 4 AU. How long is its year, in Earth years?
    answer: 8
    tolerance: 0.05
    unit: years
    solution: In AU and years, T² = a³. With a = 4, T² = 64, so T = 8 years.
  - id: q2
    type: numeric
    prompt: Halley's comet returns every 76 years. What is the semi-major axis of its orbit, in AU?
    answer: 17.9
    tolerance: 0.1
    unit: AU
    solution: T² = a³ gives a = T^(2/3) = 76^(2/3). Since 76² = 5776 and the cube root of 5776 is 17.94, a ≈ 17.9 AU.
  - id: q3
    type: numeric
    prompt: A comet is at its farthest point, 3.0 AU from the Sun, moving at 2.0 km/s. At its closest point it is 1.0 AU from the Sun. How fast is it moving there?
    answer: 6
    tolerance: 0.05
    unit: km/s
    solution: At the two closest and farthest points the velocity is perpendicular to the line to the Sun, so angular momentum conservation gives r₁v₁ = r₂v₂. Then v₂ = 3.0 × 2.0 / 1.0 = 6.0 km/s.
  - id: q4
    type: explain
    prompt: Why does a planet sweep out equal areas in equal times?
    model: The Sun's pull on the planet always points straight at the Sun, so it exerts no twisting force about the Sun. The planet's angular momentum, its distance times its sideways speed times its mass, therefore stays fixed. The area swept per second is half that distance times that sideways speed, so it stays fixed too. Close to the Sun the planet moves faster, which makes up for the shorter distance.
---

## The big picture

Before telescopes could see more than a few moons, Johannes Kepler found three rules that describe every planet. They also describe comets, moons and satellites, because all of them move under the same kind of force. By the end you will be able to find an orbit's period from its size, and the speed at its closest and farthest points.

## Build the intuition

A planet is always falling toward the Sun and always missing it. Launch it sideways at just the right speed and it stays at the same distance, a circle. Launch it slower and it falls inward and swings round the Sun, closer and faster, then climbs back out. That gives an **ellipse** with the Sun at one **focus**, not at the centre.

The speed changes along the way because the Sun's pull speeds the planet up on the way in and slows it down on the way out. The planet is fastest at its closest point, called perihelion, and slowest at its farthest point, aphelion.

## The math

Kepler's three laws, written with the semi-major axis $a$ (half the long width of the ellipse):

1. Orbits are ellipses with the Sun at one focus.
2. A line from the Sun to the planet sweeps equal areas in equal times: $\dfrac{dA}{dt} = \dfrac{L}{2m}$, constant.
3. The period depends only on $a$:

$$T^2 = \frac{4\pi^2}{GM}\,a^3$$

Using years for $T$ and AU for $a$ around the Sun, the constants cancel and $T^2 = a^3$.

At perihelion and aphelion the velocity is perpendicular to the radius, so angular momentum conservation gives $r_p v_p = r_a v_a$. For an orbit with eccentricity $e$ the distances are $r_p = a(1-e)$ and $r_a = a(1+e)$. Dividing, the speed ratio is

$$\frac{v_p}{v_a} = \frac{r_a}{r_p} = \frac{1+e}{1-e}$$

<details>
<summary>Why does this step follow? Why does the third law have a cube</summary>

For a circular orbit of radius $r$, gravity supplies the inward force that keeps the planet turning: $GMm/r^2 = m\omega^2 r$ with $\omega = 2\pi/T$. Rearranging gives $T^2 = 4\pi^2 r^3/(GM)$. The cube appears because gravity weakens as $1/r^2$ and the circle gets longer in proportion to $r$. Kepler's ellipses give the same law with $r$ replaced by $a$.

</details>

## Worked example

Mars has $a = 1.524\ \text{AU}$ and $e = 0.0934$.

- Period: $T = 1.524^{3/2} = 1.881$ years, since $1.524^3 = 3.540$.
- Closest approach: $r_p = 1.524 \times (1 - 0.0934) = 1.382\ \text{AU}$.
- Farthest distance: $r_a = 1.524 \times (1 + 0.0934) = 1.666\ \text{AU}$.
- Speed ratio: $v_p/v_a = 1.0934/0.9066 = 1.206$.

**Check.** The ratio of distances, $1.666/1.382 = 1.206$, agrees with the ratio of speeds, as angular momentum conservation requires. Mars is moving about 21% faster at its closest point.

## Try one yourself

A planet has $a = 2.0\ \text{AU}$ and $e = 0.5$. Fill in the blanks, then open the answer.

- Period: $T = a^{3/2} = \_\_\_\ \text{years}$
- $r_p = a(1-e) = \_\_\_\ \text{AU}$ and $r_a = a(1+e) = \_\_\_\ \text{AU}$
- $v_p/v_a = \_\_\_$

<details>
<summary>Answer and full solution</summary>

$T = 2^{3/2} = 2.83$ years.

$r_p = 2.0 \times 0.5 = 1.0\ \text{AU}$ and $r_a = 2.0 \times 1.5 = 3.0\ \text{AU}$.

$v_p/v_a = 3.0/1.0 = 3$. The planet is three times as fast at perihelion as at aphelion.

</details>

## Common mistakes

- **Putting the Sun at the centre of the ellipse.** It is at one focus, off to the side.
- **Thinking the year depends on the planet's mass.** For a light planet it does not. Only the size of the orbit and the star's mass matter.
- **Using the semi-major axis as the distance at every moment.** It is the average of $r_p$ and $r_a$, and the planet is only at that distance twice per orbit.
- **Confusing equal areas with equal distances.** Equal areas means the speed changes, so the same stretch of path takes less time when the planet is close.

## Where this shows up in the lab

Open the orbit lab. A launch speed of $1.0$ times circular gives a perfect circle. Try $1.2$: the planet starts at its closest point and swings out to an ellipse with $a = 1.79$ times the starting radius, so its year is $1.79^{3/2} = 2.39$ times longer than a circular year at the same radius. At $0.8$ the start is the farthest point instead. The page lists $T^2/a^3$ next to $4\pi^2/\mu$, and both read 39.48 in the lab's units, whatever the launch speed. Choose Euler and the energy drifts upward, which breaks the conservation laws this lesson relies on. Velocity Verlet keeps them.
