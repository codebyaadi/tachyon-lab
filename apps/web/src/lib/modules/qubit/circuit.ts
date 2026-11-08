import { CIRCUIT_PATTERN, GATES, MAX_GATES } from './params';

export { CIRCUIT_PATTERN, MAX_GATES };

export type Step = { id: string; code: number; angle: number; label: string };

const isRotation = (id: string) => id === 'Rx' || id === 'Ry' || id === 'Rz';

/** One gate as it is written in the circuit text; only the three rotations carry an angle. */
export function gateToken(id: string, angleDeg: number): string {
	return isRotation(id) ? `${id}${Math.round(angleDeg)}` : id;
}

/** The text for a gate list, the inverse of parseCircuit. */
export function joinCircuit(tokens: string[]): string {
	return tokens.join('.');
}

/** Read a circuit text. Anything unrecognised is skipped, and the list is cut at MAX_GATES. */
export function parseCircuit(text: string): Step[] {
	const steps: Step[] = [];
	for (const raw of text.split('.')) {
		if (steps.length >= MAX_GATES) break;
		const m = /^(X|Y|Z|H|Sdg|S|T|R[xyz])(\d{1,3})?$/.exec(raw);
		if (!m) continue;
		const gate = GATES.find((g) => g.id === m[1]);
		if (!gate) continue;
		const rotation = isRotation(gate.id);
		if (rotation && m[2] === undefined) continue;
		const angle = rotation ? Math.min(360, Number(m[2])) : 0;
		steps.push({
			id: gate.id,
			code: gate.code,
			angle,
			label: rotation ? `${gate.label}(${angle}°)` : gate.label
		});
	}
	return steps;
}
