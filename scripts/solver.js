/* solver.js
    - parseGeneralEquation(input) -> {A,B,C,D,E,F}
    - parseLinearEquation(input) -> {A,B,C} 
    - analyzeGeneral(parsed) -> { parsed, extras, type, disc }
    - canonicalToXY(center, vecs, u, v)
    - directrixSegments(center, vecs, a, c, range)
    - asymptoteSegments(center, vecs, a, b, range)
    - parabolaDirectrixSegment(vertex, axisVec, focal_dist, range)
    - getSteps(parsed, analysis) -> string
    - examples (localStorage)
    - getTangentLineAtPoint(parsed, point)
    - calculateDefaultTangent(parsed, analysis)
    - getFocalChordIntersections(parsed, focus, pointOnCurve)
    - ОНОВЛЕНО: Додано getSimplifiedTangentEqString
*/

(function() {
    const EXAMPLES_KEY = 'conics_pro_examples_v1';

    // Завантаження прикладів з localStorage або використання стандартних
    function loadExamples() {
        try {
            const raw = localStorage.getItem(EXAMPLES_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error("Failed to load examples from localStorage", e); }
        return [ "x^2/9 - y^2/4 = 1", "y^2/16 - x^2/25 = 1", "5x^2 - 6xy + 5y^2 - 32 = 0", "x^2 + y^2 = 25", "x^2/16 + y^2/9 = 1", "y^2 = 4x" ];
    }
    const examples = loadExamples();
    function persistExamples() { try { localStorage.setItem(EXAMPLES_KEY, JSON.stringify(examples)); } catch (e) {} }
    
    // --- ДОПОМІЖНА МАТЕМАТИКА ДЛЯ СПРОЩЕННЯ ---
    
    // Знаходить НСД за алгоритмом Евкліда
    function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
    }

    // Знаходить НСД для трьох чисел
    function gcd3(a, b, c) {
        return gcd(a, gcd(b, c));
    }
    
    // Перетворює число з плаваючою точкою в його дробове представлення (для спрощення)
    function floatToFraction(floatVal, tolerance = 1e-6) {
        let sign = floatVal < 0 ? -1 : 1;
        let val = Math.abs(floatVal);
        
        let multiplier = 1;
        while (Math.abs(val * multiplier - Math.round(val * multiplier)) > tolerance) {
            multiplier *= 10;
            if (multiplier > 1000000) break; // Обмеження, щоб уникнути нескінченних циклів
        }

        let numerator = Math.round(val * multiplier);
        let denominator = multiplier;
        
        let common = gcd(numerator, denominator);
        
        return { num: sign * (numerator / common), den: denominator / common };
    }
    
    // --- ФУНКЦІЇ ПАРСЕРА ---

    /**
     * Допоміжна функція для обчислення значення коефіцієнта (ПІДТРИМКА ДРОБІВ)
     */
    function parseNumberExpression(str) {
        str = (str || '').trim();
        if (str === '' || str === '+') return 1;
        if (str === '-') return -1;
        
        let sign = 1;
        // Спочатку виносимо знак
        if (str.startsWith('+')) {
            str = str.substring(1);
        } else if (str.startsWith('-')) {
            sign = -1;
            str = str.substring(1);
        }
        
        // Потім видаляємо зовнішні дужки
        if (str.startsWith('(') && str.endsWith(')')) {
            str = str.slice(1, -1);
        }
    
        // Тепер рядок чистий (напр., "1/16" або "5")
        if (str.includes('/')) {
            const [a, b] = str.split('/');
            // Обчислюємо дріб і застосовуємо знак
            return sign * ((parseFloat(a) || 0) / (parseFloat(b) || 1));
        }
        
        // Обчислюємо звичайне число і застосовуємо знак
        const v = parseFloat(str);
        return sign * (Number.isFinite(v) ? v : 0);
    }
    
    /*
     * Парсер загального рівняння
     */
    function parseGeneralEquation(input) {
        if (!input || typeof input !== 'string') return null;
        
        let s = input.replace(/\s+/g, '').replace(/–|−/g, '-');
        
        if (s.includes('=')) {
            const parts = s.split('=');
            if (parts.length !== 2) return null; 
            const lhs = parts[0];
            const rhs = parts[1];
            s = `(${lhs})-(${rhs})`;
        }

        s = s.replace(/([+-]?(?:x\^2|y\^2|xy|x|y))\/(\d+\.?\d*)/g, (match, variable, den) => {
             let sign = '';
             if (variable.startsWith('+')) {
                 sign = '+';
                 variable = variable.substring(1);
             } else if (variable.startsWith('-')) {
                 sign = '-';
                 variable = variable.substring(1);
             }
             sign = sign || '+';
             return `${sign}(1/${den})*${variable}`;
        });
        
        const termRegex = /([+-]?(?:\([^)]+\)|(?:\d*\.\d+|\d+))?)?\*?(x\^2|y\^2|xy|x|y)/g;
        
        if (!s.startsWith('+') && !s.startsWith('-')) {
            s = '+' + s;
        }

        let A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;
        let match;
        
        let remainingStr = s;

        while ((match = termRegex.exec(s)) !== null) {
            remainingStr = remainingStr.replace(match[0], ''); 

            let coeffStr = match[1]; 
            let variable = match[2]; 
            let coeff;

            if (coeffStr === undefined || coeffStr === '+') {
                coeff = 1.0;
            } else if (coeffStr === '-') {
                coeff = -1.0;
            } else {
                coeff = parseNumberExpression(coeffStr);
            }

            if (variable === 'x^2') A += coeff;
            else if (variable === 'y^2') C += coeff;
            else if (variable === 'xy') B += coeff;
            else if (variable === 'x') D += coeff;
            else if (variable === 'y') E += coeff;
        }
        
        remainingStr = remainingStr.replace(/=0$/, '').trim();
        if (remainingStr) {
             if (!remainingStr.startsWith('+') && !remainingStr.startsWith('-')) {
                 remainingStr = '+' + remainingStr;
             }
             const constantMatches = remainingStr.match(/[+-](?:\([^)]+\)|(?:\d*\.\d+|\d+))/g);
             if (constantMatches) {
                 constantMatches.forEach(c => F += parseNumberExpression(c));
             }
        }

        return { A, B, C, D, E, F };
    }
    
    /**
     * Спрощений парсер для лінійних рівнянь (Ax + By + C = 0)
     */
    function parseLinearEquation(input) {
        if (!input || typeof input !== 'string') return null;
        
        let s = input.replace(/\s+/g, '').replace(/–|−/g, '-');
        
        if (s.includes('=')) {
            const parts = s.split('=');
            if (parts.length !== 2) return null;
            s = `(${parts[0]})-(${parts[1]})`;
        }

        const termRegex = /([+-]?(?:\([^)]+\)|(?:\d*\.\d+|\d+))?)?\*?(x|y)/g;
        
        if (!s.startsWith('+') && !s.startsWith('-')) {
            s = '+' + s;
        }

        let A = 0, B = 0, C = 0;
        let match;
        let remainingStr = s;

        while ((match = termRegex.exec(s)) !== null) {
            remainingStr = remainingStr.replace(match[0], ''); 
            
            let coeffStr = match[1];
            let variable = match[2];
            let coeff;

            if (coeffStr === undefined || coeffStr === '+') coeff = 1.0;
            else if (coeffStr === '-') coeff = -1.0;
            else coeff = parseNumberExpression(coeffStr);

            if (variable === 'x') A += coeff;
            else if (variable === 'y') B += coeff;
        }
        
        // Решта - це C
        remainingStr = remainingStr.replace(/=0$/, '').trim();
        if (remainingStr) {
             if (!remainingStr.startsWith('+') && !remainingStr.startsWith('-')) {
                 remainingStr = '+' + remainingStr;
             }
             const constantMatches = remainingStr.match(/[+-](?:\([^)]+\)|(?:\d*\.\d+|\d+))/g);
             if (constantMatches) {
                 constantMatches.forEach(cVal => C += parseNumberExpression(cVal));
             }
        }
        
        if (Math.abs(A) < 1e-9 && Math.abs(B) < 1e-9) return null; 

        return { A, B, C }; 
    }
    
    /**
     * Перетворює об'єкт {A,B,C,D,E,F} на рядок рівняння (для canonical.js)
     */
    function parsedToEquationString(parsed) {
        const { A, B, C, D, E, F } = parsed;
        
        let eq = '';
        const addTerm = (coeff, term) => {
            if (Math.abs(coeff) < 1e-9) return '';
            let sign = coeff > 0 ? ' + ' : ' - ';
            let val = Math.abs(coeff);
            if (eq === '') sign = (coeff > 0 ? '' : '-');
            
            let valStr = Math.abs(coeff) === 1 && term !== '' ? '' : Math.abs(coeff).toFixed(5).replace(/\.?0+$/, '');
            
            return `${sign}${valStr}${term}`;
        };

        eq += addTerm(A, 'x^2');
        eq += addTerm(B, 'xy');
        eq += addTerm(C, 'y^2');
        eq += addTerm(D, 'x');
        eq += addTerm(E, 'y');
        eq += addTerm(F, '');

        if (eq.length > 0) eq = eq.trimStart().replace(/^\+ /, '') + ' = 0';

        return eq.trim();
    }


    /* --- Лінійна алгебра --- */
    function det2(a, b, c, d) { return a * d - b * c; }
    function normalize2(v) { const s = Math.hypot(v[0], v[1]) || 1; return [v[0] / s, v[1] / s]; }
    function eigen2(a, b, c) {
        const tr = a + c, det = a * c - b * b, disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
        const l1 = (tr + disc) / 2, l2 = (tr - disc) / 2;
        let v1 = Math.abs(b) > 1e-9 ? [l1 - c, b] : (Math.abs(a-l1) > 1e-9 ? [0,1] : [1, 0]);
        let v2 = Math.abs(b) > 1e-9 ? [l2 - c, b] : (Math.abs(a-l2) > 1e-9 ? [0,1] : [1, 0]);
        return { vals: [l1, l2], vecs: [normalize2(v1), normalize2(v2)] };
    }

    /*
     * Головна функція аналізу
     */
    function analyzeGeneral(parsed) {
        const { A, B, C, D, E, F } = parsed;
        const disc = B * B - 4 * A * C;
        let type = 'невідомо';
        const extras = {};
        if (Math.abs(disc) < 1e-9) type = 'парабола';
        else if (disc > 0) type = 'гіпербола';
        else type = (Math.abs(A - C) < 1e-9 && Math.abs(B) < 1e-9) ? 'коло' : 'еліпс';
        if (type !== 'парабола') {
            const M_det = det2(2 * A, B, B, 2 * C);
            const center = Math.abs(M_det) < 1e-9 ? { x: 0, y: 0 } : { x: det2(-D, B, -E, 2 * C) / M_det, y: det2(2 * A, -D, B, -E) / M_det };
            const Fp = A*center.x*center.x + B*center.x*center.y + C*center.y*center.y + D*center.x + E*center.y + F;
            const RHS = -Fp;
            const eig = eigen2(A, B / 2, C);
            let eigenPairs = [{ val: eig.vals[0], vec: eig.vecs[0] }, { val: eig.vals[1], vec: eig.vecs[1] }];
            if (type === 'гіпербола') { if ((eigenPairs[0].val / RHS) < 0) [eigenPairs[0], eigenPairs[1]] = [eigenPairs[1], eigenPairs[0]]; } 
            else if (type === 'еліпс' || type === 'коло') { if (Math.abs(eigenPairs[0].val) > Math.abs(eigenPairs[1].val)) [eigenPairs[0], eigenPairs[1]] = [eigenPairs[1], eigenPairs[0]]; } // a > b
            eig.vals = [eigenPairs[0].val, eigenPairs[1].val];
            eig.vecs = [eigenPairs[0].vec, eigenPairs[1].vec];
            let a2 = Math.abs(eig.vals[0]) > 1e-12 ? RHS / eig.vals[0] : null;
            let b2 = Math.abs(eig.vals[1]) > 1e-12 ? RHS / eig.vals[1] : null;
            const angle = Math.atan2(eig.vecs[0][1], eig.vecs[0][0]) * 180 / Math.PI;
            Object.assign(extras, { center, Fp, lambda: eig.vals, vecs: eig.vecs, a2, b2, disc, angle });
            if (a2 !== null && b2 !== null) {
                extras.a = Math.sqrt(Math.abs(a2));
                extras.b = Math.sqrt(Math.abs(b2));
                if (type === 'гіпербола') {
                    extras.c = Math.sqrt(extras.a * extras.a + extras.b * extras.b);
                    if (extras.a > 1e-9) extras.latus_rectum = 2 * extras.b * extras.b / extras.a;
                }
                else if (type === 'еліпс' || type === 'коло') extras.c = Math.sqrt(Math.abs(extras.a * extras.a - extras.b * extras.b));
                
                if (extras.a > 1e-9) extras.e = extras.c / extras.a;
                if (extras.c) {
                    extras.f1 = canonicalToXY(extras.center, extras.vecs, extras.c, 0);
                    extras.f2 = canonicalToXY(extras.center, extras.vecs, -extras.c, 0);
                }
            }
        } else {
            const eig = eigen2(A, B/2, C);
            const main_idx = Math.abs(eig.vals[0]) > 1e-9 ? 0 : 1, axis_idx = 1 - main_idx;
            const lambda = eig.vals[main_idx], v_main = eig.vecs[main_idx], v_axis = eig.vecs[axis_idx];
            const D_prime = D * v_main[0] + E * v_main[1], E_prime = D * v_axis[0] + E * v_axis[1];
            if (Math.abs(E_prime) < 1e-9) { Object.assign(extras, { vecs: eig.vecs, isDegenerate: true, v_axis: v_axis, vertex: {x:0, y:0} }); } 
            else {
                const x_v_prime = -D_prime / (2 * lambda), y_v_prime = (D_prime**2 - 4 * lambda * F) / (4 * lambda * E_prime);
                const focal_dist = -E_prime / (2 * lambda) / 2;
                const vertex = { x: x_v_prime * v_main[0] + y_v_prime * v_axis[0], y: x_v_prime * v_main[1] + y_v_prime * v_axis[1] };
                const focus = { x: vertex.x + focal_dist * v_axis[0], y: vertex.y + focal_dist * v_axis[1] };
                const angle = Math.atan2(v_axis[1], v_axis[0]) * 180 / Math.PI;
                Object.assign(extras, { vertex, focus, focal_dist, v_axis, vecs: eig.vecs, angle, lambda, E_prime, e: 1 });
            }
        }
        return { parsed, extras, type, disc };
    }

    /*
     * Формує текстовий опис кроків розв'язання
     */
    function getSteps(parsed, analysis) {
        const { A, B, C, D, E, F } = parsed;
        const { type, disc, extras } = analysis;
        const steps = [];
        const f = n => Number.isInteger(n) ? n : n.toFixed(3).replace(/\.?0+$/, "");
        steps.push(`<b>1. Початкове рівняння:</b><br>$$ ${f(A)}x^2 + ${f(B)}xy + ${f(C)}y^2 + ${f(D)}x + ${f(E)}y + ${f(F)} = 0 $$`);
        steps.push(`<b>2. Визначення типу кривої:</b><br>Інваріант $$ \\Delta = B^2 - 4AC = ${f(disc)} $$. Оскільки $$ \\Delta ${disc > 1e-9 ? "> 0" : (disc < -1e-9 ? "< 0" : "\\approx 0")}$$, крива є <b>${type}</b>.`);
        if (type !== 'парабола') {
            const { center, Fp, angle, lambda, a, b } = extras;
            steps.push(`<b>3. Паралельний перенос:</b><br>Центр: <b>$$ (x_0, y_0) = (${f(center.x)}, ${f(center.y)}) $$</b>.`);
            steps.push(`Після переносу рівняння набуває вигляду:<br>$$ ${f(A)}x'^2 + ${f(B)}x'y' + ${f(C)}y'^2 + ${f(Fp)} = 0 $$`);
            steps.push(`<b>4. Поворот осей:</b><br>Повертаємо осі на кут <b>$$ \\alpha \\approx ${f(angle)}^\\circ $$</b>. Рівняння у новій системі x''y'':<br>$$ ${f(lambda[0])}(x'')^2 + ${f(lambda[1])}(y'')^2 + ${f(Fp)} = 0 $$`);
            if (a && b) steps.push(`<b>5. Канонічне рівняння:</b><br>$$ \\frac{(x'')^2}{${f(a*a)}} ${lambda[0] * lambda[1] < 0 ? "-" : "+"} \\frac{(y'')^2}{${f(b*b)}} = 1 $$`);
        } else {
            if (extras.angle !== undefined) {
                const { angle, lambda, E_prime, vertex } = extras;
                const p = (lambda && E_prime) ? -E_prime / lambda : 0;
                steps.push(`<b>3. Поворот осей:</b><br>Повертаємо осі на кут <b>$$ \\alpha \\approx ${f(angle)}^\\circ $$</b>.`);
                steps.push(`Рівняння у новій системі x'y':<br>$$ ${f(lambda)}(x')^2 + ... + ${f(E_prime)}y' + ... = 0 $$`);
                steps.push(`<b>4. Паралельний перенос:</b><br>Вершина параболи: <b>$$ (${f(vertex.x)}, ${f(vertex.y)}) $$</b>`);
                if (p) steps.push(`<b>5. Канонічне рівняння:</b><br>$$ (x'')^2 = ${f(p)}y'' $$`);
            } else { steps.push("Це вироджений випадок параболи (пара паралельних прямих)."); }
        }
        return steps.join('<hr style="border-top: 1px solid rgba(128,128,128,0.2); margin: 8px 0;">');
    }

    // Перетворення з локальних координат (u, v) у глобальні (x, y)
    function canonicalToXY(center, vecs, u, v) {
        const x = center.x + u * vecs[0][0] + v * vecs[1][0];
        const y = center.y + u * vecs[0][1] + v * vecs[1][1];
        return [x, y];
    }
    
    // Генерує відрізки для директрис
    function directrixSegments(center, vecs, a, c, range = 100) {
        if (!a || !c || c < 1e-9) return [];
        const u_dist = a * a / c, segs = [];
        [-u_dist, u_dist].forEach(u_val => {
            const xs = [], ys = [];
            for (let v = -range; v <= range; v += range / 50) {
                const p = canonicalToXY(center, vecs, u_val, v); xs.push(p[0]); ys.push(p[1]);
            }
            segs.push({ xs, ys });
        });
        return segs;
    }
    
    // Генерує відрізки для асимптот
    function asymptoteSegments(center, vecs, a, b, range = 100) {
        if (!a || !b) return [];
        const slope = b / a;
        const segs = [];
        [-slope, slope].forEach(s => {
            const p1 = canonicalToXY(center, vecs, -range, s * -range);
            const p2 = canonicalToXY(center, vecs, range, s * range);
            segs.push({ xs: [p1[0], p2[0]], ys: [p1[1], p2[1]] });
        });
        return segs;
    }

    // Генерує відрізок для директриси параболи
    function parabolaDirectrixSegment(vertex, axisVec, focal_dist, range) {
        if (!vertex || !axisVec || !focal_dist) return { xs:[], ys:[] }; 
        const dx = vertex.x - focal_dist * axisVec[0], dy = vertex.y - focal_dist * axisVec[1];
        const dirVec = [-axisVec[1], axisVec[0]];
        const x1 = dx - range * dirVec[0], y1 = dy - range * dirVec[1];
        const x2 = dx + range * dirVec[0], y2 = dy + range * dirVec[1];
        return { xs: [x1, x2], ys: [y1, y2] };
    }
    
    /**
     * Розраховує спрощене рівняння дотичної у цілих числах.
     * @param {number} Fx - коефіцієнт при x
     * @param {number} Fy - коефіцієнт при y
     * @param {number} c_const - вільний член
     * @returns {string} Спрощене рівняння у форматі Ax + By + C = 0
     */
    function getSimplifiedTangentEqString(Fx, Fy, c_const) {
        // 1. Конвертуємо коефіцієнти у дроби (чисельник/знаменник)
        const fr_x = floatToFraction(Fx);
        const fr_y = floatToFraction(Fy);
        const fr_c = floatToFraction(c_const);

        // 2. Знаходимо найменше спільне кратне (НСК) для знаменників
        let lcm = (fr_x.den * fr_y.den) / gcd(fr_x.den, fr_y.den);
        lcm = (lcm * fr_c.den) / gcd(lcm, fr_c.den);
        
        // 3. Множимо всі чисельники на НСК, щоб отримати цілі числа
        let int_Fx = Math.round(fr_x.num * (lcm / fr_x.den));
        let int_Fy = Math.round(fr_y.num * (lcm / fr_y.den));
        let int_c = Math.round(fr_c.num * (lcm / fr_c.den));

        // 4. Знаходимо НСД для спрощення цілих чисел
        let commonDivisor = gcd3(Math.abs(int_Fx), Math.abs(int_Fy), Math.abs(int_c));
        
        if (commonDivisor === 0) {
            commonDivisor = 1; 
        }

        int_Fx /= commonDivisor;
        int_Fy /= commonDivisor;
        int_c /= commonDivisor;
        
        // 5. Визначаємо, яким повинен бути головний знак (коефіцієнт при x має бути додатним)
        if (int_Fx < 0) {
            int_Fx *= -1;
            int_Fy *= -1;
            int_c *= -1;
        } else if (int_Fx === 0 && int_Fy < 0) { // Якщо вертикальна лінія
             int_Fy *= -1;
             int_c *= -1;
        }

        // 6. Формуємо остаточний рядок
        let eqStr = '';
        const addTerm = (coeff, term) => {
            if (Math.abs(coeff) < 1e-9) return '';
            let sign = coeff > 0 ? ' + ' : ' - ';
            let val = Math.abs(coeff);
            if (eqStr === '') sign = (coeff > 0 ? '' : '-'); // Перший термін
            
            let valStr = Math.abs(val - 1) < 1e-9 && term !== '' ? '' : Math.round(val);
            
            return `${sign}${valStr}${term}`;
        };

        eqStr += addTerm(int_Fx, 'x');
        eqStr += addTerm(int_Fy, 'y');
        eqStr += addTerm(int_c, '');
        
        return eqStr.trim().replace(/^\+ /, '') + ' = 0';
    }


    /**
     * Знаходить рівняння дотичної до кривої в точці.
     */
    function getTangentLineAtPoint(parsed, point) {
        const { A, B, C, D, E } = parsed;
        const { x: x0, y: y0 } = point;

        // 1. Обчислюємо часткові похідні в точці (x₀, y₀)
        const Fx = 2 * A * x0 + B * y0 + D;
        const Fy = B * x0 + 2 * C * y0 + E;

        if (Math.abs(Fx) < 1e-9 && Math.abs(Fy) < 1e-9) {
            return null; 
        }
        
        // 2. Рівняння: Fx * x + Fy * y - (Fx*x₀ + Fy*y₀) = 0
        const c_const = - (Fx * x0 + Fy * y0);
        
        // 3. Формуємо спрощений рядок
        const simplifiedEqStr = getSimplifiedTangentEqString(Fx, Fy, c_const);

        return { Fx: Fx, Fy: Fy, c: c_const, eqStr: simplifiedEqStr, point: point };
    }

    /**
     * Розраховує дотичну в стандартній точці (вершина/точка на осі).
     */
    function calculateDefaultTangent(parsed, analysis) {
        const { type, extras } = analysis;
        let defaultPoint = null;

        if (type === 'парабола') {
            if (extras.vertex) {
                defaultPoint = extras.vertex;
            }
        } else if (extras.center) {
            let a = extras.a || 0;
            let center = extras.center;
            let mainVec = extras.vecs ? extras.vecs[0] : [1, 0];
            
            if (a > 1e-9) {
                let x0 = center.x + a * mainVec[0];
                let y0 = center.y + a * mainVec[1];
                defaultPoint = { x: x0, y: y0 };
            } else {
                 defaultPoint = center;
            }
        } else {
            const { A, B, C, D, E, F } = parsed;
            const x0 = 0, y0 = 0;
            if (A*x0*x0 + B*x0*y0 + C*y0*y0 + D*x0 + E*y0 + F < 1e-9) { 
                 defaultPoint = {x: 0, y: 0};
            }
        }
        
        if (defaultPoint) {
            const tangent = getTangentLineAtPoint(parsed, defaultPoint);
            if (tangent) return tangent;
        }

        return null;
    }
    
    /**
     * Знаходить точки перетину фокальної хорди з кривою.
     */
    function getFocalChordIntersections(parsed, focus, pointOnCurve) {
        const { A, B, C, D, E, F } = parsed;
        const [x0, y0] = focus;
        const [x1, y1] = pointOnCurve;

        const dx = x1 - x0, dy = y1 - y0;

        const K2 = A*dx*dx + B*dx*dy + C*dy*dy;
        const K1 = 2*A*x0*dx + B*(x0*dy + y0*dx) + 2*C*y0*dy + D*dx + E*dy;
        const K0 = A*x0*x0 + B*x0*y0 + C*y0*y0 + D*x0 + E*y0 + F;

        if (Math.abs(K2) < 1e-9) { 
             if (Math.abs(K1) > 1e-9) {
                 const t = -K0 / K1;
                 return [pointOnCurve, [x0 + t*dx, y0 + t*dy]];
             }
             return null; 
        }

        const discriminant = K1*K1 - 4*K2*K0;
        if (discriminant < 0) return null; 

        const t1 = (-K1 + Math.sqrt(discriminant)) / (2 * K2);
        const t2 = (-K1 - Math.sqrt(discriminant)) / (2 * K2);

        const p1 = [x0 + t1*dx, y0 + t1*dy];
        const p2 = [x0 + t2*dx, y0 + t2*dy];
        
        return [p1, p2];
    }
    
    // Бібліотека прикладів
    const equationLibrary = [
        {
            category: 'Гіпербола',
            equations: [
                { name: 'Спряжена (повернута)', eq: 'xy = 8' },
                { name: 'Загального вигляду (повернута)', eq: 'x^2 - 4xy + y^2 + 8x - 4y + 4 = 0' },
                { name: 'Загального вигляду (зі зміщенням)', eq: '9x^2 - 16y^2 - 18x - 64y - 199 = 0' },
                { name: 'Загального вигляду (складний)', eq: '2x^2 + 7xy + 3y^2 + 8x + 14y - 6 = 0' }
            ]
        },
        {
            category: 'Еліпс',
            equations: [
                { name: 'Загального вигляду (повернутий)', eq: '5x^2 - 6xy + 5y^2 - 32 = 0' },
                { name: 'Загального вигляду (зі зміщенням)', eq: '4x^2 + 9y^2 - 16x + 18y - 11 = 0' },
                { name: 'Загального вигляду (повернутий, інший)', eq: '13x^2 - 10xy + 13y^2 - 72 = 0' }
            ]
        },
        {
            category: 'Парабола',
            equations: [
                { name: 'Загального вигляду (повернута)', eq: 'x^2 - 2xy + y^2 - 8x - 8y = 0' },
                { name: 'Загального вигляду (зі зміщенням)', eq: 'y^2 - 8x - 6y + 17 = 0' },
                { name: 'Загального вигляду (складна)', eq: '4x^2 - 4xy + y^2 - 8x - 6y + 5 = 0' }
            ]
        },
        {
            category: 'Коло',
            equations: [
                { name: 'Загального вигляду (зі зміщенням)', eq: 'x^2 + y^2 - 6x + 4y - 12 = 0' },
                { name: 'Загального вигляду (інше зміщення)', eq: 'x^2 + y^2 + 8x - 10y - 8 = 0' }
            ]
        }
    ];

    // Експортуємо API модуля в глобальний об'єкт window
    window.Solver = { 
        parseGeneralEquation,
        parseLinearEquation, 
        parseNumberExpression, 
        parsedToEquationString, 
        analyzeGeneral, 
        getSteps, 
        canonicalToXY, 
        directrixSegments, 
        asymptoteSegments, 
        parabolaDirectrixSegment, 
        examples, 
        addExample: (eq) => { if (eq && eq.trim()) { examples.unshift(eq.trim()); persistExamples(); } }, 
        persistExamples, 
        equationLibrary,
        getTangentLineAtPoint,
        getFocalChordIntersections,
        calculateDefaultTangent 
    };
})();