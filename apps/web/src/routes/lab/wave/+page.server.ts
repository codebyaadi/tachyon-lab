import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		schrodinger: tex(
			String.raw`i\,\frac{\partial \psi}{\partial t} = -\frac{1}{2}\,\frac{\partial^2 \psi}{\partial x^2} + V(x)\,\psi`,
			true
		),
		born: tex(String.raw`\int_{-\infty}^{\infty} |\psi(x,t)|^2\,dx = 1`, true),
		split: tex(
			String.raw`\psi(t+\Delta t) \approx e^{-iV\Delta t/2}\;\mathcal{F}^{-1}\!\left[e^{-ik^2\Delta t/2}\,\mathcal{F}\!\left[e^{-iV\Delta t/2}\,\psi(t)\right]\right]`,
			true
		),
		packet: tex(
			String.raw`\psi(x,0) \propto \exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)e^{ik_0 x}, \qquad \sigma_x\,\sigma_p = \tfrac12`,
			true
		),
		spread: tex(String.raw`\sigma(t) = \sigma\sqrt{1 + \left(\frac{t}{2\sigma^2}\right)^2}`, true),
		uncertainty: tex(String.raw`\sigma_x\,\sigma_p \ge \tfrac12`),
		barrier: tex(
			String.raw`T = \left[\,1 + \frac{V_0^2\,\sinh^2(\kappa a)}{4E\,(V_0 - E)}\right]^{-1}, \qquad \kappa = \sqrt{2(V_0 - E)}`,
			true
		),
		levels: tex(String.raw`E_n = \frac{n^2\pi^2}{2a^2}, \qquad E_n = \omega\left(n + \tfrac12\right)`, true),
		step: tex(String.raw`T = \frac{4kk'}{(k+k')^2}, \qquad k' = \sqrt{k^2 - 2V_0}`, true),
		energy: tex(String.raw`E = \tfrac12 k_0^2`)
	}
});
