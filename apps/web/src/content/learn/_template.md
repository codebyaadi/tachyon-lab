---
title: Topic title (matches curriculum.ts)
summary: One sentence shown in the index and search results.
level: beginner # beginner | intermediate | advanced
minutes: 10 # honest reading time
prerequisites: [] # e.g. [classical/describing-motion]; topics that come EARLIER in curriculum.ts
# sim: /lab/projectile      # optional: an existing simulation route
status: draft # draft | reviewed (set to reviewed only after you have derived the key steps by hand)
predict: # "Predict first": one question answered BEFORE reading. Shown at the top, revealed in Answers.
  type: choice # choice | numeric | sketch
  prompt: A question whose answer the reader can guess before learning the idea.
  options: [First option, Second option, Third option]
  answer: Second option
  reveal: Two or three sentences explaining why, in plain words.
questions: # "Check yourself": 3 to 5, at least one "explain" (also feeds the spaced-review queue)
  - id: q1
    type: numeric # numeric | choice | explain
    prompt: A recall question with a number.
    answer: 1
    tolerance: 0.05
    unit: m
    solution: The full working, not just the number.
  - id: q2
    type: choice
    prompt: A conceptual question.
    options: [Yes, No]
    answer: Yes
    solution: Why that option is right.
  - id: q3
    type: explain
    prompt: Explain why something happens.
    model: A model answer in two or three sentences.
---

<!--
  Write the seven sections below, in this order, as "##" headings (a test enforces it).
  Predict first, Check yourself and Answers are generated from the frontmatter above.
  Standard: plain words first; every step derived; every symbol defined with units;
  real numbers checked a second way; 300-1,200 words (aim for 700-1,000).
  Collapsed content uses <details><summary>...</summary> ... </details> with blank lines
  around the Markdown inside. Full standard: docs/CURRICULUM.md §2.
-->

## The big picture

Three sentences: what this is, why it matters, what you will be able to do.

## Build the intuition

An everyday picture or analogy, before any equation.

## The math

Derive it step by step. Define every symbol where it first appears, with units.

<details>
<summary>Why does this step follow?</summary>

A short explanation of the reasoning behind one non-obvious step.

</details>

## Worked example

Real numbers, solved, then checked a second way.

## Try one yourself

The same kind of problem with some steps left blank.

<details>
<summary>Answer and full solution</summary>

The complete solution.

</details>

## Common mistakes

- The error learners actually make, and why it is wrong.

## Where this shows up in the lab

Which simulation to open and what to look for, then the next lesson.
