import adapter from '@sveltejs/adapter-static';

/**
 * 完全な静的サイトとして書き出す。
 *
 * ⚠️ adapter-cloudflare に戻さないこと。
 *    あちらは _worker.js を出力し、Cloudflare Pages では JS・CSS・画像を含む
 *    全リクエストが Functions 呼び出しとして数えられる。
 *    万バズ時にアカウント全体の Workers 無料枠（1日10万件）を食い潰し、
 *    同じアカウントの他サイトまで止まった（2026-11-07）。
 *    静的アセットの配信は無料・無制限なので、静的書き出しにしておく。
 *
 * @type {import('@sveltejs/kit').Config}
 */
export default {
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', strict: true })
	}
};
