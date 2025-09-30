class QuizGame {
    constructor() {
        this.config = {
            SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
            SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
            APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
            QUESTIONS_URL: 'https://abuqusayms.github.io/Shadow-Game/questions.json',

            DEVELOPER_NAME: "AbuQusay",
            DEVELOPER_PASSWORD: "AbuQusay",

            RANDOMIZE_QUESTIONS: true,
            RANDOMIZE_ANSWERS: true,
            QUESTION_TIME: 30,
            MAX_WRONG_ANSWERS: 3,
            STARTING_SCORE: 100,
            
            LEVELS: [
                { name: "easy", label: "سهل", questionsCount: 5 },
                { name: "medium", label: "متوسط", questionsCount: 5 },
                { name: "hard", label: "صعب", questionsCount: 5 },
                { name: "impossible", label: "مستحيل", questionsCount: 1 }
            ],
            
            HELPER_COSTS: {
                fiftyFifty: 100,
                freezeTime: 100,
                skipQuestionBase: 20,
                skipQuestionIncrement: 20
            }
        };

        this.supabase = null;
        this.questions = {};
        this.gameState = {};
        this.timer = { interval: null, isFrozen: false, timeLeft: 0 };
        this.dom = {};
        this.cropper = null;
        this.leaderboardSubscription = null;
        this.isDevSession = false;
        this.isDevTemporarilyDisabled = false;
        this.answerSubmitted = false;

        this.init();
    }

    async init() {
        this.cacheDomElements();
        this.bindEventListeners();
        this.populateAvatarGrid();
        this.applySavedTheme();

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
            scoreDisplay: byId('currentScore'),
            shareText: byId('shareText')
        };
    }
    
    getEl(selector, parent = document) { return parent.querySelector(selector); }
    getAllEl(selector, parent = document) { return parent.querySelectorAll(selector); }

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
                copyShareText: () => this.copyShareText(),
                saveCroppedAvatar: () => this.saveCroppedAvatar(),
                checkDevPassword: () => this.checkDevPassword(),
                startDevLevel: () => this.startGameFlow(parseInt(target.dataset.levelIndex, 10))
            };
            
            if (actionHandlers[action]) actionHandlers[action]();
        });

        // Report FAB
        this.getEl('#reportErrorFab').addEventListener('click', () => this.showModal('advancedReportModal'));

        // Auto detect problem
        this.getEl('#autoDetectProblem').addEventListener('click', () => this.autoDetectProblem());

        // Screenshot upload
        this.getEl('#problemScreenshot').addEventListener('change', (e) => this.handleScreenshotUpload(e));

        // Share platform switching
        this.getAllEl('.share-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSharePlatform(e.target));
        });

        // Leaderboard filters
        this.getAllEl('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterLeaderboard(e.target.dataset.filter));
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
        });

        // Close modals when clicking outside
        this.getAllEl('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // =============================================
    // Game Flow & State Management
    // =============================================

    postInstructionsStart() {
        this.setupInitialGameState();
        if (this.isDevSession) {
            this.showScreen('levelSelect');
        } else {
            this.startGameFlow(0);
        }
    }
    
    setupInitialGameState() {
        this.gameState = {
            name: this.dom.nameInput.value.trim(),
            avatar: this.gameState.avatar,
            playerId: `PL${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
            deviceId: this.getOrSetDeviceId(),
            level: 0,
            questionIndex: 0,
            wrongAnswers: 0,
            correctAnswers: 0,
            skips: 0,
            startTime: new Date(),
            levelStartTime: new Date(),
            helpersUsed: { fiftyFifty: false, freezeTime: false },
            currentScore: this.config.STARTING_SCORE,
            levelScores: [],
            answers: []
        };
    }

    startGameFlow(levelIndex = 0) {
        this.gameState.level = levelIndex;
        this.gameState.levelStartTime = new Date();
        this.updateScore(this.config.STARTING_SCORE, true);
        this.setupGameUI();
        this.showScreen('game');
        this.startLevel();
    }
    
    startLevel() {
        const currentLevel = this.config.LEVELS[this.gameState.level];
        document.body.dataset.level = currentLevel.name;
        this.getEl('#currentLevelBadge').textContent = currentLevel.label;
        
        let levelQuestions = [...this.questions[currentLevel.name]];
        if (this.config.RANDOMIZE_QUESTIONS) this.shuffleArray(levelQuestions);
        
        // Take only the required number of questions
        this.gameState.shuffledQuestions = levelQuestions.slice(0, currentLevel.questionsCount);
        this.gameState.questionIndex = 0;

        this.updateLevelProgressUI();
        this.fetchQuestion();
    }

    fetchQuestion() {
        const questions = this.gameState.shuffledQuestions;
        if (this.gameState.questionIndex >= questions.length) {
            this.levelComplete();
            return;
        }
        const questionData = questions[this.gameState.questionIndex];
        this.displayQuestion(questionData);
    }

    displayQuestion(questionData) {
        this.answerSubmitted = false;
        
        const correctAnswerText = questionData.options[questionData.correct];
        let options = [...questionData.options];
        if (this.config.RANDOMIZE_ANSWERS) this.shuffleArray(options);

        const totalQuestions = this.gameState.shuffledQuestions.length;
        this.getEl('#questionCounter').textContent = `السؤال ${this.gameState.questionIndex + 1} من ${totalQuestions}`;
        this.dom.questionText.textContent = questionData.q;
        this.dom.optionsGrid.innerHTML = '';

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

    checkAnswer(selectedButton) {
        if (this.answerSubmitted) return;
        this.answerSubmitted = true;
        clearInterval(this.timer.interval);
        this.getAllEl('.option-btn').forEach(b => b.classList.add('disabled'));

        const isCorrect = selectedButton.dataset.correct === 'true';
        const answerTime = (new Date() - this.gameState.levelStartTime) / 1000;

        // Record answer
        this.gameState.answers.push({
            level: this.config.LEVELS[this.gameState.level].name,
            question: this.dom.questionText.textContent,
            isCorrect: isCorrect,
            time: answerTime
        });

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

    levelComplete() {
        // Save level score
        this.gameState.levelScores.push({
            level: this.config.LEVELS[this.gameState.level].label,
            score: this.gameState.currentScore,
            correctAnswers: this.gameState.correctAnswers,
            wrongAnswers: this.gameState.wrongAnswers
        });

        const isLastLevel = this.gameState.level >= this.config.LEVELS.length - 1;
        if (isLastLevel) {
            this.endGame(true);
            return;
        }
        
        this.getEl('#levelCompleteTitle').textContent = `🎉 أكملت المستوى ${this.config.LEVELS[this.gameState.level].label}!`;
        this.getEl('#levelScore').textContent = this.formatNumber(this.gameState.currentScore);
        this.getEl('#levelErrors').textContent = this.gameState.wrongAnswers;
        this.getEl('#levelCorrect').textContent = this.gameState.correctAnswers;
        this.showScreen('levelComplete');
    }

    nextLevel() {
        this.gameState.level++;
        if (this.gameState.level >= this.config.LEVELS.length) {
            this.endGame(true);
        } else {
            this.gameState.levelStartTime = new Date();
            this.showScreen('game');
            this.startLevel();
        }
    }
    
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
        this.updateShareText();
        this.showScreen('end');
    }

    _calculateFinalStats(completedAll) {
        const totalTimeSeconds = (new Date() - this.gameState.startTime) / 1000;
        const currentLevelLabel = this.config.LEVELS[Math.min(this.gameState.level, this.config.LEVELS.length - 1)].label;
        const totalAnswered = this.gameState.correctAnswers + this.gameState.wrongAnswers;
        const accuracy = totalAnswered > 0 ? parseFloat(((this.gameState.correctAnswers / totalAnswered) * 100).toFixed(1)) : 0.0;
        
        // Calculate average time per question
        const totalAnswerTime = this.gameState.answers.reduce((sum, answer) => sum + answer.time, 0);
        const avgTime = totalAnswered > 0 ? parseFloat((totalAnswerTime / totalAnswered).toFixed(1)) : 0.0;

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
            used_freeze_time: this.gameState.helpersUsed.freezeTime,
            level_scores: JSON.stringify(this.gameState.levelScores),
            answers: JSON.stringify(this.gameState.answers)
        };
    }

    // =============================================
    // UI & Display Logic
    // =============================================

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

    updateLevelProgressUI() {
        this.getAllEl('.level-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.gameState.level);
            indicator.classList.toggle('completed', index < this.gameState.level);
        });
    }

    // =============================================
    // Timer & Helpers
    // =============================================

    startTimer() {
        clearInterval(this.timer.interval);
        this.timer.timeLeft = this.config.QUESTION_TIME;
        const timerBar = this.getEl('.timer-bar');
        const timerDisplay = this.getEl('.timer-text');
        timerDisplay.textContent = this.timer.timeLeft;
        
        // Reset timer bar
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        void timerBar.offsetWidth; // Force reflow
        timerBar.style.transition = `width ${this.config.QUESTION_TIME}s linear`;
        timerBar.style.width = '0%';

        this.timer.interval = setInterval(() => {
            if (this.timer.isFrozen) return;
            this.timer.timeLeft--;
            timerDisplay.textContent = this.timer.timeLeft;
            if (this.timer.timeLeft <= 0) {
                clearInterval(this.timer.interval);
                this.showToast("انتهى الوقت!", "error");
                this.checkAnswer({ dataset: { correct: 'false' } });
            }
        }, 1000);
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

    updateScore(newScore, isReset = false) {
        this.gameState.currentScore = (this.isDeveloper() && !isReset) ? this.gameState.currentScore : newScore;
        this.dom.scoreDisplay.textContent = this.formatNumber(this.gameState.currentScore);
        this.updateGameStatsUI();
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
            // Get current attempt number
            const { count, error: countError } = await this.supabase
                .from('log')
                .select('id', { count: 'exact', head: true })
                .eq('device_id', resultsData.device_id);

            if (countError) throw countError;
            const attemptNumber = (count || 0) + 1;
            
            // Insert into log
            const { error: logError } = await this.supabase.from('log').insert({ 
                ...resultsData, 
                attempt_number: attemptNumber 
            });
            if (logError) throw logError;
            
            // Check if we should update leaderboard
            const { data: existingEntry, error: fetchError } = await this.supabase
                .from('leaderboard')
                .select('*')
                .eq('device_id', resultsData.device_id)
                .single();

            const leaderboardData = {
                device_id: resultsData.device_id,
                player_id: resultsData.player_id,
                name: resultsData.name,
                avatar: resultsData.avatar,
                score: resultsData.score,
                level: resultsData.level,
                accuracy: resultsData.accuracy,
                total_time: resultsData.total_time,
                avg_time: resultsData.avg_time,
                correct_answers: resultsData.correct_answers,
                wrong_answers: resultsData.wrong_answers,
                skips: resultsData.skips,
                attempt_number: attemptNumber,
                performance_rating: resultsData.performance_rating,
                is_impossible_finisher: resultsData.completed_all && resultsData.level === 'مستحيل',
                updated_at: new Date().toISOString()
            };

            let leaderboardError = null;
            
            if (fetchError && fetchError.code === 'PGRST116') {
                // No existing entry - insert
                const { error } = await this.supabase.from('leaderboard').insert(leaderboardData);
                leaderboardError = error;
            } else if (!fetchError) {
                // Existing entry found - update only if better score
                if (this.shouldUpdateLeaderboard(leaderboardData, existingEntry)) {
                    const { error } = await this.supabase
                        .from('leaderboard')
                        .update(leaderboardData)
                        .eq('device_id', resultsData.device_id);
                    leaderboardError = error;
                }
            } else {
                throw fetchError;
            }
            
            if (leaderboardError) throw leaderboardError;
            
            this.showToast("تم حفظ نتيجتك بنجاح!", "success");
            this.sendTelegramNotification('gameResult', { ...resultsData, attempt_number: attemptNumber });
            return { attemptNumber, error: null };

        } catch (error) {
            console.error("Failed to send results to Supabase:", error);
            return { attemptNumber: null, error: error.message };
        }
    }

    shouldUpdateLeaderboard(newData, existingData) {
        // Update if new score is higher
        if (newData.score > existingData.score) return true;
        
        // If scores are equal, check accuracy
        if (newData.score === existingData.score && newData.accuracy > existingData.accuracy) return true;
        
        // If accuracy is equal, check time
        if (newData.score === existingData.score && 
            newData.accuracy === existingData.accuracy && 
            newData.total_time < existingData.total_time) return true;
        
        return false;
    }
    
    async handleReportSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        // Handle screenshot upload
        const screenshotFile = formData.get('problemScreenshot');
        let screenshotUrl = null;
        
        if (screenshotFile && screenshotFile.size > 0) {
            screenshotUrl = await this.uploadScreenshot(screenshotFile);
        }

        const reportData = {
            type: formData.get('problemType'),
            description: formData.get('problemDescription'),
            name: this.gameState.name || 'لم يبدأ اللعب',
            player_id: this.gameState.playerId || 'N/A',
            question_text: this.dom.questionText.textContent || 'لا يوجد',
            screenshot_url: screenshotUrl,
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            timestamp: new Date().toISOString()
        };

        this.showToast("جاري إرسال البلاغ...", "info");
        this.hideModal('advancedReportModal');

        try {
            const { error } = await this.supabase.from('reports').insert(reportData);
            if (error) throw error;
            this.showToast("تم إرسال بلاغك بنجاح. شكراً لك!", "success");
            this.sendTelegramNotification('report', reportData);
            
            // Reset form
            event.target.reset();
            this.getEl('#screenshotPreview').style.display = 'none';
        } catch (error) {
            console.error("Supabase report error:", error);
            this.showToast("حدث خطأ أثناء إرسال البلاغ.", "error");
        }
    }

    async uploadScreenshot(file) {
        // In a real implementation, you would upload to Supabase Storage
        // For now, we'll use a data URL
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    handleScreenshotUpload(event) {
        const file = event.target.files[0];
        const preview = this.getEl('#screenshotPreview');
        
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
    }

    autoDetectProblem() {
        let detectedIssues = [];
        
        // Check internet connection
        if (!navigator.onLine) {
            detectedIssues.push("فقدان الاتصال بالإنترنت");
        }
        
        // Check localStorage
        if (!localStorage.getItem('quizGameDeviceId')) {
            detectedIssues.push("مشكلة في التخزين المحلي");
        }
        
        // Check questions loading
        if (Object.keys(this.questions).length === 0) {
            detectedIssues.push("لم يتم تحميل الأسئلة بشكل صحيح");
        }
        
        // Check game state
        if (this.gameState && this.gameState.currentScore < 0) {
            detectedIssues.push("مشكلة في حساب النقاط");
        }

        // Check performance
        if (typeof performance !== 'undefined' && performance.memory) {
            const usedMemory = performance.memory.usedJSHeapSize;
            const totalMemory = performance.memory.totalJSHeapSize;
            const memoryUsage = (usedMemory / totalMemory) * 100;
            
            if (memoryUsage > 80) {
                detectedIssues.push("استهلاك عالي للذاكرة");
            }
        }

        // Gather system info
        const userAgent = navigator.userAgent;
        const screenResolution = `${screen.width}x${screen.height}`;
        const currentLevel = this.gameState ? this.config.LEVELS[this.gameState.level].label : 'لم يبدأ';
        
        let autoDescription = `الكشف التلقائي عن المشاكل:\n\n`;
        
        if (detectedIssues.length > 0) {
            autoDescription += `المشاكل المكتشفة:\n• ${detectedIssues.join('\n• ')}\n\n`;
        } else {
            autoDescription += `لم يتم الكشف عن مشاكل واضحة.\n\n`;
        }
        
        autoDescription += `معلومات النظام:\n• المتصفح: ${userAgent}\n• دقة الشاشة: ${screenResolution}\n• المستوى الحالي: ${currentLevel}\n• الوقت: ${new Date().toLocaleString('ar-SA')}`;
        
        this.getEl('#problemDescription').value = autoDescription;
        this.showToast("تم الكشف التلقائي عن المشكلة", "info");
    }
    
    async sendTelegramNotification(type, data) {
        if (!this.config.APPS_SCRIPT_URL) {
            console.warn("Apps Script URL is not configured. Skipping notification.");
            return;
        }
        try {
            await fetch(this.config.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ type, data })
            });
        } catch (error) {
            console.error('Error sending notification request to Apps Script:', error.message);
        }
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

    filterLeaderboard(filterType) {
        // Update active filter button
        this.getAllEl('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.getEl(`[data-filter="${filterType}"]`).classList.add('active');

        // Re-render leaderboard with filter
        this.displayLeaderboard(); // This will need to be enhanced to actually filter
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

        this.getEl('#detailsScore').textContent = this.formatNumber(player.score || 0);
        this.getEl('#detailsAccuracy').textContent = `${player.accuracy || 0}%`;
        this.getEl('#detailsTime').textContent = this.formatTime(player.total_time || 0);
        this.getEl('#detailsLevel').textContent = player.level || 'N/A';
        this.getEl('#detailsCorrect').textContent = this.formatNumber(player.correct_answers || 0);
        this.getEl('#detailsWrong').textContent = this.formatNumber(player.wrong_answers || 0);
        this.getEl('#detailsSkips').textContent = this.formatNumber(player.skips || 0);
        this.getEl('#detailsAttempt').textContent = this.formatNumber(player.attempt_number || 0);
        this.getEl('#detailsPerformance').textContent = player.performance_rating || 'جيد';

        this.showModal('playerDetailsModal');
    }

    // =============================================
    // Sharing
    // =============================================

    updateShareText() {
        const finalScore = this.getEl('#finalScore').textContent;
        const finalLevel = this.getEl('#finalLevel').textContent;
        const performance = this.getEl('#performanceText').textContent;
        const accuracy = this.getEl('#finalAccuracy').textContent;

        const shareText = `🏆 نتائج مسابقة المعلومات 🏆

اللاعب: ${this.gameState.name}
النقاط: ${finalScore}
المستوى: ${finalLevel}
الدقة: ${accuracy}
التقييم: ${performance}

جرب التحدي الآن!
${window.location.href}`;

        this.dom.shareText.value = shareText;
    }

    shareOnX() {
        const text = this.dom.shareText.value;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    async copyShareText() {
        try {
            await navigator.clipboard.writeText(this.dom.shareText.value);
            this.showToast("تم نسخ النص بنجاح!", "success");
        } catch (err) {
            // Fallback for older browsers
            this.dom.shareText.select();
            document.execCommand('copy');
            this.showToast("تم نسخ النص بنجاح!", "success");
        }
    }

    switchSharePlatform(button) {
        const platform = button.dataset.platform;
        
        // Update active button
        this.getAllEl('.share-option-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show corresponding content
        this.getAllEl('.platform-content').forEach(content => content.classList.remove('active'));
        this.getEl(`#${platform}ShareContent`).classList.add('active');
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

        const avatarUrls = [
            "https://em-content.zobj.net/thumbs/120/apple/354/woman_1f469.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/man_1f468.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/person-beard_1f9d4.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/old-man_1f474.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/student_1f9d1-200d-1f393.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/teacher_1f9d1-200d-1f3eb.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/scientist_1f9d1-200d-1f52c.png",
            "https://em-content.zobj.net/thumbs/120/apple/354/artist_1f9d1-200d-1f3a8.png"
        ];
        
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
        this.gameState.avatar = element.src || element.dataset.customAvatar;
        this.dom.confirmAvatarBtn.disabled = false;
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                this.dom.imageToCrop.src = e.target.result;
                this.showModal('avatarEditorModal');
                setTimeout(() => {
                    if (this.cropper) this.cropper.destroy();
                    this.cropper = new Cropper(this.dom.imageToCrop, { 
                        aspectRatio: 1, 
                        viewMode: 1, 
                        autoCropArea: 1,
                        responsive: true,
                        restore: false,
                        guides: false,
                        center: false,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false
                    });
                }, 300);
            };
            reader.readAsDataURL(file);
        }
    }
    
    saveCroppedAvatar() {
        if (!this.cropper) return;
        const croppedCanvas = this.cropper.getCroppedCanvas({ 
            width: 256, 
            height: 256,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        const croppedUrl = croppedCanvas.toDataURL('image/png');
        
        // Create or update custom avatar
        let customAvatar = this.getEl('#custom-avatar');
        if (!customAvatar) {
            customAvatar = document.createElement('img');
            customAvatar.id = 'custom-avatar';
            customAvatar.className = 'avatar-option';
            customAvatar.dataset.customAvatar = croppedUrl;
            this.getEl('.avatar-upload-btn').after(customAvatar);
        }
        
        customAvatar.src = croppedUrl;
        customAvatar.dataset.customAvatar = croppedUrl;
        this.selectAvatar(customAvatar);
        this.hideModal('avatarEditorModal');
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

    isDeveloper() { 
        return this.isDevSession && !this.isDevTemporarilyDisabled; 
    }
    
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
    
    formatNumber(num) { 
        return new Intl.NumberFormat('ar-EG').format(num); 
    }

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

    showModal(modalName) { 
        this.dom.modals[modalName].classList.add('active'); 
    }
    
    hideModal(modalName) { 
        if(this.dom.modals[modalName]) this.dom.modals[modalName].classList.remove('active'); 
    }

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

    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.dataset.theme = savedTheme;
        this.getEl('.theme-toggle-btn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
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
        const isValid = name.length >= 2 && name.length <= 25;
        this.dom.nameError.textContent = isValid ? "" : "الاسم يجب أن يتكون من ٢ إلى ٢٥ حرفًا.";
        this.dom.nameError.classList.toggle('show', !isValid);
        this.dom.confirmNameBtn.disabled = !isValid;
    }

    setupGameUI() {
        this.getEl('#playerAvatar').src = this.gameState.avatar;
        this.getEl('#playerName').textContent = this.gameState.name;
        this.getEl('#playerId').textContent = this.gameState.playerId;
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});
