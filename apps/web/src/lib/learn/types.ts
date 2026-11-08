/** Shapes passed from the server loaders to the lesson components (safe for the client). */
import type { Predict, Question } from './schema';

/** Omit that keeps a union's variants separate (plain Omit would merge them). */
type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type RenderedPredict = DistOmit<Predict, 'prompt' | 'reveal'> & { promptHtml: string; revealHtml: string };

export type RenderedQuestion = DistOmit<Question, 'prompt' | 'solution' | 'model'> & {
	promptHtml: string;
	solutionHtml?: string;
	modelHtml?: string;
};
