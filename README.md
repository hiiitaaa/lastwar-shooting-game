# ラストウォー風シューティングゲーム

ラストウォーの広告風のシューティングゲームです。ステージをクリアしながら、キャラクター（妹・姉・母）を倒してルートを選択し、ノベルゲーム風のご褒美シーンを楽しめます。

## 🎮 ゲームの特徴

- **2つのゲームモード**: ストーリーモード（ノベル・動画あり） / ゲームオンリーモード（シューティングのみ）
- **4ステージ構成**: チュートリアル + 3つのメインステージ（各ステージにボス戦あり）
- **キャラアイコン障害物**: 妹・姉・母のアイコンを破壊して撃破数を稼ぐ
- **ルート分岐システム**: 最も多く倒したキャラでルート分岐
- **ノベルゲーム風演出**: 静止画 + テキスト + 動画のご褒美シーン
- **兵士システム**: 兵士数に応じて同時発射数が増加（最大10発）＋隊形変化
- **ボス戦**: 各ステージ終盤に巨大化したキャラボスが襲来・降下攻撃
- **バッドエンド**: 残機0でゲームオーバー→バッドエンドシーン
- **メニュー機能**: 一時停止、ホームに戻る

---

## 🎨 必要なアセットファイル

### 画像ファイル（images/フォルダ）

```
images/
├── player.webm              # プレイヤーアニメーション（透過WebM推奨）
├── background.png           # 背景画像（800x600推奨）
├── bullet.png               # 弾の画像
├── sister-icon.png          # 妹アイコン（障害物用）
├── older-sister-icon.png    # 姉アイコン（障害物用）
├── mother-icon.png          # 母アイコン（障害物用）
├── sister.jpg               # 妹の立ち絵（ノベル用）
├── older-sister.jpg         # 姉の立ち絵（ノベル用）
├── mother.jpg               # 母の立ち絵（ノベル用）
├── sister-bad.jpg           # 妹バッドエンド画像
├── older-sister-bad.jpg     # 姉バッドエンド画像
└── mother-bad.jpg           # 母バッドエンド画像
```

### 動画ファイル（videos/フォルダ）

各ルート × 3ステージ × 2本 + バッドエンド = 21本

```
videos/
├── sister-1-part1.mp4       # 妹ルート ステージ1 動画1
├── sister-1-part2.mp4       # 妹ルート ステージ1 動画2
├── sister-2-part1.mp4
├── sister-2-part2.mp4
├── sister-3-part1.mp4
├── sister-3-part2.mp4
├── sister-bad.mp4           # 妹バッドエンド動画
├── older-sister-1-part1.mp4
├── older-sister-1-part2.mp4
├── older-sister-2-part1.mp4
├── older-sister-2-part2.mp4
├── older-sister-3-part1.mp4
├── older-sister-3-part2.mp4
├── older-sister-bad.mp4     # 姉バッドエンド動画
├── mother-1-part1.mp4
├── mother-1-part2.mp4
├── mother-2-part1.mp4
├── mother-2-part2.mp4
├── mother-3-part1.mp4
├── mother-3-part2.mp4
└── mother-bad.mp4           # 母バッドエンド動画
```

---

## 🚀 起動方法

### ローカルサーバーで起動（推奨）

```bash
# プロジェクトフォルダに移動
cd "E:\tool\game\シューティング"

# ローカルサーバーを起動
python -m http.server 8000
```

ブラウザで以下のURLを開く:
- **http://localhost:8000**

---

## 🎯 ゲームの遊び方

### ホーム画面でモード選択

- **ストーリーモード**: ノベルシーン・動画を楽しむ通常モード
- **ゲームオンリーモード**: シューティングのみ、テスト・バランス調整用

### 基本操作

#### キーボード
- **← / A**: 左に移動
- **→ / D**: 右に移動
- **≡ボタン**: メニュー（一時停止）

#### タッチ・マウス
- **画面をタッチ/ドラッグ**: プレイヤーを移動

### ゲームの流れ

```
1. モード選択
   ↓
2. チュートリアル（30秒）
   - キャラアイコン（妹・姉・母）を破壊
   - 青いゲージで兵士数を増やす
   - 最も多く倒したキャラでルート決定
   ↓
3. メインステージ1-3（各30秒 + ボス戦）
   - 選択されたキャラの障害物のみ出現
   - ステージ後半（20秒経過後）にボス出現
   - ボスを倒してクリア
   ↓
4. ストーリーモード時: ご褒美シーン
   - ノベルシーン（テキスト + 画像）
   - ご褒美動画（2本）
   ↓
5. エンディング
```

### ゲーム要素

#### キャラアイコン障害物
- 妹・姉・母のアイコンが降りてくる
- 上部にHP数字が表示
- 弾を当ててHPを0にすると破壊
- チュートリアルではランダム、分岐後は選択キャラのみ出現

#### 青いゲージ
- 取得すると兵士数が増加（+2〜6人）
- 兵士が増えると隊形が変化（横→上→下→上2→下2...）
- 兵士数に応じて弾の同時発射数が増える（最大10発）

#### ボス戦
- ステージ後半（20秒経過後）に巨大化したキャラボスが出現
- 左右移動 + プレイヤーに向かって降下攻撃
- HP500を削ってクリア

#### ダメージシステム
- プレイヤー本体に障害物接触: 兵士が大幅減少
- 兵士に障害物接触: 兵士1人減少
- 兵士0になるとゲームオーバー → バッドエンド

---

## 🛠️ カスタマイズ

### 弾の画像変更

1. 画像を配置: `images/bullet.png`
2. `game.js` の28-29行目でサイズ調整:

```javascript
bulletWidth: 20,   // 横幅
bulletHeight: 20   // 縦幅
```

### 背景画像変更

1. 画像を配置: `images/background.png`（800x600推奨）
2. 自動的に読み込まれます

### ノベルシーンのカスタマイズ

`scenes.csv`を編集してシナリオを変更:

```csv
route,stage,character_name,text,background,background_type
sister,1,妹,セリフ,images/sister.jpg,image
sister,1,妹,セリフ,videos/sister-1-part1.mp4,video
sister,-1,妹,バッドエンドのセリフ,images/sister-bad.jpg,image
```

- **stage**: `-1`でバッドエンド、`1-3`で通常ステージ

---

## 🎨 プレイヤーグラフィック作成（透過WebM）

### 黒背景動画を透過WebMに変換

```bash
ffmpeg -i input.mp4 -vf "colorkey=0x000000:0.1:0.05" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 player.webm
```

### グリーンバック動画を透過WebMに変換（推奨）

```bash
ffmpeg -i input.mp4 -vf "colorkey=0x00FF00:0.3:0.2" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 player.webm
```

---

## ⚙️ ゲーム設定

`game.js`の`CONFIG`で調整可能:

```javascript
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 6,
    bulletSpeed: 10,
    bulletWidth: 20,              // 弾のサイズ
    bulletHeight: 20,
    obstacleSpeed: 1.5,
    stageDuration: 1800,          // 30秒（60fps × 30）
    bossHp: 500,
    backgroundImage: 'images/background.png',
    bulletImage: 'images/bullet.png'
};
```

---

## 📊 技術スタック

- **HTML5 Canvas** - ゲーム描画
- **JavaScript (ES6+)** - ゲームロジック
- **CSS3** - UI/UXデザイン
- **CSV** - シナリオデータ管理
- **FFmpeg** - 動画変換

---

## 🎓 開発履歴

詳細は`CLAUDE.md`を参照

- Phase 1-4: 基本システム構築
- Phase 5: ステージシステム・ストーリー分岐
- Phase 6: ノベルシステム・動画統合
- Phase 7: キャラアイコン障害物・ボス戦・モード選択・バッドエンド

---

**開発期間**: 約8時間
**作成日**: 2025-10-31
**最終更新**: 2025-11-01
**開発**: Claude (Anthropic) + User
