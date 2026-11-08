<svelte:head>
	<title>Tachyon Lab</title>
	<meta name="description" content="Interactive classical and quantum mechanics simulations that run in your browser. Predict, run, compare." />
</svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Tachyon Lab</h1>
<p class="mt-2 max-w-prose text-lg text-muted">
	Interactive classical and quantum mechanics in your browser. Make a guess, run the simulation, then check it against theory.
</p>

<ol class="mt-6 max-w-prose list-inside list-decimal space-y-1 text-muted">
	<li><span class="text-ink">Predict</span> what will happen.</li>
	<li><span class="text-ink">Run</span> the simulation.</li>
	<li><span class="text-ink">Compare</span> with the exact answer.</li>
</ol>

<p class="mt-6"><a href="/learn" class="btn btn-primary">Start learning</a></p>

<h2 class="mt-10 text-sm font-semibold">Modules</h2>
<ul class="mt-3 grid gap-3 sm:grid-cols-2">
	<li>
		<a href="/lab/decay" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Exponential decay</div>
			<p class="mt-1 text-sm text-muted">Euler vs RK4 against the exact solution. Watch an integrator go unstable.</p>
		</a>
	</li>
	<li>
		<a href="/lab/projectile" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Projectile motion</div>
			<p class="mt-1 text-sm text-muted">Launch it with or without air drag, predict the landing point, compare Euler, semi-implicit Euler and RK4.</p>
		</a>
	</li>
	{#each [['Oscillators & phase space', 'Resonance, damping, pendulum']] as [t, d] (t)}
		<li class="panel p-4 opacity-60">
			<div class="font-medium">{t} <span class="label ml-1">coming next</span></div>
			<p class="mt-1 text-sm text-muted">{d}</p>
		</li>
	{/each}
</ul>
