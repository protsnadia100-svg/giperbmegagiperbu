/* theory.js
    - Handles logic for the theory page(s).
    - Manages theme toggle functionality.
    - NEW: Implements tab switching logic for theory_math.html.
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- Логіка перемикання тем ---
    const t = localStorage.getItem('conics_theme') || 'dark';
    document.body.classList.toggle('theme-light', t === 'light');
    const toggleElems = document.querySelectorAll('#themeToggle, #themeToggle2');
    toggleElems.forEach(el => { 
        if (el) el.checked = t === 'light'; 
        el && el.addEventListener && el.addEventListener('change', () => {
            const isLight = el.checked;
            document.body.classList.toggle('theme-light', isLight);
            localStorage.setItem('conics_theme', isLight ? 'light' : 'dark');
        }); 
    });

    // small fade-in for content (з вашого коду)
    setTimeout(()=> document.body.style.opacity = 1, 60);


    // --- НОВА ЛОГІКА: Перемикання вкладок на сторінці теорії ---
    const tabButtons = document.querySelectorAll('.tab-buttons .tab-btn');
    const tabContents = document.querySelectorAll('.theory-page .tab-content');

    // Якщо є кнопки вкладок, ініціалізуємо логіку
    if (tabButtons.length > 0) {
        
        // 1. Приховуємо весь контент, крім активного
        tabContents.forEach(content => {
            if (!content.classList.contains('active')) {
                content.style.display = 'none';
            }
        });

        // 2. Додаємо обробники подій
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetType = button.dataset.type;
                const targetId = `theory-${targetType}`; 

                // Оновлення кнопок
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Оновлення контенту
                tabContents.forEach(content => {
                    if (content.id === targetId) {
                        content.style.display = 'block';
                        // Можна додати анімацію fadeIn, якщо вона є у стилях
                    } else {
                        content.style.display = 'none';
                    }
                });
            });
        });
        
        // Перевірка URL для стартового відображення (можна опустити, якщо завжди починаємо з Гіперболи)
        // document.querySelector('.tab-btn.active')?.click();
    }
});
