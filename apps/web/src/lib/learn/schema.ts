/**
 * Lesson frontmatter schema (docs/CURRICULUM.md §2). Validated at build time and in tests,
 * so a malformed lesson fails CI instead of shipping.
 */
import * as v from 'valibot';

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const STATUSES = ['draft', 'reviewed'] as const;

const text = v.pipe(v.string(), v.trim(), v.minLength(1, 'must not be empty'));
const ref = v.pipe(
	v.string(),
	v.regex(/^(classical|quantum)\/[a-z0-9]+(-[a-z0-9]+)*$/, 'must look like "classical/some-slug"')
);

const PredictChoice = v.object({
	type: v.literal('choice'),
	prompt: text,
	options: v.pipe(v.array(text), v.minLength(2)),
	answer: text,
	reveal: text
});
const PredictNumeric = v.object({
	type: v.literal('numeric'),
	prompt: text,
	answer: v.number(),
	tolerance: v.pipe(v.number(), v.minValue(0)),
	unit: v.optional(text),
	reveal: text
});
const PredictSketch = v.object({ type: v.literal('sketch'), prompt: text, reveal: text });

export const PredictSchema = v.pipe(
	v.variant('type', [PredictChoice, PredictNumeric, PredictSketch]),
	v.check((p) => p.type !== 'choice' || p.options.includes(p.answer), 'predict.answer must be one of predict.options')
);

const QuestionChoice = v.object({
	id: text,
	type: v.literal('choice'),
	prompt: text,
	options: v.pipe(v.array(text), v.minLength(2)),
	answer: text,
	solution: text
});
const QuestionNumeric = v.object({
	id: text,
	type: v.literal('numeric'),
	prompt: text,
	answer: v.number(),
	tolerance: v.pipe(v.number(), v.minValue(0)),
	unit: v.optional(text),
	solution: text
});
const QuestionExplain = v.object({ id: text, type: v.literal('explain'), prompt: text, model: text });

export const QuestionSchema = v.pipe(
	v.variant('type', [QuestionChoice, QuestionNumeric, QuestionExplain]),
	v.check((q) => q.type !== 'choice' || q.options.includes(q.answer), 'question.answer must be one of its options')
);

export const FrontmatterSchema = v.object({
	title: text,
	summary: text,
	level: v.picklist(LEVELS),
	minutes: v.pipe(v.number(), v.integer(), v.minValue(1)),
	prerequisites: v.optional(v.array(ref), []),
	sim: v.optional(v.pipe(v.string(), v.startsWith('/'))),
	status: v.picklist(STATUSES),
	predict: PredictSchema,
	questions: v.pipe(
		v.array(QuestionSchema),
		v.minLength(3, 'need 3 to 5 questions'),
		v.maxLength(5, 'need 3 to 5 questions'),
		v.check((qs) => new Set(qs.map((q) => q.id)).size === qs.length, 'question ids must be unique'),
		v.check((qs) => qs.some((q) => q.type === 'explain'), 'include at least one "explain why" question')
	)
});

export type Frontmatter = v.InferOutput<typeof FrontmatterSchema>;
export type Predict = Frontmatter['predict'];
export type Question = Frontmatter['questions'][number];
