/**
 * 色空間ユーティリティ。
 *
 * このゲームの肝は「ほんの少しだけ違う白」を作ることなので、
 * 単純な RGB の足し算ではなく CIELAB 上で動かし、
 * 知覚差は CIEDE2000 (ΔE00) で測る。
 */

const D65 = { x: 95.047, y: 100.0, z: 108.883 };

/** @param {string} hex - `#rrggbb` または `rrggbb` */
export function hexToRgb(hex) {
	const h = hex.replace('#', '');
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}

/** @param {number[]} rgb - 0-255 の 3 要素（範囲外はクランプ） */
export function rgbToHex(rgb) {
	return (
		'#' +
		rgb
			.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()
	);
}

function srgbToLinear(v) {
	const c = v / 255;
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
	const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	return v * 255;
}

/** sRGB (0-255) -> CIELAB (D65, 2°) */
export function rgbToLab([r, g, b]) {
	const lr = srgbToLinear(r);
	const lg = srgbToLinear(g);
	const lb = srgbToLinear(b);

	const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
	const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) * 100;
	const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) * 100;

	const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
	const fx = f(x / D65.x);
	const fy = f(y / D65.y);
	const fz = f(z / D65.z);

	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB -> sRGB (0-255, クランプなしの生値) */
export function labToRgbRaw([L, a, b]) {
	const fy = (L + 16) / 116;
	const fx = fy + a / 500;
	const fz = fy - b / 200;

	const finv = (t) => (t > 6 / 29 ? t * t * t : (108 / 841) * (t - 4 / 29));
	const x = finv(fx) * D65.x;
	const y = finv(fy) * D65.y;
	const z = finv(fz) * D65.z;

	const xn = x / 100;
	const yn = y / 100;
	const zn = z / 100;

	return [
		linearToSrgb(xn * 3.2404542 + yn * -1.5371385 + zn * -0.4985314),
		linearToSrgb(xn * -0.969266 + yn * 1.8760108 + zn * 0.041556),
		linearToSrgb(xn * 0.0556434 + yn * -0.2040259 + zn * 1.0572252)
	];
}

/** 生値が 0-255 に収まっているか（＝sRGB 色域内か） */
export function inGamut(rgbRaw) {
	return rgbRaw.every((v) => v >= -0.5 && v <= 255.5);
}

/**
 * CIEDE2000 色差。
 * 参考: Sharma, Wu & Dalal (2005) の定式化。
 */
export function deltaE00([L1, a1, b1], [L2, a2, b2]) {
	const kL = 1;
	const kC = 1;
	const kH = 1;

	const C1 = Math.hypot(a1, b1);
	const C2 = Math.hypot(a2, b2);
	const Cbar = (C1 + C2) / 2;

	const Cbar7 = Math.pow(Cbar, 7);
	const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

	const a1p = (1 + G) * a1;
	const a2p = (1 + G) * a2;
	const C1p = Math.hypot(a1p, b1);
	const C2p = Math.hypot(a2p, b2);

	const h1p = hueAngle(b1, a1p);
	const h2p = hueAngle(b2, a2p);

	const dLp = L2 - L1;
	const dCp = C2p - C1p;

	let dhp;
	if (C1p * C2p === 0) {
		dhp = 0;
	} else {
		dhp = h2p - h1p;
		if (dhp > 180) dhp -= 360;
		else if (dhp < -180) dhp += 360;
	}
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

	const Lbarp = (L1 + L2) / 2;
	const Cbarp = (C1p + C2p) / 2;

	let hbarp;
	if (C1p * C2p === 0) {
		hbarp = h1p + h2p;
	} else if (Math.abs(h1p - h2p) <= 180) {
		hbarp = (h1p + h2p) / 2;
	} else if (h1p + h2p < 360) {
		hbarp = (h1p + h2p + 360) / 2;
	} else {
		hbarp = (h1p + h2p - 360) / 2;
	}

	const T =
		1 -
		0.17 * Math.cos(rad(hbarp - 30)) +
		0.24 * Math.cos(rad(2 * hbarp)) +
		0.32 * Math.cos(rad(3 * hbarp + 6)) -
		0.2 * Math.cos(rad(4 * hbarp - 63));

	const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
	const Cbarp7 = Math.pow(Cbarp, 7);
	const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
	const Sl =
		1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
	const Sc = 1 + 0.045 * Cbarp;
	const Sh = 1 + 0.015 * Cbarp * T;
	const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

	return Math.sqrt(
		Math.pow(dLp / (kL * Sl), 2) +
			Math.pow(dCp / (kC * Sc), 2) +
			Math.pow(dHp / (kH * Sh), 2) +
			Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
	);
}

function hueAngle(b, ap) {
	if (b === 0 && ap === 0) return 0;
	const deg = (Math.atan2(b, ap) * 180) / Math.PI;
	return deg >= 0 ? deg : deg + 360;
}

function rad(deg) {
	return (deg * Math.PI) / 180;
}

/** 2 つの hex の ΔE00 */
export function hexDeltaE(hexA, hexB) {
	return deltaE00(rgbToLab(hexToRgb(hexA)), rgbToLab(hexToRgb(hexB)));
}
