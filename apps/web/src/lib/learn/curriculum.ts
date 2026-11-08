/**
 * The full map of topics, in teaching order. This is the single source of truth:
 * the Learn index is built from it, and a topic is "written" when a lesson file with
 * the same slug exists in src/content/learn/<track>/<slug>.md.
 *
 * Add a topic here first, then write its lesson. Tests keep the two in sync.
 */
export type Track = 'classical' | 'quantum';

export type Topic = { slug: string; title: string };
export type Section = { id: string; title: string; blurb: string; topics: Topic[] };
export type TrackInfo = { title: string; blurb: string; sections: Section[] };

export const TRACKS: Track[] = ['classical', 'quantum'];

export const CURRICULUM: Record<Track, TrackInfo> = {
	classical: {
		title: 'Classical mechanics',
		blurb: 'How everyday objects move, from a thrown ball to the planets, and the elegant reformulations behind it.',
		sections: [
			{
				id: 'foundations',
				title: 'Foundations',
				blurb: 'The tools every later lesson uses.',
				topics: [
					{ slug: 'units-and-dimensions', title: 'Units, dimensions and estimation' },
					{ slug: 'vectors', title: 'Vectors and coordinate systems' },
					{ slug: 'calculus-for-physics', title: 'Calculus for physics: rates and accumulation' },
					{ slug: 'differential-equations', title: 'Differential equations: laws as rules for change' }
				]
			},
			{
				id: 'motion',
				title: 'Describing motion',
				blurb: 'Kinematics: how things move, before asking why.',
				topics: [
					{ slug: 'describing-motion', title: 'Describing motion' },
					{ slug: 'projectile-motion', title: 'Projectile motion' },
					{ slug: 'relative-motion', title: 'Relative motion and reference frames' },
					{ slug: 'circular-motion', title: 'Circular motion' }
				]
			},
			{
				id: 'newton',
				title: "Newton's laws",
				blurb: 'Why things move: forces and acceleration.',
				topics: [
					{ slug: 'newtons-laws', title: "Newton's three laws" },
					{ slug: 'common-forces', title: 'Gravity, normal force, tension, friction and springs' },
					{ slug: 'free-body-diagrams', title: 'Free-body diagrams and problem solving' },
					{ slug: 'drag', title: 'Drag and terminal velocity' },
					{ slug: 'numerical-integration', title: 'Why we simulate: from Euler to RK4' }
				]
			},
			{
				id: 'energy-momentum',
				title: 'Energy and momentum',
				blurb: 'Quantities that stay constant, and what that buys you.',
				topics: [
					{ slug: 'energy-conservation', title: 'Work, energy and conservation of energy' },
					{ slug: 'potential-energy-curves', title: 'Potential energy curves and equilibrium' },
					{ slug: 'momentum-and-impulse', title: 'Momentum, impulse and collisions' },
					{ slug: 'center-of-mass', title: 'Centre of mass and systems of particles' },
					{ slug: 'rocket-motion', title: 'Variable mass and rocket motion' }
				]
			},
			{
				id: 'oscillations',
				title: 'Oscillations',
				blurb: 'Back-and-forth motion, the pattern behind clocks, bridges and atoms.',
				topics: [
					{ slug: 'simple-harmonic-motion', title: 'Simple harmonic motion' },
					{ slug: 'damped-oscillations', title: 'Damped oscillations' },
					{ slug: 'driven-oscillations-resonance', title: 'Driven oscillations and resonance' },
					{ slug: 'pendulum', title: 'The pendulum and nonlinear oscillations' },
					{ slug: 'phase-space', title: 'Phase space: seeing the whole motion at once' }
				]
			},
			{
				id: 'gravitation',
				title: 'Gravitation and central forces',
				blurb: 'Planets, orbits and the effective potential.',
				topics: [
					{ slug: 'universal-gravitation', title: 'Universal gravitation' },
					{ slug: 'angular-momentum', title: 'Torque and angular momentum' },
					{ slug: 'central-forces-orbits', title: 'Central forces and the effective potential' },
					{ slug: 'keplers-laws', title: "Kepler's laws and orbit shapes" },
					{ slug: 'orbit-perturbations', title: 'Precession and perturbed orbits' }
				]
			},
			{
				id: 'rigid-bodies',
				title: 'Rotation and rigid bodies',
				blurb: 'Spinning things.',
				topics: [
					{ slug: 'moment-of-inertia', title: 'Moment of inertia and rotational dynamics' },
					{ slug: 'rolling-motion', title: 'Rolling motion' },
					{ slug: 'gyroscopes-precession', title: 'Gyroscopes and precession' },
					{ slug: 'non-inertial-frames', title: 'Non-inertial frames: centrifugal and Coriolis forces' }
				]
			},
			{
				id: 'analytical',
				title: 'Lagrangian and Hamiltonian mechanics',
				blurb: 'The same physics from a more powerful point of view; the bridge to quantum mechanics.',
				topics: [
					{ slug: 'calculus-of-variations', title: 'Calculus of variations and the principle of least action' },
					{ slug: 'lagrangian-mechanics', title: 'Lagrangian mechanics and Euler–Lagrange equations' },
					{ slug: 'constraints-generalized-coordinates', title: 'Constraints and generalized coordinates' },
					{ slug: 'noether-symmetry', title: "Symmetry and Noether's theorem" },
					{ slug: 'hamiltonian-mechanics', title: "Hamiltonian mechanics and Hamilton's equations" },
					{ slug: 'poisson-brackets', title: 'Poisson brackets and canonical transformations' }
				]
			},
			{
				id: 'coupled-chaos',
				title: 'Coupled systems, waves and chaos',
				blurb: 'Many parts moving together, and when prediction breaks down.',
				topics: [
					{ slug: 'coupled-oscillators', title: 'Coupled oscillators and normal modes' },
					{ slug: 'waves-on-a-string', title: 'Waves on a string and the wave equation' },
					{ slug: 'fourier-analysis', title: 'Fourier analysis: building any shape from waves' },
					{ slug: 'dispersion', title: 'Dispersion, phase and group velocity' },
					{ slug: 'chaos', title: 'Chaos, the double pendulum and Lyapunov exponents' }
				]
			},
			{
				id: 'beyond',
				title: 'Beyond Newton (overview)',
				blurb: 'Where classical mechanics stretches and where it breaks.',
				topics: [
					{ slug: 'special-relativity', title: 'Special relativity in one lesson' },
					{ slug: 'continuum-fluids', title: 'Continuum mechanics and fluids: a first look' },
					{ slug: 'limits-of-classical-physics', title: 'The limits of classical physics' }
				]
			}
		]
	},
	quantum: {
		title: 'Quantum mechanics',
		blurb: 'How the very small behaves: waves of probability, discrete energies, and spin.',
		sections: [
			{
				id: 'origins',
				title: 'Why quantum mechanics',
				blurb: 'The experiments that broke classical physics.',
				topics: [
					{ slug: 'why-quantum', title: 'Why we need quantum mechanics' },
					{ slug: 'blackbody-photoelectric', title: 'Blackbody radiation and the photoelectric effect' },
					{ slug: 'atomic-spectra-bohr', title: 'Atomic spectra and the Bohr model' },
					{ slug: 'wave-particle-duality', title: 'Wave–particle duality and the double slit' }
				]
			},
			{
				id: 'wavefunction',
				title: 'The wavefunction',
				blurb: 'The central object of quantum mechanics.',
				topics: [
					{ slug: 'wavefunction-born-rule', title: 'The wavefunction and the Born rule' },
					{ slug: 'expectation-uncertainty', title: 'Expectation values and uncertainty' },
					{ slug: 'schrodinger-equation', title: 'The Schrödinger equation' },
					{ slug: 'stationary-states', title: 'Stationary states and the time-independent equation' },
					{ slug: 'probability-current', title: 'Probability current and conservation of probability' }
				]
			},
			{
				id: 'one-dimension',
				title: 'Quantum mechanics in one dimension',
				blurb: 'Solvable systems that teach the key ideas.',
				topics: [
					{ slug: 'free-particle-wavepackets', title: 'Free particles and wave packets' },
					{ slug: 'infinite-well', title: 'The infinite square well' },
					{ slug: 'harmonic-oscillator', title: 'The quantum harmonic oscillator' },
					{ slug: 'finite-well', title: 'The finite square well and bound states' },
					{ slug: 'delta-potential', title: 'The delta-function potential' },
					{ slug: 'scattering-tunneling', title: 'Scattering and quantum tunnelling' },
					{ slug: 'double-well-superposition', title: 'Double wells, superposition and revivals' }
				]
			},
			{
				id: 'formalism',
				title: 'The mathematical framework',
				blurb: 'States as vectors, observables as operators.',
				topics: [
					{ slug: 'linear-algebra-for-quantum', title: 'Linear algebra for quantum mechanics' },
					{ slug: 'hilbert-space-dirac', title: 'Hilbert space and Dirac notation' },
					{ slug: 'operators-observables', title: 'Operators, observables and Hermiticity' },
					{ slug: 'commutators-uncertainty', title: 'Commutators and the uncertainty principle' },
					{ slug: 'measurement-collapse', title: 'Measurement and collapse' },
					{ slug: 'time-evolution-ehrenfest', title: "Time evolution and Ehrenfest's theorem" },
					{ slug: 'classical-limit', title: 'The classical limit and the correspondence principle' }
				]
			},
			{
				id: 'three-dimensions',
				title: 'Three dimensions and atoms',
				blurb: 'From a line to the real world.',
				topics: [
					{ slug: 'schrodinger-3d', title: 'The Schrödinger equation in three dimensions' },
					{ slug: 'angular-momentum-quantum', title: 'Angular momentum and spherical harmonics' },
					{ slug: 'hydrogen-atom', title: 'The hydrogen atom' },
					{ slug: 'identical-particles', title: 'Identical particles and the Pauli exclusion principle' },
					{ slug: 'periodic-table', title: 'Atoms and the periodic table' }
				]
			},
			{
				id: 'spin-qubits',
				title: 'Spin and qubits',
				blurb: 'The simplest quantum systems of all.',
				topics: [
					{ slug: 'spin-half', title: 'Spin-½ and the Pauli matrices' },
					{ slug: 'bloch-sphere', title: 'The qubit and the Bloch sphere' },
					{ slug: 'quantum-gates', title: 'Quantum gates as rotations' },
					{ slug: 'two-level-rabi', title: 'Two-level systems and Rabi oscillations' },
					{ slug: 'density-matrix-decoherence', title: 'Density matrices and decoherence' }
				]
			},
			{
				id: 'approximation',
				title: 'Approximation methods',
				blurb: 'What to do when an exact answer does not exist.',
				topics: [
					{ slug: 'perturbation-theory', title: 'Time-independent perturbation theory' },
					{ slug: 'variational-method', title: 'The variational method' },
					{ slug: 'wkb-approximation', title: 'The WKB approximation' },
					{ slug: 'time-dependent-perturbation', title: 'Time-dependent perturbation theory' }
				]
			},
			{
				id: 'beyond',
				title: 'Beyond a single particle',
				blurb: 'Entanglement and the modern picture.',
				topics: [
					{ slug: 'entanglement', title: 'Entanglement' },
					{ slug: 'bell-inequalities', title: "Bell's theorem and the EPR paradox" },
					{ slug: 'path-integral', title: 'The path integral view' },
					{ slug: 'quantum-computing-intro', title: 'A first look at quantum computing' },
					{ slug: 'interpretations', title: 'Interpretations of quantum mechanics' }
				]
			}
		]
	}
};

/**
 * Topics no v1 simulation module depends on. They complete the subject and are written
 * after launch (docs/CURRICULUM.md §1). Everything else is Core and ships with its module.
 */
const EXTENDED = new Set([
	// classical (12)
	'relative-motion',
	'momentum-and-impulse',
	'center-of-mass',
	'rocket-motion',
	'moment-of-inertia',
	'rolling-motion',
	'gyroscopes-precession',
	'non-inertial-frames',
	'poisson-brackets',
	'special-relativity',
	'continuum-fluids',
	'limits-of-classical-physics',
	// quantum (16)
	'delta-potential',
	'double-well-superposition',
	'schrodinger-3d',
	'angular-momentum-quantum',
	'hydrogen-atom',
	'identical-particles',
	'periodic-table',
	'perturbation-theory',
	'variational-method',
	'wkb-approximation',
	'time-dependent-perturbation',
	'entanglement',
	'bell-inequalities',
	'path-integral',
	'quantum-computing-intro',
	'interpretations'
]);

export type Tier = 'core' | 'extended';
export const tierOf = (slug: string): Tier => (EXTENDED.has(slug) ? 'extended' : 'core');

export type TopicInfo = Topic & { track: Track; section: Section; tier: Tier };

/** Every topic of a track, in teaching order. */
export const allTopics = (track: Track): TopicInfo[] =>
	CURRICULUM[track].sections.flatMap((section) =>
		section.topics.map((t) => ({ ...t, track, section, tier: tierOf(t.slug) }))
	);

/** Every topic of every track, classical first: the global teaching order. */
export const orderedTopics = (): TopicInfo[] => TRACKS.flatMap(allTopics);
