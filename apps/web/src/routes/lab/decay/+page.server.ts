import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: false });

export const load: PageServerLoad = () => ({
	eq: {
		ode: tex(String.raw`\frac{dy}{dt} = -\lambda y, \qquad y(0)=y_0`, true),
		exact: tex(String.raw`y(t) = y_0\, e^{-\lambda t}`, true),
		euler: tex(String.raw`y_{n+1} = y_n + \Delta t\, f(t_n, y_n) = (1-\lambda\Delta t)\, y_n`, true),
		rk4: tex(String.raw`y_{n+1} = y_n + \tfrac{\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4)`, true),
		stab: tex(String.raw`|1-\lambda\Delta t| < 1 \iff \lambda\Delta t < 2`)
	}
});
