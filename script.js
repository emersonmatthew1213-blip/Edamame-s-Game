// Hawkins Platformer — side-scrolling platformer with smoother visuals
// Controls: A/Left, D/Right, W/Up/Space to jump, M to mute

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Logical resolution (keeps crispness across sizes)
  const WIDTH = 960;
  const HEIGHT = 540;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // World and level
  const gravity = 1400; // pixels/s^2
  const friction = 0.85;

  // Platforms: x,y,width,height (in pixels, world coords)
  const platforms = [
    {x: -1000, y: 480, w: 3000, h: 60}, // ground
    {x: 300, y: 380, w: 160, h: 18},
    {x: 520, y: 320, w: 140, h: 18},
    {x: 760, y: 260, w: 120, h: 18},
    {x: 980, y: 340, w: 200, h: 18},
    {x: 1300, y: 420, w: 180, h: 18},
    {x: 1600, y: 340, w: 200, h: 18},
    {x: 1900, y: 260, w: 120, h: 18},
    {x: 2200, y: 380, w: 260, h: 18}
  ];

  // Points of interest
  const poi = [
    {x: 1400, y: 360, w: 120, h: 120, name: 'Hawkins Lab'},
  ];

  // Player
  const player = {
    x: 120, y: 380 - 48,
    w: 36, h: 48,
    vx: 0, vy: 0,
    speed: 360, // px/s
    jumpPower: 520,
    onGround: false,
    facing: 1 // 1 right, -1 left
  };

  // Camera
  const camera = {x: 0, y: 0};

  // Input
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // HUD
  const locationEl = document.getElementById('location');
  const messageEl = document.getElementById('message');
  let msgTimeout = null;
  function showMessage(t, ms = 3000){
    messageEl.textContent = t; messageEl.classList.remove('hidden');
    if (msgTimeout) clearTimeout(msgTimeout);
    msgTimeout = setTimeout(()=> messageEl.classList.add('hidden'), ms);
  }

  // Audio (subtle background ambience)
  let audioCtx, masterGain;
  let audioOn = false;
  function initAudio(){
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain(); masterGain.gain.value = 0.06; masterGain.connect(audioCtx.destination);
      // soft ambient pad
      const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 120; const g = audioCtx.createGain(); g.gain.value = 0.04; osc.connect(g); g.connect(masterGain); osc.start();
      audioOn = true;
    }catch(e){ audioOn = false; }
  }
  function toggleAudio(){ if (!audioCtx) initAudio(); if (!audioCtx) return; masterGain.gain.value = masterGain.gain.value > 0 ? 0 : 0.06; }

  // Collision (AABB)
  function collideRect(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Physics and update
  let last = performance.now();
  function update(now){
    const dt = Math.min(0.033, (now - last) / 1000); last = now;

    // Input
    let move = 0;
    if (keys['a'] || keys['arrowleft']) move -= 1;
    if (keys['d'] || keys['arrowright']) move += 1;

    if (move !== 0){ player.vx = move * player.speed; player.facing = move > 0 ? 1 : -1; }
    else player.vx *= 0.86; // soft friction

    // Jump
    if ((keys['w'] || keys[' ' ] || keys['arrowup']) && player.onGround){ player.vy = -player.jumpPower; player.onGround = false; }

    // Apply gravity
    player.vy += gravity * dt;

    // Integrate
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Collisions with platforms
    player.onGround = false;
    for (const p of platforms){
      const rect = {x:p.x, y:p.y, w:p.w, h:p.h};
      const playerRect = {x:player.x, y:player.y, w:player.w, h:player.h};
      if (collideRect(playerRect, rect)){
        // compute penetration
        const overlapX = Math.min(playerRect.x + playerRect.w - rect.x, rect.x + rect.w - playerRect.x);
        const overlapY = Math.min(playerRect.y + playerRect.h - rect.y, rect.y + rect.h - playerRect.y);
        if (overlapY < overlapX){
          // vertical collision
          if (player.vy > 0){ // falling
            player.y = rect.y - player.h; player.vy = 0; player.onGround = true;
          } else if (player.vy < 0){ // head bump
            player.y = rect.y + rect.h; player.vy = 0;
          }
        } else {
          // horizontal collision
          if (player.vx > 0) player.x = rect.x - player.w;
          else if (player.vx < 0) player.x = rect.x + rect.w;
          player.vx = 0;
        }
      }
    }

    // simple world bounds
    if (player.y > 2000){ player.x = 120; player.y = 200; player.vx = 0; player.vy = 0; showMessage('You fell — respawned'); }

    // Camera follow (smooth)
    const targetX = player.x + player.w/2 - WIDTH/2;
    camera.x += (targetX - camera.x) * Math.min(1, 6 * dt);

    // Update HUD
    updateHUD();

    // Render
    render();

    requestAnimationFrame(update);
  }

  function updateHUD(){
    // location based on nearest POI
    let found = null;
    for (const p of poi){ if (player.x + player.w/2 > p.x && player.x < p.x + p.w){ found = p; break; }}
    locationEl.textContent = found ? p.name : 'Hawkins, Indiana';
  }

  // Render
  function render(){
    // clear
    ctx.clearRect(0,0,WIDTH,HEIGHT);

    // background sky gradient
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#cfe9ff'); g.addColorStop(1,'#8fc7ff');
    ctx.fillStyle = g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    // parallax hills
    drawHills(0.3, '#d6f1d8'); drawHills(0.6, '#bfe3c8');

    // draw platforms
    for (const p of platforms){
      const sx = Math.round(p.x - camera.x);
      const sy = Math.round(p.y);
      roundRect(ctx, sx, sy, p.w, p.h, 6, true, '#3b4252', '#2b3340');
    }

    // POI
    for (const o of poi){
      const sx = Math.round(o.x - camera.x);
      const sy = Math.round(o.y);
      // draw a stylized building
      ctx.fillStyle = '#6c5ce7'; ctx.fillRect(sx, sy - o.h + 40, o.w, o.h - 40);
      ctx.fillStyle = '#9aa7ff'; ctx.fillRect(sx + 12, sy - o.h + 64, o.w - 24, 24);
      ctx.fillStyle = '#fff'; ctx.font = '14px Inter'; ctx.fillText(o.name, sx + 8, sy - o.h + 28);
    }

    // draw player
    const px = Math.round(player.x - camera.x);
    const py = Math.round(player.y);
    drawPlayer(px, py, player.w, player.h, player.facing);

    // soft vignette
    ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(0,HEIGHT-60,WIDTH,60);
  }

  function drawHills(parallax, color){
    ctx.save(); ctx.translate(-camera.x * parallax, 0);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(-1000, 520);
    for (let x=-1000;x<4000;x+=260){
      const y = 420 + Math.sin(x*0.002 + parallax*2) * 40;
      ctx.quadraticCurveTo(x+130, y-40, x+260, 520);
    }
    ctx.lineTo(4000,520); ctx.lineTo(-1000,520); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx,x,y,w,h,r,fill,strokeColor){
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    ctx.fillStyle = strokeColor || '#444'; ctx.fill();
  }

  function drawPlayer(x,y,w,h,facing){
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h - 6, w*0.6, 6, 0, 0, Math.PI*2); ctx.fill();
    // body
    ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y, w, h, 6);
    // head
    ctx.fillStyle = '#ffd6a5'; ctx.beginPath(); ctx.arc(x + w/2, y + 8, 8, 0, Math.PI*2); ctx.fill();
    // face (simple)
    ctx.fillStyle = '#222'; ctx.fillRect(x + w/2 - 6, y + 6, 3, 3); ctx.fillRect(x + w/2 + 3, y + 6, 3, 3);
  }

  // Unlock audio on user gesture
  window.addEventListener('click', function unlock(){ if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); window.removeEventListener('click', unlock); });

  // Mute key
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') toggleAudio(); });

  // Start audio softly
  initAudio();

  requestAnimationFrame(update);

})();
