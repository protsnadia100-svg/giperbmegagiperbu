document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ЛОГІКА ПЕРЕМИКАННЯ ВКЛАДОК ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

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
            let equationString = '';
            
            try {
                // Збираємо параметри з активної форми
                const params = {};
                const inputs = document.querySelectorAll(`#${activeTab}-form input, #${activeTab}-form select`);
                inputs.forEach(input => {
                    const key = input.id.split('-').pop();
                    params[key] = (input.type === 'number') ? parseFloat(input.value) : input.value;
                });

                // Генеруємо рядок загального рівняння
                if (activeTab === 'ellipse') {
                    if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                    equationString = `(x - ${params.h})^2 / ${params.a**2} + (y - ${params.k})^2 / ${params.b**2} = 1`;
                
                } else if (activeTab === 'hyperbola') {
                    if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                    if (params.orientation === 'vertical') {
                        equationString = `(y - ${params.k})^2 / ${params.a**2} - (x - ${params.h})^2 / ${params.b**2} = 1`;
                    } else {
                        equationString = `(x - ${params.h})^2 / ${params.a**2} - (y - ${params.k})^2 / ${params.b**2} = 1`;
                    }
                
                } else if (activeTab === 'parabola') {
                    if (!params.p) throw new Error("'p' має бути заданий");
                    let p4 = 4 * params.p;
                    if (params.orientation === 'horizontal-left') {
                        p4 = -p4;
                        equationString = `(y - ${params.k})^2 = ${p4} * (x - ${params.h})`;
                    } else if (params.orientation === 'vertical-up') {
                        equationString = `(x - ${params.h})^2 = ${p4} * (y - ${params.k})`;
                    } else if (params.orientation === 'vertical-down') {
                        p4 = -p4;
                        equationString = `(x - ${params.h})^2 = ${p4} * (y - ${params.k})`;
                    } else { // horizontal-right
                        equationString = `(y - ${params.k})^2 = ${p4} * (x - ${params.h})`;
                    }
                }

                // Тепер використовуємо існуючі функції з solver.js та graph.js
                // Перевіряємо, чи вони завантажені (чи є в window)
                if (typeof Solver.parseGeneralEquation === 'function' && 
                    typeof Solver.analyzeGeneral === 'function' &&
                    typeof plotAnalysis === 'function' && 
                    typeof displayAnalysis === 'function') 
                {
                    
                    const parsed = Solver.parseGeneralEquation(equationString);
                    if (!parsed) throw new Error("Не вдалося розібрати згенероване рівняння.");
                    
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
        const waveArray = new Float32Array(CURVE_POINTS);
        for (let i = 0; i < CURVE_POINTS; i++) {
            const t_norm = i / (CURVE_POINTS - 1); // Час від 0 до 1
            const u = 1 + (t_norm * U_RANGE_SCALE) / a;
            const y_diff = b * (u - Math.sqrt(u * u - 1));
            waveArray[i] = MIN_FREQ + (y_diff * FREQ_SCALE);
        }

        // 4. Запускаємо звук
        const now = audioCtx.currentTime;
        oscillator.frequency.setValueCurveAtTime(waveArray, now, DURATION);

        // Плавний початок і кінець
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
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