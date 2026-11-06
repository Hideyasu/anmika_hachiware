<script>
	/**
	 * 盤面。ハチワレを行ごとに少しずつ重ねて並べる（下の段の耳が上の段のあごを隠す）。
	 * 各ハチワレは「耳の色のベタ塗り（耳の形で切り抜き）」の上に、
	 * 耳の部分だけ抜いた共通の線画を重ねて描く。耳の色以外は全員まったく同じ画像。
	 */
	import { base } from '$app/paths';

	let {
		round,
		locked = false,
		pickedIndex = null,
		revealIndex = null,
		onpick
	} = $props();

	/** 素材 272×211 の縦横比 */
	const ASPECT = 211 / 272;
	/** 1 段あたりの送り（スプライトの高さに対する比率） */
	const ROW_STEP = 0.8;

	const size = $derived(round.size);
	/** 盤面の高さ（幅を 1 とした比率） */
	const boardRatio = $derived(((size - 1) * ROW_STEP + 1) * (ASPECT / size));

	/** @type {HTMLDivElement | undefined} */
	let grid = $state();

	/** 矢印キーで盤面を移動できるようにする（6x6 を Tab で 36 回は辛い） */
	function onkeydown(event) {
		const deltas = {
			ArrowRight: 1,
			ArrowLeft: -1,
			ArrowDown: size,
			ArrowUp: -size
		};
		const delta = deltas[event.key];
		if (delta === undefined || !grid) return;

		const tiles = [...grid.querySelectorAll('button')];
		const current = tiles.indexOf(document.activeElement);
		if (current === -1) return;

		const next = current + delta;
		// 左右は行をまたがない
		if (Math.abs(delta) === 1 && Math.floor(next / size) !== Math.floor(current / size)) return;
		if (next < 0 || next >= tiles.length) return;

		event.preventDefault();
		tiles[next].focus();
	}

	function place(i) {
		const row = Math.floor(i / size);
		const col = i % size;
		const totalH = (size - 1) * ROW_STEP + 1;
		return [
			`left: ${(col / size) * 100}%`,
			`top: ${((row * ROW_STEP) / totalH) * 100}%`,
			`width: ${100 / size}%`,
			`height: ${100 / totalH}%`,
			`z-index: ${row + 1}`
		].join(';');
	}
</script>

<div
	class="board"
	bind:this={grid}
	style="aspect-ratio: {1 / boardRatio}; --ear-mask: url('{base}/img/hachiware-ear.png'); --size: {size}"
	{onkeydown}
	role="group"
	aria-label="{size}×{size} のハチワレ。1 匹だけ耳の色が違います"
>
	{#each round.tiles as hex, i (i)}
		<button
			type="button"
			class="hachi"
			class:picked={pickedIndex === i}
			class:answer={revealIndex === i}
			class:wrong={pickedIndex === i && revealIndex !== i && revealIndex !== null}
			style="{place(i)}; --ear: {hex}"
			disabled={locked}
			aria-label="{Math.floor(i / size) + 1} 段目 {(i % size) + 1} 番目"
			onclick={() => onpick(i)}
		>
			<span class="body">
				<span class="ear"></span>
				<img src="{base}/img/hachiware-base.png" alt="" draggable="false" />
			</span>
			{#if pickedIndex === i && revealIndex !== i && revealIndex !== null}
				<span class="bubble">エ〜？</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.board {
		position: relative;
		width: 100%;
		/* 一番上の段の耳が切れないように */
		margin-top: 4px;
	}

	.hachi {
		appearance: none;
		position: absolute;
		border: 0;
		padding: 0;
		background: none;
		cursor: pointer;
		/* ボタンの四角ではなく、ハチワレの形だけで押せるように */
		pointer-events: none;
		-webkit-tap-highlight-color: transparent;
	}

	.body {
		position: absolute;
		inset: 0;
		display: block;
		pointer-events: auto;
		transition: transform 140ms ease;
		transform-origin: 50% 80%;
	}

	.ear {
		position: absolute;
		inset: 0;
		background: var(--ear);
		-webkit-mask: var(--ear-mask) center / 100% 100% no-repeat;
		mask: var(--ear-mask) center / 100% 100% no-repeat;
	}

	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		user-select: none;
		-webkit-user-drag: none;
	}

	.hachi:disabled {
		cursor: default;
	}

	.hachi:disabled .body {
		pointer-events: none;
	}

	.hachi:focus-visible {
		outline: none;
	}

	.hachi:focus-visible .body {
		transform: translateY(-6%) scale(1.06);
	}

	@media (hover: hover) {
		.hachi:not(:disabled) .body:hover {
			transform: translateY(-6%) scale(1.06);
		}
	}

	/* 正解のハチワレはぴょんと跳ねて、ほかは少し薄くなる */
	/* 半透明にすると重なった下の段が透けるので、色を薄めるだけにする */
	.board:has(.answer) .hachi:not(.answer):not(.wrong) .body {
		filter: contrast(0.4) brightness(1.4);
	}

	.hachi.answer .body {
		animation: hop 520ms ease-out 2;
		filter: drop-shadow(0 0 3px var(--accent)) drop-shadow(0 0 2px var(--accent));
	}

	.hachi.wrong {
		z-index: 99 !important;
	}

	.hachi.wrong .body {
		animation: shake 360ms ease-in-out;
		filter: drop-shadow(0 0 2px var(--danger));
	}

	.bubble {
		position: absolute;
		left: 50%;
		bottom: 92%;
		transform: translateX(-50%);
		z-index: 2;
		padding: 0.3em 0.7em;
		border: 2px solid #1a1a1a;
		border-radius: 999px;
		background: #fff;
		color: #1a1a1a;
		font-weight: 700;
		font-size: clamp(11px, 3.4vw, 15px);
		white-space: nowrap;
		pointer-events: none;
		animation: pop 220ms ease-out;
	}

	@keyframes hop {
		0%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-14%);
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6%);
		}
		75% {
			transform: translateX(6%);
		}
	}

	@keyframes pop {
		from {
			transform: translateX(-50%) scale(0.6);
			opacity: 0;
		}
	}
</style>
