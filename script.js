
document.addEventListener('DOMContentLoaded', () => {

    // --- إعدادات ومتغيرات اللعبة ---
    const API_URL = "https://script.google.com/macros/s/AKfycbwMIiQTdKsIuiMB5NtN7Zkr_8aUj4K44kekPh_3ssruQsb3R3aUVS4vvl9CPspSKmVyWA/exec"; // !! ضع رابط الويب آب الجديد هنا
    const QUESTION_TIME = 90;
    const PRIZES = [
        { points: 100, title: "مشارك واعد" }, { points: 200, title: "مستكشف المعرفة" },
        { points: 300, title: "باحث مجتهد" }, { points: 500, title: "مثقف مبتدئ" },
        { points: 1000, title: "نجم المعرفة البرونزي" }, { points: 2000, title: "صاحب الفضول" },
        { points: 4000, title: "متعمق بالحقائق" }, { points: 8000, title: "خبير المعلومات" },
        { points: 16000, title: "نجم المعرفة الفضي" }, { points: 32000, title: "سيد الأسئلة" },
        { points: 64000, title: "عقل متقد" }, { points: 125000, title: "عبقري عصره" },
        { points: 250000, title: "حكيم المعرفة" }, { points: 500000, title: "أسطورة المسابقة" },
        { points: 1000000, title: "نجم المعرفة الذهبي" }
    ];
    const HELPER_COSTS = { fiftyFifty: 40000, addTime: 30000, changeQuestion: 50000 };

    // --- عناصر الواجهة الرسومية ---
    const screens = {
        loader: document.getElementById('loader'),
        start: document.getElementById('startScreen'),
        nameEntry: document.getElementById('nameEntry'),
        game: document.getElementById('gameContainer'),
        end: document.getElementById('endScreen'),
    };
    const nameInput = document.getElementById('nameInput');
    const playerNameDisplay = document.getElementById('playerName');
    const questionText = document.getElementById('questionText');
    const optionsGrid = document.querySelector('.options-grid');
    const timerDisplay = document.getElementById('timer');
    const timerBar = document.querySelector('.timer-bar');
    const scoreDisplay = document.getElementById('currentScore');
    const wrongAnswersDisplay = document.getElementById('wrongAnswersCount');
    const prizesList = document.querySelector('.prizes-list');
    const currentTitleDisplay = document.getElementById('currentTitle');
    const questionCounterDisplay = document.getElementById('questionCounter');
    const questionSpinner = document.querySelector('.question-box .spinner-container');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const shareModal = document.getElementById('shareModal');
    
    // --- متغيرات حالة اللعبة ---
    let gameState = {};
    let timerInterval;

    // --- تهيئة اللعبة ---
    function init() {
        bindEventListeners();
        generatePrizesList();
        showScreen('loader');
        gameState.deviceId = getDeviceId();
        // تأخير بسيط لإظهار شاشة التحميل
        setTimeout(() => showScreen('start'), 1000);
    }

    // --- إدارة الشاشات ---
    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }
    
    // --- ربط الأحداث ---
    function bindEventListeners() {
        document.getElementById('startGameBtn').addEventListener('click', () => showScreen('nameEntry'));
        document.getElementById('confirmNameBtn').addEventListener('click', startGame);
        document.querySelector('.open-sidebar-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.close-sidebar-btn').addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        document.querySelectorAll('.helper-btn').forEach(btn => btn.addEventListener('click', useHelper));
        document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
        document.getElementById('shareBtn').addEventListener('click', openShareModal);
        document.querySelector('.close-modal').addEventListener('click', () => shareModal.classList.remove('active'));
        document.getElementById('copyShareBtn').addEventListener('click', copyShareText);
    }

    // --- منطق اللعبة الأساسي ---
    async function startGame() {
        const name = nameInput.value.trim();
        if (name.length < 2) {
            alert("الرجاء إدخال اسم صحيح.");
            return;
        }

        showScreen('loader');
        const response = await apiCall({ action: 'start', deviceId: gameState.deviceId, name });
        
        if (response.success) {
            resetGameState(name, response.attemptId);
            playerNameDisplay.textContent = name;
            showScreen('game');
            await fetchQuestion();
        } else {
            alert(response.error === 'limit_reached' ? "لقد وصلت إلى الحد الأقصى للمحاولات اليومية." : "حدث خطأ عند بدء اللعبة.");
            showScreen('start');
        }
    }

    async function fetchQuestion() {
        startLoadingQuestion();
        const response = await apiCall({ action: 'getQuestion', attemptId: gameState.attemptId });
        
        if (response.success) {
            displayQuestion(response.question, response.questionNumber, response.totalQuestions);
            startTimer();
        } else {
            alert("خطأ في تحميل السؤال.");
            endGame(true); // إنهاء اللعبة عند الفشل
        }
        stopLoadingQuestion();
    }
    
    function displayQuestion(question, qNum, qTotal) {
        questionText.textContent = question.q;
        questionCounterDisplay.textContent = `السؤال ${qNum} / ${qTotal}`;
        optionsGrid.innerHTML = '';
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('option-btn');
            button.textContent = option;
            button.dataset.index = index;
            button.onclick = () => checkAnswer(index, button);
            optionsGrid.appendChild(button);
        });
        updateUI();
    }

    async function checkAnswer(selectedIndex, button) {
        clearInterval(timerInterval);
        document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

        const response = await apiCall({ action: 'answer', attemptId: gameState.attemptId, answerIndex: selectedIndex });

        if (response.success) {
            if (response.correct) {
                button.classList.add('correct');
                gameState.score += PRIZES[gameState.currentQuestion].points;
                gameState.currentQuestion++;
            } else {
                button.classList.add('wrong');
                document.querySelector(`.option-btn[data-index='${response.correctIndex}']`).classList.add('correct');
                gameState.wrongAnswers = response.wrongAnswers;
            }
            
            updateUI();

            setTimeout(() => {
                if (response.gameOver || gameState.currentQuestion >= PRIZES.length) {
                    endGame();
                } else {
                    fetchQuestion();
                }
            }, 2000);
        } else {
            alert("حدث خطأ أثناء التحقق من الإجابة.");
        }
    }

    function endGame(abandoned = false) {
        clearInterval(timerInterval);
        const totalTime = (new Date() - new Date(gameState.startTime)) / 1000;
        const finalPrize = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion - 1].points : 0;
        const finalTitle = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion - 1].title : "لا يوجد";
        
        const finalPayload = {
            action: 'end',
            attemptId: gameState.attemptId,
            score: gameState.score,
            finalTitle: finalTitle,
            finalPrize: finalPrize,
            totalTime: totalTime
        };
        apiCall(finalPayload); // إرسال النتائج النهائية للخادم
        
        // عرض شاشة النهاية
        document.getElementById('finalTitle').textContent = finalTitle;
        document.getElementById('finalPrize').textContent = formatNumber(finalPrize);
        document.getElementById('finalScore').textContent = formatNumber(gameState.score);
        document.getElementById('totalTime').textContent = `${Math.round(totalTime)} ثانية`;
        showScreen('end');
    }

    // --- المساعدات ---
    async function useHelper(event) {
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const cost = HELPER_COSTS[type];

        if (gameState.score < cost || gameState.helpersUsed[type]) return;

        btn.disabled = true;
        gameState.helpersUsed[type] = true;
        gameState.score -= cost;
        updateUI();
        
        const response = await apiCall({ action: 'useHelper', attemptId: gameState.attemptId, helperType: type });

        if (response.success) {
            if (type === 'fiftyFifty' && response.optionsToRemove) {
                response.optionsToRemove.forEach(index => {
                    document.querySelector(`.option-btn[data-index='${index}']`).classList.add('disabled');
                });
            } else if (type === 'addTime') {
                gameState.timeLeft += 15;
            } else if (type === 'changeQuestion' && response.newQuestion) {
                 clearInterval(timerInterval);
                 displayQuestion(response.newQuestion, gameState.currentQuestion + 1, PRIZES.length);
                 startTimer();
            }
        } else {
            alert('حدث خطأ أثناء استخدام المساعدة');
            btn.disabled = false; // إعادة تفعيل الزر
            gameState.helpersUsed[type] = false;
            gameState.score += cost;
            updateUI();
        }
    }
    
    // --- المؤقت ---
    function startTimer() {
        clearInterval(timerInterval);
        gameState.timeLeft = QUESTION_TIME;
        timerInterval = setInterval(() => {
            gameState.timeLeft--;
            timerDisplay.textContent = gameState.timeLeft;
            timerBar.style.width = `${(gameState.timeLeft / QUESTION_TIME) * 100}%`;
            if (gameState.timeLeft <= 0) {
                clearInterval(timerInterval);
                gameState.wrongAnswers++;
                updateUI();
                if (gameState.wrongAnswers >= 3) {
                    endGame();
                } else {
                   fetchQuestion(); 
                }
            }
        }, 1000);
    }
    
    // --- تحديث الواجهة ---
    function updateUI() {
        scoreDisplay.textContent = formatNumber(gameState.score);
        wrongAnswersDisplay.textContent = `${gameState.wrongAnswers} / 3`;
        updatePrizesList();
        
        const title = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion-1].title : "لا يوجد";
        currentTitleDisplay.textContent = title;

        document.querySelectorAll('.helper-btn').forEach(btn => {
            const type = btn.dataset.type;
            if (gameState.helpersUsed[type] || gameState.score < HELPER_COSTS[type]) {
                btn.disabled = true;
            }
        });
    }

    function updatePrizesList() {
        const items = prizesList.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.remove('current', 'past');
            if (index === (PRIZES.length - 1 - gameState.currentQuestion)) {
                item.classList.add('current');
            } else if (index > (PRIZES.length - 1 - gameState.currentQuestion)) {
                item.classList.add('past');
            }
        });
    }

    // --- دوال مساعدة ---
    function resetGameState(name, attemptId) {
        gameState = {
            ...gameState, // Keep deviceId
            name: name,
            attemptId: attemptId,
            currentQuestion: 0,
            score: 0,
            wrongAnswers: 0,
            timeLeft: QUESTION_TIME,
            startTime: new Date().toISOString(),
            helpersUsed: { fiftyFifty: false, addTime: false, changeQuestion: false }
        };
    }

    async function apiCall(payload) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, //
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Network response was not ok.");
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            return { success: false, error: error.message };
        }
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    function generatePrizesList() {
        prizesList.innerHTML = '';
        [...PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${15 - index}</span> - ${prize.title} (<strong>${formatNumber(prize.points)}</strong>)`;
            prizesList.appendChild(li);
        });
    }

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }

    function startLoadingQuestion() {
        questionText.style.display = 'none';
        optionsGrid.style.display = 'none';
        questionSpinner.style.display = 'flex';
    }
    
    function stopLoadingQuestion() {
        questionText.style.display = 'block';
        optionsGrid.style.display = 'grid';
        questionSpinner.style.display = 'none';
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    }
    
    function openShareModal() {
        const finalTitle = document.getElementById('finalTitle').textContent;
        const finalScore = document.getElementById('finalScore').textContent;
        const text = `🏆 لقد أنهيت تحدي "من سيربح اللقب؟"!
🔹 اسمي: ${gameState.name}
🔹 لقبي: ${finalTitle}
🔹 نقاطي: ${finalScore}
#من_سيربح_اللقب`;
        document.getElementById('shareText').value = text;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
        document.getElementById('twitterShareBtn').href = twitterUrl;
        shareModal.classList.add('active');
    }

    function copyShareText() {
        const shareText = document.getElementById('shareText');
        shareText.select();
        document.execCommand('copy');
        alert('تم نسخ النص!');
    }

    init();
});
