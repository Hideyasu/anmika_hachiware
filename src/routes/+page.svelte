<script>
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import Board from '$lib/components/Board.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import { MAX_LIVES, createRound, scoreForRound } from '$lib/game.js';
	import { palette } from '$lib/palette.js';
	import { emptyBest, loadBest, mergeBest, saveBest } from '$lib/storage.js';

	const heroColors = ['#68BE8D', '#FCD575', '#38A1DB'];

	const REVEAL_MS = { correct: 1000, wrong: 1900, timeout: 1900 };

	/** @type {'title' | 'playing' | 'reveal' | 'gameover'} */
	let phase = $state('title');
	let level = $state(1);
	let score = $state(0);
	let lives = $state(MAX_LIVES);
	let round = $state(null);
	let remaining = $state(0);
	let picked = $state(null);
	/** @type {'correct' | 'wrong' | 'timeout' | null} */
	let result = $state(null);
	let gained = $state(0);
	/** このプレイで見分けられた中で最小の色差 */
	let finestDeltaE = $state(null);
	let best = $state({ ...emptyBest });
	let copied = $state(false);

	let rafId = 0;
	let revealTimer = 0;
	let roundStartedAt = 0;

	onMount(() => {
		best = loadBest();
	});

	onDestroy(stopClock);

	function stopClock() {
		// SSR/プリレンダー中にも onDestroy から呼ばれる
		if (!browser) return;
		cancelAnimationFrame(rafId);
		clearTimeout(revealTimer);
		rafId = 0;
		revealTimer = 0;
	}

	function tick() {
		rafId = requestAnimationFrame(() => {
			remaining = round.timeLimit - (performance.now() - roundStartedAt);
			if (remaining <= 0) {
				remaining = 0;
				resolve(null);
			} else {
				tick();
			}
		});
	}

	function startGame() {
		stopClock();
		level = 1;
		score = 0;
		lives = MAX_LIVES;
		finestDeltaE = null;
		copied = false;
		nextRound();
	}

	function nextRound() {
		round = createRound(level);
		picked = null;
		result = null;
		gained = 0;
		remaining = round.timeLimit;
		phase = 'playing';
		roundStartedAt = performance.now();
		tick();
	}

	/** @param {number | null} index クリックされたタイル。null は時間切れ。 */
	function resolve(index) {
		cancelAnimationFrame(rafId);
		picked = index;

		if (index === round.oddIndex) {
			gained = scoreForRound(round, remaining);
			score += gained;
			finestDeltaE =
				finestDeltaE === null ? round.deltaE : Math.min(finestDeltaE, round.deltaE);
			result = 'correct';
		} else {
			lives -= 1;
			result = index === null ? 'timeout' : 'wrong';
		}

		phase = 'reveal';
		revealTimer = setTimeout(afterReveal, REVEAL_MS[result]);
	}

	function afterReveal() {
		if (lives <= 0) {
			endGame();
			return;
		}
		if (result === 'correct') level += 1;
		nextRound();
	}

	function endGame() {
		stopClock();
		phase = 'gameover';
		best = mergeBest(best, { score, level, deltaE: finestDeltaE });
		saveBest(best);
	}

	function backToTitle() {
		stopClock();
		phase = 'title';
	}

	const shareText = $derived(
		[
			'ハチワレ色あて',
			`レベル ${level} / スコア ${score.toLocaleString('ja-JP')}`,
			finestDeltaE === null
				? '1 問も当てられませんでした'
				: `見分けられた最小の色差 ΔE ${finestDeltaE.toFixed(2)}`
		].join('\n')
	);

	async function copyResult() {
		try {
			await navigator.clipboard.writeText(shareText);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<title>ハチワレ色あて — 耳の色がちがう子を探せ</title>
</svelte:head>

<main>
	{#if phase === 'title'}
		<section class="card title">
			<div class="hero" aria-hidden="true">
				{#each heroColors as c, i (i)}
					<span class="hero-hachi" style="--ear: {c}">
						<span class="hero-ear" style="mask-image: url('{base}/img/hachiware-ear.png'); -webkit-mask-image: url('{base}/img/hachiware-ear.png')"></span>
						<img src="{base}/img/hachiware-base.png" alt="" />
					</span>
				{/each}
			</div>
			<p class="eyebrow">COLOR QUIZ</p>
			<h1>ハチワレ<span class="num">色あて</span></h1>
			<p class="lead">
				ずらっと並んだハチワレの中に、<br />1 匹だけ<strong>耳の色がちがう子</strong>がいます。
			</p>

			<ul class="rules">
				<li>ライフは <strong>{MAX_LIVES}</strong> つ。外しても時間切れでも 1 つ減ります。</li>
				<li>レベルが上がるほどハチワレが増えて、色の差が小さくなります。</li>
				<li>
					色差は <strong class="mono">ΔE 14</strong> から始まって、最後は
					<strong class="mono">ΔE 1</strong>（ほぼ見分けられない差）まで縮みます。
				</li>
			</ul>

			{#if best.score > 0}
				<p class="best mono">
					ベスト {best.score.toLocaleString('ja-JP')} 点 / レベル {best.level}
					{#if best.deltaE !== null}
						/ ΔE {best.deltaE.toFixed(2)}
					{/if}
				</p>
			{/if}

			<button class="primary" onclick={startGame}>はじめる</button>

			<p class="note">
				画面の明るさやナイトシフト、ブルーライトカットで難易度が変わります。
				本気でやるなら全部切ってください。
			</p>
		</section>
	{:else if phase === 'gameover'}
		<section class="card title">
			<p class="eyebrow">GAME OVER</p>
			<h1 class="score mono">{score.toLocaleString('ja-JP')}</h1>
			<p class="lead">レベル {level} で力尽きました。</p>

			{#if finestDeltaE !== null}
				<p class="verdict">
					見分けられた最小の色差は <strong class="mono">ΔE {finestDeltaE.toFixed(2)}</strong>。
					{#if finestDeltaE < 1.3}
						ΔE 1 前後は一般に「人間にはほぼ区別できない」とされる領域です。もう化け物です。
					{:else if finestDeltaE < 2.3}
						ΔE 2.3 はいわゆる「かろうじて違いが分かる」境界。いい目をしています。
					{:else}
						まだ余裕があります。もう一回。
					{/if}
				</p>
			{/if}

			<p class="best mono">
				ベスト {best.score.toLocaleString('ja-JP')} 点 / レベル {best.level}
				{#if best.deltaE !== null}
					/ ΔE {best.deltaE.toFixed(2)}
				{/if}
			</p>

			<button class="primary" onclick={startGame}>もう一回</button>
			<div class="sub-actions">
				<button class="ghost" onclick={copyResult}>
					{copied ? 'コピーしました' : '結果をコピー'}
				</button>
				<button class="ghost" onclick={backToTitle}>タイトルへ</button>
			</div>
		</section>
	{:else}
		<section class="play">
			<Hud
				{level}
				{score}
				{lives}
				{remaining}
				timeLimit={round.timeLimit}
				deltaE={round.deltaE}
			/>

			<div class="stage">
				<Board
					{round}
					locked={phase === 'reveal'}
					pickedIndex={picked}
					revealIndex={phase === 'reveal' ? round.oddIndex : null}
					onpick={resolve}
				/>
			</div>

			<div class="readout" aria-live="polite">
				{#if phase === 'reveal'}
					<p class="verdict-line" class:ok={result === 'correct'}>
						{#if result === 'correct'}
							正解　+{gained.toLocaleString('ja-JP')}
						{:else if result === 'timeout'}
							時間切れ
						{:else}
							はずれ
						{/if}
					</p>
					<p class="swatches mono">
						<span class="chip" style="background:{round.base.hex}"></span>{round.base.hex}
						<span class="vs">対</span>
						<span class="chip" style="background:{round.oddHex}"></span>{round.oddHex}
					</p>
					<p class="basename">
						みんなの耳は「{round.base.name}」<span class="reading">（{round.base.reading}）</span>
					</p>
				{:else}
					<p class="hint">耳の色がちがうハチワレをタップ</p>
				{/if}
			</div>
		</section>
	{/if}

	<footer>
		<span class="mono">{palette.length}</span> 色の和色から出題 ・ 色差は CIEDE2000<br />
		非公式のファンゲームです
	</footer>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		padding: max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom));
		/* 連打でダブルタップ拡大が起きないように */
		touch-action: manipulation;
	}

	.card,
	.play {
		width: 100%;
		max-width: 520px;
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 28px 24px;
	}

	.play {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.stage {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 10px 6px 4px;
		overflow: hidden;
	}

	@media (max-width: 420px) {
		.card {
			padding: 22px 18px;
		}
		.stage {
			margin: 0 -6px;
			padding: 8px 2px 2px;
		}
	}

	.eyebrow {
		margin: 0 0 10px;
		font-size: 11px;
		letter-spacing: 0.22em;
		color: var(--muted);
	}

	h1 {
		margin: 0 0 14px;
		font-size: clamp(26px, 7vw, 34px);
		line-height: 1.25;
		letter-spacing: 0.01em;
	}

	h1 .num {
		color: var(--accent);
		margin-left: 0.15em;
	}

	.hero {
		display: flex;
		justify-content: center;
		margin: -4px 0 14px;
	}

	.hero-hachi {
		position: relative;
		width: 92px;
		aspect-ratio: 272 / 211;
		margin: 0 -6px;
	}

	.hero-hachi:nth-child(2) {
		transform: translateY(-10px);
		z-index: 1;
	}

	.hero-ear,
	.hero-hachi img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.hero-ear {
		background: var(--ear);
		mask-size: 100% 100%;
		-webkit-mask-size: 100% 100%;
	}

	.lead strong {
		color: var(--text);
	}

	h1.score {
		font-size: clamp(40px, 12vw, 56px);
		color: var(--accent);
	}

	.lead {
		margin: 0 0 18px;
		color: var(--muted);
		line-height: 1.7;
	}

	.rules {
		margin: 0 0 18px;
		padding-left: 1.1em;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.9;
	}

	.rules strong {
		color: var(--text);
	}

	.verdict {
		margin: 0 0 18px;
		line-height: 1.8;
		font-size: 14px;
		color: var(--muted);
	}

	.verdict strong {
		color: var(--text);
	}

	.best {
		margin: 0 0 18px;
		font-size: 13px;
		color: var(--muted);
	}

	button.primary {
		width: 100%;
		padding: 14px;
		border: 0;
		border-radius: 10px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		cursor: pointer;
	}

	button.primary:hover {
		filter: brightness(1.06);
	}

	.sub-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	button.ghost {
		flex: 1;
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}

	button.ghost:hover {
		color: var(--text);
		border-color: var(--muted);
	}

	.note {
		margin: 18px 0 0;
		font-size: 12px;
		line-height: 1.8;
		color: var(--muted);
		opacity: 0.8;
	}

	.readout {
		min-height: 78px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.hint {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}

	.verdict-line {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--danger);
	}

	.verdict-line.ok {
		color: var(--accent);
	}

	.swatches {
		margin: 0;
		font-size: 12px;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.chip {
		display: inline-block;
		width: 11px;
		height: 11px;
		border-radius: 3px;
	}

	.vs {
		margin: 0 4px;
		opacity: 0.6;
	}

	.basename {
		margin: 0;
		font-size: 12px;
		color: var(--muted);
	}

	.reading {
		opacity: 0.7;
	}

	footer {
		text-align: center;
		line-height: 1.7;
		font-size: 11px;
		color: var(--muted);
		opacity: 0.6;
	}
</style>
