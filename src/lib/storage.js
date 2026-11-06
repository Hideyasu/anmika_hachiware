/**
 * ベストスコアの保存。localStorage が使えない環境（プライベートモード等）でも
 * ゲーム自体は動き続けるように、読み書きは全部 try/catch で包む。
 */

const KEY = 'anmika-hachiware.best.v1';

/** @typedef {{score: number, level: number, deltaE: number | null}} Best */

/** @type {Best} */
export const emptyBest = { score: 0, level: 0, deltaE: null };

export function loadBest() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...emptyBest };
		const parsed = JSON.parse(raw);
		return {
			score: Number(parsed.score) || 0,
			level: Number(parsed.level) || 0,
			deltaE: typeof parsed.deltaE === 'number' ? parsed.deltaE : null
		};
	} catch {
		return { ...emptyBest };
	}
}

/**
 * 今回の記録をベストにマージして返す（各項目それぞれの自己ベストを保つ）。
 *
 * @param {Best} best
 * @param {{score: number, level: number, deltaE: number | null}} run
 * @returns {Best}
 */
export function mergeBest(best, run) {
	return {
		score: Math.max(best.score, run.score),
		level: Math.max(best.level, run.level),
		deltaE:
			run.deltaE === null
				? best.deltaE
				: best.deltaE === null
					? run.deltaE
					: Math.min(best.deltaE, run.deltaE)
	};
}

/** @param {Best} best */
export function saveBest(best) {
	try {
		localStorage.setItem(KEY, JSON.stringify(best));
	} catch {
		// 保存できなくても遊べる方が大事なので握りつぶす
	}
}
