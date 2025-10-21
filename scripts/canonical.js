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


    // --- 2. ЛОГІКА КНОПКИ "ПОБУДУВАТИ" (НОВА, ВИПРАВЛЕНА) ---
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

                // --- НОВА ЛОГІКА: Математично розкриваємо дужки ---
                // (x-h)^2 = x^2 - 2hx + h^2
                // (y-k)^2 = y^2 - 2ky + k^2
                // ... і т.д.

                let A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;

                if (activeTab === 'ellipse') {
                    if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                    const a2 = params.a**2, b2 = params.b**2;
                    // b^2(x-h)^2 + a^2(y-k)^2 = a^2*b^2
                    // b^2(x^2 - 2hx + h^2) + a^2(y^2 - 2ky + k^2) - a^2*b^2 = 0
                    // b^2*x^2 - 2b^2*h*x + b^2*h^2 + a^2*y^2 - 2a^2*k*y + a^2*k^2 - a^2*b^2 = 0
                    A = b2;
                    C = a2;
                    D = -2 * b2 * params.h;
                    E = -2 * a2 * params.k;
                    F = b2 * params.h**2 + a2 * params.k**2 - a2 * b2;
                
                } else if (activeTab === 'hyperbola') {
                    if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                    const a2 = params.a**2, b2 = params.b**2;
                    
                    if (params.orientation === 'vertical') {
                        // b^2(y-k)^2 - a^2(x-h)^2 = a^2*b^2
                        // b^2(y^2 - 2ky + k^2) - a^2(x^2 - 2hx + h^2) - a^2*b^2 = 0
                        // b^2*y^2 - 2b^2*k*y + b^2*k^2 - a^2*x^2 + 2a^2*h*x - a^2*h^2 - a^2*b^2 = 0
                        A = -a2;
                        C = b2;
                        D = 2 * a2 * params.h;
                        E = -2 * b2 * params.k;
                        F = b2 * params.k**2 - a2 * params.h**2 - a2 * b2;
                    } else {
                        // b^2(x-h)^2 - a^2(y-k)^2 = a^2*b^2
                        // b^2(x^2 - 2hx + h^2) - a^2(y^2 - 2ky + k^2) - a^2*b^2 = 0
                        // b^2*x^2 - 2b^2*h*x + b^2*h^2 - a^2*y^2 + 2a^2*k*y - a^2*k^2 - a^2*b^2 = 0
                        A = b2;
                        C = -a2;
                        D = -2 * b2 * params.h;
                        E = 2 * a2 * params.k;
                        F = b2 * params.h**2 - a2 * params.k**2 - a2 * b2;
                    }
                
                } else if (activeTab === 'parabola') {
                    if (!params.p) throw new Error("'p' має бути заданий");
                    let p4 = 4 * params.p;
                    // (y-k)^2 = 4p(x-h) -> y^2 - 2ky + k^2 - 4px + 4ph = 0
                    // (x-h)^2 = 4p(y-k) -> x^2 - 2hx + h^2 - 4py + 4pk = 0
                    
                    switch (params.orientation) {
                        case 'horizontal-right': // y^2 - 4px - 2ky + (k^2 + 4ph) = 0
                            C = 1; D = -p4; E = -2 * params.k; F = params.k**2 + p4 * params.h;
                            break;
                        case 'horizontal-left': // (y-k)^2 = -4p(x-h) -> y^2 + 4px - 2ky + (k^2 - 4ph) = 0
                            p4 = -p4;
                            C = 1; D = -p4; E = -2 * params.k; F = params.k**2 + p4 * params.h;
                            break;
                        case 'vertical-up': // x^2 - 2hx + h^2 - 4py + 4pk = 0
                            A = 1; D = -2 * params.h; E = -p4; F = params.h**2 + p4 * params.k;
                            break;
                        case 'vertical-down': // (x-h)^2 = -4p(y-k) -> x^2 - 2hx + h^2 + 4py - 4pk = 0
                            p4 = -p4;
                            A = 1; D = -2 * params.h; E = -p4; F = params.h**2 + p4 * params.k;
                            break;
                    }
                }
                
                // Створюємо рядок загального рівняння, який парсер ТОЧНО зрозуміє
                equationString = `${A}x^2 + ${C}y^2 + ${D}x + ${E}y + ${F} = 0`;

                // --- Кінець нової логіки ---

                // Тепер використовуємо існуючі функції з solver.js та graph.js
                if (typeof Solver.parseGeneralEquation === 'function' && 
                    typeof Solver.analyzeGeneral === 'function' &&
                    typeof plotAnalysis === 'function' && 
                    typeof displayAnalysis === 'function') 
                {
                    
                    const parsed = Solver.parseGeneralEquation(equationString);
                    if (!parsed) throw new Error("Не вдалося розібрати згенероване рівняння.");
                    
                    const analysis = Solver.analyzeGeneral(parsed);
                    window.lastAnalysis = analysis; 

                    displayAnalysis(analysis); // Використовуємо функцію з graph.js
                    document.getElementById('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
                    plotAnalysis(analysis); // Використовуємо функцію з graph.js

                } else {
                    throw new Error("Необхідні функції (Solver/plotAnalysis/displayAnalysis) не завантажено. Перевірте шляхи до файлів.");
                }

            } catch (error) {
                console.error('Помилка при побудові канонічної кривої:', error);
                document.getElementById('solveOutput').innerHTML = `<span style="color: #ff6b6b;">Помилка: ${error.message}</span>`;
            }
        });
    }


    // --- 3. ЛОГІКА ДЛЯ СОНІФІКАЦІЇ ГІПЕРБОЛИ ---
    
    const playBtn = document.getElementById('playHyperbolaSound');
    const aInput = document.getElementById('hyperbola-a');
    const bInput = document.getElementById('hyperbola-b');

    if (!playBtn || !aInput || !bInput) {
        return;
    }

    const playIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg> Почути асимптоту (за $a$ і $b$)`;
    const stopIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M6 6h12v12H6z"/></svg> Зупинити`;

    let audioCtx;
    let oscillator;
    let gainNode;
    let isPlaying = false;
    let stopTimer; 

    const DURATION = 4;        
    const MIN_FREQ = 50;       
    const FREQ_SCALE = 300;    
    const U_RANGE_SCALE = 20;  
    const CURVE_POINTS = 100;  

    function playHyperbolaSonification() {
        if (isPlaying) {
            stopSonification();
            return;
        }

        let a = parseFloat(aInput.value);
        let b = parseFloat(bInput.value);

        if (!a || a <= 0 || !b || b <= 0) {
            alert("Будь ласка, введіть додатні значення для 'a' та 'b', щоб почути звук.");
            return;
        }
        
        isPlaying = true;
        playBtn.innerHTML = stopIconHTML;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        oscillator.type = 'sine';

        const waveArray = new Float32Array(CURVE_POINTS);
        for (let i = 0; i < CURVE_POINTS; i++) {
            const t_norm = i / (CURVE_POINTS - 1); 
            const u = 1 + (t_norm * U_RANGE_SCALE) / a;
            const y_diff = b * (u - Math.sqrt(u * u - 1));
            waveArray[i] = MIN_FREQ + (y_diff * FREQ_SCALE);
        }

        const now = audioCtx.currentTime;
        oscillator.frequency.setValueCurveAtTime(waveArray, now, DURATION);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
        gainNode.gain.setValueAtTime(0.4, now + DURATION - 0.2);
        gainNode.gain.linearRampToValueAtTime(0, now + DURATION);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(now);

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

    playBtn.addEventListener('click', playHyperbolaSonification);
});