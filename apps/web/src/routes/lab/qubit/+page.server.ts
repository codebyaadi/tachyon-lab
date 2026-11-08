import katex from 'katex';
import type { PageServerLoad } from './$types';

// Runs only at build time (prerender): KaTeX never ships to the browser,
// the page receives ready-made HTML for each equation.
const tex = (s: string, displayMode = false) => katex.renderToString(s, { displayMode, throwOnError: true });

export const load: PageServerLoad = () => ({
	eq: {
		state: tex(
			String.raw`|\psi\rangle = \cos\frac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\frac{\theta}{2}\,|1\rangle`,
			true
		),
		rho: tex(
			String.raw`\rho = \tfrac12\,(I + \mathbf r\cdot\boldsymbol\sigma), \qquad \mathbf r = (\langle X\rangle,\ \langle Y\rangle,\ \langle Z\rangle)`,
			true
		),
		prob: tex(String.raw`P(0) = \frac{1 + r_z}{2}, \qquad P(1) = \frac{1 - r_z}{2}`, true),
		gates: tex(
			String.raw`H = \tfrac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix},\quad S = \begin{pmatrix}1&0\\0&i\end{pmatrix},\quad T = \begin{pmatrix}1&0\\0&e^{i\pi/4}\end{pmatrix}`,
			true
		),
		identities: tex(String.raw`H^2 = I,\qquad HZH = X,\qquad S^2 = Z,\qquad T^2 = S`, true),
		rotation: tex(
			String.raw`R_{\hat n}(\alpha) = e^{-i\alpha\,\hat n\cdot\boldsymbol\sigma/2} = \cos\tfrac{\alpha}{2}\,I - i\sin\tfrac{\alpha}{2}\,(\hat n\cdot\boldsymbol\sigma)`,
			true
		),
		unitary: tex(String.raw`\rho \;\to\; U\rho U^\dagger`, true),
		kraus: tex(String.raw`\rho \;\to\; \sum_k K_k\,\rho\,K_k^\dagger, \qquad \sum_k K_k^\dagger K_k = I`, true),
		amp: tex(
			String.raw`K_0 = \begin{pmatrix}1&0\\0&\sqrt{1-\gamma}\end{pmatrix},\quad K_1 = \begin{pmatrix}0&\sqrt{\gamma}\\0&0\end{pmatrix}, \qquad \gamma = 1 - e^{-t/T_1}`,
			true
		),
		decay: tex(String.raw`r_z(t) = 1 + (r_z(0) - 1)\,e^{-t/T_1}, \qquad r_{x,y}(t) = r_{x,y}(0)\,e^{-t/T_2}`, true),
		t2: tex(String.raw`T_2 \le 2T_1`),
		purity: tex(String.raw`\operatorname{Tr}\rho^2 = \tfrac12\left(1 + |\mathbf r|^2\right)`),
		fidelity: tex(
			String.raw`F = \langle\psi_\text{ideal}|\rho|\psi_\text{ideal}\rangle = \tfrac12\left(1 + \mathbf r\cdot\mathbf r_\text{ideal}\right)`
		)
	}
});
