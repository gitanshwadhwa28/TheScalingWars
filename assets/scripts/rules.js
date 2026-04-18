function show(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('s-' + id).classList.add('active');
  event.currentTarget.classList.add('active');
  if (id === 'board') setTimeout(drawBoard, 50);
}

function initPlayArrows() {
  const arrows = Array.from(document.querySelectorAll('.play-arrow'));
  if (!arrows.length) return;

  const vectors = {
    right: { x: -32, y: 0, rotation: 0 },
    left: { x: 32, y: 0, rotation: 180 },
    down: { x: 0, y: -24, rotation: 90 },
    up: { x: 0, y: 24, rotation: -90 },
    'down-right': { x: -22, y: -18, rotation: 38 },
    'up-right': { x: -22, y: 18, rotation: -38 },
    'down-left': { x: 22, y: -18, rotation: 142 },
    'up-left': { x: 22, y: 18, rotation: -142 }
  };

  arrows.forEach((arrow) => {
    const dir = arrow.dataset.dir;
    const vector = vectors[dir];
    arrow.style.setProperty('--from-x', `${vector.x}px`);
    arrow.style.setProperty('--from-y', `${vector.y}px`);
    arrow.style.setProperty('--rot', `${vector.rotation}deg`);
    arrow.style.transform = `translate(${vector.x}px, ${vector.y}px) rotate(${vector.rotation}deg)`;
  });

  const fireArrow = () => {
    const shuffled = arrows
      .map((arrow) => ({ arrow, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.arrow);

    shuffled.forEach((arrow, index) => {
      const duration = 1.1 + Math.random() * 0.8;
      const delay = index * (0.08 + Math.random() * 0.13);
      arrow.style.animation = 'none';
      arrow.offsetHeight;
      arrow.style.animation = `arrowDrift ${duration}s ease-out ${delay}s 1`;
    });

    const nextBurst = 950 + Math.random() * 1200;
    window.setTimeout(fireArrow, nextBurst);
  };

  fireArrow();
}

// DICE
function rollDice() {
  const d1 = document.getElementById('die1');
  const d2 = document.getElementById('die2');
  const total = document.getElementById('diceTotal');
  const result = document.getElementById('diceResult');

  d1.classList.add('rolling');
  d2.classList.add('rolling');

  let ticks = 0;
  const interval = setInterval(() => {
    d1.textContent = Math.ceil(Math.random() * 6);
    d2.textContent = Math.ceil(Math.random() * 6);
    ticks++;
    if (ticks > 8) {
      clearInterval(interval);
      const v1 = Math.ceil(Math.random() * 6);
      const v2 = Math.ceil(Math.random() * 6);
      d1.textContent = v1;
      d2.textContent = v2;
      d1.classList.remove('rolling');
      d2.classList.remove('rolling');
      const sum = v1 + v2;
      total.textContent = 'Total: ' + sum;
      total.style.color = sum === 7 ? 'var(--reg)' : 'var(--text)';
      if (sum === 7) {
        result.textContent = 'DISRUPTION — move the marker, steal a resource, check hand limits';
        result.className = 'dice-result disruption';
      } else {
        result.textContent = 'All hexes numbered ' + sum + ' produce resources this turn';
        result.className = 'dice-result good';
      }
    }
  }, 60);
}

// HEX BOARD
const hexTypes = [
  { type: 'Compute cluster', short: 'Compute', resource: 'Compute', color: '#ff8a3d', num: 5 },
  { type: 'Data lake', short: 'Data', resource: 'Data', color: '#57a4ff', num: 2 },
  { type: 'Talent hub', short: 'Talent', resource: 'Talent', color: '#4ce0b3', num: 6 },
  { type: 'Chip fab', short: 'Chips', resource: 'Chips', color: '#ba8cff', num: 9 },
  { type: 'Compute cluster', short: 'Compute', resource: 'Compute', color: '#ff8a3d', num: 8 },
  { type: 'Regulatory Zone', short: 'Regulatory', resource: 'Nothing', color: '#ff5d73', num: null },
  { type: 'Data lake', short: 'Data', resource: 'Data', color: '#57a4ff', num: 4 },
  { type: 'Capital market', short: 'Capital', resource: 'Capital', color: '#ffd166', num: 10 },
  { type: 'Talent hub', short: 'Talent', resource: 'Talent', color: '#4ce0b3', num: 11 },
  { type: 'Chip fab', short: 'Chips', resource: 'Chips', color: '#ba8cff', num: 3 },
  { type: 'Data lake', short: 'Data', resource: 'Data', color: '#57a4ff', num: 6 },
  { type: 'Compute cluster', short: 'Compute', resource: 'Compute', color: '#ff8a3d', num: 11 },
  { type: 'Capital market', short: 'Capital', resource: 'Capital', color: '#ffd166', num: 8 },
  { type: 'Talent hub', short: 'Talent', resource: 'Talent', color: '#4ce0b3', num: 3 },
  { type: 'Data lake', short: 'Data', resource: 'Data', color: '#57a4ff', num: 9 },
  { type: 'Chip fab', short: 'Chips', resource: 'Chips', color: '#ba8cff', num: 5 },
  { type: 'Compute cluster', short: 'Compute', resource: 'Compute', color: '#ff8a3d', num: 10 },
  { type: 'Capital market', short: 'Capital', resource: 'Capital', color: '#ffd166', num: 4 },
  { type: 'Talent hub', short: 'Talent', resource: 'Talent', color: '#4ce0b3', num: 12 },
];

const hexDescs = {
  'Compute cluster': 'Produces Compute each time its number is rolled. Compute is needed for Network Links and AI Hubs. One of the most in-demand resources.',
  'Data lake': 'Produces Data, required for Strategy Cards and AI Hubs. Data-rich positions give access to the card deck and flexible plays.',
  'Talent hub': 'Produces Talent, the most versatile resource — needed for Hubs, Campuses, and Strategy Cards. Highly contested in setup.',
  'Chip fab': 'Produces Chips, required for Network Links. Only 3 Chip Fabs on the board makes this the scarcest resource. Adjacency here is fought over early.',
  'Capital market': 'Produces Capital, required for Hubs, Campuses, and Cards. Scarce (3 hexes) but essential for mid-to-late game power. Compound advantage for early holders.',
  'Regulatory Zone': 'Produces nothing. Starts with the Disruption marker. Hexes adjacent to the Reg Zone are risky — a 7 roll here blocks them and lets opponents steal.',
};

const rows = [3, 4, 5, 4, 3];

function hexCorners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30);
    pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return pts;
}

let hexCenters = [];

function drawBoard() {
  const canvas = document.getElementById('hexCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const size = 52;
  const hx = size * Math.sqrt(3);
  const hy = size * 1.5;
  const startY = 60;

  hexCenters = [];
  let idx = 0;

  rows.forEach((count, row) => {
    const rowW = count * hx;
    const startX = (W - rowW) / 2 + hx / 2;
    const cy = startY + row * hy;
    for (let col = 0; col < count; col++) {
      const cx = startX + col * hx;
      const hex = hexTypes[idx];
      const corners = hexCorners(cx, cy, size - 2);
      hexCenters.push({ cx, cy, hex, size: size - 2 });

      ctx.beginPath();
      ctx.moveTo(corners[0][0], corners[0][1]);
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i][0], corners[i][1]);
      ctx.closePath();

      ctx.shadowColor = hex.color + '44';
      ctx.shadowBlur = 18;
      ctx.fillStyle = hex.color + '2e';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hex.color + '95';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = hex.color;
      ctx.font = '700 12px Syne, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hex.short, cx, cy - 12);

      if (hex.num) {
        const highlight = hex.num === 6 || hex.num === 8;
        ctx.beginPath();
        ctx.arc(cx, cy + 18, 21, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 12, 21, 0.92)';
        ctx.fill();
        ctx.strokeStyle = highlight ? hex.color + 'b8' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = highlight ? '#ffb0be' : '#f7fbff';
        ctx.font = '800 20px Syne, sans-serif';
        ctx.fillText(hex.num, cx, cy + 20);
      } else {
        ctx.fillStyle = '#ffd1d7';
        ctx.font = '700 12px Syne, sans-serif';
        ctx.fillText('Disruption', cx, cy + 18);
      }
      idx++;
    }
  });
}

document.getElementById('hexCanvas').addEventListener('click', function(e) {
  const rect = this.getBoundingClientRect();
  const scaleX = this.width / rect.width;
  const scaleY = this.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  let closest = null, minDist = Infinity;
  hexCenters.forEach(h => {
    const d = Math.hypot(mx - h.cx, my - h.cy);
    if (d < minDist && d < h.size + 4) { minDist = d; closest = h; }
  });

  if (closest) {
    const info = document.getElementById('hexInfo');
    const h = closest.hex;
    info.innerHTML = `
      <div class="hex-info-name" style="color:${h.color};">${h.type}</div>
      <div class="hex-info-desc" style="margin-bottom:10px;">${hexDescs[h.type]}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="res-pill" style="background:${h.color}18;color:${h.color};border:1px solid ${h.color}33;">
          <span class="res-dot" style="background:${h.color};"></span>Produces: ${h.resource}
        </span>
        ${h.num ? `<span class="res-pill" style="background:#ffffff0a;color:#e8e6e0;border:1px solid #ffffff15;">Number token: ${h.num}</span>` : ''}
        ${h.num === 6 || h.num === 8 ? '<span class="res-pill" style="background:rgba(74,222,128,0.1);color:var(--accent);border:1px solid rgba(74,222,128,0.2);">High probability</span>' : ''}
      </div>
    `;
  }
});

initPlayArrows();
