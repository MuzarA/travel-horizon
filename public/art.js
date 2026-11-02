/* Travel Horizon — built-in illustrated landscapes (inline SVG).
   Shown when no photo is set and kept behind every photo as a fallback. */
(function (root) {
  'use strict';
  var TH = root.TH = root.TH || {};
  var W = 1600, H = 1000, uid = 0;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Midpoint displacement ridge: returns 129 points across the width. */
  function ridge(r, base, amp, rough) {
    var n = 128, pts = new Array(n + 1), step = 16, scale = amp * 0.42;
    for (var c = 0; c <= n; c += step) pts[c] = base + (r() - 0.5) * amp;
    while (step > 1) {
      var half = step / 2;
      for (var i = half; i < n; i += step) {
        pts[i] = (pts[i - half] + pts[i + half]) / 2 + (r() - 0.5) * scale;
      }
      scale *= rough;
      step = half;
    }
    return pts;
  }
  function ridgePath(pts) {
    var d = 'M0 ' + H + ' L0 ' + pts[0].toFixed(1);
    for (var i = 1; i < pts.length; i++) d += ' L' + (i * W / 128).toFixed(1) + ' ' + pts[i].toFixed(1);
    return d + ' L' + W + ' ' + H + ' Z';
  }
  function yAt(pts, x) {
    var f = x / W * 128, i = Math.max(0, Math.min(127, Math.floor(f))), t = f - i;
    return pts[i] * (1 - t) + pts[i + 1] * t;
  }
  function spruce(x, y, h, c) {
    var w = h * 0.32;
    return '<path d="M' + x.toFixed(1) + ' ' + (y - h).toFixed(1) + ' L' + (x + w).toFixed(1) + ' ' + y.toFixed(1) + ' L' + (x - w).toFixed(1) + ' ' + y.toFixed(1) + ' Z" fill="' + c + '"/>';
  }
  function roundTree(x, y, h, c) {
    return '<rect x="' + (x - 2).toFixed(1) + '" y="' + (y - h * 0.4).toFixed(1) + '" width="4" height="' + (h * 0.4).toFixed(1) + '" fill="' + c + '"/>' +
      '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y - h * 0.6).toFixed(1) + '" rx="' + (h * 0.42).toFixed(1) + '" ry="' + (h * 0.38).toFixed(1) + '" fill="' + c + '"/>';
  }
  function yurt(x, y, s, felt, band, door) {
    var w = 34 * s, h = 30 * s;
    return '<g><path d="M' + (x - w) + ' ' + y + ' L' + (x - w) + ' ' + (y - h * 0.55) + ' Q' + x + ' ' + (y - h * 1.35) + ' ' + (x + w) + ' ' + (y - h * 0.55) + ' L' + (x + w) + ' ' + y + ' Z" fill="' + felt + '"/>' +
      '<path d="M' + (x - w) + ' ' + (y - h * 0.5) + ' L' + (x + w) + ' ' + (y - h * 0.5) + '" stroke="' + band + '" stroke-width="' + (3 * s) + '"/>' +
      '<rect x="' + (x - 6 * s) + '" y="' + (y - 16 * s) + '" width="' + (12 * s) + '" height="' + (16 * s) + '" fill="' + door + '"/></g>';
  }

  /* Scene settings. layers: far → near. */
  var SCENES = {
    hero: { seed: 11, sky: ['#18324a', '#3d5f7a', '#e7a35d'], sun: { x: 1120, y: 610, r: 120, c: '#f6c58a' }, stars: true,
      layers: [
        { y: 470, amp: 260, rough: 0.56, c: '#7d8fa6', snow: 430, so: 0.85 },
        { y: 560, amp: 200, rough: 0.55, c: '#5b708a', snow: 520, so: 0.55 },
        { y: 640, amp: 150, rough: 0.5, c: '#3c5269' },
        { y: 700, amp: 90, rough: 0.48, c: '#283d52' }
      ], water: { y: 760, c: ['#2d4f68', '#14293b'] }, shore: { y: 880, amp: 50, c: '#1a2a24' },
      yurts: [[300, 905, 1.1], [395, 912, 0.9], [1340, 900, 1]], felt: '#efe6d6', band: '#b5432f', door: '#5b3427' },
    issyk: { seed: 21, sky: ['#9fcbe0', '#d7ebf1', '#f6efe2'], sun: { x: 1260, y: 230, r: 70, c: '#fff6df' },
      layers: [
        { y: 430, amp: 160, rough: 0.55, c: '#9fb3c4', snow: 410, so: 0.95 },
        { y: 500, amp: 110, rough: 0.5, c: '#7f97ab', snow: 470, so: 0.6 }
      ], water: { y: 560, c: ['#2f86a3', '#114a63'] }, shore: { y: 860, amp: 30, c: '#e2cda4' } },
    alaarcha: { seed: 31, sky: ['#bcd4e2', '#e3edf0', '#f3eee4'],
      layers: [
        { y: 300, amp: 380, rough: 0.6, c: '#8496a8', snow: 340, so: 0.95 },
        { y: 520, amp: 260, rough: 0.58, c: '#5f7584', snow: 470, so: 0.5 },
        { y: 690, amp: 160, rough: 0.5, c: '#3f5e52', trees: { n: 70, h: [26, 52], c: '#2d4a3f' } },
        { y: 840, amp: 80, rough: 0.45, c: '#2b4239', trees: { n: 40, h: [44, 80], c: '#1f342c' } }
      ] },
    sarychelek: { seed: 41, sky: ['#c9dfe0', '#e8f0ea', '#f4eee2'],
      layers: [
        { y: 420, amp: 180, rough: 0.52, c: '#9db3a8' },
        { y: 520, amp: 170, rough: 0.5, c: '#6f9278', trees: { n: 90, h: [16, 30], c: '#557a62' } }
      ], water: { y: 640, c: ['#2fa7a0', '#14706f'] },
      near: { y: 760, amp: 180, rough: 0.48, c: '#2f5a45', trees: { n: 60, h: [50, 96], c: '#22473a' } } },
    songkul: { seed: 51, sky: ['#b8d3e6', '#e2edf3', '#fbf3e4'], sun: { x: 360, y: 220, r: 60, c: '#fff4d8' },
      layers: [
        { y: 470, amp: 90, rough: 0.5, c: '#a9b8c6', snow: 455, so: 0.9 },
        { y: 540, amp: 50, rough: 0.45, c: '#8aa08c' }
      ], water: { y: 590, c: ['#3c86ad', '#1d5878'] }, shore: { y: 690, amp: 30, c: '#9db66f' },
      meadow: { y: 760, amp: 40, c: '#7c9a52' },
      yurts: [[520, 790, 1.3], [640, 798, 1.1], [1180, 780, 1.2]], felt: '#f6f0e3', band: '#b5432f', door: '#6a3b2a' },
    karakol: { seed: 61, sky: ['#a8c4dc', '#dde9f0', '#f4ede1'],
      layers: [
        { y: 330, amp: 300, rough: 0.58, c: '#8fa1b5', snow: 360, so: 0.95 },
        { y: 560, amp: 140, rough: 0.5, c: '#5d7a70', trees: { n: 80, h: [20, 38], c: '#3e5d52' } },
        { y: 780, amp: 60, rough: 0.45, c: '#c9b98d' }
      ], town: true },
    jetioguz: { seed: 71, sky: ['#b7d0df', '#e4edf0', '#f6efe3'],
      layers: [
        { y: 380, amp: 220, rough: 0.55, c: '#9aaab9', snow: 380, so: 0.85 },
        { y: 560, amp: 260, rough: 0.66, c: '#b4553a' },
        { y: 640, amp: 200, rough: 0.62, c: '#963f2b' },
        { y: 830, amp: 60, rough: 0.45, c: '#5f8a4e', trees: { n: 30, h: [34, 64], c: '#2f5a40' } }
      ] },
    alakul: { seed: 81, sky: ['#a9c9e0', '#dbe9f1', '#f2eee6'],
      layers: [
        { y: 280, amp: 300, rough: 0.6, c: '#93a5b8', snow: 430, so: 0.98 },
        { y: 520, amp: 160, rough: 0.55, c: '#6c7f8c', snow: 470, so: 0.4 }
      ], water: { y: 610, c: ['#38b6c1', '#127a8a'] }, shore: { y: 780, amp: 70, c: '#6f7a72' } },
    kochkor: { seed: 91, sky: ['#c3d6e2', '#e9eff0', '#f7f0e2'], sun: { x: 1240, y: 260, r: 64, c: '#fff1d2' },
      layers: [
        { y: 450, amp: 170, rough: 0.55, c: '#a7b4c0', snow: 420, so: 0.8 },
        { y: 600, amp: 110, rough: 0.48, c: '#c4ad7d' },
        { y: 760, amp: 60, rough: 0.45, c: '#9b8a5a', trees: { n: 18, h: [40, 70], c: '#6b7a43', round: true } }
      ], village: true },
    tashrabat: { seed: 101, sky: ['#bcd3e3', '#e6eef1', '#f5efe4'],
      layers: [
        { y: 380, amp: 200, rough: 0.55, c: '#a2b1bf', snow: 380, so: 0.7 },
        { y: 560, amp: 160, rough: 0.5, c: '#8c9a6e' },
        { y: 780, amp: 50, rough: 0.45, c: '#7d8b56' }
      ], caravanserai: true },
    arslanbob: { seed: 111, sky: ['#c8dbe1', '#ebf0ea', '#f5efe2'],
      layers: [
        { y: 300, amp: 160, rough: 0.5, c: '#b9a993' },
        { y: 520, amp: 160, rough: 0.5, c: '#7f9a64', trees: { n: 60, h: [20, 36], c: '#5f7d4a', round: true } },
        { y: 760, amp: 90, rough: 0.45, c: '#4d6b3d', trees: { n: 34, h: [60, 110], c: '#3a5530', round: true } }
      ], waterfall: { x: 980, y0: 250, y1: 560 } }
  };

  function scene(name) {
    var s = SCENES[name] || SCENES.issyk, r = rng(s.seed), id = 'th' + (++uid), out = [];
    var defs = '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + s.sky[0] + '"/><stop offset="0.55" stop-color="' + s.sky[1] + '"/><stop offset="1" stop-color="' + s.sky[2] + '"/></linearGradient>';
    if (s.sun) defs += '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + s.sun.c + '" stop-opacity="0.9"/><stop offset="1" stop-color="' + s.sun.c + '" stop-opacity="0"/></radialGradient>';
    if (s.water) defs += '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.water.c[0] + '"/><stop offset="1" stop-color="' + s.water.c[1] + '"/></linearGradient>';

    out.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 's)"/>');
    if (s.stars) {
      var st = '';
      for (var k = 0; k < 90; k++) st += '<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * 380).toFixed(0) + '" r="' + (r() * 1.6 + 0.4).toFixed(1) + '" fill="#fff" opacity="' + (r() * 0.6 + 0.2).toFixed(2) + '"/>';
      out.push('<g class="art-stars">' + st + '</g>');
    }
    if (s.sun) out.push('<g class="art-layer" data-depth="0.05"><circle cx="' + s.sun.x + '" cy="' + s.sun.y + '" r="' + (s.sun.r * 3) + '" fill="url(#' + id + 'g)"/><circle cx="' + s.sun.x + '" cy="' + s.sun.y + '" r="' + s.sun.r + '" fill="' + s.sun.c + '"/></g>');
    if (s.waterfall) out.push(''); // drawn after the first layer

    function drawLayer(L, depth, idx) {
      var pts = ridge(r, L.y, L.amp, L.rough), d = ridgePath(pts), g = '<g class="art-layer" data-depth="' + depth + '">';
      g += '<path d="' + d + '" fill="' + L.c + '"/>';
      if (L.snow) {
        var cid = id + 'c' + idx;
        defs += '<clipPath id="' + cid + '"><path d="' + d + '"/></clipPath>';
        var sl = ridge(r, L.snow, 70, 0.55), sd = 'M0 0 L' + W + ' 0';
        for (var si = 128; si >= 0; si--) sd += ' L' + (si * W / 128).toFixed(1) + ' ' + sl[si].toFixed(1);
        g += '<g clip-path="url(#' + cid + ')"><path d="' + sd + ' Z" fill="#f7f9fb" opacity="' + (L.so || 0.9) + '"/></g>';
      }
      if (L.trees) {
        var T = L.trees;
        for (var t = 0; t < T.n; t++) {
          var x = r() * W, y = yAt(pts, x) + 6 + r() * 60, h = T.h[0] + r() * (T.h[1] - T.h[0]);
          g += T.round ? roundTree(x, y, h, T.c) : spruce(x, y, h, T.c);
        }
      }
      return g + '</g>';
    }

    var depths = [0.08, 0.14, 0.22, 0.3];
    s.layers.forEach(function (L, i) {
      out.push(drawLayer(L, depths[i] || 0.3, i));
      if (i === 0 && s.waterfall) {
        var wf = s.waterfall;
        out.push('<g class="art-layer" data-depth="0.08"><path d="M' + wf.x + ' ' + wf.y0 + ' C' + (wf.x + 6) + ' ' + (wf.y0 + 120) + ' ' + (wf.x - 6) + ' ' + (wf.y1 - 120) + ' ' + wf.x + ' ' + wf.y1 + '" stroke="#f4f7f8" stroke-width="10" fill="none" opacity="0.9"/></g>');
      }
    });

    if (s.water) {
      var wg = '<g class="art-layer" data-depth="0.18"><rect y="' + s.water.y + '" width="' + W + '" height="' + (H - s.water.y) + '" fill="url(#' + id + 'w)"/>';
      for (var q = 0; q < 26; q++) {
        var wy = s.water.y + 14 + r() * (H - s.water.y - 30), wx = r() * W, wl = 40 + r() * 200;
        wg += '<path d="M' + wx.toFixed(0) + ' ' + wy.toFixed(0) + ' h' + wl.toFixed(0) + '" stroke="#ffffff" stroke-opacity="' + (0.08 + r() * 0.18).toFixed(2) + '" stroke-width="2" stroke-linecap="round"/>';
      }
      if (s.sun && name === 'hero') wg += '<path d="M' + (s.sun.x - 90) + ' ' + (s.water.y + 18) + ' h180 M' + (s.sun.x - 60) + ' ' + (s.water.y + 40) + ' h120 M' + (s.sun.x - 34) + ' ' + (s.water.y + 64) + ' h68" stroke="' + s.sun.c + '" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round"/>';
      out.push(wg + '</g>');
    }
    if (s.near) out.push(drawLayer(s.near, 0.3, 9));
    if (s.shore) {
      var sp = ridge(r, s.shore.y, s.shore.amp, 0.45);
      out.push('<g class="art-layer" data-depth="0.3"><path d="' + ridgePath(sp) + '" fill="' + s.shore.c + '"/></g>');
    }
    if (s.meadow) {
      var mp = ridge(r, s.meadow.y, s.meadow.amp, 0.45);
      out.push('<g class="art-layer" data-depth="0.32"><path d="' + ridgePath(mp) + '" fill="' + s.meadow.c + '"/></g>');
    }
    if (s.yurts) {
      var yg = '<g class="art-layer" data-depth="0.34">';
      s.yurts.forEach(function (y) { yg += yurt(y[0], y[1], y[2], s.felt, s.band, s.door); });
      out.push(yg + '</g>');
    }
    if (s.town) {
      var tg = '<g class="art-layer" data-depth="0.32">';
      for (var b = 0; b < 14; b++) {
        var bx = 120 + b * 100 + r() * 40, bw = 50 + r() * 40, bh = 30 + r() * 40, by = 820;
        tg += '<rect x="' + bx.toFixed(0) + '" y="' + (by - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" fill="#efe7d6"/>' +
          '<path d="M' + (bx - 6).toFixed(0) + ' ' + (by - bh).toFixed(0) + ' L' + (bx + bw / 2).toFixed(0) + ' ' + (by - bh - 22).toFixed(0) + ' L' + (bx + bw + 6).toFixed(0) + ' ' + (by - bh).toFixed(0) + ' Z" fill="' + (b % 3 ? '#4f7a6a' : '#b5432f') + '"/>';
      }
      tg += '<rect y="820" width="' + W + '" height="180" fill="#8fa66a"/>';
      out.push(tg + '</g>');
    }
    if (s.village) {
      var vg = '<g class="art-layer" data-depth="0.32">';
      for (var v = 0; v < 9; v++) {
        var vx = 160 + v * 150 + r() * 50, vw = 70 + r() * 30, vy = 840;
        vg += '<rect x="' + vx.toFixed(0) + '" y="' + (vy - 46) + '" width="' + vw.toFixed(0) + '" height="46" fill="#f1e8d6"/><rect x="' + (vx - 4).toFixed(0) + '" y="' + (vy - 54) + '" width="' + (vw + 8).toFixed(0) + '" height="10" fill="#7a6a55"/>';
      }
      vg += '<rect y="840" width="' + W + '" height="160" fill="#a99a63"/>';
      vg += '<g transform="translate(620 900)"><rect x="-150" y="-26" width="300" height="52" fill="#b5432f"/><path d="M-120 0 q30 -22 60 0 q30 22 60 0 q30 -22 60 0 q30 22 60 0" stroke="#f3e7d2" stroke-width="6" fill="none"/></g>';
      out.push(vg + '</g>');
    }
    if (s.caravanserai) {
      var cx = 800, cy = 800, cg = '<g class="art-layer" data-depth="0.3">';
      cg += '<rect x="' + (cx - 260) + '" y="' + (cy - 90) + '" width="520" height="90" fill="#b9ad97"/>';
      cg += '<path d="M' + (cx - 70) + ' ' + (cy - 90) + ' A70 70 0 0 1 ' + (cx + 70) + ' ' + (cy - 90) + ' Z" fill="#a89c85"/>';
      cg += '<path d="M' + (cx - 210) + ' ' + (cy - 90) + ' A34 34 0 0 1 ' + (cx - 142) + ' ' + (cy - 90) + ' Z M' + (cx + 142) + ' ' + (cy - 90) + ' A34 34 0 0 1 ' + (cx + 210) + ' ' + (cy - 90) + ' Z" fill="#a89c85"/>';
      cg += '<path d="M' + (cx - 22) + ' ' + cy + ' v-46 a22 22 0 0 1 44 0 v46 Z" fill="#5c5245"/>';
      cg += '<rect y="' + cy + '" width="' + W + '" height="' + (H - cy) + '" fill="#7d8b56"/>';
      cg += yurt(1280, 880, 1.1, '#f3ede0', '#b5432f', '#6a3b2a');
      out.push(cg + '</g>');
    }
    return '<svg class="art" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>' + defs + '</defs>' + out.join('') + '</svg>';
  }

  /* Felt-pattern avatar for host profiles without a photo. */
  var AV = [['#b5432f', '#f3e7d2'], ['#1f5f78', '#f1e6cf'], ['#5c7a4a', '#f5ecd9'], ['#8a5a2b', '#f6ead3'], ['#3b4f7a', '#efe4cf'], ['#9a3b52', '#f4e6d6']];
  function avatar(name, seedText) {
    var h = 0, str = String(seedText || name || 'x');
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    var p = AV[h % AV.length], letter = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    letter = letter.replace(/[<>&"']/g, '');
    var horn = 'M0 -30 C14 -30 22 -20 22 -10 C22 0 12 4 6 0 C2 -3 4 -9 9 -9 M0 -30 C-14 -30 -22 -20 -22 -10 C-22 0 -12 4 -6 0 C-2 -3 -4 -9 -9 -9';
    var orn = '';
    for (var k = 0; k < 4; k++) orn += '<path d="' + horn + '" transform="rotate(' + (k * 90) + ') translate(0 -46)" stroke="' + p[1] + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55"/>';
    return '<svg class="avatar" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false"><rect x="-100" y="-100" width="200" height="200" fill="' + p[0] + '"/>' + orn +
      '<circle r="44" fill="' + p[0] + '" stroke="' + p[1] + '" stroke-width="4"/><text y="18" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="56" fill="' + p[1] + '">' + letter + '</text></svg>';
  }

  TH.art = scene;
  TH.avatar = avatar;
  TH.artScenes = Object.keys(SCENES);
})(typeof window !== 'undefined' ? window : globalThis);
