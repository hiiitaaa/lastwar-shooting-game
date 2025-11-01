// ゲーム設定
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 6,
    bulletSpeed: 10,
    obstacleSpeed: 1.5,
    soldierGaugeSpeed: 1.5,
    obstacleSpawnRate: 120,
    soldierGaugeSpawnRate: 180,
    stageDuration: 1800, // 30秒（60fps * 30）
    bossHp: 500,
    bossAttackSpeed: 3,
    scenesCSV: 'scenes.csv',
    // プレイヤーグラフィック設定
    playerGraphic: 'images/player.mov',  // .mov, .webm, .mp4, .gif, .png に対応
    playerGraphicType: 'mov'  // 'mov', 'webm', 'mp4', 'gif', 'png'
};

// シーンデータ（CSVから読み込む）
let scenesData = [];

// プレイヤーグラフィックリソース
let playerGraphicElement = null;

// プレイヤーグラフィックの初期化
function initPlayerGraphic() {
    const videoFormats = ['mov', 'webm', 'mp4'];

    if (videoFormats.includes(CONFIG.playerGraphicType)) {
        // MOV/WebM/MP4動画の場合
        playerGraphicElement = document.createElement('video');
        playerGraphicElement.src = CONFIG.playerGraphic;
        playerGraphicElement.loop = true;
        playerGraphicElement.muted = true;
        playerGraphicElement.autoplay = true;
        playerGraphicElement.playsInline = true; // モバイル対応
        playerGraphicElement.play();
    } else {
        // GIF/PNGの場合
        playerGraphicElement = new Image();
        playerGraphicElement.src = CONFIG.playerGraphic;
    }
}

// ゲーム状態
let gameState = {
    screen: 'start', // 'start', 'game', 'novel', 'video', 'reward', 'menu'
    score: 0,
    soldiers: 1,
    items: {
        sister: 0,
        olderSister: 0,
        mother: 0
    },
    itemHistory: [], // アイテム取得履歴（最初に取ったもの優先用）
    currentStage: 0, // 0=チュートリアル, 1-3=各ルートのステージ
    storyRoute: null, // 'sister', 'olderSister', 'mother'
    frame: 0,
    canvas: null,
    ctx: null,
    flashTimer: 0,
    // ノベルシステム用
    currentScenes: [], // 現在のステージのシーン配列
    currentSceneIndex: 0, // 現在表示中のシーンインデックス
    // 一時停止用
    paused: false,
    previousScreen: null
};

// ゲームオブジェクト
let player = null;
let bullets = [];
let obstacles = []; // 障害物（数字付き）
let soldierGauges = []; // 青いゲージ（兵士数増加）
let boss = null;

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 120;  // 40 → 120（3倍）
        this.height = 120; // 40 → 120（3倍）
        this.speed = CONFIG.playerSpeed;
        this.shootCooldown = 0;
    }

    draw(ctx) {
        // プレイヤーグラフィックを描画
        let graphicReady = false;

        if (playerGraphicElement) {
            const videoFormats = ['mov', 'webm', 'mp4'];

            if (videoFormats.includes(CONFIG.playerGraphicType)) {
                // MOV/WebM/MP4動画の場合：readyStateをチェック
                graphicReady = playerGraphicElement.readyState >= 2; // HAVE_CURRENT_DATA以上
            } else {
                // GIF/PNGの場合：completeをチェック
                graphicReady = playerGraphicElement.complete && playerGraphicElement.naturalWidth > 0;
            }
        }

        if (graphicReady) {
            // グラフィック（動画/GIF/PNG）を描画
            try {
                ctx.drawImage(
                    playerGraphicElement,
                    this.x - this.width / 2,
                    this.y - this.height / 2,
                    this.width,
                    this.height
                );
            } catch (e) {
                // 描画エラー時はフォールバック
                console.warn('Player graphic draw error:', e);
                graphicReady = false;
            }
        }

        if (!graphicReady) {
            // フォールバック：青い三角形で描画
            ctx.save();
            ctx.fillStyle = '#4ecdc4';
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height / 2);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 兵士数を表示
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(`x${gameState.soldiers}`, this.x, this.y + this.height / 2 + 5);
        ctx.fillText(`x${gameState.soldiers}`, this.x, this.y + this.height / 2 + 5);
    }

    move(direction) {
        if (direction === 'left') {
            this.x = Math.max(this.width / 2, this.x - this.speed);
        } else if (direction === 'right') {
            this.x = Math.min(CONFIG.canvasWidth - this.width / 2, this.x + this.speed);
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            // 兵士数に応じて複数の弾を発射
            const bulletCount = Math.min(gameState.soldiers, 10);
            const spread = 20;

            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * spread;
                bullets.push(new Bullet(this.x + offset, this.y - this.height / 2));
            }

            this.shootCooldown = 15;
        }
    }

    update() {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        this.shoot(); // 自動射撃
    }
}

// 弾クラス
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 8; // 少し大きく
        this.height = 20; // 少し大きく
        this.speed = CONFIG.bulletSpeed;
        this.active = true;
    }

    draw(ctx) {
        ctx.fillStyle = '#ffe66d';
        // 中心座標ベースで描画
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
        if (this.y < 0) {
            this.active = false;
        }
    }
}

// 障害物クラス（数字付き）
class Obstacle {
    constructor(x, y, hp, rewardType) {
        this.x = x;
        this.y = y;
        this.width = 350; // レーン幅いっぱい
        this.height = 120; // 高さも増やす
        this.speed = CONFIG.obstacleSpeed;
        this.active = true;
        this.maxHp = hp;
        this.hp = hp;
        this.rewardType = rewardType; // 'sister', 'olderSister', 'mother', null
        this.hasReward = rewardType !== null;
    }

    draw(ctx) {
        // 障害物本体（赤）
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // 枠線を追加
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // HP数字を大きく表示
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp, this.x, this.y + 20);

        // 報酬アイテムを上に表示
        if (this.hasReward && this.rewardType) {
            const colors = {
                sister: '#ff6b9d',
                olderSister: '#4ecdc4',
                mother: '#ffe66d'
            };
            const labels = {
                sister: '妹',
                olderSister: '姉',
                mother: '母'
            };

            // 報酬アイコン（大きく）
            ctx.fillStyle = colors[this.rewardType];
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height / 2 - 25, 20, 0, Math.PI * 2);
            ctx.fill();

            // 文字
            ctx.fillStyle = this.rewardType === 'mother' ? '#333' : 'white';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(labels[this.rewardType], this.x, this.y - this.height / 2 - 25);
        }
    }

    update() {
        this.y += this.speed;
        if (this.y > CONFIG.canvasHeight + 50) {
            this.active = false;
        }
    }

    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
            // 報酬アイテム取得
            if (this.hasReward && this.rewardType) {
                gameState.items[this.rewardType]++;
                // 取得履歴に追加（最初に取ったもの優先のため）
                gameState.itemHistory.push(this.rewardType);
            }
            gameState.score += this.maxHp * 5;
        }
    }
}

// 兵士数増加ゲージクラス（青いゲージ）
class SoldierGauge {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.width = 350; // レーン幅いっぱい
        this.height = 100; // 高さも増やす
        this.speed = CONFIG.soldierGaugeSpeed;
        this.active = true;
        this.amount = amount; // 増加する兵士数
    }

    draw(ctx) {
        // 青いゲージ
        ctx.fillStyle = '#5DADE2';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // 枠
        ctx.strokeStyle = '#2874A6';
        ctx.lineWidth = 5;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // +数字を表示
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${this.amount}`, this.x, this.y);
    }

    update() {
        this.y += this.speed;
        if (this.y > CONFIG.canvasHeight) {
            this.active = false;
        }
    }

    collect() {
        this.active = false;
        gameState.soldiers += this.amount;
        gameState.score += this.amount * 10;
    }
}

// ボスクラス
class Boss {
    constructor() {
        this.x = CONFIG.canvasWidth / 2;
        this.y = 100;
        this.initialY = 100;
        this.width = 120;
        this.height = 120;
        this.maxHp = CONFIG.bossHp;
        this.hp = CONFIG.bossHp;
        this.active = true;
        this.moveDirection = 1;
        this.moveSpeed = 2;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackTargetY = 0;
        this.returning = false;
    }

    draw(ctx) {
        // ボス本体（大きな赤い四角）
        ctx.fillStyle = this.isAttacking ? '#e74c3c' : '#c0392b';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // ボスの顔
        ctx.fillStyle = '#000';
        // 目
        ctx.fillRect(this.x - 30, this.y - 15, 15, 15);
        ctx.fillRect(this.x + 15, this.y - 15, 15, 15);
        // 口
        ctx.fillRect(this.x - 25, this.y + 20, 50, 10);

        // HPバー
        const hpBarWidth = 150;
        const hpBarHeight = 15;
        const hpBarX = this.x - hpBarWidth / 2;
        const hpBarY = this.y + this.height / 2 + 10;

        // HPバー背景
        ctx.fillStyle = '#555';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        // HP残量
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.2 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

        // HP数値
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.hp} / ${this.maxHp}`, this.x, hpBarY + hpBarHeight + 15);
    }

    update() {
        if (this.isAttacking) {
            // 降下攻撃中
            if (!this.returning) {
                // プレイヤーに向かって降下
                this.y += CONFIG.bossAttackSpeed;
                if (this.y >= this.attackTargetY) {
                    this.returning = true;
                }
            } else {
                // 元の位置に戻る
                this.y -= CONFIG.bossAttackSpeed;
                if (this.y <= this.initialY) {
                    this.y = this.initialY;
                    this.isAttacking = false;
                    this.returning = false;
                    this.attackCooldown = 180; // 3秒のクールダウン
                }
            }
        } else {
            // 通常時：左右に移動
            this.x += this.moveSpeed * this.moveDirection;
            if (this.x <= this.width / 2 || this.x >= CONFIG.canvasWidth - this.width / 2) {
                this.moveDirection *= -1;
            }

            // 攻撃クールダウン
            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            } else if (player) {
                // 攻撃開始
                this.startAttack();
            }
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.returning = false;
        // プレイヤーのX座標に向かう
        this.x = player.x;
        this.attackTargetY = CONFIG.canvasHeight - 150; // プレイヤーの少し上まで降下
    }

    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
            gameState.score += 1000;
        }
    }

    checkPlayerCollision(player) {
        // ボスとプレイヤーの衝突判定
        return this.isAttacking &&
               this.x - this.width / 2 < player.x + player.width / 2 &&
               this.x + this.width / 2 > player.x - player.width / 2 &&
               this.y - this.height / 2 < player.y + player.height / 2 &&
               this.y + this.height / 2 > player.y - player.height / 2;
    }
}

// 衝突判定（中心座標ベース）
function checkCollision(obj1, obj2) {
    // obj1とobj2の矩形の境界を計算
    const obj1Left = obj1.x - obj1.width / 2;
    const obj1Right = obj1.x + obj1.width / 2;
    const obj1Top = obj1.y - obj1.height / 2;
    const obj1Bottom = obj1.y + obj1.height / 2;

    const obj2Left = obj2.x - obj2.width / 2;
    const obj2Right = obj2.x + obj2.width / 2;
    const obj2Top = obj2.y - obj2.height / 2;
    const obj2Bottom = obj2.y + obj2.height / 2;

    // 矩形の重なり判定
    return obj1Left < obj2Right &&
           obj1Right > obj2Left &&
           obj1Top < obj2Bottom &&
           obj1Bottom > obj2Top;
}

// 障害物のスポーン（左右のレーンから）
function spawnObstacle() {
    // 画面を縦2分割：左レーン中心200、右レーン中心600
    const lane = Math.random() < 0.5 ? 'left' : 'right';
    const x = lane === 'left' ? 200 : 600; // レーン中心に配置

    const y = -60;

    // 同じレーンに近い位置に他のオブジェクトがないかチェック
    const tooClose = [...obstacles, ...soldierGauges].some(obj => {
        const sameX = Math.abs(obj.x - x) < 50; // 同じレーン
        const closeY = Math.abs(obj.y - y) < 150; // Y座標が近い
        return sameX && closeY;
    });

    // 近すぎる場合はスポーンをスキップ
    if (tooClose) {
        return;
    }

    // ステージと時間経過に応じてHPを段階的に増加
    const progress = gameState.frame / CONFIG.stageDuration; // 0.0 ~ 1.0
    const stageDifficulty = gameState.currentStage; // 0=チュートリアル, 1-3=各ルート
    let minHp, maxHp;

    // ベースHP（ステージによる基礎値）
    const baseMinHp = 5 + (stageDifficulty * 15); // ステージ0:5, 1:20, 2:35, 3:50
    const baseMaxHp = 15 + (stageDifficulty * 20); // ステージ0:15, 1:35, 2:55, 3:75

    // 時間経過による上昇
    if (progress < 0.33) {
        // 序盤
        minHp = baseMinHp;
        maxHp = baseMaxHp;
    } else if (progress < 0.66) {
        // 中盤
        minHp = baseMinHp + 10;
        maxHp = baseMaxHp + 15;
    } else {
        // 終盤
        minHp = baseMinHp + 20;
        maxHp = baseMaxHp + 30;
    }

    const hp = Math.floor(Math.random() * (maxHp - minHp + 1)) + minHp;

    // 50%の確率で報酬アイテム付き
    let rewardType = null;
    if (Math.random() < 0.5) {
        const types = ['sister', 'olderSister', 'mother'];
        rewardType = types[Math.floor(Math.random() * types.length)];
    }

    obstacles.push(new Obstacle(x, y, hp, rewardType));
}

// 兵士ゲージのスポーン（左右のレーンから）
function spawnSoldierGauge() {
    // 画面を縦2分割：左レーン中心200、右レーン中心600
    const lane = Math.random() < 0.5 ? 'left' : 'right';
    const x = lane === 'left' ? 200 : 600; // レーン中心に配置

    const y = -50;

    // 同じレーンに近い位置に他のオブジェクトがないかチェック
    const tooClose = [...obstacles, ...soldierGauges].some(obj => {
        const sameX = Math.abs(obj.x - x) < 50; // 同じレーン
        const closeY = Math.abs(obj.y - y) < 150; // Y座標が近い
        return sameX && closeY;
    });

    // 近すぎる場合はスポーンをスキップ
    if (tooClose) {
        return;
    }

    const amount = Math.floor(Math.random() * 5) + 2; // 2-6人増加（増やした）
    soldierGauges.push(new SoldierGauge(x, y, amount));
}

// 画面フラッシュエフェクト
function flashScreen() {
    gameState.flashTimer = 10; // 10フレーム間フラッシュ
}

// ゲームループ
function gameLoop() {
    if (gameState.screen !== 'game' || gameState.paused) {
        if (gameState.screen === 'game' && !gameState.paused) {
            requestAnimationFrame(gameLoop);
        }
        return;
    }

    const ctx = gameState.ctx;
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // 背景
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // 画面中央の分割線（縦2分割）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasWidth / 2, 0);
    ctx.lineTo(CONFIG.canvasWidth / 2, CONFIG.canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]); // 点線をリセット

    // ステージクリア判定
    if (gameState.frame >= CONFIG.stageDuration) {
        stageComplete();
        return;
    }

    // 障害物と兵士ゲージのスポーン
    gameState.frame++;

    if (gameState.frame % CONFIG.obstacleSpawnRate === 0) {
        spawnObstacle();
    }
    if (gameState.frame % CONFIG.soldierGaugeSpawnRate === 0) {
        spawnSoldierGauge();
    }

    // 障害物の更新と描画
    obstacles = obstacles.filter(obstacle => obstacle.active);
    obstacles.forEach(obstacle => {
        obstacle.update();
        obstacle.draw(ctx);
    });

    // 兵士ゲージの更新と描画
    soldierGauges = soldierGauges.filter(gauge => gauge.active);
    soldierGauges.forEach(gauge => {
        gauge.update();
        gauge.draw(ctx);
    });

    // 衝突判定: 弾と障害物
    bullets.forEach(bullet => {
        obstacles.forEach(obstacle => {
            if (bullet.active && obstacle.active && checkCollision(bullet, obstacle)) {
                bullet.active = false;
                obstacle.takeDamage();
            }
        });
    });

    // 衝突判定: プレイヤーと兵士ゲージ
    soldierGauges.forEach(gauge => {
        if (gauge.active && checkCollision(player, gauge)) {
            gauge.collect();
        }
    });

    // 衝突判定: プレイヤーと障害物（ダメージ）
    obstacles.forEach(obstacle => {
        if (obstacle.active && checkCollision(player, obstacle)) {
            // 障害物のHPだけ兵士数を減らす
            const damage = obstacle.hp;
            gameState.soldiers = Math.max(1, gameState.soldiers - damage);

            // 障害物を破壊
            obstacle.active = false;

            // 視覚的フィードバック（画面を赤く点滅）
            flashScreen();
        }
    });

    // プレイヤーの更新と描画
    player.update();
    player.draw(ctx);

    // 弾の更新と描画
    bullets = bullets.filter(bullet => bullet.active);
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw(ctx);
    });

    // UI更新
    updateUI();

    // ダメージフラッシュ効果
    if (gameState.flashTimer > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${gameState.flashTimer / 20})`;
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
        gameState.flashTimer--;
    }

    requestAnimationFrame(gameLoop);
}

// ステージクリア処理
function stageComplete() {
    // チュートリアル完了時にルート決定
    if (gameState.currentStage === 0) {
        determineRoute();
    }

    // ノベルシーン開始
    startNovelScene();
}

// ストーリールート決定（最初に取ったアイテム優先）
function determineRoute() {
    const items = gameState.items;
    const maxCount = Math.max(items.sister, items.olderSister, items.mother);

    // 同数の場合は最初に取得したものを優先
    if (items.sister === maxCount && items.olderSister === maxCount && items.mother === maxCount) {
        // 全て同数の場合、履歴の最初
        gameState.storyRoute = gameState.itemHistory[0] || 'sister';
    } else if (items.sister === maxCount && items.olderSister === maxCount) {
        // 妹と姉が同数
        gameState.storyRoute = gameState.itemHistory.find(item => item === 'sister' || item === 'olderSister') || 'sister';
    } else if (items.sister === maxCount && items.mother === maxCount) {
        // 妹と母が同数
        gameState.storyRoute = gameState.itemHistory.find(item => item === 'sister' || item === 'mother') || 'sister';
    } else if (items.olderSister === maxCount && items.mother === maxCount) {
        // 姉と母が同数
        gameState.storyRoute = gameState.itemHistory.find(item => item === 'olderSister' || item === 'mother') || 'olderSister';
    } else if (items.sister === maxCount) {
        gameState.storyRoute = 'sister';
    } else if (items.olderSister === maxCount) {
        gameState.storyRoute = 'olderSister';
    } else {
        gameState.storyRoute = 'mother';
    }
}

// CSVファイルを読み込む
async function loadScenes() {
    try {
        const response = await fetch(CONFIG.scenesCSV);
        const text = await response.text();
        const lines = text.split('\n');

        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const parts = line.split(',');
            if (parts.length >= 5) {
                scenesData.push({
                    route: parts[0],
                    stage: parseInt(parts[1]),
                    character_name: parts[2],
                    text: parts[3],
                    background: parts[4],
                    background_type: parts[5] // 'image' or 'video'
                });
            }
        }

        console.log('シーンデータ読み込み完了:', scenesData.length, '件');
    } catch (error) {
        console.error('CSVファイルの読み込みに失敗:', error);
        alert('シーンデータの読み込みに失敗しました。');
    }
}

// 指定されたルートとステージのシーンを取得
function getScenesForStage(route, stage) {
    return scenesData.filter(scene =>
        scene.route === route && scene.stage === stage
    );
}

// ノベルシーン表示開始
function startNovelScene() {
    gameState.screen = 'novel';
    gameState.currentSceneIndex = 0;

    // 現在のステージのシーンを取得
    gameState.currentScenes = getScenesForStage(
        gameState.storyRoute,
        gameState.currentStage
    );

    if (gameState.currentScenes.length === 0) {
        console.warn('シーンが見つかりません。リワード画面へ');
        showReward();
        return;
    }

    // 画面を切り替え
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('novel-screen').style.display = 'block';
    document.getElementById('reward-screen').style.display = 'none';

    // 最初のシーンを表示
    displayCurrentScene();
}

// 現在のシーンを表示
function displayCurrentScene() {
    const scene = gameState.currentScenes[gameState.currentSceneIndex];

    // キャラクター名とテキストを設定
    document.getElementById('novel-character-name').textContent = scene.character_name;
    document.getElementById('novel-text').textContent = scene.text;

    const novelImage = document.getElementById('novel-image');
    const novelVideo = document.getElementById('novel-video');
    const novelVideoSource = document.getElementById('novel-video-source');

    if (scene.background_type === 'image') {
        // 静止画を表示
        novelImage.src = scene.background;
        novelImage.style.display = 'block';
        novelVideo.style.display = 'none';
        novelVideo.pause();
    } else if (scene.background_type === 'video') {
        // 動画を背景として再生
        novelVideoSource.src = scene.background;
        novelVideo.load();
        novelVideo.play();
        novelVideo.style.display = 'block';
        novelImage.style.display = 'none';
    }

    // ノベル画面を表示
    document.getElementById('novel-screen').style.display = 'block';
    gameState.screen = 'novel';
}

// 次のシーンへ進む
function nextScene() {
    gameState.currentSceneIndex++;

    if (gameState.currentSceneIndex < gameState.currentScenes.length) {
        // まだシーンが残っている
        displayCurrentScene();
    } else {
        // 全シーン終了、リワード画面へ
        showReward();
    }
}

// ノベル画面のクリックイベント
document.getElementById('novel-screen').addEventListener('click', () => {
    if (gameState.screen === 'novel') {
        nextScene();
    }
});

// リワード画面表示
function showReward() {
    gameState.screen = 'reward';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('novel-screen').style.display = 'none';
    document.getElementById('reward-screen').style.display = 'flex';

    // 統計表示
    document.getElementById('final-sister-count').textContent = gameState.items.sister;
    document.getElementById('final-older-sister-count').textContent = gameState.items.olderSister;
    document.getElementById('final-mother-count').textContent = gameState.items.mother;
    document.getElementById('final-score').textContent = gameState.score;

    // タイトル設定
    let title = '';
    if (gameState.currentStage === 0) {
        // チュートリアル完了
        const routeNames = {
            sister: '妹ルート',
            olderSister: '姉ルート',
            mother: '母ルート'
        };
        title = `${routeNames[gameState.storyRoute]}に決定！`;
    } else {
        // ステージクリア
        title = `ステージ${gameState.currentStage}クリア！`;
    }
    document.getElementById('reward-title').textContent = title;
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('soldiers').textContent = gameState.soldiers;
    document.getElementById('sister-count').textContent = gameState.items.sister;
    document.getElementById('older-sister-count').textContent = gameState.items.olderSister;
    document.getElementById('mother-count').textContent = gameState.items.mother;

    // プログレスバー更新
    const progress = (gameState.frame / CONFIG.stageDuration) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // ステージ表示
    const stageText = gameState.currentStage === 0 ? 'チュートリアル' : `ステージ${gameState.currentStage}`;
    document.getElementById('progress-text').textContent = `${stageText} - ${Math.floor(progress)}%`;
}

// ゲーム開始
function startGame() {
    // 画面切り替え
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gameState.screen = 'game';

    // 初回起動時のみリセット
    if (gameState.currentStage === 0 && !gameState.storyRoute) {
        gameState.score = 0;
        gameState.soldiers = 1;
        gameState.items = { sister: 0, olderSister: 0, mother: 0 };
        gameState.itemHistory = [];
        gameState.storyRoute = null;
    }

    gameState.frame = 0;
    gameState.flashTimer = 0;

    // キャンバス設定
    const canvas = document.getElementById('game-canvas');
    gameState.canvas = canvas;
    gameState.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;

    // プレイヤー初期化
    player = new Player(CONFIG.canvasWidth / 2, CONFIG.canvasHeight - 80);
    bullets = [];
    obstacles = [];
    soldierGauges = [];

    // ゲームループ開始
    gameLoop();
}

// 次のステージへ
function nextStage() {
    gameState.currentStage++;

    // 最後のステージ（3）をクリアしたらエンディング
    if (gameState.currentStage > 3) {
        showEnding();
        return;
    }

    // 次のステージ開始
    startGame();
}

// エンディング表示
function showEnding() {
    // TODO: エンディング画面を実装
    alert('エンディング！ゲームクリアおめでとうございます！');
    resetGame();
}

// ゲーム完全リセット
function resetGame() {
    document.getElementById('reward-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    gameState.screen = 'start';
    gameState.currentStage = 0;
    gameState.storyRoute = null;
    gameState.score = 0;
    gameState.soldiers = 1;
    gameState.items = { sister: 0, olderSister: 0, mother: 0 };
    gameState.itemHistory = [];
}

// キーボード入力
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// プレイヤー移動処理
setInterval(() => {
    if (gameState.screen === 'game' && player) {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.move('left');
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.move('right');
        }
    }
}, 1000 / 60);

// タッチ/マウス入力（スワイプ対応）
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    if (gameState.screen === 'game' && player) {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const canvas = gameState.canvas;
        const rect = canvas.getBoundingClientRect();
        const canvasX = ((touchX - rect.left) / rect.width) * CONFIG.canvasWidth;
        player.x = Math.max(player.width / 2, Math.min(CONFIG.canvasWidth - player.width / 2, canvasX));
    }
}, { passive: false });

// メニュー表示
function showMenu() {
    gameState.paused = true;
    gameState.previousScreen = gameState.screen;
    gameState.screen = 'menu';
    document.getElementById('menu-screen').style.display = 'flex';
}

// メニューを閉じる
function closeMenu() {
    gameState.paused = false;
    gameState.screen = gameState.previousScreen;
    document.getElementById('menu-screen').style.display = 'none';

    // ゲーム画面ならループを再開
    if (gameState.screen === 'game') {
        requestAnimationFrame(gameLoop);
    }
}

// ホームに戻る
function goHome() {
    // メニューを閉じる
    document.getElementById('menu-screen').style.display = 'none';

    // ゲームをリセット
    resetGame();
}

// ボタンイベント
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', () => {
    // リワード画面のボタンを「次へ」に変更
    nextStage();
});

// メニューボタン
document.getElementById('menu-button').addEventListener('click', showMenu);

// メニュー内ボタン
document.getElementById('resume-button').addEventListener('click', closeMenu);
document.getElementById('home-button').addEventListener('click', goHome);

// ページ読み込み時にCSVとプレイヤーグラフィックを読み込む
window.addEventListener('load', async () => {
    await loadScenes();
    initPlayerGraphic();
    console.log('ゲーム読み込み完了！');
});
