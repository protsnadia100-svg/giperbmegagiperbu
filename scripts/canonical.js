document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ЛОГІКА ПЕРЕМИКАННЯ ВКЛАДОК ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const equationPreviews = {
        'ellipse': `\\( \\frac{(x-h)^2}{a^2} + \\frac{(y-k)^2}{b^2} = 1 \\)`,
        'hyperbola': `\\( \\frac{(x-h)^2}{a^2} - \\frac{(y-k)^2}{b^2} = 1 \\)`,
        'parabola': `\\( (y-k)^2 = 4p(x-h) \\)`
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;

            // Оновлюємо кнопки
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновлюємо контент (форми)
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${type}-form`);
            });

            // Оновлюємо прев'ю рівняння залежно від орієнтації
            if (type === 'hyperbola') {
                const orientationSelect = document.getElementById('hyperbola-orientation');
                updateHyperbolaPreview(orientationSelect.value);
            } else if (type === 'parabola') {
                const orientationSelect = document.getElementById('parabola-orientation');
                updateParabolaPreview(orientationSelect.value);
            }
        });
    });

    // Оновлення прев'ю для гіперболи
    const hypOrientation = document.getElementById('hyperbola-orientation');
    if (hypOrientation) hypOrientation.addEventListener('change', (e) => updateHyperbolaPreview(e.target.value));
    
    function updateHyperbolaPreview(orientation) {
        const previewEl = document.querySelector('#hyperbola-form .equation-preview');
        if (!previewEl) return;
        if (orientation === 'vertical') {
            previewEl.textContent = `\\( \\frac{(y-k)^2}{a^2} - \\frac{(x-h)^2}{b^2} = 1 \\)`;
        } else {
            previewEl.textContent = `\\( \\frac{(x-h)^2}{a^2} - \\frac{(y-k)^2}{b^2} = 1 \\)`;
        }
        if (window.MathJax) MathJax.typesetPromise([previewEl]);
    }

    // Оновлення прев'ю для параболи
    const parOrientation = document.getElementById('parabola-orientation');
    if (parOrientation) parOrientation.addEventListener('change', (e) => updateParabolaPreview(e.target.value));

    function updateParabolaPreview(orientation) {
        const previewEl = document.querySelector('#parabola-form .equation-preview');
        if (!previewEl) return;
        let eq = '';
        switch(orientation) {
            case 'horizontal-left': eq = `(y-k)^2 = -4p(x-h)`; break;
            case 'vertical-up':     eq = `(x-h)^2 = 4p(y-k)`; break;
            case 'vertical-down':   eq = `(x-h)^2 = -4p(y-k)`; break;
            default:                eq = `(y-k)^2 = 4p(x-h)`;
        }
        previewEl.textContent = `\\( ${eq} \\)`;
        if (window.MathJax) MathJax.typesetPromise([previewEl]);
    }


    // --- 2. ЛОГІКА КНОПКИ "ПОБУДУВАТИ" (ВИПРАВЛЕНА) ---
    const buildBtn = document.getElementById('buildBtnCanonical');
    if (buildBtn) {
        buildBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.type;
            
            // Створюємо порожній об'єкт для коефіцієнтів загального рівняння
            let parsed = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
            
            try {
                // Збираємо параметри з активної форми
                const params = {};
                const inputs = document.querySelectorAll(`#${activeTab}-form input, #${activeTab}-form select`);
                inputs.forEach(input => {
                    const key = input.id.split('-').pop();
                    // Переконуємось, що значення полів не порожні перед парсингом
                    const val = input.value;
                    if (val === '') throw new Error(`Параметр '${input.id}' не може бути порожнім.`);
                    params[key] = (input.type === 'number') ? parseFloat(val) : val;
                    if (input.type === 'number' && isNaN(params[key])) {
                         throw new Error(`Некоректне числове значення для '${input.id}'.`);
                    }
                });

                // Генеруємо об'єкт {A, B, C, D, E, F} НАПРЯМУ, минаючи парсинг
                
                if (activeTab === 'ellipse') {
                    if (!params.a || !params.b || params.a <= 0 || params.b <= 0) throw new Error("'a' та 'b' мають бути додатніми числами");
                    const a2 = params.a**2;
                    const b2 = params.b**2;
                    // Рівняння: b^2*(x-h)^2 + a^2*(y-k)^2 = a^2*b^2
                    // b^2*(x^2 - 2hx + h^2) + a^2*(y^2 - 2ky + k^2) - a^2*b^2 = 0
                    // (b^2)x^2 + (a^2)y^2 + (-2*h*b^2)x + (-2*k*a^2)y + (h^2*b^2 + k^2*a^2 - a^2*b^2) = 0
                    parsed.A = b2;
                    parsed.C = a2;
                    parsed.D = -2 * params.h * b2;
                    parsed.E = -2 * params.k * a2;
                    parsed.F = (params.h**2 * b2) + (params.k**2 * a2) - (a2 * b2);
                
                } else if (activeTab === 'hyperbola') {
                    if (!params.a || !params.b || params.a <= 0 || params.b <= 0) throw new Error("'a' та 'b' мають бути додатніми числами");
                    const a2 = params.a**2;
                    const b2 = params.b**2;
                    
                    if (params.orientation === 'vertical') {
                        // Рівняння: (y-k)^2/a^2 - (x-h)^2/b^2 = 1
                        // b^2*(y-k)^2 - a^2*(x-h)^2 = a^2*b^2
                        // b^2*(y^2 - 2ky + k^2) - a^2*(x^2 - 2hx + h^2) - a^2*b^2 = 0
                        // (-a^2)x^2 + (b^2)y^2 + (2*h*a^2)x + (-2*k*b^2)y + (k^2*b^2 - h^2*a^2 - a^2*b^2) = 0
                        parsed.A = -a2;
                        parsed.C = b2;
                        parsed.D = 2 * params.h * a2;
                        parsed.E = -2 * params.k * b2;
                        parsed.F = (params.k**2 * b2) - (params.h**2 * a2) - (a2 * b2);
                    } else { // 'horizontal'
                        // Рівняння: (x-h)^2/a^2 - (y-k)^2/b^2 = 1
                        // b^2*(x-h)^2 - a^2*(y-k)^2 = a^2*b^2
                        // b^2*(x^2 - 2hx + h^2) - a^2*(y^2 - 2ky + k^2) - a^2*b^2 = 0
                        // (b^2)x^2 + (-a^2)y^2 + (-2*h*b^2)x + (2*k*a^2)y + (h^2*b^2 - k^2*a^2 - a^2*b^2) = 0
                        parsed.A = b2;
                        parsed.C = -a2;
                        parsed.D = -2 * params.h * b2;
                        parsed.E = 2 * params.k * a2;
                        parsed.F = (params.h**2 * b2) - (params.k**2 * a2) - (a2 * b2);
                    }
                
                } else if (activeTab === 'parabola') {
                    if (!params.p || params.p === 0) throw new Error("'p' має бути ненульовим числом");
                    let p4 = 4 * params.p;
                    
                    if (params.orientation === 'horizontal-right') {
                        // (y-k)^2 = 4p(x-h)
                        // (y^2 - 2ky + k^2) - 4px + 4ph = 0
                        // (1)y^2 + (-4p)x + (-2k)y + (k^2 + 4ph) = 0
                        parsed.C = 1;
                        parsed.D = -p4;
                        parsed.E = -2 * params.k;
                        parsed.F = (params.k**2) + (p4 * params.h);
                    } else if (params.orientation === 'horizontal-left') {
                        // (y-k)^2 = -4p(x-h)
                        p4 = -p4; // p4 стає від'ємним
                        // (y^2 - 2ky + k^2) + 4px - 4ph = 0
                        // (1)y^2 + (4p)x + (-2k)y + (k^2 - 4ph) = 0
                        parsed.C = 1;
                        parsed.D = -p4; // -(-4p) = 4p
                        parsed.E = -2 * params.k;
                        parsed.F = (params.k**2) + (p4 * params.h); // p4 від'ємне
                    } else if (params.orientation === 'vertical-up') {
                        // (x-h)^2 = 4p(y-k)
                        // (x^2 - 2hx + h^2) - 4py + 4pk = 0
                        // (1)x^2 + (-2h)x + (-4p)y + (h^2 + 4pk) = 0
                        parsed.A = 1;
                        parsed.D = -2 * params.h;
                        parsed.E = -p4;
                        parsed.F = (params.h**2) + (p4 * params.k);
                    } else { // 'vertical-down'
                        // (x-h)^2 = -4p(y-k)
                        p4 = -p4; // p4 стає від'ємним
                        // (x^2 - 2hx + h^2) + 4py - 4pk = 0
                        // (1)x^2 + (-2h)x + (4p)y + (h^2 - 4pk) = 0
                        parsed.A = 1;
                        parsed.D = -2 * params.h;
                        parsed.E = -p4; // -(-4p) = 4p
                        parsed.F = (params.h**2) + (p4 * params.k); // p4 від'ємне
                    }
                }

                // Тепер використовуємо існуючі функції з solver.js та graph.js
                // Перевіряємо, чи вони завантажені
                if (typeof Solver.analyzeGeneral === 'function' && 
                    typeof plotAnalysis === 'function' && // Ця функція в graph.js
                    typeof displayAnalysis === 'function') // Ця функція в graph.js
                {
                    
                    // Ми більше НЕ викликаємо Solver.parseGeneralEquation(equationString)
                    // Ми одразу аналізуємо наш готовий об'єкт 'parsed'
                    
                    const analysis = Solver.analyzeGeneral(parsed);
                    window.lastAnalysis = analysis; // Зберігаємо для інших кнопок

                    // 1. Аналізуємо (для інфо-панелі)
                    displayAnalysis(analysis); // Використовуємо функцію з graph.js
                    document.getElementById('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
                    
                    // 2. Будуємо графік
                    plotAnalysis(analysis); // Використовуємо функцію з graph.js

                } else {
                    // Ця помилка спрацює, якщо solver.js або graph.js не завантажились
                    throw new Error("Необхідні функції (Solver/plotAnalysis/displayAnalysis) не завантажено. Перевірте шляхи до файлів.");
                }

            } catch (error) {
                console.error('Помилка при побудові канонічної кривої:', error);
                // Повідомляємо користувача про помилку, наприклад, про незаповнені поля
                document.getElementById('solveOutput').innerHTML = `<span style="color: #ff6b6b;">Помилка: ${error.message}</span>`;
            }
        });
    }


    // --- 3. ЛОГІКА ДЛЯ СОНІФІКАЦІЇ ГІПЕРБОЛИ ---
    
    // Знаходимо елементи
    const playBtn = document.getElementById('playHyperbolaSound');
    const aInput = document.getElementById('hyperbola-a');
    const bInput = document.getElementById('hyperbola-b');

    // Перевіряємо, чи ми на правильній сторінці
    if (!playBtn || !aInput || !bInput) {
        // Якщо кнопки немає, просто виходимо (це не сторінка canonical.html)
        return;
    }

    // Іконки для кнопки
    const playIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg> Почути асимптоту (за $a$ і $b$)`;
    const stopIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M6 6h12v12H6z"/></svg> Зупинити`;

    // Глобальні змінні для керування аудіо
    let audioCtx;
    let oscillator;
    let gainNode;
    let isPlaying = false;
    let stopTimer; // Таймер для автоматичної зупинки

    // Налаштування звуку
    const DURATION = 4;        // 4 секунди
    const MIN_FREQ = 50;       // Басова нота (Гц)
    const FREQ_SCALE = 300;    // Множник висоти тону
    const U_RANGE_SCALE = 20;  // Як "далеко" ми йдемо по осі X
    const CURVE_POINTS = 100;  // Плавність звуку

    function playHyperbolaSonification() {
        if (isPlaying) {
            stopSonification();
            return;
        }

        // 1. Отримуємо значення A і B з полів вводу
        let a = parseFloat(aInput.value);
        let b = parseFloat(bInput.value);

        // Перевірка на нульові або некоректні значення
        if (!a || a <= 0 || !b || b <= 0) {
            alert("Будь ласка, введіть додатні значення для 'a' та 'b', щоб почути звук.");
            return;
        }
        
        isPlaying = true;
        playBtn.innerHTML = stopIconHTML;

        // 2. Створюємо аудіо-контекст та вузли
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        oscillator.type = 'sine';

        // 3. Генеруємо масив звуку
        // Ми озвучуємо різницю між гіперболою та її асимптотою
        const waveArray = new Float32Array(CURVE_POINTS);
        for (let i = 0; i < CURVE_POINTS; i++) {
            const t_norm = i / (CURVE_POINTS - 1); // Час від 0 до 1
            
            // $u = x/a$. Ми рухаємось від вершини (u=1) вдалину
            // $a$ контролює, як *швидко* падає тон
            const u = 1 + (t_norm * U_RANGE_SCALE) / a;
            
            // $y_diff = b * (u - sqrt(u*u - 1))$
            // Це і є "відстань" до асимптоти. Вона прямує до 0.
            const y_diff = b * (u - Math.sqrt(u * u - 1));
            
            // $b$ контролює початкову висоту тону
            waveArray[i] = MIN_FREQ + (y_diff * FREQ_SCALE);
        }

        // 4. Запускаємо звук
        const now = audioCtx.currentTime;
        oscillator.frequency.setValueCurveAtTime(waveArray, now, DURATION);

        // Плавний початок і кінець
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1); // <-- Виправлена одруківка
        gainNode.gain.setValueAtTime(0.4, now + DURATION - 0.2);
        gainNode.gain.linearRampToValueAtTime(0, now + DURATION);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(now);

        // 5. Плануємо зупинку
        oscillator.stop(now + DURATION);
        stopTimer = setTimeout(stopSonification, DURATION * 1000);
    }

    function stopSonification() {
        if (oscillator) oscillator.stop();
        if (audioCtx) audioCtx.close().catch(console.error);
        if (stopTimer) clearTimeout(stopTimer);
        
        isPlaying = false;
        audioCtx = null;
        oscillator = null;
        gainNode = null;
        playBtn.innerHTML = playIconHTML;
    }

    // Прив'язуємо функцію до кнопки
    playBtn.addEventListener('click', playHyperbolaSonification);
});