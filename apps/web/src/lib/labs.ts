/** The simulations, in the order they are listed on the home page and the lab index. */
export type LabInfo = {
	href: string;
	title: string;
	blurb: string;
	/** Lessons that teach what the lab shows. */
	lessons: { href: string; title: string }[];
};

export const LABS: LabInfo[] = [
	{
		href: '/lab/projectile',
		title: 'Projectile motion',
		blurb: 'Launch it with or without air drag, predict the landing point, and compare three integrators.',
		lessons: [{ href: '/learn/classical/projectile-motion', title: 'Projectile motion' }]
	},
	{
		href: '/lab/oscillator',
		title: 'Oscillators and phase space',
		blurb: 'A spring with damping and a driving force. See resonance, and watch Euler add energy that is not there.',
		lessons: [
			{ href: '/learn/classical/simple-harmonic-motion', title: 'Simple harmonic motion' },
			{ href: '/learn/classical/damped-oscillations', title: 'Damped oscillations' },
			{ href: '/learn/classical/driven-oscillations-resonance', title: 'Driven oscillations and resonance' }
		]
	},
	{
		href: '/lab/pendulum',
		title: 'The pendulum',
		blurb: 'Why big swings are slower, where swinging turns into spinning, and how phase space shows the boundary.',
		lessons: [{ href: '/learn/classical/pendulum', title: 'The pendulum and nonlinear oscillations' }]
	},
	{
		href: '/lab/coupled',
		title: 'Coupled oscillators',
		blurb:
			'Masses joined by springs. Watch energy travel along the chain, then find the normal modes that make it simple.',
		lessons: []
	},
	{
		href: '/lab/orbit',
		title: "Orbits and Kepler's laws",
		blurb:
			'Launch a planet around a star and compare four integrators with the exact ellipse. See which ones conserve energy and angular momentum.',
		lessons: [{ href: '/learn/classical/keplers-laws', title: "Kepler's laws and orbit shapes" }]
	},
	{
		href: '/lab/integrators',
		title: 'Which integrator keeps energy?',
		blurb:
			'Euler, semi-implicit Euler, RK4 and velocity Verlet side by side. See which energy errors grow and which stay bounded.',
		lessons: []
	},
	{
		href: '/lab/qubit',
		title: 'The qubit and the Bloch sphere',
		blurb: 'Turn a qubit with quantum gates, then switch on noise and watch its state decay.',
		lessons: [{ href: '/learn/quantum/bloch-sphere', title: 'The qubit and the Bloch sphere' }]
	},
	{
		href: '/lab/decay',
		title: 'Exponential decay',
		blurb: 'Euler vs RK4 against the exact solution. Watch an integrator go unstable.',
		lessons: []
	}
];
