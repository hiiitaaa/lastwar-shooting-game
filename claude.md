# 開発履歴 - ラストウォー風シューティングゲーム

## プロジェクト概要

このプロジェクトは、モバイルゲーム「ラストウォー：サバイバル」の広告風シューティングゲームです。
プレイヤーは左右に移動しながら、上から降りてくる障害物を破壊し、兵士数を増やしてボスを倒すゲームです。

## 開発プロセス

### Phase 1: 要件定義とリサーチ
- ユーザーからラストウォーの広告ゲームについての問い合わせ
- 実際のラストウォーゲームの調査と分析
- 広告と実際のゲーム内容の違いを確認
- ゲームの仕組み：
  - 左右移動のみ（前進しない）
  - 障害物が奥から手前に迫る
  - 数字付き障害物をショットで削る
  - 障害物破壊でアイテム取得
  - 青ゲージで兵士数増加
  - 兵士数に応じて攻撃数増加
  - 最後にボス戦

### Phase 2: 初期実装（誤った方向）
最初、2D横スクロールシューティングとして実装してしまいました：
- 上から敵（ゾンビ）が降りてくる
- アイテムを直接取得する方式
- シンプルなCanvas 2D描画

**問題点**: 実際のラストウォーとは全く異なるゲーム性になっていた

### Phase 3: ゲームシステムの全面見直し
ユーザーからのフィードバックで本物のゲーム画像を確認後、完全に作り直し：

#### 3-1. コアシステムの実装
- 障害物クラスの実装（HP付き、数字表示）
- 報酬アイテムシステム（障害物破壊時に取得）
- 兵士数増加システム（青ゲージ）
- 攻撃数の兵士数連動
- ボス戦システム

#### 3-2. ゲームバランス調整（第1回）
- 降下スピードを半分に調整（3 → 1.5）
- 画面を縦2分割してレーン制を実装
- ボスの降下攻撃システムを実装
  - 通常時：左右に移動
  - 攻撃時：プレイヤーの位置に降下
  - ダメージ：兵士数-2

#### 3-3. 衝突判定の修正
- 弾が障害物に当たっても数字が減らない問題を発見
- 衝突判定を中心座標ベースに完全修正
- すべてのオブジェクトの座標系を統一
- 弾のサイズを調整（5x15 → 8x20）

#### 3-4. ビジュアル調整（第2回）
ユーザーから実際のゲーム画像を提供され、さらに改善：

**サイズ調整**:
- 障害物：60x80 → 120x100 → **350x120**（レーン幅いっぱい）
- 青ゲージ：50x40 → 120x80 → **350x100**（レーン幅いっぱい）
- HP数字：24px → 32px → **48px**
- +数字：20px → 32px → **48px**

**配置調整**:
- レーン中心配置（左:200、右:600）
- 枠線追加で立体感演出
- 報酬アイコンのサイズアップ

**ゲームバランス調整**:
- 障害物HP：10-40 → **20-70**
- 兵士増加量：1-3 → **2-6**
- 報酬確率：30% → **50%**
- スポーン頻度：90フレーム → **120フレーム**（障害物）

### Phase 4: 最終調整
- 画面中央に分割線を追加（点線）
- ボスHPバーの実装
- UI/UXの最適化

## 技術的な課題と解決策

### 課題1: 衝突判定が機能しない
**問題**: 弾が障害物に当たってもHPが減らない

**原因**:
- 衝突判定関数が不完全
- 座標系がオブジェクトごとに異なっていた
- 弾の描画位置がずれていた

**解決策**:
```javascript
// 修正前（不完全な判定）
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width / 2 &&
           obj1.x + obj1.width / 2 > obj2.x &&
           obj1.y < obj2.y + obj2.height / 2 &&
           obj1.y + obj1.height / 2 > obj2.y;
}

// 修正後（正確な判定）
function checkCollision(obj1, obj2) {
    const obj1Left = obj1.x - obj1.width / 2;
    const obj1Right = obj1.x + obj1.width / 2;
    const obj1Top = obj1.y - obj1.height / 2;
    const obj1Bottom = obj1.y + obj1.height / 2;

    const obj2Left = obj2.x - obj2.width / 2;
    const obj2Right = obj2.x + obj2.width / 2;
    const obj2Top = obj2.y - obj2.height / 2;
    const obj2Bottom = obj2.y + obj2.height / 2;

    return obj1Left < obj2Right &&
           obj1Right > obj2Left &&
           obj1Top < obj2Bottom &&
           obj1Bottom > obj2Top;
}
```

### 課題2: ゲームの面白さの追求
**問題**: 単調なゲームプレイになりがち

**解決策**:
1. **選択の楽しさ**: 左右レーン選択の戦略性
2. **成長の実感**: 兵士数増加による火力アップ
3. **破壊の爽快感**: 大きな数字を削っていく達成感
4. **収集の楽しみ**: 3種類のアイテム（妹・姉・母）集め
5. **報酬の分岐**: クリア時の動画が変わる

### 課題3: レイアウトの最適化
**問題**: オブジェクトが小さく、レーンの意味が薄い

**解決策**:
- オブジェクトをレーン幅いっぱいに拡大（350px）
- レーン中心に固定配置（ランダム性を減らす）
- 視認性を高めるため数字を大きく（48px）

## ゲームの特徴

### コアゲームプレイ
1. **左右移動**: 矢印キーまたはタッチで操作
2. **自動射撃**: 兵士数に応じて弾の数が増加（最大10発）
3. **障害物破壊**: 数字（HP）を0にすると報酬ゲット
4. **兵士増強**: 青ゲージを取って火力アップ
5. **ボス戦**: 40秒後に出現、降下攻撃してくる

### ゲームの流れ
```
スタート
  ↓
通常ステージ（40秒）
  - 左右レーンから障害物降下
  - 青ゲージで兵士数増加
  - アイテム（妹・姉・母）収集
  ↓
ボス戦
  - 左右移動 + 降下攻撃
  - HP500を削る
  ↓
クリア
  ↓
ご褒美動画
  - 最多アイテムに応じて分岐
```

### ご褒美動画システム
プレイ中に集めたアイテム（妹・姉・母）の中で、最も多く集めたものに応じてエンディング動画が変化：
- 妹が最多 → `videos/sister.mp4`
- 姉が最多 → `videos/older-sister.mp4`
- 母が最多 → `videos/mother.mp4`

## ファイル構成

```
シューティング/
├── index.html          # メインHTML、画面構成
├── style.css           # スタイルシート、UI/UX
├── game.js             # ゲームロジック（450行超）
├── README.md           # ユーザー向け説明書
├── claude.md           # 本ファイル（開発履歴）
├── requirements.md     # 要件定義書
└── videos/             # 動画ファイル格納用
    ├── sister.mp4
    ├── older-sister.mp4
    └── mother.mp4
```

## 主要クラス設計

### Player（プレイヤー）
- 左右移動
- 自動射撃（兵士数に応じた弾数）
- 位置：画面下部中央

### Bullet（弾）
- 上方向に移動
- サイズ: 8x20px
- 速度: 10px/frame

### Obstacle（障害物）
- HP: 20-70のランダム値
- サイズ: 350x120px（レーン幅いっぱい）
- 速度: 1.5px/frame
- 50%の確率で報酬アイテム付き
- 破壊時にスコア加算

### SoldierGauge（兵士ゲージ）
- サイズ: 350x100px
- 速度: 1.5px/frame
- 取得で兵士数+2〜6人

### Boss（ボス）
- HP: 500
- サイズ: 120x120px
- 移動パターン：
  - 通常時：左右移動（速度2）
  - 攻撃時：降下攻撃（速度3）
  - クールダウン：180フレーム（3秒）

## 設定値一覧

```javascript
CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 6,
    bulletSpeed: 10,
    obstacleSpeed: 1.5,
    soldierGaugeSpeed: 1.5,
    obstacleSpawnRate: 120,      // 2秒ごと
    soldierGaugeSpawnRate: 180,  // 3秒ごと
    stageDuration: 2400,         // 40秒（60fps）
    bossHp: 500,
    bossAttackSpeed: 3
}
```

## 今後の拡張案

### 短期的な改善
- [ ] サウンドエフェクトの追加
- [ ] BGMの実装
- [ ] パーティクルエフェクト（破壊時）
- [ ] スコアランキングシステム

### 中期的な拡張
- [ ] 複数ステージの実装
- [ ] 難易度選択
- [ ] 特殊アイテム（パワーアップ）
- [ ] ボスの種類を増やす

### 長期的なビジョン
- [ ] マルチプレイヤー対応
- [ ] レベルエディター
- [ ] モバイル最適化
- [ ] ストーリーモード

## 学んだこと

1. **要件の正確な理解が重要**: 最初の実装が完全に間違っていた
2. **ビジュアルフィードバックの価値**: 画像を見ることで正しい方向性が見えた
3. **座標系の統一**: 衝突判定のバグは座標系の不統一が原因だった
4. **ゲームバランスの重要性**: 数値調整でゲーム体験が大きく変わる
5. **ユーザーフィードバック**: 実際にプレイしてもらうことで改善点が明確に

## 開発期間

- Phase 1-2: 初期実装（誤った方向）
- Phase 3: 全面作り直し
- Phase 4: ブラッシュアップ
- **Phase 5: ステージシステム実装（本格的なゲーム化）**

**合計開発時間**: 約5-6時間（対話ベース）

## 謝辞

ユーザーからの的確なフィードバックと、実際のゲーム画像の提供により、
本物のラストウォー風のゲームを作り上げることができました。

特に「面白さ」を意識しながら開発することの重要性を学びました。

---

## Phase 5: ステージシステムとストーリー分岐実装 (2025-10-31)

### 5-1. ゲームバランス調整

**難易度の段階的上昇**:
- 降下スピードを半分に調整（3 → 1.5）
- 時間経過による敵HP上昇システム
  - 序盤: 弱い敵でゲームに慣れる
  - 終盤: 強い敵でボス戦への準備

**オブジェクト衝突回避**:
- 青ゲージと赤い障害物が重ならないように
- 同じレーン・近い位置にある場合はスポーンをスキップ

**ダメージシステム**:
- プレイヤーが障害物に触れると兵士数が減少
- ダメージ量 = 障害物のHP
- 画面が赤く点滅する視覚的フィードバック
- 戦略性の追加：青ゲージを集める重要性が増す

### 5-2. ステージシステム実装

**ゲーム構成の大幅変更**:
```
チュートリアル（30秒）
    ↓
アイテム収集数で判定
    ↓
┌──────────┬──────────┬──────────┐
│ 妹ルート    │ 姉ルート    │ 母ルート    │
└──────────┴──────────┴──────────┘
各ルート3ステージ（各30秒）
各ステージ後にご褒美動画再生
    ↓
エンディング
```

**ボス戦システムの削除**:
- ボス戦を削除し、ステージクリア制に変更
- より段階的な難易度上昇を実現

### 5-3. アイテム取得履歴システム

**同数時の優先順位**:
- アイテム取得履歴を配列で記録
- 同数の場合は**最初に取得したアイテム**を優先
- 完全なる公平性の実現

**実装例**:
```javascript
// 妹3個、姉3個の場合
itemHistory = ['sister', 'olderSister', 'sister', 'olderSister', ...]
// → 最初に取ったのが妹なので妹ルートに
```

### 5-4. ストーリールート分岐システム

**動画ファイル構成**:
- 各ルート × 3ステージ = 9個の動画ファイル
- `videos/sister-1.mp4`, `videos/sister-2.mp4`, `videos/sister-3.mp4`
- `videos/older-sister-1.mp4`, `videos/older-sister-2.mp4`, `videos/older-sister-3.mp4`
- `videos/mother-1.mp4`, `videos/mother-2.mp4`, `videos/mother-3.mp4`

**ルート決定ロジック**:
1. チュートリアル完了時に判定
2. 最多アイテムを検索
3. 同数の場合は履歴の最初を参照
4. 決定したルートで3ステージ進行

### 5-5. 難易度調整システム

**ステージごとの基礎HP**:
| ステージ | 序盤 | 中盤 | 終盤 |
|---------|------|------|------|
| 0 (チュートリアル) | 5-15 | 15-30 | 25-45 |
| 1 | 20-35 | 30-50 | 40-65 |
| 2 | 35-55 | 45-70 | 55-85 |
| 3 | 50-75 | 60-90 | 70-105 |

**計算式**:
```javascript
baseMinHp = 5 + (stageDifficulty * 15)
baseMaxHp = 15 + (stageDifficulty * 20)
// + 時間経過による上昇
```

### 5-6. UI/UX改善

**ご褒美動画の全画面表示**:
- `position: fixed; width: 100vw; height: 100vh;`
- ノベルゲーム風の没入感を実現
- `object-fit: contain`で縦横比を維持

**プログレスバー改善**:
- ステージ名を表示（チュートリアル、ステージ1-3）
- 進行度を%で表示

**ボタンテキスト変更**:
- 「もう一度プレイ」→「次へ」
- ステージ進行が分かりやすく

### 5-7. ゲームフロー設計

**状態管理**:
```javascript
gameState = {
    currentStage: 0,        // 0=チュートリアル, 1-3=各ルート
    storyRoute: null,       // 'sister', 'olderSister', 'mother'
    itemHistory: [],        // 取得順序記録
    items: {...},           // 取得数
    ...
}
```

**ステージ遷移**:
1. `stageComplete()` - ステージ終了
2. `determineRoute()` - ルート決定（チュートリアル後のみ）
3. `showReward()` - ご褒美動画表示
4. `nextStage()` - 次のステージへ（ボタンクリック）
5. `showEnding()` - 全クリア時

### 5-8. 技術的な改善

**削除したコード**:
- Bossクラス全体
- ボス戦関連のロジック
- `isBossBattle`フラグ

**追加したコード**:
- ステージ管理システム
- ルート分岐ロジック
- アイテム履歴システム
- 段階的難易度調整

**コード量**: 約100行の変更と追加

## Phase 5で学んだこと

1. **ゲーム設計の重要性**: 単純なシューティングから本格的なストーリーゲームへ
2. **状態管理の複雑性**: ステージ進行、ルート分岐の管理
3. **公平性の実現**: 同数時の優先順位を履歴で解決
4. **段階的な難易度**: プレイヤーが成長を感じられる設計
5. **没入感の演出**: 全画面動画でストーリー性を強化

---

## Phase 6: ノベルシステムの実装と動画統合 (2025-11-01)

参考ノベルゲーム（TyranoScript製）の構造を分析し、より洗練されたご褒美システムを実装しました。

### 6-1. 参考ノベルゲームからの学び

**重要な発見**:
- 動画は背景として再生され、その上にテキストボックスが表示される
- 動画再生中もテキストは進行可能（クリックで次へ）
- 静止画と動画をシームレスに切り替え
- 動画はループ再生され、没入感を維持

### 6-2. システムの全面的な改修

**旧システムの問題点**:
- 動画が全画面で再生され、テキストが消える
- 動画終了まで次に進めない
- 静止画と動画の遷移が不自然
- トリガーセリフの概念が複雑

**新システム**:
```
ノベル画面（統一）
├── 背景レイヤー
│   ├── 静止画（<img>）
│   └── 動画（<video loop>）← 常にループ再生
└── テキストボックス（常に表示）
    ├── キャラクター名
    ├── セリフ
    └── クリック促進アイコン
```

### 6-3. CSVフォーマットの簡略化

**旧フォーマット（複雑）**:
```csv
route,stage,scene_type,character_name,text,image,trigger_video,video_path
sister,1,text,妹,セリフ,images/sister.jpg,video1,
sister,1,video,,,,,videos/sister-1-part1.mp4
```

**新フォーマット（シンプル）**:
```csv
route,stage,character_name,text,background,background_type
sister,1,妹,セリフ,images/sister.jpg,image
sister,1,妹,セリフ,videos/sister-1-part1.mp4,video
```

- scene_typeを廃止（すべてテキストシーン）
- trigger_videoを廃止（背景が自動切り替え）
- backgroundに画像・動画両方を指定可能

### 6-4. 実装の詳細

**HTML構造**:
```html
<div id="novel-screen">
  <div id="novel-background">
    <img id="novel-image"> <!-- 静止画 -->
    <video id="novel-video" loop muted autoplay> <!-- 動画 -->
  </div>
  <div id="novel-textbox">
    <div id="novel-character-name"></div>
    <div id="novel-text"></div>
    <div id="novel-continue">▼ クリックで続く</div>
  </div>
</div>
```

**動画再生の仕様**:
- `loop`: 動画を繰り返し再生（没入感維持）
- `muted`: 音声なし（テキスト読み上げに集中）
- `autoplay`: 自動再生開始
- `object-fit: contain`: アスペクト比維持

**JavaScriptロジック**:
```javascript
function displayCurrentScene() {
    const scene = gameState.currentScenes[gameState.currentSceneIndex];

    // テキスト更新
    document.getElementById('novel-character-name').textContent = scene.character_name;
    document.getElementById('novel-text').textContent = scene.text;

    // 背景切り替え
    if (scene.background_type === 'image') {
        novelImage.src = scene.background;
        novelImage.style.display = 'block';
        novelVideo.style.display = 'none';
        novelVideo.pause();
    } else if (scene.background_type === 'video') {
        novelVideoSource.src = scene.background;
        novelVideo.load();
        novelVideo.play();
        novelVideo.style.display = 'block';
        novelImage.style.display = 'none';
    }
}
```

### 6-5. ゲームフローの改善

**旧フロー**:
```
ステージクリア → ノベル（テキスト） → 全画面動画1
→ ノベル（テキスト） → 全画面動画2 → リワード画面
```

**新フロー**:
```
ステージクリア
  ↓
ノベルシーン（背景=静止画）
  ↓ クリック
ノベルシーン（背景=静止画）
  ↓ クリック
ノベルシーン（背景=動画1）← 動画ループ再生、テキスト表示
  ↓ クリック
ノベルシーン（背景=動画1）← 同じ動画、別のセリフ
  ↓ クリック
ノベルシーン（背景=静止画）
  ↓ クリック
ノベルシーン（背景=動画2）← 動画ループ再生
  ↓ クリック
...
  ↓
リワード画面（統計表示）
  ↓
次のステージへ
```

### 6-6. シナリオ例（妹ルート・ステージ1）

```csv
sister,1,妹,お兄ちゃん、お疲れ様！,images/sister.jpg,image
sister,1,妹,今日も頑張ってくれたんだね,images/sister.jpg,image
sister,1,妹,ご褒美をあげるね♪,images/sister.jpg,image
sister,1,妹,んっ…♡,videos/sister-1-part1.mp4,video
sister,1,妹,あっ…もっと♡,videos/sister-1-part1.mp4,video
sister,1,妹,どうだった？,images/sister.jpg,image
sister,1,妹,もっと見たい？,images/sister.jpg,image
sister,1,妹,じゃあ、特別にもう一つ見せてあげる,images/sister.jpg,image
sister,1,妹,んんっ…激しい♡,videos/sister-1-part2.mp4,video
sister,1,妹,お兄ちゃん…好き♡,videos/sister-1-part2.mp4,video
```

### 6-7. 技術的な改善点

**削除したコード**:
- 動画専用画面（`#video-screen`）
- 全画面動画再生システム
- トリガービデオ判定ロジック
- 複雑なシーン遷移管理

**追加・改善したコード**:
- 動画を背景レイヤーとして統合
- シンプルな背景切り替えロジック
- ループ再生による没入感向上
- 統一されたノベルUI

**コード削減量**: 約80行（シンプル化）

### 6-8. ユーザー体験の向上

**改善前**:
- 動画が終わるまで待つ必要がある
- 動画とテキストが分断されている
- スキップできない

**改善後**:
- クリックで自由に進める
- 動画を見ながらセリフを読める
- ループ再生で好きなだけ見られる
- ノベルゲーム風の一体感

### 6-9. 必要なアセット

**画像ファイル（3個）**:
- `images/sister.jpg` - 妹の立ち絵
- `images/older-sister.jpg` - 姉の立ち絵
- `images/mother.jpg` - 母の立ち絵

**動画ファイル（18個）**:
各ルート × 3ステージ × 2本 = 18本
- `videos/sister-1-part1.mp4`, `videos/sister-1-part2.mp4`
- `videos/sister-2-part1.mp4`, `videos/sister-2-part2.mp4`
- `videos/sister-3-part1.mp4`, `videos/sister-3-part2.mp4`
- `videos/older-sister-1-part1.mp4`, `videos/older-sister-1-part2.mp4`
- `videos/older-sister-2-part1.mp4`, `videos/older-sister-2-part2.mp4`
- `videos/older-sister-3-part1.mp4`, `videos/older-sister-3-part2.mp4`
- `videos/mother-1-part1.mp4`, `videos/mother-1-part2.mp4`
- `videos/mother-2-part1.mp4`, `videos/mother-2-part2.mp4`
- `videos/mother-3-part1.mp4`, `videos/mother-3-part2.mp4`

## Phase 6で学んだこと

1. **既存ノベルゲームの分析価値**: TyranoScriptの実装から学んだ動画背景手法
2. **シンプルさの重要性**: 複雑なトリガーシステムより、シンプルな背景切り替え
3. **ユーザー体験の優先**: 自由にクリックで進める > 動画終了待ち
4. **没入感の演出**: ループ再生により、プレイヤーが自分のペースで楽しめる
5. **データ駆動設計**: CSVでシナリオを完全に管理、拡張性が向上

---

## Phase 7: ゲームバランス調整とエフェクトシステム実装 (2025-11-01)

### 7-1. ボス戦のゲームバランス調整

ユーザーからのフィードバック：「ボスの攻撃でほぼゲームオーバーになる」

**問題点**:
- ボスの接触ダメージが10と高すぎた
- 兵士数が10未満だと即死状態
- ボスの降下攻撃が避けられない

**実装した改善**:

1. **接触ダメージの大幅減少** (game.js:950, 1019)
   ```javascript
   const damage = 3; // 10 → 3 に減少
   ```
   - ボスとの接触時のダメージを70%削減
   - 兵士数が少なくてもゲームオーバーになりにくく

2. **降下攻撃の回避性向上** (game.js:654-660)
   ```javascript
   // ランダムオフセット追加
   const offset = (Math.random() - 0.5) * 120; // -60 ~ +60px
   this.x = Math.max(this.width / 2, Math.min(CONFIG.canvasWidth - this.width / 2, player.x + offset));
   ```
   - プレイヤーの正確な位置ではなく、ランダムな位置に降下
   - 完全回避が可能に

3. **降下速度の減少** (game.js:13)
   ```javascript
   bossAttackSpeed: 2.5, // 3 → 2.5 に減少
   ```
   - 降下速度が遅くなり、反応時間が増加

**改善効果**:
- ボス戦の難易度が適正レベルに
- プレイヤーのスキルで避けられるように
- 兵士数を保ちやすくなった

### 7-2. 着弾・破壊エフェクトシステムの実装

ユーザー要望：「着弾時と破壊時にエフェクトを追加したい」

**設計方針**:
- 画像1枚でサイズを変えて表現
- 着弾時 = 小サイズ
- 破壊時 = 大サイズ
- フェードアウトで消える

**実装内容**:

1. **CONFIG設定追加** (game.js:30-33)
   ```javascript
   hitEffectImage: 'images/hit-effect.png',
   hitEffectSmallSize: 30,  // 着弾時のサイズ（ピクセル）
   hitEffectLargeSize: 80   // 破壊時のサイズ（ピクセル）
   ```

2. **HitEffectクラス作成** (game.js:557-593)
   ```javascript
   class HitEffect {
       constructor(x, y, isDestroy = false) {
           this.size = isDestroy ? CONFIG.hitEffectLargeSize : CONFIG.hitEffectSmallSize;
           this.opacity = 1.0;
           this.maxLife = 30; // 0.5秒（60fps）
       }

       update() {
           this.life++;
           this.opacity = 1.0 - (this.life / this.maxLife); // フェードアウト
       }
   }
   ```

3. **エフェクト生成タイミング**:
   - **着弾時** (game.js:933): 弾が障害物に当たった瞬間
     ```javascript
     hitEffects.push(new HitEffect(bullet.x, bullet.y, false));
     ```
   - **破壊時** (game.js:930, 1009): 障害物/ボスのHPが0になった瞬間
     ```javascript
     hitEffects.push(new HitEffect(obstacle.x, obstacle.y, true));
     ```

4. **ゲームループ統合** (game.js:995-1000)
   ```javascript
   hitEffects = hitEffects.filter(effect => effect.active);
   hitEffects.forEach(effect => {
       effect.update();
       effect.draw(ctx);
   });
   ```

5. **必要なアセット**:
   - `images/hit-effect.png` - エフェクト画像（1枚）

**技術的な工夫**:
- takeDamage()メソッドが破壊判定を返すように変更（game.js:418-430, 711-719）
- 障害物とボスの両方に対応
- エフェクトの寿命管理（自動削除）

### 7-3. ゲーム体験の向上

**改善前**:
- ボス戦で理不尽にゲームオーバー
- 弾が当たっても視覚的フィードバックがない
- 破壊の爽快感が薄い

**改善後**:
- ボス戦が適正難易度に（スキルで避けられる）
- 着弾エフェクトで命中感が向上
- 破壊時の大きなエフェクトで爽快感アップ

## Phase 7で学んだこと

1. **ゲームバランスの重要性**: 数値調整だけでプレイ体験が大きく変わる
2. **視覚的フィードバック**: エフェクトがあるだけでゲームの手応えが向上
3. **プレイヤーテスト**: 実際にプレイしないと分からない問題がある
4. **段階的改善**: ダメージ減少 + 速度調整 + ランダム化の複合効果

---

作成日: 2025-10-31
最終更新: 2025-11-01
開発者: Claude (Anthropic) + User
