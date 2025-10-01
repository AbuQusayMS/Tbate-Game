// إعدادات التطبيق
const CONFIG = {
  SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
  TEST_KEY: 'AbuQusay',
  BOTS: {
    RESULTS: '7254715127:AAGxGFOVzpK1WTgmq1fuKJJDUM3lWU7cDIc',
    LOGS: '7164313376:AAF8S_ZtCxqc8wopOR0uEy4wP-5N1sjoBDE',
    REPORTS: '7262743048:AAEa_AlA3pFF2NSQnI8JamoQ7Xr8gWcZWT0'
  },
  CHAT_ID: '6082610560'
};

// حالة التطبيق
let state = {
  player: {
    name: '',
    avatar: '',
    playerId: '',
    deviceId: ''
  },
  game: {
    currentLevel: 0,
    currentScore: 100,
    wrongAnswers: 0,
    correctAnswers: 0,
    skips: 0,
    helpersUsed: {
      fifty: false,
      freeze: false,
      skipCount: 0
    },
    questionIndex: 0,
    startTime: null,
    totalTime: 0,
    answerTimes: []
  },
  ui: {
    currentScreen: 'loader',
    activeModal: null,
    theme: 'dark'
  }
};

// بيانات الأسئلة
let questionsData = null;

// عناصر DOM
const elements = {};

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// تهيئة التطبيق
function initializeApp() {
  cacheDOMElements();
  loadQuestions();
  setupEventListeners();
  initializePlayer();
  checkSavedTheme();
  
  // الانتقال إلى شاشة البداية بعد تحميل الأسئلة
  setTimeout(() => {
    showScreen('start-screen');
  }, 1500);
}

// تخزين عناصر DOM في كائن للوصول السريع
function cacheDOMElements() {
  // الشاشات
  elements.screens = {
    loader: document.getElementById('loader'),
    start: document.getElementById('start-screen'),
    avatar: document.getElementById('avatar-screen'),
    name: document.getElementById('name-screen'),
    instructions: document.getElementById('instructions-screen'),
    game: document.getElementById('game-screen'),
    levelEnd: document.getElementById('level-end-screen'),
    results: document.getElementById('results-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
  };
  
  // الأزرار الرئيسية
  elements.buttons = {
    start: document.getElementById('start-btn'),
    leaderboard: document.getElementById('leaderboard-btn'),
    devMode: document.getElementById('dev-mode-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    avatarConfirm: document.getElementById('avatar-confirm'),
    avatarBack: document.getElementById('avatar-back'),
    nameConfirm: document.getElementById('name-confirm'),
    nameBack: document.getElementById('name-back'),
    instructionsStart: document.getElementById('instructions-start'),
    instructionsBack: document.getElementById('instructions-back'),
    nextLevel: document.getElementById('next-level'),
    endGame: document.getElementById('end-game'),
    playAgain: document.getElementById('play-again'),
    viewLeaderboard: document.getElementById('view-leaderboard'),
    leaderboardBack: document.getElementById('leaderboard-back'),
    reportFloat: document.getElementById('report-float-btn')
  };
  
  // المدخلات
  elements.inputs = {
    playerName: document.getElementById('player-name'),
    nameError: document.getElementById('name-error'),
    devPassword: document.getElementById('dev-password'),
    reportType: document.getElementById('report-type'),
    reportDescription: document.getElementById('report-description'),
    reportScreenshot: document.getElementById('report-screenshot')
  };
  
  // عناصر اللعبة
  elements.game = {
    currentAvatar: document.getElementById('current-avatar'),
    currentName: document.getElementById('current-name'),
    currentScore: document.getElementById('current-score'),
    wrongCount: document.getElementById('wrong-count'),
    timer: document.getElementById('timer'),
    currentLevel: document.getElementById('current-level'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    fiftyFifty: document.getElementById('fifty-fifty'),
    freezeTime: document.getElementById('freeze-time'),
    skipQuestion: document.getElementById('skip-question'),
    skipCost: document.getElementById('skip-cost')
  };
  
  // عناصر النتائج
  elements.results = {
    name: document.getElementById('result-name'),
    id: document.getElementById('result-id'),
    attempt: document.getElementById('result-attempt'),
    correct: document.getElementById('result-correct'),
    wrong: document.getElementById('result-wrong'),
    skips: document.getElementById('result-skips'),
    score: document.getElementById('result-score'),
    time: document.getElementById('result-time'),
    level: document.getElementById('result-level'),
    accuracy: document.getElementById('result-accuracy'),
    avgTime: document.getElementById('result-avg-time'),
    performance: document.getElementById('result-performance')
  };
  
  // النوافذ المنبثقة
  elements.modals = {
    exit: document.getElementById('exit-modal'),
    report: document.getElementById('report-modal'),
    playerDetails: document.getElementById('player-details-modal'),
    devPassword: document.getElementById('dev-password-modal'),
    levelSelect: document.getElementById('level-select-modal')
  };
  
  // عناصر لوحة الصدارة
  elements.leaderboard = {
    filters: document.querySelectorAll('.filter-btn'),
    list: document.querySelector('.leaderboard-list')
  };
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
  // أحداث الشاشات
  elements.buttons.start.addEventListener('click', () => showScreen('avatar-screen'));
  elements.buttons.leaderboard.addEventListener('click', () => {
    loadLeaderboard();
    showScreen('leaderboard-screen');
  });
  elements.buttons.devMode.addEventListener('click', () => showModal('dev-password-modal'));
  
  // أحداث تبديل الوضع
  elements.buttons.themeToggle.addEventListener('click', toggleTheme);
  
  // أحداث شاشة الصورة الرمزية
  elements.buttons.avatarConfirm.addEventListener('click', confirmAvatar);
  elements.buttons.avatarBack.addEventListener('click', () => showScreen('start-screen'));
  
  // أحداث شاشة الاسم
  elements.inputs.playerName.addEventListener('input', validateName);
  elements.buttons.nameConfirm.addEventListener('click', confirmName);
  elements.buttons.nameBack.addEventListener('click', () => showScreen('avatar-screen'));
  
  // أحداث شاشة التعليمات
  elements.buttons.instructionsStart.addEventListener('click', startGame);
  elements.buttons.instructionsBack.addEventListener('click', () => showScreen('name-screen'));
  
  // أحداث شاشة اللعب
  elements.buttons.fiftyFifty.addEventListener('click', useFiftyFifty);
  elements.buttons.freezeTime.addEventListener('click', useFreezeTime);
  elements.buttons.skipQuestion.addEventListener('click', skipQuestion);
  
  // أحداث نهاية المستوى
  elements.buttons.nextLevel.addEventListener('click', nextLevel);
  elements.buttons.endGame.addEventListener('click', endGame);
  
  // أحداث النتائج
  elements.buttons.playAgain.addEventListener('click', resetGame);
  elements.buttons.viewLeaderboard.addEventListener('click', () => {
    loadLeaderboard();
    showScreen('leaderboard-screen');
  });
  elements.buttons.copyResults.addEventListener('click', copyResults);
  elements.buttons.shareX.addEventListener('click', shareOnX);
  
  // أحداث لوحة الصدارة
  elements.leaderboard.filters.forEach(btn => {
    btn.addEventListener('click', (e) => filterLeaderboard(e.target.dataset.filter));
  });
  elements.buttons.leaderboardBack.addEventListener('click', () => showScreen('start-screen'));
  
  // أحداث النوافذ المنبثقة
  elements.buttons.reportFloat.addEventListener('click', () => showModal('report-modal'));
  
  // أحداث وضع المطور
  document.getElementById('dev-password-submit').addEventListener('click', checkDevPassword);
  document.getElementById('dev-password-cancel').addEventListener('click', hideModal);
  
  // أحداث اختيار المستوى
  document.querySelectorAll('.level-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => selectLevel(e.target.dataset.level));
  });
  document.getElementById('level-select-cancel').addEventListener('click', hideModal);
  
  // أحداث الإبلاغ
  document.getElementById('report-submit').addEventListener('click', submitReport);
  document.getElementById('report-cancel').addEventListener('click', hideModal);
  
  // أحداث تفاصيل اللاعب
  document.getElementById('player-details-close').addEventListener('click', hideModal);
  
  // أحداث الخروج
  document.getElementById('exit-confirm').addEventListener('click', confirmExit);
  document.getElementById('exit-cancel').addEventListener('click', hideModal);
}

// تحميل الأسئلة من ملف JSON
function loadQuestions() {
  // في بيئة الإنتاج، سيتم جلب الأسئلة من ملف questions.json
  // هنا نستخدم البيانات المضمنة للتوضيح
  questionsData = {
    "easy": [
      { "q": "ما لون السماء في النهار؟", "options": ["أزرق", "أحمر", "أسود", "أخضر"], "correct": 0 },
      { "q": "كم عدد أصابع اليد الواحدة؟", "options": ["5", "4", "6", "7"], "correct": 0 },
      { "q": "ما الحيوان الذي يُلقب بملك الغابة؟", "options": ["الأسد", "الفيل", "النمر", "الذئب"], "correct": 0 },
      { "q": "ما الشيء الذي نشربه كل يوم؟", "options": ["ماء", "زيت", "حبر", "رمل"], "correct": 0 },
      { "q": "كم دقيقة في الساعة؟", "options": ["60", "30", "45", "90"], "correct": 0 },
      { "q": "ما عاصمة مصر؟", "options": ["القاهرة", "الرياض", "دمشق", "طرابلس"], "correct": 0 },
      { "q": "ما هو لون الموز الناضج؟", "options": ["أصفر", "أخضر", "أسود", "أزرق"], "correct": 0 },
      { "q": "ما هو الحيوان الذي يقول 'موو'؟", "options": ["بقرة", "كلب", "قطة", "حصان"], "correct": 0 },
      { "q": "ما لون الحليب؟", "options": ["أبيض", "أصفر", "أحمر", "أزرق"], "correct": 0 },
      { "q": "كم يوم في الأسبوع؟", "options": ["7", "5", "6", "8"], "correct": 0 }
    ],
    "medium": [
      { "q": "كم رجل للعنكبوت؟", "options": ["8", "6", "10", "12"], "correct": 0 },
      { "q": "كم ثانية في الدقيقة؟", "options": ["60", "30", "120", "90"], "correct": 0 },
      { "q": "ما اسم الشهر الذي يأتي بعد رمضان؟", "options": ["شوال", "رجب", "ذو الحجة", "محرم"], "correct": 0 },
      { "q": "ما الحيوان الذي يعطي الحليب؟", "options": ["بقرة", "دجاجة", "سمكة", "نملة"], "correct": 0 },
      { "q": "ما لون التفاحة غالبًا؟", "options": ["أحمر", "أسود", "أصفر", "بنفسجي"], "correct": 0 },
      { "q": "كم أذناً للإنسان؟", "options": ["اثنتان", "واحدة", "ثلاث", "أربع"], "correct": 0 },
      { "q": "من هو أبو البشر؟", "options": ["آدم", "نوح", "إبراهيم", "موسى"], "correct": 0 },
      { "q": "ما الكوكب الذي نعيش عليه؟", "options": ["الأرض", "عطارد", "المريخ", "القمر"], "correct": 0 },
      { "q": "ما اسم صوت القطة؟", "options": ["مواء", "نباح", "صهيل", "نهيق"], "correct": 0 },
      { "q": "من أين تشرق الشمس؟", "options": ["من الشرق", "من الغرب", "من الشمال", "من الجنوب"], "correct": 0 }
    ],
    "hard": [
      { "q": "ما هو الكوكب الأقرب للشمس؟", "options": ["عطارد", "المريخ", "الأرض", "زحل"], "correct": 0 },
      { "q": "ما الطائر الذي لا يطير؟", "options": ["بطريق", "حمامة", "عصفور", "غراب"], "correct": 0 },
      { "q": "ما البحر الذي يقع في فلسطين؟", "options": ["البحر الميت", "البحر الأحمر", "بحر قزوين", "بحر العرب"], "correct": 0 },
      { "q": "ما هو الشيء الذي نراه في الليل في السماء؟", "options": ["قمر", "شمس", "بحر", "جبل"], "correct": 0 },
      { "q": "ما الحيوان الذي يعيش في البحر وله 8 أذرع؟", "options": ["أخطبوط", "حوت", "تمساح", "سلحفاة"], "correct": 0 },
      { "q": "ما لون العشب؟", "options": ["أخضر", "أصفر", "أزرق", "أسود"], "correct": 0 },
      { "q": "كم عدد قلوب الإنسان؟", "options": ["1", "2", "3", "4"], "correct": 0 },
      { "q": "ما هو الحيوان الذي يُسمى صديق الإنسان؟", "options": ["كلب", "قط", "حصان", "بطة"], "correct": 0 },
      { "q": "ما هو الغاز الذي نتنفسه؟", "options": ["أكسجين", "ثاني أكسيد الكربون", "هيدروجين", "نيتروجين"], "correct": 0 },
      { "q": "ما اسم أول سورة في القرآن؟", "options": ["الفاتحة", "البقرة", "الناس", "الكوثر"], "correct": 0 }
    ],
    "impossible": [
      { "q": "كم إصبع في اليدين معاً؟", "options": ["10", "8", "9", "20"], "correct": 0 }
    ]
  };
  
  // إنشاء شبكة الصور الرمزية
  createAvatarGrid();
}

// إنشاء شبكة الصور الرمزية
function createAvatarGrid() {
  const avatarGrid = document.querySelector('.avatar-grid');
  const avatars = ['😀', '😎', '🤠', '🧐', '🤩', '😊', '😇', '🥳', '😜', '🤓', '🥸', '😌'];
  
  avatars.forEach((avatar, index) => {
    const avatarElement = document.createElement('div');
    avatarElement.className = 'avatar-option';
    avatarElement.textContent = avatar;
    avatarElement.dataset.avatar = avatar;
    
    avatarElement.addEventListener('click', () => {
      // إزالة التحديد من جميع الصور
      document.querySelectorAll('.avatar-option').forEach(el => {
        el.classList.remove('selected');
      });
      
      // تحديد الصورة المختارة
      avatarElement.classList.add('selected');
      elements.buttons.avatarConfirm.disabled = false;
      
      // حفظ الصورة المختارة مؤقتاً
      state.player.avatar = avatar;
    });
    
    avatarGrid.appendChild(avatarElement);
  });
}

// تهيئة اللاعب
function initializePlayer() {
  // إنشاء معرف فريد للاعب
  state.player.playerId = generatePlayerId();
  state.player.deviceId = getDeviceId();
  
  // محاولة تحميل البيانات المحفوظة
  const savedPlayer = localStorage.getItem('quizPlayer');
  if (savedPlayer) {
    try {
      const playerData = JSON.parse(savedPlayer);
      state.player.name = playerData.name || '';
      state.player.avatar = playerData.avatar || '';
    } catch (e) {
      console.error('خطأ في تحميل بيانات اللاعب:', e);
    }
  }
}

// التحقق من الوضع المحفوظ
function checkSavedTheme() {
  const savedTheme = localStorage.getItem('quizTheme');
  if (savedTheme) {
    state.ui.theme = savedTheme;
    document.body.className = `theme-${savedTheme}`;
    updateThemeToggleIcon();
  }
}

// تبديل الوضع المظلم/الفاتح
function toggleTheme() {
  state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
  document.body.className = `theme-${state.ui.theme}`;
  localStorage.setItem('quizTheme', state.ui.theme);
  updateThemeToggleIcon();
}

// تحديث أيقونة تبديل الوضع
function updateThemeToggleIcon() {
  const themeIcon = elements.buttons.themeToggle.querySelector('.theme-icon');
  themeIcon.textContent = state.ui.theme === 'dark' ? '☀️' : '🌙';
}

// التحقق من صحة الاسم
function validateName() {
  const name = elements.inputs.playerName.value.trim();
  const nameError = elements.inputs.nameError;
  
  // تنظيف المدخلات
  const sanitizedName = sanitizeInput(name);
  
  if (sanitizedName.length < 2) {
    nameError.textContent = 'يجب أن يكون الاسم مكون من حرفين على الأقل';
    nameError.classList.add('show');
    elements.buttons.nameConfirm.disabled = true;
    return false;
  } else if (sanitizedName.length > 25) {
    nameError.textContent = 'يجب ألا يزيد الاسم عن 25 حرف';
    nameError.classList.add('show');
    elements.buttons.nameConfirm.disabled = true;
    return false;
  } else {
    nameError.classList.remove('show');
    elements.buttons.nameConfirm.disabled = false;
    return true;
  }
}

// تنظيف المدخلات
function sanitizeInput(input) {
  return input.replace(/[<>]/g, '');
}

// تأكيد اختيار الصورة الرمزية
function confirmAvatar() {
  if (state.player.avatar) {
    showScreen('name-screen');
  }
}

// تأكيد الاسم
function confirmName() {
  if (validateName()) {
    state.player.name = sanitizeInput(elements.inputs.playerName.value.trim());
    
    // حفظ بيانات اللاعب
    localStorage.setItem('quizPlayer', JSON.stringify({
      name: state.player.name,
      avatar: state.player.avatar
    }));
    
    showScreen('instructions-screen');
  }
}

// بدء اللعبة
function startGame() {
  // إعادة تعيين حالة اللعبة
  resetGameState();
  
  // تعيين وقت البدء
  state.game.startTime = Date.now();
  
  // الانتقال إلى شاشة اللعب
  showScreen('game-screen');
  
  // تحديث معلومات اللاعب
  updatePlayerInfo();
  
  // تحميل السؤال الأول
  loadQuestion();
  
  // بدء المؤقت
  startTimer();
}

// إعادة تعيين حالة اللعبة
function resetGameState() {
  state.game = {
    currentLevel: 0,
    currentScore: 100,
    wrongAnswers: 0,
    correctAnswers: 0,
    skips: 0,
    helpersUsed: {
      fifty: false,
      freeze: false,
      skipCount: 0
    },
    questionIndex: 0,
    startTime: null,
    totalTime: 0,
    answerTimes: []
  };
}

// تحديث معلومات اللاعب في واجهة اللعبة
function updatePlayerInfo() {
  elements.game.currentAvatar.textContent = state.player.avatar;
  elements.game.currentName.textContent = state.player.name;
  elements.game.currentScore.textContent = state.game.currentScore;
  elements.game.wrongCount.textContent = `${state.game.wrongAnswers}/3`;
}

// تحميل السؤال الحالي
function loadQuestion() {
  const level = getCurrentLevel();
  const questions = questionsData[level];
  const question = questions[state.game.questionIndex];
  
  if (!question) {
    // انتهاء المستوى
    endLevel();
    return;
  }
  
  // تحديث واجهة المستوى
  updateLevelIndicator();
  
  // عرض السؤال
  elements.game.questionText.textContent = question.q;
  
  // مسح الخيارات السابقة
  elements.game.optionsContainer.innerHTML = '';
  
  // إضافة الخيارات
  question.options.forEach((option, index) => {
    const optionBtn = document.createElement('button');
    optionBtn.className = 'option-btn';
    optionBtn.textContent = option;
    optionBtn.dataset.index = index;
    
    optionBtn.addEventListener('click', () => selectAnswer(index, question.correct));
    
    elements.game.optionsContainer.appendChild(optionBtn);
  });
  
  // تحديث حالة المساعدات
  updateHelpersState();
}

// الحصول على المستوى الحالي
function getCurrentLevel() {
  const levels = ['easy', 'medium', 'hard', 'impossible'];
  return levels[state.game.currentLevel] || 'easy';
}

// تحديث مؤشر المستوى
function updateLevelIndicator() {
  const level = getCurrentLevel();
  const levelNames = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
    impossible: 'مستحيل'
  };
  
  elements.game.currentLevel.textContent = levelNames[level];
  elements.game.currentLevel.className = `level-badge level-${level}`;
}

// تحديث حالة المساعدات
function updateHelpersState() {
  // مساعد 50:50
  elements.buttons.fiftyFifty.disabled = state.game.helpersUsed.fifty;
  
  // مساعد تجميد الوقت
  elements.buttons.freezeTime.disabled = state.game.helpersUsed.freeze;
  
  // تحديث تكلفة التخطي
  const skipCost = calculateSkipCost();
  elements.game.skipCost.textContent = skipCost;
}

// اختيار الإجابة
function selectAnswer(selectedIndex, correctIndex) {
  // تسجيل وقت الإجابة
  const answerTime = (Date.now() - state.game.startTime) / 1000;
  state.game.answerTimes.push(answerTime);
  
  // تعطيل جميع الخيارات
  const optionButtons = elements.game.optionsContainer.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.disabled = true;
  });
  
  // إظهار الإجابة الصحيحة والخاطئة
  optionButtons[correctIndex].classList.add('correct');
  if (selectedIndex !== correctIndex) {
    optionButtons[selectedIndex].classList.add('wrong');
  }
  
  // حساب النقاط
  let pointsEarned = 0;
  
  if (selectedIndex === correctIndex) {
    // إجابة صحيحة
    state.game.correctAnswers++;
    pointsEarned = 100;
    
    // مكافأة السرعة (إذا كانت الإجابة في أول 15 ثانية)
    if (answerTime <= 15) {
      pointsEarned += 50;
    }
  } else {
    // إجابة خاطئة
    state.game.wrongAnswers++;
    pointsEarned = -50;
  }
  
  // تحديث النقاط
  state.game.currentScore += pointsEarned;
  if (state.game.currentScore < 0) {
    state.game.currentScore = 0;
  }
  
  // تحديث واجهة النقاط والأخطاء
  updatePlayerInfo();
  
  // الانتقال إلى السؤال التالي بعد تأخير
  setTimeout(() => {
    state.game.questionIndex++;
    
    // التحقق من نهاية المستوى
    const level = getCurrentLevel();
    const questions = questionsData[level];
    
    if (state.game.questionIndex >= questions.length || state.game.wrongAnswers >= 3) {
      endLevel();
    } else {
      loadQuestion();
      resetTimer();
    }
  }, 2000);
}

// استخدام مساعد 50:50
function useFiftyFifty() {
  if (state.game.helpersUsed.fifty) return;
  
  const level = getCurrentLevel();
  const questions = questionsData[level];
  const question = questions[state.game.questionIndex];
  const correctIndex = question.correct;
  
  // إخفاء خيارين خاطئين
  const optionButtons = elements.game.optionsContainer.querySelectorAll('.option-btn');
  let hiddenCount = 0;
  
  for (let i = 0; i < optionButtons.length; i++) {
    if (i !== correctIndex && hiddenCount < 2) {
      optionButtons[i].classList.add('hidden');
      hiddenCount++;
    }
  }
  
  // تحديث حالة المساعد
  state.game.helpersUsed.fifty = true;
  elements.buttons.fiftyFifty.disabled = true;
}

// استخدام مساعد تجميد الوقت
function useFreezeTime() {
  if (state.game.helpersUsed.freeze) return;
  
  // تجميد المؤقت لمدة 10 ثوان
  freezeTimer(10);
  
  // تحديث حالة المساعد
  state.game.helpersUsed.freeze = true;
  elements.buttons.freezeTime.disabled = true;
}

// تخطي السؤال
function skipQuestion() {
  const skipCost = calculateSkipCost();
  
  // التحقق من وجود نقاط كافية
  if (state.game.currentScore < skipCost) {
    alert('نقاطك غير كافية لتخطي هذا السؤال!');
    return;
  }
  
  // خصم تكلفة التخطي
  state.game.currentScore -= skipCost;
  state.game.skips++;
  state.game.helpersUsed.skipCount++;
  
  // تحديث الواجهة
  updatePlayerInfo();
  updateHelpersState();
  
  // الانتقال إلى السؤال التالي
  state.game.questionIndex++;
  loadQuestion();
  resetTimer();
}

// حساب تكلفة التخطي
function calculateSkipCost() {
  return 20 + state.game.helpersUsed.skipCount * 20;
}

// بدء المؤقت
let timerInterval;
let timeLeft = 30;

function startTimer() {
  timeLeft = 30;
  elements.game.timer.textContent = timeLeft;
  elements.game.timer.classList.remove('warning');
  
  timerInterval = setInterval(() => {
    timeLeft--;
    elements.game.timer.textContent = timeLeft;
    
    // تحذير عندما يقل الوقت عن 10 ثوان
    if (timeLeft <= 10) {
      elements.game.timer.classList.add('warning');
    }
    
    // انتهاء الوقت
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeOut();
    }
  }, 1000);
}

// إعادة تعيين المؤقت
function resetTimer() {
  clearInterval(timerInterval);
  startTimer();
}

// تجميد المؤقت
function freezeTimer(seconds) {
  clearInterval(timerInterval);
  
  let freezeTime = seconds;
  elements.game.timer.textContent = `⏸️ ${freezeTime}`;
  
  const freezeInterval = setInterval(() => {
    freezeTime--;
    elements.game.timer.textContent = `⏸️ ${freezeTime}`;
    
    if (freezeTime <= 0) {
      clearInterval(freezeInterval);
      resetTimer();
    }
  }, 1000);
}

// التعامل مع انتهاء الوقت
function handleTimeOut() {
  // تعطيل جميع الخيارات
  const optionButtons = elements.game.optionsContainer.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.disabled = true;
  });
  
  // إظهار الإجابة الصحيحة
  const level = getCurrentLevel();
  const questions = questionsData[level];
  const question = questions[state.game.questionIndex];
  const correctIndex = question.correct;
  
  optionButtons[correctIndex].classList.add('correct');
  
  // خصم نقاط للإجابة الخاطئة
  state.game.wrongAnswers++;
  state.game.currentScore -= 50;
  if (state.game.currentScore < 0) {
    state.game.currentScore = 0;
  }
  
  // تحديث الواجهة
  updatePlayerInfo();
  
  // الانتقال إلى السؤال التالي بعد تأخير
  setTimeout(() => {
    state.game.questionIndex++;
    
    // التحقق من نهاية المستوى
    const level = getCurrentLevel();
    const questions = questionsData[level];
    
    if (state.game.questionIndex >= questions.length || state.game.wrongAnswers >= 3) {
      endLevel();
    } else {
      loadQuestion();
      resetTimer();
    }
  }, 2000);
}

// نهاية المستوى
function endLevel() {
  clearInterval(timerInterval);
  
  // حساب الوقت الإجمالي
  state.game.totalTime = (Date.now() - state.game.startTime) / 1000;
  
  // تحديث شاشة نهاية المستوى
  document.getElementById('level-end-title').textContent = 
    state.game.wrongAnswers >= 3 ? 'انتهت المحاولة!' : 'تهانينا! أكملت المستوى';
  
  document.getElementById('level-points').textContent = state.game.currentScore;
  document.getElementById('level-correct').textContent = state.game.correctAnswers;
  document.getElementById('level-wrong').textContent = state.game.wrongAnswers;
  
  // إظهار شاشة نهاية المستوى
  showScreen('level-end-screen');
}

// الانتقال إلى المستوى التالي
function nextLevel() {
  state.game.currentLevel++;
  
  // التحقق من وجود مستويات أخرى
  if (state.game.currentLevel >= 4) {
    endGame();
  } else {
    // إعادة تعيين حالة اللعبة للمستوى الجديد (مع الحفاظ على النقاط)
    state.game.questionIndex = 0;
    state.game.wrongAnswers = 0;
    state.game.correctAnswers = 0;
    state.game.helpersUsed.fifty = false;
    state.game.helpersUsed.freeze = false;
    state.game.startTime = Date.now();
    state.game.answerTimes = [];
    
    // بدء المستوى الجديد
    showScreen('game-screen');
    updatePlayerInfo();
    loadQuestion();
    startTimer();
  }
}

// إنهاء اللعبة وعرض النتائج
function endGame() {
  // حساب الإحصائيات النهائية
  const totalQuestions = state.game.correctAnswers + state.game.wrongAnswers;
  const accuracy = totalQuestions > 0 ? Math.round((state.game.correctAnswers / totalQuestions) * 100) : 0;
  const avgTime = state.game.answerTimes.length > 0 ? 
    state.game.answerTimes.reduce((a, b) => a + b, 0) / state.game.answerTimes.length : 0;
  
  // تحديث شاشة النتائج
  elements.results.name.textContent = state.player.name;
  elements.results.id.textContent = state.player.playerId;
  elements.results.attempt.textContent = '1'; // يمكن زيادة هذا الرقم في التطوير المستقبلي
  elements.results.correct.textContent = state.game.correctAnswers;
  elements.results.wrong.textContent = state.game.wrongAnswers;
  elements.results.skips.textContent = state.game.skips;
  elements.results.score.textContent = state.game.currentScore;
  elements.results.time.textContent = toMinSec(state.game.totalTime);
  elements.results.level.textContent = getLevelName(state.game.currentLevel);
  elements.results.accuracy.textContent = `${accuracy}%`;
  elements.results.avgTime.textContent = toMinSec(avgTime);
  elements.results.performance.textContent = getPerformanceRating(accuracy);
  
  // إظهار شاشة النتائج
  showScreen('results-screen');
  
  // حفظ النتائج وإرسالها
  saveGameResults(accuracy, avgTime);
}

// تحويل الثواني إلى دقائق وثواني
function toMinSec(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// الحصول على اسم المستوى
function getLevelName(levelIndex) {
  const levelNames = ['سهل', 'متوسط', 'صعب', 'مستحيل'];
  return levelNames[levelIndex] || 'غير معروف';
}

// الحصول على تقييم الأداء
function getPerformanceRating(accuracy) {
  if (accuracy >= 90) return 'ممتاز';
  if (accuracy >= 80) return 'جيد جداً';
  if (accuracy >= 70) return 'جيد';
  if (accuracy >= 60) return 'مقبول';
  return 'يحتاج تحسين';
}

// حفظ نتائج اللعبة
async function saveGameResults(accuracy, avgTime) {
  const gameData = {
    player_id: state.player.playerId,
    device_id: state.player.deviceId,
    player_name: state.player.name,
    player_avatar: state.player.avatar,
    score: state.game.currentScore,
    level_reached: state.game.currentLevel,
    correct_answers: state.game.correctAnswers,
    wrong_answers: state.game.wrongAnswers,
    skips_used: state.game.skips,
    helpers_used: state.game.helpersUsed,
    total_time: state.game.totalTime,
    average_time: avgTime,
    accuracy: accuracy,
    performance: getPerformanceRating(accuracy),
    created_at: new Date().toISOString()
  };
  
  try {
    // حفظ في Supabase
    await saveToSupabase(gameData);
    
    // إرسال إلى Google Apps Script
    await sendToGoogleAppsScript('gameResult', gameData);
    
    // إرسال السجل إلى البوت
    await sendLogToBot(gameData);
  } catch (error) {
    console.error('خطأ في حفظ النتائج:', error);
  }
}

// حفظ البيانات في Supabase
async function saveToSupabase(gameData) {
  // هنا سيتم تنفيذ كود الاتصال بـ Supabase
  // هذا كود توضيحي - سيتم استبداله بالاتصال الفعلي
  
  console.log('حفظ البيانات في Supabase:', gameData);
  
  // محاكاة الاتصال بـ Supabase
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('تم حفظ البيانات في Supabase بنجاح');
      resolve();
    }, 1000);
  });
}

// إرسال البيانات إلى Google Apps Script
async function sendToGoogleAppsScript(type, data) {
  const payload = {
    type: type,
    secretKey: CONFIG.TEST_KEY,
    data: data
  };
  
  try {
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('تم إرسال البيانات إلى Google Apps Script:', result);
  } catch (error) {
    console.error('خطأ في إرسال البيانات إلى Google Apps Script:', error);
  }
}

// إرسال السجل إلى البوت
async function sendLogToBot(gameData) {
  const logText = `
📋 سجل محاولة جديد 📋

• رقم المحاولة: 1
• معرف الجهاز: ${gameData.device_id}
• معرف اللاعب: ${gameData.player_id}
• اسم اللاعب: ${gameData.player_name}
• الإجابات الصحيحة: ${gameData.correct_answers}
• الإجابات الخاطئة: ${gameData.wrong_answers}
• نسبة الدقة: ${gameData.accuracy}%
• مرات التخطي: ${gameData.skips_used}
• استخدام 50:50: ${gameData.helpers_used.fifty ? 'نعم' : 'لا'}
• استخدام التجميد: ${gameData.helpers_used.freeze ? 'نعم' : 'لا'}
• النقاط النهائية: ${gameData.score}
• الوقت الإجمالي: ${toMinSec(gameData.total_time)}
• متوسط الوقت: ${toMinSec(gameData.average_time)}
• آخر مستوى وصل إليه: ${getLevelName(gameData.level_reached)}
• تقييم الأداء: ${gameData.performance}
• تاريخ التسجيل: ${new Date().toLocaleString('ar-SA')}
  `;
  
  // هنا سيتم إرسال النص إلى بوت السجلات
  console.log('إرسال السجل إلى البوت:', logText);
}

// إعادة تعيين اللعبة
function resetGame() {
  resetGameState();
  showScreen('start-screen');
}

// نسخ النتائج
function copyResults() {
  const resultsText = `
🏆 النتائج النهائية 🏆

• الاسم: ${state.player.name}
• المعرّف: ${state.player.playerId}
• رقم المحاولة: 1
• الإجابات الصحيحة: ${state.game.correctAnswers}
• الإجابات الخاطئة: ${state.game.wrongAnswers}
• مرات التخطي: ${state.game.skips}
• النقاط النهائية: ${state.game.currentScore}
• الوقت المستغرق: ${toMinSec(state.game.totalTime)}
• المستوى الذي وصلت إليه: ${getLevelName(state.game.currentLevel)}
• نسبة الدقة: ${elements.results.accuracy.textContent}
• متوسط وقت الإجابة: ${elements.results.avgTime.textContent}
• أداؤك: ${elements.results.performance.textContent}
  `;
  
  navigator.clipboard.writeText(resultsText).then(() => {
    alert('تم نسخ النتائج إلى الحافظة!');
  }).catch(err => {
    console.error('خطأ في نسخ النتائج:', err);
  });
}

// المشاركة على 𝕏
function shareOnX() {
  const resultsText = `
🏆 النتائج النهائية 🏆

• الاسم: ${state.player.name}
• النقاط النهائية: ${state.game.currentScore}
• المستوى الذي وصلت إليه: ${getLevelName(state.game.currentLevel)}
• نسبة الدقة: ${elements.results.accuracy.textContent}

جرب مسابقة المعلومات الآن!
  `;
  
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(resultsText)}`;
  window.open(shareUrl, '_blank');
}

// تحميل لوحة الصدارة
async function loadLeaderboard(filter = 'all') {
  // مسح القائمة الحالية
  elements.leaderboard.list.innerHTML = '';
  
  try {
    // جلب البيانات من Supabase
    const leaderboardData = await fetchLeaderboardData(filter);
    
    // عرض البيانات
    leaderboardData.forEach((player, index) => {
      const leaderboardItem = document.createElement('div');
      leaderboardItem.className = 'leaderboard-item';
      leaderboardItem.dataset.playerId = player.player_id;
      
      leaderboardItem.innerHTML = `
        <div class="leaderboard-rank">${index + 1}</div>
        <div class="leaderboard-avatar">${player.player_avatar}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${player.player_name}</div>
          <div class="leaderboard-score">${player.score} نقطة | ${getLevelName(player.level_reached)}</div>
        </div>
      `;
      
      leaderboardItem.addEventListener('click', () => showPlayerDetails(player.player_id));
      
      elements.leaderboard.list.appendChild(leaderboardItem);
    });
  } catch (error) {
    console.error('خطأ في تحميل لوحة الصدارة:', error);
    elements.leaderboard.list.innerHTML = '<div style="text-align: center; padding: 20px;">حدث خطأ في تحميل البيانات</div>';
  }
}

// جلب بيانات لوحة الصدارة من Supabase
async function fetchLeaderboardData(filter) {
  // هذا كود توضيحي - سيتم استبداله بالاتصال الفعلي بـ Supabase
  
  console.log('جلب بيانات لوحة الصدارة مع الفلتر:', filter);
  
  // محاكاة البيانات
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = [
        {
          player_id: 'player1',
          player_name: 'أحمد',
          player_avatar: '😎',
          score: 950,
          level_reached: 3
        },
        {
          player_id: 'player2',
          player_name: 'فاطمة',
          player_avatar: '🤩',
          score: 870,
          level_reached: 2
        },
        {
          player_id: 'player3',
          player_name: 'محمد',
          player_avatar: '🧐',
          score: 780,
          level_reached: 2
        }
        // يمكن إضافة المزيد من البيانات الوهمية هنا
      ];
      
      resolve(mockData);
    }, 1000);
  });
}

// تصفية لوحة الصدارة
function filterLeaderboard(filter) {
  // تحديث الأزرار النشطة
  elements.leaderboard.filters.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  // إعادة تحميل البيانات مع التصفية
  loadLeaderboard(filter);
}

// عرض تفاصيل اللاعب
function showPlayerDetails(playerId) {
  // هذا كود توضيحي - سيتم استبداله بالاتصال الفعلي بـ Supabase
  
  console.log('عرض تفاصيل اللاعب:', playerId);
  
  // محاكاة بيانات اللاعب
  const playerDetails = {
    name: 'أحمد',
    avatar: '😎',
    total_games: 5,
    best_score: 950,
    average_accuracy: 85,
    favorite_level: 'صعب',
    join_date: '2023-10-01'
  };
  
  // تحديث النافذة المنبثقة
  document.getElementById('player-details-name').textContent = `تفاصيل ${playerDetails.name}`;
  
  const detailsContent = document.querySelector('.player-details-content');
  detailsContent.innerHTML = `
    <div class="player-detail-item">
      <span>إجمالي المباريات:</span>
      <span>${playerDetails.total_games}</span>
    </div>
    <div class="player-detail-item">
      <span>أفضل نتيجة:</span>
      <span>${playerDetails.best_score}</span>
    </div>
    <div class="player-detail-item">
      <span>متوسط الدقة:</span>
      <span>${playerDetails.average_accuracy}%</span>
    </div>
    <div class="player-detail-item">
      <span>المستوى المفضل:</span>
      <span>${playerDetails.favorite_level}</span>
    </div>
    <div class="player-detail-item">
      <span>تاريخ الانضمام:</span>
      <span>${playerDetails.join_date}</span>
    </div>
  `;
  
  // إظهار النافذة المنبثقة
  showModal('player-details-modal');
}

// التحقق من كلمة مرور المطور
function checkDevPassword() {
  const password = elements.inputs.devPassword.value;
  
  if (password === CONFIG.TEST_KEY) {
    hideModal();
    showModal('level-select-modal');
  } else {
    alert('كلمة المرور غير صحيحة!');
  }
}

// اختيار مستوى البدء (للمطورين)
function selectLevel(level) {
  const levelMap = {
    easy: 0,
    medium: 1,
    hard: 2,
    impossible: 3
  };
  
  state.game.currentLevel = levelMap[level] || 0;
  hideModal();
  startGame();
}

// إرسال بلاغ
function submitReport() {
  const type = elements.inputs.reportType.value;
  const description = elements.inputs.reportDescription.value.trim();
  
  if (!description) {
    alert('يرجى إدخال وصف للمشكلة');
    return;
  }
  
  const reportData = {
    type: type,
    description: description,
    player_id: state.player.playerId,
    player_name: state.player.name,
    device_info: getDeviceInfo(),
    timestamp: new Date().toISOString()
  };
  
  // إرسال البلاغ
  sendReport(reportData);
  
  // إغلاق النافذة
  hideModal();
  alert('شكراً لك! تم استلام بلاغك وسيتم مراجعته.');
}

// إرسال البلاغ
async function sendReport(reportData) {
  try {
    // إرسال إلى Google Apps Script
    await sendToGoogleAppsScript('report', reportData);
    
    console.log('تم إرسال البلاغ:', reportData);
  } catch (error) {
    console.error('خطأ في إرسال البلاغ:', error);
  }
}

// تأكيد الخروج
function confirmExit() {
  hideModal();
  showScreen('start-screen');
}

// إظهار شاشة معينة
function showScreen(screenId) {
  // إخفاء جميع الشاشات
  Object.values(elements.screens).forEach(screen => {
    screen.classList.remove('active');
  });
  
  // إظهار الشاشة المطلوبة
  if (elements.screens[screenId]) {
    elements.screens[screenId].classList.add('active');
    state.ui.currentScreen = screenId;
  }
}

// إظهار نافذة منبثقة
function showModal(modalId) {
  // إخفاء جميع النوافذ
  Object.values(elements.modals).forEach(modal => {
    modal.classList.remove('active');
  });
  
  // إظهار النافذة المطلوبة
  if (elements.modals[modalId]) {
    elements.modals[modalId].classList.add('active');
    state.ui.activeModal = modalId;
  }
}

// إخفاء النافذة المنبثقة
function hideModal() {
  if (state.ui.activeModal) {
    elements.modals[state.ui.activeModal].classList.remove('active');
    state.ui.activeModal = null;
  }
}

// إنشاء معرف فريد للاعب
function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

// الحصول على معرف الجهاز
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// الحصول على معلومات الجهاز
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
