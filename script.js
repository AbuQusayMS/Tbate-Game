// ملف script.js - يحتوي على منطق اللعبة والتفاعل مع Supabase و Google App Script

// =========================================================================
// 1. الإعدادات والثوابت (Configuration)
// =========================================================================

const CONFIG = {
  // مفتاح التحقق البسيط بين الواجهة و Google App Script
  TEST_KEY: 'AbuQusay', 
  // رابط Google App Script (يرجى تحديثه بعد النشر)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
  // روابط Supabase
  SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
  
  QUESTION_TIME: 30, // ثواني لكل سؤال
  MAX_WRONG: 3, // أقصى عدد من الأخطاء المسموحة
  STARTING_SCORE: 100, // النقاط الأولية
  DEV_PASSWORD: 'developer' // كلمة مرور وضع المطوّر
};

// تسميات المستويات واستمرارها
const LEVEL_LABEL = { easy:'سهل', medium:'متوسط', hard:'صعب', impossible:'مستحيل' };
const LEVEL_ORDER = ['easy','medium','hard','impossible'];
// عدد الأسئلة لكل مستوى (10، 10، 10، 1)
const LEVEL_COUNTS = { easy:10, medium:10, hard:10, impossible:1 };

// حالة التطبيق الأولية (State Management)
let state = {
  player: { name:'', avatar:'🙂', playerId:'', deviceId:'' },
  game: {
    currentLevelIndex: 0,
    score: CONFIG.STARTING_SCORE,
    correct: 0, wrong: 0,
    skips: 0, skipCost: 20,
    usedFifty: false, usedFreeze: false, // مساعدات تستخدم مرة واحدة في الجولة
    questionIndex: 0,
    totalTimeSec: 0, // الوقت الإجمالي المستغرق
    timer: null, remaining: CONFIG.QUESTION_TIME, frozen: false // حالة المؤقت
  },
  ui: {
    currentScreen: 'loader',
    devMode: localStorage.getItem('quizDevMode') === 'true', // حفظ وضع المطوّر
    activeModal: null,
    questions: null // سيتم تحميل الأسئلة من questions.json
  },
};

// =========================================================================
// 2. أدوات DOM المساعدة (DOM Utilities)
// =========================================================================

const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> [...r.querySelectorAll(s)];

// تحديد الشاشات وعناصر DOM الرئيسية
const screens = {
  loader: $('#screen-loader'), start: $('#screen-start'), avatar: $('#screen-avatar'), 
  name: $('#screen-name'), instructions: $('#screen-instructions'), levelSelect: $('#screen-level-select'),
  game: $('#screen-game'), levelEnd: $('#screen-level-end'), results: $('#screen-results'), 
  leaderboard: $('#screen-leaderboard')
};

const els = {
  // العناصر التفاعلية الرئيسية
  themeToggle: $('#themeToggle'), gotoLeaderboard: $('#gotoLeaderboard'), startBtn: $('#startBtn'), 
  openDevBtn: $('#openDevBtn'), avatarGrid: $('#avatarGrid'), avatarNextBtn: $('#avatarNextBtn'),
  playerNameInput: $('#playerNameInput'), confirmNameBtn: $('#confirmNameBtn'), startRoundBtn: $('#startRoundBtn'),
  devLevelSelect: $('#devLevelSelect'),

  // عناصر HUD واللعب
  levelDots: $('#levelDots'), hudScore: $('#hudScore'), hudMistakes: $('#hudMistakes'),
  hudAvatar: $('#hudAvatar'), hudName: $('#hudName'),
  btnSkip: $('#btnSkip'), btnFreeze: $('#btnFreeze'), btnFifty: $('#btnFifty'), skipCost: $('#skipCost'), 
  timerBar: $('#timerBar'), timerLabel: $('#timerLabel'), levelBadge: $('#levelBadge'), qCounter: $('#qCounter'), 
  questionText: $('#questionText'), options: $('#options'),
  
  // عناصر نهاية المستوى والنتائج
  currentLevelEndBadge: $('#currentLevelEndBadge'), btnNextLevel: $('#btnNextLevel'), btnWithdraw: $('#btnWithdraw'),
  finalResults: $('#finalResults'), shareText: $('#shareText'), shareXBtn: $('#shareXBtn'), 
  copyShareTextBtn: $('#copyShareTextBtn'), playAgainBtn: $('#playAgainBtn'), openLeaderboardBtn: $('#openLeaderboardBtn'),
  
  // لوحة الصدارة والتفاصيل
  lbFilters: $('#lbFilters'), leaderboardList: $('#leaderboardList'),
  playerDetailsModal: $('#playerDetailsModal'), closePlayerModal: $('#closePlayerModal'), playerDetailsBody: $('#playerDetailsBody'),
  
  // البلاغات
  openReportBtn: $('#openReportBtn'), reportModal: $('#reportModal'), closeReport: $('#closeReport'),
  reportType: $('#reportType'), reportDesc: $('#reportDesc'), reportImage: $('#reportImage'), reportAuto: $('#reportAuto'),
  sendReportBtn: $('#sendReportBtn')
};

/**
 * دالة لعرض شاشة معينة وإخفاء الباقي.
 * @param {string} key - مفتاح الشاشة (مثل 'start', 'game').
 */
function showScreen(key) {
  state.ui.currentScreen = key;
  $$('.screen').forEach(s => s.classList.remove('active'));
  screens[key].classList.add('active');
  // إخفاء زر وضع المطور إذا لم يكن الوضع مفعلاً
  if (key === 'start') {
    els.openDevBtn.style.display = state.ui.devMode ? 'block' : 'block'; // نترك الزر دائماً متاحاً
  }
}

/**
 * تحويل الثواني إلى صيغة د:ث
 * @param {number} sec - عدد الثواني
 * @returns {string} - الوقت بصيغة م:ث
 */
function toMinSec(sec) {
  sec = Math.round(+sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * توليد معرف فريد عشوائي (Player ID)
 * @param {string} prefix - بادئة المعرّف
 * @returns {string} - المعرّف الفريد
 */
function uuid(prefix = 'PL') {
  return prefix + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();
}

/**
 * الحصول على معرف الجهاز الفريد، أو توليده وحفظه في localStorage
 * @returns {string} - معرف الجهاز
 */
function getDeviceId() {
  let d = localStorage.getItem('quizDeviceId');
  if (!d) {
    d = 'D' + uuid('').slice(2);
    localStorage.setItem('quizDeviceId', d);
  }
  return d;
}

/**
 * دالة عرض رسالة بسيطة (استبدال alert)
 * @param {string} m - الرسالة المراد عرضها
 */
function toast(m) {
  // يمكن استبدالها لاحقاً بمكتبة أفضل أو تصميم modal
  console.log(`[TOAST]: ${m}`);
  // استخدام alert مؤقتاً لتسهيل الاختبار، لكن يجب استبدالها بواجهة مخصصة حسب الوثيقة
  const tempModal = $('#tempModal');
  if (tempModal) tempModal.remove();
  const modalHtml = `
    <div id="tempModal" class="modal" style="background:rgba(0,0,0,0.8); z-index:999;">
      <div class="modal-content" style="max-width:350px; padding: 20px; text-align: center;">
        <p>${m}</p>
        <button onclick="document.getElementById('tempModal').remove()" class="primary" style="margin-top: 15px; width: 100%; height: 40px; padding: 0 10px; border-radius: 8px;">حسناً</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * زيادة رقم المحاولة في التخزين المحلي
 * @returns {number} - رقم المحاولة الجديد
 */
function nextAttemptNumber() {
  const k = 'quizAttemptCount';
  let n = +(localStorage.getItem(k) || 0);
  n += 1;
  localStorage.setItem(k, String(n));
  return n;
}

// =========================================================================
// 3. التحميل والتهيئة (Bootstrap & Initialization)
// =========================================================================

/**
 * جلب الأسئلة من ملف questions.json
 */
async function loadQuestions() {
  try {
    // جلب الأسئلة من الملف الخارجي
    const response = await fetch('questions.json');
    if (!response.ok) {
        // إذا فشل الجلب، نعتمد على الأسئلة المدمجة (لكن هنا نعتبر أنها ستنجح)
        throw new Error(`Failed to load questions: ${response.statusText}`);
    }
    state.ui.questions = await response.json();
    console.log("الأسئلة حُمِّلت بنجاح.");
  } catch (e) {
    console.error("خطأ في تحميل الأسئلة:", e);
    // يمكن هنا تحميل أسئلة احتياطية مدمجة إذا لزم الأمر
    state.ui.questions = { easy:[], medium:[], hard:[], impossible:[] };
    toast("لم يتم تحميل ملف الأسئلة. تحقق من مسار 'questions.json'.");
  }
  showScreen('start');
}

/**
 * تهيئة الثيم (الوضع المظلم/الفاتح)
 */
(function initTheme() {
  let saved = localStorage.getItem('theme');
  if (saved !== 'light' && saved !== 'dark') saved = 'dark';
  document.body.classList.toggle('theme-light', saved === 'light');
  document.body.classList.toggle('theme-dark', saved === 'dark');
})();

/**
 * تهيئة الصور الرمزية
 */
function initAvatars() {
  const emojis = ['🙂', '😁', '🤓', '🧑‍💻', '🧔', '👩‍🦱', '🧑‍🎓', '🧑‍🎨', '🧑‍🚀', '🧑‍🚒'];
  els.avatarGrid.innerHTML = '';
  emojis.forEach(e => {
    const d = document.createElement('div');
    d.className = 'avatar';
    d.textContent = e;
    d.onclick = () => {
      $$('.avatar', els.avatarGrid).forEach(x => x.classList.remove('selected'));
      d.classList.add('selected');
      state.player.avatar = e;
      els.avatarNextBtn.disabled = false;
    };
    els.avatarGrid.appendChild(d);
  });
  // تحديد الصورة الرمزية المحفوظة
  const savedAvatar = state.player.avatar;
  if (savedAvatar) {
    const avatarEl = Array.from(els.avatarGrid.children).find(el => el.textContent === savedAvatar);
    if (avatarEl) {
      avatarEl.click(); // لتحديدها في الواجهة
    }
  }
}

/**
 * الدالة التي يتم استدعاؤها عند تحميل الصفحة
 */
(function bootstrap() {
  // تحميل الأسئلة والبدء
  loadQuestions();
  // تهيئة المعرفات الأولية
  state.player.deviceId = getDeviceId();
  initAvatars();
  updateHUD();
  // إخفاء شاشة اختيار المستوى في الوضع العادي
  if (!state.ui.devMode) screens.levelSelect.style.display = 'none';
})();

// =========================================================================
// 4. تحديث الواجهة (UI Updates)
// =========================================================================

/**
 * تحديث شاشة العرض العلوية (HUD)
 */
function updateHUD() {
  els.hudScore.textContent = `النقاط: ${state.game.score}`;
  els.hudMistakes.textContent = `الأخطاء: ${state.game.wrong}/${CONFIG.MAX_WRONG}`;
  els.hudAvatar.textContent = state.player.avatar;
  els.hudName.textContent = state.player.name || '—';
  els.skipCost.textContent = `(${state.game.skipCost})`;

  // تحديث حالة أزرار المساعدات
  els.btnFifty.disabled = state.game.usedFifty;
  els.btnFreeze.disabled = state.game.usedFreeze;

  // تحديث لون وتسمية المستوى في شاشة نهاية المستوى
  const levelKey = getLevelKey();
  els.currentLevelEndBadge.textContent = LEVEL_LABEL[levelKey];
  els.currentLevelEndBadge.dataset.level = levelKey;
}

/**
 * رسم نقاط المستويات في شاشة اللعب
 */
function renderLevelDots() {
  els.levelDots.innerHTML = '';
  LEVEL_ORDER.forEach((k, i) => {
    const s = document.createElement('span');
    s.className = 'chip';
    s.textContent = String(i + 1);
    if (i === state.game.currentLevelIndex) s.classList.add('active');
    els.levelDots.appendChild(s);
  });
}

// =========================================================================
// 5. منطق اللعب (Game Logic)
// =========================================================================

const getLevelKey = () => LEVEL_ORDER[state.game.currentLevelIndex];
const getBucket = () => state.ui.questions[getLevelKey()] || [];

/**
 * بدء جولة جديدة أو مستوى جديد.
 * @param {string} [levelKey] - مفتاح المستوى المراد البدء منه (لوضع المطوّر).
 */
function startLevel(levelKey) {
  if (levelKey && !state.ui.devMode) {
    return toast('اختيار المستوى يدويًا متاح في وضع المطوّر فقط');
  }
  if (levelKey) state.game.currentLevelIndex = LEVEL_ORDER.indexOf(levelKey);

  // إعادة تهيئة حالة الجولة
  state.game.questionIndex = 0;
  state.game.usedFifty = false;
  state.game.usedFreeze = false;
  state.game.skipCost = 20;

  renderLevelDots();
  showScreen('game');
  nextQuestion();
}

/**
 * الانتقال للسؤال التالي أو إنهاء المستوى.
 */
function nextQuestion() {
  const bucket = getBucket();
  const total = LEVEL_COUNTS[getLevelKey()];

  // التحقق من نهاية المستوى
  if (state.game.questionIndex >= total) {
    stopTimer();
    updateHUD();
    showScreen('levelEnd');
    return;
  }

  const q = bucket[state.game.questionIndex];
  const levelKey = getLevelKey();

  // تحديث واجهة السؤال
  els.levelBadge.textContent = LEVEL_LABEL[levelKey];
  els.levelBadge.dataset.level = levelKey;
  els.qCounter.textContent = `السؤال ${state.game.questionIndex + 1} من ${total}`;
  els.questionText.textContent = q.q;
  els.options.innerHTML = '';

  // عرض خيارات الإجابة
  q.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.textContent = opt;
    b.onclick = () => onAnswer(i, q.correct);
    els.options.appendChild(b);
  });

  // إذا تم استخدام 50:50 مسبقاً في هذه الجولة، قم بتطبيقها على الخيارات الجديدة
  if (state.game.usedFifty) applyFiftyToOptions(q.correct); 

  startTimer();
  updateHUD();
}

/**
 * معالجة الإجابة
 * @param {number} chosen - فهرس الخيار الذي اختاره اللاعب
 * @param {number} correct - فهرس الإجابة الصحيحة
 */
function onAnswer(chosen, correct) {
  stopTimer();

  // حساب الوقت المستغرق للسؤال
  const timeSpent = CONFIG.QUESTION_TIME - state.game.remaining;
  state.game.totalTimeSec += Math.max(0, timeSpent);

  const isCorrect = (chosen === correct);
  markOptions(chosen, correct); // تظليل الخيارات

  if (isCorrect) {
    state.game.correct++;
    state.game.score += 100;
    // مكافأة السرعة
    if (timeSpent <= CONFIG.QUESTION_TIME / 2) {
      state.game.score += 50;
      toast('✅ إجابة صحيحة! +100 نقطة، و +50 مكافأة سرعة!');
    } else {
        toast('✅ إجابة صحيحة! +100 نقطة.');
    }
  } else {
    state.game.wrong++;
    state.game.score -= 50;
    toast(`❌ إجابة خاطئة! -50 نقطة. الإجابة الصحيحة هي: ${getBucket()[state.game.questionIndex].options[correct]}`);
  }
  updateHUD();

  // التحقق من الأخطاء المسموحة
  setTimeout(() => {
    if (state.game.wrong >= CONFIG.MAX_WRONG) {
      finalizeAndShowResults('الخروج بسبب الأخطاء');
    } else {
      state.game.questionIndex++;
      nextQuestion();
    }
  }, 1000);
}

/**
 * تظليل خيارات الإجابة بعد الاختيار
 * @param {number} choice - فهرس الخيار الذي اختاره اللاعب
 * @param {number} correct - فهرس الإجابة الصحيحة
 */
function markOptions(choice, correct) {
  $$('.option', els.options).forEach((b, i) => {
    b.classList.add(i === correct ? 'correct' : (i === choice ? 'wrong' : ''));
    b.disabled = true;
  });
}

// =========================================================================
// 6. المؤقت والمساعدات (Timer & Helpers)
// =========================================================================

let freezeTimer = null;

/**
 * بدء تشغيل المؤقت (30 ثانية)
 */
function startTimer() {
  state.game.remaining = CONFIG.QUESTION_TIME;
  state.game.frozen = false;
  
  // تحديث شريط المؤقت (لغة عربية: الشريط يتقلص من اليمين)
  els.timerBar.style.width = '100%';
  els.timerBar.style.transition = `width ${CONFIG.QUESTION_TIME}s linear`;
  els.timerBar.style.transform = 'scaleX(1)';
  
  els.timerLabel.textContent = String(state.game.remaining);

  // تحديث المؤقت كل ثانية
  state.game.timer = setInterval(() => {
    if (state.game.frozen) return;
    
    state.game.remaining--;
    els.timerLabel.textContent = String(state.game.remaining);
    
    // تحديث شريط التقدم يدوياً ليتناسب مع التجميد والتخطي
    els.timerBar.style.width = `${(state.game.remaining / CONFIG.QUESTION_TIME) * 100}%`;
    
    if (state.game.remaining <= 0) {
      clearInterval(state.game.timer);
      toast('انتهى الوقت! هذا يُحسب كخطأ.');
      // إذا انتهى الوقت، يتم اعتبارها إجابة خاطئة
      onAnswer(-1, getBucket()[state.game.questionIndex].correct);
    }
  }, 1000);
}

/**
 * إيقاف المؤقت
 */
function stopTimer() {
  clearInterval(state.game.timer);
  clearInterval(freezeTimer);
  state.game.frozen = false;
  // إيقاف انتقال شريط المؤقت
  els.timerBar.style.transition = 'none';
}

// 50:50 - حذف خيارين خاطئين
els.btnFifty.onclick = () => {
  if (state.game.usedFifty) return toast('تم استخدام 50:50 بالفعل في هذه الجولة');
  state.game.usedFifty = true;
  els.btnFifty.disabled = true;
  applyFiftyToOptions(getBucket()[state.game.questionIndex].correct);
  toast('تم حذف خيارين خاطئين! 🔀');
};

/**
 * تطبيق تأثير 50:50
 * @param {number} correctIdx - فهرس الإجابة الصحيحة
 */
function applyFiftyToOptions(correctIdx) {
  const ops = $$('.option', els.options);
  let removed = 0;
  for (let i = 0; i < ops.length && removed < 2; i++) {
    // التحقق من أن الخيار ليس صحيحاً ولم يتم تعطيله بعد
    if (i !== correctIdx && !ops[i].classList.contains('disabled')) {
      ops[i].classList.add('disabled');
      ops[i].disabled = true;
      removed++;
    }
  }
}

// تجميد الوقت
els.btnFreeze.onclick = () => {
  if (state.game.usedFreeze) return toast('تم استخدام التجميد بالفعل في هذه الجولة');
  state.game.usedFreeze = true;
  els.btnFreeze.disabled = true;
  state.game.frozen = true;
  toast('❄️ تم تجميد الوقت لمدة 10 ثوانٍ.');
  
  let seconds = 10;
  els.timerLabel.textContent = `مجمّد: ${seconds}`;

  freezeTimer = setInterval(() => {
    seconds--;
    els.timerLabel.textContent = `مجمّد: ${seconds}`;
    
    if (seconds <= 0) {
      clearInterval(freezeTimer);
      state.game.frozen = false;
      els.timerLabel.textContent = String(state.game.remaining); // العودة للمؤقت العادي
      toast('انتهى التجميد، سيبدأ المؤقت مرة أخرى.');
    }
  }, 1000);
};

// تخطي السؤال
els.btnSkip.onclick = () => {
  if (state.game.score < state.game.skipCost) {
    return toast(`نقاطك (${state.game.score}) لا تكفي لتخطي السؤال بتكلفة (${state.game.skipCost}).`);
  }
  
  state.game.score -= state.game.skipCost;
  state.game.skips++;
  state.game.skipCost += 20; // زيادة التكلفة
  
  stopTimer();
  updateHUD();
  toast(`⏭ تم تخطي السؤال. التكلفة الجديدة: ${state.game.skipCost}`);
  
  state.game.questionIndex++;
  nextQuestion();
};

// =========================================================================
// 7. نهاية اللعب والنتائج (Results & Finalization)
// =========================================================================

// الانتقال للمستوى التالي
els.btnNextLevel.onclick = () => {
  const nextIndex = state.game.currentLevelIndex + 1;
  if (nextIndex >= LEVEL_ORDER.length) {
    finalizeAndShowResults('أنهى جميع المستويات');
  } else {
    state.game.currentLevelIndex = nextIndex;
    startLevel();
  }
};

// الانسحاب
els.btnWithdraw.onclick = () => finalizeAndShowResults('انسحاب اللاعب');

// البدء من جديد
els.playAgainBtn.onclick = () => location.reload();

// فتح لوحة الصدارة
els.openLeaderboardBtn.onclick = () => { showScreen('leaderboard'); refreshLeaderboard(); };
els.gotoLeaderboard.onclick = () => { showScreen('leaderboard'); refreshLeaderboard(); };

/**
 * حساب الإحصائيات النهائية وعرضها وإرسالها
 * @param {string} reason - سبب انتهاء اللعب (أخطاء، انسحاب، إنهاء المستويات)
 */
function finalizeAndShowResults(reason = 'إنتهاء اللعب') {
  stopTimer(); // التأكد من إيقاف أي مؤقت
  
  const answered = state.game.correct + state.game.wrong;
  const accuracy = answered ? +(100 * state.game.correct / answered).toFixed(1) : 0;
  const avgTime = answered ? Math.round(state.game.totalTimeSec / Math.max(1, answered)) : 0;
  const levelKey = getLevelKey();
  const rating = accuracy >= 85 ? 'ممتاز' : accuracy >= 60 ? 'جيّد' : 'يحتاج تحسين';
  const attemptNumber = nextAttemptNumber();
  const isImpossibleFinisher = (levelKey === 'impossible' && state.game.questionIndex === LEVEL_COUNTS['impossible']);

  const stats = {
    name: state.player.name,
    avatar: state.player.avatar,
    playerId: state.player.playerId,
    deviceId: state.player.deviceId,
    attempt: attemptNumber,
    correct: state.game.correct,
    wrong: state.game.wrong,
    skips: state.game.skips,
    score: state.game.score,
    totalTime: state.game.totalTimeSec,
    levelReached: LEVEL_LABEL[levelKey],
    accuracy: accuracy,
    avgTime: avgTime,
    rating: rating,
    finishedImpossible: isImpossibleFinisher,
    usedFifty: state.game.usedFifty,
    usedFreeze: state.game.usedFreeze,
    reason: reason,
    createdAt: new Date().toISOString()
  };

  showScreen('results');
  renderResults(stats);

  // إرسال البيانات إلى Google App Script
  if (CONFIG.APPS_SCRIPT_URL.startsWith('http')) {
    // 1. إرسال النتيجة النهائية للبوت (Results Bot)
    sendToGAS('gameResult', stats).catch(e => console.error("فشل إرسال النتيجة للبوت:", e));
    // 2. إرسال سجل مفصل (Logs Bot)
    sendToGAS('log', stats).catch(e => console.error("فشل إرسال السجل للبوت:", e));
  } else {
    console.warn("لم يتم إعداد رابط APPS_SCRIPT_URL، لن يتم إرسال النتائج للبوت.");
  }

  // تحديث الصدارة في Supabase
  if (supa) {
    updateLeaderboard(stats);
  } else {
    console.warn("Supabase لم تتم تهيئتها.");
  }
}

/**
 * عرض الإحصائيات النهائية على الشاشة
 * @param {object} s - بيانات الإحصائيات
 */
function renderResults(s) {
  const rows = [
    ['الاسم', s.name], ['المعرّف', s.playerId], ['رقم المحاولة', s.attempt],
    ['الإجابات الصحيحة', s.correct], ['الإجابات الخاطئة', s.wrong],
    ['مرات التخطي', s.skips], ['النقاط النهائية', s.score],
    ['الوقت المستغرق (د.ث)', toMinSec(s.totalTime)], 
    ['المستوى الذي وصلت إليه', s.levelReached],
    ['نسبة الدقة', `${s.accuracy}%`], 
    ['متوسط وقت الإجابة (د.ث)', toMinSec(s.avgTime)],
    ['أداؤك', s.rating]
  ];
  
  els.finalResults.innerHTML = rows.map(([k, v]) => 
    `<div class="kv"><b>${k}:</b><div>${v}</div></div>`
  ).join('');
  
  els.shareText.value = buildShareText(s);
}

/**
 * بناء النص الموحد للمشاركة
 * @param {object} s - بيانات الإحصائيات
 * @returns {string} - نص المشاركة
 */
function buildShareText(s) {
  return `🏆 النتائج النهائية 🏆

الاسم: ${s.name}
المعرّف: ${s.playerId}
رقم المحاولة: ${s.attempt}
الإجابات الصحيحة: ${s.correct}
الإجابات الخاطئة: ${s.wrong}
مرات التخطي: ${s.skips}
النقاط النهائية: ${s.score}
الوقت المستغرق (د.ث): ${toMinSec(s.totalTime)}
المستوى الذي وصلت إليه: ${s.levelReached}
نسبة الدقة: ${s.accuracy}%
متوسط وقت الإجابة (د.ث): ${toMinSec(s.avgTime)}
أداؤك: ${s.rating}`;
}

// وظائف المشاركة والنسخ
els.copyShareTextBtn.onclick = () => { els.shareText.select(); document.execCommand('copy'); toast('تم نسخ النص'); };
els.shareXBtn.onclick = () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(els.shareText.value)}`, '_blank'); };

// =========================================================================
// 8. التكامل مع Google App Script (API Calls)
// =========================================================================

/**
 * إرسال طلب إلى Google App Script Endpoint
 * @param {'gameResult'|'log'|'report'} type - نوع الطلب
 * @param {object} data - الحمولة المراد إرسالها
 */
async function sendToGAS(type, data) {
  if (!CONFIG.APPS_SCRIPT_URL.startsWith('http')) {
    console.error(`Apps Script URL غير صالح لـ: ${type}`);
    return;
  }
  
  const payload = {
    type: type,
    secretKey: CONFIG.TEST_KEY,
    data: data
  };
  
  try {
    const r = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await r.json();
    if (result.error) console.error(`خطأ من GAS في ${type}:`, result.error);
    return result;
  } catch (e) {
    console.error(`خطأ في الاتصال بـ GAS لـ ${type}:`, e);
    // عدم استخدام toast هنا لتجنب إزعاج المستخدم
  }
}

// =========================================================================
// 9. الإبلاغ عن مشكلة (Reporting)
// =========================================================================

// فتح نافذة البلاغ
els.openReportBtn.onclick = () => els.reportModal.classList.remove('hidden');
els.closeReport.onclick = () => els.reportModal.classList.add('hidden');

/**
 * تحويل ملف إلى صيغة Base64
 * @param {File} file - الملف المراد تحويله
 */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// إرسال البلاغ
els.sendReportBtn.onclick = async () => {
  els.sendReportBtn.disabled = true;
  
  const type = els.reportType.value;
  const description = els.reportDesc.value.trim();
  let screenshot_b64 = '';
  
  if (els.reportImage.files[0]) {
    try {
      screenshot_b64 = await fileToBase64(els.reportImage.files[0]);
    } catch (e) {
      toast('فشل تحميل الصورة المرفقة.');
      els.sendReportBtn.disabled = false;
      return;
    }
  }

  // جمع معلومات الكشف التلقائي
  const autoData = els.reportAuto.checked ? {
    question_text: els.questionText?.textContent || 'غير متوفر (شاشة البداية/النتائج)',
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    current_screen: state.ui.currentScreen,
    score: state.game.score
  } : {};

  const payload = {
    playerId: state.player.playerId,
    name: state.player.name,
    type: type,
    description: description,
    screenshot_b64: screenshot_b64,
    ...autoData
  };
  
  // إرسال البيانات إلى Google App Script
  await sendToGAS('report', payload);
  
  toast('تم إرسال البلاغ، شكرًا لك! سيتم مراجعته.');
  els.reportModal.classList.add('hidden');
  els.sendReportBtn.disabled = false;
};

// =========================================================================
// 10. التكامل مع Supabase (Leaderboard)
// =========================================================================

let supa = null;
if (window.supabase) {
  try {
    supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("Supabase مهيأة.");
  } catch (e) {
    console.error("فشل تهيئة Supabase:", e);
  }
}

/**
 * إرسال (أو تحديث) نتيجة اللاعب في جدول الصدارة
 * @param {object} stats - إحصائيات اللعب النهائية
 */
async function updateLeaderboard(stats) {
  if (!supa) return;
  
  try {
    const { data, error } = await supa.from('leaderboard').upsert({
      device_id: stats.deviceId, // مفتاح التعارض (onConflict)
      player_id: stats.playerId,
      name: stats.name,
      avatar: stats.avatar,
      score: stats.score,
      level: getLevelKey(),
      accuracy: stats.accuracy,
      total_time: stats.totalTime,
      avg_time: stats.avgTime,
      correct_answers: stats.correct,
      wrong_answers: stats.wrong,
      skips: stats.skips,
      is_impossible_finisher: stats.finishedImpossible,
      updated_at: stats.createdAt
    }, { onConflict: 'device_id', ignoreDuplicates: false, count: 'exact' });

    // تخزين سجل مفصل في game_logs
    await supa.from('game_logs').insert({
        player_id: stats.playerId,
        device_id: stats.deviceId,
        score: stats.score,
        accuracy: stats.accuracy,
        level: getLevelKey(),
        total_time: stats.totalTime,
        created_at: stats.createdAt,
        name: stats.name,
        avatar: stats.avatar,
        attempt_number: stats.attempt,
        used_fifty: stats.usedFifty,
        used_freeze: stats.usedFreeze,
        reason_for_end: stats.reason,
    });
    
    if (error) throw error;
    refreshLeaderboard(); // تحديث لوحة الصدارة فوراً
  } catch (e) {
    console.error("فشل تحديث Supabase:", e.message);
  }
}

/**
 * جلب وتحديث لوحة الصدارة بناءً على الفلتر
 * @param {string} [filter='all'] - نوع الفلتر (all, top10, impossible)
 */
async function refreshLeaderboard(filter = 'all') {
  if (!supa) {
    els.leaderboardList.innerHTML = `<div class="muted">لم تُهيّأ Supabase بعد.</div>`;
    return;
  }
  
  let q = supa.from('leaderboard').select('player_id,name,avatar,score,level,is_impossible_finisher,updated_at').order('score', { ascending: false });

  if (filter === 'top10') q = q.limit(10);
  if (filter === 'impossible') q = q.eq('is_impossible_finisher', true);

  const { data, error } = await q;

  if (error) {
    els.leaderboardList.innerHTML = `<div class="muted">خطأ في جلب الصدارة: ${error.message}</div>`;
    return;
  }

  els.leaderboardList.innerHTML = (data || []).map((row, i) => `
    <div class="row-item" data-player="${row.player_id}">
      <div class="rank">${i + 1}</div>
      <div class="avatar">${row.avatar || '🙂'}</div>
      <div class="grow">
        <div><b>${row.name}</b></div>
        <div class="muted">النقاط: ${row.score} · المستوى: ${LEVEL_LABEL[row.level]} ${row.is_impossible_finisher ? ' · مستحيل ✅' : ''}</div>
      </div>
      <div class="muted" style="font-size: 0.75rem;">${new Date(row.updated_at).toLocaleTimeString('ar')}</div>
    </div>
  `).join('') || `<div class="muted">لا يوجد بيانات في لوحة الصدارة بعد.</div>`;

  // إضافة معالج حدث لفتح نافذة التفاصيل
  $$('#leaderboardList .row-item').forEach(el => el.onclick = () => openPlayerDetails(el.dataset.player));
}

/**
 * فتح نافذة تفاصيل نتائج اللاعب
 * @param {string} playerId - معرف اللاعب المراد عرض نتائجه
 */
async function openPlayerDetails(playerId) {
  if (!supa) return;
  
  // جلب سجلات اللعب الخاصة باللاعب
  const { data, error } = await supa.from('game_logs')
    .select('score, accuracy, level, total_time, skips, created_at, attempt_number')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(25); // عرض آخر 25 محاولة

  if (error) {
    els.playerDetailsBody.innerHTML = `<div class="muted">خطأ في جلب التفاصيل: ${error.message}</div>`;
  } else {
    els.playerDetailsBody.innerHTML = (data || []).map(x => `
      <div class="row-item" style="cursor: default;">
        <div class="grow">
          <div><b>المحاولة #${x.attempt_number} - بتاريخ ${new Date(x.created_at).toLocaleDateString('ar')}</b></div>
          <div class="muted">نقاط: ${x.score} · دقة: ${x.accuracy}% · مستوى: ${LEVEL_LABEL[x.level]} · وقت: ${toMinSec(x.total_time)}</div>
        </div>
      </div>
    `).join('') || `<div class="muted">لا توجد سجلات لعب لهذا اللاعب.</div>`;
  }
  els.playerDetailsModal.classList.remove('hidden');
}

// إغلاق نافذة تفاصيل اللاعب
els.closePlayerModal.onclick = () => els.playerDetailsModal.classList.add('hidden');

// معالج أحداث لتغيير فلتر الصدارة
els.lbFilters.onclick = (e) => { 
  const b = e.target.closest('.pill'); 
  if (!b) return; 
  $$('.pill', els.lbFilters).forEach(p => p.classList.remove('active')); 
  b.classList.add('active'); 
  refreshLeaderboard(b.dataset.filter); 
};

// التحديث الدوري للوحة الصدارة (كل دقيقة)
setInterval(() => { 
  if (state.ui.currentScreen === 'leaderboard') { 
    const f = $('.pill.active', els.lbFilters)?.dataset.filter || 'all'; 
    refreshLeaderboard(f);
  }
}, 60000);

// =========================================================================
// 11. معالجات الأحداث (Event Handlers)
// =========================================================================

// تبديل الوضع (Dark/Light)
els.themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('theme-light');
  document.body.classList.toggle('theme-dark', !isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// الرجوع للخلف (استخدام data-back)
$$('.back-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.back)));

// فتح وضع المطوّر
els.openDevBtn.onclick = () => {
  const p = prompt('أدخل كلمة مرور المطوّر');
  if (p !== CONFIG.DEV_PASSWORD) return toast('كلمة المرور غير صحيحة');
  state.ui.devMode = true;
  localStorage.setItem('quizDevMode', 'true');
  showScreen('levelSelect');
};

// اختيار المستوى (وضع المطوّر)
els.devLevelSelect.onclick = (e) => {
  const b = e.target.closest('.pill');
  if (!b) return;
  // إعادة تعيين حالة اللعب قبل البدء
  state.game.score = CONFIG.STARTING_SCORE;
  state.game.correct = 0;
  state.game.wrong = 0;
  state.game.skips = 0;
  state.game.totalTimeSec = 0;
  startLevel(b.dataset.level);
};

// شاشة البداية
els.startBtn.onclick = () => {
  if (state.player.name) { // إذا كان الاسم موجودًا، تخطَّ شاشتي الصورة والاسم
    showScreen('instructions');
  } else {
    showScreen('avatar');
  }
};

// حقول اللاعب
els.avatarNextBtn.onclick = () => showScreen('name');
els.playerNameInput.oninput = () => {
  const ok = validateName(els.playerNameInput.value);
  els.confirmNameBtn.disabled = !ok;
};
els.confirmNameBtn.onclick = () => {
  const name = els.playerNameInput.value.trim();
  if (!validateName(name)) return toast('الاسم يجب أن يكون بين 2 و 25 حرفًا.');
  
  state.player.name = name;
  // إنشاء معرف اللاعب والجهاز لأول مرة
  if (!state.player.playerId) state.player.playerId = uuid('PL');
  localStorage.setItem('quizPlayerName', state.player.name);
  localStorage.setItem('quizPlayerAvatar', state.player.avatar);

  showScreen('instructions');
  updateHUD();
};

// وظيفة التحقق والتنظيف (Sanitization)
function validateName(n) {
  n = (n || '').trim();
  // تنظيف المدخلات من رموز HTML/Script
  n = n.replace(/[<>]/g, '');
  return n.length >= 2 && n.length <= 25;
}

// بدء الجولة العادية
els.startRoundBtn.onclick = () => {
  // إعادة تهيئة الحالة قبل بدء جولة جديدة بالكامل
  state.game.currentLevelIndex = 0;
  state.game.score = CONFIG.STARTING_SCORE;
  state.game.correct = 0;
  state.game.wrong = 0;
  state.game.skips = 0;
  state.game.totalTimeSec = 0;
  startLevel();
};
