import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		accel: tex(String.raw`\mathbf a = -g\,\hat{\mathbf y} \;-\; (k + c\,|\mathbf v|)\,\mathbf v`, true),
		free: tex(String.raw`x = v_0\cos\theta\; t, \qquad y = y_0 + v_0\sin\theta\; t - \tfrac12 g t^2`, true),
		range: tex(String.raw`R = \frac{v_0^2 \sin 2\theta}{g} \quad (\text{level ground, } c = k = 0)`, true),
		linear: tex(
			String.raw`v_x = v_{x0}\,e^{-kt}, \qquad v_y = \left(v_{y0} + \tfrac{g}{k}\right)e^{-kt} - \tfrac{g}{k}`,
			true
		),
		linearPos: tex(
			String.raw`x = \frac{v_{x0}}{k}\left(1 - e^{-kt}\right), \qquad y = y_0 + \frac{v_{y0} + g/k}{k}\left(1 - e^{-kt}\right) - \frac{g\,t}{k}`,
			true
		),
		euler: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \Delta t\; f(\mathbf y_n)`, true),
		semi: tex(
			String.raw`\mathbf v_{n+1} = \mathbf v_n + \Delta t\;\mathbf a(\mathbf x_n, \mathbf v_n), \qquad \mathbf x_{n+1} = \mathbf x_n + \Delta t\;\mathbf v_{n+1}`,
			true
		),
		rk4: tex(String.raw`\mathbf y_{n+1} = \mathbf y_n + \tfrac{\Delta t}{6}\,(k_1 + 2k_2 + 2k_3 + k_4)`, true),
		land: tex(String.raw`\text{landing: } y(t_\ell) = 0,\ \text{found by interpolating the step that crosses } y = 0`),
		energy: tex(String.raw`E = \tfrac12|\mathbf v|^2 + g\,y \quad (\text{per unit mass})`)
	}
});
