document.addEventListener('DOMContentLoaded', ()=>{
  
  // --- 1. ЛОГІКА ПЕРЕМИКАННЯ ТЕМИ ---
  const t = localStorage.getItem('conics_theme') || 'dark';
  document.body.classList.toggle('theme-light', t === 'light');
  const toggleElems = document.querySelectorAll('#themeToggle, #themeToggle2');
  toggleElems.forEach(el => { if (el) el.checked = t === 'light'; el && el.addEventListener && el.addEventListener('change', ()=> {
    const isLight = el.checked;
    document.body.classList.toggle('theme-light', isLight);
    localStorage.setItem('conics_theme', isLight ? 'light' : 'dark');
  }); });

  // small fade-in for content
  setTimeout(()=> document.body.style.opacity = 1, 60);

  // --- 2. НОВА ЛОГІКА ДЛЯ ВКЛАДОК (TABS) ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
      button.addEventListener('click', () => {
          const type = button.dataset.type;
          
          // Оновлення кнопок
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          // Оновлення контенту
          tabContents.forEach(content => {
              // Визначаємо ID контенту (напр., "theory-hyperbola")
              const contentId = `theory-${type}`; 
              content.classList.toggle('active', content.id === contentId);
          });

          // === ОНОВЛЕННЯ: ПЕРЕ-РЕНДЕРИНГ MATHJAX ===
          // Це потрібно, щоб формули відобразились у вкладці, яка щойно стала видимою
          if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([document.getElementById(contentId)]);
          }
      });
  });

  // --- 3. ПЕРВИННИЙ ЗАПУСК MATHJAX ---
  // Запускаємо рендеринг для всієї сторінки при завантаженні
  if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise();
  }

});