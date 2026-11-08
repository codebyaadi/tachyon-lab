<svelte:head>
	<title>Lab · Tachyon Lab</title>
	<meta name="description" content="Interactive simulations of classical and quantum mechanics." />
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Lab</h1>
<p class="mt-2 max-w-prose text-muted">
	Each simulation runs in your browser. Make a prediction, run it, and compare the result with the exact answer.
</p>

<ul class="mt-6 grid gap-3 sm:grid-cols-2">
	<li>
		<a href="/lab/projectile" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Projectile motion</div>
			<p class="mt-1 text-sm text-muted">
				Launch it with or without air drag, predict the landing point, and compare three integrators.
			</p>
			<p class="label mt-2">Lesson: <span class="underline underline-offset-2">Projectile motion</span></p>
		</a>
	</li>
	<li>
		<a href="/lab/oscillator" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Oscillators and phase space</div>
			<p class="mt-1 text-sm text-muted">
				A spring with damping and a driving force. See resonance, and watch Euler add energy that is not there.
			</p>
		</a>
	</li>
	<li>
		<a href="/lab/orbit" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Orbits and Kepler's laws</div>
			<p class="mt-1 text-sm text-muted">
				Launch a planet around a star and compare four integrators with the exact ellipse. See which ones conserve energy and angular momentum.
			</p>
		</a>
	</li>
	<li>
		<a href="/lab/decay" class="panel block p-4 hover:border-line-strong">
			<div class="font-medium">Exponential decay</div>
			<p class="mt-1 text-sm text-muted">Euler vs RK4 against the exact solution. Watch an integrator go unstable.</p>
		</a>
	</li>
</ul>
