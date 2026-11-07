# ハチワレ色あて

ずらっと並んだハチワレの中から、1 匹だけ**耳の色がちがう子**を探す色覚ゲーム。
[Hideyasu/anmika](https://github.com/Hideyasu/anmika)（白って200色あんねん）をベースにしています。

**https://hachiware-iroate.pages.dev**

> [!WARNING]
> **このリポジトリはもうデプロイしないでください。**
> 2026-11-07 から hachiware-iroate.pages.dev では v2（対戦・ランキング・得意な色/苦手な色つき）が動いています。
> 開発とデプロイは [Hideyasu/anmika_hachiware_v2](https://github.com/Hideyasu/anmika_hachiware_v2) で行います（`npm run deploy`）。
> ここで `npm run deploy` を実行すると、公開中のサイトがこの旧版（v1）で上書きされ、対戦やランキングが消えます。

非公式のファンゲームです。

## 遊び方

- 耳の色が 1 匹だけ違います。タップで選んでください。
- ライフは 3 つ。外しても、時間切れでも 1 つ減ります。
- レベルが上がるほどハチワレが増え（3×3 → 6×6）、色差が縮まります（ΔE 14 → 1）。
- キーボードでも遊べます（矢印キーで移動、Enter / Space で決定）。

## 仕組み

- 素材は 1 枚だけ（`static/img/`）。
  - `hachiware-base.png` … 線画。耳の塗り部分だけ透明に抜いてある（線のアンチエイリアスは残す）。
  - `hachiware-ear.png` … 耳の形のマスク。
  - 各ハチワレは「耳の色のベタ塗りを耳マスクで切り抜いたもの」の上に線画を重ねて描くので、耳の色以外は全員まったく同じ画像です。
- 出題色は和色 45 色（`src/lib/palette.js`）から 1 つ選び、仲間はずれは CIELAB 上で目標の ΔE00 だけずらした色（`src/lib/game.js` の `shiftedColor`）。
- 下の段の耳が上の段のあごを隠すように、段ごとに重ねて並べています（`src/lib/components/Board.svelte`）。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm test         # 色空間とゲームロジックのテスト
npm run deploy   # ⚠️ 実行しないこと。公開中の v2 が旧版で上書きされる（上の注意を参照）
```
