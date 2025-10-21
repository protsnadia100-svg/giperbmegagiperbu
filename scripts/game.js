/* game.js - Logic for the Hyperbola Hunt mini-game */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const gamePlotDiv = document.getElementById('gamePlot');
    const instructionsDiv = document.getElementById('gameInstructions');
    const feedbackDiv = document.getElementById('gameFeedback');
    const startBtn = document.getElementById('startGameBtn');
    const nextHintBtn = document.getElementById('nextHintBtn');
    const toggleModeBtn = document.getElementById('toggleModeBtn'); // НОВА КНОПКА

    // --- Game Settings ---
    const F1 = [-6, 1]; // Координати маяків (фокусів)
    const F2 = [6, -1]; 
    const F3 = [0, 8]; 
    const MAP_RANGE = 12; 
    const CLICK_TOLERANCE_FACTOR = 0.04; 

    // --- Game State ---
    let targetPoint = null;
    let distDiff12 = null;
    let distDiff23 = null;
    let gameStep = 0; 
    let gameMode = 'diff'; // 'diff' (гіпербола) або 'sum' (спряжена гіпербола/еліпс)
    
    let hyperbola1Analysis = null;
    let hyperbola2Analysis = null;
    let currentTraces = []; // Зберігаємо traces, щоб Plotly.react працював коректно

    // --- Event Listeners ---
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (nextHintBtn) nextHintBtn.addEventListener('click', showSecondHyperbola);
    if (toggleModeBtn) toggleModeBtn.addEventListener('click', toggleGameMode); // НОВИЙ ОБРОБНИК

    if (gamePlotDiv) {
        // Ініціалізація Plotly та прив'язка кліка
        Plotly.newPlot(gamePlotDiv, [], getGameLayout(MAP_RANGE))
            .then(gd => {
                // ПРИМУСОВЕ ПІДКЛЮЧЕННЯ СЛУХАЧА ПІСЛЯ ПЕРШОЇ ІНІЦІАЛІЗАЦІЇ
                gd.removeAllListeners('plotly_click'); 
                gd.on('plotly_click', handleGameClick);
            });
    }

    // --- Logic for Game Mode Toggle ---
    function toggleGameMode() {
        if (gameStep < 2) {
             feedbackDiv.textContent = 'Спочатку отримайте обидві підказки.';
             feedbackDiv.style.color = '#ff6b6b';
             return;
        }

        gameMode = (gameMode === 'diff') ? 'sum' : 'diff';
        
        // Оновлюємо кнопку
        toggleModeBtn.textContent = (gameMode === 'diff') 
            ? 'Спробувати РЕЖИМ СУМИ (Еліпс)' 
            : 'Спробувати РЕЖИМ РІЗНИЦІ (Гіпербола)';
        
        // Оновлюємо інструкцію
        instructionsDiv.innerHTML = (gameMode === 'diff') 
            ? `<b>РЕЖИМ: ГІПЕРБОЛА</b>. Клікніть на перетині синьої та рожевої гіпербол.`
            : `<b>РЕЖИМ: ЕЛІПС</b>. Шукаємо місце, де суми відстаней дають константи (інша гілка). Клікніть на перетині ліній.`;

        // Перемальовуємо графік, щоб показати, що це інший режим
        plotGame(false); 
    }
    
    // Перемальовує весь графік, враховуючи поточний режим
    function plotGame(isInitialSetup) {
        const traces = [];

        // 1. Маяки завжди першими
        const beaconTrace = {
            x: [F1[0], F2[0], F3[0]],
            y: [F1[1], F2[1], F3[1]],
            mode: 'markers+text', type: 'scatter', name: 'Маяки',
            text: ['F₁', 'F₂', 'F₃'], textposition: 'top center',
            marker: { size: 12, color: '#ff6b6b' }, hoverinfo: 'skip'
        };
        traces.push(beaconTrace);
        
        if (gameStep >= 1) {
            // 2. Гіпербола 1
            const h1 = getHyperbolaAnalysis(F1, F2, distDiff12, gameMode);
            const trace1 = buildContourTrace(h1, '#00ffff', 'Гіпербола 1 (F1, F2)');
            traces.push(trace1);
        }
        
        if (gameStep >= 2) {
            // 3. Гіпербола 2
            const h2 = getHyperbolaAnalysis(F2, F3, distDiff23, gameMode);
            const trace2 = buildContourTrace(h2, '#ff69b4', 'Гіпербола 2 (F2, F3)');
            traces.push(trace2);
        }

        // 4. Цільова точка (якщо гра завершена)
        if (gameStep === 3) {
            traces.push(markTargetPointTrace(targetPoint[0], targetPoint[1]));
        }

        currentTraces = traces;
        Plotly.react(gamePlotDiv, currentTraces, getGameLayout(MAP_RANGE));
    }


    // --- Game Functions ---

    function resetGame() {
        gameStep = 0;
        gameMode = 'diff';
        feedbackDiv.textContent = '';
        nextHintBtn.classList.add('hidden');
        toggleModeBtn.classList.add('hidden');
        startBtn.textContent = 'Почати гру';
        instructionsDiv.innerHTML = `Натисніть "Почати гру", щоб отримати першу підказку.`;
        Plotly.react(gamePlotDiv, [], getGameLayout(MAP_RANGE));
    }


    function startGame() {
        resetGame(); 
        startBtn.textContent = 'Нова гра';

        // 1. Генеруємо цільову точку
        targetPoint = [
            (Math.random() - 0.5) * MAP_RANGE * 1.5, 
            (Math.random() - 0.5) * MAP_RANGE * 1.5
        ];

        // 2. Розраховуємо різниці відстаней
        const dist = (p1, p2) => Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        distDiff12 = Math.abs(dist(targetPoint, F1) - dist(targetPoint, F2));
        distDiff23 = Math.abs(dist(targetPoint, F2) - dist(targetPoint, F3));
        
        const distSum12 = dist(targetPoint, F1) + dist(targetPoint, F2);
        const distSum23 = dist(targetPoint, F2) + dist(targetPoint, F3);

        // Перевірка на виродженість та можливість побудови
        if (distDiff12 >= dist(F1, F2) * 0.99 || distDiff23 >= dist(F2, F3) * 0.99 || distDiff12 < 1 || distDiff23 < 1) {
            startGame(); 
            return;
        }

        // 3. Малюємо гру
        gameStep = 1;
        plotGame(true);

        instructionsDiv.innerHTML = `<b>ПІДКАЗКА 1:</b> |PF₁| - |PF₂| = <b>${distDiff12.toFixed(2)}</b> км. Ви на синій лінії.`;
        nextHintBtn.classList.remove('hidden');
        toggleModeBtn.classList.add('hidden');
    }

    function showSecondHyperbola() {
        if (gameStep !== 1) return;

        gameStep = 2;
        plotGame(false); // Малюємо другу гіперболу
        
        instructionsDiv.innerHTML = `<b>ПІДКАЗКА 2:</b> |PF₂| - |PF₃| = <b>${distDiff23.toFixed(2)}</b> км.<br><b>Клікніть на карті ваше ймовірне місцезнаходження!</b>`;
        nextHintBtn.classList.add('hidden');
        toggleModeBtn.classList.remove('hidden'); // Показуємо кнопку перемикання
        feedbackDiv.textContent = 'Спробуйте знайти точку перетину гіпербол.';
    }

    function handleGameClick(data) {
        if (gameStep !== 2 || !data.points || data.points.length === 0) return;

        const clickX = data.points[0].x;
        const clickY = data.points[0].y;

        // Визначаємо, яку константу ми шукаємо
        let tolerance = MAP_RANGE * CLICK_TOLERANCE_FACTOR; 
        
        const dist = (p1, p2) => Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        
        // Перевірка на два можливі перетини (для гіпербол, це має бути той, що ближчий до нашої цільової точки)
        // Для спрощення: перевіряємо, чи клік знаходиться в радіусі допуску від цільової точки
        const distanceToTarget = Math.hypot(clickX - targetPoint[0], clickY - targetPoint[1]);
        

        if (distanceToTarget < tolerance) {
            feedbackDiv.textContent = `🎉 Вітаємо! Визначено ваше місцезнаходження: [${targetPoint[0].toFixed(2)}, ${targetPoint[1].toFixed(2)}]`;
            feedbackDiv.style.color = '#84fab0'; 
            gameStep = 3; 
            plotGame(false); // Перемальовуємо, щоб показати ціль
            startBtn.textContent = 'Зіграти ще раз';
            toggleModeBtn.classList.add('hidden');
        } else {
            feedbackDiv.textContent = `🤔 Спробуйте ще раз! Похибка: ${distanceToTarget.toFixed(2)} км. (Допуск: ${tolerance.toFixed(2)} км)`;
            feedbackDiv.style.color = '#ffeb3b'; 
            
            // Додаємо маркер, де клікнув гравець (traceIndex 3, після двох гіпербол)
            const clickTrace = {
                 x: [clickX],
                 y: [clickY],
                 mode: 'markers',
                 type: 'scatter',
                 name: 'Ваш клік',
                 marker: { symbol: 'circle', size: 10, color: '#ff6b6b' },
                 hoverinfo: 'text',
                 text: [`Клік [${clickX.toFixed(2)}, ${clickY.toFixed(2)}]`]
             };
             if (gamePlotDiv.data.length > 3) {
                 Plotly.restyle(gamePlotDiv, clickTrace, 3);
             } else {
                 Plotly.addTraces(gamePlotDiv, clickTrace);
             }
        }
    }

    // --- Helper Functions ---

    /**
     * Calculates the general equation parameters based on two foci and the constant (diff or sum).
     */
    function getHyperbolaAnalysis(f1, f2, constant, mode = 'diff') {
        const c = Math.hypot(f1[0] - f2[0], f1[1] - f2[1]) / 2;
        const center = { x: (f1[0] + f2[0]) / 2, y: (f1[1] + f2[1]) / 2 };
        const dx = f2[0] - f1[0];
        const dy = f2[1] - f1[1];
        const angleRad = Math.atan2(dy, dx); 
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        let a, b2, sign;

        if (mode === 'diff') { // Гіпербола: |PF1 - PF2| = 2a (constant)
            a = constant / 2;
            if (c <= a) return null;
            b2 = c * c - a * a;
            sign = -1; // x^2/a^2 - y^2/b^2 = 1
        } else { // Еліпс (Спряжена гіпербола): |PF1 + PF2| = 2a (constant)
            a = constant / 2;
            if (c >= a) return null; // Foci must be inside
            b2 = a * a - c * c;
            sign = 1; // x^2/a^2 + y^2/b^2 = 1
        }

        const a2 = a*a;
        const cos2 = cos*cos;
        const sin2 = sin*sin;
        const sincos = sin*cos;

        // Формула для розвороту: Q = R^T * M * R
        // M = [[sign/a^2, 0], [0, 1/b^2]] -> (для гіперболи: sign=-1 для b^2, тут вже враховано)
        
        // Виведення загального рівняння
        let A_rot, C_rot;
        if (mode === 'diff') {
             // Гіпербола: (cos^2/a^2 - sin^2/b^2)x^2 + 2...xy + (sin^2/a^2 - cos^2/b^2)y^2
             A_rot = cos2 / a2 - sin2 / b2;
             C_rot = sin2 / a2 - cos2 / b2;
        } else {
             // Еліпс: (cos^2/a^2 + sin^2/b^2)x^2 + 2...xy + (sin^2/a^2 + cos^2/b^2)y^2
             A_rot = cos2 / a2 + sin2 / b2;
             C_rot = sin2 / a2 + cos2 / b2;
        }

        const B_rot = 2 * sincos * (1 / a2 - 1 / b2); // Загальна формула для B
        
        // D, E, F після переносу (Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0)
        const D = -2 * A_rot * centerX - B_rot * centerY;
        const E = -B_rot * centerX - 2 * C_rot * centerY;
        const F = A_rot * centerX * centerX + B_rot * centerX * centerY + C_rot * centerY * centerY - 1;

        const parsed = { A: A_rot, B: B_rot, C: C_rot, D: D, E: E, F: F };

        // Використовуємо Solver.analyzeGeneral для отримання повного об'єкта
        return Solver.analyzeGeneral(parsed);
    }
    
    // Створює Plotly trace для контуру
    function buildContourTrace(analysis, color, name) {
        const { parsed } = analysis;
        const dataRange = MAP_RANGE * 25; 
        const N = 501; 
        const grid = buildGrid(parsed.A, parsed.B, parsed.C, parsed.D, parsed.E, parsed.F, dataRange, N);

        return {
            x: grid.x, y: grid.y, z: grid.z,
            type: 'contour', name: name,
            contours: { start: 0, end: 0, size: 1, coloring: 'none' }, 
            line: { color: color, width: 3, smoothing: 1.0 }, 
            showscale: false, hoverinfo: 'none', opacity: 0.9
        };
    }

    /**
     * Creates a trace for the final target point.
     */
     function markTargetPointTrace(x, y) {
         return {
             x: [x],
             y: [y],
             mode: 'markers',
             type: 'scatter',
             name: 'Ваша позиція',
             marker: {
                 symbol: 'star', 
                 size: 20,
                 color: '#84fab0', 
                 line: {
                    color: '#0d1b2a',
                    width: 3
                 }
             },
             hoverinfo: 'text',
             text: [`Позиція: [${x.toFixed(2)}, ${y.toFixed(2)}]`]
         };
     }


    /**
     * Basic Plotly layout for the game.
     */
    function getGameLayout(range) {
        const isLight = document.body.classList.contains('theme-light');
        const axisColor = isLight ? '#333' : '#9aa4ad';
        const gridColor = isLight ? '#eee' : 'rgba(255,255,255,0.08)';
        const bgColor = isLight ? '#f7fbff' : '#0d1b2a'; 
        return {
            xaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, gridcolor: gridColor },
            yaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, scaleanchor: 'x', scaleratio: 1, gridcolor: gridColor },
            plot_bgcolor: bgColor, 
            paper_bgcolor: 'rgba(0,0,0,0)', 
            margin: { l: 40, r: 20, t: 30, b: 40 },
            showlegend: false,
            hovermode: 'closest', 
            clickmode: 'event'
        };
    }

    // Helper: Needed by plotGameHyperbola
    function buildGrid(A,B,C,D,E,F, range, N){
        const x = Array.from({length: N}, (_, i) => -range + 2*range*i/(N-1));
        const y = [...x];
        const z = y.map(yi => x.map(xi => Math.fround(A*xi*xi + B*xi*yi + C*yi*yi + D*xi + E*yi + F)));
        return {x, y, z};
    }

}); // End DOMContentLoaded