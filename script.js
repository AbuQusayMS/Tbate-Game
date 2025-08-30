document.addEventListener('DOMContentLoaded', () => {

    // !!! مهم جداً: الصق رابط النشر الصحيح والجديد هنا !!!
    const API_URL = "https://script.google.com/macros/s/AKfycbwS16Exl-EFOufB-ptfDDFepIzZJBcqCSXgCd7dt8DY5RhPQyVW_XkPyynAxN9Av7MA/exec"; 
    
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
    const HELPER_COSTS = { fiftyFifty: 20000, freezeTime: 15000, changeQuestion: 30000 };

    // --- Cache DOM Elements ---
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
        helperBtns: document.querySelectorAll('.helper-btn'),
    };

    // --- Game State ---
    let gameState = { deviceId: getDeviceId() };
    let timerInterval;
    let currentScoreValue = 0;
    let isTimeFrozen = false;

    // --- Initialization ---
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
        avatarGrid.innerHTML = ''; // Clear previous avatars
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
        dom.helperBtns.forEach(btn => btn.addEventListener('click', useHelper));
        document.getElementById('shareXBtn').addEventListener('click', shareOnX);
        document.getElementById('shareInstagramBtn').addEventListener('click', shareOnInstagram);
    }

    // --- Core Game Flow ---
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
            const errorMsg = response && response.error === 'limit_reached' ? `لقد وصلت للحد الأقصى للمحاولات (${LIMIT_PER_DAY}).` : "حدث خطأ عند بدء اللعبة.";
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
            
            const isGameOver = gameState.wrongAnswers >= 3 || gameState.currentQuestion >= PRIZES.length;

            setTimeout(() => {
                if (isGameOver) {
                    endGame();
                } else if (response.correct) {
                    fetchQuestion();
                } else {
                    showToast(`إجابة خاطئة! تبقى لديك ${3 - gameState.wrongAnswers} محاولات.`, 'error');
                    setTimeout(fetchQuestion, 2000); // Fetch next question after showing the correct one
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
        
        // Save final data for sharing
        gameState.finalTitle = finalTitle;
        gameState.finalScore = currentScoreValue;
        
        apiCall({ action: 'end', attemptId: gameState.attemptId, score: currentScoreValue, finalTitle, totalTime });
        
        document.getElementById('finalName').textContent = gameState.name;
        document.getElementById('finalTitle').textContent = finalTitle;
        document.getElementById('finalScore').textContent = formatNumber(currentScoreValue);
        document.getElementById('totalTime').textContent = `${Math.round(totalTime)} ثانية`;
        showScreen('end');
    }

    // --- Helpers Logic ---
    function useHelper(event) {
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const cost = HELPER_COSTS[type];

        if (currentScoreValue < cost) {
            showToast("نقاطك غير كافية!", "error");
            return;
        }

        playSound('click');
        updateScore(currentScoreValue - cost);
        gameState.helpersUsed[type] = true;
        btn.disabled = true;

        showToast(`تم استخدام مساعدة! خصم ${formatNumber(cost)} نقطة.`, "info");

        if (type === 'freezeTime') {
            isTimeFrozen = true;
            document.querySelector('.timer-container').classList.add('frozen');
            setTimeout(() => {
                isTimeFrozen = false;
                document.querySelector('.timer-container').classList.remove('frozen');
            }, 10000);
        } else {
            // Placeholder for other helpers
            showToast("ميزة تحت التطوير!", "info");
        }
        updateUI();
    }

    // --- UI & State Management ---
    function startTimer() {
        clearInterval(timerInterval);
        isTimeFrozen = false;
        document.querySelector('.timer-container').classList.remove('frozen');
        gameState.timeLeft = QUESTION_TIME;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.getElementById('timer');
        
        timerInterval = setInterval(() => {
            if (isTimeFrozen) return;
            gameState.timeLeft--;
            timerDisplay.textContent = gameState.timeLeft;
            timerBar.style.width = `${(gameState.timeLeft / QUESTION_TIME) * 100}%`;
            
            if (gameState.timeLeft <= 0) {
                clearInterval(timerInterval);
                playSound('wrong');
                showToast("انتهى الوقت!", "error");
                gameState.wrongAnswers++;
                updateUI();
                if (gameState.wrongAnswers >= 3) {
                    setTimeout(endGame, 1000);
                } else {
                    setTimeout(fetchQuestion, 1000);
                }
            }
        }, 1000);
    }
    
    function updateScore(newScore) {
        const start = currentScoreValue;
        const diff = newScore - start;
        if(diff === 0) {
            dom.scoreDisplay.textContent = formatNumber(newScore);
            return;
        };
        let step = 0;
        const duration = 500;
        const interval = setInterval(() => {
            step += 20;
            const progress = Math.min(step / duration, 1);
            const animatedScore = Math.floor(start + diff * progress);
            dom.scoreDisplay.textContent = formatNumber(animatedScore);
            if (progress >= 1) {
                clearInterval(interval);
                updateUI(); // Update helpers after score settles
            }
        }, 20);
        currentScoreValue = newScore;
    }
    
    function updateUI() {
        document.getElementById('wrongAnswersCount').textContent = `${gameState.wrongAnswers} / 3`;
        document.getElementById('currentTitle').textContent = gameState.currentQuestion > 0 ? PRIZES[gameState.currentQuestion-1].title : "لا يوجد";
        updatePrizesList();

        dom.helperBtns.forEach(btn => {
            const type = btn.dataset.type;
            if (!gameState.helpersUsed[type] && currentScoreValue >= HELPER_COSTS[type]) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        });
    }
    
    function generatePrizesList() {
        dom.prizesList.innerHTML = '';
        [...PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${15 - index}. ${prize.title}</span> <strong>${formatNumber(prize.points)}</strong>`;
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

    // --- Sharing ---
    function getShareText() {
        return `🏆 لقد حصلت على لقب "${gameState.finalTitle}" في مسابقة "من سيربح اللقب؟" بمجموع ${formatNumber(gameState.finalScore)} نقطة!`;
    }
    function shareOnX() {
        playSound('click');
        const text = encodeURIComponent(getShareText());
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank');
    }
    function shareOnInstagram() {
        playSound('click');
        navigator.clipboard.writeText(getShareText())
            .then(() => {
                showToast("تم نسخ النتيجة! يمكنك الآن لصقها في قصة إنستغرام.", "success");
            })
            .catch(() => {
                showToast("فشل نسخ النتيجة.", "error");
            });
    }
    
    // --- Utility & Setup ---
    function resetGameState(attemptId) {
        gameState.attemptId = attemptId;
        gameState.currentQuestion = 0;
        gameState.wrongAnswers = 0;
        gameState.startTime = new Date().toISOString();
        gameState.helpersUsed = { fiftyFifty: false, freezeTime: false, changeQuestion: false };
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
            dom.sounds[sound].play().catch(e => {});
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
