document.addEventListener('DOMContentLoaded', () => {

    // --- إعدادات اللعبة ---
    // !!! مهم جداً: تأكد من لصق رابط النشر الصحيح والجديد هنا !!!
    const API_URL = "https://script.google.com/macros/library/d/1u4NRrG2FpcKzULPVSZlxnMsFuma2yJ3DC6JuBc9-u4bhPmGgDBI6bUAa/4";
    const QUESTION_TIME = 90;
    const TOTAL_AVATARS = 20; // يمكنك تغيير هذا الرقم إذا أردت
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

    // --- عناصر الواجهة ---
    const screens = {
        loader: document.getElementById('loader'),
        start: document.getElementById('startScreen'),
        avatar: document.getElementById('avatarScreen'),
        nameEntry: document.getElementById('nameEntry'),
        game: document.getElementById('gameContainer'),
        end: document.getElementById('endScreen'),
        leaderboard: document.getElementById('leaderboardScreen'),
    };
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const questionText = document.getElementById('questionText');
    const optionsGrid = document.querySelector('.options-grid');
    const scoreDisplay = document.getElementById('currentScore');
    const prizesList = document.querySelector('.prizes-list');

    // --- حالة اللعبة ---
    let gameState = { deviceId: getDeviceId() };
    let timerInterval;
    let currentScoreValue = 0;

    // --- تهيئة اللعبة ---
    function init() {
        populateAvatarGrid();
        bindEventListeners();
        generatePrizesList(); // تمت إعادة هذه الدالة
        loadTheme();
        showScreen('start');
        screens.loader.classList.remove('active');
    }

    function populateAvatarGrid() {
        const avatarGrid = document.querySelector('.avatar-grid');
        for (let i = 1; i <= TOTAL_AVATARS; i++) {
            const img = document.createElement('img');
            img.src = `assets/avatars/avatar${i}.png`;
            img.classList.add('avatar-option');
            img.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                gameState.avatar = img.src;
                document.getElementById('confirmAvatarBtn').disabled = false;
            });
            avatarGrid.appendChild(img);
        }
    }

    function bindEventListeners() {
        document.getElementById('startPlayBtn').addEventListener('click', () => showScreen('avatar'));
        document.getElementById('confirmAvatarBtn').addEventListener('click', () => showScreen('nameEntry'));
        document.getElementById('confirmNameBtn').addEventListener('click', startGame);
        document.getElementById('showLeaderboardBtn').addEventListener('click', displayLeaderboard);
        document.getElementById('backToStartBtn').addEventListener('click', () => showScreen('start'));
        document.querySelector('.theme-toggle-btn').addEventListener('click', toggleTheme);
        document.querySelectorAll('.helper-btn').forEach(btn => btn.addEventListener('click', useHelper));
        document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());

        // --- إصلاح: تمت إعادة إضافة كود فتح وإغلاق قائمة الألقاب ---
        document.querySelector('.open-sidebar-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.close-sidebar-btn').addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- منطق اللعبة ---
    async function startGame() {
        const name = document.getElementById('nameInput').value.trim();
        if (name.length < 2) {
            showToast("الرجاء إدخال اسم صحيح.", 'error');
            return;
        }
        gameState.name = name;
        
        showScreen('loader');
        const response = await apiCall({ action: 'start', ...gameState });

        if (response && response.success) {
            resetGameState(response.attemptId);
            setupGameUI();
            showScreen('game');
            await fetchQuestion();
        } else {
            const errorMsg = response && response.error === 'limit_reached' ? "لقد وصلت للحد الأقصى للمحاولات." : "حدث خطأ عند بدء اللعبة.";
            showToast(errorMsg, 'error');
            showScreen('start');
        }
    }

    async function fetchQuestion() {
        startLoadingQuestion();
        const response = await apiCall({ action: 'getQuestion', attemptId: gameState.attemptId });
        
        if (response && response.success) {
            displayQuestion(response.question, response.qNum, response.totalQ);
            startTimer();
        } else {
            showToast("خطأ في تحميل السؤال. تأكد من الرابط وصلاحيات Apps Script.", 'error');
            showScreen('start');
        }
        stopLoadingQuestion();
    }
    
    function displayQuestion(question, qNum, totalQ) {
        questionText.textContent = question.q;
        document.getElementById('questionCounter').textContent = `السؤال ${qNum} / ${totalQ}`;
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

        if (response && response.success) {
            if (response.correct) {
                button.classList.add('correct');
                showToast("إجابة صحيحة!", "success");
                // نظام النقاط التراكمي الجديد
                updateScore(currentScoreValue + PRIZES[gameState.currentQuestion].points);
                gameState.currentQuestion++;
            } else {
                button.classList.add('wrong');
                document.querySelector(`.option-btn[data-index='${response.correctIndex}']`).classList.add('correct');
                showToast("إجابة خاطئة", "error");
                gameState.wrongAnswers = response.wrongAnswers;
            }
            
            updateUI();

            setTimeout(() => {
                if (response.gameOver || gameState.currentQuestion >= PRIZES.length) {
                    endGame();
                } else if (response.correct) {
                    fetchQuestion();
                } else {
                    // إذا كانت الإجابة خاطئة واللعبة لم تنتهِ
                    endGame(); // أو يمكنك جعله ينتقل للسؤال التالي حسب رغبتك
                }
            }, 2000);
        } else {
             showToast("خطأ في الاتصال بالخادم.", "error");
        }
    }
    
    function endGame() {
        clearInterval(timerInterval);
        const totalTime = (new Date() - new Date(gameState.startTime)) / 1000;
        const finalTitle = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion - 1].title : "لا يوجد";
        
        apiCall({ action: 'end', attemptId: gameState.attemptId, score: currentScoreValue, finalTitle, totalTime });
        
        document.getElementById('finalName').textContent = gameState.name;
        document.getElementById('finalTitle').textContent = finalTitle;
        document.getElementById('finalScore').textContent = formatNumber(currentScoreValue);
        document.getElementById('totalTime').textContent = `${Math.round(totalTime)} ثانية`;
        showScreen('end');
    }
    
    function useHelper(event) {
        // ... (يمكنك إضافة منطق المساعدات هنا لاحقًا)
        showToast("المساعدات غير مفعلة حاليًا", "info");
    }

    function startTimer() {
        clearInterval(timerInterval);
        gameState.timeLeft = QUESTION_TIME;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.getElementById('timer');
        
        timerInterval = setInterval(() => {
            gameState.timeLeft--;
            timerDisplay.textContent = gameState.timeLeft;
            timerBar.style.width = `${(gameState.timeLeft / QUESTION_TIME) * 100}%`;
            
            if (gameState.timeLeft <= 0) {
                clearInterval(timerInterval);
                showToast("انتهى الوقت!", "error");
                gameState.wrongAnswers++;
                updateUI();
                setTimeout(endGame, 1000);
            }
        }, 1000);
    }
    
    // --- دوال الواجهة المساعدة ---
    function updateScore(newScore) {
        const start = currentScoreValue;
        const diff = newScore - start;
        let step = 0;
        const duration = 500;
        const interval = setInterval(() => {
            step += 20;
            const progress = Math.min(step / duration, 1);
            const animatedScore = Math.floor(start + diff * progress);
            scoreDisplay.textContent = `النقاط: ${formatNumber(animatedScore)}`;
            if (progress >= 1) {
                clearInterval(interval);
            }
        }, 20);
        currentScoreValue = newScore;
    }
    
    function updateUI() {
        document.getElementById('wrongAnswersCount').textContent = `${gameState.wrongAnswers} / 3`;
        document.getElementById('currentTitle').textContent = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion-1].title : "لا يوجد";
        updatePrizesList();
    }
    
    function generatePrizesList() {
        prizesList.innerHTML = '';
        [...PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${15 - index}</span> - ${prize.title}`;
            prizesList.appendChild(li);
        });
    }

    function updatePrizesList() {
        const items = prizesList.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.remove('current', 'past');
            const prizeIndex = PRIZES.length - 1 - index;
            if (prizeIndex === gameState.currentQuestion) {
                item.classList.add('current');
            } else if (prizeIndex < gameState.currentQuestion) {
                item.classList.add('past');
            }
        });
    }

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async function displayLeaderboard() {
        showScreen('leaderboard');
        const contentDiv = document.getElementById('leaderboardContent');
        contentDiv.innerHTML = '<div class="spinner"></div>';
        
        const response = await apiCall({ action: 'getLeaderboard' });

        if (response && response.success && response.leaderboard) {
            let tableHTML = '<p>لوحة الصدارة فارغة حاليًا!</p>';
            if (response.leaderboard.length > 0) {
                tableHTML = '<table class="leaderboard-table"><tr><th>الترتيب</th><th>الاسم</th><th>النقاط</th><th>اللقب</th></tr>';
                const medals = ['🥇', '🥈', '🥉'];
                response.leaderboard.forEach(row => {
                    const rank = medals[row[0] - 1] || row[0];
                    tableHTML += `<tr><td>${rank}</td><td>${row[1]}</td><td>${formatNumber(row[2])}</td><td>${row[3]}</td></tr>`;
                });
                tableHTML += '</table>';
            }
            contentDiv.innerHTML = tableHTML;
        } else {
            contentDiv.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
        }
    }
    
    // --- إدارة الحالة والثيم ---
    function resetGameState(attemptId) {
        gameState.attemptId = attemptId;
        gameState.currentQuestion = 0;
        gameState.wrongAnswers = 0;
        gameState.startTime = new Date().toISOString();
        updateScore(0);
    }
    function setupGameUI() {
        document.getElementById('playerAvatar').src = gameState.avatar;
        document.getElementById('playerName').textContent = gameState.name;
    }
    function toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        document.querySelector('.theme-toggle-btn').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.dataset.theme = savedTheme;
        document.querySelector('.theme-toggle-btn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    // --- دوال أساسية ---
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); if(screens[screenName]) screens[screenName].classList.add('active'); }
    function getDeviceId() { let id = localStorage.getItem('deviceId'); if (!id) { id = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; localStorage.setItem('deviceId', id); } return id; }
    function formatNumber(num) { return new Intl.NumberFormat('ar-EG').format(num); }
    async function apiCall(payload) { try { const res = await fetch(API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); if (!res.ok) throw new Error("Network error"); return await res.json(); } catch (error) { console.error('API Error:', error); return { success: false, error: error.message }; } }
    function startLoadingQuestion() { questionText.style.display = 'none'; optionsGrid.style.display = 'none'; document.querySelector('.spinner-container').style.display = 'flex'; }
    function stopLoadingQuestion() { questionText.style.display = 'block'; optionsGrid.style.display = 'grid'; document.querySelector('.spinner-container').style.display = 'none'; }

    init();
});
