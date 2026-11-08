import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		chain: tex(String.raw`\ddot u_j = \omega_0^2\,(u_{j-1} - 2u_j + u_{j+1}), \qquad u_0 = u_{N+1} = 0`, true),
		freq: tex(String.raw`\omega_k = 2\omega_0 \sin\frac{k\pi}{2(N+1)}, \qquad k = 1, \dots, N`, true),
		shape: tex(String.raw`u_j^{(k)} \propto \sin\frac{jk\pi}{N+1}`, true),
		sum: tex(
			String.raw`u_j(t) = \sum_{k=1}^{N}\left(a_k\cos\omega_k t + \frac{b_k}{\omega_k}\sin\omega_k t\right)\sin\frac{jk\pi}{N+1}`,
			true
		),
		energy: tex(String.raw`E = \tfrac12\sum_j \dot u_j^2 + \tfrac12\omega_0^2\sum_{j=0}^{N}(u_{j+1} - u_j)^2`),
		beat: tex(
			String.raw`\cos\omega_1 t + \cos\omega_2 t = 2\cos\frac{\omega_2 - \omega_1}{2}t\;\cos\frac{\omega_1 + \omega_2}{2}t`,
			true
		),
		euler: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \Delta t\; f(\mathbf y_n)`, true),
		rk4: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \tfrac{\Delta t}{6}\,(k_1 + 2k_2 + 2k_3 + k_4)`, true)
	}
});
