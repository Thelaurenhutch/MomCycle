// ————————————————————————————————————————————————————
// game.js (fixed jump + floor alignment + retry reset)
// ————————————————————————————————————————————————————

const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreEl     = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const overlay     = document.getElementById('gameOver');
const retryBtn    = document.getElementById('retryBtn');

// — load/store high score —
let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
highscoreEl.textContent = 'High Score: ' + highScore;

// — constants —
const FRAME_COUNT    = 4,
      FRAME_W        = 64,
      FRAME_H        = 64,
      ANIM_SPEED     = 8,    // frames/sec
      GRAVITY        = 30,   // px/sec²
      JUMP_FORCE     = 12,   // initial jump velocity
      MAX_SPEED      = 8,
      FRICTION       = 0.98,
      SPAWN_INTERVAL = 1.5,  // sec
      OB_SPEED       = 200,  // px/sec
      OB_SCALE       = 0.2,  // 20% of source size
      BG_SPEED       = 40;   // px/sec for parallax

// — state variables —
let cw, ch;
let frameIndex = 0;
let playerX    = 0;
let playerY    = 0;
let velocityY  = 0;
let isJumping  = false;
let speed      = 0;
let score      = 0;
let spawnTimer = 0;
let lastTime   = 0;
let obstacles  = [];
let gameOver   = false;
let bgSegments = [];

// — helper for floor Y —
function groundY() {
  // Patti’s y when “standing”
  return ch - FRAME_H - 10;
}

// — handle canvas resize & reset Patti to floor —
function resize() {
  cw = canvas.width  = window.innerWidth;
  ch = canvas.height = window.innerHeight * 0.8;
  playerY = groundY();

  // rebuild parallax segments
  bgSegments = bgImages.map((img,i) => ({ img, x: i * cw }));
}
window.addEventListener('resize', resize);

// — load background images for parallax —
const bgFilenames = ['mt-kilimanjaro.png','speakeasy.png','garden.png'];
const bgImages    = bgFilenames.map(fn => {
  const img = new Image();
  img.src   = fn;
  return img;
});

// — load Patti sprite —
const sprite = new Image();
sprite.src   = 'patti-bike-sprite.png';
sprite.onload  = () => console.log('✅ Patti sprite loaded:', sprite.width,'×',sprite.height);
sprite.onerror = () => console.error('🚫 Couldn’t load patti-bike-sprite.png!');

// — load obstacle sprites —
const obstacleTypes  = ['possum','jar','cat'];
const obstacleImages = {};
obstacleTypes.forEach(type => {
  const img = new Image();
  img.src   = `${type}.png`;
  obstacleImages[type] = img;
});

// — input handlers —
// jump when Space, tap top half, or click top half
function jump() {
  if (!isJumping && !gameOver) {
    isJumping = true;
    velocityY = -JUMP_FORCE;
  }
}
// pedal when bottom half tap/click
function pedal() {
  if (!gameOver) speed = Math.min(speed + 2, MAX_SPEED);
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const y = e.touches[0].clientY;
  y < ch*0.5 ? jump() : pedal();
});
canvas.addEventListener('mousedown', e => {
  const y = e.clientY - canvas.getBoundingClientRect().top;
  y < ch*0.5 ? jump() : pedal();
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});

// — retry button resets game state —
retryBtn.addEventListener('click', () => {
  gameOver = false;
  overlay.classList.add('hidden');
  obstacles = [];
  score     = 0;
  speed     = 0;
  playerX   = 0;
  playerY   = groundY();
  spawnTimer= 0;
  lastTime  = performance.now();
  loop(lastTime);
});

// — update loop: physics, spawning, collision, scoring —
function update(dt) {
  // background parallax
  bgSegments.forEach(bg => {
    bg.x -= BG_SPEED * dt;
    if (bg.x <= -cw) bg.x += cw * bgSegments.length;
  });

  // animate Patti
  frameIndex = (frameIndex + dt * ANIM_SPEED) % FRAME_COUNT;

  // apply gravity & jump
  if (isJumping) {
    velocityY += GRAVITY * dt;
    playerY   += velocityY;
    if (playerY >= groundY()) {
      playerY   = groundY();
      velocityY = 0;
      isJumping = false;
    }
  }

  // spawn new obstacles
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = SPAWN_INTERVAL + Math.random();
    const type = obstacleTypes[Math.floor(Math.random()*obstacleTypes.length)];
    const img  = obstacleImages[type];
    // scaled dimensions
    const ow = img.width  * OB_SCALE;
    const oh = img.height * OB_SCALE;
    obstacles.push({
      img, type,
      w:   ow,
      h:   oh,
      x:   cw,
      // bottom-align to the same floor
      y:   (groundY() + FRAME_H) - oh
    });
  }

  // move & cull obstacles
  obstacles.forEach(o => o.x -= OB_SPEED * dt);
  obstacles = obstacles.filter(o => o.x + o.w > 0);

  // collision detection
  obstacles.forEach(o => {
    if (!gameOver &&
        playerX + FRAME_W > o.x &&
        playerX < o.x + o.w &&
        playerY + FRAME_H > o.y &&
        playerY < o.y + o.h
    ) {
      gameOver = true;
      overlay.classList.remove('hidden');
    }
  });

  // move Patti forward & apply friction
  playerX += speed;
  speed   *= FRICTION;
  if (speed < 0.05) speed = 0;
  if (playerX > cw)  playerX = -FRAME_W;

  // update score & high score
  score += speed * dt;
  scoreEl.textContent = 'Score: ' + Math.floor(score);
  if (score > highScore) {
    highScore = Math.floor(score);
    highscoreEl.textContent = 'High Score: ' + highScore;
    localStorage.setItem('highScore', highScore);
  }
}

// — draw loop: background, obstacles, Patti —
function draw() {
  // draw each background panel
  bgSegments.forEach(bg => {
    ctx.drawImage(
      bg.img,
      0, 0, bg.img.width, bg.img.height,
      bg.x, 0, cw, ch
    );
  });

  // draw obstacles
  obstacles.forEach(o => {
    ctx.drawImage(
      o.img,
      0, 0, o.img.width, o.img.height,
      o.x, o.y, o.w, o.h
    );
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

// — game loop entry —
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

// — start once all assets load —
Promise.all([
  new Promise(r => sprite.onload = r),
  ...bgImages.map(img => new Promise(r => img.onload = r)),
  ...Object.values(obstacleImages).map(img => new Promise(r => img.onload = r))
]).then(() => {
  resize();
  playerY = groundY();
  lastTime = performance.now();
  loop(lastTime);
}).catch(err => console.error('Asset loading failed:', err));
