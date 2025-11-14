document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ЛОГІКА ОНОВЛЕННЯ ПРЕВ'Ю (ЗАЛИШИЛАСЯ) ---
    
    // Оновлення прев'ю гіперболи
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

    // Оновлення прев'ю параболи
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


    // --- 2. НОВА ЛОГІКА КНОПОК "ПОБУДУВАТИ" ---

    /**
     * Загальна функція для побудови, яку викликають усі кнопки.
     * @param {string} activeTab - 'ellipse', 'hyperbola', або 'parabola'
     */
    function buildFromCanonical(activeTab) {
        try {
            const params = {};
            const inputs = document.querySelectorAll(`#${activeTab}-form input, #${activeTab}-form select`);
            inputs.forEach(input => {
                let key = input.name || input.id;
                key = key.replace(`${activeTab}-`, '');
                params[key] = (input.type === 'number') ? parseFloat(input.value) : input.value;
            });

            let A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;

            if (activeTab === 'ellipse') {
                if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                const a2 = params.a**2, b2 = params.b**2;
                A = b2; C = a2; D = -2 * b2 * params.h; E = -2 * a2 * params.k;
                F = b2 * params.h**2 + a2 * params.k**2 - a2 * b2;
            
            } else if (activeTab === 'hyperbola') {
                if (!params.a || !params.b) throw new Error("'a' та 'b' мають бути задані");
                const a2 = params.a**2, b2 = params.b**2;
                
                if (params.orientation === 'vertical') {
                    A = -a2; C = b2; D = 2 * a2 * params.h; E = -2 * b2 * params.k;
                    F = b2 * params.k**2 - a2 * params.h**2 - a2 * b2;
                } else {
                    A = b2; C = -a2; D = -2 * b2 * params.h; E = 2 * a2 * params.k;
                    F = b2 * params.h**2 - a2 * params.k**2 - a2 * b2;
                }
            
            } else if (activeTab === 'parabola') {
                if (!params.p) throw new Error("'p' має бути заданий");
                let p4 = 4 * params.p;
                
                switch (params.orientation) {
                    case 'horizontal-right': C = 1; D = -p4; E = -2 * params.k; F = params.k**2 + p4 * params.h; break;
                    case 'horizontal-left':  p4 = -p4; C = 1; D = -p4; E = -2 * params.k; F = params.k**2 + p4 * params.h; break;
                    case 'vertical-up':      A = 1; D = -2 * params.h; E = -p4; F = params.h**2 + p4 * params.k; break;
                    case 'vertical-down':    p4 = -p4; A = 1; D = -2 * params.h; E = -p4; F = params.h**2 + p4 * params.k; break;
                }
            }
            
            if (typeof Solver.analyzeGeneral === 'function' && 
                typeof plotAnalysis === 'function' && 
                typeof displayAnalysis === 'function') 
            {
                const parsed = { A, B, C, D, E, F };
                const analysis = Solver.analyzeGeneral(parsed);
                
                window.lastAnalysis = analysis; 
                window.lastTangentInfo = null; 
                window.defaultTangentInfo = null;

                const eqInput = document.getElementById('equationInput');
                if (eqInput) {
                    let eqStr = `${A}x^2 + ${B}xy + ${C}y^2 + ${D}x + ${E}y + ${F} = 0`;
                    eqInput.value = eqStr; 
                }

                const defaultTangent = Solver.calculateDefaultTangent(parsed, analysis);
                if (defaultTangent) {
                    window.defaultTangentInfo = defaultTangent;
                }

                displayAnalysis(analysis); 
                document.getElementById('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
                plotAnalysis(analysis); 

            } else {
                throw new Error("Необхідні функції (Solver/plotAnalysis/displayAnalysis) не завантажено.");
            }

        } catch (error) {
            console.error(`Помилка при побудові (${activeTab}):`, error);
            document.getElementById('solveOutput').innerHTML = `<span style="color: #ff6b6b;">Помилка: ${error.message}</span>`;
        }
    }
    
    // Додаємо обробники для КОЖНОЇ кнопки
    const buildEllipseBtn = document.getElementById('buildEllipseBtn');
    if (buildEllipseBtn) buildEllipseBtn.addEventListener('click', () => buildFromCanonical('ellipse'));

    const buildHyperbolaBtn = document.getElementById('buildHyperbolaBtn');
    if (buildHyperbolaBtn) buildHyperbolaBtn.addEventListener('click', () => buildFromCanonical('hyperbola'));

    const buildParabolaBtn = document.getElementById('buildParabolaBtn');
    if (buildParabolaBtn) buildParabolaBtn.addEventListener('click', () => buildFromCanonical('parabola'));


    // --- 3. ЛОГІКА ДЛЯ СОНІФІКАЦІЇ ГІПЕРБОЛИ ---
    const playBtn = document.getElementById('playHyperbolaSound');
    const aInput = document.getElementById('hyperbola-a');
    const bInput = document.getElementById('hyperbola-b');

    if (playBtn && aInput && bInput) {
        const playIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg> Почути асимптоту (за $a$ і $b$)`;
        const stopIconHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;"><path d="M6 6h12v12H6z"/></svg> Зупинити`;
        let audioCtx, oscillator, gainNode, isPlaying = false, stopTimer; 
        const DURATION = 4, MIN_FREQ = 50, FREQ_SCALE = 300, U_RANGE_SCALE = 20, CURVE_POINTS = 100;  

        function playHyperbolaSonification() {
            if (isPlaying) { stopSonification(); return; }
            let a = parseFloat(aInput.value), b = parseFloat(bInput.value);
            if (!a || a <= 0 || !b || b <= 0) { alert("Будь ласка, введіть додатні значення для 'a' та 'b'."); return; }
            isPlaying = true; playBtn.innerHTML = stopIconHTML;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            oscillator = audioCtx.createOscillator(); gainNode = audioCtx.createGain(); oscillator.type = 'sine';
            const waveArray = new Float32Array(CURVE_POINTS);
            for (let i = 0; i < CURVE_POINTS; i++) {
                const t_norm = i / (CURVE_POINTS - 1), u = 1 + (t_norm * U_RANGE_SCALE) / a;
                const y_diff = b * (u - Math.sqrt(u * u - 1));
                waveArray[i] = MIN_FREQ + (y_diff * FREQ_SCALE);
            }
            const now = audioCtx.currentTime;
            oscillator.frequency.setValueCurveAtTime(waveArray, now, DURATION);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gainNode.gain.setValueAtTime(0.4, now + DURATION - 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + DURATION);
            oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
            oscillator.start(now); oscillator.stop(now + DURATION);
            stopTimer = setTimeout(stopSonification, DURATION * 1000);
        }
        function stopSonification() {
            if (oscillator) oscillator.stop(); if (audioCtx) audioCtx.close().catch(console.error);
            if (stopTimer) clearTimeout(stopTimer);
            isPlaying = false; audioCtx = null; oscillator = null; gainNode = null; playBtn.innerHTML = playIconHTML;
            if (window.MathJax) MathJax.typesetPromise([playBtn]); // Оновлюємо MathJax
        }
        playBtn.addEventListener('click', playHyperbolaSonification);
    }
    
    // --- 4. ПІДКЛЮЧЕННЯ ІНТЕРАКТИВНИХ РЕЖИМІВ (з graph.js) ---
    
    function $g(id){ return document.getElementById(id); } // Локальний $

    if (typeof toggleChordExplorer === 'function') {
        if ($g('exploreChordsBtn')) $g('exploreChordsBtn').addEventListener('click', toggleChordExplorer);
        if ($g('tangentModeBtn')) $g('tangentModeBtn').addEventListener('click', toggleTangentMode);
        if ($g('toggle3DBtn')) $g('toggle3DBtn').addEventListener('click', toggle3DView);
        if ($g('locusAnimationBtn')) $g('locusAnimationBtn').addEventListener('click', toggleLocusAnimation);
        
        // Обробники для нових полів дотичної
        if ($g('plotManualTangentBtn')) $g('plotManualTangentBtn').addEventListener('click', plotTangentByEquation);
        if ($g('findTangentAtPointBtn')) $g('findTangentAtPointBtn').addEventListener('click', findTangentAtPoint);
    } else {
        console.warn("graph.js interactive functions (toggleChordExplorer, etc.) not found.");
    }
    
    // --- 5. ЗАВАНТАЖЕННЯ РІВНЯННЯ З URL (для задач) ---
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type) {
        // (Логіка кліку на таб більше не потрібна)
        // const tabButton = document.querySelector(`.tab-btn[data-type="${type}"]`);
        // if (tabButton) tabButton.click();
        
        urlParams.forEach((value, key) => {
            if (key !== 'type') {
                const inputId = `${type}-${key}`; 
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = value;
                    if (key === 'orientation') {
                        if (type === 'hyperbola') updateHyperbolaPreview(value);
                        if (type === 'parabola') updateParabolaPreview(value);
                    }
                }
            }
        });
        
        // Викликаємо відповідну кнопку "Побудувати"
        const buildButton = document.getElementById(`build${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
        if (buildButton) {
            buildButton.click();
        }
    }

    // --- 6. ПЕРВИННИЙ ЗАПУСК MATHJAX ---
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise().catch(console.error);
    }
});
