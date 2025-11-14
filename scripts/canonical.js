document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ЛОГІКА ПЕРЕМИКАННЯ ВКЛАДОК (ВИПРАВЛЕНО MATHJAX) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            let activeForm = null; // Збережемо активну форму

            tabContents.forEach(content => {
                const isActive = content.id === `${type}-form`;
                content.classList.toggle('active', isActive);
                if (isActive) {
                    activeForm = content; // Знайшли
                }
            });

            // FIX: Примусово оновлюємо MathJax для блоку, який щойно став видимим
            // Це виправляє "дивні знаки" при перемиканні
            if (activeForm) {
                const previewEl = activeForm.querySelector('.equation-preview');
                if (previewEl && window.MathJax && MathJax.typesetPromise) {
                    MathJax.typesetPromise([previewEl]).catch(err => console.error("MathJax re-render failed:", err));
                }
            }
            
            // Ця логіка оновлює preview при зміні орієнтації
            if (type === 'hyperbola') {
                const orientationSelect = document.getElementById('hyperbola-orientation');
                updateHyperbolaPreview(orientationSelect.value);
            } else if (type === 'parabola') {
                const orientationSelect = document.getElementById('parabola-orientation');
                updateParabolaPreview(orientationSelect.value);
            }
        });
    });

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


    // --- 2. ЛОГІКА КНОПКИ "ПОБУДУВАТИ" (ВИПРАВЛЕНО) ---
    
    // Ця функція збирає дані з АКТИВНОЇ вкладки і будує криву
    const buildActiveCurve = () => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.type;
        
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
                } else { // 'horizontal'
                    A = b2; C = -a2; D = -2 * b2 * params.h; E = 2 * a2 * params.k;
                    F = b2 * params.h**2 - a2 * params.k**2 - a2 * b2;
                }
            
            } else if (activeTab === 'parabola') {
                if (!params.p) throw new Error("'p' має бути заданий");
                let p4 = 4 * params.p;
                
                // ВИПРАВЛЕНО: 'horizontal' тепер відповідає HTML
                switch (params.orientation) {
                    case 'horizontal':       C = 1; D = -p4; E = -2 * params.k; F = params.k**2 + p4 * params.h; break;
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
                if (eqInput && typeof Solver.parsedToEquationString === 'function') {
                    eqInput.value = Solver.parsedToEquationString(parsed); 
                }

                const defaultTangent = Solver.calculateDefaultTangent(parsed, analysis);
                if (defaultTangent) {
                    window.defaultTangentInfo = defaultTangent;
                    // window.lastTangentInfo = defaultTangent; // Не встановлюємо за замовчуванням
                }

                displayAnalysis(analysis); 
                if (document.getElementById('stepsOutput') && typeof Solver.getSteps === 'function') {
                    document.getElementById('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
                }
                plotAnalysis(analysis); 

            } else {
                throw new Error("Необхідні функції (Solver/plotAnalysis/displayAnalysis) не завантажено.");
            }

        } catch (error) {
            console.error('Помилка при побудові канонічної кривої:', error);
            document.getElementById('solveOutput').innerHTML = `<span style="color: #ff6b6b;">Помилка: ${error.message}</span>`;
        }
    };
    
    // Призначаємо єдиний обробник на всі три кнопки
    const ellipseBtn = document.getElementById('buildEllipseBtn');
    const hyperbolaBtn = document.getElementById('buildHyperbolaBtn');
    const parabolaBtn = document.getElementById('buildParabolaBtn');

    if (ellipseBtn) ellipseBtn.addEventListener('click', buildActiveCurve);
    if (hyperbolaBtn) hyperbolaBtn.addEventListener('click', buildActiveCurve);
    if (parabolaBtn) parabolaBtn.addEventListener('click', buildActiveCurve);


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
        if ($g('findTangentAtPointBtn')) $g('findTangentAtPointBtn').addEventListener('click', findTangentAtPoint); // НОВИЙ обробник
    } else {
        console.warn("graph.js interactive functions (toggleChordExplorer, etc.) not found.");
    }
    
    // --- ЗАВАНТАЖЕННЯ РІВНЯННЯ З URL (для задач) ---
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type) {
        const tabButton = document.querySelector(`.tab-btn[data-type="${type}"]`);
        if (tabButton) tabButton.click();
        
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
        
        // Знаходимо кнопку ПІСЛЯ заповнення полів і клікаємо
        const buildBtn = document.getElementById(`build${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
        if (buildBtn) {
            buildBtn.click();
        }
    }
});