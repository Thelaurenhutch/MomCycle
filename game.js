// —————————————————————————————————————————————
// game.js
// —————————————————————————————————————————————

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill width and 80% of height
let cw, ch;
function resize() {
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight * 0.8;
}
window.addEventListener('resize', resize);
resize();

// Load sprite sheet
const sprite = new Image();
sprite.src = 'patti-bike-sprite.png';

// LOGGING: confirm load or catch errors
sprite.onload = () => {
  console.log('✅ Sprite loaded:', sprite.width, '×', sprite.height);
  loop(performance.now());
};
sprite.onerror = () => {
  console.error('❌ Failed to load sprite. Check your path/filename.');
};

// Sprite & animation settings
const FRAME_COUNT   = 4;
const FRAME_WIDTH   = 64;
const FRAME_HEIGHT  = 64;
const ANIM_SPEED    = 8;    // frames per second
let frameIndex      = 0;

// Bike & score state
let x      = 0;
let speed  = 0;
let score  = 0;
const MAX_SPEED = 8;
const FRICTION  = 0.98;

// Timing
let lastTime = performance.now();

function update(dt) {
  // advance animation frame
  frameIndex = (frameIndex + dt * ANIM_SPEED) % FRAME_COUNT;

  // move & slow down
  x     += speed;
  speed *= FRICTION;
  if (speed < 0.05) speed = 0;

  // wrap-around
  if (x > cw) x = -FRAME_WIDTH;

  // update score display
  score += speed * dt;
  document.getElementById('score').textContent =
    'Score: ' + Math.floor(score);
}

function draw() {
  ctx.clearRect(0, 0, cw, ch);
  const fx = Math.floor(frameIndex) * FRAME_WIDTH;
  const fy = 0;
  // draw the current frame at (x, bottom-align)
  ctx.drawImage(
    sprite,
    fx, fy, FRAME_WIDTH, FRAME_HEIGHT,
    x, ch - FRAME_HEIGHT - 10,
    FRAME_WIDTH, FRAME_HEIGHT
  );
}

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// “Pedal” on touch or click
function pedal() {
  speed = Math.min(speed + 2, MAX_SPEED);
}
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  pedal();
});
canvas.addEventListener('mousedown', pedal);
