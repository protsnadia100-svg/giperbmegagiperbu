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

  // --- 2. ЛОГІКА ДЛЯ ВКЛАДОК (TABS) ---
  // (Цей код потрібен для theory_math.html, але не завадить тут)
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
      button.addEventListener('click', () => {
          const type = button.dataset.type;
          
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          tabContents.forEach(content => {
              const contentId = `theory-${type}`; 
              content.classList.toggle('active', content.id === contentId);
          });

          if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
            const el = document.getElementById(`theory-${type}`);
            if (el) {
                MathJax.typesetPromise([el]).catch((err) => console.log('MathJax re-render failed:', err));
            }
          }
      });
  });
  
  // --- 3. КОНФІГУРАЦІЯ MATHJAX (ЯКЩО ВОНА ТУТ ПОТРІБНА) ---
  // (Цей код здебільшого для theory_math.html)
  if (window.MathJax && !window.MathJax.startup) {
      // Якщо конфігурація ще не завантажена
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']]
        },
        startup: {
          ready: () => {
            console.log('MathJax is ready.');
            MathJax.startup.defaultPageReady();
          }
        }
      };
  } else if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      // Якщо MathJax вже тут, просто запускаємо
      MathJax.typesetPromise();
  }


  // === 4. НОВА ЛОГІКА: ВИМКНЕННЯ МУЗИКИ ПРИ СТАРТІ ВІДЕО ===
  
  const audio = document.getElementById('background-music');
  // Шукаємо всі відео з класом .story-video
  const videos = document.querySelectorAll('.story-video'); 

  if (audio && videos.length > 0) {
    
    videos.forEach(video => {
      // Додаємо слухача події "play" (коли користувач натискає "плей")
      video.addEventListener('play', () => {
        // Якщо аудіо не на паузі, ставимо його на паузу
        if (!audio.paused) {
          audio.pause();
        }
      });

      /*
      // --- ОПЦІОНАЛЬНО ---
      // Якщо ви хочете, щоб музика ВІДНОВИЛАСЬ,
      // коли відео зупинили або воно закінчилось,
      // розкоментуйте (приберіть //) цей код:

      video.addEventListener('pause', () => {
        if (audio.paused) {
           audio.play().catch(e => console.log("Music resume failed"));
        }
      });
      
      video.addEventListener('ended', () => {
         if (audio.paused) {
           audio.play().catch(e => console.log("Music resume failed"));
        }
      });
      */

    });
  }
  
});
