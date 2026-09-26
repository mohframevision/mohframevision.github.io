/* =====================================
   Mohamed Frame Vision Portfolio
   ملف JavaScript الرئيسي
   ===================================== */

// ===== مؤثرات صوتية (اختيارية، مطفأة افتراضياً) =====
// نفس مجموعة أصوات هكوله: مولَّدة بالكود بالكامل (Web Audio، بلا ملفات) —
// نغمات منخفضة، بداية ناعمة، نغمة تحتية للدفء، سلّم ري الكبير، وصدى غرفة خفيف
const SOUND_KEY = "mfv_sound_pref";
const NOTE = { D3: 146.83, D4: 293.66, A4: 440, D5: 587.33, "F#5": 739.99, A5: 880, D6: 1174.66 };
// سلّم ري الكبير من D5 صعوداً — لنغمات صفحة هكوله المتتالية
const SCALE = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98];
let audioCtx = null;
let sfxBus = null;
let noiseBuffer = null;

function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

function makeRoomImpulse(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  return buf;
}

function getSfxBus(ctx) {
  if (sfxBus) return sfxBus;
  sfxBus = ctx.createGain();
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 4500;
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  const verb = ctx.createConvolver();
  verb.buffer = makeRoomImpulse(ctx, 1.4);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  sfxBus.connect(soften);
  soften.connect(dry).connect(ctx.destination);
  soften.connect(verb).connect(wet).connect(ctx.destination);
  return sfxBus;
}

function voice(ctx, bus, { freq, at = 0, attack = 0.004, decay = 0.08, gain = 0.06, glide = 1, pan = 0 }) {
  const t0 = ctx.currentTime + at;
  const end = t0 + attack + decay;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(freq, t0);
  if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * glide, end);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(bus);
  } else {
    g.connect(bus);
  }
  osc.start(t0);
  osc.stop(end + 0.02);
}

function getNoise(ctx) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function noise(ctx, bus, { at = 0, dur = 0.01, freq = 3000, q = 0.8, gain = 0.05, sweepTo = 0, attack = Math.min(0.002, dur / 3) }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tick(ctx, bus) {
    noise(ctx, bus, { dur: 0.006, freq: 3000, gain: 0.07 });
  },
  tap(ctx, bus) {
    const f = NOTE.A4 * (1 + (Math.random() - 0.5) * 0.06);
    voice(ctx, bus, { freq: f, decay: 0.07, gain: 0.07, glide: 0.88 });
    voice(ctx, bus, { freq: f * 1.7, decay: 0.04, gain: 0.018 });
    voice(ctx, bus, { freq: f / 2, decay: 0.09, gain: 0.03 });
  },
  on(ctx, bus) {
    voice(ctx, bus, { freq: NOTE.D5, decay: 0.35, gain: 0.06 });
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.5, gain: 0.05 });
    voice(ctx, bus, { freq: NOTE.A5, at: 0.07, decay: 0.3, gain: 0.035, pan: 0.15 });
  },
  off(ctx, bus) {
    voice(ctx, bus, { freq: NOTE.A4, decay: 0.25, gain: 0.05, glide: 0.94 });
    voice(ctx, bus, { freq: NOTE.A4 / 4, decay: 0.3, gain: 0.04 });
    voice(ctx, bus, { freq: NOTE.D4, at: 0.06, decay: 0.22, gain: 0.03, pan: -0.15 });
  },
  open(ctx, bus) {
    [NOTE.D5, NOTE["F#5"], NOTE.A5].forEach((freq, i) =>
      voice(ctx, bus, { freq, at: i * 0.045, attack: 0.01, decay: 0.6, gain: 0.03, pan: (i - 1) * 0.2 })
    );
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.5, gain: 0.03 });
  },
  close(ctx, bus) {
    noise(ctx, bus, { dur: 0.12, freq: 1800, sweepTo: 400, q: 0.7, gain: 0.035 });
    voice(ctx, bus, { freq: 130, decay: 0.3, gain: 0.07, glide: 0.8 });
  },
  success(ctx, bus) {
    [NOTE.D5, NOTE["F#5"], NOTE.A5, NOTE.D6].forEach((freq, i) =>
      voice(ctx, bus, { freq, at: i * 0.06, attack: 0.02, decay: 1.0, gain: 0.03, pan: -0.3 + i * 0.2 })
    );
    voice(ctx, bus, { freq: NOTE.D3, decay: 0.8, gain: 0.04 });
  },
  // لمعة لما توصل بطاقة هكوله للمقدمة (بدل النقرة العادية)
  shimmer(ctx, bus) {
    [NOTE.A5, NOTE.D6, SCALE[7]].forEach((freq, i) =>
      voice(ctx, bus, { freq, at: i * 0.03, attack: 0.005, decay: 0.35, gain: 0.022, pan: -0.2 + i * 0.2 })
    );
    noise(ctx, bus, { dur: 0.25, freq: 6000, sweepTo: 9000, q: 1.5, gain: 0.012 });
  },
  // دخول هكوله: اندفاعة هواء صاعدة ثم أربيجيو سريع
  hakolah(ctx, bus) {
    noise(ctx, bus, { dur: 0.35, attack: 0.25, freq: 500, sweepTo: 5000, q: 0.9, gain: 0.05 });
    [NOTE.D5, NOTE["F#5"], NOTE.A5, NOTE.D6].forEach((freq, i) =>
      voice(ctx, bus, { freq, at: 0.2 + i * 0.04, attack: 0.006, decay: 0.45, gain: 0.035, pan: -0.3 + i * 0.2 })
    );
    voice(ctx, bus, { freq: NOTE.D3, at: 0.2, decay: 0.6, gain: 0.06 });
  },
  // نغمة من السلّم — i يصعد بها درجة درجة
  note(ctx, bus, i = 0) {
    const freq = SCALE[i % SCALE.length];
    voice(ctx, bus, { freq, attack: 0.008, decay: 0.4, gain: 0.03, pan: ((i % 5) - 2) * 0.12 });
    voice(ctx, bus, { freq: freq * 2, attack: 0.004, decay: 0.15, gain: 0.008 });
  },
  // نقرة منزلق الصوت: تعلى نغمتها مع المستوى (إحساس ملموس بالدرجات)
  level(ctx, bus, v = 0) {
    voice(ctx, bus, { freq: 420 + v * 640, decay: 0.035, gain: 0.035 });
  },
};

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playSound(name, arg) {
  if (!isSoundEnabled()) return;
  const ctx = getAudio();
  SOUNDS[name](ctx, getSfxBus(ctx), arg);
}

// ===== موسيقى خلفية لصفحة هكوله: أجواء هادئة مولّدة بالكود =====
// طلب المالك: هادئة ومحترمة، لا طابع لهو وطرب — فلا إيقاع ولا طبل. ولا
// تكون مملة: أوتار تتنقل عشوائياً بين 6 (بترتيب موسيقي منطقي) وبأطوال
// مختلفة، فوقها نغمات جرس متفرقة بتوقيت غير منتظم، وصدى يعطي مساحة
const MUSIC_KEY = "mfv_music_pref";
const MUSIC_CHORDS = {
  D: [146.83, 220.0, 293.66, 369.99],
  Bm: [123.47, 185.0, 246.94, 293.66],
  G: [98.0, 196.0, 246.94, 293.66],
  A: [110.0, 164.81, 220.0, 277.18],
  Em: [164.81, 196.0, 246.94, 329.63],
  "F#m": [185.0, 220.0, 277.18, 369.99],
};
// من كل وتر، الأوتار اللي يحسن الانتقال لها
const MUSIC_NEXT = {
  D: ["G", "Bm", "A", "Em"],
  Bm: ["G", "Em", "A"],
  G: ["D", "A", "Em", "Bm"],
  A: ["D", "Bm", "F#m"],
  Em: ["A", "G", "D"],
  "F#m": ["Bm", "G"],
};
// خماسي ري الكبير — ما فيه نغمة تتنافر مع أي وتر فوق
const MUSIC_BELLS = [440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77];
const MUSIC_VOLUME = 1.2;
const MUSIC_LEVEL_KEY = "mfv_music_level";
let music = null;
let musicLevel = 0.7;

function createMusic(ctx) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 1500;
  // تنفّس بطيء بالنبرة: الفلتر يتموّج كل ~25 ثانية فالصوت ما يثبت على لون واحد
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.04;
  const depth = ctx.createGain();
  depth.gain.value = 500;
  lfo.connect(depth).connect(soft.frequency);
  lfo.start();
  const verb = ctx.createConvolver();
  verb.buffer = makeRoomImpulse(ctx, 3.5);
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  // مستوى المستخدم من المنزلق — تربيعي لأن الأذن تسمع الصوت لوغاريتمياً
  const level = ctx.createGain();
  level.gain.value = musicLevel * musicLevel;
  master.connect(level).connect(soft);
  soft.connect(ctx.destination);
  soft.connect(verb).connect(wet).connect(ctx.destination);

  let chord = "D";
  let nextChord = 0;
  let nextBell = 0;
  let bell = 3;
  let timer = null;

  function out(pan) {
    if (!pan || !ctx.createStereoPanner) return master;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(master);
    return p;
  }
  // وتر طويل: مثلثي ناعم، دخول 3 ثوانٍ وخروج 4 — يتداخل مع اللي بعده
  function pad(freq, t, len, gain, pan) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 3);
    g.gain.setValueAtTime(gain, t + len - 4);
    g.gain.linearRampToValueAtTime(0, t + len);
    g.connect(out(pan));
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    o.connect(g);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  // نغمة جرس: ضربة ناعمة وذيل طويل، مع توافقية خفيفة فوقها
  function chime(freq, t, gain, pan) {
    [
      [1, gain, 2.8],
      [2, gain * 0.25, 1.2],
    ].forEach(([mul, g0, dur]) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(g0, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(out(pan));
      const o = ctx.createOscillator();
      o.frequency.value = freq * mul;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }
  function scheduleChord(t) {
    const len = rand(7, 11);
    // أحياناً نشيل النغمة الأوطى — تخفيف للطنين وتنويع باللون
    MUSIC_CHORDS[chord].forEach((f, k) => {
      if (k === 0 && Math.random() < 0.3) return;
      pad(f, t, len + 3, 0.045 - k * 0.007, (k - 1.5) * 0.2);
    });
    chord = pick(MUSIC_NEXT[chord]);
    return len;
  }
  function scheduleBell(t) {
    // مشي عشوائي بخطوة أو خطوتين، وأحياناً سكوت
    if (Math.random() < 0.8) {
      bell = Math.max(0, Math.min(MUSIC_BELLS.length - 1, bell + pick([-2, -1, 1, 2])));
      chime(MUSIC_BELLS[bell], t, rand(0.012, 0.022), rand(-0.4, 0.4));
      // ومرات نغمة ثانية قريبة وراها
      if (Math.random() < 0.25) chime(MUSIC_BELLS[Math.min(MUSIC_BELLS.length - 1, bell + 2)], t + rand(0.25, 0.5), 0.01, rand(-0.4, 0.4));
    }
    return rand(1.6, 4.5);
  }
  function pump() {
    const horizon = ctx.currentTime + 1;
    while (nextChord < horizon) nextChord += scheduleChord(nextChord);
    while (nextBell < horizon) nextBell += scheduleBell(nextBell);
  }
  return {
    setLevel(l) {
      level.gain.setTargetAtTime(l * l, ctx.currentTime, 0.04);
    },
    start() {
      if (timer) return;
      const now = ctx.currentTime;
      chord = "D";
      nextChord = now + 0.05;
      nextBell = now + 3;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, now + 2);
      timer = setInterval(pump, 250);
      pump();
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    },
  };
}

// روابط صفحة هكوله (بطاقة الرئيسية، زر القائمة، سطر القائمة): صوت الدخول
// ثم ننتقل — الانتقال الفوري يقطع الصوت قبل ما يُسمع
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href="hakolah-story.html"]');
  if (!a || e.defaultPrevented || !isSoundEnabled()) return;
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  playSound("hakolah");
  setTimeout(() => (location.href = a.href), 450);
});

// أيقونات الأزرار اللي تتغير حالتها وقت التشغيل (نفس مسارات icon.njk)
const ICONS = {
  "menu": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>',
  "close": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>',
  "volume-up": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>',
  "volume-down": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M200-360v-240h160l200-200v640L360-360H200Zm440 40v-322q45 21 72.5 65t27.5 97q0 53-27.5 96T640-320ZM480-606l-86 86H280v80h114l86 86v-252ZM380-480Z"/></svg>',
  "volume-off": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Zm-80 238v-94l-72-72H200v80h114l86 86Zm-36-130Z"/></svg>',
};

let onGlobalMute = null;

function initSoundToggle() {
  const btn = document.querySelector(".sound-toggle");
  if (!btn) return;
  function apply(enabled) {
    btn.setAttribute("aria-pressed", String(enabled));
    btn.innerHTML = enabled ? ICONS["volume-up"] : ICONS["volume-off"];
    const label = enabled ? "إيقاف المؤثرات الصوتية" : "تشغيل المؤثرات الصوتية";
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  apply(isSoundEnabled());
  btn.addEventListener("click", () => {
    const next = !isSoundEnabled();
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* التخزين ممنوع (وضع خاص) — التبديل يشتغل لهالصفحة بس */
    }
    apply(next);
    if (next) playSound("on");
    else onGlobalMute?.();
  });
}

// ===== قائمة الجوال =====
function initNavToggle() {
  const nav = document.querySelector(".nav");
  const btn = document.querySelector(".nav-toggle");
  if (!nav || !btn) return;
  function setOpen(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
    btn.innerHTML = open ? ICONS.close : ICONS.menu;
  }
  btn.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    setOpen(open);
    playSound(open ? "open" : "close");
  });
  // composedPath لا nav.contains(e.target): setOpen تبدّل أيقونة الزر نفسه
  // (innerHTML) أثناء نفس الضغطة، فالعنصر المضغوط ينحذف من الصفحة قبل ما
  // يوصل هنا ويبان كأنه "برّا القائمة" — كانت القائمة تنقفل فور ما تنفتح
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !e.composedPath().includes(nav)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      setOpen(false);
      btn.focus();
    }
  });
}

// ===== الصفحة الرئيسية: رصّة الأعمال ثلاثية الأبعاد (Unveil) =====
// "pos" رقم عشري = البطاقة اللي بالمقدمة؛ العجلة/السحب/الأسهم تغيّر "target"
// ونقرّب pos له تدريجياً كل إطار (حركة ناعمة). البطاقة i على بُعد d = i - pos:
// كل ما زاد d تبعد للخلف ولفوق ولليسار (مقلوبة عن Unveil لأن الموقع RTL)،
// واللي عدّت (d < 0) تقرّب للمشاهد وتختفي
function initWorkStack() {
  const stage = document.querySelector('.stack-stage');
  if (!stage) return;
  const cards = [...stage.querySelectorAll('.stack-card')];
  const N = cards.length;
  const label = document.getElementById('stackLabel');
  const caption = document.getElementById('stackCaption');
  const hint = document.getElementById('stackHint');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pos = 0;
  let target = 0;
  let hovered = -1;
  let shownIndex = -1;
  let frame = null;

  const layout = () =>
    window.innerWidth <= 700
      ? { x: -24, y: -64, z: -210, bx: 0, by: 40, rot: 20 }
      : { x: -108, y: -62, z: -250, bx: window.innerWidth * 0.12, by: window.innerHeight * 0.1, rot: 28 };
  let L = layout();

  function render() {
    cards.forEach((card, i) => {
      const d = i - pos;
      let opacity = 1;
      if (d < 0) opacity = Math.max(0, 1 + d * 1.6);
      else if (d > 9) opacity = Math.max(0, 1 - (d - 9) / 4);
      card.style.opacity = opacity.toFixed(3);
      // البطاقة اللي تطلع (تتلاشى قدّام) تبقى شبه شفافة لكنها أقرب للمشاهد،
      // فتلقط الضغطة بدل البطاقة الحالية اللي تحتها — نوقف تفاعلها من بدري.
      // بلا visibility:hidden: المخفية تبقى قابلة للوصول بـShift+Tab
      card.style.pointerEvents = d < -0.3 || opacity < 0.05 ? 'none' : '';
      const lift = i === hovered ? 45 : 0;
      card.style.transform = `translate3d(${L.bx + d * L.x}px, ${L.by + d * L.y}px, ${d * L.z + lift}px) rotateY(${L.rot}deg)`;
    });
  }

  function updateCaption() {
    const i = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (i === shownIndex) return;
    if (shownIndex !== -1) playSound(cards[i].classList.contains('stack-card-feature') ? 'shimmer' : 'tick');
    shownIndex = i;
    const num = document.createElement('span');
    num.className = 'num';
    num.dir = 'ltr';
    num.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    caption.replaceChildren(num, document.createTextNode(cards[i].dataset.title));
  }

  function step() {
    pos += (target - pos) * (reduceMotion ? 1 : 0.1);
    if (Math.abs(target - pos) < 0.001) pos = target;
    render();
    updateCaption();
    frame = pos === target ? null : requestAnimationFrame(step);
  }

  // بعد ما يوقف التمرير/السحب نثبّت على أقرب بطاقة كاملة — وإلا تستقر الرصّة
  // بين بطاقتين (مثلاً 8.4): البطاقة الحالية نص شفافة، واللي قبلها باقية
  // قدّامها وتلقط الضغطة، والرقم المعروض ما يطابق البطاقة الواضحة
  // نقرة عجلة واحدة (~0.35 بطاقة) كانت ترجع لنفس البطاقة بالتقريب —
  // أي حركة واضحة من البطاقة الثابتة تنقل بطاقة وحدة على الأقل
  let snapTimer = null;
  let rest = 0;
  function snap() {
    clearTimeout(snapTimer);
    snapTimer = null;
    let t = Math.round(target);
    if (t === rest && Math.abs(target - rest) > 0.15) t += Math.sign(target - rest);
    go(t, true);

  }

  function go(t, fromSnap) {
    target = Math.max(0, Math.min(N - 1, t));
    if (Number.isInteger(target)) rest = target;
    hint.classList.add('gone');
    if (!fromSnap && !drag?.moved) {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snap, 160);
    }
    if (!frame) frame = requestAnimationFrame(step);
  }

  window.addEventListener('wheel', (e) => {
    if (document.body.classList.contains('view-index') || !lightbox.hidden) return;
    e.preventDefault();
    // الملصق يتبع المؤشر — مع العجلة تتحرك البطاقات من تحته فنخفيه
    hovered = -1;
    label.classList.remove('show');
    go(target + e.deltaY * 0.0035);
  }, { passive: false });

  // سحب باللمس أو الماوس — وضغطة بلا سحب تفتح الفيديو
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, start: target, moved: false, id: e.pointerId };
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) {
        drag.moved = true;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('dragging');
      }
      if (drag.moved) go(drag.start + (dy + dx) / 120);
    }
    // ملصق اسم العمل عند مرور الماوس (Avara)
    if (e.pointerType === 'mouse' && !drag?.moved) {
      const card = e.target.closest('.stack-card');
      const i = card ? cards.indexOf(card) : -1;
      if (i !== hovered) {
        hovered = i;
        if (!frame) render();
      }
      label.classList.toggle('show', i !== -1);
      if (card) {
        label.textContent = card.dataset.title;
        // left/top تنضرب بتكبير fit.js، والمؤشر بكسل الشاشة — نقسم عليه
        const zoom = parseFloat(document.documentElement.style.zoom) || 1;
        label.style.left = `${e.clientX / zoom}px`;
        label.style.top = `${e.clientY / zoom}px`;
      }
    }
  });
  const endDrag = () => {
    if (drag?.moved) {
      stage.classList.remove('dragging');
      snap();
    }
    setTimeout(() => (drag = null), 0);
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => {
    hovered = -1;
    label.classList.remove('show');
    if (!frame) render();
  });

  cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (drag?.moved) return e.preventDefault();
      if (card.href) return; // بطاقة هكوله رابط لصفحة قصته
      openLightbox(i);
    });
    // التنقل بـTab يجيب البطاقة للمقدمة
    card.addEventListener('focus', () => go(i));
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.hidden || document.body.classList.contains('view-index')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') go(Math.round(target) + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') go(Math.round(target) - 1);
    else return;
    e.preventDefault();
  });

  // ===== مشغّل الفيديو =====
  const lightbox = document.getElementById('lightbox');
  const lbFrame = document.getElementById('lightboxFrame');
  let lastFocus = null;
  // الخلفية كلها inert والمشغّل مفتوح — Tab يبقى داخل المشغّل
  function setInert(on) {
    for (let n = lightbox; n !== document.body; n = n.parentElement) {
      for (const sib of n.parentElement.children) if (sib !== n) sib.inert = on;
    }
  }
  function openLightbox(i) {
    const card = cards[i];
    lastFocus = document.activeElement;
    lbFrame.src = `https://www.youtube-nocookie.com/embed/${card.dataset.youtube}?autoplay=1&rel=0`;
    lbFrame.title = card.dataset.title;
    document.getElementById('lightboxTitle').textContent = card.dataset.title;
    document.getElementById('lightboxDesc').textContent = card.dataset.desc;
    lightbox.hidden = false;
    setInert(true);
    document.getElementById('lightboxClose').focus();
    playSound('open');
  }
  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    setInert(false);
    lbFrame.src = 'about:blank';
    playSound('close');
    lastFocus?.focus({ preventScroll: true });
  }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // ===== عرض الرصّة / القائمة (OVERVIEW / INDEX) =====
  const index = document.getElementById('stackIndex');
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toIndex = btn.dataset.view === 'index';
      document.body.classList.toggle('view-index', toIndex);
      index.hidden = !toIndex;
      document.querySelectorAll('.view-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      playSound('tap');
    });
  });
  index.querySelectorAll('a[data-index]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      openLightbox(Number(a.dataset.index));
    });
  });

  window.addEventListener('resize', () => {
    L = layout();
    render();
  });

  render();
  updateCaption();
}

// ===== صفحة قصة هكوله: موسيقى + أصوات تتبع القراءة =====
function initStoryPage() {
  const story = document.querySelector('.story');
  if (!story) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // الموسيقى: تشتغل تلقائياً فقط لمن فعّل الأصوات أو اختارها صراحة من قبل.
  // المتصفح يمنع الصوت قبل أول تفاعل، فنكمّلها مع أول ضغطة/مفتاح
  const btn = document.querySelector('.music-toggle');
  let on;
  try {
    const v = localStorage.getItem(MUSIC_KEY);
    on = v ? v === 'on' : isSoundEnabled();
  } catch {
    on = false;
  }
  function setBtn() {
    btn.setAttribute('aria-pressed', String(on));
    const label = on ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
  function play() {
    const ctx = getAudio();
    if (!music) music = createMusic(ctx);
    music.start();
  }
  setBtn();
  if (on) {
    play();
    const unlock = () => on && getAudio();
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { once: true, capture: true }));
  }
  btn.addEventListener('click', () => {
    on = !on;
    try {
      localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off');
    } catch {
      /* وضع خاص — يشتغل لهالزيارة بس */
    }
    setBtn();
    if (on) play();
    else music?.stop();
  });
  // الكتم العام يطفي الموسيقى ويحفظها طافية — وإلا ترجع تشتغل مع إعادة التحميل
  onGlobalMute = () => {
    on = false;
    try {
      localStorage.setItem(MUSIC_KEY, 'off');
    } catch {
      /* وضع خاص */
    }
    setBtn();
    music?.stop();
  };
  // ===== منزلق مستوى الموسيقى (مثل الجوال): سحب نسبي باللمس/الماوس، ضغطة
  // تقفز للنقطة، عجلة، وأسهم. نقرة بنغمة تعلى + اهتزاز خفيف عند كل 10٪،
  // ومطّ مطاطي لو سحبت بعد الحد ثم يرجع بنابض =====
  const dock = document.getElementById('musicDock');
  const wrap = dock.querySelector('.vol-wrap');
  const vol = document.getElementById('musicVol');
  const tip = dock.querySelector('.vol-tip');
  const volIcon = vol.querySelector('.vol-icon');
  const fold = dock.querySelector('.dock-fold');
  try {
    const saved = parseFloat(localStorage.getItem(MUSIC_LEVEL_KEY));
    if (saved >= 0 && saved <= 1) musicLevel = saved;
  } catch {
    /* تخزين ممنوع — نبدأ بالافتراضي */
  }
  let lastStep = Math.round(musicLevel * 10);
  function setLevel(v, feedback) {
    musicLevel = Math.max(0, Math.min(1, v));
    const pct = Math.round(musicLevel * 100);
    wrap.style.setProperty('--v', musicLevel);
    vol.classList.toggle('low', musicLevel < 0.22);
    vol.setAttribute('aria-valuenow', pct);
    tip.textContent = pct;
    volIcon.innerHTML = ICONS[musicLevel === 0 ? 'volume-off' : musicLevel < 0.5 ? 'volume-down' : 'volume-up'];
    music?.setLevel(musicLevel);
    const stepNow = Math.round(musicLevel * 10);
    if (feedback && stepNow !== lastStep) {
      playSound('level', musicLevel);
      navigator.vibrate?.(6);
    }
    lastStep = stepNow;
  }
  function commit() {
    try {
      localStorage.setItem(MUSIC_LEVEL_KEY, String(musicLevel));
    } catch {
      /* وضع خاص */
    }
    // رفع الصوت والموسيقى طافية = يبغاها تشتغل
    if (musicLevel > 0 && !on) btn.click();
  }
  setLevel(musicLevel, false);

  let slide = null;
  vol.addEventListener('pointerdown', (e) => {
    vol.setPointerCapture(e.pointerId);
    slide = { y: e.clientY, start: musicLevel, h: vol.getBoundingClientRect().height, moved: false };
    vol.classList.add('dragging');
    wrap.classList.add('show-tip');
  });
  vol.addEventListener('pointermove', (e) => {
    if (!slide) return;
    const dy = slide.y - e.clientY;
    if (!slide.moved && Math.abs(dy) < 4) return;
    slide.moved = true;
    const raw = slide.start + dy / slide.h;
    setLevel(raw, true);
    // مطّ مطاطي بعد الحد: يتناقص كلما سحبت أكثر (نفس إحساس الجوال)
    const over = raw > 1 ? raw - 1 : raw < 0 ? -raw : 0;
    const stretch = 0.1 * (1 - Math.exp(-over * 4));
    vol.style.transformOrigin = raw > 1 ? '50% 100%' : '50% 0%';
    vol.style.transform = over ? `scale(${1 - stretch * 0.4}, ${1 + stretch})` : '';
  });
  const endSlide = (e) => {
    if (!slide) return;
    if (!slide.moved && e.type === 'pointerup') {
      const r = vol.getBoundingClientRect();
      setLevel(1 - (e.clientY - r.top) / r.height, true);
    }
    slide = null;
    vol.classList.remove('dragging');
    vol.style.transform = '';
    setTimeout(() => wrap.classList.remove('show-tip'), 500);
    commit();
  };
  vol.addEventListener('pointerup', endSlide);
  vol.addEventListener('pointercancel', endSlide);
  vol.addEventListener('keydown', (e) => {
    const k = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.1, PageDown: -0.1 }[e.key];
    if (k === undefined && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setLevel(e.key === 'Home' ? 0 : e.key === 'End' ? 1 : musicLevel + k, true);
    commit();
  });
  vol.addEventListener('wheel', (e) => {
    e.preventDefault();
    setLevel(musicLevel - e.deltaY * 0.001, true);
    commit();
  }, { passive: false });

  // الطي: بالجوال مطوية افتراضياً عشان ما تغطي النص
  const FOLD_KEY = 'mfv_music_dock';
  let folded;
  try {
    const f = localStorage.getItem(FOLD_KEY);
    folded = f ? f === 'folded' : window.innerWidth <= 700;
  } catch {
    folded = window.innerWidth <= 700;
  }
  function setFold(f) {
    folded = f;
    dock.classList.toggle('folded', f);
    wrap.inert = f;
    fold.setAttribute('aria-expanded', String(!f));
    const label = f ? 'إظهار التحكم بالصوت' : 'طي التحكم بالصوت';
    fold.setAttribute('aria-label', label);
    fold.title = label;
  }
  setFold(folded);
  fold.addEventListener('click', () => {
    setFold(!folded);
    try {
      localStorage.setItem(FOLD_KEY, folded ? 'folded' : 'open');
    } catch {
      /* وضع خاص */
    }
    playSound(folded ? 'close' : 'open');
  });

  // setInterval يتباطأ بالتبويب المخفي فتتأخر الأوتار — نوقف ونكمّل
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music?.stop();
    else if (on) play();
  });

  // نغمة صاعدة مع كل عنوان/صورة يدخل الشاشة — القراءة تصير "لحن"
  let noteIndex = 0;
  const once = (els, fn, threshold = 0.4) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        fn(en.target);
      });
    }, { threshold });
    els.forEach((el) => io.observe(el));
  };
  once(story.querySelectorAll('h2, .story-shot:not(.story-shot-hero)'), () => playSound('note', noteIndex++));

  // الأرقام تعدّ من صفر مع نقرات، وتنتهي بنغمة نجاح
  const stats = story.querySelector('.story-stats');
  const dts = [...stats.querySelectorAll('dt')].map((dt) => {
    const m = dt.textContent.match(/^(\D*)(\d+)$/);
    return { dt, prefix: m[1], value: Number(m[2]) };
  });
  if (!reduceMotion) {
    dts.forEach((d) => (d.dt.textContent = d.prefix + '0'));
    once([stats], () => {
      const t0 = performance.now();
      let lastTick = 0;
      (function frame(now) {
        const p = Math.min(1, (now - t0) / 1400);
        const eased = 1 - Math.pow(1 - p, 3);
        dts.forEach((d) => (d.dt.textContent = d.prefix + Math.round(d.value * eased)));
        if (now - lastTick > 70 && p < 1) {
          lastTick = now;
          playSound('tick');
        }
        if (p < 1) requestAnimationFrame(frame);
        else playSound('success');
      })(t0);
    });
  }

  // الخط الزمني: النقاط تضيء وحدة وحدة مع سلّم صاعد
  const timeline = story.querySelector('.timeline');
  if (!reduceMotion) {
    timeline.classList.add('anim');
    once([timeline], () => {
      timeline.querySelectorAll('li').forEach((li, i) =>
        setTimeout(() => {
          li.classList.add('lit');
          playSound('note', i);
        }, i * 110)
      );
    }, 0.2);
  }

  // بطاقات التقنيات: نغمة مختلفة لكل بطاقة عند مرور الماوس
  story.querySelectorAll('.tip-card').forEach((card, i) =>
    card.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && playSound('note', i))
  );
  story.querySelectorAll('.btn-hakolah').forEach((b) => b.addEventListener('click', () => playSound('hakolah')));
}

// ===== Lazy Loading للفيديوهات =====
function initLazyVideos() {
  const videoBlocks = document.querySelectorAll('.video-block');
  
  // إنشاء Intersection Observer
  const videoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const iframe = entry.target.querySelector('iframe[data-src]');
        if (iframe) {
          // تحميل الفيديو
          iframe.src = iframe.dataset.src;
          iframe.removeAttribute('data-src');
          observer.unobserve(entry.target);
        }
      }
    });
  }, {
    rootMargin: '50px' // تحميل الفيديو قبل 50px من ظهوره
  });
  
  // مراقبة جميع عناصر الفيديو
  videoBlocks.forEach(block => {
    videoObserver.observe(block);
  });
}

// ===== فلترة المشاريع =====
function filterProjects(category) {
  const projectCards = document.querySelectorAll('.project-card');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // تحديث الأزرار
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === category) {
      btn.classList.add('active');
    }
  });
  
  // فلترة المشاريع
  projectCards.forEach(card => {
    const cardCategory = card.dataset.category;
    
    if (category === 'all' || cardCategory === category) {
      card.style.display = 'block';
      // إضافة رسم متحرك عند الظهور — ثم نشيل القيم المضمّنة، وإلا تلغي
      // حركة الارتفاع عند مرور الماوس (:hover) المكتوبة بملف CSS
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, 10);
      setTimeout(() => {
        card.style.opacity = '';
        card.style.transform = '';
      }, 400);
    } else {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8)';
      setTimeout(() => {
        card.style.display = 'none';
      }, 300);
    }
  });
}

// ===== فلترة وبحث الموارد (تعمل معاً: فلتر المنصة + خانة البحث التقريبي) =====
let currentPlatformFilter = 'all';
let currentResourceSearch = '';

// توحيد الحروف العربية المتشابهة (همزات، تاء مربوطة، ياء/ألف مقصورة) وحذف التشكيل،
// عشان البحث يتساهل مع اختلاف طريقة الكتابة
function normalizeSearchText(str) {
  return str
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // إزالة التشكيل والتطويل
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // إزالة الرموز والفواصل
    .replace(/\s+/g, ' ')
    .trim();
}

// حساب مسافة التعديل (Levenshtein) بين كلمتين، لقياس مدى تقارب كتابتهما
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);
  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,
        currRow[j - 1] + 1,
        prevRow[j - 1] + cost
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}

// أقصى عدد أخطاء إملائية مسموح به حسب طول الكلمة (كلمة قصيرة = تسامح أقل)
function fuzzyThreshold(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

function wordRoughlyMatches(queryWord, targetWord) {
  if (!queryWord || !targetWord) return false;
  if (targetWord.includes(queryWord) || queryWord.includes(targetWord)) return true;
  return levenshteinDistance(queryWord, targetWord) <= fuzzyThreshold(queryWord.length);
}

// يتحقق أن كل كلمة كتبها الزائر تقابلها كلمة قريبة (ولو فيها خطأ إملائي بسيط) في محتوى البطاقة
function cardMatchesSearch(cardText, rawQuery) {
  if (!rawQuery) return true;

  const targetWords = normalizeSearchText(cardText).split(' ').filter(Boolean);
  const queryWords = normalizeSearchText(rawQuery).split(' ').filter(Boolean);
  if (queryWords.length === 0) return true;

  return queryWords.every(qw => targetWords.some(tw => wordRoughlyMatches(qw, tw)));
}

// طي الأقسام الطويلة: الصفحة كانت ~17,500px على الجوال. كل قسم يعرض أول
// عدد من البطاقات مع زر "عرض الكل" — والطي يتعطل وقت البحث أو فلتر المنصة
// عشان ما تنخفي نتيجة مطابقة خلف الزر
const expandedResourceSections = new Set();
const mobileResourcesQuery = window.matchMedia('(max-width: 768px)');

function resourceCollapseLimit() {
  return mobileResourcesQuery.matches ? 3 : 6;
}

function applyResourceFilters() {
  const grids = document.querySelectorAll('.resources-grid');
  const filtering = currentResourceSearch !== '' || currentPlatformFilter !== 'all';
  const limit = resourceCollapseLimit();

  grids.forEach(grid => {
    const section = grid.closest('.resource-section');
    const expanded = filtering || (section && expandedResourceSections.has(section.id));
    let matched = 0;

    Array.from(grid.children).forEach(card => {
      const matchesSearch = cardMatchesSearch(card.textContent, currentResourceSearch);

      const cardPlatform = card.dataset.platform;
      const matchesPlatform = !cardPlatform || currentPlatformFilter === 'all' || cardPlatform === currentPlatformFilter;

      const visible = matchesSearch && matchesPlatform;
      if (visible) matched++;
      card.style.display = visible && (expanded || matched <= limit) ? '' : 'none';
    });

    if (section) {
      section.style.display = matched ? '' : 'none';
    }

    const moreBtn = grid.nextElementSibling;
    if (moreBtn && moreBtn.classList.contains('resource-more-btn')) {
      moreBtn.hidden = filtering || matched <= limit;
      moreBtn.textContent = expanded ? 'عرض أقل' : `عرض الكل (${matched})`;
      moreBtn.setAttribute('aria-expanded', String(Boolean(expanded)));
    }
  });
}

function initResourceCollapse() {
  const grids = document.querySelectorAll('.resources-grid');
  if (!grids.length) return;
  grids.forEach(grid => {
    const section = grid.closest('.resource-section');
    if (!section || grid.children.length <= 3) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'resource-more-btn';
    btn.setAttribute('aria-controls', section.id);
    btn.addEventListener('click', () => {
      const opening = !expandedResourceSections.has(section.id);
      if (opening) expandedResourceSections.add(section.id);
      else expandedResourceSections.delete(section.id);
      applyResourceFilters();
      playSound(opening ? 'open' : 'close');
      // عند الطي نرجع لعنوان القسم — وإلا يبقى الزائر بمكان فاضي تحت
      if (!opening) section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    grid.after(btn);
  });
  applyResourceFilters();
  mobileResourcesQuery.addEventListener('change', applyResourceFilters);
}

function filterCreators(platform) {
  currentPlatformFilter = platform;

  const buttons = document.querySelectorAll('.platform-filter-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platformFilter === platform);
  });

  applyResourceFilters();
}

function searchResources(query) {
  currentResourceSearch = query.trim();
  applyResourceFilters();
}

// ===== القائمة المنسدلة لنتائج البحث (تظهر تحت خانة البحث مباشرة) =====
const MAX_SEARCH_DROPDOWN_RESULTS = 30;

function updateSearchDropdown(query) {
  const resultsBox = document.getElementById('resourceSearchResults');
  if (!resultsBox) return;

  const trimmed = query.trim();
  resultsBox.innerHTML = '';

  if (!trimmed) {
    resultsBox.hidden = true;
    return;
  }

  const links = document.querySelectorAll('a.resource-card');
  const matches = [];
  links.forEach(link => {
    if (cardMatchesSearch(link.textContent, trimmed)) {
      const titleEl = link.querySelector('h3');
      const iconEl = link.querySelector('.resource-card-icon');
      matches.push({
        title: titleEl ? titleEl.textContent.trim() : link.textContent.trim(),
        icon: iconEl ? iconEl.textContent.trim() : '🔗',
        href: link.getAttribute('href')
      });
    }
  });

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'resource-search-empty';
    empty.textContent = '😕 لا يوجد — ما لقيت أي نتيجة مطابقة، جرّب كلمة أخرى';
    resultsBox.appendChild(empty);
  } else {
    matches.slice(0, MAX_SEARCH_DROPDOWN_RESULTS).forEach(m => {
      const item = document.createElement('a');
      item.className = 'resource-search-result-item';
      item.href = m.href;
      item.target = '_blank';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'resource-search-result-icon';
      iconSpan.textContent = m.icon;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = m.title;

      item.appendChild(iconSpan);
      item.appendChild(titleSpan);
      resultsBox.appendChild(item);
    });

    if (matches.length > MAX_SEARCH_DROPDOWN_RESULTS) {
      const more = document.createElement('div');
      more.className = 'resource-search-more';
      more.textContent = `+ ${matches.length - MAX_SEARCH_DROPDOWN_RESULTS} نتيجة أخرى مطابقة`;
      resultsBox.appendChild(more);
    }
  }

  resultsBox.hidden = false;
}

// ===== معالجة نموذج التواصل =====
async function handleContactForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const formMessage = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnLoading = document.getElementById('btnLoading');
  
  // التحقق من صحة الحقول
  if (!validateContactForm(form)) {
    return false;
  }
  
  // إظهار حالة التحميل
  if (submitBtn) {
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';
  }
  
  // إخفاء أي رسالة سابقة
  if (formMessage) {
    formMessage.style.display = 'none';
  }
  
  try {
    const formData = new FormData(form);
    
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      // نجاح الإرسال
      showFormMessage('success', '✅ تم إرسال رسالتك بنجاح! سأرد عليك في أقرب وقت ممكن.');
      form.reset();
    } else {
      // فشل الإرسال
      showFormMessage('error', '❌ عذراً، حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى أو التواصل عبر البريد الإلكتروني مباشرة.');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    showFormMessage('error', '❌ عذراً، حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
  } finally {
    // إعادة تفعيل الزر
    if (submitBtn) {
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
    }
  }
  
  return false;
}

// ===== التحقق من صحة نموذج التواصل =====
function validateContactForm(form) {
  const name = form.querySelector('[name="name"]');
  const email = form.querySelector('[name="email"]');
  const message = form.querySelector('[name="message"]');
  
  // التحقق من الاسم
  if (name && name.value.trim().length < 2) {
    showFormMessage('error', '❌ يرجى إدخال اسم صحيح (على الأقل حرفين).');
    name.focus();
    return false;
  }
  
  // التحقق من البريد الإلكتروني
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email.value.trim())) {
    showFormMessage('error', '❌ يرجى إدخال بريد إلكتروني صحيح.');
    email.focus();
    return false;
  }
  
  // التحقق من الرسالة
  if (message && message.value.trim().length < 10) {
    showFormMessage('error', '❌ يرجى كتابة رسالة أطول (على الأقل 10 أحرف).');
    message.focus();
    return false;
  }
  
  return true;
}

// ===== عرض رسائل النموذج =====
function showFormMessage(type, message) {
  const formMessage = document.getElementById('formMessage');
  if (!formMessage) return;
  
  formMessage.textContent = message;
  formMessage.style.display = 'block';
  playSound(type === 'success' ? 'success' : 'off');
  
  if (type === 'success') {
    formMessage.style.background = 'rgba(16, 185, 129, 0.1)';
    formMessage.style.border = '1px solid #10b981';
    formMessage.style.color = '#10b981';
  } else {
    formMessage.style.background = 'rgba(239, 68, 68, 0.1)';
    formMessage.style.border = '1px solid #ef4444';
    formMessage.style.color = '#ef4444';
  }
  
  // التمرير إلى الرسالة
  formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // إخفاء رسالة النجاح تلقائياً بعد 10 ثواني
  if (type === 'success') {
    setTimeout(() => {
      formMessage.style.display = 'none';
    }, 10000);
  }
}

// ===== دخول البطاقات عند التمرير (نفس حركة بطاقات هكوله) =====
// كل بطاقة تبدأ مخفية، أكبر قليلاً ومزاحة للخارج حسب عمودها (يمين/يسار/تحت)،
// وأول ما يوصلها التمرير تنزلق لمكانها. بكلاسات لا قيم مضمّنة — الكود القديم
// كان يحط transform مضمّن على البطاقات فيلغي حركة المرور (:hover) بالكامل
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = [...document.querySelectorAll('.project-card, .skill-card, .service-card, .resource-card, .tip-card')];
  if (!cards.length) return;

  cards.forEach((card) => {
    const grid = card.parentElement.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (grid.left + grid.width / 2);
    card.style.setProperty('--fx', `${Math.max(-220, Math.min(220, dx * 0.6))}px`);
    card.classList.add('fly-pending');
  });

  // المراقبة على البطاقة وهي مزاحة لتحت، فالهامش السفلي يعوّض الإزاحة —
  // وإلا بطاقات أسفل الشاشة تبقى مخفية وقت فتح الصفحة
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      observer.unobserve(target);
      target.classList.remove('fly-pending');
      target.classList.add('card-in');
    });
  }, { rootMargin: '0px 0px 200px 0px' });

  cards.forEach((card) => {
    observer.observe(card);
    card.addEventListener('transitionend', function done(e) {
      if (e.target !== card || e.propertyName !== 'transform') return;
      card.classList.remove('card-in');
      card.removeEventListener('transitionend', done);
    });
  });
}

// ===== Lazy Loading للصور =====
function initLazyImages() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('loading' in HTMLImageElement.prototype) {
    // المتصفح يدعم lazy loading مباشرة
    images.forEach(img => {
      img.src = img.dataset.src || img.src;
      img.classList.add('loaded');
    });
  } else {
    // استخدام Intersection Observer للمتصفحات القديمة
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// ===== طي/فتح تنويه الروابط الخارجية على الهاتف =====
function initDisclaimerToggle() {
  const toggle = document.getElementById('disclaimerToggle');
  const body = document.getElementById('disclaimerBody');
  if (!toggle || !body) return;

  toggle.addEventListener('click', () => {
    const expanded = body.classList.toggle('expanded');
    toggle.textContent = expanded ? 'اقرأ أقل ▴' : 'اقرأ المزيد ▾';
    toggle.setAttribute('aria-expanded', String(expanded));
    playSound(expanded ? 'open' : 'close');
  });
}

// ===== زر العودة للأعلى =====
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');
  
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollBtn.style.display = 'flex';
      } else {
        scrollBtn.style.display = 'none';
      }
    });
    
    scrollBtn.addEventListener('click', () => {
      playSound('tap');
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// ===== تحميل الصفحة السلس =====
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

// ===== تهيئة جميع الوظائف عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  initSoundToggle();
  initNavToggle();

  initWorkStack();
  initStoryPage();

  // تفعيل Lazy Loading للفيديوهات
  initLazyVideos();
  
  // تفعيل Lazy Loading للصور
  initLazyImages();
  
  // تفعيل تأثيرات التمرير
  initScrollAnimations();
  
  // تفعيل زر العودة للأعلى
  initScrollToTop();

  // تفعيل طي/فتح تنويه الروابط الخارجية
  initDisclaimerToggle();

  // طي أقسام صفحة الموارد الطويلة
  initResourceCollapse();
  
  // معالجة نموذج التواصل
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }
  
  // تهيئة أزرار الفلترة
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterProjects(btn.dataset.filter);
      playSound('tap');
    });
  });

  // تهيئة أزرار فلترة صناع المحتوى
  const platformButtons = document.querySelectorAll('.platform-filter-btn');
  platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterCreators(btn.dataset.platformFilter);
      playSound('tap');
    });
  });

  // تهيئة خانة بحث الموارد (مع تأخير بسيط لتحسين الأداء عند زيادة عدد الموارد)
  const resourceSearchInput = document.getElementById('resourceSearchInput');
  if (resourceSearchInput) {
    let searchDebounceTimer;
    resourceSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchResources(resourceSearchInput.value);
        updateSearchDropdown(resourceSearchInput.value);
      }, 150);
    });

    // إعادة إظهار القائمة عند الرجوع للخانة إذا فيها نص
    resourceSearchInput.addEventListener('focus', () => {
      if (resourceSearchInput.value.trim()) {
        updateSearchDropdown(resourceSearchInput.value);
      }
    });

    // إخفاء القائمة عند الضغط خارجها
    document.addEventListener('click', (event) => {
      const wrap = resourceSearchInput.closest('.resource-search-wrap');
      const resultsBox = document.getElementById('resourceSearchResults');
      if (wrap && resultsBox && !wrap.contains(event.target)) {
        resultsBox.hidden = true;
      }
    });
  }
});

// ===== معالجة الأخطاء العامة =====
window.addEventListener('error', function(event) {
  console.error('حدث خطأ:', event.error);
});

// ===== منع النقر بالزر الأيمن على الصور (اختياري) =====
// يمكن إلغاء التعليق إذا كنت تريد حماية الصور
/*
document.addEventListener('contextmenu', function(event) {
  if (event.target.tagName === 'IMG') {
    event.preventDefault();
    return false;
  }
});
*/

// ===== تصدير الوظائف للاستخدام العام =====
window.portfolioFunctions = {
  filterProjects,
  filterCreators,
  searchResources,
  updateSearchDropdown,
  handleContactForm,
  validateContactForm,
  showFormMessage
};