export type RangeTuple = [number, number]

export interface RangeOption {
	key: string
	label: string
	summary: string
	range: RangeTuple
}

const CURRENT_YEAR = new Date().getFullYear()

export const DEFAULT_AGE_RANGE: RangeTuple = [0, 21]
export const DEFAULT_RATING_RANGE: RangeTuple = [0, 10]
export const DEFAULT_CHAPTER_RANGE: RangeTuple = [0, 1000]
export const DEFAULT_RELEASE_YEAR_RANGE: RangeTuple = [1990, CURRENT_YEAR]

export const AGE_RATING_OPTIONS: RangeOption[] = [
	{ key: '18-plus', label: '18+', summary: '18+', range: [18, DEFAULT_AGE_RANGE[1]] },
	{ key: '16-plus', label: '16+', summary: '16+', range: [16, DEFAULT_AGE_RANGE[1]] },
	{ key: 'no-limit', label: 'Без возрастных ограничений', summary: 'Без ограничений', range: [0, 12] },
	{ key: 'any', label: 'Любой', summary: 'Любые', range: DEFAULT_AGE_RANGE }
]

export const RATING_OPTIONS: RangeOption[] = [
	{ key: 'any', label: 'Любой', summary: 'Любой', range: DEFAULT_RATING_RANGE },
	{ key: 'five-plus', label: '5+', summary: '5+', range: [5, DEFAULT_RATING_RANGE[1]] },
	{ key: 'six-plus', label: '6+', summary: '6+', range: [6, DEFAULT_RATING_RANGE[1]] },
	{ key: 'seven-plus', label: '7+', summary: '7+', range: [7, DEFAULT_RATING_RANGE[1]] },
	{ key: 'eight-plus', label: '8+', summary: '8+', range: [8, DEFAULT_RATING_RANGE[1]] },
	{ key: 'nine-plus', label: '9+', summary: '9+', range: [9, DEFAULT_RATING_RANGE[1]] },
	{ key: 'four-plus', label: '4+', summary: '4+', range: [4, DEFAULT_RATING_RANGE[1]] },
	{ key: 'three-plus', label: '3+', summary: '3+', range: [3, DEFAULT_RATING_RANGE[1]] },
	{ key: 'two-plus', label: '2+', summary: '2+', range: [2, DEFAULT_RATING_RANGE[1]] },
	{ key: 'one-plus', label: '1+', summary: '1+', range: [1, DEFAULT_RATING_RANGE[1]] }
]

export const CHAPTER_OPTIONS: RangeOption[] = [
	{ key: 'any', label: 'Любые', summary: 'Любые', range: DEFAULT_CHAPTER_RANGE },
	{ key: 'lt-50', label: '<50', summary: '<50', range: [0, 49] },
	{ key: '50-100', label: '50–100', summary: '50-100', range: [50, 100] },
	{ key: '100-200', label: '100–200', summary: '100-200', range: [100, 200] },
	{ key: '200-300', label: '200–300', summary: '200-300', range: [200, 300] },
	{ key: '300-400', label: '300–400', summary: '300-400', range: [300, 400] },
	{ key: '400-500', label: '400–500', summary: '400-500', range: [400, 500] },
	{ key: 'gt-500', label: '>500', summary: '>500', range: [501, DEFAULT_CHAPTER_RANGE[1]] }
]

export const rangesEqual = (a: RangeTuple, b: RangeTuple) => a[0] === b[0] && a[1] === b[1]

export const findRangeOption = (range: RangeTuple, options: RangeOption[]) =>
	options.find(option => rangesEqual(option.range, range))

export const cloneRange = (range: RangeTuple): RangeTuple => [range[0], range[1]]