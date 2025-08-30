document.addEventListener('DOMContentLoaded', () => {

    // !!! IMPORTANT: Paste your new Web App URL here !!!
    const API_URL = "https://script.google.com/macros/library/d/1_P2vV_6ni5x3hiH9r-Hm_nOWVzuOlJ9P4rkRytEeZxjHULDzTJbDG6ZH/1"; 
    
    const QUESTION_TIME = 90;
    const TOTAL_AVATARS = 20;
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

    const dom = {
        screens: {
            loader: document.getElementById('loader'),
            start: document.getElementById('startScreen'),
            avatar: document.getElementById('avatarScreen'),
            nameEntry: document.getElementById('nameEntry'),
            game: document.getElementById('gameContainer'),
            end: document.getElementById('endScreen'),
            leaderboard: document.getElementById('leaderboardScreen'),
        },
        sounds: {
            correct: document.getElementById('correct-sound'),
            wrong: document.getElementById('wrong-sound'),
            click: document.getElementById('click-sound'),
        },
        sidebar: document.querySelector('.sidebar'),
        sidebarOverlay: document.querySelector('.sidebar-overlay'),
        questionText: document.getElementById('questionText'),
        optionsGrid: document.querySelector('.options-grid'),
        scoreDisplay: document.getElementById('currentScore'),
        prizesList: document.querySelector('.prizes-list'),
    };

    let gameState = { deviceId: getDeviceId() };
    let timerInterval;
    let currentScoreValue = 0;

    function init() {
        populateAvatarGrid();
        bindEventListeners();
        generatePrizesList();
        loadTheme();
        showScreen('start');
        dom.screens.loader.classList.remove('active');
    }

    function populateAvatarGrid() {
        const avatarGrid = document.querySelector('.avatar-grid');
        for (let i = 1; i <= TOTAL_AVATARS; i++) {
            const img = document.createElement('img');
            img.src = `assets/avatars/avatar${i}.png`;
            img.classList.add('avatar-option');
            img.addEventListener('click', () => {
                playSound('click');
                document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                gameState.avatar = img.src;
                document.getElementById('confirmAvatarBtn').disabled = false;
            });
            avatarGrid.appendChild(img);
        }
    }

    function bindEventListeners() {
        document.getElementById('startPlayBtn').addEventListener('click', () => { playSound('click'); showScreen('avatar'); });
        document.getElementById('confirmAvatarBtn').addEventListener('click', () => { playSound('click'); showScreen('nameEntry'); });
        document.getElementById('confirmNameBtn').addEventListener('click', startGame);
        document.getElementById('showLeaderboardBtn').addEventListener('click', displayLeaderboard);
        document.getElementById('backToStartBtn').addEventListener('click', () => { playSound('click'); showScreen('start'); });
        document.querySelector('.theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
        document.querySelector('.open-sidebar-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.close-sidebar-btn').addEventListener('click', toggleSidebar);
        dom.sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    async function startGame() {
        playSound('click');
        const name = document.getElementById('nameInput').value.trim();
        if (name.length < 2) { showToast("الرجاء إدخال اسم صحيح.", 'error'); return; }
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
            showToast("خطأ في تحميل السؤال. تأكد من الرابط.", 'error');
            showScreen('start');
        }
        stopLoadingQuestion();
    }
    
    function displayQuestion(question, qNum, totalQ) {
        dom.questionText.textContent = question.q;
        document.getElementById('questionCounter').textContent = `السؤال ${qNum} / ${totalQ}`;
        dom.optionsGrid.innerHTML = '';
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('option-btn');
            button.textContent = option;
            button.dataset.index = index;
            button.onclick = () => checkAnswer(index, button);
            dom.optionsGrid.appendChild(button);
        });
        updateUI();
    }

    async function checkAnswer(selectedIndex, button) {
        clearInterval(timerInterval);
        document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

        const response = await apiCall({ action: 'answer', attemptId: gameState.attemptId, answerIndex: selectedIndex });

        if (response && response.success) {
            if (response.correct) {
                playSound('correct');
                button.classList.add('correct');
                updateScore(currentScoreValue + PRIZES[gameState.currentQuestion].points);
                gameState.currentQuestion++;
            } else {
                playSound('wrong');
                button.classList.add('wrong');
                document.querySelector(`.option-btn[data-index='${response.correctIndex}']`).classList.add('correct');
                gameState.wrongAnswers = response.wrongAnswers;
            }
            
            updateUI();

            setTimeout(() => {
                if (response.gameOver || gameState.currentQuestion >= PRIZES.length) {
                    endGame();
                } else if (response.correct) {
                    fetchQuestion();
                } else {
                    endGame();
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
    
    function updateScore(newScore) {
        const start = currentScoreValue;
        const diff = newScore - start;
        if(diff === 0) return;
        let step = 0;
        const duration = 500;
        const interval = setInterval(() => {
            step += 20;
            const progress = Math.min(step / duration, 1);
            const animatedScore = Math.floor(start + diff * progress);
            dom.scoreDisplay.textContent = `النقاط: ${formatNumber(animatedScore)}`;
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
        dom.prizesList.innerHTML = '';
        [...PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${15 - index}</span> - ${prize.title}`;
            dom.prizesList.appendChild(li);
        });
    }

    function updatePrizesList() {
        const items = dom.prizesList.querySelectorAll('li');
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
        playSound('click');
        dom.sidebar.classList.toggle('open');
        dom.sidebarOverlay.classList.toggle('active');
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
        playSound('click');
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
        playSound('click');
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
    function playSound(sound) {
        if (dom.sounds[sound]) {
            dom.sounds[sound].currentTime = 0;
            dom.sounds[sound].play().catch(e => console.log("Audio play failed:", e));
        }
    }
    function showScreen(screenName) { Object.values(dom.screens).forEach(s => s.classList.remove('active')); if(dom.screens[screenName]) dom.screens[screenName].classList.add('active'); }
    function getDeviceId() { let id = localStorage.getItem('deviceId'); if (!id) { id = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; localStorage.setItem('deviceId', id); } return id; }
    function formatNumber(num) { return new Intl.NumberFormat('ar-EG').format(num); }
    async function apiCall(payload) { try { const res = await fetch(API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); if (!res.ok) throw new Error("Network error"); return await res.json(); } catch (error) { console.error('API Error:', error); return { success: false, error: error.message }; } }
    function startLoadingQuestion() { dom.questionText.style.display = 'none'; dom.optionsGrid.style.display = 'none'; document.querySelector('.spinner-container').style.display = 'flex'; }
    function stopLoadingQuestion() { dom.questionText.style.display = 'block'; dom.optionsGrid.style.display = 'grid'; document.querySelector('.spinner-container').style.display = 'none'; }

    init();
});
