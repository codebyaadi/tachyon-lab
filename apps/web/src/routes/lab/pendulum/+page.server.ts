import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		ode: tex(String.raw`\ddot\theta = -\omega_0^2 \sin\theta - 2\zeta\omega_0\,\dot\theta + F\cos(\omega_d t)`, true),
		small: tex(
			String.raw`\sin\theta \approx \theta \;\Rightarrow\; \ddot\theta = -\omega_0^2\theta, \qquad T_0 = \frac{2\pi}{\omega_0}`,
			true
		),
		period: tex(String.raw`T = \frac{4}{\omega_0}\,K(k), \qquad k = \sin\frac{\theta_\text{max}}{2}`, true),
		exact: tex(
			String.raw`\sin\frac{\theta}{2} = k\,\operatorname{cd}(\omega_0 t \mid k^2) \quad(\text{released from rest at } \theta_0)`,
			true
		),
		energy: tex(String.raw`E = \tfrac12\dot\theta^2 + \omega_0^2\,(1 - \cos\theta)`),
		separatrix: tex(String.raw`\dot\theta = \pm\,2\omega_0\cos\frac{\theta}{2}`, true),
		euler: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \Delta t\; f(\mathbf y_n)`, true),
		semi: tex(
			String.raw`\omega_{n+1} = \omega_n + \Delta t\;a(\theta_n, \omega_n), \qquad \theta_{n+1} = \theta_n + \Delta t\;\omega_{n+1}`,
			true
		),
		rk4: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \tfrac{\Delta t}{6}\,(k_1 + 2k_2 + 2k_3 + k_4)`, true)
	}
});
