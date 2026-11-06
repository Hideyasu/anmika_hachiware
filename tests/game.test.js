import test from 'node:test';
import assert from 'node:assert/strict';

import {
	createRound,
	gridSizeForLevel,
	targetDeltaEForLevel,
	shiftedColor,
	scoreForRound,
	mulberry32,
	MIN_DELTA_E
} from '../src/lib/game.js';
import { palette } from '../src/lib/palette.js';
import { hexDeltaE } from '../src/lib/color.js';

test('パレットに重複した hex はない', () => {
	assert.ok(palette.length >= 30);
	assert.equal(new Set(palette.map((p) => p.hex)).size, palette.length);
});

test('耳の色は黒い線にも白い顔にも埋もれない', () => {
	for (const { hex, name } of palette) {
		assert.ok(hexDeltaE('#FFFFFF', hex) >= 8, `${name} ${hex} は白に近すぎ`);
		assert.ok(hexDeltaE('#0D0906', hex) >= 30, `${name} ${hex} は黒に近すぎ`);
	}
});

test('盤面サイズはレベルとともに単調に増え、6 で頭打ち', () => {
	let prev = 0;
	for (let lv = 1; lv <= 40; lv++) {
		const size = gridSizeForLevel(lv);
		assert.ok(size >= prev, `lv${lv}`);
		assert.ok(size <= 6);
		prev = size;
	}
	assert.equal(gridSizeForLevel(40), 6);
});

test('目標色差は単調に減り、下限で下げ止まる', () => {
	let prev = Infinity;
	for (let lv = 1; lv <= 60; lv++) {
		const d = targetDeltaEForLevel(lv);
		assert.ok(d <= prev + 1e-9, `lv${lv}`);
		assert.ok(d >= MIN_DELTA_E);
		prev = d;
	}
	assert.equal(targetDeltaEForLevel(60), MIN_DELTA_E);
});

test('shiftedColor は必ず元と違う色を返す', () => {
	const rand = mulberry32(7);
	for (const { hex } of palette) {
		for (const target of [1, 3, 8, 14]) {
			const out = shiftedColor(hex, target, rand);
			assert.notEqual(out.hex, hex.toUpperCase(), `${hex} @ ΔE${target}`);
			assert.ok(out.deltaE > 0);
		}
	}
});

test('shiftedColor の実測色差は目標にきっちり乗る', () => {
	const rand = mulberry32(99);
	let worst = 0;
	for (const target of [1, 2, 4, 7, 14]) {
		for (const { hex } of palette) {
			const { deltaE } = shiftedColor(hex, target, rand);
			worst = Math.max(worst, Math.abs(deltaE - target));
			assert.ok(
				Math.abs(deltaE - target) < 0.25,
				`base ${hex} target ${target} -> ${deltaE}`
			);
		}
	}
	// 8bit の丸めがある以上ぴったりにはならないが、ここまで寄れば体感は目標どおり
	assert.ok(worst < 0.25, `worst ${worst}`);
});

test('実測色差はレベルが進むほど小さくなる', () => {
	const rand = mulberry32(31337);
	const measure = (lv) => {
		let sum = 0;
		for (let i = 0; i < 40; i++) sum += createRound(lv, rand).deltaE;
		return sum / 40;
	};
	assert.ok(measure(1) > measure(5));
	assert.ok(measure(5) > measure(10));
	assert.ok(measure(10) > measure(15));
});

test('createRound は 1 枚だけ違うタイルを置く', () => {
	const rand = mulberry32(2024);
	for (let lv = 1; lv <= 25; lv++) {
		const round = createRound(lv, rand);
		assert.equal(round.tiles.length, round.size * round.size);
		assert.ok(round.oddIndex >= 0 && round.oddIndex < round.tiles.length);

		const odd = round.tiles.filter((hex) => hex !== round.base.hex);
		assert.equal(odd.length, 1, `lv${lv} の仲間はずれが 1 枚じゃない`);
		assert.equal(round.tiles[round.oddIndex], round.oddHex);
	}
});

test('スコアは色差が小さいほど、残り時間が多いほど高い', () => {
	const round = { size: 4, deltaE: 1, timeLimit: 10000 };
	const easier = { ...round, deltaE: 6 };

	assert.ok(scoreForRound(round, 10000) > scoreForRound(round, 0));
	assert.ok(scoreForRound(round, 5000) > scoreForRound(easier, 5000));
	assert.ok(scoreForRound(round, 0) > 0);
});
