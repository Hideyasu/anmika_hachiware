/**
 * 「耳の色がちがうハチワレ探し」のラウンド生成と難易度カーブ。
 */

import { rgbToLab, labToRgbRaw, rgbToHex, hexToRgb, deltaE00, inGamut } from './color.js';
import { palette, mulberry32 } from './palette.js';

export const MAX_LIVES = 3;

/** レベルごとの盤面サイズ（1 辺のタイル数） */
export function gridSizeForLevel(level) {
	if (level <= 3) return 3;
	if (level <= 7) return 4;
	if (level <= 12) return 5;
	return 6;
}

/**
 * レベルごとの目標色差。
 * 耳は顔のうち 2 割ほどしかなく、ベタ塗りのタイルより格段に見分けにくいので、
 * 序盤は大きめ（ΔE 14）から始めて ΔE 1 で下げ止める。
 */
export const MIN_DELTA_E = 1;

export function targetDeltaEForLevel(level) {
	return Math.max(MIN_DELTA_E, 14 * Math.pow(0.82, level - 1));
}

/** レベルごとの制限時間 (ms)。盤面が広いほど長め。 */
export function timeLimitForLevel(level) {
	const size = gridSizeForLevel(level);
	return 7000 + size * 1800;
}

/**
 * base から ΔE00 が target に最も近い「別の色」を作る。
 *
 * Lab 上の向きを決めて二分探索で距離を合わせ、最後に 8bit へ丸める。
 * 難易度が上がるほど丸めの影響が支配的になる（ΔE 0.5 付近では 1 階調が全て）ので、
 * 候補の向きをいくつか試し、丸めたあとの実測 ΔE が目標にいちばん近いものを採用する。
 *
 * @param {string} baseHex
 * @param {number} target 狙う ΔE00
 * @param {() => number} rand
 * @returns {{hex: string, deltaE: number}} 実際に出来た色と、その実測色差
 */
export function shiftedColor(baseHex, target, rand = Math.random) {
	const base = baseHex.toUpperCase();
	const baseLab = rgbToLab(hexToRgb(base));
	const reach = Math.max(target, 2) * 1.5;

	const usable = (dir, scale) => {
		const lab = addScaled(baseLab, dir, scale);
		return inGamut(labToRgbRaw(lab));
	};

	/** @type {{hex: string, deltaE: number} | null} */
	let best = null;

	for (let attempt = 0; attempt < CANDIDATE_DIRECTIONS; attempt++) {
		const dir = pickDirection(baseLab, reach, usable, rand);
		const candidate = walkToTarget(baseLab, base, dir, target, usable);
		if (!candidate) continue;
		if (!best || Math.abs(candidate.deltaE - target) < Math.abs(best.deltaE - target)) {
			best = candidate;
		}
	}

	// 全候補が潰れた場合（base が色域の隅にいる等）の最終手段
	return best ?? forceDifferent(baseLab, base);
}

const CANDIDATE_DIRECTIONS = 12;

/** 使える向きを引くまで振り、駄目なら純白へ向かう向きを返す */
function pickDirection(baseLab, reach, usable, rand) {
	for (let i = 0; i < 16; i++) {
		const dir = randomUnitLabDirection(rand);
		if (usable(dir, reach)) return dir;
		const flipped = dir.map((v) => -v);
		if (usable(flipped, reach)) return flipped;
	}
	// 色域の隅にいるときは、無彩色の軸（L*=50）へ向かう向きなら必ず色域内に戻れる
	const toCenter = [50 - baseLab[0], -baseLab[1], -baseLab[2]];
	const len = Math.hypot(...toCenter);
	return len > 1e-9 ? toCenter.map((v) => v / len) : [-1, 0, 0];
}

/**
 * dir 方向に二分探索で target まで進み、8bit へ丸める。
 * 丸めて base と同色に潰れたら、差が出るまで伸ばす。
 */
function walkToTarget(baseLab, baseHex, dir, target, usable) {
	let lo = 0;
	let hi = Math.max(target * 4, 4);
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (deltaE00(baseLab, addScaled(baseLab, dir, mid)) < target) lo = mid;
		else hi = mid;
	}

	let scale = (lo + hi) / 2;
	let hex = rgbToHex(labToRgbRaw(addScaled(baseLab, dir, scale)));
	for (let i = 0; i < 64 && hex === baseHex; i++) {
		scale *= 1.25;
		if (!usable(dir, scale)) return null;
		hex = rgbToHex(labToRgbRaw(addScaled(baseLab, dir, scale)));
	}
	if (hex === baseHex) return null;

	return { hex, deltaE: deltaE00(baseLab, rgbToLab(hexToRgb(hex))) };
}

/** どうしても差が作れないときに、1 階調だけ動かして必ず別の色にする */
function forceDifferent(baseLab, baseHex) {
	const rgb = hexToRgb(baseHex);
	const channel = rgb.indexOf(Math.max(...rgb));
	const next = [...rgb];
	next[channel] += next[channel] >= 128 ? -1 : 1;
	const hex = rgbToHex(next);
	return { hex, deltaE: deltaE00(baseLab, rgbToLab(hexToRgb(hex))) };
}

function randomUnitLabDirection(rand) {
	// Lab は L* だけスケールが違うので、明度方向にやや重みを置く
	const z = rand() * 2 - 1;
	const theta = rand() * Math.PI * 2;
	const r = Math.sqrt(Math.max(0, 1 - z * z));
	return [z, r * Math.cos(theta), r * Math.sin(theta)];
}

function addScaled(lab, dir, scale) {
	return [lab[0] + dir[0] * scale, lab[1] + dir[1] * scale, lab[2] + dir[2] * scale];
}

/**
 * 1 ラウンド分の盤面を作る。
 *
 * @param {number} level 1 始まり
 * @param {() => number} rand
 */
export function createRound(level, rand = Math.random) {
	const size = gridSizeForLevel(level);
	const count = size * size;
	const base = palette[Math.floor(rand() * palette.length)];
	const target = targetDeltaEForLevel(level);
	const odd = shiftedColor(base.hex, target, rand);
	const oddIndex = Math.floor(rand() * count);

	const tiles = new Array(count).fill(base.hex.toUpperCase());
	tiles[oddIndex] = odd.hex;

	return {
		level,
		size,
		tiles,
		oddIndex,
		base,
		oddHex: odd.hex,
		targetDeltaE: target,
		deltaE: odd.deltaE,
		timeLimit: timeLimitForLevel(level)
	};
}

/**
 * 正解時のスコア。色差が小さいほど、残り時間が多いほど高い。
 *
 * @param {{size: number, deltaE: number, timeLimit: number}} round
 * @param {number} remainingMs
 */
export function scoreForRound(round, remainingMs) {
	const sizeBonus = round.size / 3;
	const timeRatio = Math.max(0, Math.min(1, remainingMs / round.timeLimit));
	const difficulty = Math.max(1, Math.min(10, 10 / Math.max(round.deltaE, 0.5)));
	return Math.round(100 * sizeBonus * difficulty * (1 + timeRatio));
}

export { mulberry32 };
