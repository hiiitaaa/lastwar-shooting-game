// ゲーム設定
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 6,
    bulletSpeed: 10,
    obstacleSpeed: 1.5, // 半分の速度に
    soldierGaugeSpeed: 1.5, // 半分の速度に
    obstacleSpawnRate: 120, // 2秒ごと（少し減らす）
    soldierGaugeSpawnRate: 180, // 3秒ごと
    stageDuration: 2400, // 40秒でボス戦
    bossHp: 500,
    bossAttackSpeed: 3, // ボスの降下攻撃速度
    videoPath: {
        sister: 'videos/sister.mp4',
        olderSister: 'videos/older-sister.mp4',
        mother: 'videos/mother.mp4'
    }
};

// ゲーム状態
let gameState = {
    screen: 'start', // 'start', 'game', 'boss', 'reward'
    score: 0,
    soldiers: 1,
    items: {
        sister: 0,
        olderSister: 0,
        mother: 0
    },
    frame: 0,
    canvas: null,
    ctx: null,
    isBossBattle: false
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
        this.width = 40;
        this.height = 40;
        this.speed = CONFIG.playerSpeed;
        this.shootCooldown = 0;
    }

    draw(ctx) {
        // プレイヤーを青い三角形で描画
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        // 兵士数を表示
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`x${gameState.soldiers}`, this.x, this.y + this.height);
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
    const hp = Math.floor(Math.random() * 50) + 20; // 20-70のランダムHP（増やした）

    // 50%の確率で報酬アイテム付き（確率を上げた）
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
    const amount = Math.floor(Math.random() * 5) + 2; // 2-6人増加（増やした）
    soldierGauges.push(new SoldierGauge(x, y, amount));
}

// ゲームループ
function gameLoop() {
    if (gameState.screen !== 'game') return;

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

    // ボス戦判定
    if (!gameState.isBossBattle && gameState.frame >= CONFIG.stageDuration) {
        startBossBattle();
    }

    if (gameState.isBossBattle) {
        // ボス戦モード
        if (boss && boss.active) {
            boss.update();
            boss.draw(ctx);

            // 弾とボスの衝突判定
            bullets.forEach(bullet => {
                if (bullet.active && checkCollision(bullet, boss)) {
                    bullet.active = false;
                    boss.takeDamage();
                }
            });

            // ボスの攻撃がプレイヤーに当たったかチェック
            if (boss.checkPlayerCollision(player)) {
                // プレイヤーがダメージを受ける（ここでは兵士数を減らす）
                if (gameState.soldiers > 1) {
                    gameState.soldiers = Math.max(1, gameState.soldiers - 2);
                }
            }

            // ボス撃破判定
            if (!boss.active) {
                endGame();
                return;
            }
        }
    } else {
        // 通常モード: 障害物と兵士ゲージのスポーン
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
    }

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

    requestAnimationFrame(gameLoop);
}

// ボス戦開始
function startBossBattle() {
    gameState.isBossBattle = true;
    boss = new Boss();
    // 既存の障害物とゲージをクリア
    obstacles = [];
    soldierGauges = [];
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('soldiers').textContent = gameState.soldiers;
    document.getElementById('sister-count').textContent = gameState.items.sister;
    document.getElementById('older-sister-count').textContent = gameState.items.olderSister;
    document.getElementById('mother-count').textContent = gameState.items.mother;

    // プログレスバー更新
    if (gameState.isBossBattle) {
        document.getElementById('progress-text').textContent = 'ボス戦！';
        document.getElementById('progress-fill').style.width = '100%';
    } else {
        const progress = (gameState.frame / CONFIG.stageDuration) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = Math.floor(progress) + '%';
    }
}

// ゲーム開始
function startGame() {
    // 画面切り替え
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gameState.screen = 'game';

    // ゲーム状態リセット
    gameState.score = 0;
    gameState.soldiers = 1;
    gameState.items = { sister: 0, olderSister: 0, mother: 0 };
    gameState.frame = 0;
    gameState.isBossBattle = false;

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
    boss = null;

    // ゲームループ開始
    gameLoop();
}

// ゲーム終了
function endGame() {
    gameState.screen = 'reward';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('reward-screen').style.display = 'flex';

    // 統計表示
    document.getElementById('final-sister-count').textContent = gameState.items.sister;
    document.getElementById('final-older-sister-count').textContent = gameState.items.olderSister;
    document.getElementById('final-mother-count').textContent = gameState.items.mother;
    document.getElementById('final-score').textContent = gameState.score;

    // 最も多く集めたアイテムを判定
    const items = gameState.items;
    let maxType = 'sister';
    let maxCount = items.sister;

    if (items.olderSister > maxCount) {
        maxType = 'olderSister';
        maxCount = items.olderSister;
    }
    if (items.mother > maxCount) {
        maxType = 'mother';
        maxCount = items.mother;
    }

    // タイトル変更
    const titles = {
        sister: '妹エンディング！',
        olderSister: '姉エンディング！',
        mother: '母エンディング！'
    };
    document.getElementById('reward-title').textContent = titles[maxType];

    // 動画設定
    const videoSource = document.getElementById('video-source');
    const video = document.getElementById('reward-video');
    videoSource.src = CONFIG.videoPath[maxType];
    video.load();
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

// ボタンイベント
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', () => {
    document.getElementById('reward-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    gameState.screen = 'start';
});

console.log('ゲーム読み込み完了！');
