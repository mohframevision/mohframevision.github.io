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

// ===== معالجة نموذج التواصل =====
function handleContactForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const name = form.querySelector('[name="name"]').value;
  const email = form.querySelector('[name="email"]').value;
  const message = form.querySelector('[name="message"]').value;
  
  // يمكن هنا إضافة كود لإرسال البيانات إلى الخادم
  // في الوقت الحالي، سنعرض رسالة نجاح
  
  alert('شكراً لتواصلك! سأرد عليك في أقرب وقت ممكن.');
  form.reset();
  
  return false;
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
  handleContactForm
};