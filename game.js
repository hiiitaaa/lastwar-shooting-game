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
    playerGraphic: 'images/player.webm',  // .mov, .webm, .mp4, .gif, .png に対応
    playerGraphicType: 'webm',  // 'mov', 'webm', 'mp4', 'gif', 'png'
    // 背景画像設定
    backgroundImage: 'images/background.png',  // null で単色背景
    // キャラクターアイコン設定
    characterIcons: {
        sister: 'images/sister-icon.png',
        olderSister: 'images/older-sister-icon.png',
        mother: 'images/mother-icon.png'
    },
    // 弾の画像設定
    bulletImage: 'images/bullet.png',  // null で四角形
    bulletWidth: 20,   // 弾の横幅（ピクセル）
    bulletHeight: 20   // 弾の縦幅（ピクセル）
};

// シーンデータ（CSVから読み込む）
let scenesData = [];

// プレイヤーグラフィックリソース
let playerGraphicElement = null;

// 背景画像リソース
let backgroundImage = null;

// キャラクターアイコン画像リソース
let characterIconImages = {
    sister: null,
    olderSister: null,
    mother: null
};

// 弾の画像リソース
let bulletImage = null;

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
    gameMode: 'story', // 'story'=ストーリーモード, 'gameonly'=ゲームオンリーモード
    score: 0,
    soldiers: 1,
    items: {
        sister: 0,
        olderSister: 0,
        mother: 0
    },
    itemHistory: [], // キャラ撃破履歴（最初に倒したもの優先用）
    currentStage: 0, // 0=チュートリアル, 1-3=各ルートのステージ
    storyRoute: null, // 'sister', 'olderSister', 'mother'
    isBossBattle: false, // ボス戦フラグ
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
let soldierSpawnEffects = []; // 兵士増加エフェクト

// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 120;  // 40 → 120（3倍）
        this.height = 120; // 40 → 120（3倍）
        this.speed = CONFIG.playerSpeed;
        this.shootCooldown = 0;
        this.soldierPositions = []; // 兵士の位置配列
    }

    // 兵士の位置を計算
    // ルール: 1人目=本体, 2-6人目=横並び, 7-11人目=上段, 12-16人目=下段, 17-21人目=上段2, ...
    calculateSoldierPositions() {
        this.soldierPositions = [];
        const soldierCount = gameState.soldiers;

        if (soldierCount <= 1) return; // プレイヤー本体のみ

        const soldierSize = 40; // 兵士1人のサイズ
        const spacing = 45; // 間隔

        // プレイヤー以外の兵士（soldierCount - 1人）を配置
        for (let i = 0; i < soldierCount - 1; i++) {
            let offsetX = 0;
            let offsetY = 0;

            // どの段か（0=横並び, 1=上段, 2=下段, 3=上段2, 4=下段2, ...）
            const tier = Math.floor(i / 5);
            // 段内での位置（0-4）
            const posInTier = i % 5;

            // 左右配置パターン（右→左→右2→左2→中央）
            if (posInTier === 0) {
                offsetX = spacing; // 右
            } else if (posInTier === 1) {
                offsetX = -spacing; // 左
            } else if (posInTier === 2) {
                offsetX = spacing * 2; // 右2
            } else if (posInTier === 3) {
                offsetX = -spacing * 2; // 左2
            } else if (posInTier === 4) {
                offsetX = 0; // 中央
            }

            // Y軸オフセット（段ごと: 横→上→下→上2→下2→...）
            if (tier === 0) {
                offsetY = 0; // 横並び（プレイヤーと同じ高さ）
            } else {
                // tier=1,3,5,7... は上段
                // tier=2,4,6,8... は下段
                const level = Math.floor((tier + 1) / 2); // 何段目か（1, 2, 3...）
                if (tier % 2 === 1) {
                    offsetY = -spacing * level; // 上段
                } else {
                    offsetY = spacing * level; // 下段
                }
            }

            this.soldierPositions.push({
                x: this.x + offsetX,
                y: this.y + offsetY,
                width: soldierSize,
                height: soldierSize
            });
        }
    }

    draw(ctx) {
        // プレイヤーグラフィックを描画
        let graphicReady = false;

        if (playerGraphicElement) {
            const videoFormats = ['mov', 'webm', 'mp4'];

            if (videoFormats.includes(CONFIG.playerGraphicType)) {
                // MOV/WebM/MP4動画の場合：readyStateをチェック
                graphicReady = playerGraphicElement.readyState >= 2; // HAVE_CURRENT_DATA以上

                // デバッグ: 動画の状態を表示（初回のみ）
                if (!this.videoDebugLogged) {
                    console.log('Player video readyState:', playerGraphicElement.readyState);
                    console.log('Player video error:', playerGraphicElement.error);
                    this.videoDebugLogged = true;
                }
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
            // デバッグ: プレイヤー座標を表示（初回のみ）
            if (!this.posDebugLogged) {
                console.log('Player position:', this.x, this.y);
                console.log('Player size:', this.width, this.height);
                console.log('Canvas size:', CONFIG.canvasWidth, CONFIG.canvasHeight);
                this.posDebugLogged = true;
            }

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

        // 兵士を描画
        this.calculateSoldierPositions();
        this.soldierPositions.forEach(soldier => {
            if (playerGraphicElement && graphicReady) {
                ctx.drawImage(
                    playerGraphicElement,
                    soldier.x - soldier.width / 2,
                    soldier.y - soldier.height / 2,
                    soldier.width,
                    soldier.height
                );
            } else {
                // フォールバック: 小さい三角形
                ctx.save();
                ctx.fillStyle = '#4ecdc4';
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(soldier.x, soldier.y - soldier.height / 2);
                ctx.lineTo(soldier.x - soldier.width / 2, soldier.y + soldier.height / 2);
                ctx.lineTo(soldier.x + soldier.width / 2, soldier.y + soldier.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        });

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
        this.width = CONFIG.bulletWidth || 20;   // 設定から読み込み
        this.height = CONFIG.bulletHeight || 20; // 設定から読み込み
        this.speed = CONFIG.bulletSpeed;
        this.active = true;
    }

    draw(ctx) {
        // 弾の画像を描画
        if (bulletImage && bulletImage.complete) {
            ctx.drawImage(
                bulletImage,
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        } else {
            // フォールバック: 黄色の四角形
            ctx.fillStyle = '#ffe66d';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }

    update() {
        this.y -= this.speed;
        if (this.y < 0) {
            this.active = false;
        }
    }
}

// 障害物クラス（キャラアイコン付き）
class Obstacle {
    constructor(x, y, hp, characterType) {
        this.x = x;
        this.y = y;
        this.width = 350; // レーン幅いっぱい
        this.height = 120; // 高さも増やす
        this.speed = CONFIG.obstacleSpeed;
        this.active = true;
        this.maxHp = hp;
        this.hp = hp;
        this.characterType = characterType; // 'sister', 'olderSister', 'mother'
    }

    draw(ctx) {
        // キャラアイコン画像を背景に表示
        const iconImage = characterIconImages[this.characterType];
        if (iconImage && iconImage.complete) {
            ctx.drawImage(
                iconImage,
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        } else {
            // フォールバック: 色付き四角形
            const colors = {
                sister: '#ff6b9d',
                olderSister: '#4ecdc4',
                mother: '#ffe66d'
            };
            ctx.fillStyle = colors[this.characterType];
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }

        // 枠線を追加
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 5;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // HP数字を上部に大きく表示（背景なし）
        ctx.save();
        // 白い縁取り
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(this.hp, this.x, this.y - this.height / 2 - 15);

        // HP数字（白）
        ctx.fillStyle = 'white';
        ctx.fillText(this.hp, this.x, this.y - this.height / 2 - 15);
        ctx.restore();
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
            // キャラ撃破数をカウント
            gameState.items[this.characterType]++;
            // 撃破履歴に追加（最初に倒したもの優先のため）
            gameState.itemHistory.push(this.characterType);
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

// 兵士増加エフェクトクラス
class SoldierSpawnEffect {
    constructor(baseX, baseY, count) {
        this.soldiers = [];
        const spacing = 40; // キャラクター間の間隔
        const startX = baseX - (count - 1) * spacing / 2; // 中央揃え

        // 増加した兵士の数だけキャラを横一列に生成
        for (let i = 0; i < count; i++) {
            this.soldiers.push({
                x: startX + i * spacing,
                y: baseY - 80, // プレイヤーの少し上
                startY: baseY - 80,
                opacity: 0,
                life: 0
            });
        }

        this.active = true;
        this.maxLife = 90; // 1.5秒
    }

    update() {
        this.soldiers.forEach(soldier => {
            soldier.life++;

            // フェードイン＆上昇
            if (soldier.life < 20) {
                soldier.opacity = soldier.life / 20;
            } else if (soldier.life > this.maxLife - 20) {
                soldier.opacity = (this.maxLife - soldier.life) / 20;
            } else {
                soldier.opacity = 1;
            }

            // 上昇
            soldier.y = soldier.startY - soldier.life * 0.5;
        });

        // 終了判定
        if (this.soldiers[0].life >= this.maxLife) {
            this.active = false;
        }
    }

    draw(ctx) {
        this.soldiers.forEach(soldier => {
            ctx.save();
            ctx.globalAlpha = soldier.opacity;

            // キャラ描画
            const size = 40; // サイズ

            if (playerGraphicElement) {
                const videoFormats = ['mov', 'webm', 'mp4'];

                if (videoFormats.includes(CONFIG.playerGraphicType) && playerGraphicElement.readyState >= 2) {
                    ctx.drawImage(
                        playerGraphicElement,
                        soldier.x - size / 2,
                        soldier.y - size / 2,
                        size,
                        size
                    );
                } else if (CONFIG.playerGraphicType === 'gif' || CONFIG.playerGraphicType === 'png') {
                    if (playerGraphicElement.complete) {
                        ctx.drawImage(
                            playerGraphicElement,
                            soldier.x - size / 2,
                            soldier.y - size / 2,
                            size,
                            size
                        );
                    }
                }
            }

            ctx.restore();
        });
    }
}

// ボスクラス
class Boss {
    constructor(characterType) {
        this.x = CONFIG.canvasWidth / 2;
        this.y = 100;
        this.initialY = 100;
        this.width = 240; // 障害物の2倍（350の約70%）
        this.height = 240;
        this.maxHp = CONFIG.bossHp;
        this.hp = CONFIG.bossHp;
        this.active = true;
        this.moveDirection = 1;
        this.moveSpeed = 2;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackTargetY = 0;
        this.returning = false;
        this.characterType = characterType; // 'sister', 'olderSister', 'mother'
    }

    draw(ctx) {
        // キャラアイコン画像を2倍サイズで表示
        const iconImage = characterIconImages[this.characterType];
        if (iconImage && iconImage.complete) {
            ctx.drawImage(
                iconImage,
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        } else {
            // フォールバック: 色付き四角形
            const colors = {
                sister: '#ff6b9d',
                olderSister: '#4ecdc4',
                mother: '#ffe66d'
            };
            ctx.fillStyle = colors[this.characterType];
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }

        // 枠線（攻撃時は赤く）
        ctx.strokeStyle = this.isAttacking ? '#e74c3c' : '#c0392b';
        ctx.lineWidth = 8;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

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

    // キャラクタータイプの決定
    let characterType;
    if (gameState.currentStage === 0) {
        // チュートリアル：ランダムに3種類出現
        const types = ['sister', 'olderSister', 'mother'];
        characterType = types[Math.floor(Math.random() * types.length)];
    } else {
        // 分岐後：選択されたキャラのみ出現
        characterType = gameState.storyRoute || 'sister';
    }

    obstacles.push(new Obstacle(x, y, hp, characterType));
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
    if (backgroundImage && backgroundImage.complete) {
        // 背景画像を画面全体に描画
        ctx.drawImage(backgroundImage, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    } else {
        // 画像がない場合は単色背景
        ctx.fillStyle = '#0f0f1e';
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    }

    // 画面中央の分割線（縦2分割）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasWidth / 2, 0);
    ctx.lineTo(CONFIG.canvasWidth / 2, CONFIG.canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]); // 点線をリセット

    // ボス戦開始判定（ステージの2/3経過後、20秒 = 1200フレーム）
    const bossStartTime = Math.floor(CONFIG.stageDuration * 0.67); // 20秒
    if (gameState.frame === bossStartTime && !gameState.isBossBattle) {
        gameState.isBossBattle = true;
        // ボス出現
        const route = gameState.storyRoute || 'sister';
        boss = new Boss(route);
        // 障害物と青ゲージをクリア
        obstacles = [];
        soldierGauges = [];
    }

    // ボス撃破でステージクリア
    if (gameState.isBossBattle && boss && !boss.active) {
        stageComplete();
        return;
    }

    // 通常時間でのステージクリア（ボス出現前にタイムアップ）
    if (gameState.frame >= CONFIG.stageDuration && !gameState.isBossBattle) {
        stageComplete();
        return;
    }

    gameState.frame++;

    // ボス戦中は障害物と兵士ゲージをスポーンしない
    if (!gameState.isBossBattle) {
        if (gameState.frame % CONFIG.obstacleSpawnRate === 0) {
            spawnObstacle();
        }
        if (gameState.frame % CONFIG.soldierGaugeSpawnRate === 0) {
            spawnSoldierGauge();
        }
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

    // 衝突判定: プレイヤー本体と障害物（ダメージ）
    obstacles.forEach(obstacle => {
        if (!obstacle.active) return;

        // プレイヤー本体との衝突
        if (checkCollision(player, obstacle)) {
            const damage = obstacle.hp;
            gameState.soldiers = Math.max(1, gameState.soldiers - damage);
            obstacle.active = false;
            flashScreen();
            return;
        }

        // 兵士との衝突判定
        player.soldierPositions.forEach(soldier => {
            if (obstacle.active && checkCollision(soldier, obstacle)) {
                // 兵士1人を失う
                gameState.soldiers--;
                obstacle.active = false;
                flashScreen();

                // ゲームオーバーチェック
                if (gameState.soldiers <= 0) {
                    gameOver();
                    return;
                }
            }
        });
    });

    // ゲームオーバーチェック
    if (gameState.soldiers <= 0) {
        gameOver();
        return;
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

    // ボスの更新と描画
    if (gameState.isBossBattle && boss && boss.active) {
        boss.update(player);
        boss.draw(ctx);

        // 弾とボスの衝突判定
        bullets.forEach(bullet => {
            if (bullet.active && checkCollision(bullet, boss)) {
                bullet.active = false;
                boss.takeDamage();
            }
        });

        // プレイヤー本体とボスの衝突判定
        if (checkCollision(player, boss)) {
            const damage = 10; // ボスとの接触ダメージ
            gameState.soldiers = Math.max(1, gameState.soldiers - damage);
            flashScreen();
        }

        // 兵士とボスの衝突判定
        player.soldierPositions.forEach(soldier => {
            if (checkCollision(soldier, boss)) {
                gameState.soldiers = Math.max(1, gameState.soldiers - 1);
                flashScreen();
            }
        });
    }

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

    // ゲームオンリーモード：ノベルシーンをスキップして次のステージへ
    if (gameState.gameMode === 'gameonly') {
        console.log('ゲームオンリーモード：ノベルシーンをスキップ');
        // リワード画面を表示せずに次のステージへ
        gameState.currentStage++;

        // 最後のステージ（3）をクリアしたらエンディング
        if (gameState.currentStage > 3) {
            console.log('全ステージクリア！');
            showReward(); // 最後だけリワード画面表示
            return;
        }

        // 次のステージを開始
        startGame();
        return;
    }

    // ストーリーモード：ノベルシーン開始
    startNovelScene();
}

// ゲームオーバー処理
function gameOver() {
    console.log('Game Over!');

    // ルートが決まっていない場合は決定
    if (!gameState.storyRoute) {
        determineRoute();
    }

    // バッドエンドシーンを表示
    showBadEnding();
}

// バッドエンド表示
function showBadEnding() {
    document.getElementById('game-screen').style.display = 'none';

    // バッドエンドシーンをCSVから読み込んで表示
    const route = gameState.storyRoute || 'sister';
    gameState.currentScenes = scenesData.filter(scene =>
        scene.route === route && scene.stage === -1 // stage=-1はバッドエンド
    );

    if (gameState.currentScenes.length === 0) {
        // バッドエンドシーンがない場合のフォールバック
        console.warn('バッドエンドシーンが見つかりません。リワード画面を表示します。');
        showReward();
        return;
    }

    gameState.currentSceneIndex = 0;
    gameState.screen = 'novel';

    document.getElementById('novel-screen').style.display = 'flex';
    displayCurrentScene();
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
// モード選択ボタン
document.getElementById('story-mode-button').addEventListener('click', () => {
    gameState.gameMode = 'story';
    console.log('ストーリーモード選択');
    startGame();
});

document.getElementById('game-only-mode-button').addEventListener('click', () => {
    gameState.gameMode = 'gameonly';
    console.log('ゲームオンリーモード選択');
    startGame();
});

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

    // 背景画像の読み込み
    if (CONFIG.backgroundImage) {
        backgroundImage = new Image();
        backgroundImage.src = CONFIG.backgroundImage;
    }

    // キャラクターアイコン画像の読み込み
    characterIconImages.sister = new Image();
    characterIconImages.sister.src = CONFIG.characterIcons.sister;

    characterIconImages.olderSister = new Image();
    characterIconImages.olderSister.src = CONFIG.characterIcons.olderSister;

    characterIconImages.mother = new Image();
    characterIconImages.mother.src = CONFIG.characterIcons.mother;

    // 弾の画像を読み込み
    if (CONFIG.bulletImage) {
        bulletImage = new Image();
        bulletImage.src = CONFIG.bulletImage;
    }

    console.log('ゲーム読み込み完了！');
});
