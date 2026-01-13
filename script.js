// Hawkins — Daytime city platformer with objectives and opening cutscene
// Controls: A/Left, D/Right, W/Up/Space to jump, E to interact, M to mute

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const WIDTH = 960, HEIGHT = 540;
  canvas.width = WIDTH; canvas.height = HEIGHT;

  // Physics
  const gravity = 1600;

  // World: purposeful platforms (not pointless)
  const platforms = [
    {x:-1000, y:480, w:5000, h:64}, // ground
    {x:400, y:380, w:320, h:20}, // city ledge
    {x:820, y:320, w:220, h:20},
    {x:1160, y:260, w:200, h:20},
    {x:1500, y:340, w:240, h:20},
    {x:1880, y:280, w:220, h:20}
  ];

  // Objective blocks (purposeful) - reach to collect keys / items
  const objectives = [
    {x:920, y:288, w:18, h:18, collected:false, name:'Roof Key'},
    {x:1500, y:308, w:18, h:18, collected:false, name:'Lab Entry Card'},
  ];

  // POI (final objective)
  const poi = {x:2100, y:236, w:160, h:160, name:'Hawkins Lab', locked:true};

  // Player (80s-boy rescuer)
  const player = {x:140, y:380-64, w:40, h:64, vx:0, vy:0, speed:360, jumpPower:540, onGround:false, facing:1};

  // Camera
  const camera = {x:0};

  // Input
  const keys = {};
  window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true; if ([' ','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].includes(e.key)) e.preventDefault(); });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

  // HUD
  const locationEl = document.getElementById('location');
  const messageEl = document.getElementById('message');
  function showMessage(t, ms=3000){ messageEl.textContent=t; messageEl.classList.remove('hidden'); setTimeout(()=>messageEl.classList.add('hidden'), ms); }

  // Audio
  let audioCtx, masterGain; function initAudio(){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); masterGain=audioCtx.createGain(); masterGain.gain.value=0.04; masterGain.connect(audioCtx.destination); const o=audioCtx.createOscillator(); o.type='sine'; o.frequency.value=120; const g=audioCtx.createGain(); g.gain.value=0.02; o.connect(g); g.connect(masterGain); o.start(); }catch(e){} }
  function toggleAudio(){ if (!audioCtx) initAudio(); if (!audioCtx) return; masterGain.gain.value = masterGain.gain.value>0?0:0.04; }
  window.addEventListener('keydown', e=>{ if (e.key.toLowerCase()==='m') toggleAudio(); });

  // Cutscene state
  let state = 'cutscene'; // 'cutscene' or 'play' or 'won'
  const cutscene = {t:0, duration:5200};

  // Bowl-cut boy (victim) for cutscene
  const victim = {x:520, y:420, w:30, h:42};

  // Demogorgon silhouette params
  const demon = {x:560, y:380, scale:1.2, open:false};

  // Utility
  function rectsIntersect(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

  // Update loop
  let last = performance.now();
  function update(now){ const dt = Math.min(0.033, (now-last)/1000); last=now;

    if (state==='cutscene'){
      cutscene.t += dt*1000;
      // timeline events
      // 0-1s: camera pans to alley
      // 1-2s: boy looks around
      // 2-3s: shadow appears
      // 3-3.5s: demogorgon grabs boy
      // 3.5-5.2s: vanish and title, then switch to play
      if (cutscene.t > 3500 && cutscene.t < 3600){ demon.open = true; }
      if (cutscene.t > 3000 && cutscene.t < 3400){ victim.x -= 0.6; }
      if (cutscene.t > cutscene.duration - 600){ state='play'; showMessage('Find the Lab Entry Card and Key to rescue him'); }
    } else if (state==='play'){
      // Input
      let move=0; if (keys['a']||keys['arrowleft']) move-=1; if (keys['d']||keys['arrowright']) move+=1;
      if (move!==0){ player.vx = move*player.speed; player.facing = move>0?1:-1; } else player.vx*=0.85;
      if ((keys['w']||keys[' ']||keys['arrowup']) && player.onGround){ player.vy = -player.jumpPower; player.onGround=false; }

      player.vy += gravity*dt; player.x += player.vx*dt; player.y += player.vy*dt;

      // platform collision
      player.onGround=false;
      for (const p of platforms){ const pr={x:p.x,y:p.y,w:p.w,h:p.h}; const pl={x:player.x,y:player.y,w:player.w,h:player.h}; if (rectsIntersect(pl,pr)){ const overlapX = Math.min(pl.x+pl.w-pr.x, pr.x+pr.w-pl.x); const overlapY = Math.min(pl.y+pl.h-pr.y, pr.y+pr.h-pl.y); if (overlapY<overlapX){ if (player.vy>0){ player.y = pr.y - player.h; player.vy = 0; player.onGround=true; } else if (player.vy<0){ player.y = pr.y + pr.h; player.vy=0; } } else { if (player.vx>0) player.x = pr.x - player.w; else if (player.vx<0) player.x = pr.x + pr.w; player.vx=0; } } }

      // collect objectives
      for (const obj of objectives){ if (!obj.collected){ if (rectsIntersect({x:player.x,y:player.y,w:player.w,h:player.h}, obj)){ obj.collected=true; showMessage(obj.name + ' collected'); if (objectives.every(o=>o.collected)) poi.locked=false; } } }

      // interact with POI
      if ((keys['e']||keys[' ']) && !poi.locked){ if (Math.abs(player.x - (poi.x+poi.w/2))<200){ state='won'; showMessage('You reached Hawkins Lab — to be continued',4000); } }

      if (player.y>2000){ player.x=140; player.y=200; player.vx=0; player.vy=0; showMessage('You fell — respawned'); }

      // camera follow
      const targetX = player.x + player.w/2 - WIDTH/2; camera.x += (targetX - camera.x)*Math.min(1,6*dt);
    }

    render(now);
    requestAnimationFrame(update);
  }

  // Render
  function render(now){ ctx.clearRect(0,0,WIDTH,HEIGHT);
    // sky
    const sky = ctx.createLinearGradient(0,0,0,HEIGHT); sky.addColorStop(0,'#cfeeff'); sky.addColorStop(1,'#a9dfff'); ctx.fillStyle=sky; ctx.fillRect(0,0,WIDTH,HEIGHT);

    // city skyline parallax
    drawCityLayer(0.2, 60, '#e6f5ff'); drawCityLayer(0.45, 40, '#d4eaff'); drawCityLayer(0.7, 20, '#c2e0ff');

    // platforms
    for (const p of platforms){ const sx = Math.round(p.x - camera.x); const sy = Math.round(p.y); drawPlatform(sx,sy,p.w,p.h); }

    // objectives
    for (const o of objectives){ if (!o.collected){ const sx = Math.round(o.x - camera.x); const sy = Math.round(o.y); drawObjective(sx,sy,o.w,o.h); } }

    // nexus POI
    const sxPoi = Math.round(poi.x - camera.x); drawLab(sxPoi, poi.y - 40, poi.w, poi.h);

    if (state==='cutscene') drawCutscene(now);

    // player
    if (state!=='cutscene'){ const px = Math.round(player.x - camera.x); const py = Math.round(player.y); drawRescuer(px,py,player.w,player.h,player.facing); }

    // UI texts handled by DOM for clarity
  }

  function drawCityLayer(parallax, heightOffset, color){ ctx.save(); ctx.translate(-camera.x*parallax,0); ctx.fillStyle=color; for (let x=-1200;x<4000;x+=220){ const w = 120 + ((x*37)%140); const h = 80 + Math.abs(Math.sin(x*0.01))*200; roundRect(ctx, x+40, HEIGHT - heightOffset - h, w, h, 6); } ctx.restore(); }

  function drawPlatform(x,y,w,h){ ctx.save(); // drop shadow
    ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(x+w/2, y+h+8, w*0.48, 10,0,0,Math.PI*2); ctx.fill(); const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,'#ffffff'); g.addColorStop(1,'#d9e6f6'); roundRect(ctx,x,y,w,h,8); ctx.fillStyle=g; ctx.fill(); ctx.restore(); }

  function drawObjective(x,y,w,h){ ctx.save(); ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.fillStyle='#000'; ctx.font='12px Inter'; ctx.fillText('★', x-2, y+14); ctx.restore(); }

  function drawLab(x,y,w,h){ ctx.save(); const glow = ctx.createRadialGradient(x + w/2, y + 24, 10, x + w/2, y + 24, 140); glow.addColorStop(0,'rgba(255,200,120,0.12)'); glow.addColorStop(1,'rgba(255,200,120,0)'); ctx.fillStyle=glow; ctx.fillRect(x-40,y-40,w+80,h+120); ctx.fillStyle='#e8f0ff'; roundRect(ctx,x,y,w,h,10); ctx.fillStyle='#ffffff'; ctx.font='14px Inter'; ctx.fillText('Hawkins Lab', x+8, y+18); ctx.restore(); }

  function drawCutscene(now){ ctx.save(); // camera focuses on alley where victim stands
    const cx = 520 - camera.x; // victim center
    // draw victim
    drawVictim(cx, victim.y, victim.w, victim.h);
    // draw shadow creature emerging
    const t = (cutscene.t||0);
    const shadowAlpha = Math.min(1, Math.max(0, (t-1800)/800));
    drawDemon(560 - camera.x, 380, shadowAlpha, demon.open);
    // simple text overlay early
    if (t < 2500){ ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='20px Inter'; ctx.fillText('A normal day in Hawkins...', 420 - camera.x, 160); }
    if (t>3000 && t<3600){ ctx.fillStyle='rgba(255,80,80,0.95)'; ctx.font='28px Inter'; ctx.fillText('NO!', 520 - camera.x, 220); }
    ctx.restore(); }

  function drawVictim(x,y,w,h){ ctx.save(); ctx.translate(x,y); // body
    ctx.fillStyle='#ffd6a5'; ctx.beginPath(); ctx.ellipse(0, -h/2 + 8, w*0.38, h*0.34,0,0,Math.PI*2); ctx.fill(); // bowl cut hair
    ctx.fillStyle='#2b1f12'; ctx.beginPath(); ctx.arc(0, -h/2 + 2, w*0.46, Math.PI, 0); ctx.fill(); // small body
    ctx.fillStyle='#6b6f88'; ctx.fillRect(-w*0.28, -h*0.2, w*0.56, h*0.38);
    ctx.restore(); }

  function drawDemon(x,y,alpha,open){ ctx.save(); ctx.translate(x,y); ctx.globalAlpha = alpha; // tall hunched silhouette
    ctx.fillStyle = '#07101a'; ctx.beginPath(); ctx.moveTo(-20,50); ctx.quadraticCurveTo(-60,-10,-20,-80); ctx.quadraticCurveTo(10,-100,40,-80); ctx.quadraticCurveTo(80,-10,40,50); ctx.closePath(); ctx.fill(); // arms
    ctx.fillRect(-80,-10,40,8); ctx.fillRect(40,-10,40,8);
    // petal head
    if (open){ ctx.fillStyle='#0b0b0b'; ctx.beginPath(); ctx.moveTo(0,-120); ctx.lineTo(-50,-70); ctx.lineTo(50,-70); ctx.closePath(); ctx.fill(); // inner mouth
      ctx.fillStyle='#3a0b0b'; ctx.beginPath(); ctx.ellipse(0,-95,22,12,0,0,Math.PI*2); ctx.fill(); }
    ctx.restore(); }

  function drawRescuer(x,y,w,h,facing){ ctx.save(); ctx.translate(x + w/2, y + h/2); // bob
    const t = performance.now()*0.002; ctx.translate(0, Math.sin(t)*0.8);
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, h/2 - 8, w*0.5, 8,0,0,Math.PI*2); ctx.fill();
    // legs
    ctx.fillStyle='#2b2f45'; ctx.fillRect(-w*0.22, h*0.08, w*0.18, h*0.48); ctx.fillRect(w*0.04, h*0.08, w*0.18, h*0.48);
    // coat
    ctx.fillStyle='#2b2f45'; roundRect(ctx, -w*0.5, -h*0.5, w, h*0.6, 6); ctx.fill();
    // head
    ctx.fillStyle='#f4d0b1'; ctx.beginPath(); ctx.arc(0, -h*0.45, 12,0,Math.PI*2); ctx.fill();
    // 80s hair (stylized)
    ctx.fillStyle='#2b1f12'; ctx.beginPath(); ctx.moveTo(-12, -h*0.53); ctx.quadraticCurveTo(-6, -h*0.7, 0, -h*0.62); ctx.quadraticCurveTo(6, -h*0.72, 12, -h*0.53); ctx.fill();
    ctx.restore(); }

  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  // start
  initAudio(); requestAnimationFrame(update);

})();
