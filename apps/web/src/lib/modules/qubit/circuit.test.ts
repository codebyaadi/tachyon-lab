import { describe, expect, it } from 'vite-plus/test';
import { CIRCUIT_PATTERN, gateToken, joinCircuit, MAX_GATES, parseCircuit } from './circuit';
import { DEFAULTS, SPECS } from './params';
import { parseParams } from '../../shell/params';

describe('qubit circuit text', () => {
	it('round-trips every gate', () => {
		const tokens = [
			'X',
			'Y',
			'Z',
			'H',
			'S',
			'Sdg',
			'T',
			gateToken('Rx', 90),
			gateToken('Ry', 45),
			gateToken('Rz', 360)
		];
		const text = joinCircuit(tokens);
		expect(CIRCUIT_PATTERN.test(text)).toBe(true);
		const steps = parseCircuit(text);
		expect(steps.map((s) => s.id)).toEqual(['X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Rx', 'Ry', 'Rz']);
		expect(steps.map((s) => s.angle)).toEqual([0, 0, 0, 0, 0, 0, 0, 90, 45, 360]);
		expect(joinCircuit(steps.map((s) => gateToken(s.id, s.angle)))).toBe(text);
	});

	it('only carries an angle on rotations', () => {
		expect(gateToken('H', 77)).toBe('H');
		expect(gateToken('Rx', 77)).toBe('Rx77');
		expect(parseCircuit('H.Rx90')[1].label).toBe('Rx(90°)');
	});

	it('rejects text that is not a circuit, and skips unknown gates when reading', () => {
		for (const bad of ['Q', 'H..T', 'H.', '.H', 'Rx', 'Rx1234', 'h', 'H T']) {
			expect(CIRCUIT_PATTERN.test(bad), bad).toBe(false);
		}
		expect(CIRCUIT_PATTERN.test('')).toBe(true);
		expect(parseCircuit('H.Rx.Q.T').map((s) => s.id)).toEqual(['H', 'T']);
	});

	it('never replays more than MAX_GATES', () => {
		expect(
			parseCircuit(
				Array(MAX_GATES + 40)
					.fill('H')
					.join('.')
			)
		).toHaveLength(MAX_GATES);
	});

	it('is validated like any other shared parameter', () => {
		expect(parseParams({ circuit: 'H.T.H' }, SPECS, DEFAULTS).circuit).toBe('H.T.H');
		expect(parseParams({ circuit: 'drop table' }, SPECS, DEFAULTS).circuit).toBe(DEFAULTS.circuit);
		expect(parseParams({ circuit: 'H.'.repeat(400) }, SPECS, DEFAULTS).circuit).toBe(DEFAULTS.circuit);
	});
});
