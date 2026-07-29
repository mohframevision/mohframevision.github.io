/* =====================================
   Mohamed Frame Vision Portfolio
   ملف JavaScript الرئيسي
   ===================================== */

// ===== إدارة النافذة المنبثقة =====
function openModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "flex";
    // منع التمرير عند فتح النافذة المنبثقة
    document.body.style.overflow = "hidden";
  }
}

function closeModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "none";
    // إعادة تفعيل التمرير
    document.body.style.overflow = "auto";
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

// ===== تفعيل الرابط النشط في شريط التنقل =====
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav a');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const linkHref = link.getAttribute('href');
    
    if (linkHref === currentPage || 
        (currentPage === '' && linkHref === 'index.html')) {
      link.classList.add('active');
    }
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
      // إضافة رسم متحرك عند الظهور
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, 10);
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

function applyResourceFilters() {
  const grids = document.querySelectorAll('.resources-grid');

  grids.forEach(grid => {
    let anyVisible = false;

    Array.from(grid.children).forEach(card => {
      const matchesSearch = cardMatchesSearch(card.textContent, currentResourceSearch);

      const cardPlatform = card.dataset.platform;
      const matchesPlatform = !cardPlatform || currentPlatformFilter === 'all' || cardPlatform === currentPlatformFilter;

      const visible = matchesSearch && matchesPlatform;
      card.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    const section = grid.closest('.resource-section');
    if (section) {
      section.style.display = anyVisible ? '' : 'none';
    }
  });
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

// ===== تأثيرات التمرير =====
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // مراقبة جميع الأقسام
  const sections = document.querySelectorAll('.section, .project-card, .skill-card, .service-card');
  sections.forEach(section => {
    observer.observe(section);
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

// ===== زر العودة للأعلى =====
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');
  
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollBtn.style.display = 'block';
      } else {
        scrollBtn.style.display = 'none';
      }
    });
    
    scrollBtn.addEventListener('click', () => {
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
  // تفعيل الرابط النشط
  setActiveNavLink();
  
  // تفعيل Lazy Loading للفيديوهات
  initLazyVideos();
  
  // تفعيل Lazy Loading للصور
  initLazyImages();
  
  // تفعيل تأثيرات التمرير
  initScrollAnimations();
  
  // تفعيل زر العودة للأعلى
  initScrollToTop();
  
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
    });
  });

  // تهيئة أزرار فلترة صناع المحتوى
  const platformButtons = document.querySelectorAll('.platform-filter-btn');
  platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterCreators(btn.dataset.platformFilter);
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