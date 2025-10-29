/* graph.js
    - UI bindings (index.html)
    - uses Solver.* for math
    - draws implicit contour via Plotly (level 0)
    - draws foci, directrices, axes, asymptotes
    - Drag-n-Drop functionality
    - Equation library modal
    - Interactive Modes:
        - Focal Chord Explorer
        - Tangent Line Builder
        - 3D Surface Viewer
        - Locus Animation
    - ОНОВЛЕНО: Додано console.log для діагностики, покращено обробку подій та оновлення фігур.
*/

document.addEventListener('DOMContentLoaded', initUI);

function $(id){ return document.getElementById(id); }

function initUI(){
    // ... (весь код initUI залишається ТАКИМ САМИМ, як у попередній версії) ...
    const eqInput = $('equationInput');
    window.isChordExplorerActive = false;
    window.isTangentModeActive = false;
    window.is3DViewActive = false;
    window.isLocusAnimationActive = false;
    window.lastTangentInfo = null;

    if ($('buildBtn')) $('buildBtn').addEventListener('click', analyzeAndPlot);
    if ($('analyzeBtn')) $('analyzeBtn').addEventListener('click', analyzeOnly);
    if ($('saveExampleBtn')) $('saveExampleBtn').addEventListener('click', () => {
        syncEquationInput();
        const txt = eqInput.value.trim();
        if (txt) { Solver.addExample(txt); renderExampleList(); }
    });
    if ($('clearBtn')) $('clearBtn').addEventListener('click', () => {
        deactivateAllModes();
        Plotly.newPlot('graphCanvas', [], getLayout(8), {responsive: true});
        if ($('solveOutput')) $('solveOutput').innerHTML = 'Введіть рівняння для аналізу.';
        if ($('stepsOutput')) { $('stepsOutput').innerHTML = ''; $('stepsOutput').classList.add('hidden'); }
        if (eqInput) eqInput.value = '';
        syncCoeffBoxes();
        localStorage.removeItem('conics_last_equation');
        window.lastAnalysis = null;
        window.lastTangentInfo = null;
    });
    if ($('toggleExtrasBtn')) $('toggleExtrasBtn').addEventListener('click', () => {
        window.showExtras = !window.showExtras;
        if (window.lastAnalysis && !window.is3DViewActive) { plotAnalysis(window.lastAnalysis); }
        $('toggleExtrasBtn').textContent = window.showExtras ? 'Сховати Осі/Фокуси' : 'Осі/Фокуси';
    });
    if ($('toggleConjugateBtn')) $('toggleConjugateBtn').addEventListener('click', () => {
        window.showConjugate = !window.showConjugate;
        if (window.lastAnalysis && window.lastAnalysis.type === 'гіпербола' && !window.is3DViewActive) { plotAnalysis(window.lastAnalysis); }
         $('toggleConjugateBtn').textContent = window.showConjugate ? 'Сховати Спряжену' : 'Спряжена';
    });
    if ($('shareBtn')) $('shareBtn').addEventListener('click', shareEquation);
    if ($('stepsBtn')) $('stepsBtn').addEventListener('click', () => { if ($('stepsOutput')) $('stepsOutput').classList.toggle('hidden'); });

    if ($('exploreChordsBtn')) $('exploreChordsBtn').addEventListener('click', toggleChordExplorer);
    if ($('tangentModeBtn')) $('tangentModeBtn').addEventListener('click', toggleTangentMode);
    if ($('toggle3DBtn')) $('toggle3DBtn').addEventListener('click', toggle3DView);
    if ($('locusAnimationBtn')) $('locusAnimationBtn').addEventListener('click', toggleLocusAnimation);

    if ($('libraryBtn')) {
        $('libraryBtn').addEventListener('click', openLibraryModal);
        $('closeModalBtn').addEventListener('click', closeLibraryModal);
        $('libraryModal').addEventListener('click', (e) => { if(e.target === $('libraryModal')) closeLibraryModal(); });
    }

    const coeffInputs = document.querySelectorAll('.coeff-input');
    coeffInputs.forEach(input => { input.addEventListener('input', syncEquationInput); });

    const savedTheme = localStorage.getItem('conics_theme') || 'dark';
    document.body.classList.toggle('theme-light', savedTheme === 'light');
    const themeToggle = $('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'light';
        themeToggle.addEventListener('change', () => {
            const isLight = themeToggle.checked;
            document.body.classList.toggle('theme-light', isLight);
            localStorage.setItem('conics_theme', isLight ? 'light' : 'dark');
            if (window.lastAnalysis) { window.is3DViewActive ? plot3DView(window.lastAnalysis) : plotAnalysis(window.lastAnalysis); }
        });
    }

    if ($('exampleList')) { renderExampleList(); setupDragAndDrop(); }
    Plotly.newPlot('graphCanvas', [], getLayout(8), {responsive: true});
    window.showExtras = true;
    window.showConjugate = false;
    if ($('toggleExtrasBtn')) $('toggleExtrasBtn').textContent = window.showExtras ? 'Сховати Осі/Фокуси' : 'Осі/Фокуси';
    if ($('toggleConjugateBtn')) $('toggleConjugateBtn').textContent = window.showConjugate ? 'Сховати Спряжену' : 'Спряжена';
    if ($('theoryShort')) $('theoryShort').innerHTML = '<b>Гіпербола:</b> Δ > 0. Клацни "Теорія" для деталей.';
    loadEquationFromURLOrStorage();
    setupGraphEventListeners(); // Перенесено сюди для гарантії ініціалізації Plotly
}

function syncEquationInput() {
    // ... (код syncEquationInput без змін) ...
    const A = parseFloat($('coeff-A').value) || 0;
    const B = parseFloat($('coeff-B').value) || 0;
    const C = parseFloat($('coeff-C').value) || 0;
    const D = parseFloat($('coeff-D').value) || 0;
    const E = parseFloat($('coeff-E').value) || 0;
    const F = parseFloat($('coeff-F').value) || 0;

    let eq = '';
    const addTerm = (coeff, term) => {
        if (coeff === 0) return '';
        let sign = coeff > 0 ? '+ ' : '- ';
        let val = Math.abs(coeff);
        if (eq === '' && sign === '+ ') sign = '';
        if (val === 1 && term !== '') val = '';
        return `${sign}${val}${term} `;
    };

    eq += addTerm(A, 'x^2');
    eq += addTerm(B, 'xy');
    eq += addTerm(C, 'y^2');
    eq += addTerm(D, 'x');
    eq += addTerm(E, 'y');
    eq += addTerm(F, '');

    if (eq.length > 0) eq = eq.trimEnd() + ' = 0';

    $('equationInput').value = eq.trim();
}

function syncCoeffBoxes() {
    // ... (код syncCoeffBoxes без змін) ...
    const eq = $('equationInput').value;
    const parsed = Solver.parseGeneralEquation(eq);

    if (parsed) {
        $('coeff-A').value = parsed.A || '';
        $('coeff-B').value = parsed.B || '';
        $('coeff-C').value = parsed.C || '';
        $('coeff-D').value = parsed.D || '';
        $('coeff-E').value = parsed.E || '';
        $('coeff-F').value = parsed.F || '';
    } else {
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => $(`coeff-${c}`).value = '');
    }
}


// --- ЛОГІКА КЕРУВАННЯ ІНТЕРАКТИВНИМИ РЕЖИМАМИ ---

function setupGraphEventListeners() {
    const canvas = $('graphCanvas');
    // Чекаємо, поки Plotly буде готовий
    if (canvas && canvas.layout) {
        try {
            canvas.removeAllListeners('plotly_hover');
            canvas.removeAllListeners('plotly_click');
            canvas.removeAllListeners('plotly_unhover');
            canvas.on('plotly_hover', handleGraphHover);
            canvas.on('plotly_click', handleGraphClick);
            canvas.on('plotly_unhover', handleGraphUnhover);
            console.log("Plotly event listeners attached.");
        } catch (e) {
            console.error("Failed to attach Plotly listeners:", e);
        }
    } else {
        // Якщо Plotly ще не готовий, спробуємо трохи пізніше
        console.log("Plotly not ready, retrying listener setup...");
        setTimeout(setupGraphEventListeners, 100);
    }
}


function handleGraphUnhover() {
    // ... (код handleGraphUnhover без змін) ...
    if(window.isChordExplorerActive) {
        $('chordLengthDisplay').style.display = 'none';
        const graphDiv = $('graphCanvas');
        const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
        const newShapes = currentShapes.filter(s => s.name !== 'focal-chord');
        if (newShapes.length !== currentShapes.length) { Plotly.relayout(graphDiv, { shapes: newShapes }); }
    }
}

function deactivateAllModes() {
    // ... (код deactivateAllModes без змін) ...
    if (window.isLocusAnimationActive) {
        LocusAnimator.stop();
        const graphDiv = $('graphCanvas');
        if (graphDiv.data && graphDiv.data.length > 0) { Plotly.restyle(graphDiv, { visible: true }, [0, 1]); }
    }
    window.isChordExplorerActive = false;
    window.isTangentModeActive = false;
    window.is3DViewActive = false;
    window.isLocusAnimationActive = false;

    $('exploreChordsBtn')?.classList.remove('active');
    $('tangentModeBtn')?.classList.remove('active');
    $('toggle3DBtn')?.classList.remove('active');
    $('locusAnimationBtn')?.classList.remove('active');

    $('chordLengthDisplay').style.display = 'none';
    $('tangentInfoDisplay').style.display = 'none';
    window.lastTangentInfo = null;

    const graphDiv = $('graphCanvas');
    if (graphDiv.layout) { Plotly.relayout(graphDiv, { shapes: [] }); }

    if (window.lastAnalysis) displayAnalysis(window.lastAnalysis);
}

function toggleChordExplorer() {
    // ... (код toggleChordExplorer без змін) ...
    const willBeActive = !window.isChordExplorerActive;
    if (window.is3DViewActive && window.lastAnalysis) { plotAnalysis(window.lastAnalysis); }
    deactivateAllModes();
    window.isChordExplorerActive = willBeActive;
    $('exploreChordsBtn').classList.toggle('active', willBeActive);
}

function toggleTangentMode() {
    // ... (код toggleTangentMode без змін) ...
    const willBeActive = !window.isTangentModeActive;
    if (window.is3DViewActive && window.lastAnalysis) { plotAnalysis(window.lastAnalysis); }
    deactivateAllModes();
    window.isTangentModeActive = willBeActive;
    $('tangentModeBtn').classList.toggle('active', willBeActive);
}

function toggle3DView() {
    // ... (код toggle3DView без змін) ...
     const willBeActive = !window.is3DViewActive;
    deactivateAllModes();
    if (willBeActive) {
        if (window.lastAnalysis) {
            window.is3DViewActive = true;
            $('toggle3DBtn').classList.add('active');
            plot3DView(window.lastAnalysis);
        } else {
            alert("Спочатку побудуйте 2D-графік.");
        }
    } else {
        if (window.lastAnalysis) {
            plotAnalysis(window.lastAnalysis);
        }
    }
}

function toggleLocusAnimation() {
    // ... (код toggleLocusAnimation без змін) ...
    const willBeActive = !window.isLocusAnimationActive;
    if (window.is3DViewActive && window.lastAnalysis) {
        plotAnalysis(window.lastAnalysis);
    }
    deactivateAllModes();
    window.isLocusAnimationActive = willBeActive;
    $('locusAnimationBtn').classList.toggle('active', willBeActive);

    const graphDiv = $('graphCanvas');

    if (willBeActive) {
        if (window.lastAnalysis) {
            if (graphDiv.data && graphDiv.data.length > 0) {
                Plotly.restyle(graphDiv, { visible: false }, [0, 1]);
            }
            const onAnimationComplete = () => {
                if (graphDiv.data && graphDiv.data.length > 0) {
                    Plotly.restyle(graphDiv, { visible: true }, [0, 1]);
                }
                 $('locusAnimationBtn').classList.remove('active');
                 window.isLocusAnimationActive = false;
            };
            LocusAnimator.start(window.lastAnalysis, 'animationCanvas', 'graphCanvas', onAnimationComplete);
        } else {
            alert("Спочатку побудуйте криву, щоб побачити її анімацію.");
            deactivateAllModes();
        }
    } else {
        if (graphDiv.data && graphDiv.data.length > 0) {
            Plotly.restyle(graphDiv, { visible: true }, [0, 1]);
        }
    }
}


// --- ОБРОБНИКИ ПОДІЙ НА ГРАФІКУ (ОНОВЛЕНО ДЛЯ ДІАГНОСТИКИ) ---

function handleGraphHover(data) {
    // console.log("Hover event:", data); // Діагностика
    if (!window.isChordExplorerActive || !window.lastAnalysis || !data || !data.points || data.points.length === 0) return;
    const pointData = data.points[0];

    // Повертаємо перевірку curveNumber
    if (pointData.curveNumber !== 0 && pointData.curveNumber !== 1) { // Дозволяємо ховер на основній (0) та спряженій (1) кривій
         console.log("Hover ignored, not on main curve:", pointData.curveNumber);
         return;
    }

    const {extras, parsed} = window.lastAnalysis, foci=[];
    if (extras.f1 && extras.f2) foci.push(extras.f1, extras.f2);
    else if (extras.focus) foci.push([extras.focus.x, extras.focus.y]);
    if (foci.length === 0) { console.log("No foci found for chord."); return; }

    const probePoint = [pointData.x, pointData.y];
    let closestFocus = foci[0];
    if (foci.length > 1) {
        const d1 = Math.hypot(probePoint[0] - foci[0][0], probePoint[1] - foci[0][1]);
        const d2 = Math.hypot(probePoint[0] - foci[1][0], probePoint[1] - foci[1][1]);
        if (d2 < d1) closestFocus = foci[1];
    }
    // console.log("Probe point:", probePoint, "Closest focus:", closestFocus);

    const intersections = Solver.getFocalChordIntersections(parsed, closestFocus, probePoint);
    // console.log("Intersections:", intersections);

    if (intersections && intersections.length === 2) {
        const [p1, p2] = intersections;
        const length = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        const newShape = { name: 'focal-chord', type: 'line', x0: p1[0], y0: p1[1], x1: p2[0], y1: p2[1], line: { color: '#ffeb3b', width: 3 }};

        const graphDiv = $('graphCanvas');
        const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
        const newShapes = currentShapes.filter(s => s.name !== 'focal-chord'); // Видаляємо стару хорду
        newShapes.push(newShape); // Додаємо нову

        Plotly.relayout(graphDiv, { shapes: newShapes }).catch(e => console.error("Relayout error (hover):", e));

        const d = $('chordLengthDisplay');
        d.textContent = `Довжина хорди: ${length.toFixed(3)}`;
        d.style.display = 'block';
    } else {
         console.log("No valid intersections found for chord.");
         handleGraphUnhover(); // Прибираємо хорду, якщо немає перетинів
    }
}

function handleGraphClick(data) {
    // console.log("Click event:", data); // Діагностика
    if (!window.isTangentModeActive || !window.lastAnalysis || !data || !data.points || data.points.length === 0) return;
    const pointData = data.points[0];

    // Повертаємо перевірку curveNumber
    if (pointData.curveNumber !== 0 && pointData.curveNumber !== 1) {
        console.log("Click ignored, not on main curve:", pointData.curveNumber);
        return;
    }

    const point = { x: pointData.x, y: pointData.y };
    // console.log("Clicked point:", point);

    const tangent = Solver.getTangentLineAtPoint(window.lastAnalysis.parsed, point);
    // console.log("Tangent result from Solver:", tangent);

    const graphDiv = $('graphCanvas');
    const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
    let newShapes = currentShapes.filter(s => s.name !== 'tangent-line'); // Видаляємо стару дотичну

    if (tangent) {
        window.lastTangentInfo = { point: point, eqStr: tangent.eqStr }; // Зберігаємо інфо

        const { Fx, Fy, c } = tangent;
        const layout = graphDiv.layout;
        if (!layout || !layout.xaxis || !layout.yaxis || !layout.xaxis.range || !layout.yaxis.range) { console.error("Layout invalid"); return; }
        const xRange = layout.xaxis.range, yRange = layout.yaxis.range;

        let x0, y0, x1, y1;
        const extend = (r) => (r[1] - r[0]) * 1.5;
        const xMin = xRange[0] - extend(xRange), xMax = xRange[1] + extend(xRange);
        const yMin = yRange[0] - extend(yRange), yMax = yRange[1] + extend(yRange);

        if (Math.abs(Fy) > 1e-6 * Math.abs(Fx)) { // Не вертикальна
            x0 = xMin; y0 = (-Fx * x0 - c) / Fy;
            x1 = xMax; y1 = (-Fx * x1 - c) / Fy;
        } else if (Math.abs(Fx) > 1e-6) { // Вертикальна
            y0 = yMin; x0 = (-Fy * y0 - c) / Fx;
            y1 = yMax; x1 = (-Fy * y1 - c) / Fx;
        } else { console.error("Cannot draw tangent, Fx and Fy near zero"); return; } // Помилка

        const tangentShape = {
            name: 'tangent-line', type: 'line',
            x0: x0, y0: y0, x1: x1, y1: y1,
            line: { color: '#ff6b6b', width: 2.5, dash: 'longdash' }
        };
        newShapes.push(tangentShape); // Додаємо нову дотичну
        // console.log("Adding tangent shape:", tangentShape);

        const d = $('tangentInfoDisplay');
        d.innerHTML = `Дотична: <b>${tangent.eqStr}</b>`;
        d.style.display = 'block';

        displayAnalysis(window.lastAnalysis); // Оновлюємо блок результатів

    } else {
        window.lastTangentInfo = null; // Очищуємо, якщо не вдалося
        const d = $('tangentInfoDisplay');
        d.textContent = 'Не вдалося побудувати дотичну в цій точці.';
        d.style.display = 'block';
        console.log("Solver returned null for tangent.");
        displayAnalysis(window.lastAnalysis); // Оновлюємо блок результатів
    }
    // Надійно оновлюємо фігури
    Plotly.relayout(graphDiv, { shapes: newShapes }).catch(e => console.error("Relayout error (click):", e));
}



// --- ОСНОВНІ ФУНКЦІЇ АНАЛІЗУ ТА ПОБУДОВИ ---

async function analyzeAndPlot() {
    window.lastTangentInfo = null;
    if(window.isLocusAnimationActive) { deactivateAllModes(); }
    syncEquationInput();
    const raw = $('equationInput').value.trim();
    if (!raw) return;
    localStorage.setItem('conics_last_equation', raw);

    const parsed = Solver.parseGeneralEquation(raw);
    if (!parsed) { alert('Не вдалося розібрати рівняння.'); return; }
    syncCoeffBoxes();

    const analysis = Solver.analyzeGeneral(parsed);
    window.lastAnalysis = analysis;
    displayAnalysis(analysis);
    if (window.is3DViewActive) await plot3DView(analysis);
    else await plotAnalysis(analysis);
}

function analyzeOnly() {
    window.lastTangentInfo = null;
    syncEquationInput();
    const raw = $('equationInput').value.trim();
    if (!raw) return;
    localStorage.setItem('conics_last_equation', raw);

    const parsed = Solver.parseGeneralEquation(raw);
    if (!parsed) { alert('Не вдалося розібрати рівняння.'); return; }
    syncCoeffBoxes();

    const analysis = Solver.analyzeGeneral(parsed);
    window.lastAnalysis = analysis;
    displayAnalysis(analysis);
}


async function plotAnalysis(analysis) {
    if (window.is3DViewActive) deactivateAllModes();

    const { extras, parsed, type } = analysis;
    const data = [];
    const viewRange = estimateRangeForPlot(parsed, extras);
    const dataRange = viewRange * 25;
    const N = 501;
    const grid = buildGrid(parsed.A, parsed.B, parsed.C, parsed.D, parsed.E, parsed.F, dataRange, N);

    data.push({
        x: grid.x, y: grid.y, z: grid.z, type: 'contour', name: 'Крива',
        contours: { start: 0, end: 0, size: 1, coloring: 'none' },
        line: { color: '#00ffff', width: 2.5, smoothing: 1.3 },
        showscale: false, hoverinfo: 'x+y',
        uid: 'curve-trace' // Додаємо унікальний ID
    });

    data.push({type: 'scatter', x: [null], y: [null], visible: false, name: 'Спряжена', uid: 'conjugate-trace'});
    if (type === 'гіпербола' && window.showConjugate && extras.Fp && Math.abs(extras.Fp) > 1e-9) {
        const conjugateLevel = -2 * extras.Fp;
        data[1] = {
            x: grid.x, y: grid.y, z: grid.z, type: 'contour', name: 'Спряжена',
            contours: { start: conjugateLevel, end: conjugateLevel, size: 1, coloring: 'none' },
            line: { color: '#ff69b4', width: 2, dash: 'dash' },
            showscale: false, hoverinfo: 'none', visible: true,
            uid: 'conjugate-trace'
        };
    }

    const extrasTraces = getExtrasTraces(analysis, dataRange);
    extrasTraces.forEach(trace => trace.visible = window.showExtras);
    data.push(...extrasTraces);

    const layout = getLayout(viewRange);
    let shapes = [];

    // Відновлюємо лінію дотичної, якщо вона є і режим активний
    if (window.lastTangentInfo && window.isTangentModeActive) {
        const tangent = Solver.getTangentLineAtPoint(analysis.parsed, window.lastTangentInfo.point);
        if (tangent) {
            const { Fx, Fy, c } = tangent;
            const xRange = layout.xaxis.range, yRange = layout.yaxis.range;
            let x0, y0, x1, y1;
            const extend = (r) => (r[1] - r[0]) * 1.5;
            const xMin = xRange[0] - extend(xRange), xMax = xRange[1] + extend(xRange);
            const yMin = yRange[0] - extend(yRange), yMax = yRange[1] + extend(yRange);

            if (Math.abs(Fy) > 1e-6 * Math.abs(Fx)) {
                x0 = xMin; y0 = (-Fx * x0 - c) / Fy;
                x1 = xMax; y1 = (-Fx * x1 - c) / Fy;
            } else if (Math.abs(Fx) > 1e-6) {
                y0 = yMin; x0 = (-Fy * y0 - c) / Fx;
                y1 = yMax; x1 = (-Fy * y1 - c) / Fx;
            }
            if (x0 !== undefined) {
                 shapes.push({
                     name: 'tangent-line', type: 'line',
                     x0, y0, x1, y1,
                     line: { color: '#ff6b6b', width: 2.5, dash: 'longdash' }
                 });
            }
        }
    }
    layout.shapes = shapes;

    // Використовуємо Plotly.react для повного оновлення
    await Plotly.react('graphCanvas', data, layout, {responsive: true});
    setupGraphEventListeners(); // Пере-прив'язуємо слухачі після react
}


async function plot3DView(analysis) {
    // ... (код plot3DView без змін) ...
     const { type, extras } = analysis;
    const data = [];
    const N = 80;
    let x_s = [], y_s = [], z_s = [];
    let rangeEstimate = 10;
    let title = `3D-модель: ${type}`;
    const center = extras.center || extras.vertex || {x:0, y:0}; // Додано fallback
    const vecs = extras.vecs || [[1,0],[0,1]]; // Додано fallback

    if (extras.isDegenerate) {
        title = "3D-модель: Циліндр";
        const radius = 2;
        const axisVec = extras.v_axis;
        const perpVec = [-axisVec[1], axisVec[0]];
        for (let i=0; i<N; i++) {
            let x_row = [], y_row = [], z_row = [];
            for (let j=0; j<N; j++) {
                const v = -Math.PI + 2*Math.PI*j/(N-1);
                const u = -rangeEstimate + 2*rangeEstimate*i/(N-1);
                const circle_x = radius * Math.cos(v);
                const circle_z = radius * Math.sin(v);
                const xt = extras.vertex.x + u*axisVec[0] + circle_x*perpVec[0];
                const yt = extras.vertex.y + u*axisVec[1] + circle_x*perpVec[1];
                x_row.push(xt); y_row.push(yt); z_row.push(circle_z);
            }
            x_s.push(x_row); y_s.push(y_row); z_s.push(z_row);
        }
    } else if (Math.abs(extras.Fp) < 1e-9 && type !== 'парабола') {
        const lambda = extras.lambda;
        if (!lambda || lambda.length < 2 || lambda[0] * lambda[1] >= 0) {
            alert("3D-вигляд для цієї виродженої кривої (точка або уявний еліпс) не будується.");
            toggle3DView(); return;
        }
        title = "3D-модель: Подвійний конус";
        const slope = Math.sqrt(-lambda[0] / lambda[1]);
        for (let i=0; i<N; i++) {
            let x_row = [], y_row = [], z_row = [];
            for (let j=0; j<N; j++) {
                const v = -Math.PI + 2*Math.PI*j/(N-1);
                const u = -rangeEstimate + 2*rangeEstimate*i/(N-1);
                const xp = u;
                const yp = slope*u*Math.cos(v);
                const zp = slope*u*Math.sin(v);
                const xt = center.x + xp*vecs[0][0] + yp*vecs[1][0];
                const yt = center.y + xp*vecs[0][1] + yp*vecs[1][1];
                x_row.push(xt); y_row.push(yt); z_row.push(zp);
            }
            x_s.push(x_row); y_s.push(y_row); z_s.push(z_row);
        }
    }
    else if ((extras.a && extras.b) || (type === 'парабола' && extras.focal_dist)) {
        let { a, b } = extras;
        if (type === 'коло') b = a;
        for (let i = 0; i < N; i++) {
            let x_row = [], y_row = [], z_row = [];
            for (let j = 0; j < N; j++) {
                const v = -Math.PI + 2*Math.PI*j/(N-1);
                let u, xp, yp, zp;
                 if (type==='гіпербола') { rangeEstimate=Math.max(a,b)*2; u=-1.5+3*i/(N-1); xp=a*Math.cosh(u)*Math.cos(v); yp=b*Math.cosh(u)*Math.sin(v); zp=a*Math.sinh(u); }
                 else if (type==='еліпс'||type==='коло') { rangeEstimate=Math.max(a,b)*1.5; u=-Math.PI/2+Math.PI*i/(N-1); const c_z=(a+b)/2; xp=a*Math.cos(u)*Math.cos(v); yp=b*Math.cos(u)*Math.sin(v); zp=c_z*Math.sin(u); }
                 else if (type==='парабола') { rangeEstimate=Math.abs(extras.focal_dist)*8; a=rangeEstimate; u=a*i/(N-1); xp=u*Math.cos(v); yp=u*Math.sin(v); zp=(u*u)/(4*extras.focal_dist); }
                 else continue;
                const xt_local = xp*vecs[0][0] + yp*vecs[1][0];
                const yt_local = xp*vecs[0][1] + yp*vecs[1][1];
                x_row.push(center.x + xt_local);
                y_row.push(center.y + yt_local);
                z_row.push(zp);
            }
            x_s.push(x_row); y_s.push(y_row); z_s.push(z_row);
        }
    } else {
        alert("3D-вигляд неможливо побудувати для цього рівняння.");
        toggle3DView(); return;
    }

    data.push({
        x: x_s, y: y_s, z: z_s,
        type: 'surface', colorscale: 'Viridis', showscale: false, opacity: 0.95,
        lighting: { ambient: 0.8, diffuse: 0.8, specular: 0.2, roughness: 0.5, fresnel: 0.2 }
    });

    const isLight = document.body.classList.contains('theme-light');
    const range = Math.max(rangeEstimate, 5);
    const plotCenter = center || extras.vertex || { x: 0, y: 0 };

    const layout3D = {
        title: title,
        scene: {
            xaxis: { title: 'X', range: [-range + plotCenter.x, range + plotCenter.x], backgroundcolor: isLight ? "#f0f6ff" : "#0d1b2a", gridcolor: isLight ? "#ddd" : "#2a3a4a" },
            yaxis: { title: 'Y', range: [-range + plotCenter.y, range + plotCenter.y], backgroundcolor: isLight ? "#f0f6ff" : "#0d1b2a", gridcolor: isLight ? "#ddd" : "#2a3a4a" },
            zaxis: { title: 'Z', range: [-range, range], backgroundcolor: isLight ? "#f0f6ff" : "#0d1b2a", gridcolor: isLight ? "#ddd" : "#2a3a4a" },
            camera: { eye: {x: 1.5, y: 1.5, z: 1.2} }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 0, r: 0, t: 40, b: 0 }
    };

    await Plotly.react('graphCanvas', data, layout3D, {responsive: true});
}


// --- ДОПОМІЖНІ ФУНКЦІЇ ---

// ОНОВЛЕНО: displayAnalysis тепер показує дотичну
function displayAnalysis(analysis) {
    // ... (код displayAnalysis без змін, як у попередній версії) ...
    const { type, extras, parsed } = analysis;
    const f = n => (n === undefined || n === null || isNaN(n)) ? 'N/A' : n.toFixed(2);
    let html = `<div><strong>Тип:</strong> ${type.toUpperCase()}`;
    if(extras.isDegenerate || (Math.abs(extras.Fp) < 1e-9 && type !== 'парабола')) { html += ` (вироджена)`; }
    html += `</div>`;
    if (extras.center) html += `<div><strong>Центр:</strong> (${f(extras.center.x)}, ${f(extras.center.y)})</div>`;
    if (extras.vertex) html += `<div><strong>Вершина:</strong> (${f(extras.vertex.x)}, ${f(extras.vertex.y)})</div>`;
    if ((type === 'еліпс' || type === 'коло') && extras.a) { html += `<div><strong>Велика піввісь (a):</strong> ${f(extras.a)}</div><div><strong>Мала піввісь (b):</strong> ${f(extras.b)}</div>`; }
    else if (type === 'гіпербола' && extras.a) { html += `<div><strong>Дійсна піввісь (a):</strong> ${f(extras.a)}</div><div><strong>Уявна піввісь (b):</strong> ${f(extras.b)}</div>`; }
    if (type === 'гіпербола' && extras.latus_rectum && !isNaN(extras.latus_rectum)) html += `<div><strong>Фокальний параметр (2p):</strong> ${f(extras.latus_rectum)}</div>`;
    if (extras.e !== undefined) html += `<div><strong>Ексцентриситет (e):</strong> ${f(extras.e)}</div>`;
    if (extras.f1 && extras.f2) html += `<div><strong>Фокуси:</strong><br>F1(${f(extras.f1[0])}, ${f(extras.f1[1])})<br>F2(${f(extras.f2[0])}, ${f(extras.f2[1])})</div>`;
    else if (extras.focus) html += `<div><strong>Фокус:</strong> F(${f(extras.focus.x)}, ${f(extras.focus.y)})</div>`;

    const f_canon = n => Number.isInteger(n) ? n : n.toFixed(3).replace(/\.?0+$/, "");
    let canonicalHtml = '';
    if (type !== 'парабола' && extras.a && extras.b && extras.lambda && !isNaN(extras.a) && !isNaN(extras.b)) {
        const a_sq = f_canon(extras.a * extras.a), b_sq = f_canon(extras.b * extras.b);
        const sign = (extras.lambda[0] * extras.lambda[1] < 0) ? "-" : "+";
        canonicalHtml = `$$ \\frac{(x'')^2}{${a_sq}} ${sign} \\frac{(y'')^2}{${b_sq}} = 1 $$`;
    } else if (type === 'парабола' && extras.lambda !== undefined && extras.E_prime !== undefined && !isNaN(extras.lambda) && !isNaN(extras.E_prime)) {
         if (Math.abs(extras.lambda) > 1e-9) {
             const p = -extras.E_prime / extras.lambda;
             canonicalHtml = `$$ (x'')^2 = ${f_canon(p)}y'' $$`;
         } else { canonicalHtml = ' (Вироджений випадок параболи)'; }
    }
    if (canonicalHtml) html += `<div><strong>Канонічне рівняння:</strong>${canonicalHtml}</div>`;

    if (window.lastTangentInfo) {
        const pt = window.lastTangentInfo.point;
        html += `<hr style="border-top: 1px solid rgba(128,128,128,0.2); margin: 8px 0;">`;
        html += `<div><strong>Дотична в точці (${f(pt.x)}, ${f(pt.y)}):</strong><br> ${window.lastTangentInfo.eqStr}</div>`;
    }

    if ($('solveOutput')) $('solveOutput').innerHTML = html;
    if ($('stepsOutput')) $('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
}

function getExtrasTraces(analysis, range) {
    // ... (код getExtrasTraces без змін) ...
     const traces = [], { extras, type } = analysis;
    if (!extras || extras.isDegenerate) return [];

    const center = extras.center || extras.vertex;

    if (center && !isNaN(center.x) && !isNaN(center.y)) {
        traces.push({
            x: [center.x], y: [center.y], mode: 'markers+text', name: 'Центр/Вершина',
            marker: { color: '#ff4d4d', size: 8 },
            text: [extras.center ? 'Центр' : 'Вершина'], textposition: 'top right', hoverinfo: 'skip'
        });
    }

    if (extras.f1 && extras.f2 && !isNaN(extras.f1[0]) && !isNaN(extras.f2[0])) {
        traces.push({
            x: [extras.f1[0], extras.f2[0]], y: [extras.f1[1], extras.f2[1]], mode: 'markers', name: 'Фокуси',
            marker: { color: '#FFEB3B', size: 8 }, hoverinfo: 'skip'
        });
    } else if (extras.focus && !isNaN(extras.focus.x)) {
        traces.push({
            x: [extras.focus.x], y: [extras.focus.y], mode: 'markers', name: 'Фокус',
            marker: { color: '#FFEB3B', size: 8 }, hoverinfo: 'skip'
        });
    }

    if (type !== 'парабола' && extras.center && extras.vecs && extras.a && extras.c && !isNaN(extras.a) && !isNaN(extras.c) && extras.c > 1e-6) {
        Solver.directrixSegments(extras.center, extras.vecs, extras.a, extras.c, range).forEach(s =>
            traces.push({x: s.xs, y: s.ys, mode: 'lines', name: 'Директриси', line: { color: '#80cbc4', dash: 'dash' }, hoverinfo: 'skip' })
        );
    } else if (type === 'парабола' && extras.vertex && extras.v_axis && extras.focal_dist && !isNaN(extras.focal_dist)) {
        const seg = Solver.parabolaDirectrixSegment(extras.vertex, extras.v_axis, extras.focal_dist, range);
        traces.push({x: seg.xs, y: seg.ys, mode: 'lines', name: 'Директриса', line: { color: '#80cbc4', dash: 'dash' }, hoverinfo: 'skip' });
    }

    if (extras.vecs && center) {
        const [mainVec, minorVec] = extras.vecs;
        let axisVec = (type === 'парабола' && extras.v_axis) ? extras.v_axis : mainVec;
        if (axisVec) {
             traces.push({
                 x: [center.x - range * axisVec[0], center.x + range * axisVec[0]],
                 y: [center.y - range * axisVec[1], center.y + range * axisVec[1]],
                 mode: 'lines', name: 'Головна вісь', line: { color: '#ff9800', width: 1.5 }, hoverinfo: 'skip'
             });
        }
        if (type !== 'парабола' && minorVec) {
             traces.push({
                 x: [center.x - range * minorVec[0], center.x + range * minorVec[0]],
                 y: [center.y - range * minorVec[1], center.y + range * minorVec[1]],
                 mode: 'lines', name: 'Побічна вісь', line: { color: '#ba68c8', dash: 'dot', width: 1.5 }, hoverinfo: 'skip'
             });
        }
    }

    if (type === 'гіпербола' && extras.center && extras.vecs && extras.a && extras.b && !isNaN(extras.a) && !isNaN(extras.b)) {
        Solver.asymptoteSegments(extras.center, extras.vecs, extras.a, extras.b, range).forEach(s =>
            traces.push({ x: s.xs, y: s.ys, mode: 'lines', name: 'Асимптоти', line: { color: '#f44336', dash: 'longdashdot', width: 1.5 }, hoverinfo: 'skip'})
        );
    }

    return traces;
}


function buildGrid(A,B,C,D,E,F, range, N){
    // ... (код buildGrid без змін) ...
     const x = Array.from({length: N}, (_, i) => -range + 2*range*i/(N-1));
    const y = [...x];
    const z = y.map(yi => x.map(xi => Math.fround(A*xi*xi + B*xi*yi + C*yi*yi + D*xi + E*yi + F)));
    return {x, y, z};
}

function estimateRangeForPlot(parsed, extras){
    // ... (код estimateRangeForPlot без змін) ...
     let r = 8;
    const coeffs = [parsed.A, parsed.B, parsed.C, parsed.D, parsed.E, parsed.F].map(Math.abs).filter(c => c > 1e-6);
    if (coeffs.length > 0) {
        const maxCoeff = Math.max(...coeffs);
        const minCoeff = Math.min(...coeffs);
        r = Math.max(5, Math.min(50, 15 / Math.pow(maxCoeff, 0.2) + Math.log1p(1/minCoeff) ));
    }
    if (extras.a && !isNaN(extras.a)) r = Math.max(r, extras.a * 2.2 + (extras.c || 0));
    if (extras.vertex && !isNaN(extras.vertex.x) && !isNaN(extras.vertex.y)) {
         r = Math.max(r, Math.abs(extras.vertex.x)*1.5, Math.abs(extras.vertex.y)*1.5, 5);
    }
    return Math.min(r, 100);
}

function getLayout(range){
    // ... (код getLayout без змін) ...
    const isLight = document.body.classList.contains('theme-light');
    const axisColor = isLight ? '#333' : '#9aa4ad';
    const gridColor = isLight ? '#eee' : 'rgba(255,255,255,0.08)';
    const labelColor = isLight ? '#000' : '#fff';
    return {
        xaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, gridcolor: gridColor },
        yaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, scaleanchor: 'x', scaleratio: 1, gridcolor: gridColor },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 20, b: 40 },
        showlegend: false,
        clickmode: 'event',
        hovermode: 'closest',
        annotations: [
            { xref: 'paper', yref: 'yaxis', x: 1.02, y: 0, text: 'X', showarrow: false, font:{color: labelColor, size: 14}},
            { xref: 'xaxis', yref: 'paper', x: 0, y: 1.02, text: 'Y', showarrow: false, font:{color: labelColor, size: 14}}
        ],
        shapes: []
    };
}


function loadEquationFromURLOrStorage() {
    // ... (код loadEquationFromURLOrStorage без змін) ...
     const eqInput = $('equationInput');
    if (!eqInput) return;
    const urlParams = new URLSearchParams(window.location.search);
    const eqFromUrl = urlParams.get('eq');
    if (eqFromUrl) {
        eqInput.value = decodeURIComponent(eqFromUrl);
    } else {
        const lastEq = localStorage.getItem('conics_last_equation');
        if (lastEq) {
            eqInput.value = lastEq;
        }
    }
    syncCoeffBoxes();
    if (eqInput.value) {
        analyzeAndPlot();
    }
}

function shareEquation() {
    // ... (код shareEquation без змін) ...
    syncEquationInput();
    const eq = $('equationInput').value.trim();
    if (!eq) { alert("Введіть рівняння, щоб поділитися ним."); return; }
    const encodedEq = encodeURIComponent(eq);
    const url = `${window.location.origin}${window.location.pathname}?eq=${encodedEq}`;
    navigator.clipboard.writeText(url).then(() => { alert("Посилання скопійовано в буфер обміну!"); }, () => { alert("Не вдалося скопіювати посилання."); });
}

function setupDragAndDrop() {
    // ... (код setupDragAndDrop без змін) ...
     const trashCan = $('trashCan'), exampleList = $('exampleList');
    if (!trashCan || !exampleList) return;
    let draggedIndex = null;
    trashCan.addEventListener('dragover', (e) => { e.preventDefault(); trashCan.classList.add('over'); });
    trashCan.addEventListener('dragleave', () => { trashCan.classList.remove('over'); });
    trashCan.addEventListener('drop', (e) => { e.preventDefault(); trashCan.classList.remove('over'); const index = parseInt(e.dataTransfer.getData('text/plain'), 10); if (!isNaN(index)) { Solver.examples.splice(index, 1); Solver.persistExamples(); renderExampleList(); } });
    exampleList.addEventListener('dragstart', (e) => { if (e.target.matches('.btn')) { draggedIndex = parseInt(e.target.dataset.index, 10); e.dataTransfer.setData('text/plain', draggedIndex); } });
    exampleList.addEventListener('dragover', (e) => { e.preventDefault(); const target = e.target.closest('.btn'); if (target) { exampleList.querySelectorAll('.btn').forEach(btn => btn.classList.remove('drag-over')); target.classList.add('drag-over'); } });
    exampleList.addEventListener('dragleave', (e) => { const target = e.target.closest('.btn'); if (target) target.classList.remove('drag-over'); });
    exampleList.addEventListener('drop', (e) => { e.preventDefault(); const target = e.target.closest('.btn'); if (target) target.classList.remove('drag-over'); if (draggedIndex !== null) { const targetIndex = parseInt(target.dataset.index, 10); if (draggedIndex !== targetIndex) { const [item] = Solver.examples.splice(draggedIndex, 1); Solver.examples.splice(targetIndex, 0, item); Solver.persistExamples(); renderExampleList(); } } });
}

function renderExampleList() {
    // ... (код renderExampleList без змін) ...
    const eqInput = $('equationInput');
    const node = $('exampleList');
    if (!node) return;
    node.innerHTML = '';
    (Solver.examples || []).forEach((eq, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn subtle';
        btn.textContent = eq;
        btn.draggable = true;
        btn.dataset.index = index;
        btn.onclick = () => {
            eqInput.value = eq;
            syncCoeffBoxes();
            analyzeAndPlot();
        };
        node.appendChild(btn);
    });
}

function openLibraryModal() {
    // ... (код openLibraryModal без змін) ...
     const eqInput = $('equationInput');
    const modal = $('libraryModal'), content = $('libraryContent');
    if (!modal || !content) return;
    content.innerHTML = '';
    Solver.equationLibrary.forEach(category => {
        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = category.category;
        content.appendChild(categoryTitle);
        const grid = document.createElement('div');
        grid.className = 'library-grid';
        category.equations.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerHTML = `<strong>${item.name}:</strong><br>${item.eq}`;
            btn.onclick = () => {
                eqInput.value = item.eq;
                syncCoeffBoxes();
                closeLibraryModal();
                analyzeAndPlot();
            };
            grid.appendChild(btn);
        });
        content.appendChild(grid);
    });
    modal.classList.remove('hidden');
}

function closeLibraryModal() {
    // ... (код closeLibraryModal без змін) ...
     const modal = $('libraryModal');
    if (modal) modal.classList.add('hidden');
}