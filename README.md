# ハチワレ色あて

ずらっと並んだハチワレの中から、1 匹だけ**耳の色がちがう子**を探す色覚ゲーム。
[Hideyasu/anmika](https://github.com/Hideyasu/anmika)（白って200色あんねん）をベースにしています。

**https://hachiware-iroate.pages.dev**

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
npm run deploy   # build して Cloudflare Pages（hachiware-iroate）にデプロイ
```
