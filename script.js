// حالة التطبيق وإعداداته
class QuizGame {
    constructor() {
        this.API_URL = "https://script.google.com/macros/s/AKfycbwS16Exl-EFOufB-ptfDDFepIzZJBcqCSXgCd7dt8DY5RhPQyVW_XkPyynAxN9Av7MA/exec";
        this.QUESTION_TIME = 90;
        this.TOTAL_AVATARS = 20;
        this.LIMIT_PER_DAY = 5;
        
        // بنك الأسئلة (تم نقله من Google Apps Script)
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
            { points: 500000, title: "أسطورة المسابقة" },
            { points: 1000000, title: "نجم المعرفة الذهبي" }
        ];
        
        this.HELPER_COSTS = { 
            fiftyFifty: 20000, 
            freezeTime: 15000, 
            changeQuestion: 30000 
        };
        
        // حالة اللعبة
        this.gameState = {
            deviceId: this.getDeviceId(),
            attemptId: null,
            name: "",
            avatar: "",
            currentQuestion: 0,
            wrongAnswers: 0,
            startTime: null,
            helpersUsed: {
                fiftyFifty: false,
                freezeTime: false,
                changeQuestion: false
            },
            timeLeft: this.QUESTION_TIME,
            shuffledQuestions: [] // سيتم تعبئتها عند بدء اللعبة
        };
        
        this.currentScoreValue = 0;
        this.timerInterval = null;
        this.isTimeFrozen = false;
        
        // عناصر DOM
        this.domElements = {};
        
        // تهيئة التطبيق
        this.init();
    }
    
    // تهيئة التطبيق
    init() {
        this.cacheDomElements();
        this.populateAvatarGrid();
        this.bindEventListeners();
        this.generatePrizesList();
        this.loadTheme();
        this.showScreen('start');
        this.hideLoader();
    }
    
    // تخزين عناصر DOM للوصول السريع
    cacheDomElements() {
        this.domElements = {
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
            nameInput: document.getElementById('nameInput'),
            confirmAvatarBtn: document.getElementById('confirmAvatarBtn'),
            themeToggleBtn: document.querySelector('.theme-toggle-btn'),
            openSidebarBtn: document.querySelector('.open-sidebar-btn'),
            closeSidebarBtn: document.querySelector('.close-sidebar-btn')
        };
    }
    
    // ربط مستمعي الأحداث
    bindEventListeners() {
        document.getElementById('startPlayBtn').addEventListener('click', () => {
            this.playSound('click');
            this.showScreen('avatar');
        });
        
        this.domElements.confirmAvatarBtn.addEventListener('click', () => {
            this.playSound('click');
            this.showScreen('nameEntry');
        });
        
        document.getElementById('confirmNameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('showLeaderboardBtn').addEventListener('click', () => this.displayLeaderboard());
        document.getElementById('backToStartBtn').addEventListener('click', () => {
            this.playSound('click');
            this.showScreen('start');
        });
        
        this.domElements.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
        
        this.domElements.openSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.domElements.closeSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.domElements.sidebarOverlay.addEventListener('click', () => this.toggleSidebar());
        
        this.domElements.helperBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.useHelper(e));
        });
        
        document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
        document.getElementById('shareInstagramBtn').addEventListener('click', () => this.shareOnInstagram());
        
        // إدخال الاسم - السماح بالإدخال بمجرد الضغط على Enter
        this.domElements.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startGame();
            }
        });
    }
    
    // ملء شبكة الصور الرمزية
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
                document.querySelectorAll('.avatar-option').forEach(el => {
                    el.classList.remove('selected');
                });
                img.classList.add('selected');
                this.gameState.avatar = img.src;
                this.domElements.confirmAvatarBtn.disabled = false;
            });
            avatarGrid.appendChild(img);
        }
    }
    
    // بدء اللعبة
    async startGame() {
        this.playSound('click');
        const name = this.domElements.nameInput.value.trim();
        
        if (name.length < 2) {
            this.showToast("الرجاء إدخال اسم صحيح (حرفين على الأقل).", 'error');
            return;
        }
        
        this.gameState.name = name;
        
        this.showScreen('loader');
        
        try {
            const response = await this.apiCall({ 
                action: 'start', 
                deviceId: this.gameState.deviceId,
                name: this.gameState.name,
                avatar: this.gameState.avatar
            });
    
            if (response && response.success) {
                this.resetGameState(response.attemptId);
                this.setupGameUI();
                this.showScreen('game');
                this.fetchQuestion(); // لم يعد async
            } else {
                const errorMsg = response && response.error === 'limit_reached' 
                    ? `لقد وصلت للحد الأقصى للمحاولات (${this.LIMIT_PER_DAY}).` 
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
    
    // خلط الأسئلة (بديل للخلط في الخادم)
    shuffleQuestions() {
        // نسخ مصفوفة الأسئلة لتجنب تعديل الأصلية
        const shuffled = [...this.QUESTIONS];
        
        // تطبيق خوارزمية Fisher-Yates للخلط
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }
    
    // جلب السؤال التالي (بدون الاتصال بالخادم)
    fetchQuestion() {
        this.startLoadingQuestion();
        
        // إذا كانت هذه هي المرة الأولى، قم بخلط الأسئلة
        if (this.gameState.shuffledQuestions.length === 0) {
            this.gameState.shuffledQuestions = this.shuffleQuestions();
        }
        
        const currentQuestion = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        const qNum = this.gameState.currentQuestion + 1;
        const totalQ = this.gameState.shuffledQuestions.length;
        
        this.displayQuestion(currentQuestion, qNum, totalQ);
        this.startTimer();
        
        this.stopLoadingQuestion();
    }
    
    // عرض السؤال
    displayQuestion(question, qNum, totalQ) {
        this.domElements.questionText.textContent = question.q;
        document.getElementById('questionCounter').textContent = `السؤال ${qNum} / ${totalQ}`;
        this.domElements.optionsGrid.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('option-btn');
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', () => this.checkAnswer(index, button));
            this.domElements.optionsGrid.appendChild(button);
        });
        
        this.updateUI();
    }
    
    // التحقق من الإجابة (بدون الاتصال بالخادم)
    checkAnswer(selectedIndex, button) {
        clearInterval(this.timerInterval);
        document.querySelectorAll('.option-btn').forEach(b => {
            b.classList.add('disabled');
        });
    
        const currentQuestion = this.gameState.shuffledQuestions[this.gameState.currentQuestion];
        const isCorrect = (currentQuestion.correct === selectedIndex);
    
        if (isCorrect) {
            this.playSound('correct');
            button.classList.add('correct');
            this.updateScore(this.currentScoreValue + this.PRIZES[this.gameState.currentQuestion].points);
            this.gameState.currentQuestion++;
        } else {
            this.playSound('wrong');
            button.classList.add('wrong');
            document.querySelector(`.option-btn[data-index='${currentQuestion.correct}']`).classList.add('correct');
            this.gameState.wrongAnswers++;
        }
        
        this.updateUI();
        
        const isGameOver = this.gameState.wrongAnswers >= 3 || 
                          this.gameState.currentQuestion >= this.PRIZES.length;
    
        setTimeout(() => {
            if (isGameOver) {
                this.endGame();
            } else if (isCorrect) {
                this.fetchQuestion();
            } else {
                this.showToast(`إجابة خاطئة! تبقى لديك ${3 - this.gameState.wrongAnswers} محاولات.`, 'error');
                setTimeout(() => this.fetchQuestion(), 2000);
            }
        }, 2000);
    }
    
    // إنهاء اللعبة
    async endGame() {
        clearInterval(this.timerInterval);
        const totalTime = (new Date() - new Date(this.gameState.startTime)) / 1000;
        const finalTitle = this.gameState.currentQuestion > 0 
            ? this.PRIZES[this.gameState.currentQuestion - 1].title 
            : "لا يوجد";
        
        // حفظ البيانات النهائية للمشاركة
        this.gameState.finalTitle = finalTitle;
        this.gameState.finalScore = this.currentScoreValue;
        
        try {
            await this.apiCall({ 
                action: 'end', 
                attemptId: this.gameState.attemptId, 
                score: this.currentScoreValue, 
                finalTitle, 
                totalTime 
            });
            
            document.getElementById('finalName').textContent = this.gameState.name;
            document.getElementById('finalTitle').textContent = finalTitle;
            document.getElementById('finalScore').textContent = this.formatNumber(this.currentScoreValue);
            document.getElementById('totalTime').textContent = `${Math.round(totalTime)} ثانية`;
            this.showScreen('end');
        } catch (error) {
            console.error("Error ending game:", error);
            this.showToast("حدث خطأ في حفظ النتائج.", "error");
        }
    }
    
    // استخدام مساعدة
    useHelper(event) {
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const cost = this.HELPER_COSTS[type];
    
        if (this.currentScoreValue < cost) {
            this.showToast("نقاطك غير كافية!", "error");
            return;
        }
    
        this.playSound('click');
        this.updateScore(this.currentScoreValue - cost);
        this.gameState.helpersUsed[type] = true;
        btn.disabled = true;
    
        this.showToast(`تم استخدام مساعدة! خصم ${this.formatNumber(cost)} نقطة.`, "info");
    
        if (type === 'freezeTime') {
            this.isTimeFrozen = true;
            document.querySelector('.timer-container').classList.add('frozen');
            setTimeout(() => {
                this.isTimeFrozen = false;
                document.querySelector('.timer-container').classList.remove('frozen');
            }, 10000);
        } else {
            // مكان لأدوات المساعدة الأخرى
            this.showToast("ميزة تحت التطوير!", "info");
        }
        
        this.updateUI();
    }
    
    // بدء المؤقت
    startTimer() {
        clearInterval(this.timerInterval);
        this.isTimeFrozen = false;
        document.querySelector('.timer-container').classList.remove('frozen');
        this.gameState.timeLeft = this.QUESTION_TIME;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.getElementById('timer');
        
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
    
    // تحديث النقاط
    updateScore(newScore) {
        const start = this.currentScoreValue;
        const diff = newScore - start;
        
        if (diff === 0) {
            this.domElements.scoreDisplay.textContent = this.formatNumber(newScore);
            return;
        }
        
        let step = 0;
        const duration = 500;
        const interval = setInterval(() => {
            step += 20;
            const progress = Math.min(step / duration, 1);
            const animatedScore = Math.floor(start + diff * progress);
            this.domElements.scoreDisplay.textContent = this.formatNumber(animatedScore);
            
            if (progress >= 1) {
                clearInterval(interval);
                this.currentScoreValue = newScore;
                this.updateUI(); // تحديث أدوات المساعدة بعد استقرار النقاط
            }
        }, 20);
    }
    
    // تحديث واجهة المستخدم
    updateUI() {
        document.getElementById('wrongAnswersCount').textContent = `${this.gameState.wrongAnswers} / 3`;
        document.getElementById('currentTitle').textContent = this.gameState.currentQuestion > 0 
            ? this.PRIZES[this.gameState.currentQuestion - 1].title 
            : "لا يوجد";
        
        this.updatePrizesList();

        this.domElements.helperBtns.forEach(btn => {
            const type = btn.dataset.type;
            if (!this.gameState.helpersUsed[type] && this.currentScoreValue >= this.HELPER_COSTS[type]) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        });
    }
    
    // إنشاء قائمة الجوائز
    generatePrizesList() {
        this.domElements.prizesList.innerHTML = '';
        
        [...this.PRIZES].reverse().forEach((prize, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${this.PRIZES.length - index}. ${prize.title}</span> <strong>${this.formatNumber(prize.points)}</strong>`;
            this.domElements.prizesList.appendChild(li);
        });
    }
    
    // تحديث قائمة الجوائز
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
    
    // عرض لوحة الصدارة
    async displayLeaderboard() {
        this.playSound('click');
        this.showScreen('leaderboard');
        
        const contentDiv = document.getElementById('leaderboardContent');
        contentDiv.innerHTML = '<div class="spinner"></div>';
        
        try {
            const response = await this.apiCall({ action: 'getLeaderboard' });
    
            if (response && response.success && response.leaderboard) {
                let tableHTML = '<p>لوحة الصدارة فارغة حاليًا!</p>';
                
                if (response.leaderboard.length > 0) {
                    tableHTML = `
                        <table class="leaderboard-table">
                            <tr>
                                <th>الترتيب</th>
                                <th>الاسم</th>
                                <th>النقاط</th>
                                <th>اللقب</th>
                                <th>التاريخ</th>
                            </tr>
                    `;
                    
                    const medals = ['🥇', '🥈', '🥉'];
                    
                    response.leaderboard.forEach(row => {
                        const rank = medals[row[0] - 1] || row[0];
                        const date = new Date(row[4]).toLocaleDateString('ar-EG');
                        tableHTML += `
                            <tr>
                                <td>${rank}</td>
                                <td>${row[1]}</td>
                                <td>${this.formatNumber(row[2])}</td>
                                <td>${row[3]}</td>
                                <td>${date}</td>
                            </tr>
                        `;
                    });
                    
                    tableHTML += '</table>';
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
    
    // المشاركة على X
    shareOnX() {
        this.playSound('click');
        const text = encodeURIComponent(this.getShareText());
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank');
    }
    
    // المشاركة على إنستغرام
    shareOnInstagram() {
        this.playSound('click');
        
        navigator.clipboard.writeText(this.getShareText())
            .then(() => {
                this.showToast("تم نسخ النتيجة! يمكنك الآن لصقها في قصة إنستغرام.", "success");
            })
            .catch((err) => {
                console.error("Failed to copy text: ", err);
                this.showToast("فشل نسخ النتيجة.", "error");
            });
    }
    
    // نص المشاركة
    getShareText() {
        return `🏆 لقد حصلت على لقب "${this.gameState.finalTitle}" في مسابقة "من سيربح اللقب؟" بمجموع ${this.formatNumber(this.gameState.finalScore)} نقطة!`;
    }
    
    // إعادة تعيين حالة اللعبة
    resetGameState(attemptId) {
        this.gameState.attemptId = attemptId;
        this.gameState.currentQuestion = 0;
        this.gameState.wrongAnswers = 0;
        this.gameState.startTime = new Date().toISOString();
        this.gameState.helpersUsed = {
            fiftyFifty: false,
            freezeTime: false,
            changeQuestion: false
        };
        this.gameState.shuffledQuestions = []; // سيتم تعبئتها عند الحاجة
        
        this.updateScore(0);
    }
    
    // إعداد واجهة اللعبة
    setupGameUI() {
        document.getElementById('playerAvatar').src = this.gameState.avatar;
        document.getElementById('playerAvatar').alt = `صورة ${this.gameState.name}`;
        document.getElementById('playerName').textContent = this.gameState.name;
    }
    
    // تبديل المظهر
    toggleTheme() {
        this.playSound('click');
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        this.domElements.themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        this.domElements.themeToggleBtn.setAttribute('aria-label', 
            newTheme === 'dark' ? 'تبديل إلى الوضع الداكن' : 'تبديل إلى الوضع الفاتح');
    }
    
    // تحميل المظهر
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.dataset.theme = savedTheme;
        
        this.domElements.themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        this.domElements.themeToggleBtn.setAttribute('aria-label', 
            savedTheme === 'dark' ? 'تبديل إلى الوضع الداكن' : 'تبديل إلى الوضع الفاتح');
    }
    
    // تبديل الشريط الجانبي
    toggleSidebar() {
        this.playSound('click');
        this.domElements.sidebar.classList.toggle('open');
        this.domElements.sidebarOverlay.classList.toggle('active');
        
        const isOpen = this.domElements.sidebar.classList.contains('open');
        this.domElements.openSidebarBtn.setAttribute('aria-expanded', isOpen);
    }
    
    // تشغيل الصوت
    playSound(sound) {
        if (this.domElements.sounds[sound]) {
            this.domElements.sounds[sound].currentTime = 0;
            
            this.domElements.sounds[sound].play().catch(error => {
                console.warn(`Failed to play sound: ${error}`);
            });
        }
    }
    
    // عرض شاشة
    showScreen(screenName) {
        Object.values(this.domElements.screens).forEach(screen => {
            screen.classList.remove('active');
            screen.setAttribute('aria-hidden', 'true');
        });
        
        if (this.domElements.screens[screenName]) {
            this.domElements.screens[screenName].classList.add('active');
            this.domElements.screens[screenName].setAttribute('aria-hidden', 'false');
        }
    }
    
    // إخفاء شاشة التحميل
    hideLoader() {
        this.domElements.screens.loader.classList.remove('active');
    }
    
    // بدء تحميل السؤال
    startLoadingQuestion() {
        this.domElements.questionText.style.display = 'none';
        this.domElements.optionsGrid.style.display = 'none';
        document.querySelector('.spinner-container').style.display = 'flex';
    }
    
    // إنهاء تحميل السؤال
    stopLoadingQuestion() {
        this.domElements.questionText.style.display = 'block';
        this.domElements.optionsGrid.style.display = 'grid';
        document.querySelector('.spinner-container').style.display = 'none';
    }
    
    // عرض الإشعارات
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        
        const toastContainer = document.getElementById('toast-container');
        toastContainer.appendChild(toast);
        
        // إظهار Toast ب动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        // إخفاء Toast بعد 3 ثوان
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // استدعاء API
    async apiCall(payload) {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 
                    'Content-Type': 'text/plain;charset=utf-8' 
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showToast("حدث خطأ في الاتصال بالخادم.", "error");
            return { success: false, error: error.message };
        }
    }
    
    // الحصول على معرف الجهاز
    getDeviceId() {
        let id = localStorage.getItem('deviceId');
        
        if (!id) {
            id = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('deviceId', id);
        }
        
        return id;
    }
    
    // تنسيق الأرقام
    formatNumber(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    }
}

// بدء التطبيق عندما تكون الصفحة جاهزة
document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});
