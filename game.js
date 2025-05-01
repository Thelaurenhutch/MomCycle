const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let cw, ch;
function resize() {
  cw = canvas.width = innerWidth;
  ch = canvas.height = innerHeight * 0.8;
}
window.addEventListener('resize', resize);
resize();

// Load sprite sheet
const sprite = new Image();
sprite.src = 'patti-bike-sprite.png';

const FRAME_COUNT = 4;
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
let frameIndex = 0;
const ANIM_SPEED = 8; // frames per second

// Bike state
let x = 0, speed = 0, score = 0;
const MAX_SPEED = 8, FRICTION = 0.98;

let lastTime = performance.now();

function update(dt) {
  // Animate frame
  frameIndex = (frameIndex + dt * ANIM_SPEED) % FRAME_COUNT;

  // Move bike
  x += speed;
  speed *= FRICTION;
  if (speed < 0.05) speed = 0;

  // Wrap-around
  if (x > cw) x = -FRAME_WIDTH;

  // Update score
  score += speed * dt;
  document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
}

function draw() {
  ctx.clearRect(0, 0, cw, ch);
  const fy = 0;
  const fx = Math.floor(frameIndex) * FRAME_WIDTH;
  // Draw Patti
  ctx.drawImage(sprite, fx, fy, FRAME_WIDTH, FRAME_HEIGHT, x, ch - FRAME_HEIGHT - 10, FRAME_WIDTH, FRAME_HEIGHT);
}

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Start when sprite is loaded
sprite.onload = () => {
  loop(performance.now());
};

// Touch or click to pedal
function pedal() {
  speed = Math.min(speed + 2, MAX_SPEED);
}
canvas.addEventListener('touchstart', e => { e.preventDefault(); pedal(); });
canvas.addEventListener('mousedown', e => { pedal(); });
