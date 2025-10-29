/* tasks.js
    - Handles logic for the tasks page.
    - Switches between different tasks.
    - Toggles the visibility of solutions.
    - Запам'ятовує останню відкриту задачу.
    - Малює графіки у розв'язках.
    - ОНОВЛЕНО: Графіки тепер відображають результат розв'язання (включаючи дотичну для задачі 4).
*/

// --- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ГРАФІКІВ ---

function buildGrid(A, B, C, D, E, F, range, N) {
    const x = Array.from({ length: N }, (_, i) => -range + 2 * range * i / (N - 1));
    const y = [...x];
    const z = y.map(yi => x.map(xi => (A * xi * xi + B * xi * yi + C * yi * yi + D * xi + E * yi + F)));
    return { x, y, z };
}

function getTaskLayout(range) {
    const isLight = document.body.classList.contains('theme-light');
    const axisColor = isLight ? '#333' : '#9aa4ad';
    const gridColor = isLight ? '#eee' : 'rgba(255,255,255,0.08)';
    const bgColor = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0,0,0,0.1)';

    return {
        xaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, gridcolor: gridColor },
        yaxis: { range: [-range, range], showgrid: true, zeroline: true, zerolinewidth: 1.5, zerolinecolor: axisColor, tickfont: { color: axisColor }, scaleanchor: 'x', scaleratio: 1, gridcolor: gridColor },
        plot_bgcolor: bgColor, 
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 20, b: 40 },
        showlegend: false,
        hovermode: false
    };
}

/**
 * Малює простий графік за об'єктом аналізу.
 * ОНОВЛЕНО: Тепер приймає опціональний trace для дотичної.
 */
async function plotSimpleGraph(analysis, targetDivId, viewRange, additionalTraces = []) {
    const graphDiv = document.getElementById(targetDivId);
    if (!graphDiv) return; // Div не знайдено

    // Очищаємо div перед малюванням, щоб забезпечити оновлення
    graphDiv.innerHTML = '';
    
    const { parsed, extras } = analysis;
    const dataRange = viewRange * 10; 
    const N = 201; 
    
    const grid = buildGrid(parsed.A, parsed.B, parsed.C, parsed.D, parsed.E, parsed.F, dataRange, N);
    
    const data = [{
        x: grid.x, y: grid.y, z: grid.z, type: 'contour',
        contours: { start: 0, end: 0, size: 1, coloring: 'none' },
        line: { color: '#00ffff', width: 2.5, smoothing: 1.3 },
        showscale: false, hoverinfo: 'none'
    }];

    // Додаємо асимптоти для гіпербол
    if (analysis.type === 'гіпербола' && extras.center && extras.vecs && extras.a && extras.b) {
        Solver.asymptoteSegments(extras.center, extras.vecs, extras.a, extras.b, viewRange).forEach(s =>
            data.push({ x: s.xs, y: s.ys, mode: 'lines', name: 'Асимптоти', line: { color: '#f44336', dash: 'longdashdot', width: 1.5 }, hoverinfo: 'none'})
        );
    }

    // Додаємо опціональні traces (наприклад, дотичну)
    data.push(...additionalTraces);

    const layout = getTaskLayout(viewRange);
    await Plotly.newPlot(graphDiv, data, layout, {responsive: true, staticPlot: true});
}

/**
 * Визначає, яке рівняння та елементи малювати для якої задачі.
 */
function renderTaskGraph(taskId) {
    let equation = '';
    let viewRange = 10; 
    let additionalTraces = []; // Для дотичних, тощо

    switch (taskId) {
        case 'task-1':
            equation = 'x^2/16 - y^2/9 = 1'; // Рівняння з умови/відповіді
            viewRange = 10;
            break;
        case 'task-2':
            equation = 'x^2/16 - y^2/9 = 1'; // Рівняння з відповіді
            viewRange = 10;
            break;
        case 'task-3':
            equation = 'x^2/25 - y^2/144 = 1'; // Рівняння з умови
            viewRange = 30; 
            break;
        case 'task-4':
            equation = 'x^2/9 - y^2/16 = 1'; // Рівняння гіперболи з умови
            viewRange = 15;
            // --- ОНОВЛЕНО: Розрахунок та додавання дотичної ---
            const tangentEquation = '5*x - 3*y - 9 = 0'; // Рівняння дотичної з відповіді
            // Fx = 5, Fy = -3, c = -9
            const Fx_t4 = 5, Fy_t4 = -3, c_t4 = -9;
            let x0_t4 = -viewRange, y0_t4 = (-Fx_t4 * x0_t4 - c_t4) / Fy_t4;
            let x1_t4 = viewRange, y1_t4 = (-Fx_t4 * x1_t4 - c_t4) / Fy_t4;
            additionalTraces.push({ 
                x: [x0_t4, x1_t4], y: [y0_t4, y1_t4], 
                mode: 'lines', name: 'Дотична', 
                line: { color: '#ff6b6b', dash: 'longdash', width: 2 }, 
                hoverinfo: 'none'
            });
            // --- КІНЕЦЬ ОНОВЛЕННЯ ---
            break;
        default:
            return; 
    }

    if (typeof Solver === 'undefined' || typeof Plotly === 'undefined') {
        console.error("Solver.js або Plotly не завантажено.");
        return;
    }

    try {
        const parsed = Solver.parseGeneralEquation(equation);
        if (!parsed) {
             console.error(`Не вдалося розібрати рівняння для ${taskId}: ${equation}`);
             return;
        }
        const analysis = Solver.analyzeGeneral(parsed);
        // Передаємо additionalTraces у функцію побудови
        plotSimpleGraph(analysis, `${taskId}-graph`, viewRange, additionalTraces);
    } catch (e) {
        console.error(`Помилка при малюванні графіка для ${taskId}:`, e);
    }
}

// --- ОСНОВНА ЛОГІКА СТОРІНКИ ---

document.addEventListener('DOMContentLoaded', () => {
    const taskNavButtons = document.querySelectorAll('.task-nav-btn');
    const taskContents = document.querySelectorAll('.task-content');
    const toggleSolutionButtons = document.querySelectorAll('.toggle-solution-btn');

    // Handle switching between tasks
    taskNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTaskId = button.dataset.taskId;
            taskNavButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            taskContents.forEach(content => {
                content.classList.toggle('active', content.id === targetTaskId);
            });
            localStorage.setItem('conics_last_task_id', targetTaskId);
        });
    });

    // Handle showing/hiding solutions
    toggleSolutionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const solutionPanel = button.nextElementSibling;
            if (solutionPanel && solutionPanel.classList.contains('solution-panel')) {
                solutionPanel.classList.toggle('hidden');
                
                if (solutionPanel.classList.contains('hidden')) {
                    button.textContent = 'Показати розв\'язання';
                } else {
                    button.textContent = 'Сховати розв\'язання';
                    // Малюємо графік ТІЛЬКИ ЯКЩО DIV ПОРОЖНІЙ
                    const taskId = button.closest('.task-content').id;
                    const graphDiv = document.getElementById(`${taskId}-graph`);
                    if (graphDiv && graphDiv.innerHTML === '') { // Перевірка на порожнечу
                        renderTaskGraph(taskId);
                    }
                }
            }
        });
    });

    // --- Логіка завантаження теми ---
    const theme = localStorage.getItem('conics_theme') || 'dark';
    document.body.classList.toggle('theme-light', theme === 'light');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'light';
        themeToggle.addEventListener('change', () => {
            const isLight = themeToggle.checked;
            document.body.classList.toggle('theme-light', isLight);
            localStorage.setItem('conics_theme', isLight ? 'light' : 'dark');
            
            // --- Очищуємо графіки при зміні теми ---
            document.querySelectorAll('.task-graph-canvas').forEach(div => {
                div.innerHTML = ''; // Очистити, щоб графік перемалювався з новими кольорами
                // Якщо розв'язання вже відкрите, перемалювати негайно
                if (!div.closest('.solution-panel').classList.contains('hidden')) {
                    const taskId = div.id.replace('-graph', '');
                    renderTaskGraph(taskId);
                }
            });
        });
    }

    // --- Завантажуємо останню відкриту задачу ---
    const lastTaskId = localStorage.getItem('conics_last_task_id');
    const targetButton = document.querySelector(`.task-nav-btn[data-task-id="${lastTaskId}"]`) || document.querySelector('.task-nav-btn');
    
    if (targetButton) {
        targetButton.click(); 
    }
});