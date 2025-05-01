// —————————————————————————————————————————————
// game.js (with parallax BG + obstacles + Game Over + High Score)
// —————————————————————————————————————————————

const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreEl     = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const overlay     = document.getElementById('gameOver');
const retryBtn    = document.getElementById('retryBtn');

// load stored high score
let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
highscoreEl.textContent = 'High Score: ' + highScore;

let cw, ch;
function resize() {
  cw = canvas.width  = window.innerWidth;
  ch = canvas.height = window.innerHeight * 0.8;

  bgSegments = [];
  for (let i = 0; i < bgImages.length; i++) {
    bgSegments.push({ img: bgImages[i], x: i * cw });
  }
}
window.addEventListener('resize', resize);

// ——— background images ———
const bgFilenames = ['mt-kilimanjaro.png','speakeasy.png','garden.png'];
const bgImages    = bgFilenames.map(fn => { const img = new Image(); img.src = fn; return img; });
let bgSegments    = [];

// ——— player sprite ———
const sprite = new Image();
sprite.src   = 'patti-bike-sprite.png';

// ——— obstacle sprites ———
const obstacleTypes  = ['possum','jar','cat'];
const obstacleImages = {};
obstacleTypes.forEach(type => {
  const img = new Image();
  img.src   = `${type}.png`;
  obstacleImages[type] = img;
});

// ——— constants & state ———
const FRAME_COUNT    = 4,
      FRAME_W        = 64,
      FRAME_H        = 64,
      ANIM_SPEED     = 8,
      GRAVITY        = 30,
      JUMP_FORCE     = 12,
      MAX_SPEED      = 8,
      FRICTION       = 0.98,
      SPAWN_INTERVAL= 1.5,
      OB_SPEED       = 200,
      BG_SPEED       = 40;

let frameIndex = 0,
    playerX    = 0,
    playerY    = 0,
    velocityY  = 0,
    isJumping  = false,
    speed      = 0,
    score      = 0,
    obstacles  = [],
    spawnTimer = 0,
    lastTime   = 0,
    gameOver   = false;

// ——— input handlers ———
function pedal() {
  if (!gameOver) speed = Math.min(speed + 2, MAX_SPEED);
}
function jump() {
  if (!isJumping && !gameOver) {
    isJumping = true;
    velocityY = -JUMP_FORCE;
  }
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const y = e.touches[0].clientY;
  y < ch * 0.5 ? jump() : pedal();
});
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const y    = e.clientY - rect.top;
  y < ch * 0.5 ? jump() : pedal();
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});

// ——— retry button ———
retryBtn.addEventListener('click', () => {
  window.location.reload();
});

// ——— update logic ———
function update(dt) {
  // scroll background
  bgSegments.forEach(b => {
    b.x -= BG_SPEED * dt;
    if (b.x <= -cw) b.x += cw * bgSegments.length;
  });

  // animate Patti
  frameIndex = (frameIndex + dt * ANIM_SPEED) % FRAME_COUNT;

  // jump physics
  if (isJumping) {
    velocityY += GRAVITY * dt;
    playerY   += velocityY;
    if (playerY >= ch - FRAME_H - 10) {
      playerY   = ch - FRAME_H - 10;
      velocityY = 0;
      isJumping = false;
    }
  }

  // spawn obstacles
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = SPAWN_INTERVAL + Math.random();
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const img  = obstacleImages[type];
    obstacles.push({
      type, img,
      w: img.width,
      h: img.height,
      x: cw,
      y: ch - FRAME_H - 10 + (FRAME_H - img.height)
    });
  }

  // move & remove obstacles
  obstacles.forEach(o => o.x -= OB_SPEED * dt);
  obstacles = obstacles.filter(o => o.x + o.w > 0);

  // detect collision
  obstacles.forEach(o => {
    const px1 = playerX, px2 = playerX + FRAME_W;
    const py1 = playerY, py2 = playerY + FRAME_H;
    const ox1 = o.x,     ox2 = o.x + o.w;
    const oy1 = o.y,     oy2 = o.y + o.h;
    if (!gameOver && px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) {
      gameOver = true;
      overlay.classList.remove('hidden');
    }
  });

  // move Patti
  playerX += speed;
  speed   *= FRICTION;
  if (speed < 0.05) speed = 0;
  if (playerX > cw) playerX = -FRAME_W;

  // update score & high score
  score += speed * dt;
  scoreEl.textContent     = 'Score: ' + Math.floor(score);
  if (score > highScore) {
    highScore = Math.floor(score);
    highscoreEl.textContent = 'High Score: ' + highScore;
    localStorage.setItem('highScore', highScore);
  }
}

// ——— draw logic ———
function draw() {
  // draw background
  bgSegments.forEach(b => {
    ctx.drawImage(b.img, 0, 0, b.img.width, b.img.height, b.x, 0, cw, ch);
  });

  // draw obstacles
  obstacles.forEach(o => {
    ctx.drawImage(o.img, 0, 0, o.w, o.h, o.x, o.y, o.w, o.h);
  });

  // draw Patti
  const fx = Math.floor(frameIndex) * FRAME_W;
  ctx.drawImage(
    sprite,
    fx, 0, FRAME_W, FRAME_H,
    playerX, playerY,
    FRAME_W, FRAME_H
  );
}

// ——— game loop ———
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

// ——— start once assets are ready ———
Promise.all([
  new Promise(r => sprite.onload = r),
  ...bgImages.map(img => new Promise(r => img.onload = r)),
  ...Object.values(obstacleImages).map(img => new Promise(r => img.onload = r))
]).then(() => {
  resize();
  lastTime = performance.now();
  loop(lastTime);
}).catch(err => console.error('Asset loading failed:', err));
