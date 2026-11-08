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
			{ href: '/learn/classical/damped-oscillations', title: 'Damped oscillations' }
		]
	},
	{
		href: '/lab/orbit',
		title: "Orbits and Kepler's laws",
		blurb:
			'Launch a planet around a star and compare four integrators with the exact ellipse. See which ones conserve energy and angular momentum.',
		lessons: []
	},
	{
		href: '/lab/decay',
		title: 'Exponential decay',
		blurb: 'Euler vs RK4 against the exact solution. Watch an integrator go unstable.',
		lessons: []
	}
];
