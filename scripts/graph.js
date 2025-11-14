/* graph.js
    - UI bindings (index.html, canonical.html)
    - uses Solver.* for math
    - draws implicit contour via Plotly (level 0)
    - draws foci, directrices, axes, asymptotes
    - Interactive Modes:
        - Focal Chord Explorer (ВИПРАВЛЕНО)
        - Tangent Line Builder (ОНОВЛЕНО: ручний ввід за коефіцієнтами + пошук за точкою)
        - 3D Surface Viewer
        - Locus Animation
    - ОНОВЛЕНО: Покращено логіку відображення дотичної.
    - ОНОВЛЕНО: Додано відображення рівняння дотичної у блоці аналізу.
    - ОНОВЛЕНО: Підтримка введення дробів у полях коефіцієнтів.
    - ЗМІНЕНО: Дотична та її інструменти з'являються ЛИШЕ після натискання кнопки "Дотична".
*/

document.addEventListener('DOMContentLoaded', initUI);

function $(id){ return document.getElementById(id); }

function initUI(){
    const eqInput = $('equationInput');
    window.isChordExplorerActive = false;
    window.isTangentModeActive = false;
    window.is3DViewActive = false;
    window.isLocusAnimationActive = false;
    window.lastTangentInfo = null;
    window.defaultTangentInfo = null; 

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
        if ($('coeff-A')) syncCoeffBoxes(); // Оновлення для index.html
        localStorage.removeItem('conics_last_equation');
        window.lastAnalysis = null;
        window.lastTangentInfo = null;
        window.defaultTangentInfo = null; 
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

    // Інтерактивні режими
    if ($('exploreChordsBtn')) $('exploreChordsBtn').addEventListener('click', toggleChordExplorer);
    if ($('tangentModeBtn')) $('tangentModeBtn').addEventListener('click', toggleTangentMode);
    if ($('toggle3DBtn')) $('toggle3DBtn').addEventListener('click', toggle3DView);
    if ($('locusAnimationBtn')) $('locusAnimationBtn').addEventListener('click', toggleLocusAnimation);
    
    // Ручна дотична та пошук за точкою
    if ($('plotManualTangentBtn')) $('plotManualTangentBtn').addEventListener('click', plotTangentByEquation);
    if ($('findTangentAtPointBtn')) $('findTangentAtPointBtn').addEventListener('click', findTangentAtPoint);

    if ($('libraryBtn')) {
        $('libraryBtn').addEventListener('click', openLibraryModal);
        $('closeModalBtn').addEventListener('click', closeLibraryModal);
        $('libraryModal').addEventListener('click', (e) => { if(e.target === $('libraryModal')) closeLibraryModal(); });
    }

    const coeffInputs = document.querySelectorAll('.coeff-input');
    coeffInputs.forEach(input => { 
        // ДОЗВОЛИТИ РЯДОК ДЛЯ ДРОБІВ
        input.setAttribute('type', 'text');
        input.addEventListener('input', syncEquationInput); 
    });

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
    
    // Тільки для index.html
    if($('coeff-A')) {
        loadEquationFromURLOrStorage();
    }
    setupGraphEventListeners(); 
}

// --- ОНОВЛЕНО: ВИКОРИСТОВУЄМО parseNumberExpression ---
function syncEquationInput() {
    if (!$('coeff-A')) return; 
    
    // Зчитуємо вхідні рядки, але розраховуємо їх числове значення для рівняння
    const A = Solver.parseNumberExpression($('coeff-A').value);
    const B = Solver.parseNumberExpression($('coeff-B').value);
    const C = Solver.parseNumberExpression($('coeff-C').value);
    const D = Solver.parseNumberExpression($('coeff-D').value);
    const E = Solver.parseNumberExpression($('coeff-E').value);
    const F = Solver.parseNumberExpression($('coeff-F').value);

    let eq = '';
    const addTerm = (coeff, term) => {
        if (Math.abs(coeff) < 1e-9) return '';
        let sign = coeff > 0 ? '+ ' : '- ';
        let val = Math.abs(coeff);
        if (eq === '' && sign === '+ ') sign = '';
        if (Math.abs(val - 1) < 1e-9 && term !== '') val = ''; // val = 1
        else val = val.toFixed(5).replace(/\.?0+$/, ''); // Точне відображення

        return `${sign}${val}${term} `;
    };

    eq += addTerm(A, 'x^2');
    eq += addTerm(B, 'xy');
    eq += addTerm(C, 'y^2');
    eq += addTerm(D, 'x');
    eq += addTerm(E, 'y');
    eq += addTerm(F, '');

    if (eq.length > 0) eq = eq.trimEnd().replace(/^\+ /, '') + ' = 0';

    $('equationInput').value = eq.trim();
}

// --- ОНОВЛЕНО: ЗАПОВНЕННЯ ВВОДУ, НЕ ЗМІНЮЮЧИ ФОРМАТ ДРОБУ ---
function syncCoeffBoxes() {
    if (!$('coeff-A')) return;
    
    const eq = $('equationInput').value;
    const parsed = Solver.parseGeneralEquation(eq);

    if (parsed) {
        // Заповнюємо чистими числами, оскільки ми не знаємо, як користувач ввів дріб
        const f = n => Math.abs(n) < 1e-9 ? '' : n.toFixed(5).replace(/\.?0+$/, '');
        $('coeff-A').value = f(parsed.A);
        $('coeff-B').value = f(parsed.B);
        $('coeff-C').value = f(parsed.C);
        $('coeff-D').value = f(parsed.D);
        $('coeff-E').value = f(parsed.E);
        $('coeff-F').value = f(parsed.F);
    } else {
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => $(`coeff-${c}`).value = '');
    }
}


// --- ЛОГІКА КЕРУВАННЯ ІНТЕРАКТИВНИМИ РЕЖИМАМИ ---

function setupGraphEventListeners() {
    const canvas = $('graphCanvas');
    if (canvas && canvas.layout) {
        try {
            canvas.removeAllListeners('plotly_hover');
            canvas.removeAllListeners('plotly_click');
            canvas.removeAllListeners('plotly_unhover');
            canvas.on('plotly_hover', handleGraphHover);
            canvas.on('plotly_click', handleGraphClick);
            canvas.on('plotly_unhover', handleGraphUnhover);
        } catch (e) {
            console.error("Failed to attach Plotly listeners:", e);
        }
    } else {
        setTimeout(setupGraphEventListeners, 100);
    }
}


function handleGraphUnhover() {
    if(window.isChordExplorerActive) {
        $('chordLengthDisplay').style.display = 'none';
        const graphDiv = $('graphCanvas');
        const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
        // ВИПРАВЛЕНО: Фільтруємо (ВИДАЛЯЄМО) 'focal-chord', а не зберігаємо 'tangent-line'
        const newShapes = currentShapes.filter(s => s.name !== 'focal-chord');
        if (newShapes.length !== currentShapes.length) { Plotly.relayout(graphDiv, { shapes: newShapes }); }
    }
}

// --- ЗМІНА: deactiveAllModes ---
function deactivateAllModes() {
    if (window.isLocusAnimationActive) {
        LocusAnimator.stop();
        const graphDiv = $('graphCanvas');
        if (graphDiv.data && graphDiv.data.length > 0) { Plotly.restyle(graphDiv, { visible: true }, [0, 1]); }
    }
    window.isChordExplorerActive = false;
    window.isTangentModeActive = false;
    window.isLocusAnimationActive = false;

    $('exploreChordsBtn')?.classList.remove('active');
    $('tangentModeBtn')?.classList.remove('active');
    $('locusAnimationBtn')?.classList.remove('active');

    $('chordLengthDisplay').style.display = 'none';
    $('tangentInfoDisplay').style.display = 'none';
    $('manualTangentContainer')?.classList.add('hidden'); // Ховаємо поле вводу

    const graphDiv = $('graphCanvas');
    if (graphDiv.layout) { 
        // ЗМІНА: Повністю очищуємо всі дотичні та точки
        Plotly.relayout(graphDiv, { shapes: [] }); 
    }

    // ЗМІНА: Скидаємо останню дотичну
    window.lastTangentInfo = null; 

    if (window.lastAnalysis) displayAnalysis(window.lastAnalysis);
}
// --- КІНЕЦЬ ЗМІНИ ---

function toggleChordExplorer() {
    const willBeActive = !window.isChordExplorerActive;
    if (window.is3DViewActive && window.lastAnalysis) { plotAnalysis(window.lastAnalysis); }
    deactivateAllModes();
    window.isChordExplorerActive = willBeActive;
    $('exploreChordsBtn').classList.toggle('active', willBeActive);
}

// --- ЗМІНА: toggleTangentMode ---
function toggleTangentMode() {
    const willBeActive = !window.isTangentModeActive;
    if (window.is3DViewActive && window.lastAnalysis) { plotAnalysis(window.lastAnalysis); }
    deactivateAllModes(); // Це вже скине lastTangentInfo і очистить shapes
    
    window.isTangentModeActive = willBeActive;
    $('tangentModeBtn').classList.toggle('active', willBeActive);
    
    if (!willBeActive) {
        // Режим ВИМКНЕНО
        // lastTangentInfo ВЖЕ скинуто
        // shapes ВЖЕ очищено
        // manualTangentContainer ВЖЕ приховано
        $('tangentInfoDisplay').style.display = 'none';
        
    } else {
         // Режим УВІМКНЕНО
         // lastTangentInfo ВЖЕ скинуто
         // shapes ВЖЕ очищено
         $('tangentInfoDisplay').textContent = 'Натисніть на криву або задайте дотичну.';
         $('tangentInfoDisplay').style.display = 'block';
         $('manualTangentContainer').classList.remove('hidden'); 
    }
    // Перемальовуємо displayAnalysis, щоб прибрати/показати блок дотичної
    displayAnalysis(window.lastAnalysis); 
}
// --- КІНЕЦЬ ЗМІНИ ---

function toggle3DView() {
    const willBeActive = !window.is3DViewActive;
    deactivateAllModes();
    window.is3DViewActive = willBeActive; 
    if (willBeActive) {
        if (window.lastAnalysis) {
            $('toggle3DBtn').classList.add('active');
            plot3DView(window.lastAnalysis);
        } else {
            alert("Спочатку побудуйте 2D-графік.");
            window.is3DViewActive = false;
        }
    } else {
        $('toggle3DBtn').classList.remove('active');
        if (window.lastAnalysis) {
            plotAnalysis(window.lastAnalysis);
        }
    }
}

function toggleLocusAnimation() {
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
                Plotly.restyle(graphDiv, { visible: false }, [0, 1]); // Ховаємо основну криву
            }
            const onAnimationComplete = () => {
                if (graphDiv.data && graphDiv.data.length > 0) {
                    Plotly.restyle(graphDiv, { visible: true }, [0, 1]); // Показуємо знову
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
        // Якщо вимкнули вручну
        if (graphDiv.data && graphDiv.data.length > 0) {
            Plotly.restyle(graphDiv, { visible: true }, [0, 1]);
        }
    }
}


// --- ОБРОБНИКИ ПОДІЙ НА ГРАФІКУ ---

function handleGraphHover(data) {
    // ВИПРАВЛЕНО: Режим хорд
    if (!window.isChordExplorerActive || !window.lastAnalysis || !data || !data.points || data.points.length === 0) return;
    const pointData = data.points[0];

    if (pointData.curveNumber !== 0 && pointData.curveNumber !== 1) { 
         return;
    }

    const {extras, parsed} = window.lastAnalysis, foci=[];
    if (extras.f1 && extras.f2) foci.push(extras.f1, extras.f2);
    else if (extras.focus) foci.push([extras.focus.x, extras.focus.y]);
    if (foci.length === 0) { return; }

    const probePoint = [pointData.x, pointData.y];
    let closestFocus = foci[0];
    if (foci.length > 1) {
        const d1 = Math.hypot(probePoint[0] - foci[0][0], probePoint[1] - foci[0][1]);
        const d2 = Math.hypot(probePoint[0] - foci[1][0], probePoint[1] - foci[1][1]);
        if (d2 < d1) closestFocus = foci[1];
    }

    const intersections = Solver.getFocalChordIntersections(parsed, closestFocus, probePoint);

    if (intersections && intersections.length === 2) {
        const [p1, p2] = intersections;
        const length = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        const newShape = { name: 'focal-chord', type: 'line', x0: p1[0], y0: p1[1], x1: p2[0], y1: p2[1], line: { color: '#ffeb3b', width: 3 }};

        const graphDiv = $('graphCanvas');
        const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
        // ВИПРАВЛЕНО: Фільтруємо (ВИДАЛЯЄМО) 'focal-chord', зберігаючи решту
        const newShapes = currentShapes.filter(s => s.name !== 'focal-chord'); 
        newShapes.push(newShape); 

        Plotly.relayout(graphDiv, { shapes: newShapes }).catch(e => console.error("Relayout error (hover):", e));

        const d = $('chordLengthDisplay');
        d.textContent = `Довжина хорди: ${length.toFixed(3)}`;
        d.style.display = 'block';
    } else {
         handleGraphUnhover(); 
    }
}

function handleGraphClick(data) {
    if (!window.isTangentModeActive || !window.lastAnalysis || !data || !data.points || data.points.length === 0) return;
    
    const pointData = data.points[0];
    const point = { x: pointData.x, y: pointData.y };
    
    const isClick = pointData.curveNumber !== undefined;
    
    if (isClick && (pointData.curveNumber !== 0 && pointData.curveNumber !== 1)) {
        return; // Клік не по кривій
    }

    const tangent = Solver.getTangentLineAtPoint(window.lastAnalysis.parsed, point);

    const graphDiv = $('graphCanvas');
    const layout = graphDiv.layout;
    if (!layout || !layout.xaxis || !layout.yaxis || !layout.xaxis.range || !layout.yaxis.range) { console.error("Layout invalid"); return; }
    
    let shapes = [];

    if (tangent) {
        window.lastTangentInfo = { point: point, eqStr: tangent.eqStr }; 

        const { Fx, Fy, c } = tangent;
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
        } else { console.error("Cannot draw tangent, Fx and Fy near zero"); return; } 

        const tangentShape = {
            name: 'tangent-line', type: 'line',
            x0: x0, y0: y0, x1: x1, y1: y1,
            line: { color: '#ff6b6b', width: 2.5, dash: 'longdash' }
        };
        shapes.push(tangentShape); 
        
        shapes.push({
             name: 'tangent-point', type: 'circle',
             xref: 'x', yref: 'y',
             x0: point.x - 0.1, y0: point.y - 0.1,
             x1: point.x + 0.1, y1: point.y + 0.1,
             fillcolor: '#ff6b6b', line: { color: '#ff6b6b' }, opacity: 1
         });

        const d = $('tangentInfoDisplay');
        d.innerHTML = `Дотична: <b>${tangent.eqStr}</b><br>у точці (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
        d.style.display = 'block';

        displayAnalysis(window.lastAnalysis); 

    } else {
        window.lastTangentInfo = null; 
        const d = $('tangentInfoDisplay');
        d.textContent = 'Не вдалося побудувати дотичну в цій точці (можливо, це центр).';
        d.style.display = 'block';
        displayAnalysis(window.lastAnalysis); 
    }
    Plotly.relayout(graphDiv, { shapes: shapes }).catch(e => console.error("Relayout error (click):", e));
}

/**
 * ОНОВЛЕНО: Малює дотичну за коефіцієнтами A, B, C (підтримує дроби через Solver)
 */
function plotTangentByEquation() {
    // Зчитуємо введені рядки (можуть бути дробами)
    const Fx = Solver.parseNumberExpression($('tangent-A').value);
    const Fy = Solver.parseNumberExpression($('tangent-B').value);
    const c = Solver.parseNumberExpression($('tangent-C').value);

    if (Math.abs(Fx) < 1e-9 && Math.abs(Fy) < 1e-9) {
        alert("Коефіцієнти A (при x) та B (при y) не можуть одночасно бути нулем.");
        return;
    }

    const graphDiv = $('graphCanvas');
    const layout = graphDiv.layout;
    if (!layout || !layout.xaxis || !layout.yaxis || !layout.xaxis.range || !layout.yaxis.range) { 
        console.error("Layout invalid"); return; 
    }

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
    } else { return; } 

    const tangentShape = {
        name: 'tangent-line', type: 'line',
        x0: x0, y0: y0, x1: x1, y1: y1,
        line: { color: '#ff6b6b', width: 2.5, dash: 'longdash' }
    };
    
    const currentShapes = (graphDiv.layout && graphDiv.layout.shapes) || [];
    const newShapes = currentShapes.filter(s => s.name !== 'tangent-line' && s.name !== 'tangent-point');
    newShapes.push(tangentShape);

    Plotly.relayout(graphDiv, { shapes: newShapes }).catch(e => console.error("Relayout error (manual tangent):", e));

    window.lastTangentInfo = null; // Це ручна дотична, не прив'язана до точки
    const simplifiedEq = Solver.getSimplifiedTangentEqString(Fx, Fy, c);
    $('tangentInfoDisplay').innerHTML = `<b>${simplifiedEq.replace(' = 0', '')}</b> (вручну)`;
    $('tangentInfoDisplay').style.display = 'block';
    
    if(window.lastAnalysis) displayAnalysis(window.lastAnalysis); 
}

/**
 * НОВА ФУНКЦІЯ: Знаходить дотичну в заданій точці (x₀, y₀)
 */
function findTangentAtPoint() {
    const x_val_str = $('tangent-x').value;
    const y_val_str = $('tangent-y').value;
    
    // ДОЗВОЛЯЄМО ДРОБИ
    const x_val = Solver.parseNumberExpression(x_val_str);
    const y_val = Solver.parseNumberExpression(y_val_str);

    if (isNaN(x_val) || isNaN(y_val)) {
        alert("Будь ласка, введіть коректні координати (x₀, y₀). Підтримуються дроби.");
        return;
    }
    if (!window.lastAnalysis) {
        alert("Спочатку побудуйте криву.");
        return;
    }
    
    // Перевірка, чи точка належить кривій (для кращого досвіду)
    const p = window.lastAnalysis.parsed;
    const value = p.A*x_val**2 + p.B*x_val*y_val + p.C*y_val**2 + p.D*x_val + p.E*y_val + p.F;
    if (Math.abs(value) > 1e-3) {
         // Якщо точка не на кривій, даємо попередження, але все одно намагаємося побудувати
         $('tangentInfoDisplay').textContent = `Попередження: Точка (${x_val.toFixed(3)}, ${y_val.toFixed(3)}) не на кривій. Побудовано дотичну в цій точці.`;
         $('tangentInfoDisplay').style.display = 'block';
    }


    // Імітуємо подію кліку, передаючи дані точки
    handleGraphClick({
        points: [{
            x: x_val,
            y: y_val,
            curveNumber: 0 // Важливо: 0 - це завжди основна крива
        }]
    });
}


// --- ОСНОВНІ ФУНКЦІЇ АНАЛІЗУ ТА ПОБУДОВИ ---

// --- ЗМІНА: analyzeAndPlot ---
async function analyzeAndPlot() {
    window.lastTangentInfo = null;
    window.defaultTangentInfo = null; 
    
    if(window.isLocusAnimationActive) { deactivateAllModes(); }
    
    if ($('coeff-A')) syncEquationInput(); 
    
    const eqInput = $('equationInput');
    const raw = eqInput ? eqInput.value.trim() : ''; 
    
    if (!raw && !$('ellipse-a')) return; 
    
    let parsed;
    if ($('coeff-A')) { // index.html
        if (!raw) return;
        localStorage.setItem('conics_last_equation', raw);
        parsed = Solver.parseGeneralEquation(raw);
        if (!parsed) { alert('Не вдалося розібрати рівняння.'); return; }
        syncCoeffBoxes();
    } else { // canonical.html
        if (!window.lastAnalysis) {
             return;
        }
        parsed = window.lastAnalysis.parsed;
    }

    const analysis = Solver.analyzeGeneral(parsed);
    window.lastAnalysis = analysis;
    
    const defaultTangent = Solver.calculateDefaultTangent(parsed, analysis);
    if (defaultTangent) {
        window.defaultTangentInfo = defaultTangent;
        // ЗМІНА: НЕ ВСТАНОВЛЮЄМО lastTangentInfo, щоб не малювати одразу
        // window.lastTangentInfo = defaultTangent; 
    }

    displayAnalysis(analysis);
    if (window.is3DViewActive) await plot3DView(analysis);
    else await plotAnalysis(analysis);
}
// --- КІНЕЦЬ ЗМІНИ ---

function analyzeOnly() {
    window.lastTangentInfo = null;
    window.defaultTangentInfo = null;
    
    if ($('coeff-A')) syncEquationInput();
    
    const raw = $('equationInput').value.trim();
    if (!raw) return;
    localStorage.setItem('conics_last_equation', raw);

    const parsed = Solver.parseGeneralEquation(raw);
    if (!parsed) { alert('Не вдалося розібрати рівняння.'); return; }
    
    if ($('coeff-A')) syncCoeffBoxes();

    const analysis = Solver.analyzeGeneral(parsed);
    window.lastAnalysis = analysis;
    
    const defaultTangent = Solver.calculateDefaultTangent(parsed, analysis);
    if (defaultTangent) {
        window.defaultTangentInfo = defaultTangent;
        // ЗМІНА: НЕ ВСТАНОВЛЮЄМО lastTangentInfo
        // window.lastTangentInfo = defaultTangent;
    }
    
    displayAnalysis(analysis);
}

// --- ЗМІНА: plotAnalysis ---
async function plotAnalysis(analysis) {
    if (!analysis) return; 
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
        uid: 'curve-trace' 
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

    // ЗМІНА: Умова малювання дотичної - ТІЛЬКИ якщо режим активний
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
                 
                 shapes.push({
                     name: 'tangent-point', type: 'circle',
                     xref: 'x', yref: 'y',
                     x0: window.lastTangentInfo.point.x - 0.1, y0: window.lastTangentInfo.point.y - 0.1,
                     x1: window.lastTangentInfo.point.x + 0.1, y1: window.lastTangentInfo.point.y + 0.1,
                     fillcolor: '#ff6b6b', line: { color: '#ff6b6b' }, opacity: 1
                 });
            }
        }
    }
    // --- КІНЕЦЬ ЗМІНИ ---
    
    layout.shapes = shapes;

    await Plotly.react('graphCanvas', data, layout, {responsive: true});
    setupGraphEventListeners(); 
}
// --- КІНЕЦЬ ЗМІНИ ---


async function plot3DView(analysis) {
    if (!analysis) return;
    const { type, extras } = analysis;
    const data = [];
    const N = 80;
    let x_s = [], y_s = [], z_s = [];
    let rangeEstimate = 10;
    let title = `3D-модель: ${type}`;
    const center = extras.center || extras.vertex || {x:0, y:0}; 
    const vecs = extras.vecs || [[1,0],[0,1]]; 

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

function displayAnalysis(analysis) {
    if (!analysis) return;
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

    // ЗМІНА: Блок дотичної відображається ТІЛЬКИ якщо вона є І режим активний
    if (window.lastTangentInfo && window.isTangentModeActive) {
        const pt = window.lastTangentInfo.point;
        let ptLabel = `(${f(pt.x)}, ${f(pt.y)})`;
        
        // (Логіку для "стандартна точка" можна прибрати, оскільки ми більше її не показуємо за замовчуванням)
        ptLabel += ' (обрана точка)';
        
        html += `<hr style="border-top: 1px solid rgba(128,128,128,0.2); margin: 8px 0;">`;
        // ВИКОРИСТОВУЄМО СПРОЩЕНЕ РІВНЯННЯ
        html += `<div><strong>Рівняння дотичної:</strong><br> ${window.lastTangentInfo.eqStr}<br>у точці ${ptLabel}</div>`;
    }

    if ($('solveOutput')) $('solveOutput').innerHTML = html;
    if ($('stepsOutput')) $('stepsOutput').innerHTML = Solver.getSteps(parsed, analysis);
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
}
// --- КІНЕЦЬ ЗМІНИ ---

function getExtrasTraces(analysis, range) {
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
     const x = Array.from({length: N}, (_, i) => -range + 2*range*i/(N-1));
    const y = [...x];
    const z = y.map(yi => x.map(xi => Math.fround(A*xi*xi + B*xi*yi + C*yi*yi + D*xi + E*yi + F)));
    return {x, y, z};
}

function estimateRangeForPlot(parsed, extras){
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
    const eqInput = $('equationInput');
    if (!eqInput) return; // Тільки для index.html
    
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
    if ($('coeff-A')) {
        syncEquationInput();
    }
    
    const eq = $('equationInput').value.trim();
    if (!eq) { alert("Введіть рівняння, щоб поділитися ним."); return; }
    
    const encodedEq = encodeURIComponent(eq);
    const url = `${window.location.origin}${window.location.pathname.replace('canonical.html', 'index.html')}?eq=${encodedEq}`;
    
    navigator.clipboard.writeText(url).then(() => { 
        alert("Посилання скопійовано в буфер обміну!"); 
    }, () => { 
        alert("Не вдалося скопіювати посилання."); 
    });
}

function setupDragAndDrop() {
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
                if ($('coeff-A')) syncCoeffBoxes(); // Синхронізуємо, лише якщо ми на index.html
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
     const modal = $('libraryModal');
    if (modal) modal.classList.add('hidden');
}