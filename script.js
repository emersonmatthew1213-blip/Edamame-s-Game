// Hawkins Explorer — simple tile game
// Controls: arrows/WASD move, Space interact, M mute

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Internal resolution (small, then scaled by CSS)
  const WIDTH = 160;   // logical width
  const HEIGHT = 120;  // logical height
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const TILE = 8; // pixels per tile
  const MAP_W = 20;
  const MAP_H = 15;

  // Legend:
  // 0: grass, 1: road, 2: house, 3: tree, 4: water, 5: lab (special)
  const map = [
    // 20 cols x 15 rows (row-major)
    // This small map has a road loop, houses and a lab
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,3,3,0,0,0,0,0,2,2,2,0,0,3,3,0,0,0,0,0,
    0,3,3,0,1,1,1,1,1,1,1,1,0,3,3,0,0,0,5,0,
    0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,4,4,1,0,
    0,2,2,0,1,0,3,3,0,2,0,1,0,2,2,0,4,4,1,0,
    0,2,2,0,1,0,3,3,0,2,0,1,0,2,2,0,1,1,1,0,
    0,0,0,0,1,1,1,1,1,2,0,1,0,0,0,0,0,0,0,0,
    0,3,3,0,0,0,0,0,1,2,2,1,0,3,3,0,0,0,0,0,
    0,3,3,0,2,2,0,0,1,1,1,1,0,3,3,0,0,0,0,0,
    0,0,0,0,2,2,0,0,0,0,0,1,0,0,0,0,0,3,3,0,
    0,4,4,0,0,0,0,0,0,2,0,1,0,0,0,0,0,3,3,0,
    0,4,4,0,0,0,0,2,2,2,0,1,0,0,0,2,2,0,0,0,
    0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ];

  const tileAt = (x,y) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 0;
    return map[y*MAP_W + x];
  };

  // Colors for tiles
  const palette = {
    0: '#2f8b3d', // grass
    1: '#8a8a8a', // road
    2: '#c24b4b', // house
    3: '#184d19', // tree
    4: '#0f4a70', // water
    5: '#6f5dd3'  // lab
  };

  // Points of interest
  const poi = {
    '5': 'Hawkins Lab',
    // house clusters -> "Hawkins home"
    // We'll detect tile types nearby and show friendly names
  };

  // Player
  const player = {
    x: 10.5, // tile-based coords (float for smooth)
    y: 7.5,
    speed: 2.8, // tiles per second
    w: 0.6,
    h: 0.9,
    dir: 0
  };

  // Keyboard state
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  // HUD elements
  const locationEl = document.getElementById('location');
  const dialogEl = document.getElementById('dialog');

  // Audio
  const AudioEnabled = { on: true };
  let audioCtx, masterGain, drone;
  function initAudio(){
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.08;
      masterGain.connect(audioCtx.destination);

      // simple drone: two oscillators slightly detuned
      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      const g2 = audioCtx.createGain();
      o1.type = 'sine';
      o2.type = 'sine';
      o1.frequency.value = 110;
      o2.frequency.value = 116.3;
      g1.gain.value = 0.6;
      g2.gain.value = 0.4;
      o1.connect(g1); g1.connect(masterGain);
      o2.connect(g2); g2.connect(masterGain);
      o1.start(); o2.start();
      drone = { o1, o2 };
    }catch(e){
      AudioEnabled.on = false;
    }
  }
  function toggleAudio(){
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    AudioEnabled.on = !AudioEnabled.on;
    masterGain.gain.value = AudioEnabled.on ? 0.08 : 0;
  }

  // prevent movement into blocking tiles (houses and water and trees)
  function isPassable(tx,ty){
    const t = tileAt(tx,ty);
    if (t === 2 || t === 4 || t === 3) return false;
    return true;
  }

  // Interaction: examine tiles around player
  function interact(){
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    // Check neighboring tiles for special POIs
    const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const d of dirs){
      const nx = px + d[0], ny = py + d[1];
      const t = tileAt(nx,ny);
      if (t === 5){
        showDialog("Hawkins Lab — Something hums quietly...");
        return;
      } else if (t === 2){
        showDialog("A house in Hawkins. Curtains, bikes on the lawn.");
        return;
      } else if (t === 4){
        showDialog("A little pond — water glints in the sun.");
        return;
      }
    }
    showDialog("There's not much here. Try exploring the road and buildings.");
  }

  let dialogTimeout = null;
  function showDialog(text, timeout = 3500){
    dialogEl.textContent = text;
    dialogEl.classList.remove('hidden');
    if (dialogTimeout) clearTimeout(dialogTimeout);
    dialogTimeout = setTimeout(()=> dialogEl.classList.add('hidden'), timeout);
  }

  // Main loop
  let last = performance.now();
  function step(now){
    const dt = Math.min(0.05, (now - last) / 1000); // clamp
    last = now;

    // Handle input
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;

    // normalize
    if (dx !== 0 && dy !== 0){
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    const wantedX = player.x + dx * player.speed * dt;
    const wantedY = player.y + dy * player.speed * dt;

    // Simple collision: check target tile centers
    if (isPassable(Math.floor(wantedX), Math.floor(player.y))){
      player.x = wantedX;
    }
    if (isPassable(Math.floor(player.x), Math.floor(wantedY))){
      player.y = wantedY;
    }

    // Interact
    if (keys[' '] || keys['space']){
      if (!keys._spaceHandled){
        interact();
        keys._spaceHandled = true;
      }
    } else {
      keys._spaceHandled = false;
    }

    if (keys['m']){
      if (!keys._mHandled){
        toggleAudio();
        keys._mHandled = true;
      }
    } else keys._mHandled = false;

    // Update HUD location name
    updateLocationLabel();

    // Render
    render();

    requestAnimationFrame(step);
  }

  function updateLocationLabel(){
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const t = tileAt(px,py);
    if (t === 5) locationEl.textContent = "Near: Hawkins Lab";
    else if (t === 2) locationEl.textContent = "Neighborhood";
    else if (t === 4) locationEl.textContent = "Pond";
    else if (t === 1) locationEl.textContent = "On the road — Hawkins";
    else locationEl.textContent = "Hawkins, Indiana";
  }

  function render(){
    // Clear
    ctx.fillStyle = '#8fb6e6';
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    // Camera: center on player
    const camX = player.x * TILE - WIDTH/2 + TILE/2;
    const camY = player.y * TILE - HEIGHT/2 + TILE/2;

    // draw tiles
    for (let y=0;y<MAP_H;y++){
      for (let x=0;x<MAP_W;x++){
        const t = tileAt(x,y);
        const screenX = x * TILE - camX;
        const screenY = y * TILE - camY;
        ctx.fillStyle = palette[t] || '#000';
        // simple tile shapes
        if (t === 1){ // road: darker center with lines
          ctx.fillStyle = palette[1];
          ctx.fillRect(screenX, screenY, TILE, TILE);
          // central dashed line
          ctx.fillStyle = '#e6e6e6';
          ctx.fillRect(screenX + TILE/2 - 0.6, screenY + TILE*0.1, 1.2, TILE*0.8);
        } else if (t === 2){ // house
          ctx.fillStyle = '#592323';
          ctx.fillRect(screenX, screenY + TILE*0.3, TILE, TILE*0.7); // building
          ctx.fillStyle = '#b55454';
          triangle(ctx, screenX, screenY + TILE*0.3, TILE, 'roof'); // roof
        } else if (t === 3){ // tree
          ctx.fillStyle = '#2b6b2b';
          ctx.beginPath();
          ctx.arc(screenX + TILE/2, screenY + TILE/2, TILE*0.5,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#5b3a20';
          ctx.fillRect(screenX + TILE*0.45, screenY + TILE*0.6, TILE*0.1, TILE*0.4);
        } else if (t === 4){ // water
          ctx.fillStyle = palette[4];
          ctx.fillRect(screenX, screenY, TILE, TILE);
          ctx.fillStyle = '#78b5e6';
          ctx.fillRect(screenX + 1, screenY + 1, TILE-2, TILE-2);
        } else if (t === 5){ // lab
          ctx.fillStyle = '#3a2b7b';
          ctx.fillRect(screenX, screenY + TILE*0.2, TILE, TILE*0.8);
          ctx.fillStyle = '#8a79e6';
          ctx.fillRect(screenX + TILE*0.15, screenY + TILE*0.35, TILE*0.7, TILE*0.4);
        } else { // grass
          ctx.fillStyle = palette[0];
          ctx.fillRect(screenX, screenY, TILE, TILE);
        }
      }
    }

    // draw player (simple pixel sprite)
    const px = player.x * TILE - camX;
    const py = player.y * TILE - camY;
    drawPlayer(ctx, px, py, TILE);

    // optionally draw debug grid
    // drawGrid(ctx, camX, camY);
  }

  function triangle(ctx, x, y, size, type){
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size/2, y - size*0.6);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlayer(ctx, sx, sy, tile){
    // center player
    const w = tile*0.6, h = tile*0.8;
    ctx.save();
    ctx.translate(sx, sy);
    // body shadow
    ctx.fillStyle = '#001';
    ctx.fillRect(-w/2 + 1, -h/2 + 2, w, h);
    // body
    ctx.fillStyle = '#ffe07a';
    ctx.fillRect(-w/2, -h/2, w, h*0.6); // shirt
    // head
    ctx.fillStyle = '#ffd6a5';
    ctx.beginPath();
    ctx.arc(0, -h/2 - (tile*0.08), tile*0.18, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // utility: draw optional grid
  function drawGrid(ctx, camX, camY){
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let x=0;x<=MAP_W;x++){
      ctx.beginPath();
      ctx.moveTo(x*TILE - camX, -camY);
      ctx.lineTo(x*TILE - camX, MAP_H*TILE - camY);
      ctx.stroke();
    }
  }

  // initial audio setup
  initAudio();

  // Start loop
  requestAnimationFrame(step);

  // small helper to unlock audio on first user gesture (some browsers require)
  window.addEventListener('click', function unlock(){
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    window.removeEventListener('click', unlock);
  });

  // Mute toggle with keyboard 'm' is handled in loop

})();
