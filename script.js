class QuizGame {
    constructor() {
        // =================================================================
        // !!!  Game Configuration & Secrets !!!
        // =================================================================
        this.config = {
            // IMPORTANT: Replace with your own Supabase/Apps Script details.
            // هام: استبدل بالبيانات الخاصة بك.
            SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
            SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
            APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
            QUESTIONS_URL: 'https://abuqusayms.github.io/Shadow-Game/questions.json',

            // Developer Settings
            // WARNING: Hardcoding passwords on the client-side is not secure for production.
            // This is for simple project use only.
            DEVELOPER_NAME: "AbuQusay",
            DEVELOPER_PASSWORD: "AbuQusay",

            // Gameplay Settings
            RANDOMIZE_QUESTIONS: true,
            RANDOMIZE_ANSWERS: true,
            QUESTION_TIME: 80,
            MAX_WRONG_ANSWERS: 3,
            STARTING_SCORE: 100,
            
            LEVELS: [
                { name: "easy", label: "سهل" },
                { name: "medium", label: "متوسط" },
                { name: "hard", label: "صعب" },
                { name: "impossible", label: "مستحيل" }
            ],
            
            HELPER_COSTS: {
                fiftyFifty: 100,
                freezeTime: 100,
                skipQuestionBase: 20,
                skipQuestionIncrement: 20
            }
        };

        // Internal State
        this.supabase = null;
        this.questions = {};
        this.gameState = {};
        this.timer = { interval: null, isFrozen: false };
        this.dom = {};
        this.cropper = null;
        this.leaderboardSubscription = null;
        this.isDevSession = false;
        this.isDevTemporarilyDisabled = false;

        this.init();
    }

    /**
     * Initializes the game by caching DOM elements, binding events,
     * connecting to services, and loading questions.
     */
    async init() {
        this.cacheDomElements();
        this.bindEventListeners();
        this.populateAvatarGrid();

        try {
            this.supabase = supabase.createClient(this.config.SUPABASE_URL, this.config.SUPABASE_KEY);
            if (!this.supabase) throw new Error("Supabase client failed to initialize.");
        } catch (error) {
            console.error("Error initializing Supabase:", error);
            this.showToast("خطأ في الاتصال بقاعدة البيانات", "error");
            document.getElementById('loaderText').textContent = "خطأ في الاتصال بالخادم.";
            return;
        }
        
        const questionsLoaded = await this.loadQuestions();
        
        if (questionsLoaded) {
            this.showScreen('start');
        } else {
            document.getElementById('loaderText').textContent = "حدث خطأ في تحميل الأسئلة. الرجاء تحديث الصفحة.";
        }
        this.dom.screens.loader.classList.remove('active');
    }

    /**
     * Caches frequently accessed DOM elements for performance.
     */
    cacheDomElements() {
        const byId = (id) => document.getElementById(id);
        this.dom = {
            screens: {
                loader: byId('loader'), start: byId('startScreen'), avatar: byId('avatarScreen'),
                nameEntry: byId('nameEntryScreen'), instructions: byId('instructionsScreen'),
                levelSelect: byId('levelSelectScreen'), game: byId('gameContainer'),
                levelComplete: byId('levelCompleteScreen'), end: byId('endScreen'), leaderboard: byId('leaderboardScreen')
            },
            modals: {
                confirmExit: byId('confirmExitModal'), advancedReport: byId('advancedReportModal'),
                avatarEditor: byId('avatarEditorModal'), devPassword: byId('devPasswordModal'),
                playerDetails: byId('playerDetailsModal')
            },
            nameInput: byId('nameInput'),
            nameError: byId('nameError'),
            confirmNameBtn: byId('confirmNameBtn'),
            confirmAvatarBtn: byId('confirmAvatarBtn'),
            reportProblemForm: byId('reportProblemForm'),
            imageToCrop: byId('image-to-crop'),
            devPasswordInput: byId('devPasswordInput'),
            devPasswordError: byId('devPasswordError'),
            devFloatingBtn: byId('devFloatingBtn'),
            leaderboardContent: byId('leaderboardContent'),
            questionText: byId('questionText'),
            optionsGrid: this.getEl('.options-grid'),
            scoreDisplay: byId('currentScore')
        };
    }
    
    getEl(selector, parent = document) { return parent.querySelector(selector); }
    getAllEl(selector, parent = document) { return parent.querySelectorAll(selector); }

    /**
     * Sets up event listeners, primarily using event delegation for efficiency.
     */
    bindEventListeners() {
        // Event delegation for all main actions
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const actionHandlers = {
                showAvatarScreen: () => this.showScreen('avatar'),
                showNameEntryScreen: () => this.showScreen('nameEntry'),
                confirmName: () => this.handleNameConfirmation(),
                postInstructionsStart: () => this.postInstructionsStart(),
                showLeaderboard: () => this.displayLeaderboard(),
                showStartScreen: () => this.showScreen('start'),
                toggleTheme: () => this.toggleTheme(),
                showConfirmExitModal: () => this.showModal('confirmExit'),
                showDevPasswordModal: () => this.showModal('devPassword'),
                closeModal: () => this.hideModal(target.dataset.modalId),
                endGame: () => this.endGame(),
                nextLevel: () => this.nextLevel(),
                playAgain: () => window.location.reload(),
                shareOnX: () => this.shareOnX(),
                shareOnInstagram: () => this.shareOnInstagram(),
                saveCroppedAvatar: () => this.saveCroppedAvatar(),
                checkDevPassword: () => this.checkDevPassword(),
                startDevLevel: () => this.startGameFlow(parseInt(target.dataset.levelIndex, 10))
            };
            
            if (actionHandlers[action]) actionHandlers[action]();
        });

        // Specific listeners for inputs and forms
        this.dom.nameInput.addEventListener('input', () => this.validateNameInput());
        this.dom.nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleNameConfirmation(); });
        this.dom.devPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkDevPassword(); });
        this.dom.reportProblemForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
        this.getEl('.avatar-grid').addEventListener('click', (e) => {
            if (e.target.matches('.avatar-option')) this.selectAvatar(e.target);
        });
        this.dom.optionsGrid.addEventListener('click', e => {
            const btn = e.target.closest('.option-btn');
            if (btn) this.checkAnswer(btn);
        });
        this.getEl('.helpers').addEventListener('click', e => {
            const btn = e.target.closest('.helper-btn');
            if (btn) this.useHelper(btn);
        })
    }

    // =============================================
    // Game Flow & State Management
    // =============================================

    /**
     * Transitions from instructions to the game or level selection.
     */
    postInstructionsStart() {
        this.setupInitialGameState();
        if (this.isDevSession) {
            this.showScreen('levelSelect');
        } else {
            this.startGameFlow(0); // Start from level 0 (easy)
        }
    }
    
    /**
     * Initializes the game state object at the start of a new game.
     */
    setupInitialGameState() {
        this.gameState = {
            name: this.dom.nameInput.value.trim(),
            avatar: this.gameState.avatar, // Persist avatar selection
            playerId: `PL${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
            deviceId: this.getOrSetDeviceId(),
            level: 0,
            questionIndex: 0,
            wrongAnswers: 0,
            correctAnswers: 0,
            skips: 0,
            startTime: new Date(),
            helpersUsed: { fiftyFifty: false, freezeTime: false },
            currentScore: this.config.STARTING_SCORE
        };
    }

    /**
     * Starts the main game loop from a specific level.
     * @param {number} levelIndex - The index of the level to start.
     */
    startGameFlow(levelIndex = 0) {
        this.gameState.level = levelIndex;
        this.updateScore(this.config.STARTING_SCORE, true);
        this.setupGameUI();
        this.showScreen('game');
        this.startLevel();
    }
    
    /**
     * Prepares and starts a new level.
     */
    startLevel() {
        const currentLevel = this.config.LEVELS[this.gameState.level];
        document.body.dataset.level = currentLevel.name;
        this.getEl('#currentLevelBadge').textContent = currentLevel.label;
        
        let levelQuestions = [...this.questions[currentLevel.name]];
        if (this.config.RANDOMIZE_QUESTIONS) this.shuffleArray(levelQuestions);
        this.gameState.shuffledQuestions = levelQuestions;

        this.updateLevelProgressUI();
        this.gameState.questionIndex = 0;
        this.fetchQuestion();
    }

    /**
     * Fetches and displays the next question in the current level.
     */
    fetchQuestion() {
        const questions = this.gameState.shuffledQuestions;
        if (this.gameState.questionIndex >= questions.length) {
            this.levelComplete();
            return;
        }
        const questionData = questions[this.gameState.questionIndex];
        this.displayQuestion(questionData);
    }

    /**
     * Handles the end of a level, transitioning to the next or ending the game.
     */
    levelComplete() {
        const isLastLevel = this.gameState.level >= this.config.LEVELS.length - 1;
        if (isLastLevel) {
            this.endGame(true); // Game won
            return;
        }
        
        this.getEl('#levelCompleteTitle').textContent = `🎉 أكملت المستوى ${this.config.LEVELS[this.gameState.level].label}!`;
        this.getEl('#levelScore').textContent = this.formatNumber(this.gameState.currentScore);
        this.getEl('#levelErrors').textContent = this.gameState.wrongAnswers;
        this.getEl('#levelCorrect').textContent = this.gameState.correctAnswers;
        this.showScreen('levelComplete');
    }

    /**
     * Proceeds to the next level.
     */
    nextLevel() {
        this.gameState.level++;
        if (this.gameState.level >= this.config.LEVELS.length) {
            this.endGame(true);
        } else {
            this.showScreen('game');
            this.startLevel();
        }
    }
    
    /**
     * Ends the game, calculates final stats, and saves the results.
     * @param {boolean} [completedAllLevels=false] - Whether the player finished the entire game.
     */
    async endGame(completedAllLevels = false) {
        clearInterval(this.timer.interval);
        this.hideModal('confirmExit');

        const finalStats = this._calculateFinalStats(completedAllLevels);
        
        if (!this.isDevSession) {
            const { attemptNumber, error } = await this.saveResultsToSupabase(finalStats);
            if (error) {
                this.showToast("فشل إرسال النتائج إلى السيرفر", "error");
            }
            finalStats.attempt_number = attemptNumber ?? 'N/A';
        } else {
            finalStats.attempt_number = 'DEV';
        }
        
        this._displayFinalStats(finalStats);
        this.showScreen('end');
    }

    /**
     * Calculates all final statistics for the end screen and database.
     * @param {boolean} completedAll - True if all levels were beaten.
     * @returns {object} The final stats object.
     */
    _calculateFinalStats(completedAll) {
        const totalTimeSeconds = (new Date() - this.gameState.startTime) / 1000;
        const currentLevelLabel = this.config.LEVELS[Math.min(this.gameState.level, this.config.LEVELS.length - 1)].label;
        const totalAnswered = this.gameState.correctAnswers + this.gameState.wrongAnswers;
        const accuracy = totalAnswered > 0 ? parseFloat(((this.gameState.correctAnswers / totalAnswered) * 100).toFixed(1)) : 0.0;
        const avgTime = totalAnswered > 0 ? parseFloat((totalTimeSeconds / totalAnswered).toFixed(1)) : 0.0;

        return {
            name: this.gameState.name,
            player_id: this.gameState.playerId,
            device_id: this.gameState.deviceId,
            avatar: this.gameState.avatar,
            correct_answers: this.gameState.correctAnswers,
            wrong_answers: this.gameState.wrongAnswers,
            skips: this.gameState.skips,
            score: this.gameState.currentScore,
            total_time: totalTimeSeconds,
            level: currentLevelLabel,
            accuracy: accuracy,
            avg_time: avgTime,
            performance_rating: this.getPerformanceRating(accuracy),
            completed_all: completedAll,
            used_fifty_fifty: this.gameState.helpersUsed.fiftyFifty,
            used_freeze_time: this.gameState.helpersUsed.freezeTime
        };
    }

    // =============================================
    // UI & Display Logic
    // =============================================

    /**
     * Renders a question and its options on the screen.
     * @param {object} questionData - The question object from questions.json.
     */
    displayQuestion(questionData) {
        this.answerSubmitted = false;
        
        const correctAnswerText = questionData.options[questionData.correct];
        let options = [...questionData.options];
        if (this.config.RANDOMIZE_ANSWERS) this.shuffleArray(options);

        const totalQuestions = this.gameState.shuffledQuestions.length;
        this.getEl('#questionCounter').textContent = `السؤال ${this.gameState.questionIndex + 1} من ${totalQuestions}`;
        this.dom.questionText.textContent = questionData.q;
        this.dom.optionsGrid.innerHTML = ''; // Clear previous options

        const fragment = document.createDocumentFragment();
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = optionText;
            button.dataset.correct = (optionText === correctAnswerText);
            fragment.appendChild(button);
        });
        this.dom.optionsGrid.appendChild(fragment);

        this.updateGameStatsUI();
        this.startTimer();
    }

    /**
     * Handles the player's answer selection.
     * @param {HTMLElement} selectedButton - The button element that was clicked.
     */
    checkAnswer(selectedButton) {
        if (this.answerSubmitted) return;
        this.answerSubmitted = true;
        clearInterval(this.timer.interval);
        this.getAllEl('.option-btn').forEach(b => b.classList.add('disabled'));

        const isCorrect = selectedButton.dataset.correct === 'true';

        if (isCorrect) {
            selectedButton.classList.add('correct');
            this.updateScore(this.gameState.currentScore + 100);
            this.gameState.correctAnswers++;
            this.showToast("إجابة صحيحة! +100 نقطة", "success");
        } else {
            selectedButton.classList.add('wrong');
            const correctButton = this.dom.optionsGrid.querySelector('[data-correct="true"]');
            if (correctButton) correctButton.classList.add('correct');
            this.gameState.wrongAnswers++;
            this.updateScore(this.gameState.currentScore - 100);
            this.showToast("إجابة خاطئة! -100 نقطة", "error");
        }

        this.gameState.questionIndex++;
        this.updateGameStatsUI();

        const isGameOver = this.gameState.wrongAnswers >= this.config.MAX_WRONG_ANSWERS && !this.isDeveloper();
        
        setTimeout(() => {
            if (isGameOver) this.endGame(false);
            else this.fetchQuestion();
        }, 2000);
    }
    
    /**
     * Updates all dynamic UI elements during gameplay.
     */
    updateGameStatsUI() {
        this.getEl('#wrongAnswersCount').textContent = `${this.gameState.wrongAnswers} / ${this.config.MAX_WRONG_ANSWERS}`;
        this.getEl('#skipCount').textContent = this.gameState.skips;

        const skipCost = this.config.HELPER_COSTS.skipQuestionBase + (this.gameState.skips * this.config.HELPER_COSTS.skipQuestionIncrement);
        this.getEl('#skipCost').textContent = `(${skipCost})`;
        
        const isImpossible = this.config.LEVELS[this.gameState.level]?.name === 'impossible';
        this.getAllEl('.helper-btn').forEach(btn => {
            const type = btn.dataset.type;
            if (this.isDeveloper()) {
                btn.disabled = false;
                return;
            }
            btn.disabled = isImpossible || (type !== 'skipQuestion' && this.gameState.helpersUsed[type]);
        });
    }
    
    /**
     * Displays the final stats on the end screen.
     * @param {object} stats - The final stats object.
     */
    _displayFinalStats(stats) {
        this.getEl('#finalName').textContent = stats.name;
        this.getEl('#finalId').textContent = stats.player_id;
        this.getEl('#finalAttemptNumber').textContent = stats.attempt_number;
        this.getEl('#finalCorrect').textContent = stats.correct_answers;
        this.getEl('#finalWrong').textContent = stats.wrong_answers;
        this.getEl('#finalSkips').textContent = stats.skips;
        this.getEl('#finalScore').textContent = this.formatNumber(stats.score);
        this.getEl('#totalTime').textContent = this.formatTime(stats.total_time);
        this.getEl('#finalLevel').textContent = stats.level;
        this.getEl('#finalAccuracy').textContent = `${stats.accuracy}%`;
        this.getEl('#finalAvgTime').textContent = `${this.formatTime(stats.avg_time)} / سؤال`;
        this.getEl('#performanceText').textContent = stats.performance_rating;
    }

    // =============================================
    // Data & API Handling
    // =============================================

    async loadQuestions() {
        try {
            const response = await fetch(this.config.QUESTIONS_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.questions = await response.json();
            return true;
        } catch (error) {
            console.error("Failed to load questions file:", error);
            return false;
        }
    }
    
    async saveResultsToSupabase(resultsData) {
        try {
            const { count, error: countError } = await this.supabase
                .from('log')
                .select('id', { count: 'exact', head: true })
                .eq('device_id', resultsData.device_id);

            if (countError) throw countError;
            const attemptNumber = (count || 0) + 1;
            
            const { error: logError } = await this.supabase.from('log').insert({ ...resultsData, attempt_number: attemptNumber });
            if (logError) throw logError;
            
            const leaderboardData = {
                device_id: resultsData.device_id,
                player_id: resultsData.player_id,
                name: resultsData.name, avatar: resultsData.avatar, score: resultsData.score,
                level: resultsData.level, accuracy: resultsData.accuracy, total_time: resultsData.total_time,
                avg_time: resultsData.avg_time, correct_answers: resultsData.correct_answers,
                wrong_answers: resultsData.wrong_answers, skips: resultsData.skips,
                attempt_number: attemptNumber, performance_rating: resultsData.performance_rating,
                is_impossible_finisher: resultsData.completed_all && resultsData.level === 'مستحيل'
            };
            const { error: leaderboardError } = await this.supabase.from('leaderboard').upsert(leaderboardData);
            if (leaderboardError) throw leaderboardError;
            
            this.showToast("تم حفظ نتيجتك بنجاح!", "success");
            this.sendTelegramNotification('gameResult', { ...resultsData, attempt_number: attemptNumber });
            return { attemptNumber, error: null };

        } catch (error) {
            console.error("Failed to send results to Supabase:", error);
            return { attemptNumber: null, error: error.message };
        }
    }
    
    async handleReportSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const reportData = {
            type: formData.get('problemType'),
            description: formData.get('problemDescription'),
            name: this.gameState.name || 'لم يبدأ اللعب',
            player_id: this.gameState.playerId || 'N/A',
            question_text: this.dom.questionText.textContent || 'لا يوجد'
        };

        this.showToast("جاري إرسال البلاغ...", "info");
        this.hideModal('advancedReport');

        try {
            const { error } = await this.supabase.from('reports').insert(reportData);
            if (error) throw error;
            this.showToast("تم إرسال بلاغك بنجاح. شكراً لك!", "success");
            this.sendTelegramNotification('report', reportData);
        } catch (error) {
            console.error("Supabase report error:", error);
            this.showToast("حدث خطأ أثناء إرسال البلاغ.", "error");
        }
    }
    
    async sendTelegramNotification(type, data) {
        if (!this.config.APPS_SCRIPT_URL) {
            console.warn("Apps Script URL is not configured. Skipping notification.");
            return;
        }
        try {
            await fetch(this.config.APPS_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors', cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain' }, // Use text/plain for no-cors
                body: JSON.stringify({ type, data })
            });
        } catch (error) {
            console.error('Error sending notification request to Apps Script:', error.message);
        }
    }
    
    useHelper(btn) {
        const type = btn.dataset.type;
        const isDev = this.isDeveloper();
        const cost = type === 'skipQuestion' 
            ? this.config.HELPER_COSTS.skipQuestionBase + (this.gameState.skips * this.config.HELPER_COSTS.skipQuestionIncrement)
            : this.config.HELPER_COSTS[type];

        if (!isDev && this.gameState.currentScore < cost) {
            this.showToast("نقاطك غير كافية!", "error");
            return;
        }

        if (!isDev) {
            this.updateScore(this.gameState.currentScore - cost);
            this.showToast(`تم استخدام المساعدة! -${cost} نقطة`, "info");
        } else {
            this.showToast(`مساعدة المطور (${type})`, "info");
        }

        if (type === 'skipQuestion') {
            clearInterval(this.timer.interval);
            this.gameState.skips++;
            this.gameState.questionIndex++;
            this.updateGameStatsUI();
            this.fetchQuestion();
        } else {
            if (!isDev) this.gameState.helpersUsed[type] = true;
            this.updateGameStatsUI();
            if (type === 'fiftyFifty') {
                const wrongOptions = this.getAllEl('.option-btn:not([data-correct="true"])');
                this.shuffleArray(Array.from(wrongOptions)).slice(0, 2).forEach(btn => btn.classList.add('hidden'));
            } else if (type === 'freezeTime') {
                this.timer.isFrozen = true;
                this.getEl('.timer-bar').classList.add('frozen');
                setTimeout(() => {
                    this.timer.isFrozen = false;
                    this.getEl('.timer-bar').classList.remove('frozen');
                }, 10000);
            }
        }
    }

    startTimer() {
        clearInterval(this.timer.interval);
        let timeLeft = this.config.QUESTION_TIME;
        const timerBar = this.getEl('.timer-bar');
        const timerDisplay = this.getEl('.timer-text');
        timerDisplay.textContent = timeLeft;
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        // Force reflow to restart animation
        void timerBar.offsetWidth;
        timerBar.style.transition = `width ${this.config.QUESTION_TIME}s linear`;
        timerBar.style.width = '0%';

        this.timer.interval = setInterval(() => {
            if (this.timer.isFrozen) return;
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(this.timer.interval);
                this.showToast("انتهى الوقت!", "error");
                this.checkAnswer({ dataset: { correct: 'false' } }); // Simulate wrong answer
            }
        }, 1000);
    }
    
    updateScore(newScore, isReset = false) {
        this.gameState.currentScore = (this.isDeveloper() && !isReset) ? this.gameState.currentScore : newScore;
        this.dom.scoreDisplay.textContent = this.formatNumber(this.gameState.currentScore);
        this.updateGameStatsUI();
    }

    // =============================================
    // Utility & Helper Functions
    // =============================================

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    getOrSetDeviceId() {
        let deviceId = localStorage.getItem('quizGameDeviceId');
        if (!deviceId) {
            deviceId = 'D' + Date.now().toString(36) + Math.random().toString(36).substring(2, 11).toUpperCase();
            localStorage.setItem('quizGameDeviceId', deviceId);
        }
        return deviceId;
    }

    isDeveloper() { return this.isDevSession && !this.isDevTemporarilyDisabled; }
    
    getPerformanceRating(accuracy) {
        if (accuracy >= 90) return "ممتاز 🏆";
        if (accuracy >= 75) return "جيد جدًا ⭐";
        if (accuracy >= 60) return "جيد 👍";
        if (accuracy >= 40) return "مقبول 👌";
        return "يحتاج تحسين 📈";
    }
    
    formatTime(totalSeconds) {
        const total = Math.floor(totalSeconds);
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatNumber(num) { return new Intl.NumberFormat('ar-EG').format(num); }
    
    // =============================================
    // Dev Mode
    // =============================================
    checkDevPassword() {
        const input = this.dom.devPasswordInput.value;
        if (input.toLowerCase() === this.config.DEVELOPER_PASSWORD.toLowerCase()) {
            this.activateDevSession();
        } else {
            this.dom.devPasswordError.textContent = "كلمة المرور غير صحيحة.";
            this.dom.devPasswordError.classList.add('show');
        }
    }
    
    activateDevSession(fromModal = true) {
        this.isDevSession = true;
        if (fromModal) this.hideModal('devPassword');
        this.showToast("تم تفعيل وضع المطور", "success");
        const fab = this.dom.devFloatingBtn;
        fab.style.display = 'flex';
        fab.classList.add('active');
        fab.classList.remove('inactive');
        fab.querySelector('span').innerHTML = '⚡';
    }

    // =============================================
    // UI Helpers (Screens, Modals, Toasts, etc.)
    // =============================================

    showScreen(screenName) {
        Object.values(this.dom.screens).forEach(screen => screen.classList.remove('active'));
        if (this.dom.screens[screenName]) this.dom.screens[screenName].classList.add('active');
    }

    showModal(modalName) { this.dom.modals[modalName].classList.add('active'); }
    hideModal(modalName) { if(this.dom.modals[modalName]) this.dom.modals[modalName].classList.remove('active'); }

    showToast(message, type = 'info') {
        const toastContainer = this.getEl('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        this.getEl('.theme-toggle-btn').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    updateLevelProgressUI() {
        this.getAllEl('.level-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.gameState.level);
            indicator.classList.toggle('completed', index < this.gameState.level);
        });
    }
    
    handleNameConfirmation() {
        if (!this.dom.confirmNameBtn.disabled) {
            if (this.dom.nameInput.value.trim().toLowerCase() === this.config.DEVELOPER_NAME.toLowerCase()) {
                this.activateDevSession(false);
            }
            this.showScreen('instructions');
        }
    }
    
    validateNameInput() {
        const name = this.dom.nameInput.value.trim();
        const isValid = name.length >= 3;
        this.dom.nameError.textContent = isValid ? "" : "الاسم يجب أن يتكون من ٣ أحرف على الأقل.";
        this.dom.nameError.classList.toggle('show', !isValid);
        this.dom.confirmNameBtn.disabled = !isValid;
    }
        
    // =============================================
    // Leaderboard
    // =============================================

    async displayLeaderboard() {
        this.showScreen('leaderboard');
        this.dom.leaderboardContent.innerHTML = '<div class="spinner"></div>';

        try {
            const { data: players, error } = await this.supabase
                .from('leaderboard')
                .select('*')
                .order('is_impossible_finisher', { ascending: false })
                .order('score', { ascending: false })
                .order('accuracy', { ascending: false })
                .order('total_time', { ascending: true })
                .limit(100);

            if (error) throw error;
            this.renderLeaderboard(players);
            this.subscribeToLeaderboardChanges();
        } catch (error) {
            console.error("Error loading leaderboard:", error);
            this.dom.leaderboardContent.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
        }
    }

    renderLeaderboard(players) {
        if (players.length === 0) {
            this.dom.leaderboardContent.innerHTML = '<p>لوحة الصدارة فارغة حاليًا!</p>';
            return;
        }
        const list = document.createElement('ul');
        list.className = 'leaderboard-list';
        const medals = ['🥇', '🥈', '🥉'];
        let rankCounter = 1;

        players.forEach(player => {
            const item = document.createElement('li');
            item.className = 'leaderboard-item';
            let rankDisplay;

            if (player.is_impossible_finisher) {
                item.classList.add('impossible-finisher');
                rankDisplay = '🎖️';
            } else {
                if (rankCounter <= 3) {
                    item.classList.add(`rank-${rankCounter}`);
                    rankDisplay = medals[rankCounter - 1];
                } else {
                    rankDisplay = rankCounter;
                }
                rankCounter++;
            }

            item.innerHTML = `
                <span class="leaderboard-rank">${rankDisplay}</span>
                <img src="${player.avatar || ''}" alt="صورة ${player.name}" class="leaderboard-avatar" loading="lazy" style="visibility: ${player.avatar ? 'visible' : 'hidden'}">
                <div class="leaderboard-details">
                    <span class="leaderboard-name">${player.name || 'غير معروف'}</span>
                    <span class="leaderboard-score">${this.formatNumber(player.score)}</span>
                </div>`;
            item.addEventListener('click', () => this.showPlayerDetails(player));
            list.appendChild(item);
        });
        this.dom.leaderboardContent.innerHTML = '';
        this.dom.leaderboardContent.appendChild(list);
    }
    
    subscribeToLeaderboardChanges() {
        if (this.leaderboardSubscription) this.leaderboardSubscription.unsubscribe();
        
        this.leaderboardSubscription = this.supabase
            .channel('public:leaderboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => this.displayLeaderboard())
            .subscribe();
    }

    showPlayerDetails(player) {
        this.getEl('#detailsName').textContent = player.name || 'غير معروف';
        this.getEl('#detailsPlayerId').textContent = player.player_id || 'N/A';
        const avatar = this.getEl('#detailsAvatar');
        avatar.src = player.avatar || '';
        avatar.style.visibility = player.avatar ? 'visible' : 'hidden';

        this.getEl('#playerDetailsContent').innerHTML = `
            <div class="detail-item"><span class="label">⭐ النقاط النهائية</span><span class="value score">${this.formatNumber(player.score || 0)}</span></div>
            <div class="detail-item"><span class="label">👑 المستوى</span><span class="value">${player.level || 'N/A'}</span></div>
            <div class="detail-item"><span class="label">✅ الصحيحة</span><span class="value">${this.formatNumber(player.correct_answers || 0)}</span></div>
            <div class="detail-item"><span class="label">❌ الخاطئة</span><span class="value">${this.formatNumber(player.wrong_answers || 0)}</span></div>
            <div class="detail-item"><span class="label">⏱️ الوقت</span><span class="value">${this.formatTime(player.total_time || 0)}</span></div>
            <div class="detail-item"><span class="label">⏳ المتوسط</span><span class="value">${this.formatTime(player.avg_time || 0)}/س</span></div>
            <div class="detail-item full-width">
                <span class="label">🎯 نسبة الدقة</span><span class="value">${player.accuracy || 0}%</span>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${player.accuracy || 0}%;"></div></div>
            </div>
            <div class="detail-item"><span class="label">⏭️ التخطي</span><span class="value">${this.formatNumber(player.skips || 0)}</span></div>
            <div class="detail-item"><span class="label">🔢 المحاولة</span><span class="value">${this.formatNumber(player.attempt_number || 0)}</span></div>
            <div class="detail-item full-width"><span class="label">📊 الأداء</span><span class="value">${player.performance_rating || 'جيد'}</span></div>
        `;
        this.showModal('playerDetails');
    }

    // =============================================
    // Avatar Handling
    // =============================================

    populateAvatarGrid() {
        const grid = this.getEl('.avatar-grid');
        grid.innerHTML = '';
        const uploadBtnHTML = `<div class="avatar-upload-btn" title="رفع صورة"><span aria-hidden="true">+</span><label for="avatarUploadInput" class="sr-only">رفع صورة</label><input type="file" id="avatarUploadInput" accept="image/*" style="display:none;"></div>`;
        grid.insertAdjacentHTML('beforeend', uploadBtnHTML);

        this.getEl('#avatarUploadInput').addEventListener('change', e => this.handleAvatarUpload(e));
        this.getEl('.avatar-upload-btn').addEventListener('click', () => this.getEl('#avatarUploadInput').click());

        const avatarUrls = [ "https://em-content.zobj.net/thumbs/120/apple/354/woman_1f469.png", "https://em-content.zobj.net/thumbs/120/apple/354/man_1f468.png", "https://em-content.zobj.net/thumbs/120/apple/354/person-beard_1f9d4.png", "https://em-content.zobj.net/thumbs/120/apple/354/old-man_1f474.png", "https://em-content.zobj.net/thumbs/120/apple/354/student_1f9d1-200d-1f393.png", "https://em-content.zobj.net/thumbs/120/apple/354/teacher_1f9d1-200d-1f3eb.png", "https://em-content.zobj.net/thumbs/120/apple/354/scientist_1f9d1-200d-1f52c.png", "https://em-content.zobj.net/thumbs/120/apple/354/artist_1f9d1-200d-1f3a8.png" ];
        avatarUrls.forEach((url, i) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `صورة رمزية ${i + 1}`;
            img.className = 'avatar-option';
            img.loading = 'lazy';
            grid.appendChild(img);
        });
    }
    
    selectAvatar(element) {
        this.getAllEl('.avatar-option.selected, .avatar-upload-btn.selected').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.gameState.avatar = element.src;
        this.dom.confirmAvatarBtn.disabled = false;
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                this.dom.imageToCrop.src = e.target.result;
                this.showModal('avatarEditor');
                setTimeout(() => {
                    if (this.cropper) this.cropper.destroy();
                    this.cropper = new Cropper(this.dom.imageToCrop, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
                }, 300);
            };
            reader.readAsDataURL(file);
        }
    }
    
    saveCroppedAvatar() {
        if (!this.cropper) return;
        const croppedUrl = this.cropper.getCroppedCanvas({ width: 256, height: 256 }).toDataURL('image/png');
        let customAvatar = this.getEl('#custom-avatar');
        if (!customAvatar) {
            customAvatar = document.createElement('img');
            customAvatar.id = 'custom-avatar';
            customAvatar.className = 'avatar-option';
            this.getEl('.avatar-upload-btn').after(customAvatar);
        }
        customAvatar.src = croppedUrl;
        this.selectAvatar(customAvatar);
        this.hideModal('avatarEditor');
    }
    
    // =============================================
    // Sharing
    // =============================================

    getShareText() {
        // This is a simplified version for sharing, the full stats are on the screen
        const finalScore = this.getEl('#finalScore').textContent;
        const finalLevel = this.getEl('#finalLevel').textContent;
        const performance = this.getEl('#performanceText').textContent;

        return `🏆 لقد حصلت على ${finalScore} نقطة في مسابقة المعلومات!\n\n` +  
               `وصلت إلى المستوى: ${finalLevel}\n` +
               `تقييم الأداء: ${performance}\n\n`;
    }
    
    shareOnX() {
        const text = this.getShareText() + `🔗 تحداني الآن!\n${window.location.href}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    }

    shareOnInstagram() {
        // Instagram doesn't have a direct share API like X, so we copy text to clipboard
        // for the user to paste in a story or post.
        const textToCopy = this.getShareText();
        navigator.clipboard.writeText(textToCopy)
            .then(() => this.showToast("تم نسخ النتيجة لمشاركتها!", "success"))
            .catch(() => this.showToast("فشل نسخ النتيجة.", "error"));
    }

    setupGameUI() {
        this.getEl('#playerAvatar').src = this.gameState.avatar;
        this.getEl('#playerName').textContent = this.gameState.name;
        this.getEl('#playerId').textContent = this.gameState.playerId;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set theme on load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    document.querySelector('.theme-toggle-btn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    // Start the game logic
    new QuizGame();
});
