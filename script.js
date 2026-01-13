// Hawkins Platformer — Hollow Knight-inspired visuals, character redesigned as 80s boy
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
  const gravity = 1600; // pixels/s^2 (tighter feel)

  // Platforms: x,y,width,height (in pixels, world coords)
  const platforms = [
    {x: -1000, y: 480, w: 4000, h: 64}, // ground
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

  // Player (80s boy)
  const player = {
    x: 120, y: 380 - 64,
    w: 36, h: 56,
    vx: 0, vy: 0,
    speed: 340, // px/s
    jumpPower: 520,
    onGround: false,
    facing: 1, // 1 right, -1 left
    anim: {t:0}
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

  // Audio (soft ambience)
  let audioCtx, masterGain;
  let audioOn = false;
  function initAudio(){
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain(); masterGain.gain.value = 0.045; masterGain.connect(audioCtx.destination);
      // slow layered pad
      const makeOsc = (freq, amp) => {
        const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; const g = audioCtx.createGain(); g.gain.value = amp; o.connect(g); g.connect(masterGain); o.start(); return {o,g};
      };
      const a1 = makeOsc(90,0.02); const a2 = makeOsc(110,0.012); const a3 = makeOsc(150,0.01);
      audioOn = true;
    }catch(e){ audioOn = false; }
  }
  function toggleAudio(){ if (!audioCtx) initAudio(); if (!audioCtx) return; masterGain.gain.value = masterGain.gain.value > 0 ? 0 : 0.045; }

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
    else player.vx *= 0.84; // soft friction

    // Jump (allow small coyote time)
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
    render(now);

    requestAnimationFrame(update);
  }

  function updateHUD(){
    // location based on nearest POI
    let found = null;
    for (const p of poi){ if (player.x + player.w/2 > p.x && player.x < p.x + p.w){ found = p; break; }}
    locationEl.textContent = found ? found.name : 'Hawkins, Indiana';
  }

  // Render
  function render(now){
    // clear
    ctx.clearRect(0,0,WIDTH,HEIGHT);

    // background deep palette like Hollow Knight
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#0e1a2b'); g.addColorStop(1,'#192738');
    ctx.fillStyle = g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    // parallax layers (silhouettes and fog)
    drawParallaxLayer('#0f2335', 0.2, 40, now);
    drawParallaxLayer('#11283b', 0.4, 30, now);
    drawParallaxLayer('#152d44', 0.7, 18, now);

    // subtle bottom fog
    ctx.fillStyle = 'rgba(8,12,18,0.25)'; ctx.fillRect(0, HEIGHT - 140, WIDTH, 140);

    // draw platforms with soft lighting
    for (const p of platforms){
      const sx = Math.round(p.x - camera.x);
      const sy = Math.round(p.y);
      drawPlatform(sx, sy, p.w, p.h);
    }

    // POI (stylized, with bloom)
    for (const o of poi){
      const sx = Math.round(o.x - camera.x);
      const sy = Math.round(o.y);
      drawLab(sx, sy - o.h + 40, o.w, o.h - 40);
    }

    // draw player (80's boy stylized)
    const px = Math.round(player.x - camera.x);
    const py = Math.round(player.y);
    drawBoy(px, py, player.w, player.h, player.facing, now);

    // soft vignette / vignette gradient
    const vgrad = ctx.createLinearGradient(0,0,0,HEIGHT);
    vgrad.addColorStop(0,'rgba(0,0,0,0.0)'); vgrad.addColorStop(1,'rgba(0,0,0,0.35)');
    ctx.fillStyle = vgrad; ctx.fillRect(0,0,WIDTH,HEIGHT);
  }

  function drawParallaxLayer(color, parallax, heightOffset, now){
    ctx.save(); ctx.translate(-camera.x * parallax, 0);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(-1000, HEIGHT);
    for (let x=-1000;x<4000;x+=220){
      const t = (now || 0) * 0.0002;
      const y = HEIGHT - heightOffset - Math.sin((x*0.003) + t*parallax*6) * (12 + parallax*12);
      ctx.quadraticCurveTo(x+110, y-20, x+220, HEIGHT);
    }
    ctx.lineTo(4000,HEIGHT); ctx.lineTo(-1000,HEIGHT); ctx.closePath(); ctx.globalAlpha = 0.92; ctx.fill(); ctx.restore();
  }

  function drawPlatform(x,y,w,h){
    // main shape
    const radius = 8;
    ctx.save();
    // shadow below
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h + 8, w*0.5, 10, 0, 0, Math.PI*2); ctx.fill();
    // platform body with gradient
    const g = ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#3a4756'); g.addColorStop(1,'#222a36');
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = g; ctx.fill();
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; roundRectPath(ctx, x+2, y+1, w-4, 6, radius/2); ctx.fill();
    ctx.restore();
  }

  function drawLab(x,y,w,h){
    ctx.save();
    // subtle glow
    const glow = ctx.createRadialGradient(x + w/2, y + 20, 10, x + w/2, y + 20, 120);
    glow.addColorStop(0,'rgba(120,100,220,0.22)'); glow.addColorStop(1,'rgba(120,100,220,0)');
    ctx.fillStyle = glow; ctx.fillRect(x-40, y-40, w+80, h+120);
    // building
    ctx.fillStyle = '#5a4dbb'; roundRectPath(ctx, x, y, w, h, 6); ctx.fill();
    // windows
    ctx.fillStyle = '#bfbaf2'; for (let i=0;i<3;i++){ ctx.fillRect(x + 12 + i* (w-28)/3, y + 16, (w-28)/4, 12); }
    ctx.restore();
  }

  function roundRectPath(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawBoy(x,y,w,h,facing, now){
    ctx.save();
    ctx.translate(x + w/2, y + h/2);

    // breathing bob
    const t = (now || 0) * 0.003;
    const bob = Math.sin(t*2) * 1.2;
    ctx.translate(0, bob);

    // shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(-w/2 + w/2, h/2 - 6, w*0.45, 6, 0, 0, Math.PI*2); ctx.fill();

    // legs
    ctx.fillStyle = '#1f2937'; ctx.fillRect(-w*0.22, h*0.07, w*0.18, h*0.45); ctx.fillRect(w*0.04, h*0.07, w*0.18, h*0.45);

    // body coat
    const coatW = w; const coatH = h*0.6;
    const g = ctx.createLinearGradient(-coatW/2, -coatH/2, coatW/2, coatH/2);
    g.addColorStop(0,'#2b2f45'); g.addColorStop(1,'#1a1f2c');
    ctx.fillStyle = g; roundRectPath(ctx, -coatW/2, -coatH/2, coatW, coatH, 6); ctx.fill();

    // shirt highlight
    ctx.fillStyle = '#d1c8f6'; ctx.fillRect(-coatW*0.18, -coatH*0.08, coatW*0.36, coatH*0.16);

    // head
    ctx.fillStyle = '#f4d0b1'; ctx.beginPath(); ctx.arc(0, -coatH/2 - 8, 12, 0, Math.PI*2); ctx.fill();

    // 80s hair (voluminous bangs and back)
    ctx.fillStyle = '#2b1f12'; ctx.beginPath();
    // bangs
    ctx.moveTo(-12, -coatH/2 - 12);
    ctx.quadraticCurveTo(-6, -coatH/2 - 22, 0, -coatH/2 - 18);
    ctx.quadraticCurveTo(6, -coatH/2 - 24, 12, -coatH/2 - 12);
    // back hair
    ctx.quadraticCurveTo(8, -coatH/2 - 6, 6, -coatH/2 + 8);
    ctx.quadraticCurveTo(-6, -coatH/2 + 12, -12, -coatH/2 + 4);
    ctx.closePath(); ctx.fill();

    // small ear detail
    ctx.fillStyle = '#e6b99e'; ctx.beginPath(); ctx.arc(-14, -coatH/2 - 6, 3, 0, Math.PI*2); ctx.fill();

    // simple eyes
    ctx.fillStyle = '#111'; ctx.fillRect(-6, -coatH/2 - 6, 3, 2); ctx.fillRect(4, -coatH/2 - 6, 3, 2);

    // small nose
    ctx.fillStyle = '#d4a78b'; ctx.fillRect(0, -coatH/2 - 2, 2, 2);

    // subtle rim lighting on right side
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();
  }

  // Unlock audio on user gesture
  window.addEventListener('click', function unlock(){ if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); window.removeEventListener('click', unlock); });

  // Mute key
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') toggleAudio(); });

  // Start audio softly
  initAudio();

  requestAnimationFrame(update);

})();
