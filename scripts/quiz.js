/* quiz.js
    - Logic for the quiz page
    - Handles question generation, answer checking, and scoring
    - ОНОВЛЕНО: 12 запитань (3 ідентифікації, 9 обчислень).
    - ОНОВЛЕНО: Лотерея запускається перед КОЖНИМ запитанням.
    - ОНОВЛЕНО: Кнопки відповідей генеруються динамічно.
    - ОНОВЛЕНО: Додано кнопки "Далі" та "Крутимо далі" після лотереї.
*/
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const introOverlay = document.getElementById('intro-overlay');
    const quizMain = document.getElementById('quiz-main');
    const resultsOverlay = document.getElementById('results-overlay');
    
    const equationDisplay = document.getElementById('equation-display');
    const questionTextDisplay = document.getElementById('question-text');
    const answerButtonsContainer = document.getElementById('answer-buttons');
    const feedbackDisplay = document.getElementById('feedback-display');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const scoreDisplay = document.getElementById('score-display');
    
    // Results screen elements
    const finalScoreDisplay = document.getElementById('final-score');
    const playAgainBtn = document.getElementById('play-again-btn');
    
    // --- ОНОВЛЕНІ ЕЛЕМЕНТИ ЛОТЕРЕЇ ---
    const lotteryNumbersContainer = document.getElementById('lottery-numbers');
    const selectedNumberDisplay = document.getElementById('selected-number-display');
    const winningNumberEl = document.getElementById('winning-number');
    const lotteryStatusText = document.getElementById('lottery-status-text');
    const lotteryControls = document.getElementById('lottery-controls');
    const proceedBtn = document.getElementById('proceedBtn');
    const respinBtn = document.getElementById('respinBtn');
    
    // --- ОНОВЛЕНИЙ БАНК ЗАПИТАНЬ (3 'identify', 9 'calculate') ---
    const questions = [
        // ... (ваш банк запитань залишається без змін) ...
        { 
            type: 'identify',
            equation: `5x^2 - 6xy + 5y^2 - 32 = 0`, 
            correctAnswer: 'ellipse' 
        },
        { 
            type: 'calculate',
            equation: `x^2/16 + y^2/9 = 1`, 
            questionText: 'Знайти фокуси (F₁, F₂): (c² = a² - b²)',
            options: ['(±5, 0)', '(±4, 0)', '(0, ±√7)', '(±√7, 0)'],
            correctAnswer: '(±√7, 0)'
        },
        { 
            type: 'calculate',
            equation: `y^2 = 8x`, 
            questionText: 'Знайти параметр (p): (y² = 2px)',
            options: ['8', '4', '2', '16'],
            correctAnswer: '4'
        },
        { 
            type: 'identify',
            equation: `x^2 - 2xy + y^2 - 8x = 0`, 
            correctAnswer: 'parabola' 
        },
        { 
            type: 'calculate',
            equation: `x^2/9 - y^2/16 = 1`, 
            questionText: 'Знайти рівняння асимптот (y = ±k*x):',
            options: ['y = ±(16/9)x', 'y = ±(4/3)x', 'y = ±(3/4)x', 'y = ±(5/3)x'],
            correctAnswer: 'y = ±(4/3)x'
        },
        { 
            type: 'calculate',
            equation: `x^2 + y^2 = 25`, 
            questionText: 'Знайти ексцентриситет (e):',
            options: ['1', '0', '5', 'N/A'],
            correctAnswer: '0'
        },
        { 
            type: 'calculate',
            equation: `x^2/25 + y^2/16 = 1`, 
            questionText: 'Знайти ексцентриситет (e = c/a):',
            options: ['0.6 (3/5)', '0.8 (4/5)', '1.25 (5/4)', '0.5 (1/2)'],
            correctAnswer: '0.6 (3/5)'
        },
        { 
            type: 'identify',
            equation: `xy = 10`, 
            correctAnswer: 'hyperbola' 
        },
        { 
            type: 'calculate',
            equation: `x^2/144 - y^2/25 = 1`, 
            questionText: 'Знайти фокуси (F₁, F₂): (c² = a² + b²)',
            options: ['(±12, 0)', '(±5, 0)', '(±13, 0)', '(±119, 0)'],
            correctAnswer: '(±13, 0)'
        },
        { 
            type: 'calculate',
            equation: `x^2 = -12y`, 
            questionText: 'Знайти фокус (F): (x² = -2py)',
            options: ['(0, -12)', '(0, -6)', '(0, -3)', '(-3, 0)'],
            correctAnswer: '(0, -3)'
        },
        { 
            type: 'calculate',
            equation: `(x-1)^2 + (y+2)^2 = 9`, 
            questionText: 'Знайти центр (h, k):',
            options: ['(-1, 2)', '(1, -2)', '(1, 2)', '(-1, -2)'],
            correctAnswer: '(1, -2)'
        },
        { 
            type: 'calculate',
            equation: `y^2/9 - x^2/16 = 1`, 
            questionText: 'Знайти вершини (A₁, A₂):',
            options: ['(±3, 0)', '(0, ±3)', '(±4, 0)', '(0, ±4)'],
            correctAnswer: '(0, ±3)'
        },
    ];
    const TOTAL_QUESTIONS = questions.length;

    let onLotteryCompleteCallback = null; // Зберігаємо, що робити "Далі"
    let currentQuestionIndex = 0;
    let score = 0;
    let answered = false;

    // --- Lottery Logic ---
    const totalNumbers = 34;
    const disabledNumbers = [2, 3, 4, 8, 12, 18, 21, 26, 27]; 

    // Ініціалізуємо номери лотереї один раз
    if (lotteryNumbersContainer.children.length === 0) {
        for (let i = 1; i <= totalNumbers; i++) {
            const numberEl = document.createElement('div');
            numberEl.classList.add('lottery-number');
            numberEl.textContent = i;
            if (disabledNumbers.includes(i)) {
                numberEl.classList.add('disabled');
            }
            lotteryNumbersContainer.appendChild(numberEl);
        }
    }
    
    /**
     * Починає лотерею. Коли вона закінчується, викликає onComplete.
     */
    function showLottery(onComplete) {
        // 1. Зберігаємо, що робити "Далі"
        onLotteryCompleteCallback = onComplete;
        
        // 2. Показуємо оверлей, ховаємо кнопки
        introOverlay.classList.remove('hidden');
        quizMain.classList.add('hidden');
        selectedNumberDisplay.classList.add('hidden'); // Ховаємо результат
        lotteryControls.classList.add('hidden'); // Ховаємо кнопки "Далі" / "Респін"
        lotteryNumbersContainer.style.opacity = '1';
        
        Array.from(lotteryNumbersContainer.children).forEach(n => n.classList.remove('active', 'winner'));
        
        lotteryStatusText.textContent = `Визначаємо учасника для запитання №${currentQuestionIndex + 1}...`;
        
        // 3. Запускаємо анімацію
        runLottery();
    }

    /**
     * Анімація лотереї, яка викликає onComplete після завершення.
     */
    function runLottery() { // Більше не приймає onComplete
        const allNumbers = Array.from(lotteryNumbersContainer.children);
        const enabledNumbers = allNumbers.filter(n => !n.classList.contains('disabled'));
        
        const shuffleInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * enabledNumbers.length);
            allNumbers.forEach(n => n.classList.remove('active'));
            enabledNumbers[randomIndex].classList.add('active');
        }, 100);

        setTimeout(() => {
            clearInterval(shuffleInterval);
            
            const winningIndex = Math.floor(Math.random() * enabledNumbers.length);
            const winningElement = enabledNumbers[winningIndex];
            const winningNumber = parseInt(winningElement.textContent);

            allNumbers.forEach(n => {
                n.classList.remove('active');
                if (parseInt(n.textContent) === winningNumber) {
                    n.classList.add('winner');
                }
            });
            
            lotteryNumbersContainer.style.opacity = '0.5';
            winningNumberEl.textContent = winningNumber;
            
            // --- ОНОВЛЕНО ---
            // 4. Показуємо результат...
            selectedNumberDisplay.classList.remove('hidden');
            // 5. ...і показуємо нові кнопки "Далі" / "Крутимо далі"
            lotteryControls.classList.remove('hidden');
            
            // Більше не ховаємо оверлей і не викликаємо onComplete автоматично

        }, 3000);
    }

    // --- Main Quiz Logic ---
    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        answered = false;
        resultsOverlay.classList.add('hidden');
        showLottery(displayQuestion); // Запускаємо лотерею для першого запитання
    }

    /**
     * Відображає поточне запитання, динамічно створюючи кнопки.
     */
    function displayQuestion() {
        answered = false;
        const question = questions[currentQuestionIndex];
        
        answerButtonsContainer.innerHTML = '';
        
        equationDisplay.textContent = `\\( ${question.equation} \\)`;
        if (window.MathJax) {
            MathJax.typesetPromise([equationDisplay]).catch(err => console.error(err));
        }
        
        if (question.type === 'identify') {
            questionTextDisplay.textContent = 'Який це тип кривої?';
            const options = ['ellipse', 'hyperbola', 'parabola'];
            const labels = {'ellipse': 'Еліпс / Коло', 'hyperbola': 'Гіпербола', 'parabola': 'Парабола'};
            
            options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.dataset.answer = option;
                btn.textContent = labels[option];
                answerButtonsContainer.appendChild(btn);
            });
        } 
        else if (question.type === 'calculate') {
            questionTextDisplay.textContent = question.questionText;
            
            question.options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.dataset.answer = option;
                btn.textContent = option;
                answerButtonsContainer.appendChild(btn);
            });
        }
        
        feedbackDisplay.textContent = '';
        feedbackDisplay.className = 'feedback';
        nextQuestionBtn.classList.add('hidden');
        
        scoreDisplay.textContent = `Рахунок: ${score} / ${currentQuestionIndex} | Запитання: ${currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
    }

    function handleAnswerClick(e) {
        if (answered || !e.target.matches('[data-answer]')) {
            return;
        }
        answered = true;

        const selectedAnswer = e.target.dataset.answer;
        const correctAnswer = questions[currentQuestionIndex].correctAnswer;
        
        answerButtonsContainer.querySelectorAll('.btn').forEach(btn => {
            btn.disabled = true;
        });
        
        if (selectedAnswer === correctAnswer) {
            score++;
            e.target.classList.add('correct');
            feedbackDisplay.textContent = 'Правильно!';
            feedbackDisplay.classList.add('correct');
        } else {
            e.target.classList.add('incorrect');
            feedbackDisplay.innerHTML = `Неправильно! Правильна відповідь: <strong>${correctAnswer}</strong>.`;
            feedbackDisplay.classList.add('incorrect');
            
            const correctButton = answerButtonsContainer.querySelector(`[data-answer="${correctAnswer}"]`);
            if (correctButton) {
                correctButton.classList.add('correct');
            }
        }
        
        scoreDisplay.textContent = `Рахунок: ${score} / ${currentQuestionIndex + 1} | Запитання: ${currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
        
        if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
            nextQuestionBtn.textContent = 'До лотереї →';
        } else {
            nextQuestionBtn.textContent = 'Завершити вікторину';
        }
        nextQuestionBtn.classList.remove('hidden');
    }

    function handleNextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < TOTAL_QUESTIONS) {
            showLottery(displayQuestion); // Запускаємо лотерею, яка викличе displayQuestion
        } else {
            showResults();
        }
    }
    
    function showResults() {
        quizMain.classList.add('hidden');
        resultsOverlay.classList.remove('hidden');
        finalScoreDisplay.textContent = `${score} / ${TOTAL_QUESTIONS}`;

        const checkmark = resultsOverlay.querySelector('.checkmark');
        const dislikeContainer = document.getElementById('dislike-container');
        dislikeContainer.innerHTML = ''; 

        if (score >= TOTAL_QUESTIONS / 2) {
            resultsOverlay.className = 'quiz-overlay correct-final';
            checkmark.textContent = '✓';
            if (window.confetti) {
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            }
        } else {
            resultsOverlay.className = 'quiz-overlay incorrect-final';
            checkmark.textContent = '✗';
            for (let i = 0; i < 30; i++) {
                createDislike();
            }
        }
    }

    function createDislike() {
        const dislike = document.createElement('div');
        dislike.classList.add('dislike');
        dislike.textContent = '👎';
        dislike.style.left = `${Math.random() * 100}%`;
        dislike.style.animationDuration = `${Math.random() * 3 + 2}s`;
        document.getElementById('dislike-container').appendChild(dislike);
    }
    
    // --- ОСНОВНІ ОБРОБНИКИ ПОДІЙ ---
    answerButtonsContainer.addEventListener('click', handleAnswerClick);
    nextQuestionBtn.addEventListener('click', handleNextQuestion);
    playAgainBtn.addEventListener('click', () => location.reload()); 

    // --- НОВІ ОБРОБНИКИ ДЛЯ КНОПОК ЛОТЕРЕЇ ---
    proceedBtn.addEventListener('click', () => {
        // Натиснули "Далі"
        introOverlay.classList.add('hidden');
        quizMain.classList.remove('hidden');
        lotteryControls.classList.add('hidden'); // Ховаємо кнопки

        if (onLotteryCompleteCallback) {
            onLotteryCompleteCallback(); // Викликаємо збережену функцію (тобто displayQuestion)
        }
    });

    respinBtn.addEventListener('click', () => {
        // Натиснули "Крутимо далі"
        lotteryControls.classList.add('hidden'); // Ховаємо кнопки
        
        // Запускаємо лотерею знову, з тією ж самою ціллю (onLotteryCompleteCallback)
        showLottery(onLotteryCompleteCallback); 
    });
    
    // --- СТАРТ ГРИ ---
    startQuiz(); // Починаємо гру з першої лотереї

    // --- ОБРОБНИК ТЕМИ ---
    const theme = localStorage.getItem('conics_theme') || 'dark';
    document.body.classList.toggle('theme-light', theme === 'light');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'light';
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'light' : 'dark';
            document.body.classList.toggle('theme-light', newTheme === 'light');
            localStorage.setItem('conics_theme', newTheme);
        });
    }
});