/* =====================================
   Mohamed Frame Vision Portfolio
   ملف JavaScript الرئيسي
   ===================================== */

// ===== مؤثرات صوتية (اختيارية، مطفأة افتراضياً) =====
// نفس مجموعة أصوات هكوله: مولَّدة بالكود بالكامل (Web Audio، بلا ملفات) —
// نغمات منخفضة، بداية ناعمة، نغمة تحتية للدفء، سلّم ري الكبير، وصدى غرفة خفيف
const SOUND_KEY = "mfv_sound_pref";
const NOTE = { D3: 146.83, D4: 293.66, A4: 440, D5: 587.33, "F#5": 739.99, A5: 880, D6: 1174.66 };
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

function noise(ctx, bus, { at = 0, dur = 0.01, freq = 3000, q = 0.8, gain = 0.05, sweepTo = 0 }) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.002, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SOUNDS = {
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
};

function playSound(name) {
  if (!isSoundEnabled()) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  SOUNDS[name](audioCtx, getSfxBus(audioCtx));
}

// أيقونات الأزرار اللي تتغير حالتها وقت التشغيل (نفس مسارات icon.njk)
const ICONS = {
  "menu": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>',
  "close": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>',
  "volume-up": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>',
  "volume-off": '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Zm-80 238v-94l-72-72H200v80h114l86 86Zm-36-130Z"/></svg>',
};

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

// ===== إدارة النافذة المنبثقة =====
function openModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "flex";
    // منع التمرير عند فتح النافذة المنبثقة
    document.body.style.overflow = "hidden";
    playSound("open");
    modal.querySelector(".close-btn")?.focus();
  }
}

function closeModal() {
  const modal = document.getElementById("contactModal");
  if (modal && modal.style.display === "flex") {
    modal.style.display = "none";
    // إعادة تفعيل التمرير
    document.body.style.overflow = "auto";
    playSound("close");
  }
}

// إغلاق النافذة المنبثقة عند النقر خارج المحتوى
window.onclick = function(event) {
  const modal = document.getElementById("contactModal");
  if (event.target === modal) {
    closeModal();
  }
}

// إغلاق النافذة المنبثقة بزر Escape
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});

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

  // زر "تواصل الآن" وزر إغلاق النافذة (كانا onclick مضمّن على عناصر ما
  // تنوصل بلوحة المفاتيح — الحين أزرار حقيقية)
  document.querySelectorAll('[data-open-modal]').forEach((el) => el.addEventListener('click', openModal));
  document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));

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
  openModal,
  closeModal,
  filterProjects,
  filterCreators,
  searchResources,
  updateSearchDropdown,
  handleContactForm,
  validateContactForm,
  showFormMessage
};