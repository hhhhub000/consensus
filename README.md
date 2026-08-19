# ホンネセンサス — 空気を読む前の意見が、いちばん価値がある。

話し合いの前に全員が自分の考えをカードで置き、それから一斉に開示する合意形成ボード。
話し合いから始めることで起きる同調圧力・集団浅慮を避け、
誰にも影響されていない生の意見の分布とバラツキ (合意度) を見ながら議論を始められます。

## 主な機能

- **テーマ作成**: テンプレート7種 (NASAゲーム / 引っ越し先 / 晩御飯 / 無人島 / 機能優先度 / 働き方の価値観 / 防災グッズ) or 白紙から。軸は1次元 or 2次元、議論の要素はカードとして自由に編集
- **ゲスト参加**: 招待URL (QRコード付き) を開いて名前を入れるだけ。Firebase 匿名認証で人物は判別
- **入力ターン**: カードを軸上にドラッグ配置。開示までは他人の配置は**サーバーレベルで**読めない (Firestore セキュリティルール)
- **一斉開示**: 1次元 = カード別のバラツキ帯 (min〜max + 集中度の濃淡 + 中央値)、2次元 = 標準偏差楕円 + 重心 (まとめて / 1枚ずつ / 一覧グリッドの3モード)
- **客観指標**: カード別の合意度スコア、「自分と全体のズレ」、ラウンド間の合意度推移
- **ラウンド制**: 議論後にもう一度入力し、収束の様子を前ラウンド比較 (矢印/破線) で確認
- **合意ボード**: 最後は全員で1枚のボードをリアルタイム共同編集。カードを触ると開示時の分布がゴースト表示され、分布から乖離した合意に気づける
- **匿名/実名**: 開示時の名前表示はファシリテーターがいつでも切替

## 技術構成

| 領域 | 採用 |
|---|---|
| フロントエンド | React 19 + Vite + TypeScript (SPA) |
| スタイル | Tailwind CSS v4 |
| DB / リアルタイム同期 | Cloud Firestore (`onSnapshot`) |
| 認証 | Firebase Anonymous Auth |
| 可視化 | カスタム SVG + d3-array |
| デプロイ | Docker (nginx) → Cloud Run |

## 開発

```bash
npm install
```

### エミュレーターで動かす (Firebase プロジェクト不要)

Firebase Emulator には **Java 11+** が必要です (`java -version` で確認)。
このリポジトリでは `.tools/` にポータブル JRE を置く運用も可能です:

```powershell
# 例: ポータブル JRE を PATH に追加してから起動 (PowerShell)
$env:PATH = "$PWD\.tools\jre\jdk-21.0.12+8-jre\bin;$env:PATH"
npm run emulators
```

別ターミナルで:

```bash
npm run dev
```

`.env` に `VITE_FIREBASE_API_KEY` が無い場合、dev モードは自動的にエミュレーター
(`demo-consensus` プロジェクト) に接続します。

### テスト

```bash
npm test          # 統計関数のユニットテスト (+ エミュレーター起動中ならルールテストも実行)
npx tsc --noEmit  # 型チェック
```

セキュリティルールのテスト (`tests/rules.test.ts`) は Firestore エミュレーター
(127.0.0.1:8080) が起動しているときだけ実行されます。

## 本番デプロイ

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成 (Spark 無料枠でOK)
2. **Build > Authentication > Sign-in method** で「匿名」を有効化
3. **Build > Firestore Database** を作成 (本番モード)
4. プロジェクト設定 > マイアプリ で Web アプリを追加し、構成値を控える

### 2. セキュリティルールのデプロイ

```bash
npx firebase login
npx firebase use <YOUR_PROJECT_ID>
npx firebase deploy --only firestore:rules
```

### 3. 本番用 Firebase 設定の埋め込み

[.env.production](.env.production) の `REPLACE_ME` を自分の Firebase プロジェクトの値に
書き換えてコミットします。Vite がビルド時に自動で読み込みます。
(Firebase の Web 設定は公開識別子で秘密情報ではありません。保護は firestore.rules が担います)

### 4. Cloud Run へデプロイ (release ブランチ push で自動デプロイ)

初回のみ Cloud Run コンソールで設定します。**cloudbuild.yaml は不要**です
(リポジトリの Dockerfile がそのまま使われます)。

1. リポジトリに `release` ブランチを作って GitHub へ push
2. [Cloud Run コンソール](https://console.cloud.google.com/run) > サービスの作成 >
   「**リポジトリから継続的にデプロイする (GitHub)**」を選択
3. リポジトリを接続し、ブランチに `^release$` を指定
4. Build Type は「**Dockerfile**」を選択 (パス: `/Dockerfile`)
5. リージョン (例: asia-northeast1)、「未認証の呼び出しを許可」を設定して作成

以降は `release` ブランチへ push するたびに Cloud Build が Dockerfile をビルドして
自動デプロイされます。

手動デプロイする場合:

```bash
gcloud run deploy consensus --source . --region asia-northeast1 --allow-unauthenticated
```

デプロイ後、Firebase Console > Authentication > Settings > **承認済みドメイン** に
Cloud Run のドメイン (`*.run.app`) を追加してください。

> Firestore の無料枠 (Spark): 1GiB ストレージ / 5万読み取り/日 など。
> 数人〜数十人のワークショップ用途なら十分収まります。

## データモデル (Firestore)

```
sessions/{sessionId}              テーマ本体 (軸・カード・フェーズ・ラウンド・開示状態)
  participants/{uid}              参加者 (名前・色・配置完了ラウンド)
  placements/{round}_{uid}        ラウンドごとの各自の配置 {cardId: {x, y}} (0..1 正規化)
  consensus/board                 合意ボード (全員で編集する最終配置)
```

開示の制御は `revealedUpTo` (開示済みラウンド番号) をセキュリティルールが参照する形で行い、
未開示ラウンドの他人の配置はクライアント側の出し分けではなく **読み取り自体が拒否** されます。
