class QuizGame {
    constructor() {
        this.API_URL = "https://script.google.com/macros/s/AKfycbwi72l54yg_38WH81fa2ZQFJ9PjC0z_PxaYTUpr7zgmy7haTcjgwTVU9YsHP0h0Fmrh/exec";
        this.QUESTION_TIME = 60; // تم تعديل الوقت إلى 60 ثانية كما في HTML
        this.TOTAL_AVATARS = 16; // تم تعديل العدد ليتوافق مع طلب 16 أيقونة
        this.LIMIT_PER_DAY = 5;
        this.MAX_WRONG_ANSWERS = 3;

        // (مُعدل) بنك الأسئلة ليحتوي على 16 سؤالاً
        this.QUESTIONS = [
            { q: "ما هي عاصمة مصر؟", options: ["الإسكندرية", "القاهرة", "الجيزة", "الأقصر"], correct: 1 },
            { q: "ما هو لون الموز عندما ينضج؟", options: ["أحمر", "أصفر", "أخضر", "أزرق"], correct: 1 },
            { q: "ما هو المشروب الأكثر شيوعاً مع الطعام؟", options: ["شاي", "ماء", "قهوة", "لبن"], correct: 1 },
            { q: "ما هو الطائر الذي يشتهر بصوت 'الحفيف'؟", options: ["بومة", "حمامة", "صقر", "نسر"], correct: 1 },
            { q: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correct: 2 },
            { q: "ما هو اسم الكوكب الذي نعيش عليه؟", options: ["المريخ", "عطارد", "الأرض", "زحل"], correct: 2 },
            { q: "ما هي الفاكهة الحمراء من الداخل وتحتوي على بذور سوداء صغيرة؟", options: ["تفاح", "بطيخ", "موز", "كمثرى"], correct: 1 },
            { q: "أين تعيش الأسماك بشكل أساسي؟", options: ["في السماء", "في الماء", "في الرمل", "في الحديقة"], correct: 1 },
            { q: "كم عدد أصابع اليد الواحدة؟", options: ["4", "5", "6", "7"], correct: 1 },
            { q: "ما هو الشيء الذي نضع فيه الطعام لنأكله؟", options: ["كرسي", "صحن", "طاولة", "كوب"], correct: 1 },
            { q: "من أين تشرق الشمس؟", options: ["الغرب", "الشرق", "الشمال", "الجنوب"], correct: 1 },
            { q: "ما هو الحيوان الذي يشتهر بصوت 'مواء'؟", options: ["كلب", "قط", "بقرة", "حصان"], correct: 1 },
            { q: "ما هي الأداة الرئيسية المستخدمة في الكتابة؟", options: ["سكين", "قلم", "ملعقة", "مسطرة"], correct: 1 },
            { q: "ما هي الفاكهة التي اسمها ولونها 'برتقالي'؟", options: ["تفاح", "برتقال", "مانجو", "جوافة"], correct: 1 },
            { q: "ما هو الشهر الذي يأتي بعد شهر رمضان؟", options: ["محرم", "شوال", "صفر", "رجب"], correct: 1 },
            { q: "(سؤال احتياطي) أي حيوان يُعرف بأنه 'ملك الغابة'؟", options: ["النمر", "الفيل", "الأسد", "الذئب"], correct: 2 }
        ];

        // (مُعدل) قائمة الألقاب لتصبح 16
        this.PRIZES = [
            { points: 100, title: "مشارك واعد" },
            { points: 200, title: "مستكشف المعرفة" },
            { points: 300, title: "باحث مجتهد" },
            { points: 500, title: "مثقف مبتدئ" },
            { points: 1000, title: "نجم المعرفة البرونزي" },
            { points: 2000, title: "صاحب الفضول" },
            { points: 4000, title: "متعمق بالحقائق" },
            { points: 8000, title: "خبير المعلومات" },
            { points: 16000, title: "نجم المعرفة الفضي" },
            { points: 32000, title: "سيد الأسئلة" },
            { points: 64000, title: "عقل متقد" },
            { points: 125000, title: "عبقري عصره" },
            { points: 250000, title: "حكيم المعرفة" },
            { points: 500000, title: "نجم المسابقة" },
            { points: 1000000, title: "أسطورة المعرفة" },
            { points: 2000000, title: "نجم المعرفة الذهبي" }
        ];

        // (مُعدل) تكاليف المساعدات
        this.HELPER_COSTS = {
            fiftyFifty: 500,
            changeQuestion: 1000
        };

        // حالة اللعبة
        this.gameState = {};
        this.currentScoreValue = 0;
        this.timerInterval = null;
        this.answerSubmitted = false;

        this.domElements = {};
        this.init();
    }

    init() {
        this.cacheDomElements();
        this.bindEventListeners();
        this.populateAvatarGrid();
        this.generatePrizesList();
        this.loadTheme();
        this.showScreen('start');
        this.hideLoader();
    }

    cacheDomElements() {
        this.domElements = {
            screens: {
                loader: document.getElementById('loader'),
                start: document.getElementById('startScreen'),
                avatar: document.getElementById('avatarScreen'),
                nameEntry: document.getElementById('nameEntry'),
                welcome: document.getElementById('welcomeScreen'), // (جديد)
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
            nameInput: document.getElementById('nameInput'),
            nameError: document.getElementById('nameError'),
            confirmAvatarBtn: document.getElementById('confirmAvatarBtn'),
            themeToggleBtn: document.querySelector('.theme-toggle-btn'),
            welcomeMessage: document.getElementById('welcomeMessage'), // (جديد)
        };
    }

    bindEventListeners() {
        document.getElementById('startPlayBtn').addEventListener('click', () => this.showScreen('avatar'));
        this.domElements.confirmAvatarBtn.addEventListener('click', () => this.showScreen('nameEntry'));
        document.getElementById('confirmNameBtn').addEventListener('click', () => this.showWelcomeScreen());
        document.getElementById('welcomeConfirmBtn').addEventListener('click', () => this.startGame());
        document.getElementById('showLeaderboardBtn').addEventListener('click', () => this.displayLeaderboard());
        document.getElementById('backToStartBtn').addEventListener('click', () => this.showScreen('start'));
        this.domElements.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
        document.querySelector('.open-sidebar-btn').addEventListener('click', () => this.toggleSidebar(true));
        document.querySelector('.close-sidebar-btn').addEventListener('click', () => this.toggleSidebar(false));
        this.domElements.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
        this.domElements.helperBtns.forEach(btn => btn.addEventListener('click', (e) => this.useHelper(e)));
        document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
        document.getElementById('shareInstagramBtn').addEventListener('click', () => this.shareOnInstagram());
        this.domElements.nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.showWelcomeScreen(); });
        
        // تشغيل صوت النقر لجميع الأزرار
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => this.playSound('click'));
        });
    }

    populateAvatarGrid() {
        const avatarGrid = document.querySelector('.avatar-grid');
        avatarGrid.innerHTML = '';
        for (let i = 1; i <= this.TOTAL_AVATARS; i++) {
            const img = document.createElement('img');
            img.src = `assets/avatars/avatar${i}.png`;
            img.alt = `صورة رمزية ${i}`;
            img.classList.add('avatar-option');
            img.addEventListener('click', () => {
                this.playSound('click');
                document.querySelectorAll('.avatar-option.selected').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                this.gameState.avatar = img.src;
                this.domElements.confirmAvatarBtn.disabled = false;
            });
            avatarGrid.appendChild(img);
        }
    }
    
    // (جديد) إظهار شاشة الترحيب
    showWelcomeScreen() {
        const name = this.domElements.nameInput.value.trim();
        if (name.length < 2) {
            this.domElements.nameError.textContent = "الرجاء إدخال اسم صحيح (حرفين على الأقل).";
            this.domElements.nameError.classList.add('show');
            return;
        }
        this.domElements.nameError.classList.remove('show');
        this.gameState.name = name;
        this.domElements.welcomeMessage.innerHTML = `🌟 مرحبا بك يا ${name}! 🌟`;
        this.showScreen('welcome');
    }

    async startGame() {
        this.showScreen('loader');
        try {
            const response = await this.apiCall({
                action: 'start',
                deviceId: this.getDeviceId(),
                name: this.gameState.name,
            });

            if (response && response.success) {
                this.resetGameState(response.attemptId);
                this.setupGameUI();
                this.showScreen('game');
                this.fetchQuestion();
            } else {
                const errorMsg = response && response.error === 'limit_reached'
                    ? `لقد استنفدت محاولاتك اليومية (${this.LIMIT_PER_DAY}).`
                    : "حدث خطأ عند بدء اللعبة.";
                this.showToast(errorMsg, 'error');
                this.showScreen('start');
            }
        } catch (error) {
            console.error("Error starting game:", error);
            this.showToast("حدث خطأ في الاتصال بالخادم.", "error");
            this.showScreen('start');
        }
    }

    shuffleQuestions() {
        const shuffled = [...this.QUESTIONS];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    fetchQuestion() {
        if (this.gameState.shuffledQuestions.length === 0) {
            this.gameState.shuffledQuestions = this.shuffleQuestions();
        }
        const currentQuestionData = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        this.displayQuestion(currentQuestionData);
    }

    displayQuestion(questionData) {
        this.answerSubmitted = false; // (جديد) السماح بإجابة جديدة
        this.domElements.questionText.textContent = questionData.q;
        document.getElementById('questionCounter').textContent = `السؤال ${this.gameState.currentQuestion + 1} / ${this.QUESTIONS.length}`;
        this.domElements.optionsGrid.innerHTML = '';
        questionData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', () => this.checkAnswer(index, button));
            this.domElements.optionsGrid.appendChild(button);
        });
        this.updateUI();
        this.startTimer();
    }

    checkAnswer(selectedIndex, selectedButton) {
        if (this.answerSubmitted) return; // (جديد) منع الإجابات المتكررة
        this.answerSubmitted = true;
        
        clearInterval(this.timerInterval);
        document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

        const currentQuestion = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        const isCorrect = (currentQuestion.correct === selectedIndex);

        if (isCorrect) {
            this.playSound('correct');
            selectedButton.classList.add('correct');
            const pointsEarned = this.PRIZES[this.gameState.currentQuestion]?.points || 0;
            this.updateScore(this.currentScoreValue + pointsEarned);
            this.gameState.currentQuestion++;
        } else {
            this.playSound('wrong');
            selectedButton.classList.add('wrong');
            document.querySelector(`.option-btn[data-index='${currentQuestion.correct}']`).classList.add('correct');
            this.gameState.wrongAnswers++;
        }
        this.updateUI();

        const isGameOver = this.gameState.wrongAnswers >= this.MAX_WRONG_ANSWERS || this.gameState.currentQuestion >= this.QUESTIONS.length;
        
        setTimeout(() => {
            if (isGameOver) {
                this.endGame();
            } else {
                this.fetchQuestion();
            }
        }, 2000);
    }
    
    // (مُعدل) endGame لظهور النتائج فوراً
    endGame() {
        clearInterval(this.timerInterval);
        const totalTimeSeconds = (new Date() - new Date(this.gameState.startTime)) / 1000;
        const finalTitle = this.gameState.currentQuestion > 0 ? this.PRIZES[this.gameState.currentQuestion - 1].title : "لا يوجد";

        // حفظ البيانات النهائية للمشاركة
        this.gameState.finalStats = {
            name: this.gameState.name,
            title: finalTitle,
            score: this.currentScoreValue,
            time: this.formatTime(totalTimeSeconds)
        };
        
        // إظهار النتائج فوراً
        document.getElementById('finalName').textContent = this.gameState.finalStats.name;
        document.getElementById('finalTitle').textContent = this.gameState.finalStats.title;
        document.getElementById('finalScore').textContent = this.formatNumber(this.gameState.finalStats.score);
        document.getElementById('totalTime').textContent = this.gameState.finalStats.time;
        this.showScreen('end');
        
        // إرسال البيانات للخادم في الخلفية
        this.apiCall({
            action: 'end',
            attemptId: this.gameState.attemptId,
            name: this.gameState.name,
            score: this.currentScoreValue,
            finalTitle: finalTitle,
            totalTime: totalTimeSeconds
        }).catch(error => console.error("Failed to save score:", error));
    }
    
    // (مُعدل) useHelper لتفعيل الميزات
    useHelper(event) {
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const cost = this.HELPER_COSTS[type];

        if (this.currentScoreValue < cost) {
            this.showToast("نقاطك غير كافية!", "error");
            return;
        }

        this.updateScore(this.currentScoreValue - cost);
        this.gameState.helpersUsed[type] = true;
        btn.disabled = true;
        this.showToast(`تم استخدام المساعدة!`, "success");

        if (type === 'fiftyFifty') {
            const currentQuestion = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
            const correctIndex = currentQuestion.correct;
            const options = Array.from(document.querySelectorAll('.option-btn'));
            let wrongOptions = options.filter(opt => parseInt(opt.dataset.index) !== correctIndex);
            
            // إخفاء إجابتين خاطئتين عشوائياً
            wrongOptions.sort(() => 0.5 - Math.random());
            wrongOptions[0].classList.add('hidden');
            wrongOptions[1].classList.add('hidden');
        } else if (type === 'changeQuestion') {
            if (this.gameState.currentQuestion < this.QUESTIONS.length - 1) {
                this.gameState.currentQuestion++; // تخطي السؤال الحالي
                this.fetchQuestion();
            } else {
                 this.showToast("لا يمكن تغيير السؤال الأخير!", "warning");
            }
        }
        this.updateUI();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.gameState.timeLeft = this.QUESTION_TIME;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.querySelector('.timer-text');

        this.timerInterval = setInterval(() => {
            this.gameState.timeLeft--;
            timerDisplay.textContent = this.gameState.timeLeft;
            timerBar.style.width = `${(this.gameState.timeLeft / this.QUESTION_TIME) * 100}%`;

            if (this.gameState.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.playSound('wrong');
                this.showToast("انتهى الوقت!", "error");
                this.gameState.wrongAnswers++;
                document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));
                const correctIndex = this.gameState.shuffledQuestions[this.gameState.currentQuestion].correct;
                document.querySelector(`.option-btn[data-index='${correctIndex}']`).classList.add('correct');
                
                this.updateUI();
                
                setTimeout(() => {
                    if (this.gameState.wrongAnswers >= this.MAX_WRONG_ANSWERS) {
                        this.endGame();
                    } else {
                        this.fetchQuestion();
                    }
                }, 2000);
            }
        }, 1000);
    }
    
    updateScore(newScore) {
        this.currentScoreValue = newScore;
        this.domElements.scoreDisplay.textContent = this.formatNumber(this.currentScoreValue);
        this.updateUI();
    }

    updateUI() {
        document.getElementById('wrongAnswersCount').textContent = `${this.gameState.wrongAnswers} / ${this.MAX_WRONG_ANSWERS}`;
        const currentTitle = this.gameState.currentQuestion > 0 ? this.PRIZES[this.gameState.currentQuestion - 1].title : "لا يوجد";
        document.getElementById('currentTitle').textContent = currentTitle;

        this.updatePrizesList();

        this.domElements.helperBtns.forEach(btn => {
            const type = btn.dataset.type;
            btn.disabled = this.gameState.helpersUsed[type] || this.currentScoreValue < this.HELPER_COSTS[type];
        });
    }

    generatePrizesList() {
        this.domElements.prizesList.innerHTML = '';
        [...this.PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${this.PRIZES.length - index}. ${prize.title}</span> <strong>${this.formatNumber(prize.points)}</strong>`;
            this.domElements.prizesList.appendChild(li);
        });
    }

    updatePrizesList() {
        const items = this.domElements.prizesList.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.remove('current', 'past');
            const prizeIndex = this.PRIZES.length - 1 - index;
            if (prizeIndex === this.gameState.currentQuestion) {
                item.classList.add('current');
            } else if (prizeIndex < this.gameState.currentQuestion) {
                item.classList.add('past');
            }
        });
    }

    async displayLeaderboard() {
        this.showScreen('leaderboard');
        const contentDiv = document.getElementById('leaderboardContent');
        contentDiv.innerHTML = '<div class="spinner"></div>';

        try {
            const response = await this.apiCall({ action: 'getLeaderboard' });
            if (response && response.success && response.leaderboard) {
                let tableHTML = '<p>لوحة الصدارة فارغة حاليًا!</p>';
                if (response.leaderboard.length > 0) {
                    tableHTML = `<table class="leaderboard-table">
                        <tr><th>الترتيب</th><th>الاسم</th><th>النقاط</th><th>اللقب</th></tr>
                        ${response.leaderboard.map(row => `
                            <tr>
                                <td>${['🥇', '🥈', '🥉'][row[0] - 1] || row[0]}</td>
                                <td>${row[1]}</td>
                                <td>${this.formatNumber(row[2])}</td>
                                <td>${row[3]}</td>
                            </tr>`).join('')}
                    </table>`;
                }
                contentDiv.innerHTML = tableHTML;
            } else {
                contentDiv.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
            }
        } catch (error) {
            console.error("Error loading leaderboard:", error);
            contentDiv.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
        }
    }
    
    // (مُعدل) getShareText لنص المشاركة
    getShareText() {
        const { name, title, score, time } = this.gameState.finalStats;
        return `✨ نتائجي في مسابقة "من سيربح اللقب" ✨\n` +
               `الاسم: ${name}\n` +
               `اللقب: ${title}\n` +
               `النقاط: ${this.formatNumber(score)}\n` +
               `المدة: ${time}\n\n` +
               `🔗 جرب حظك أنت أيضاً: https://abuqusayms.github.io/Tbate-Game/`;
    }
    
    shareOnX() {
        const text = encodeURIComponent(this.getShareText());
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    }

    shareOnInstagram() {
        navigator.clipboard.writeText(this.getShareText())
            .then(() => this.showToast("تم نسخ النتيجة! الصقها في قصتك أو رسائلك على إنستغرام.", "success"))
            .catch(() => this.showToast("فشل نسخ النتيجة.", "error"));
    }

    resetGameState(attemptId) {
        this.gameState = {
            deviceId: this.getDeviceId(),
            attemptId: attemptId,
            name: this.gameState.name,
            avatar: this.gameState.avatar,
            currentQuestion: 0,
            wrongAnswers: 0,
            startTime: new Date().toISOString(),
            helpersUsed: { fiftyFifty: false, changeQuestion: false },
            shuffledQuestions: [],
        };
        this.updateScore(0);
    }

    setupGameUI() {
        document.getElementById('playerAvatar').src = this.gameState.avatar;
        document.getElementById('playerName').textContent = this.gameState.name;
    }

    toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        this.domElements.themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.dataset.theme = savedTheme;
        this.domElements.themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    toggleSidebar(open) {
        this.domElements.sidebar.classList.toggle('open', open);
        this.domElements.sidebarOverlay.classList.toggle('active', open);
        document.querySelector('.open-sidebar-btn').setAttribute('aria-expanded', open);
    }

    playSound(sound) {
        const soundElement = this.domElements.sounds[sound];
        if (soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.warn(`Sound play failed: ${e.message}`));
        }
    }
    
    // (مُعدل) showScreen لإصلاح خطأ aria
    showScreen(screenName) {
        if (document.activeElement) document.activeElement.blur(); // (جديد) إزالة التركيز
        
        Object.values(this.domElements.screens).forEach(screen => {
            screen.classList.remove('active');
            screen.setAttribute('aria-hidden', 'true');
        });
        const activeScreen = this.domElements.screens[screenName];
        if (activeScreen) {
            activeScreen.classList.add('active');
            activeScreen.setAttribute('aria-hidden', 'false');
            // نقل التركيز إلى أول عنصر تفاعلي لتحسين الوصولية
            const firstFocusable = activeScreen.querySelector('button, [href], input, select, textarea');
            if(firstFocusable) firstFocusable.focus();
        }
    }

    hideLoader() {
        this.domElements.screens.loader.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async apiCall(payload) {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    getDeviceId() {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('deviceId', id);
        }
        return id;
    }
    
    // (جديد) تنسيق الوقت
    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        if (minutes > 0) {
            return `${minutes} دقيقة و ${seconds} ثانية`;
        }
        return `${seconds} ثانية`;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});
