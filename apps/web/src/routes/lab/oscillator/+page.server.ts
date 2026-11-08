import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		ode: tex(String.raw`\ddot x + 2\zeta\omega_0\,\dot x + \omega_0^2\,x = F\cos(\omega_d t)`, true),
		free: tex(
			String.raw`x(t) = e^{-\zeta\omega_0 t}\left(x_0\cos\omega_1 t + \frac{v_0 + \zeta\omega_0 x_0}{\omega_1}\sin\omega_1 t\right), \qquad \omega_1 = \omega_0\sqrt{1-\zeta^2}`,
			true
		),
		steady: tex(String.raw`A = \frac{F}{\sqrt{(\omega_0^2 - \omega_d^2)^2 + (2\zeta\omega_0\omega_d)^2}}`, true),
		resonance: tex(String.raw`\omega_d = \omega_0 \;\Rightarrow\; A = \frac{F}{2\zeta\omega_0^2}`, true),
		energy: tex(String.raw`E = \tfrac12 v^2 + \tfrac12\omega_0^2 x^2 \quad (\text{per unit mass})`),
		euler: tex(String.raw`E_{n+1} = \left(1 + \omega_0^2\,\Delta t^2\right) E_n`, true),
		semi: tex(String.raw`v_{n+1} = v_n + \Delta t\;a(x_n, v_n), \qquad x_{n+1} = x_n + \Delta t\;v_{n+1}`, true),
		rk4: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \tfrac{\Delta t}{6}\,(k_1 + 2k_2 + 2k_3 + k_4)`, true)
	}
});
