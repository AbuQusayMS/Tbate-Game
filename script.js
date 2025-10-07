const ICON_SUN  = '\u2600\uFE0F';  // ☀️
const ICON_MOON = '\uD83C\uDF19';  // 🌙

class QuizGame {
  constructor() {
    // =================================================================
    // !!!  Game Configuration & Secrets !!!
    // =================================================================
    this.config = {
      // هام: استبدل بالبيانات الخاصة بك.
      SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
      SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
      APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx0cVV4vnwhYtB1__nYjKRvIpBC9lILEgyfgYomlb7pJh266i7QAItNo5BVPUvFCyLq4A/exec',
      QUESTIONS_URL: 'https://abuqusayms.github.io/Shadow-Game/questions.json',

      // Developer Settings
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
        skipQuestionBase: 0,
        skipQuestionIncrement: 0
      },
      SKIP_WEIGHT: 0.7, // === NEW: وزن التخطي ضمن الدقة (يمكن تعديله)
    };

    // Internal State
    this.supabase = null;
    this.questions = {};        // قد تكون {easy:[],...} أو مصفوفة واحدة
    this.gameState = {};
    this.timer = { interval: null, isFrozen: false, total: 0 };
    this.dom = {};
    this.cropper = null;
    this.leaderboardSubscription = null;
    this.isDevSession = false;
    this.isDevTemporarilyDisabled = false;
    this.recentErrors = [];
    window.addEventListener('error', (ev) => {
      this.recentErrors.push({
        type: 'error',
        message: String(ev.message || ''),
        source: ev.filename || '',
        line: ev.lineno || 0,
        col: ev.colno || 0,
        time: new Date().toISOString()
      });
      this.recentErrors = this.recentErrors.slice(-10); // آخر 10 فقط
    });
    window.addEventListener('unhandledrejection', (ev) => {
      this.recentErrors.push({
        type: 'unhandledrejection',
        reason: String(ev.reason || ''),
        time: new Date().toISOString()
      });
      this.recentErrors = this.recentErrors.slice(-10);
    });

    this.init();
  }

  // ===================================================
  // Init
  // ===================================================
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
      this.getEl('#loaderText').textContent = "خطأ في الاتصال بالخادم.";
      return;
    }

    const questionsLoaded = await this.loadQuestions();

    if (questionsLoaded) {
      this.showScreen('start');
    } else {
      this.getEl('#loaderText').textContent = "حدث خطأ في تحميل الأسئلة. الرجاء تحديث الصفحة.";
    }
    this.dom.screens.loader.classList.remove('active');
  }

  // ===================================================
  // DOM Helpers
  // ===================================================
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
      reportFab: byId('reportErrorFab'),
      problemScreenshot: byId('problemScreenshot'),
      reportImagePreview: byId('reportImagePreview'),
      includeAutoDiagnostics: byId('includeAutoDiagnostics')
    };
    this.dom.lbMode    = byId('lbMode');      // === NEW
    this.dom.lbAttempt = byId('lbAttempt');    // === NEW
  }
  getEl(selector, parent = document) { return parent.querySelector(selector); }
  getAllEl(selector, parent = document) { return parent.querySelectorAll(selector); }

  // ===================================================
  // Events
  // ===================================================
  bindEventListeners() {
    // Delegation
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
        closeModal: () => {
          const id = target.dataset.modalId || target.dataset.modalKey;
          if (id === 'avatarEditor' || id === 'avatarEditorModal') this.cleanupAvatarEditor();
          this.hideModal(id);
        },
        endGame: () => this.endGame(),
        nextLevel: () => this.nextLevel(),
        playAgain: () => window.location.reload(),
        shareOnX: () => this.shareOnX(),
        shareOnInstagram: () => this.shareOnInstagram(),
        saveCroppedAvatar: () => this.saveCroppedAvatar(),
        checkDevPassword: () => this.checkDevPassword(),
        startDevLevel: () => this.startGameFlow(parseInt(target.dataset.levelIndex, 10)),
      };
      if (actionHandlers[action]) actionHandlers[action]();
    });

    // Inputs & forms
    this.dom.nameInput.addEventListener('input', () => this.validateNameInput());
    this.dom.nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleNameConfirmation(); });
    this.dom.devPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkDevPassword(); });
    this.dom.reportProblemForm.addEventListener('submit', (e) => this.handleReportSubmit(e));

    // خيارات السؤال
    this.dom.optionsGrid.addEventListener('click', e => {
      const btn = e.target.closest('.option-btn');
      if (btn) this.checkAnswer(btn);
     });

    // أزرار المساعدات
    this.getEl('.helpers').addEventListener('click', e => {
      const btn = e.target.closest('.helper-btn');
      if (btn) this.useHelper(btn);
    });

    // اختيار الصورة الرمزية
    this.getEl('.avatar-grid').addEventListener('click', (e) => {
      if (e.target.matches('.avatar-option')) this.selectAvatar(e.target);
    });

    // فتح نافذة البلاغ من الأيقونة
    this.dom.reportFab.addEventListener('click', () => this.showModal('advancedReport'));

   // إغلاق المودال بالنقر خارج المحتوى
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
          modal.classList.remove('active');
        }
      });
    });

    // معاينة صورة البلاغ
    this.dom.problemScreenshot.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      const prev = this.dom.reportImagePreview;
      if (!file) { prev.style.display = 'none'; prev.querySelector('img').src = ''; return; }
      const url = URL.createObjectURL(file);
      prev.style.display = 'block';
      prev.querySelector('img').src = url;
    });

    // إغلاق بأزرار Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal.active');
        if (open) open.classList.remove('active');
      }
    }); // ←← كان هذا السطر مفقودًا

    // زر المطوّر العائم (خارج keydown)
    this.dom.devFloatingBtn.addEventListener('click', () => {
      if (!this.isDevSession) { this.showModal('devPassword'); return; }
      this.isDevTemporarilyDisabled = !this.isDevTemporarilyDisabled;
      this.updateDevFab();
      this.showToast(
        this.isDevTemporarilyDisabled ? "تم تعطيل صلاحيات المطور مؤقتًا" : "تم تفعيل صلاحيات المطور",
        "info"
      );
    });

    // === NEW: مستمعو فلاتر لوحة الصدارة
    this.dom.lbMode?.addEventListener('change', ()=>{
      const m = this.dom.lbMode.value;
      if (this.dom.lbAttempt) this.dom.lbAttempt.disabled = (m !== 'attempt');
      this.displayLeaderboard();
    });
    this.dom.lbAttempt?.addEventListener('change', ()=> this.displayLeaderboard());
  }

  // ===================================================
  // Game Flow
  // ===================================================
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
      name: (this.dom.nameInput.value || '').trim(),
      avatar: this.gameState.avatar, // احتفاظ باختيار الصورة
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

  startGameFlow(levelIndex = 0) {
    this.gameState.level = levelIndex;
    this.updateScore(this.config.STARTING_SCORE, true);
    this.setupGameUI();
    this.showScreen('game');
    this.startLevel();
  }

  startLevel() {
    const currentLevel = this.config.LEVELS[this.gameState.level];
    this.gameState.helpersUsed = { fiftyFifty: false, freezeTime: false };
    document.body.dataset.level = currentLevel.name;
    this.getEl('#currentLevelBadge').textContent = currentLevel.label;

    const levelQuestions = this.getLevelQuestions(currentLevel.name);
    if (this.config.RANDOMIZE_QUESTIONS) this.shuffleArray(levelQuestions);
    this.gameState.shuffledQuestions = levelQuestions;

    this.updateLevelProgressUI();
    this.gameState.questionIndex = 0;
    this.fetchQuestion();
  }

  fetchQuestion() {
    const questions = this.gameState.shuffledQuestions || [];
    if (this.gameState.questionIndex >= questions.length) {
      this.levelComplete();
      return;
    }
    const questionData = questions[this.gameState.questionIndex];
    this.displayQuestion(questionData);
  }

  levelComplete() {
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
      this.showScreen('game');
      this.startLevel();
    }
  }

  async endGame(completedAllLevels = false) {
    clearInterval(this.timer.interval);
    this.hideModal('confirmExit');

    const baseStats = this._calculateFinalStats(completedAllLevels);

  // ⚡ احسب التقييم المتقدم المعتمد على السجل
  try {
    const perf = await this.ratePerformance(baseStats);
    baseStats.performance_rating = perf.label;
    baseStats.performance_score  = perf.score;   // يتطلب عمودًا اختياريًا في DB
  } catch (_) {
    // في حال فشل القراءة من Supabase: أرجع لتقييم مبسّط
    const acc = Number(baseStats.accuracy || 0);
    baseStats.performance_rating = (acc >= 90) ? "ممتاز 🏆" :
                                    (acc >= 75) ? "جيد جدًا ⭐" :
                                    (acc >= 60) ? "جيد 👍" :
                                    (acc >= 40) ? "مقبول 👌" : "يحتاج إلى تحسين 📈";
  }

  if (!this.isDevSession) {
    const { attemptNumber, error } = await this.saveResultsToSupabase(baseStats);
    if (error) this.showToast("فشل إرسال النتائج إلى السيرفر", "error");
    baseStats.attempt_number = attemptNumber ?? 'N/A';
  } else {
    baseStats.attempt_number = 'DEV';
  }

  this._displayFinalStats(baseStats);
  this.showScreen('end');
  }

  _calculateFinalStats(completedAll) {    // === CHANGED
    const totalTimeSeconds = (new Date() - this.gameState.startTime) / 1000;
    const currentLevelLabel = this.config.LEVELS[Math.min(this.gameState.level, this.config.LEVELS.length - 1)].label;

    const corr  = this.gameState.correctAnswers;
    const wrong = this.gameState.wrongAnswers;
    const skips = this.gameState.skips;

    // NEW: التخطي له وزن في المقام
    const denom = corr + wrong + (this.config.SKIP_WEIGHT * skips);
    const accuracy = denom > 0 ? parseFloat(((corr / denom) * 100).toFixed(1)) : 0.0;

    const answeredCount = (corr + wrong) || 1; // المتوسط لأسئلة أُجيب عنها فقط
    const avgTime = parseFloat((totalTimeSeconds / answeredCount).toFixed(1));

    return {
      name: this.gameState.name,
      player_id: this.gameState.playerId,
      device_id: this.gameState.deviceId,
      avatar: this.gameState.avatar,
      correct_answers: corr,
      wrong_answers: wrong,
      skips: skips,
      score: this.gameState.currentScore,
      total_time: totalTimeSeconds,
      level: currentLevelLabel,
      accuracy, avg_time: avgTime,
      performance_rating: this.getPerformanceRating(accuracy),
      completed_all: completedAll,
      used_fifty_fifty: this.gameState.helpersUsed.fiftyFifty,
      used_freeze_time: this.gameState.helpersUsed.freezeTime
    };
  }

  // ===================================================
  // Display / Questions
  // ===================================================
  displayQuestion(questionData) {
    this.answerSubmitted = false;

    // 🔧 دعم صيغ متعددة للسؤال
    const { text, options, correctText } = this.resolveQuestionFields(questionData);

    const totalQuestions = (this.gameState.shuffledQuestions || []).length;
    this.getEl('#questionCounter').textContent = `السؤال ${this.gameState.questionIndex + 1} من ${totalQuestions}`;
    this.dom.questionText.textContent = text;
    this.dom.optionsGrid.innerHTML = '';

    let displayOptions = [...options];
    if (this.config.RANDOMIZE_ANSWERS) this.shuffleArray(displayOptions);

    const frag = document.createDocumentFragment();
    displayOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.dataset.correct = (this.normalize(opt) === this.normalize(correctText));
      frag.appendChild(btn);
    });
    this.dom.optionsGrid.appendChild(frag);

    this.updateGameStatsUI();
    this.startTimer();
  }

  checkAnswer(selectedButton = null) {
    if (this.answerSubmitted) return;
    this.answerSubmitted = true;
    clearInterval(this.timer.interval);

    // تعطيل جميع الأزرار
    this.getAllEl('.option-btn').forEach(b => b.classList.add('disabled'));

    // تحديد صحة الإجابة بأمان
    let isCorrect = false;
    if (selectedButton && selectedButton.dataset) {
      isCorrect = selectedButton.dataset.correct === 'true';
    }

    if (isCorrect) {
      selectedButton.classList.add('correct');
      this.updateScore(this.gameState.currentScore + 100);
      this.gameState.correctAnswers++;
      this.showToast("إجابة صحيحة! +100 نقطة", "success");
    } else {
      if (selectedButton && selectedButton.classList) selectedButton.classList.add('wrong');
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

  updateGameStatsUI() {
    this.getEl('#wrongAnswersCount').textContent =
      `${this.gameState.wrongAnswers} / ${this.config.MAX_WRONG_ANSWERS}`;
    this.getEl('#skipCount').textContent = this.gameState.skips;

    // التخطي مجاني دائمًا (العرض فقط)
    this.getEl('#skipCost').textContent = '(مجانية)';

    const isImpossible = this.config.LEVELS[this.gameState.level]?.name === 'impossible';

    this.getAllEl('.helper-btn').forEach(btn => {
      const type = btn.dataset.type;

      if (this.isDeveloper()) {        // المطوّر: دائمًا مفعّل
        btn.disabled = false;
        return;
      }

      // في "مستحيل" تُمنع كل المساعدات بما فيها التخطي
      if (isImpossible) {
        btn.disabled = true;
        return;
      }

      // خارج "مستحيل": يمكن استخدام 50/50 و التجميد مرة واحدة لكل مستوى
      if (type === 'skipQuestion') {
        btn.disabled = false; // التخطي مسموح خارج "مستحيل"
      } else {
        btn.disabled = this.gameState.helpersUsed[type] === true;
      }
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
    this.getEl('#finalAvgTime').textContent = `${this.formatTime(stats.avg_time)}`;
    this.getEl('#performanceText').textContent = stats.performance_rating;
  }

  // ===================================================
  // Data & API
  // ===================================================
  async loadQuestions() {
    try {
      const response = await fetch(this.config.QUESTIONS_URL, { cache: 'no-cache' });
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

      const { error: logError } = await this.supabase.from('log')
         .insert({ ...resultsData, attempt_number: attemptNumber, performance_score: resultsData.performance_score ?? null });

      const leaderboardData = {
        device_id: resultsData.device_id,
        player_id: resultsData.player_id,
        name: resultsData.name, avatar: resultsData.avatar, score: resultsData.score,
        level: resultsData.level, accuracy: resultsData.accuracy, total_time: resultsData.total_time,
        avg_time: resultsData.avg_time, correct_answers: resultsData.correct_answers,
        wrong_answers: resultsData.wrong_answers, skips: resultsData.skips,
        attempt_number: attemptNumber, performance_rating: resultsData.performance_rating,
        performance_score: resultsData.performance_score ?? null,
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
    // MODIFIED: Get single value from the new dropdown
    const problemLocation = formData.get('problemLocation');

    const reportData = {
      type: formData.get('problemType'),
      description: formData.get('problemDescription'),
      name: this.gameState.name || 'لم يبدأ اللعب',
      player_id: this.gameState.playerId || 'N/A',
      question_text: this.dom.questionText.textContent || 'لا يوجد'
    };

    // تشخيص تلقائي (اختياري)
    let meta = null;
    if (this.dom.includeAutoDiagnostics?.checked) {
      meta = this.getAutoDiagnostics();
      // MODIFIED: Use the new single value
      meta.locationHint = problemLocation;
    }

    // NEW: بناء سياق دقيق للسؤال الحالي
    const ctx = this.buildQuestionRef();

    this.showToast("جاري إرسال البلاغ...", "info");
    this.hideModal('advancedReport');

    try {
      // 1) رفع صورة (إن وُجدت)
      let image_url = null;
      const file = this.dom.problemScreenshot.files?.[0];
      if (file) {
        const fileName = `report_${Date.now()}_${Math.random().toString(36).slice(2)}.${(file.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi,'')}`;
        const { data: up, error: upErr } = await this.supabase.storage
          .from('reports')
          .upload(fileName, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = this.supabase.storage.from('reports').getPublicUrl(up.path);
        image_url = pub?.publicUrl || null;
      }

      // 2) إدراج في Supabase: نخزّن السياق داخل meta (حتى لا نضيف عمود جديد)
      const payloadDB = {
        ...reportData,
        image_url,
        meta: { ...(meta || {}), context: ctx }
      };
      const { error } = await this.supabase.from('reports').insert(payloadDB);
      if (error) throw error;

      this.showToast("تم إرسال بلاغك بنجاح. شكراً لك!", "success");

      // 3) إخطار تيليغرام: نرسل السياق كحقل مستقل أيضًا
      const payloadMsg = { ...reportData, image_url, meta, context: ctx };
      this.sendTelegramNotification('report', payloadMsg);

    } catch (err) {
      console.error("Supabase report error:", err);
      this.showToast("حدث خطأ أثناء إرسال البلاغ.", "error");
    } finally {
      if (this.dom.problemScreenshot) this.dom.problemScreenshot.value = '';
      if (this.dom.reportImagePreview) {
        this.dom.reportImagePreview.style.display='none';
        this.dom.reportImagePreview.querySelector('img').src='';
      }
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
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type, data })
      });
    } catch (error) {
      console.error('Error sending notification request to Apps Script:', error.message);
    }
  }

  // ===================================================
  // Helpers Use
  // ===================================================
  useHelper(btn) {
    const type = btn.dataset.type;
    const isDev = this.isDeveloper();
    const isSkip = type === 'skipQuestion';
    const isImpossible = this.config.LEVELS[this.gameState.level]?.name === 'impossible';

    // في مستوى "مستحيل": لا مساعدات إطلاقًا
    if (!isDev && isImpossible) {
      this.showToast("المساعدات غير متاحة في المستوى المستحيل.", "error");
      return;
    }

    // التخطي مجاني دائمًا (خارج مستحيل)
    const cost = isSkip ? 0 : this.config.HELPER_COSTS[type];

     // 50/50 و التجميد مرة واحدة فقط لكل مستوى
    if (!isSkip && !isDev && this.gameState.helpersUsed[type]) {
      this.showToast("هذه المساعدة استُخدمت بالفعل في هذا المستوى.", "error");
      return;
    }

    // خصم النقاط للمساعدات المدفوعة (لو فيه تكلفة)
    if (!isDev && cost > 0) {
      if (this.gameState.currentScore < cost) {
        this.showToast("نقاطك غير كافية!", "error");
        return;
      }
      this.updateScore(this.gameState.currentScore - cost);
      this.showToast(`تم استخدام المساعدة! -${cost} نقطة`, "info");
    } else if (isSkip) {
      this.showToast("تم تخطي السؤال.", "info");
    } else if (isDev) {
      this.showToast(`مساعدة المطور (${type})`, "info");
    }

    if (isSkip) {
      clearInterval(this.timer.interval);
      this.gameState.skips++;
      this.gameState.questionIndex++;
      this.updateGameStatsUI();
      this.fetchQuestion();
      return;
    }

    // علِّم أنها استُخدمت (مرة واحدة لكل مستوى)
    if (!isDev) this.gameState.helpersUsed[type] = true;
    this.updateGameStatsUI();

    if (type === 'fiftyFifty') {
      const wrongOptions = this.getAllEl('.option-btn:not([data-correct="true"])');
      this.shuffleArray(Array.from(wrongOptions)).slice(0, 2).forEach(b => b.classList.add('hidden'));
    } else if (type === 'freezeTime') {
      this.timer.isFrozen = true;
      this.getEl('.timer-bar').classList.add('frozen');
      setTimeout(() => {
        this.timer.isFrozen = false;
        this.getEl('.timer-bar').classList.remove('frozen');
      }, 10000);
    }
  }
 
  // ===================================================
  // Timer (JS-driven so freeze works visually)
  // ===================================================
  startTimer() {
    clearInterval(this.timer.interval);
    this.timer.total = this.config.QUESTION_TIME;
    let timeLeft = this.timer.total;

    const bar = this.getEl('.timer-bar');
    const label = this.getEl('.timer-text');

    // إعداد أولي
    label.textContent = timeLeft;
    bar.style.transition = 'width 200ms linear';
    bar.style.width = '100%';

    const update = () => {
      if (this.timer.isFrozen) return;     // أثناء التجميد ما مننقص
      timeLeft = Math.max(0, timeLeft - 1);
      label.textContent = timeLeft;
      const pct = (timeLeft / this.timer.total) * 100;
      bar.style.width = `${pct}%`;

      if (timeLeft <= 0) {
        clearInterval(this.timer.interval);
        this.showToast("انتهى الوقت!", "error");
        // مهلة الوقت: اعتبرها إجابة خاطئة بدون تمرير عنصر
        this.handleTimeout();
      }
    };

    // إعادة ضبط العرض فورًا
    update(); // يضع الوقت الأولي
    // ثم كل ثانية
    this.timer.interval = setInterval(update, 1000);
  }

  handleTimeout() {
    // لو في زر خطأ ظاهر، مرّره للدالة ليصير عليه تأثير بصري؛ وإلا مرّر null
    const anyWrongBtn = this.dom.optionsGrid.querySelector('.option-btn:not([data-correct="true"])');
    this.checkAnswer(anyWrongBtn || null);
  }

  updateScore(newScore, isReset = false) {
    this.gameState.currentScore = (this.isDeveloper() && !isReset) ? this.gameState.currentScore : newScore;
    this.dom.scoreDisplay.textContent = this.formatNumber(this.gameState.currentScore);
    this.updateGameStatsUI();
  }

  // ===================================================
  // Utilities
  // ===================================================
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
    const total = Math.floor(Number(totalSeconds) || 0);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatNumber(num) { return new Intl.NumberFormat('ar-EG').format(Number(num) || 0); }

  getAutoDiagnostics() {
    try {
      const nav = navigator || {};
      const conn = nav.connection || {};
      const perf = performance || {};
      const mem = perf.memory || {};

      const activeScreen = Object.entries(this.dom.screens).find(([,el]) => el.classList.contains('active'))?.[0] || 'unknown';

       return {
         url: location.href,
         userAgent: nav.userAgent || '',
         platform: nav.platform || '',
         language: nav.language || '',
         viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
         connection: {
           type: conn.effectiveType || '',
           downlink: conn.downlink || '',
           rtt: conn.rtt || ''
         },
         performance: {
           memory: { jsHeapSizeLimit: mem.jsHeapSizeLimit || null, totalJSHeapSize: mem.totalJSHeapSize || null, usedJSHeapSize: mem.usedJSHeapSize || null },
         timingNow: perf.now ? Math.round(perf.now()) : null
        },
        appState: {
          screen: activeScreen,
          level: this.config.LEVELS[this.gameState?.level || 0]?.name || null,
          questionIndex: this.gameState?.questionIndex ?? null,
          score: this.gameState?.currentScore ?? null
        },
        recentErrors: this.recentErrors || []
      };
    } catch (e) {
      return { error: String(e) };
    }
  }

  // ======= NEW: مرجع السؤال الحالي للسياق في البلاغ =======
  buildQuestionRef() {
    const levelObj = this.config.LEVELS[this.gameState.level] || {};
    const levelName  = levelObj.name || '';
    const levelLabel = levelObj.label || '';
    const qIndex1 = (this.gameState.questionIndex ?? 0) + 1;
    const total = (this.gameState.shuffledQuestions || []).length;
    const qText = (this.dom.questionText?.textContent || '').trim();
    const options = [...this.getAllEl('.option-btn')].map(b => (b.textContent || '').trim());
    const hash = this.simpleHash(`${levelName}|${qIndex1}|${qText}|${options.join('|')}`);
    return {
      level_name: levelName,
      level_label: levelLabel,
      question_index: qIndex1,
      total_questions: total,
      question_text: qText,
      options,
      ref: `${levelName}:${qIndex1}:${hash.slice(0,6)}`
    };
  }
 
  simpleHash(s) {
    let h = 0; for (let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
    return String(Math.abs(h));
  }

  // ==============================
  // Performance Rating (advanced)
  // ==============================

  /** يحوّل قيمة بين مجالين إلى 0..100 */
  normalizeTo100(value, min, max) {
    const v = Math.max(min, Math.min(max, Number(value) || 0));
    return Math.round(((max - v) / (max - min)) * 100);
  }

  /** انحراف معياري بسيط */
  stdDev(arr) {
    if (!arr || arr.length < 2) return 0;
    const mean = arr.reduce((a,b)=>a+Number(b||0),0)/arr.length;
    const variance = arr.reduce((s,v)=> s + Math.pow(Number(v||0) - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  /** يحوّل الدرجة إلى تصنيف نصي */
  mapPerformanceLabel(score, { completed_all=false, level='' } = {}) {
    if (completed_all && (level === 'مستحيل' || level === 'impossible')) {
      score = Math.max(score, 80);
    }
    if (score >= 97) return 'احترافي 🧠';
    if (score >= 92) return 'مذهل 🌟';
    if (score >= 85) return 'ممتاز 🏆';
    if (score >= 75) return 'جيد جدًا ⭐';
    if (score >= 62) return 'جيد 👍';
    if (score >= 50) return 'مقبول 👌';
    if (score >= 35) return 'يحتاج إلى تحسين 📈';
    return 'ضعيف 🧩';
  }

  /**
   * درجة أداء مركّبة اعتمادًا على المحاولة الحالية + آخر 20 محاولة
   * يرجع { score, label, details }
   */
  async ratePerformance(current) {
    // 1) تاريخ آخر 20
    let history = [];
    try {
      const { data, error } = await this.supabase
        .from('log')
        .select('accuracy,avg_time,score,correct_answers,wrong_answers,skips,completed_all,level,created_at')
        .eq('device_id', current.device_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && Array.isArray(data)) history = data;
    } catch (_) {}

    const histAcc   = history.map(h => Number(h.accuracy || 0)).filter(n => n>=0);
    const histAvg   = history.map(h => Number(h.avg_time || 0)).filter(n => n>=0);
    const histDone  = history.filter(h => h.completed_all === true).length;
    const histCount = history.length;

    // 2) مؤشرات الحالية
    const accuracy      = Number(current.accuracy || 0);
    const avgTime       = Number(current.avg_time || 0);
    const totalSec      = Number(current.total_time || 0);
    const corr          = Number(current.correct_answers || 0);
    const wrong         = Number(current.wrong_answers || 0);
    const skips         = Number(current.skips || 0);
    const lvlName       = (current.level || '').toString();
    const completedAll = !!current.completed_all;

    // 3) نقاط أساسية
    const accScore   = Math.max(0, Math.min(100, accuracy));
    const speedScore = this.normalizeTo100(avgTime, 3, 20); // 3s => 100, 20s => 0

    // 4) مكافآت
    let levelBonus = 0;
    if (lvlName === 'متوسط' || lvlName === 'medium')   levelBonus += 10;
    else if (lvlName === 'صعب' || lvlName === 'hard')    levelBonus += 25;
    else if (lvlName === 'مستحيل' || lvlName === 'impossible') levelBonus += 40;
    if (completedAll) levelBonus += 15;

    // 5) إنتاجية صحيح/دقيقة
    const cpm = totalSec > 0 ? corr / (totalSec / 60) : 0;
    const cpmBonus = Math.min(20, Math.round(cpm * 4));

    // 6) عقوبات خفيفة
    const penalty = (wrong * 4) + (skips * 2);  // === CHANGED: التخطي يؤثر أكثر

    // 7) مكافأة التاريخ
    let historyBonus = 0;
    if (histCount > 0) {
      const avgAccHist  = histAcc.reduce((a,b)=>a+b,0) / (histAcc.length || 1);
      const avgTimeHist = histAvg.reduce((a,b)=>a+b,0) / (histAvg.length || 1);

      const accDelta = accuracy - avgAccHist;
      if (accDelta >= 10) historyBonus += 8;
      else if (accDelta >= 5) historyBonus += 4;
      else if (accDelta <= -10) historyBonus -= 6;

      const sdAcc = this.stdDev(histAcc);
      if (sdAcc <= 8 && avgAccHist >= 70) historyBonus += 5;

      const doneRate = (histDone / histCount) * 100;
      if (doneRate >= 50) historyBonus += 5;
      else if (doneRate >= 25) historyBonus += 2;

      if (avgTimeHist && avgTime < avgTimeHist - 2) historyBonus += 3;
    }

    // 8) الدرجة النهائية (0..100)
    let score =
      (0.45 * accScore) +
      (0.25 * speedScore) +
      levelBonus +
      cpmBonus +
      historyBonus -
      penalty;

    score = Math.max(0, Math.min(100, Math.round(score)));
    const label = this.mapPerformanceLabel(score, { completed_all: completedAll, level: lvlName });
    return { score, label, details: { accScore, speedScore, levelBonus, cpmBonus, historyBonus, penalty } };
  }

  // ===================================================
  // Dev Mode
  // ===================================================
  checkDevPassword() {
    const input = (this.dom.devPasswordInput.value || '').trim();
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
     
      this.isDevTemporarilyDisabled = false;
      this.updateDevFab();
  }

  updateDevFab() {
    const fab = this.dom.devFloatingBtn;
    if (!fab) return;
    fab.style.display = 'flex';
    fab.classList.toggle('active', !this.isDevTemporarilyDisabled);
    fab.classList.toggle('inactive', this.isDevTemporarilyDisabled);
    fab.title = this.isDevTemporarilyDisabled ? 'تشغيل صلاحيات المطور' : 'إيقاف صلاحيات المطور مؤقتًا';
  }

  // ===================================================
  // UI Helpers
  // ===================================================
  showScreen(screenName) {
    Object.values(this.dom.screens).forEach(screen => screen.classList.remove('active'));
    if (this.dom.screens[screenName]) this.dom.screens[screenName].classList.add('active');
  }
  showModal(nameOrId) {
    const el = this.dom.modals[nameOrId] || document.getElementById(nameOrId);
    if (el) el.classList.add('active');
  }

  hideModal(nameOrId) {
    const el = this.dom.modals[nameOrId] || document.getElementById(nameOrId);
    if (el) el.classList.remove('active');
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
      this.getEl('.theme-toggle-btn').textContent = (newTheme === 'dark') ? ICON_SUN : ICON_MOON;
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
    const name = (this.dom.nameInput.value || '').trim();
    const isValid = name.length >= 3;
    this.dom.nameError.textContent = isValid ? "" : "يجب أن يتراوح طول الاسم بين ٣ - ١٥ حرفًا";
    this.dom.nameError.classList.toggle('show', !isValid);
    this.dom.confirmNameBtn.disabled = !isValid;
  }

  // ===================================================
  // Leaderboard
  // ===================================================
  async displayLeaderboard() {  // === CHANGED
    this.showScreen('leaderboard');
    this.dom.leaderboardContent.innerHTML = '<div class="spinner"></div>';

    const mode = this.dom.lbMode?.value || 'best';
    const attemptN = Number(this.dom.lbAttempt?.value || 1);

    try {
      let rows = [];
      if (mode === 'attempt') {
        // من جدول log لمحاولة محددة
        const { data, error } = await this.supabase
          .from('log')
          .select('*')
          .eq('attempt_number', attemptN)
          .order('score', { ascending: false })
          .order('accuracy', { ascending: false })
          .order('total_time', { ascending: true })
          .limit(500);
        if (error) throw error;
        rows = data || [];
      } else {
        // من leaderboard (أفضل/دقة/وقت)
        let q = this.supabase.from('leaderboard').select('*');
        if (mode === 'accuracy') {
          q = q.order('accuracy', { ascending: false })
               .order('score', { ascending: false })
               .order('total_time', { ascending: true });
        } else if (mode === 'time') {
          q = q.order('total_time', { ascending: true })
               .order('accuracy', { ascending: false })
               .order('score', { ascending: false });
        } else { // best
          q = q.order('is_impossible_finisher', { ascending: false })
               .order('score', { ascending: false })
               .order('accuracy', { ascending: false })
               .order('total_time', { ascending: true });
        }
        const { data, error } = await q.limit(500);
        if (error) throw error;
        rows = data || [];

        // منع تكرار الأجهزة في best (احتياطًا لو وُجد تكرار)
        if (mode === 'best') {
          const seen = new Map();
          for (const r of rows) if (!seen.has(r.device_id)) seen.set(r.device_id, r);
          rows = [...seen.values()];
        }
      }

      this.renderLeaderboard(rows.slice(0, 100));
      // الاشتراك على تغيّر leaderboard فقط عند وضع best/accuracy/time
      if (mode !== 'attempt') this.subscribeToLeaderboardChanges();

    } catch (error) {
      console.error("Error loading leaderboard:", error);
      this.dom.leaderboardContent.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
    }
  }

  renderLeaderboard(players) {
    if (!players.length) {
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
        <img src="${player.avatar || ''}" alt="صورة ${player.name || ''}" class="leaderboard-avatar" loading="lazy" style="visibility:${player.avatar ? 'visible' : 'hidden'}">
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

// لون شريط الدائرة بحسب نسبة الدقة (أخضر ↔ أصفر ↔ أحمر)
getAccuracyBarColor(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const hue = Math.round((p / 100) * 120); // 0=أحمر, 120=أخضر
  return `hsl(${hue} 70% 45%)`;
}

showPlayerDetails(player) {
  /* الهيدر القديم يبقى كما هو (صورة + اسم + كود) */
  this.getEl('#detailsName').textContent = player.name || 'غير معروف';
  this.getEl('#detailsPlayerId').textContent = player.player_id || 'N/A';
  const avatarEl = this.getEl('#detailsAvatar');
  avatarEl.src = player.avatar || '';
  avatarEl.style.visibility = player.avatar ? 'visible' : 'hidden';

  /* القيم */
  const score   = Number(player.score || 0);
  const level   = player.level || 'N/A';
  const correct = Number(player.correct_answers || 0);
  const wrong   = Number(player.wrong_answers || 0);
  const timeAll = this.formatTime(player.total_time || 0);    // نص "دقائق:ثواني"
  const avg     = this.formatTime(player.avg_time || 0);      // نص "ثوانٍ/سؤال"
  const accNum  = Math.max(0, Math.min(100, Math.round(Number(player.accuracy || 0))));
  const skips   = Number(player.skips || 0);
  const att     = Number(player.attempt_number || 0);
  const perf    = player.performance_rating || 'جيد';

  /* مُنشئات البطاقات */
  const card = (title, value, extra = '') => `
    <div class="stat-card" style="${extra}">
      <div class="label">${title}</div>
      <div class="value">${value}</div>
    </div>`;

  const twoRows = (k1, v1, k2, v2, extra='') => `
    <div class="stat-card" style="display:grid;gap:.38rem;${extra}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem">
        <span class="label" style="margin:0">${k1}</span>
        <span class="value" style="font-size:1.06rem">${v1}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem">
        <span class="label" style="margin:0">${k2}</span>
        <span class="value" style="font-size:1.06rem">${v2}</span>
      </div>
    </div>`;

  const pos = v => `<span style="color:var(--success-color)">${this.formatNumber(v)}</span>`;
  const neg = v => `<span style="color:var(--error-color)">${this.formatNumber(v)}</span>`;

  /* الشبكة 2×N + بطاقة الدقّة أسفل بعرض كامل — نفس ترتيب صورتك */
  const html = `
    <div class="stats-grid">

      ${card('👑 المستوى', level)}
      ${card('⭐ النقاط', `<span class="value score">${this.formatNumber(score)}</span>`)}

      ${twoRows('✅ الصحيحة', pos(correct), '❌ الخاطئة', neg(wrong))}
      ${twoRows('⏱️ الوقت', timeAll, '⏳ المتوسط', `${avg}`)}

      ${card('🔢 المحاولة', this.formatNumber(att))}
      ${card('⏭️ التخطّي', this.formatNumber(skips))}
      ${card('📊 الأداء', perf)}

      <!-- بطاقة الدقّة -->
      <div class="stat-card accuracy">
        <div class="label" style="margin-bottom:.3rem">🎯 الدقّة</div>
        <div style="display:grid;place-items:center">
          <div class="circle-progress"
               style="--val:${accNum};--bar:${this.getAccuracyBarColor(accNum)};">
            <span>${accNum}%</span>
          </div>
        </div>
      </div>

    </div>`;

  this.getEl('#playerDetailsContent').innerHTML = html;
  this.showModal('playerDetails');
}
 
  // ===================================================
  // Avatars
  // ===================================================
  populateAvatarGrid() {
    const grid = this.getEl('.avatar-grid');
    grid.innerHTML = '';
    const uploadBtnHTML = `
      <div class="avatar-upload-btn" title="رفع صورة">
        <span aria-hidden="true">+</span>
        <label for="avatarUploadInput" class="sr-only">رفع صورة</label>
        <input type="file" id="avatarUploadInput" accept="image/*" style="display:none;">
      </div>`;
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
    this.cleanupAvatarEditor();
  }

  cleanupAvatarEditor() {
    try {
      if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
    } catch (e) {}
    if (this.dom?.imageToCrop) this.dom.imageToCrop.src = '';
    const input = this.getEl('#avatarUploadInput');
    if (input) input.value = ''; // يسمح باختيار نفس الملف مرة أخرى
  }

  // ===================================================
  // Sharing
  // ===================================================
  getShareTextForX() {
    // نعتمد على القيم المعروضة في شاشة النهاية
    const name    = this.getEl('#finalName').textContent || '';
    const attempt = this.getEl('#finalAttemptNumber').textContent || '';
    const correct = this.getEl('#finalCorrect').textContent || '0';
    const skips   = this.getEl('#finalSkips').textContent || '0';
    const level   = this.getEl('#finalLevel').textContent || '';
    const acc     = this.getEl('#finalAccuracy').textContent || '0%';
    const avg     = this.getEl('#finalAvgTime').textContent || '0:00 / سؤال';
    const perf    = this.getEl('#performanceText').textContent || '';

    return [
      '🏆 النتائج النهائية 🏆',
      '',
      `الاسم: ${name}`,
      `رقم المحاولة: ${attempt}`,
      `الإجابات الصحيحة: ${correct}`,
      `مرات التخطي: ${skips}`,
      `المستوى الذي وصلت إليه: ${level}`,
      `نسبة الدقة: ${acc}`,
      `متوسط وقت الإجابة: ${avg}`,
      `أداؤك: ${perf}`,
      '🎉 تهانينا! لقد أكملت المسابقة بنجاح! 🎉',
      '',
      '🔗 جرب تحديك أنت أيضًا!',
      window.location.href
    ].join('\n');
  }

  shareOnX() {
    const text = this.getShareTextForX();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  shareOnInstagram() {
    const textToCopy = this.getShareTextForX();
    navigator.clipboard.writeText(textToCopy)
      .then(() => this.showToast("تم نسخ النتيجة لمشاركتها!", "success"))
      .catch(() => this.showToast("فشل نسخ النتيجة.", "error"));
  }

  setupGameUI() {
    this.getEl('#playerAvatar').src = this.gameState.avatar || '';
    this.getEl('#playerName').textContent = this.gameState.name || '';
    this.getEl('#playerId').textContent = this.gameState.playerId || '';
  }

  // ===================================================
  // Question helpers
  // ===================================================
  normalize(s) { return String(s || '').trim().toLowerCase(); }

  resolveQuestionFields(q) {
    // يدعم صيغ مثل:
    // { q: "نص", options: [...], correct: 2 }
    // { question: "نص", options: [...], answer: "النص الصحيح" }
    // { text: "نص", choices: [...], correctIndex: 1 }
    const text = q.q || q.question || q.text || '';
    const options = Array.isArray(q.options) ? q.options
                    : Array.isArray(q.choices) ? q.choices
                    : [];
    let correctText = '';

    if (typeof q.correct === 'number' && options[q.correct] !== undefined) {
      correctText = options[q.correct];
    } else if (typeof q.answer === 'string') {
      correctText = q.answer;
    } else if (typeof q.correctAnswer === 'string') {
      correctText = q.correctAnswer;
    } else if (typeof q.correct_option === 'string') {
      correctText = q.correct_option;
    } else if (typeof q.correctIndex === 'number' && options[q.correctIndex] !== undefined) {
      correctText = options[q.correctIndex];
    }

    return { text, options, correctText };
  }

  getLevelQuestions(levelName) {
    // يحاول إيجاد الأسئلة بطُرق متعددة حسب شكل الملف
    if (Array.isArray(this.questions)) {
      // مصفوفة واحدة، يمكن أن يكون فيها حقل level
      const arr = this.questions.filter(q =>
        (this.normalize(q.level) === this.normalize(levelName)) ||
        (this.normalize(q.difficulty) === this.normalize(levelName))
      );
      return arr.length ? arr : [...this.questions]; // fallback: الكل
    }

    // كائن بمفاتيح
    const direct =
      this.questions[levelName] ||
      this.questions[levelName + 'Questions'] ||
      this.questions[levelName + '_questions'] ||
      this.questions[levelName + '_list'];

    if (Array.isArray(direct)) return [...direct];

    // fallback: لو في مفتاح عام مثل questions
    if (Array.isArray(this.questions.questions)) return [...this.questions.questions];

    // آخر حل: اجمع كل المصفوفات الموجودة
    const merged = Object.values(this.questions).filter(Array.isArray).flat();
    return merged.length ? merged : [];
  }
}

// =======================================================
// Boot
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.dataset.theme = savedTheme;
    const toggleBtn = document.querySelector('.theme-toggle-btn');
    if (toggleBtn) {
        toggleBtn.textContent = (savedTheme === 'dark') ? ICON_SUN : ICON_MOON;
    }

    new QuizGame();
});
