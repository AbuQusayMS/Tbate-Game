class QuizGame {
    constructor() {
        // --- الإعدادات الرئيسية ---
        this.API_URL = "https://script.google.com/macros/s/AKfycbwS16Exl-EFOufB-ptfDDFepIzZJBcqCSXgCd7dt8DY5RhPQyVW_XkPyynAxN9Av7MA/exec"; // تأكد من أن هذا هو الرابط الصحيح والمنشور
        this.QUESTION_TIME = 90;
        this.TOTAL_AVATARS = 16; // تم التعديل إلى 16 أيقونة
        this.LIMIT_PER_DAY = 5;

        // --- بنك الأسئلة ---
        this.QUESTIONS = [
            { q: "العاصمة تبع مصر شو هي؟", options: ["الإسكندرية", "القاهرة", "الجيزة", "الأقصر"], correct: 1 },
            { q: "شو لون الموز لما يستوي؟", options: ["أحمر", "أصفر", "أخضر", "أزرق"], correct: 1 },
            { q: "أكتر شي منشربه مع الأكل؟", options: ["شاي", "مي", "قهوة", "لبن"], correct: 1 },
            { q: "الطير اللي بيقول 'كو كو' مين هو؟", options: ["ديك", "حمامة", "بومة", "دجاجة"], correct: 3 },
            { q: "عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correct: 2 },
            { q: "شو اسم الكوكب اللي إحنا عايشين عليه؟", options: ["المريخ", "عطارد", "الأرض", "زحل"], correct: 2 },
            { q: "الشي اللي مناكلو وبنلاقي جواتو بذور صغيرة كتيرة (أحمر من جوه)؟", options: ["تفاح", "بطيخ", "موز", "كمثرى"], correct: 1 },
            { q: "وين منشوف الأسماك؟", options: ["بالسماء", "بالمية", "بالرمل", "بالحديقة"], correct: 1 },
            { q: "عدد أصابع الإيد وحدة؟", options: ["4", "5", "6", "7"], correct: 1 },
            { q: "الشي اللي بنحط فيه الأكل عشان ناكله؟", options: ["كرسي", "صحن", "طاولة", "كوب"], correct: 1 },
            { q: "الشمس بتطلع من وين؟", options: ["الغرب", "الشرق", "الشمال", "الجنوب"], correct: 1 },
            { q: "الحيوان اللي بقول 'مياو' مين هو؟", options: ["كلب", "قط", "بقرة", "حصان"], correct: 1 },
            { q: "أكتر شي منستخدمو نكتب فيه؟", options: ["سكين", "قلم", "معلقة", "مسطرة"], correct: 1 },
            { q: "الفاكهة اللي لونها برتقالي واسمها نفس اللون؟", options: ["تفاح", "برتقال", "مانجو", "جوافة"], correct: 1 },
            { q: "الشهر اللي بييجي بعد رمضان؟", options: ["محرم", "شوال", "صفر", "رجب"], correct: 1 }
        ];
        this.RESERVE_QUESTION = { q: "كم عدد أرجل العنكبوت؟", options: ["4", "6", "8", "10"], correct: 2 };

        this.PRIZES = [
            { points: 100, title: "مشارك واعد" }, { points: 200, title: "مستكشف المعرفة" },
            { points: 300, title: "باحث مجتهد" }, { points: 500, title: "مثقف مبتدئ" },
            { points: 1000, title: "نجم المعرفة البرونزي" }, { points: 2000, title: "صاحب الفضول" },
            { points: 4000, title: "متعمق بالحقائق" }, { points: 8000, title: "خبير المعلومات" },
            { points: 16000, title: "نجم المعرفة الفضي" }, { points: 32000, title: "سيد الأسئلة" },
            { points: 64000, title: "عقل متقد" }, { points: 125000, title: "عبقري عصره" },
            { points: 250000, title: "حكيم المعرفة" }, { points: 500000, title: "أسطورة المسابقة" },
            { points: 1000000, title: "نجم المعرفة الذهبي" }
        ];
        
        this.HELPER_COSTS = { fiftyFifty: 20000, freezeTime: 15000, changeQuestion: 30000 };
        
        this.gameState = {};
        this.isAnswerable = true;
        this.dom = {};

        this.init();
    }

    // --- التهيئة ---
    init() {
        this.cacheDomElements();
        // لا يوجد داعي لـ bindEventListeners هنا لأنها تتم ديناميكيًا
        this.loadTheme();
        this.renderScreen('loader');
        setTimeout(() => this.renderScreen('start'), 500);
    }

    cacheDomElements() {
        this.dom.mainContent = document.getElementById('main-content');
        this.dom.sidebar = document.getElementById('prizesSidebar');
        this.dom.sidebarOverlay = document.querySelector('.sidebar-overlay');
        if (this.dom.sidebar) {
            this.dom.prizesList = this.dom.sidebar.querySelector('.prizes-list');
        }
        this.dom.sounds = {
            correct: document.getElementById('correct-sound'),
            wrong: document.getElementById('wrong-sound'),
            click: document.getElementById('click-sound'),
        };
    }
    
    // --- عرض الشاشات ديناميكيًا ---
    renderScreen(screenName, data = {}) {
        this.dom.mainContent.innerHTML = this.getScreenHtml(screenName, data);
        this.bindScreenEventListeners(screenName);
    }

    getScreenHtml(screenName, data) {
        switch (screenName) {
            case 'loader':
                return `<div class="screen active"><div class="spinner"></div></div>`;
            case 'start':
                return `
                    <div class="screen active">
                        <div class="content-box">
                            <h1 class="game-title"><span>👑</span> من سيربح اللقب؟</h1>
                            <div class="button-group">
                                <button id="startPlayBtn" class="btn btn-main">ابدأ اللعب</button>
                                <button id="showLeaderboardBtn" class="btn btn-secondary">لوحة الصدارة</button>
                            </div>
                        </div>
                    </div>`;
            case 'avatar':
                let avatarsHtml = '';
                for (let i = 1; i <= this.TOTAL_AVATARS; i++) {
                    avatarsHtml += `<img src="assets/avatars/avatar${i}.png" alt="صورة رمزية ${i}" class="avatar-option" data-avatar-id="${i}">`;
                }
                return `
                    <div class="screen active">
                        <div class="content-box">
                            <h2>اختر صورة رمزية</h2>
                            <div class="avatar-grid">${avatarsHtml}</div>
                            <div class="button-group">
                                <button id="confirmAvatarBtn" class="btn btn-main" disabled>التالي</button>
                            </div>
                        </div>
                    </div>`;
            case 'nameEntry':
                 return `
                    <div class="screen active">
                        <div class="content-box">
                            <h2>أدخل اسمك للمتابعة</h2>
                            <input type="text" id="nameInput" placeholder="اكتب اسمك هنا" maxlength="25">
                            <div class="button-group">
                                <button id="confirmNameBtn" class="btn btn-main">تأكيد</button>
                            </div>
                        </div>
                    </div>`;
            case 'welcome':
                return `
                    <div class="screen active">
                        <div class="content-box welcome-box">
                            <h2>🌟 مرحباً بك يا ${data.name}! 🌟</h2>
                            <ul class="instructions-list">
                                <li>اكتب اسمك المعروف على منصة X أو إنستغرام.</li>
                                <li>لديك فقط ${this.LIMIT_PER_DAY} محاولات يومياً، فاستغلها بحكمة.</li>
                                <li>لا تتسرع في الإجابة… فالوقت بين يديك.</li>
                                <li>في حال واجهت أي مشكلة، راسل المسؤول: <a href="https://x.com/_MS_AbuQusay?t=kRL3hiAkrWtOis70PYNz-w&s=09" target="_blank">القارئ الوحيد</a>.</li>
                            </ul>
                            <div class="button-group">
                                <button id="finalStartBtn" class="btn btn-main">تم</button>
                            </div>
                        </div>
                    </div>`;
            case 'game':
                return `
                    <div class="screen active" id="gameContainer">
                        <div class="top-bar">
                            <button class="theme-toggle-btn" aria-label="تبديل الثيم">☀️</button>
                            <button class="open-sidebar-btn" aria-expanded="false">🏆 الجوائز</button>
                        </div>
                        <header class="game-header">
                            <div class="player-info">
                                <div class="player-main">
                                    <img id="playerAvatar" src="${this.gameState.avatar}" alt="صورة اللاعب الرمزية">
                                    <span id="playerName">${this.gameState.name}</span>
                                </div>
                                <div class="player-stats">
                                    <span>اللقب: <strong id="currentTitle">لا يوجد</strong></span>
                                    <span>النقاط: <strong id="currentScore">0</strong></span>
                                    <span>الأخطاء: <strong id="wrongAnswersCount">0 / 3</strong></span>
                                </div>
                            </div>
                            <div class="helpers">
                                <button class="helper-btn" data-type="fiftyFifty"><span class="helper-cost">(20K)</span> 50:50</button>
                                <button class="helper-btn" data-type="freezeTime"><span class="helper-cost">(15K)</span> ❄️ 10ث</button>
                                <button class="helper-btn" data-type="changeQuestion"><span class="helper-cost">(30K)</span> 🔄 سؤال</button>
                            </div>
                        </header>
                        <div class="timer-container"><div class="timer-bar"></div><span id="timer">${this.QUESTION_TIME}</span></div>
                        <main class="main-content">
                            <section class="question-box">
                                <h3 id="questionCounter"></h3>
                                <p id="questionText"></p>
                            </section>
                            <section class="options-container">
                                <div class="options-grid"></div>
                            </section>
                        </main>
                    </div>`;
             case 'end':
                const minutes = Math.floor(data.totalTime / 60);
                const seconds = Math.round(data.totalTime % 60);
                const timeString = `${minutes} دقيقة و ${seconds} ثانية`;
                return `
                    <div class="screen active">
                        <div class="content-box">
                            <h2>النتائج النهائية</h2>
                            <div class="final-stats">
                                <p>الاسم: <strong>${data.name}</strong></p>
                                <p>اللقب: <strong>${data.finalTitle}</strong></p>
                                <p>النقاط: <strong>${this.formatNumber(data.score)}</strong></p>
                                <p>المدة: <strong>${timeString}</strong></p>
                            </div>
                            <section class="share-section">
                                <h3>مشاركة النتائج</h3>
                                <div class="share-buttons">
                                    <button id="shareXBtn" class="share-btn x">X</button>
                                    <button id="shareInstagramBtn" class="share-btn instagram">Instagram</button>
                                </div>
                            </section>
                            <div class="button-group">
                                <button id="restartBtn" class="btn btn-main">جولة جديدة</button>
                            </div>
                        </div>
                    </div>`;
            default:
                return `<div class="screen active"><div>شاشة غير معروفة</div></div>`;
        }
    }

    bindScreenEventListeners(screenName) {
        if (screenName === 'start') {
            document.getElementById('startPlayBtn').addEventListener('click', () => { this.playSound('click'); this.renderScreen('avatar'); });
            document.getElementById('showLeaderboardBtn').addEventListener('click', () => this.displayLeaderboard());
        } else if (screenName === 'avatar') {
            document.querySelectorAll('.avatar-option').forEach(img => {
                img.addEventListener('click', () => {
                    this.playSound('click');
                    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                    img.classList.add('selected');
                    this.gameState.avatar = img.src;
                    document.getElementById('confirmAvatarBtn').disabled = false;
                });
            });
            document.getElementById('confirmAvatarBtn').addEventListener('click', () => { this.playSound('click'); this.renderScreen('nameEntry'); });
        } else if (screenName === 'nameEntry') {
            const confirmBtn = document.getElementById('confirmNameBtn');
            const nameInput = document.getElementById('nameInput');
            const handleConfirm = () => {
                const name = nameInput.value.trim();
                if (name.length < 2) { this.showToast("الرجاء إدخال اسم صحيح.", 'error'); return; }
                this.gameState.name = name;
                this.playSound('click');
                this.renderScreen('welcome', { name: this.gameState.name });
            };
            confirmBtn.addEventListener('click', handleConfirm);
            nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConfirm(); });
        } else if (screenName === 'welcome') {
             document.getElementById('finalStartBtn').addEventListener('click', () => this.startGame());
        } else if (screenName === 'game') {
            document.querySelector('.open-sidebar-btn').addEventListener('click', () => this.toggleSidebar());
            document.querySelector('.theme-toggle-btn').addEventListener('click', () => this.toggleTheme());
            document.querySelectorAll('.helper-btn').forEach(btn => btn.addEventListener('click', (e) => this.useHelper(e)));
        } else if (screenName === 'end') {
            document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
            document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
            document.getElementById('shareInstagramBtn').addEventListener('click', () => this.shareOnInstagram());
        }
    }

    // --- Core Game Flow ---
    async startGame() {
        this.playSound('click');
        this.renderScreen('loader');
        
        try {
            const response = await this.apiCall({ action: 'start', deviceId: this.getDeviceId(), name: this.gameState.name, avatar: this.gameState.avatar });
            if (response && response.success) {
                this.resetGameState(response.attemptId);
                this.fetchQuestion();
            } else {
                const errorMsg = response && response.error === 'limit_reached' ? `لقد وصلت للحد الأقصى للمحاولات (${this.LIMIT_PER_DAY}).` : "حدث خطأ عند بدء اللعبة.";
                this.showToast(errorMsg, 'error');
                this.renderScreen('start');
            }
        } catch (error) {
            console.error("Error starting game:", error);
            this.showToast("حدث خطأ في الاتصال بالخادم.", "error");
            this.renderScreen('start');
        }
    }
    
    fetchQuestion() {
        if (this.gameState.shuffledQuestions.length === 0) {
            this.gameState.shuffledQuestions = this.shuffleArray([...this.QUESTIONS]);
        }
        
        const questionData = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        const qNum = this.gameState.currentQuestion + 1;
        
        if (!document.getElementById('gameContainer')) {
            this.renderScreen('game');
        }

        setTimeout(() => { // تأخير بسيط للسماح بعرض الواجهة قبل ملء البيانات
            this.displayQuestion(questionData, qNum);
            this.startTimer();
        }, 100);
    }
    
    displayQuestion(question, qNum) {
        document.getElementById('questionText').textContent = question.q;
        document.getElementById('questionCounter').textContent = `السؤال ${qNum} / ${this.QUESTIONS.length}`;
        const optionsGrid = document.querySelector('.options-grid');
        optionsGrid.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('option-btn', 'btn');
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', () => this.checkAnswer(index));
            optionsGrid.appendChild(button);
        });
        
        this.updateUI();
    }

    checkAnswer(selectedIndex) {
        if (!this.isAnswerable) return;
        this.isAnswerable = false;
        clearInterval(this.timerInterval);
        
        const options = document.querySelectorAll('.option-btn');
        options.forEach(b => b.classList.add('disabled'));

        const currentQuestionData = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        const isCorrect = (currentQuestionData.correct === selectedIndex);

        if (isCorrect) {
            this.playSound('correct');
            options[selectedIndex].classList.add('correct');
            this.updateScore(this.currentScoreValue + this.PRIZES[this.gameState.currentQuestion].points);
            this.gameState.currentQuestion++;
        } else {
            this.playSound('wrong');
            options[selectedIndex].classList.add('wrong');
            options[currentQuestionData.correct].classList.add('correct');
            this.gameState.wrongAnswers++;
        }
        
        this.updateUI();
        
        const isGameOver = this.gameState.wrongAnswers >= 3 || this.gameState.currentQuestion >= this.QUESTIONS.length;

        setTimeout(() => {
            if (isGameOver) {
                this.endGame();
            } else {
                if (!isCorrect) {
                    this.showToast(`إجابة خاطئة! تبقى لديك ${3 - this.gameState.wrongAnswers} محاولات.`, 'error');
                }
                this.fetchQuestion();
            }
            this.isAnswerable = true;
        }, 2000);
    }

    async endGame() {
        const totalTime = (new Date() - new Date(this.gameState.startTime)) / 1000;
        const finalTitle = this.gameState.currentQuestion > 0 ? this.PRIZES[this.gameState.currentQuestion - 1].title : "لا يوجد";
        
        this.gameState.finalTitle = finalTitle;
        this.gameState.finalScore = this.currentScoreValue;
        
        this.renderScreen('end', { 
            name: this.gameState.name, 
            finalTitle: finalTitle, 
            score: this.currentScoreValue, 
            totalTime: totalTime 
        });

        try {
            await this.apiCall({ 
                action: 'end', 
                attemptId: this.gameState.attemptId, 
                score: this.currentScoreValue, 
                finalTitle, 
                totalTime 
            });
        } catch(e) {
            console.error("Failed to save final score:", e);
            this.showToast("لم نتمكن من حفظ نتيجتك النهائية.", "error");
        }
    }
    
    // --- Helpers ---
    useHelper(event) {
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const cost = this.HELPER_COSTS[type];

        if (this.currentScoreValue < cost) {
            this.showToast("نقاطك غير كافية!", "error"); return;
        }
        
        this.playSound('click');
        this.updateScore(this.currentScoreValue - cost);
        this.gameState.helpersUsed[type] = true;
        
        this.showToast(`تم استخدام مساعدة! خصم ${this.formatNumber(cost)} نقطة.`, "info");

        if (type === 'freezeTime') {
            this.isTimeFrozen = true;
            document.querySelector('.timer-bar').classList.add('frozen');
            setTimeout(() => {
                this.isTimeFrozen = false;
                document.querySelector('.timer-bar').classList.remove('frozen');
            }, 10000);
        } else if (type === 'fiftyFifty') {
            const currentQuestionData = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
            const correctIndex = currentQuestionData.correct;
            const options = document.querySelectorAll('.option-btn');
            let removedCount = 0;
            options.forEach((opt, index) => {
                if (index !== correctIndex && removedCount < 2) {
                    opt.classList.add('disabled');
                    removedCount++;
                }
            });
        } else if (type === 'changeQuestion') {
            this.gameState.shuffledQuestions[this.gameState.currentQuestion] = this.RESERVE_QUESTION;
            this.fetchQuestion();
        }
        this.updateUI();
    }
    
    // --- UI & State Management ---
    startTimer() {
        clearInterval(this.timerInterval);
        this.isTimeFrozen = false;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.getElementById('timer');
        if (!timerBar || !timerDisplay) return;

        timerBar.classList.remove('frozen');
        this.gameState.timeLeft = this.QUESTION_TIME;
        
        this.timerInterval = setInterval(() => {
            if (this.isTimeFrozen) return;
            
            this.gameState.timeLeft--;
            timerDisplay.textContent = this.gameState.timeLeft;
            timerBar.style.width = `${(this.gameState.timeLeft / this.QUESTION_TIME) * 100}%`;
            
            if (this.gameState.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.playSound('wrong');
                this.showToast("انتهى الوقت!", "error");
                this.gameState.wrongAnswers++;
                this.updateUI();
                if (this.gameState.wrongAnswers >= 3) {
                    setTimeout(() => this.endGame(), 1000);
                } else {
                    setTimeout(() => this.fetchQuestion(), 1000);
                }
            }
        }, 1000);
    }
    
    updateScore(newScore) {
        const scoreElement = document.getElementById('currentScore');
        if (!scoreElement) return;

        const start = this.currentScoreValue;
        const diff = newScore - start;
        this.currentScoreValue = newScore;
        
        if (diff === 0) {
            scoreElement.textContent = this.formatNumber(newScore);
            return;
        }
        
        let step = 0;
        const duration = 500;
        const interval = setInterval(() => {
            step += 20;
            const progress = Math.min(step / duration, 1);
            const animatedScore = Math.floor(start + diff * progress);
            scoreElement.textContent = this.formatNumber(animatedScore);
            
            if (progress >= 1) {
                clearInterval(interval);
                this.updateUI();
            }
        }, 20);
    }
    
    updateUI() {
        const wrongAnswersCount = document.getElementById('wrongAnswersCount');
        const currentTitle = document.getElementById('currentTitle');
        if (wrongAnswersCount) wrongAnswersCount.textContent = `${this.gameState.wrongAnswers} / 3`;
        if (currentTitle) currentTitle.textContent = this.gameState.currentQuestion > 0 ? this.PRIZES[this.gameState.currentQuestion - 1].title : "لا يوجد";
        
        this.updatePrizesList();

        document.querySelectorAll('.helper-btn').forEach(btn => {
            const type = btn.dataset.type;
            btn.disabled = this.gameState.helpersUsed[type] || this.currentScoreValue < this.HELPER_COSTS[type];
        });
    }
    
    generatePrizesList() {
        this.dom.prizesList.innerHTML = '';
        [...this.PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${this.PRIZES.length - index}. ${prize.title}</span> <strong>${this.formatNumber(prize.points)}</strong>`;
            this.dom.prizesList.appendChild(li);
        });
    }

    updatePrizesList() {
        const items = this.dom.prizesList.querySelectorAll('li');
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
        // ... (Code is the same as previous full version)
    }

    // --- Sharing ---
    getShareText() {
        const minutes = Math.floor(this.gameState.totalTime / 60);
        const seconds = Math.round(this.gameState.totalTime % 60);
        const timeString = `${minutes} دقيقة و ${seconds} ثانية`;
        return `✨ نتائجي في مسابقة "من سيربح اللقب" ✨\nالاسم: ${this.gameState.name}\nاللقب: ${this.gameState.finalTitle}\nالنقاط: ${this.formatNumber(this.gameState.finalScore)}\nالمدة: ${timeString}\n\n🔗 جرب حظك أنت أيضاً: https://abuqusayms.github.io/Tbate-Game/`;
    }
    shareOnX() { /* ... */ }
    shareOnInstagram() { /* ... */ }
    
    // --- Utility & Setup ---
    resetGameState(attemptId) {
        this.gameState.attemptId = attemptId;
        this.gameState.currentQuestion = 0;
        this.gameState.wrongAnswers = 0;
        this.gameState.startTime = new Date().toISOString();
        this.gameState.helpersUsed = { fiftyFifty: false, freezeTime: false, changeQuestion: false };
        this.gameState.shuffledQuestions = [];
        this.currentScoreValue = 0;
    }
    
    loadTheme() { /* ... */ }
    toggleTheme() { /* ... */ }
    toggleSidebar() { /* ... */ }
    playSound(sound) { /* ... */ }
    showToast(message, type = 'info') { /* ... */ }
    shuffleArray(array) { /* ... */ }
    getDeviceId() { /* ... */ }
    formatNumber(num) { /* ... */ }
    apiCall(payload) { /* ... */ }
}

new QuizGame();

