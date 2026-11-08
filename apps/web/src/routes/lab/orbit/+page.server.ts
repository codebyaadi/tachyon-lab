import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		accel: tex(String.raw`\mathbf a = -\frac{\mu}{r^2}\,\hat{\mathbf r}, \qquad \mu = GM`, true),
		energy: tex(String.raw`E = \tfrac12 v^2 - \frac{\mu}{r}, \qquad L = x\,v_y - y\,v_x`, true),
		third: tex(
			String.raw`T = 2\pi\sqrt{\frac{a^3}{\mu}} \quad\Longleftrightarrow\quad \frac{T^2}{a^3} = \frac{4\pi^2}{\mu}`,
			true
		),
		ellipse: tex(String.raw`a = \frac{r_0}{2 - s^2}, \qquad e = |s^2 - 1|`, true),
		kepler: tex(String.raw`E_\text{anom} - e\sin E_\text{anom} = M = n\,t + M_0, \qquad n = \sqrt{\mu/a^3}`, true),
		euler: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \Delta t\; f(\mathbf y_n)`, true),
		semi: tex(
			String.raw`\mathbf v_{n+1} = \mathbf v_n + \Delta t\;\mathbf a(\mathbf x_n), \qquad \mathbf x_{n+1} = \mathbf x_n + \Delta t\;\mathbf v_{n+1}`,
			true
		),
		verlet: tex(
			String.raw`\mathbf v_{n+\frac12} = \mathbf v_n + \tfrac{\Delta t}{2}\mathbf a_n, \quad \mathbf x_{n+1} = \mathbf x_n + \Delta t\,\mathbf v_{n+\frac12}, \quad \mathbf v_{n+1} = \mathbf v_{n+\frac12} + \tfrac{\Delta t}{2}\mathbf a_{n+1}`,
			true
		),
		rk4: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \tfrac{\Delta t}{6}\,(k_1 + 2k_2 + 2k_3 + k_4)`, true)
	}
});
