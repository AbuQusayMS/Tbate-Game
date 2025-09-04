class QuizGame {
    constructor() {
        this.API_URL = "https://script.google.com/macros/s/AKfycbxswUSDuszaAyDlNBCi3ugsu11NQW6g0vu1BQI0XM58xbTk8G5eE5gV8PNSbSshCmkBDw/exec";
        this.QUESTION_TIME = 60;
        this.TOTAL_AVATARS = 16;
        this.LIMIT_PER_DAY = 1;
        this.MAX_WRONG_ANSWERS = 3;

        // (مُعدل) فصل السؤال الاحتياط
        const allQuestions = [
            { q: "ما هو السبب الرئيسي الذي جعل آرثر يتدرب 'مثل المجنون' في حياته السابقة؟", options: ["للحصول على القوة ليصبح ملكاً", "رغبة في الانتقام لموت رئيسة دار الأيتام", "ليثبت نفسه أمام الملوك الآخرين", "ليصبح أقوى ساحر في العالم"], correct: 1 },
            { q: "ما هو الاسم الذي أطلقه آرثر على تقنيته الداخلية للبرق التي طوّرها بعد التدريب مع الجد فيريون؟", options: ["وميض الرياح", "نبض الرعد", "صاعقة السماء", "تيار البرق"], correct: 1 },
            { q: "ما هي قدرة 'نبض الرعد' التي طورها آرثر؟", options: ["تقنية لتسريع ردود الأفعال إلى مدى خارق", "تقنية لإطلاق الصواعق من مسافة بعيدة", "تقنية لزيادة سرعة الحركة والقفز", "تقنية للتواصل مع المانا لتشكيل تيارات كهربائية"], correct: 0 },
            { q: "ما هي المهارة التي يتدرب عليها آرثر ليتعلم كيف يحلل ويبطل سحر خصومه؟", options: ["التلاعب بالزمان", "إبطال السحر", "التخفي", "إخفاء المانا"], correct: 1 },
            { q: "ما هي قدرة 'التشويه' التي استخدمها آرثر في المزاد لتخويف سيباستيان؟", options: ["القدرة على تدمير الأشياء بقوة العقل", "القدرة على فصل نفسه عن الزمان والمكان للحظة قصيرة", "القدرة على إطلاق نية قتل قوية", "القدرة على التخفي والتسلل"], correct: 1 },
            { q: "ماذا حدث لسيف آرثر السحري، قصيدة الفجر، عندما حاول سحبه في البداية؟", options: ["انكسر إلى قطعتين", "أصابه بجرح في يده وامتص دمه", "انبعث منه دخان أبيض", "لم يتزحزح من مكانه حتى استخدم إرادة سيلفيا"], correct: 1 },
            { q: "ماذا كان أول شيء فعله آرثر بعد أن تم تعيينه ملكاً في حياته السابقة؟", options: ["أنشأ جيشاً قوياً", "بنى قصراً كبيراً", "دمر البلد المسؤول عن موت رئيسة دار الأيتام", "تزوج وأنجب أطفالاً"], correct: 2 },
            { q: "ما هو الوصف الذي استخدمه آرثر لوصف نفسه في حياته السابقة عندما كان ملكاً؟", options: ["أنه كان ملكًا جيدًا وناضجًا", "أنه لم يكن ملكاً جيداً في كثير من الجوانب", "أنه كان أفضل حاكم في تاريخه", "أنه لم يكن يحب منصبه كملك"], correct: 1 },
            { q: "ما هو الاسم الحقيقي لمدير قاعة نقابة المغامرين في مدينة زيروس؟", options: ["سيباستيان", "لوكاس وايكس", "كاسبيان بلادهيرت", "رينولدز ليوين"], correct: 2 },
            { q: "بعد قتال آرثر لمدير النقابة، ما هي الفئة التي حصل عليها في نقابة المغامرين؟", options: ["الفئة E", "الفئة C", "الفئة B", "الفئة A"], correct: 2 },
            { q: "ما هي الصفة التي وصف بها آرثر جسمه بعد القتال مع مدير النقابة؟", options: ["أنه ناضج ومناسب لمهاراته", "أنه ضعيف ولا يستمع لأوامره", "أنه لم يكن مناسبًا له كثيرًا", "أنه لا يزال غير معتاد عليه"], correct: 2 },
            { q: "ما هو السبب الذي جعل آرثر يرفض عرض الملك بمقايضة سيلفي بشبل أسد العالم؟", options: ["لأنه كان يريد المال بدلاً من الوحش", "لأنه لا يستطيع مقايضة شخص يثق به", "لأنه لم يكن يريد إهانة الملك", "لأنه كان يرى أن أسد العالم ضعيف"], correct: 1 },
            { q: "ما هي الفئة التي تم تصنيفها لـ 'أسد العالم' الذي تم بيعه في المزاد؟", options: ["الفئة E", "الفئة D", "الفئة B", "الفئة A"], correct: 2 },
            { q: "من هي الشخصية التي تم استدعاؤها من قبل آرثر في قتال الدانجون وقامت بإغماء الفارس؟", options: ["شكل وهمي", "سيلفي", "لايت فليكر", "لا أحد"], correct: 3 },
            { q: "ما هي الميزة التي تمتلكها ليليا، والتي تجعلها قادرة على استيعاب المانا من محيطها بشكل عالي؟", options: ["لديها موهبة فطرية في القتال", "تمتلك قوة إرادة هائلة", "لديها كفاءة عالية في أوردة المانا", "لديها نواة مانا متقدمة"], correct: 2 },
            { q: "ما هو العنصر الذي تتخصص به ليليا؟", options: ["الماء", "النار", "الأرض", "الرياح"], correct: 0 }
        ];
        
        this.backupQuestion = allQuestions.pop();
        this.QUESTIONS = allQuestions;

        this.PRIZES = [
            { points: 100, title: "كاديل" },
            { points: 200, title: "سيريس" },
            { points: 300, title: "اوتو" },
            { points: 500, title: "ميكا" },
            { points: 1000, title: "غراي" },
            { points: 2000, title: "بايرون" },
            { points: 4000, title: "سيلفي" },
            { points: 8000, title: "فاراي" },
            { points: 16000, title: "شول" },
            { points: 32000, title: "الدير" },
            { points: 64000, title: "ويندسوم" },
            { points: 125000, title: "مورداين" },
            { points: 250000, title: "كيزيس" },
            { points: 500000, title: "أغرونا" },
            { points: 1000000, title: "أرثر" }
        ];

        this.HELPER_COSTS = {
           fiftyFifty: 100,
           freezeTime: 100,
           changeQuestion: 100
        };

        // --- (هذا هو التصحيح) ---
        // كل هذه الأسطر يجب أن تكون هنا بالداخل
        this.isTimeFrozen = false;
        this.gameState = {};
        this.currentScoreValue = 0;
        this.timerInterval = null;
        this.answerSubmitted = false;
        this.domElements = {};

        // هذا السطر يستدعي الدالة init ويجب أن يكون آخر شيء
        this.init();
    } // <-- نهاية الـ constructor

    init() {
        this.cacheDomElements();
        this.bindEventListeners();
        this.populateAvatarGrid();
        this.generatePrizesList();
        this.displayHelperCosts(); // (جديد) عرض تكاليف المساعدات
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
                welcome: document.getElementById('welcomeScreen'),
                game: document.getElementById('gameContainer'),
                end: document.getElementById('endScreen'),
                leaderboard: document.getElementById('leaderboardScreen'),
            },
            // تم حذف كائن الأصوات من هنا
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
            welcomeMessage: document.getElementById('welcomeMessage'),
        };
    }

    bindEventListeners() {
        document.getElementById('startPlayBtn').addEventListener('click', () => {
            this.showScreen('avatar');
        });

        this.domElements.confirmAvatarBtn.addEventListener('click', () => {
            this.showScreen('nameEntry');
        });

        document.getElementById('confirmNameBtn').addEventListener('click', () => {
            this.showWelcomeScreen();
        });

        document.getElementById('welcomeConfirmBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('showLeaderboardBtn').addEventListener('click', () => {
            this.displayLeaderboard();
        });

        document.getElementById('backToStartBtn').addEventListener('click', () => {
            this.showScreen('start');
        });

        this.domElements.themeToggleBtn.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.getElementById('statsBtn').addEventListener('click', () => this.displayLeaderboard());
        
        document.querySelector('.open-sidebar-btn').addEventListener('click', () => {
            this.toggleSidebar(true);
        });
        
        document.querySelector('.close-sidebar-btn').addEventListener('click', () => {
            this.toggleSidebar(false);
        });

        this.domElements.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
        this.domElements.helperBtns.forEach(btn => btn.addEventListener('click', (e) => this.useHelper(e)));
        document.getElementById('shareXBtn').addEventListener('click', () => this.shareOnX());
        document.getElementById('shareInstagramBtn').addEventListener('click', () => this.shareOnInstagram());
        this.domElements.nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.showWelcomeScreen(); });
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
                // تم حذف سطر الصوت من هنا
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
        this.answerSubmitted = false;
        this.domElements.questionText.textContent = questionData.q;
        document.getElementById('questionCounter').textContent = `السؤال ${this.gameState.currentQuestion + 1} / ${this.QUESTIONS.length}`;
        this.domElements.optionsGrid.innerHTML = '';

        // إنشاء مصفوفة من الأجوبة لتتبعها بعد الخلط
        let answers = questionData.options.map((optionText, index) => ({
            text: optionText,
            isCorrect: index === questionData.correct
        }));

        // خلط (بعثرة) مصفوفة الأجوبة
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        
        // عرض الأجوبة المخلوطة
        answers.forEach(answer => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = answer.text;
            
            // (تصحيح مهم) نضيف علامة على الزر الصحيح
            if (answer.isCorrect) {
                button.dataset.correct = 'true';
            }
            
            // (تصحيح مهم) نرسل قيمة منطقية (true/false) فقط
            button.addEventListener('click', () => this.checkAnswer(answer.isCorrect, button));
            
            this.domElements.optionsGrid.appendChild(button);
        });

        this.updateUI();
        this.startTimer();
    }

checkAnswer(isCorrect, selectedButton) {
        if (this.answerSubmitted) return;
        this.answerSubmitted = true;
        
        clearInterval(this.timerInterval);
        document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

        if (isCorrect) {
            selectedButton.classList.add('correct');
            const pointsEarned = this.PRIZES[this.gameState.currentQuestion]?.points || 0;
            this.updateScore(this.currentScoreValue + pointsEarned);
        } else {
            selectedButton.classList.add('wrong');
            
            // (تصحيح مهم) الآن يمكننا إيجاد الزر الصحيح وتظليله
            const correctButton = this.domElements.optionsGrid.querySelector('[data-correct="true"]');
            if (correctButton) {
                correctButton.classList.add('correct');
            }
            this.gameState.wrongAnswers++;
        }

        this.gameState.currentQuestion++;
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
            // (تصحيح 50:50) هذا هو المنطق الجديد والصحيح
            const options = Array.from(this.domElements.optionsGrid.querySelectorAll('.option-btn'));
            let wrongOptions = options.filter(btn => btn.dataset.correct !== 'true');
            
            wrongOptions.sort(() => 0.5 - Math.random());
            if(wrongOptions.length > 1) {
                wrongOptions[0].classList.add('hidden');
                wrongOptions[1].classList.add('hidden');
            }

        } else if (type === 'freezeTime') {
            this.isTimeFrozen = true;
            document.querySelector('.timer-bar').classList.add('frozen');
            setTimeout(() => {
                this.isTimeFrozen = false;
                document.querySelector('.timer-bar').classList.remove('frozen');
            }, 10000);

        } else if (type === 'changeQuestion') {
            this.gameState.shuffledQuestions[this.gameState.currentQuestion] = this.backupQuestion;
            this.fetchQuestion();
        }
        this.updateUI();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.gameState.timeLeft = this.QUESTION_TIME;
        const timerBar = document.querySelector('.timer-bar');
        const timerDisplay = document.querySelector('.timer-text');

        this.timerInterval = setInterval(() => {
            if (this.isTimeFrozen) return;

            this.gameState.timeLeft--;
            timerDisplay.textContent = this.gameState.timeLeft;
            timerBar.style.width = `${(this.gameState.timeLeft / this.QUESTION_TIME) * 100}%`;

            if (this.gameState.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.showToast("انتهى الوقت!", "error");
                this.gameState.wrongAnswers++;
                document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));
                
                // (تصحيح مُضاف) استخدام الطريقة الصحيحة لإيجاد الإجابة
                const correctButton = this.domElements.optionsGrid.querySelector('[data-correct="true"]');
                if (correctButton) {
                    correctButton.classList.add('correct');
                }
                
                this.updateUI();
                
                setTimeout(() => {
                    if (this.gameState.wrongAnswers >= this.MAX_WRONG_ANSWERS) {
                        this.endGame();
                    } else {
                        // (تصحيح مُضاف) الانتقال للسؤال التالي عند انتهاء الوقت
                        this.gameState.currentQuestion++;
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

    // (مُعدل) لإصلاح خطأ aria-hidden عبر إدارة التركيز
    toggleSidebar(open) {
        // Cache the button that opens the sidebar
        const openBtn = document.querySelector('.open-sidebar-btn');

        if (open) {
            this.domElements.sidebar.classList.add('open');
            this.domElements.sidebarOverlay.classList.add('active');
            openBtn.setAttribute('aria-expanded', 'true');
            
            // For better accessibility, move focus to the close button inside the sidebar
            setTimeout(() => {
                const closeBtn = this.domElements.sidebar.querySelector('.close-sidebar-btn');
                if (closeBtn) {
                    closeBtn.focus();
                }
            }, 100); // A small delay ensures the sidebar is visible before focusing

        } else {
            this.domElements.sidebar.classList.remove('open');
            this.domElements.sidebarOverlay.classList.remove('active');
            openBtn.setAttribute('aria-expanded', 'false');
            
            // (The Fix) When closing, return focus to the button that opened it
            if (openBtn) {
                openBtn.focus();
            }
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

// (جديد) دالة لعرض تكاليف المساعدات
    displayHelperCosts() {
        this.domElements.helperBtns.forEach(btn => {
            const type = btn.dataset.type;
            const cost = this.HELPER_COSTS[type];
            if (cost) {
                const costEl = btn.querySelector('.helper-cost');
                if (costEl) {
                    costEl.textContent = `(${cost})`;
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});
