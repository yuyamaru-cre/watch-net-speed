# watch-net-speed

Windows/WSL2環境で一日のネット速度を継続的に計測・可視化するツール

![TanStack](https://img.shields.io/badge/TanStack-Router%20%2B%20Query-FF4154)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## ✨ 機能

- 📊 **4つの指標を計測**: 下り・上り速度、Ping、Jitter
- 📈 **時系列グラフ**: 速度変動を可視化
- 🏆 **ピーク記録**: 最高速度・最低Pingを表示
- ⏰ **時間帯別分析**: 6つの時間帯（深夜/早朝/朝/昼/夕方/夜）ごとの平均速度
- ⚙️ **画面上で設定変更**: 計測間隔を1〜1440分で自由に設定
- 🔄 **自動更新**: 30秒ごとにダッシュボードを自動更新

## 🛠 技術スタック

### フロントエンド
- **React** + **TypeScript**
- **TanStack Router** - 軽量SPAルーティング
- **TanStack Query** - データフェッチング & キャッシング
- **Recharts** - グラフ描画
- **Tailwind CSS** - スタイリング
- **Vite** - 高速ビルドツール

### バックエンド
- **Express** - REST API
- **fast-speedtest-api** - 速度計測（Netflix Fast.com）
- **JSON** - データ永続化

## 🚀 セットアップ

### 必要要件
- Node.js 18.0.0以上
- npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/watch-net-speed.git
cd watch-net-speed

# 依存関係をインストール
npm install
```

### 起動方法

3つのターミナルで以下を実行：

```bash
# ターミナル1: フロントエンド（ポート5173）
npm run dev

# ターミナル2: APIサーバー（ポート3001）
npm run server

# ターミナル3: 速度計測（デフォルト30分間隔）
npm run monitor
```

ブラウザで **http://localhost:5173** を開くとダッシュボードが表示されます。

## ⚙️ 設定

### 計測間隔の変更

**方法1: ダッシュボードから変更（推奨）**
- 右上の「⚙️ 計測間隔」ボタンをクリック
- 1〜1440分の範囲で設定

**方法2: コマンドライン引数**
```bash
# 10分間隔で計測
npm run monitor 10
```

### データ保持期間
デフォルトで7日間のデータを自動保存します。古いデータは自動削除されます。

## 📁 プロジェクト構造

```
watch-net-speed/
├── monitor/              # バックエンド
│   ├── speed-monitor.ts # 計測スクリプト
│   ├── api-server.ts    # Express API
│   ├── speed_data.json  # 計測データ（自動生成）
│   └── config.json      # 設定（自動生成）
├── src/                 # フロントエンド
│   ├── components/
│   │   └── Dashboard.tsx
│   ├── types/
│   │   └── speed.ts
│   ├── main.tsx
│   └── index.css
└── package.json
```

## 📊 画面イメージ

- **統計カード**: 平均速度（下り/上り/Ping/Jitter）
- **ピーク記録**: 最高速度とその日時
- **時間帯別テーブル**: 6つの時間帯ごとの平均値
- **グラフ**: 
  - 通信速度（下り/上り）の時系列変化
  - レイテンシ（Ping/Jitter）の時系列変化

## 🔧 トラブルシューティング

### WSL2でnpm run monitorがエラーになる場合

```bash
# ビルドツールをインストール
sudo apt update
sudo apt install -y build-essential python3

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

### APIサーバーに接続できない

- `npm run server` が起動しているか確認
- ポート3001が使用されていないか確認

## 📝 ライセンス

MIT

## 🤝 貢献

プルリクエスト歓迎！

## 📮 作者

あなたの名前
