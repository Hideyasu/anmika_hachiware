<script>
	import { MAX_LIVES } from '$lib/game.js';

	let { level, score, lives, remaining, timeLimit, deltaE } = $props();

	const ratio = $derived(Math.max(0, Math.min(1, remaining / timeLimit)));
	const seconds = $derived((Math.max(0, remaining) / 1000).toFixed(1));
</script>

<header class="hud">
	<div class="row">
		<div class="stat">
			<span class="label">レベル</span>
			<strong class="mono">{level}</strong>
		</div>
		<div class="stat">
			<span class="label">スコア</span>
			<strong class="mono">{score.toLocaleString('ja-JP')}</strong>
		</div>
		<div class="stat">
			<span class="label">色差 ΔE</span>
			<strong class="mono">{deltaE.toFixed(2)}</strong>
		</div>
		<div class="stat lives" aria-label="残りライフ {lives}">
			<span class="label">のこり</span>
			<strong aria-hidden="true">
				{#each Array.from({ length: MAX_LIVES }) as _, i}
					<span class="heart" class:lost={i >= lives}>●</span>
				{/each}
			</strong>
		</div>
	</div>

	<div
		class="timer"
		role="timer"
		aria-label="残り {seconds} 秒"
		style="--ratio: {ratio}"
		class:urgent={ratio < 0.25}
	>
		<div class="fill"></div>
	</div>
</header>

<style>
	.hud {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.row {
		display: flex;
		gap: 8px;
		justify-content: space-between;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.label {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--muted);
	}

	.stat strong {
		font-size: 18px;
		font-weight: 600;
	}

	.lives {
		text-align: right;
	}

	.heart {
		color: var(--accent);
		font-size: 14px;
		letter-spacing: 2px;
	}

	.heart.lost {
		color: var(--line);
	}

	.timer {
		height: 5px;
		border-radius: 999px;
		background: var(--panel-2);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		width: calc(var(--ratio) * 100%);
		background: var(--muted);
	}

	.timer.urgent .fill {
		background: var(--danger);
	}
</style>
