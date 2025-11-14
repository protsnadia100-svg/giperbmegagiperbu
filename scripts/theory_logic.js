/* theory_logic.js
    - Implements tab switching logic for the theory_math.html page.
*/

document.addEventListener('DOMContentLoaded', () => {
    
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
                        // Можна додати анімацію появи, якщо вона є у стилях (наприклад, через клас)
                    } else {
                        content.style.display = 'none';
                    }
                });
            });
        });
        
        // Переконатися, що при завантаженні відображається лише перша активна вкладка
        // (Це спрацьовує завдяки логіці в пункті 1, але можна форсувати клік)
        document.querySelector('.tab-buttons .tab-btn.active')?.click();
    }
});
