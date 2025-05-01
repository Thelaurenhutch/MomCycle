// —————————————————————————————————————————————
// game.js (fixed sprite, floor-position, smaller obstacles)
// —————————————————————————————————————————————

const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreEl     = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const overlay     = document.getElementById('gameOver');
const retryBtn    = document.getElementById('retryBtn');

// — load/store high score —
let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
highscoreEl.textContent = 'High Score: ' + highScore;

// — canvas sizing & floor reset —
let cw, ch;
function resize() {
  cw = canvas.width  = window.innerWidth;
  ch = canvas.height = window.innerHeight * 0.8;
  playerY = groundY();               // keep Patti on the floor after any resize

  // rebuild parallax segments
  bgSegments = bgImages.map((img,i) => ({ img, x: i * cw }));
}
window.addEventListener('resize', resize);

// — background images —
const bgFilenames = ['mt-kilimanjaro.png','speakeasy.png','garden.png'];
const bgImages    = bgFilenames.map(fn => { const i=new Image(); i.src=fn; return i; });
let bgSegments    = [];

// — load Patti sprite with logging —
const sprite = new Image();
sprite.src   = 'patti-bike-sprite.png';
sprite.onload  = () => console.log('✅ Patti sprite loaded:', sprite.width,'×',sprite.height);
sprite.onerror = () => console.error('🚫 Couldn’t load patti-bike-sprite.png!');

// — obstacle sprites & scale factor —
const obstacleTypes  = ['possum','jar','cat'];
const obstacleImages = {};
const OB_SCALE       = 0.1;   // 10% size
obstacleTypes.forEach(type => {
  const img = new Image();
  img.src   = `${type}.png`;
  obstacleImages[type] = img;
});

// — constants & state —
const FRAME_COUNT   = 4,
      FRAME_W       = 64,
      FRAME_H       = 64,
      ANIM_SPEED    = 8,
      GRAVITY       = 30,
      JUMP_FORCE    = 12,
      MAX_SPEED     = 8,
      FRICTION      = 0.98,
      SPAWN_INTERVAL= 1.5,
      OB_SPEED      = 200,
      BG_SPEED      = 40;

function groundY() {
  // Patti’s “floor” Y
  return ch - FRAME_H - 10;
}

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

// — input handlers —
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
  y < ch*0.5 ? jump() : pedal();
});
canvas.addEventListener('mousedown', e => {
  const y = e.clientY - canvas.getBoundingClientRect().top;
  y < ch*0.5 ? jump() : pedal();
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
});

// — retry button —
retryBtn.addEventListener('click', () => {
  // reset state and hide overlay
  gameOver = false;
  overlay.classList.add('hidden');
  obstacles = [];
  score = 0;
  playerX = 0;
  speed = 0;
  playerY = groundY();
  lastTime = performance.now();
  loop(lastTime);
});

// — main update —
function update(dt) {
  // parallax bg
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
    if (playerY >= groundY()) {
      playerY   = groundY();
      velocityY = 0;
      isJumping = false;
    }
  }

  // spawn obstacles
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = SPAWN_INTERVAL + Math.random();
    const type = obstacleTypes[Math.floor(Math.random()*obstacleTypes.length)];
    const img  = obstacleImages[type];
    const ow   = img.width  * OB_SCALE;
    const oh   = img.height * OB_SCALE;
    obstacles.push({
      type, img,
      w: ow, h: oh,
      x: cw,
      y: groundY() + (FRAME_H - oh)
    });
  }

  // move & cull obstacles
  obstacles.forEach(o => o.x -= OB_SPEED * dt);
  obstacles = obstacles.filter(o => o.x + o.w > 0);

  // collision?
  obstacles.forEach(o => {
    if (!gameOver &&
        playerX + FRAME_W > o.x &&
        playerX < o.x + o.w &&
        playerY + FRAME_H > o.y &&
        playerY < o.y + o.h) {
      gameOver = true;
      overlay.classList.remove('hidden');
    }
  });

  // move Patti forward
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

// — main draw —
function draw() {
  // background
  bgSegments.forEach(b => {
    ctx.drawImage(b.img,
      0,0, b.img.width, b.img.height,
      b.x,0, cw, ch
    );
  });

  // obstacles (scaled)
  obstacles.forEach(o => {
    ctx.drawImage(o.img,
      0,0, o.img.width, o.img.height,
      o.x,o.y, o.w, o.h
    );
  });

  // Patti
  const fx = Math.floor(frameIndex) * FRAME_W;
  ctx.drawImage(sprite,
    fx, 0, FRAME_W, FRAME_H,
    playerX, playerY,
    FRAME_W, FRAME_H
  );
}

// — game loop starter —
function loop(now) {
  const dt = (now - lastTime)/1000;
  lastTime = now;
  update(dt);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

// — start when everything’s loaded —
Promise.all([
  new Promise(r=>sprite.onload=r),
  ...bgImages.map(img=>new Promise(r=>img.onload=r)),
  ...Object.values(obstacleImages).map(img=>new Promise(r=>img.onload=r))
]).then(()=>{
  resize();  
  playerY = groundY();
  lastTime = performance.now();
  loop(lastTime);
}).catch(err => console.error('Asset loading failed:', err));
