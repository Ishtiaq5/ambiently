/* Ambiently — Premium Focus Sound Mixer
   All audio is synthesised at runtime with the Web Audio API.
   No samples, no network requests, no libraries. */
(function () {
  "use strict";

  var SOUNDS = [
    { id: "rain",  name: "Rain",  icon: "\uD83C\uDF27\uFE0F", hint: "Soft steady rainfall", noise: "white", filter: "highpass", freq: 900,  q: 0.7, gain: 0.55, vol: 60 },
    { id: "ocean", name: "Ocean", icon: "\uD83C\uDF0A",        hint: "Rolling shoreline waves", noise: "brown", filter: "lowpass",  freq: 620,  q: 0.6, gain: 0.85, vol: 55, lfo: { rate: 0.09, depth: 260 } },
    { id: "fire",  name: "Fire",  icon: "\uD83D\uDD25",        hint: "Crackling hearth", noise: "brown", filter: "lowpass",  freq: 1500, q: 0.5, gain: 0.6,  vol: 55, crackle: true },
    { id: "wind",  name: "Wind",  icon: "\uD83C\uDF43",        hint: "Gentle open-air breeze", noise: "pink",  filter: "bandpass", freq: 640,  q: 0.85, gain: 0.7, vol: 50, lfo: { rate: 0.06, depth: 320 } },
    { id: "night", name: "Night", icon: "\uD83C\uDF19",        hint: "Still midnight air", noise: "brown", filter: "lowpass",  freq: 300,  q: 0.6, gain: 0.9,  vol: 60, lfo: { rate: 0.04, depth: 90 } },
    { id: "cafe",  name: "Caf\u00E9", icon: "\u2615",          hint: "Distant room murmur", noise: "pink",  filter: "bandpass", freq: 1100, q: 0.55, gain: 0.6, vol: 45, lfo: { rate: 0.35, depth: 180 } }
  ];

  var PRESETS = [
    { name: "Deep Focus",  mix: { rain: 45, ocean: 0,  fire: 0,  wind: 30, night: 45, cafe: 0 } },
    { name: "Rainy Night", mix: { rain: 80, ocean: 0,  fire: 0,  wind: 15, night: 55, cafe: 0 } },
    { name: "Coastal Calm",mix: { rain: 0,  ocean: 85, fire: 0,  wind: 35, night: 0,  cafe: 0 } },
    { name: "Fireplace",   mix: { rain: 0,  ocean: 0,  fire: 80, wind: 20, night: 30, cafe: 0 } }
  ];

  var state = { playing: false, ctx: null, master: null, buffers: {}, nodes: {} };
  var grid = document.getElementById("grid");
  var chips = document.getElementById("chips");
  var playBtn = document.getElementById("masterPlay");

  /* ---------------- noise generation ---------------- */

  function makeNoise(ctx, type, seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (type === "brown") {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      } else if (type === "pink") {
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.28;
      } else {
        d[i] = w * 0.45;
      }
    }
    return buf;
  }

  function buffer(type) {
    if (!state.buffers[type]) state.buffers[type] = makeNoise(state.ctx, type, 5);
    return state.buffers[type];
  }

  /* ---------------- audio graph ---------------- */

  function initAudio() {
    if (state.ctx) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    state.ctx = new Ctx();
    state.master = state.ctx.createGain();
    state.master.gain.value = 0.9;
    state.master.connect(state.ctx.destination);
    SOUNDS.forEach(buildChain);
  }

  function buildChain(cfg) {
    var ctx = state.ctx;
    var src = ctx.createBufferSource();
    src.buffer = buffer(cfg.noise);
    src.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = cfg.filter;
    filter.frequency.value = cfg.freq;
    filter.Q.value = cfg.q;

    var gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    src.start();

    var node = { cfg: cfg, src: src, filter: filter, gain: gain, on: false, vol: cfg.vol / 100 };

    if (cfg.lfo) {
      var lfo = ctx.createOscillator();
      lfo.frequency.value = cfg.lfo.rate;
      var lg = ctx.createGain();
      lg.gain.value = cfg.lfo.depth;
      lfo.connect(lg);
      lg.connect(filter.frequency);
      lfo.start();
      node.lfo = lfo;
    }

    if (cfg.crackle) {
      node.timer = setInterval(function () {
        if (!node.on || !state.playing) return;
        var t = ctx.currentTime;
        var b = ctx.createBufferSource();
        b.buffer = buffer("white");
        b.playbackRate.value = 1.6;
        var bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 900 + Math.random() * 2400;
        bp.Q.value = 1.1;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.45, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.09);
        b.connect(bp); bp.connect(g); g.connect(gain);
        b.start(t); b.stop(t + 0.25);
      }, 180);
    }

    state.nodes[cfg.id] = node;
  }

  function applyGain(id) {
    var node = state.nodes[id];
    if (!node || !state.ctx) return;
    var target = node.on ? node.vol * node.cfg.gain : 0;
    node.gain.gain.setTargetAtTime(target, state.ctx.currentTime, 0.08);
  }

  /* ---------------- UI construction ---------------- */

  function buildUI() {
    SOUNDS.forEach(function (cfg, i) {
      var card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-id", cfg.id);

      var bars = "";
      for (var b = 0; b < 9; b++) bars += '<span class="bar" style="--i:' + b + '"></span>';

      card.innerHTML =
        '<div class="card-top">' +
          '<span class="emoji" aria-hidden="true">' + cfg.icon + "</span>" +
          "<div><h3>" + cfg.name + '</h3><p class="hint">' + cfg.hint + "</p></div>" +
          '<button class="switch" type="button" role="switch" aria-checked="false" aria-label="Toggle ' + cfg.name + '"><span></span></button>' +
        "</div>" +
        '<div class="viz" aria-hidden="true">' + bars + "</div>" +
        '<div class="vol">' +
          '<input type="range" min="0" max="100" value="' + cfg.vol + '" aria-label="' + cfg.name + ' volume" style="--i:' + i + '" />' +
          '<span class="vol-val">' + cfg.vol + "%</span>" +
        "</div>";

      var sw = card.querySelector(".switch");
      var range = card.querySelector("input[type=range]");
      var out = card.querySelector(".vol-val");

      sw.addEventListener("click", function () { toggleSound(cfg.id); });

      range.addEventListener("input", function () {
        var node = state.nodes[cfg.id];
        if (node) node.vol = range.value / 100;
        out.textContent = range.value + "%";
        applyGain(cfg.id);
      });

      grid.appendChild(card);
    });

    PRESETS.forEach(function (p) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = p.name;
      chip.addEventListener("click", function () { applyPreset(p, chip); });
      chips.appendChild(chip);
    });
  }

  function toggleSound(id) {
    initAudio();
    var node = state.nodes[id];
    if (!node) return;
    node.on = !node.on;
    if (node.on && !state.playing) setPlaying(true);
    applyGain(id);
    paint(id);
  }

  function paint(id) {
    var card = grid.querySelector('.card[data-id="' + id + '"]');
    var node = state.nodes[id];
    if (!card || !node) return;
    card.classList.toggle("is-on", node.on);
    card.querySelector(".switch").setAttribute("aria-checked", String(node.on));
  }

  function applyPreset(preset, chip) {
    initAudio();
    SOUNDS.forEach(function (cfg) {
      var v = preset.mix[cfg.id] || 0;
      var node = state.nodes[cfg.id];
      node.vol = v / 100;
      node.on = v > 0;
      var card = grid.querySelector('.card[data-id="' + cfg.id + '"]');
      var range = card.querySelector("input[type=range]");
      range.value = v;
      card.querySelector(".vol-val").textContent = v + "%";
      applyGain(cfg.id);
      paint(cfg.id);
    });
    Array.prototype.forEach.call(chips.children, function (c) { c.classList.remove("is-active"); });
    if (chip) chip.classList.add("is-active");
    if (!state.playing) setPlaying(true);
  }

  function setPlaying(next) {
    initAudio();
    var ctx = state.ctx;
    var go = function () {
      state.playing = next;
      playBtn.setAttribute("aria-pressed", String(next));
      playBtn.querySelector(".ico").textContent = next ? "\u275A\u275A" : "\u25B6";
      playBtn.querySelector(".label").textContent = next ? "Pause audio" : "Start listening";
    };
    if (next) ctx.resume().then(go); else ctx.suspend().then(go);
  }

  /* ---------------- visualiser ---------------- */

  function tick(t) {
    var cards = grid.querySelectorAll(".card.is-on");
    for (var c = 0; c < cards.length; c++) {
      var bars = cards[c].querySelectorAll(".bar");
      for (var i = 0; i < bars.length; i++) {
        var phase = t / 460 + i * 0.85 + c * 1.7;
        var s = 0.18 + 0.82 * Math.abs(Math.sin(phase) * 0.7 + Math.sin(phase * 2.3) * 0.3);
        bars[i].style.transform = "scaleY(" + s.toFixed(3) + ")";
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- boot ---------------- */

  playBtn.addEventListener("click", function () { setPlaying(!state.playing); });
  document.getElementById("year").textContent = new Date().getFullYear();

  buildUI();
  requestAnimationFrame(tick);
})();
