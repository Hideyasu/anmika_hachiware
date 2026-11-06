import test from 'node:test';
import assert from 'node:assert/strict';

import { hexToRgb, rgbToHex, rgbToLab, labToRgbRaw, deltaE00, hexDeltaE } from '../src/lib/color.js';

test('hex と rgb は往復しても変わらない', () => {
	for (const hex of ['#FFFFFF', '#F8F4E6', '#DCDDDD', '#000000']) {
		assert.equal(rgbToHex(hexToRgb(hex)), hex);
	}
});

test('rgb -> lab -> rgb は 8bit 精度で完全に戻る', () => {
	for (const hex of ['#FFFFFF', '#FBFAF5', '#E6E6FA', '#808080', '#010203']) {
		assert.equal(rgbToHex(labToRgbRaw(rgbToLab(hexToRgb(hex)))), hex);
	}
});

test('白の L* はほぼ 100、無彩色の a*b* はほぼ 0', () => {
	const [L, a, b] = rgbToLab([255, 255, 255]);
	assert.ok(Math.abs(L - 100) < 1e-4, `L=${L}`);
	assert.ok(Math.abs(a) < 1e-3 && Math.abs(b) < 1e-3);

	const [, ga, gb] = rgbToLab([128, 128, 128]);
	assert.ok(Math.abs(ga) < 1e-3 && Math.abs(gb) < 1e-3);
});

test('deltaE00 は Sharma らの参照データと一致する', () => {
	/** @type {[number[], number[], number][]} */
	const cases = [
		[[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
		[[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
		[[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
		[[50, 2.5, 0], [50, 0, -2.5], 4.3065],
		[[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644]
	];
	for (const [a, b, expected] of cases) {
		assert.ok(
			Math.abs(deltaE00(a, b) - expected) < 1e-4,
			`${deltaE00(a, b)} !== ${expected}`
		);
	}
});

test('deltaE00 は対称で、同じ色なら 0', () => {
	const a = rgbToLab(hexToRgb('#FFFAF0'));
	const b = rgbToLab(hexToRgb('#F5F5DC'));
	assert.equal(deltaE00(a, a), 0);
	assert.ok(Math.abs(deltaE00(a, b) - deltaE00(b, a)) < 1e-12);
});

test('1 階調差の白は ΔE00 が 1 未満（＝sRGB で作れる最小の差）', () => {
	assert.ok(hexDeltaE('#FFFFFF', '#FFFFFE') < 1);
	assert.ok(hexDeltaE('#FFFFFF', '#FFFFFE') > 0);
});
