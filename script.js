/* =======================================================================
   🧠 مسابقة المعلومات — ملف وظائف الواجهة (script.js)
   النسخة: v1 — مصمم وفق الوثيقة الفنية الشاملة
   
   ✔ يدعم العربية (RTL) — تعليقات موسّعة بالعربية تشرح كل جزء خطوة بخطوة.
   ✔ يحتوي على: إدارة الحالة، تدفق الشاشات، المؤقّت، المساعدات (50:50/تجميد/تخطي)،
     تحميل الأسئلة، حساب النقاط/المكافآت، شاشة نهاية المستوى/اللعبة، لوحة الصدارة،
     وضع المطوّر، الإبلاغ عن المشاكل، وربط Supabase + Google Apps Script.

   ⚠ تنبيه أمني (بسيط كما طلبت): المفاتيح هنا لأغراض تعليمية/تجريبية في مشروع غير ربحي.
     يُفضّل وضعها في ENV عند النشر الحقيقي. لا نبالغ في الحماية حسب طلبك. 
   ======================================================================= */

'use strict';

// =====================================================================
// 0) أدوات مساعدة عامة (Utilities)
// =====================================================================
/** مولّد معرّف شبه فريد (للأجهزة/الجلسات) */
const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
/** إيقاف مؤقت (وعد) — مفيد للتجارب/الانتظار البسيط */
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
/** ضبط قيمة بين حدين */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
/** تنسيق رقم عربي */
const formatNumber = (n) => new Intl.NumberFormat('ar-EG').format(Math.round(n));
/** تحويل ثوانٍ إلى نص دقيق م:ث */
const toMinSec = (sec) => { const s = Math.max(0, Math.floor(sec)); const m = Math.floor(s/60); const r = s % 60; return `${m}:${String(r).padStart(2,'0')}`; };
/** تنظيف مدخلات بسيطة من < > فقط (حسب الوثيقة) */
const sanitizeInput = (s) => (s || '').toString().replace(/[<>]/g, '');
/** التحقق من الاسم (2–25) */
const validateNameInput = (n) => n && n.length >= 2 && n.length <= 25;

// =====================================================================
// 1) الإعدادات العامة (Config)
// =====================================================================
const CONFIG = {
  // ▸ روابط وخدمات
  SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co', // من الوثيقة
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
  TEST_KEY: 'AbuQusay', // مفتاح بسيط كما في الوثيقة

  // ▸ مصادر البيانات
  QUESTIONS_SRC: './questions.json', // ملف محلي — مع توفير نسخة احتياطية أدناه

  // ▸ إعدادات اللعب
  QUESTION_TIME: 30,             // المؤقّت: 30 ثانية لكل سؤال
  MAX_WRONG_ANSWERS: 3,          // عدد الأخطاء المسموح بها في الجولة
  STARTING_SCORE: 100,           // نقاط البدء
  POINT_CORRECT: 100,            // +100 للإجابة الصحيحة
  POINT_WRONG: -50,              // -50 للإجابة الخاطئة
  SPEED_BONUS: 50,               // مكافأة السرعة

  // ▸ المستويات
  LEVELS: [
    { key: 'easy', label: 'سهل', count: 10 },
    { key: 'medium', label: 'متوسط', count: 10 },
    { key: 'hard', label: 'صعب', count: 10 },
    { key: 'impossible', label: 'مستحيل', count: 1 }
  ],

  // ▸ المساعدات
  HELPERS: {
    fifty: { key: 'fifty', label: '50:50', oncePerRound: true, cost: 0 }, // التكلفة تُخصم من النقاط حسب طلبك؟ الوثيقة لم تحدد تكلفة مباشرة لغير التخطي، نتركها 0.
    freeze: { key: 'freeze', label: 'تجميد 10ث', oncePerRound: true, cost: 0 },
    skip: {
      key: 'skip', label: 'تخطي', oncePerRound: false,
      baseCost: 20, increment: 20, // (20، 40، 60، ...)
      costByCount: (used) => 20 + used * 20
    }
  },

  // ▸ واجهة المستخدم/الصدارة
  POLL_LEADERBOARD_MS: 60_000,   // تحديث دوري كل دقيقة

  // ▸ وضع المطوّر (للتجاوز والاختبارات)
  DEV: {
    ENABLED: false,              // يتفعّل بكلمة مرور
    PASSWORD: 'AbuQusay',        // حسب الوثيقة
    NAME_SHORTCUT: 'AbuQusay'    // إدخال الاسم يفعّل الوضع مباشرة
  },

  // ▸ عشوائية
  RANDOMIZE_QUESTIONS: true,
  RANDOMIZE_OPTIONS: true,

  // ▸ تصحيحات/سلوكيات
  DEBUG: false
};

// نسخة أسئلة احتياطية (fallback) في حال فشل تحميل questions.json
const QUESTIONS_FALLBACK = {"easy":[{"q":"ما لون السماء في النهار؟","options":["أزرق","أحمر","أسود","أخضر"],"correct":0},{"q":"كم عدد أصابع اليد الواحدة؟","options":["5","4","6","7"],"correct":0},{"q":"ما الحيوان الذي يُلقب بملك الغابة؟","options":["الأسد","الفيل","النمر","الذئب"],"correct":0},{"q":"ما الشيء الذي نشربه كل يوم؟","options":["ماء","زيت","حبر","رمل"],"correct":0},{"q":"كم دقيقة في الساعة؟","options":["60","30","45","90"],"correct":0},{"q":"ما عاصمة مصر؟","options":["القاهرة","الرياض","دمشق","طرابلس"],"correct":0},{"q":"ما هو لون الموز الناضج؟","options":["أصفر","أخضر","أسود","أزرق"],"correct":0},{"q":"ما هو الحيوان الذي يقول 'موو'؟","options":["بقرة","كلب","قطة","حصان"],"correct":0},{"q":"ما لون الحليب؟","options":["أبيض","أصفر","أحمر","أزرق"],"correct":0},{"q":"كم يوم في الأسبوع؟","options":["7","5","6","8"],"correct":0}],"medium":[{"q":"كم رجل للعنكبوت؟","options":["8","6","10","12"],"correct":0},{"q":"كم ثانية في الدقيقة؟","options":["60","30","120","90"],"correct":0},{"q":"ما اسم الشهر الذي يأتي بعد رمضان؟","options":["شوال","رجب","ذو الحجة","محرم"],"correct":0},{"q":"ما الحيوان الذي يعطي الحليب؟","options":["بقرة","دجاجة","سمكة","نملة"],"correct":0},{"q":"ما لون التفاحة غالبًا؟","options":["أحمر","أسود","أصفر","بنفسجي"],"correct":0},{"q":"كم أذناً للإنسان؟","options":["اثنتان","واحدة","ثلاث","أربع"],"correct":0},{"q":"من هو أبو البشر؟","options":["آدم","نوح","إبراهيم","موسى"],"correct":0},{"q":"ما الكوكب الذي نعيش عليه؟","options":["الأرض","عطارد","المريخ","القمر"],"correct":0},{"q":"ما اسم صوت القطة؟","options":["مواء","نباح","صهيل","نهيق"],"correct":0},{"q":"من أين تشرق الشمس؟","options":["من الشرق","من الغرب","من الشمال","من الجنوب"],"correct":0}],"hard":[{"q":"ما هو الكوكب الأقرب للشمس؟","options":["عطارد","المريخ","الأرض","زحل"],"correct":0},{"q":"ما الطائر الذي لا يطير؟","options":["بطريق","حمامة","عصفور","غراب"],"correct":0},{"q":"ما البحر الذي يقع في فلسطين؟","options":["البحر الميت","البحر الأحمر","بحر قزوين","بحر العرب"],"correct":0},{"q":"ما هو الشيء الذي نراه في الليل في السماء؟","options":["قمر","شمس","بحر","جبل"],"correct":0},{"q":"ما الحيوان الذي يعيش في البحر وله 8 أذرع؟","options":["أخطبوط","حوت","تمساح","سلحفاة"],"correct":0},{"q":"ما لون العشب؟","options":["أخضر","أصفر","أزرق","أسود"],"correct":0},{"q":"كم عدد قلوب الإنسان؟","options":["1","2","3","4"],"correct":0},{"q":"ما هو الحيوان الذي يُسمى صديق الإنسان؟","options":["كلب","قط","حصان","بطة"],"correct":0},{"q":"ما هو الغاز الذي نتنفسه؟","options":["أكسجين","ثاني أكسيد الكربون","هيدروجين","نيتروجين"],"correct":0},{"q":"ما اسم أول سورة في القرآن؟","options":["الفاتحة","البقرة","الناس","الكوثر"],"correct":0}],"impossible":[{"q":"كم إصبع في اليدين معاً؟","options":["10","8","9","20"],"correct":0}]};

// =====================================================================
// 2) كائن اللعبة الرئيسي
// =====================================================================
class QuizGame {
  constructor() {
    // -------------------------------
    // (أ) مرجع إلى عناصر DOM الشائعة
    // -------------------------------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    this.$ = $; this.$$ = $$;

    this.dom = {
      screens: {
        loader: $('#loader'),
        start: $('#startScreen'),
        avatar: $('#avatarScreen'),
        name: $('#nameEntryScreen'),
        instructions: $('#instructionsScreen'),
        levelSelect: $('#levelSelectScreen'),
        game: $('#gameContainer'),
        levelDone: $('#levelCompleteScreen'),
        end: $('#endScreen'),
        leaderboard: $('#leaderboardScreen')
      },
      modals: {
        confirmExit: $('#confirmExitModal'),
        report: $('#advancedReportModal'),
        avatarEditor: $('#avatarEditorModal'),
        devPassword: $('#devPasswordModal'),
        playerDetails: $('#playerDetailsModal')
      },
      // عناصر عامة
      toastContainer: $('#toast-container'),
      reportFab: $('#reportErrorFab'),
      devFab: $('#devFloatingBtn'),
      // إدخالات
      nameInput: $('#nameInput'),
      nameError: $('#nameError'),
      confirmNameBtn: $('#confirmNameBtn'),
      confirmAvatarBtn: $('#confirmAvatarBtn'),
      reportForm: $('#reportProblemForm'),
      devPasswordInput: $('#devPasswordInput'),
      devPasswordError: $('#devPasswordError'),
      // عناصر اللعب
      playerAvatar: $('#playerAvatar'),
      playerName: $('#playerName'),
      playerId: $('#playerId'),
      scoreEl: $('#currentScore'),
      wrongEl: $('#wrongAnswersCount'),
      skipCountEl: $('#skipCount'),
      skipCostEl: $('#skipCost'),
      currentLevelBadge: $('#currentLevelBadge'),
      questionCounter: $('#questionCounter'),
      questionText: $('#questionText'),
      optionsGrid: $('.options-grid'),
      timerBar: $('.timer-bar'),
      timerText: $('#timer'),
      helpers: $('.helpers'),
      // الصدارة
      leaderboardContent: $('#leaderboardContent'),
      // تفاصيل لاعب
      detailsAvatar: $('#detailsAvatar'),
      detailsName: $('#detailsName'),
      detailsPlayerId: $('#detailsPlayerId'),
      detailsBody: $('#playerDetailsContent')
    };

    // -------------------------------
    // (ب) الحالة العامة للعبة (State)
    // -------------------------------
    this.state = {
      player: { name: '', avatar: '', playerId: '', deviceId: '' },
      game: {
        currentLevelIdx: 0,
        currentScore: CONFIG.STARTING_SCORE,
        wrongAnswers: 0,
        correctAnswers: 0,
        skips: 0,
        helpersUsed: { fifty: false, freeze: false, skipCount: 0 },
        questionIndex: 0,
        roundStartAt: 0,        // وقت بدء الجولة (ms)
        questionStartAt: 0,     // وقت بدء السؤال الحالي (ms)
        shuffledQuestions: []   // قائمة الأسئلة بعد العشوائية
      },
      ui: { currentScreen: 'loader', theme: 'dark', activeModal: null },
      flags: { dev: false, devTempDisabled: false }
    };

    // -------------------------------
    // (ج) خدمات خارجية
    // -------------------------------
    this.supabase = null;       // سيتم تهيئته لاحقًا
    this.questions = null;      // سيتم تحميلها من JSON
    this.leaderboardChannel = null; // اشتراك Realtime

    // مؤقّت داخلي
    this.timer = { interval: null, frozen: false, remaining: CONFIG.QUESTION_TIME };

    // كروبر (من مكتبة Cropper.js المُحمّلة في index.html)
    this.cropper = null;

    // تشغيل التهيئة الرئيسية
    this.init();
  }

  // ===================================================================
  // 3) التهيئة العامة
  // ===================================================================
  async init() {
    try {
      // 1) تحميل الثيم من التخزين + تحديث زر التبديل
      this.loadTheme();

      // 2) ربط الأحداث العامة (تفويض بالـ data-action)
      this.bindEvents();

      // 3) تحضير شبكة الصور الرمزية
      this.populateAvatarGrid();

      // 4) تحضير Supabase
      try {
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      } catch (err) {
        console.error('Supabase init error:', err);
      }

      // 5) تحميل الأسئلة
      await this.loadQuestions();

      // 6) إظهار شاشة البداية وإخفاء اللودر
      this.showScreen('start');
    } catch (e) {
      console.error('init() failed', e);
      this.toast('حدث خطأ غير متوقع أثناء التهيئة', 'error');
    } finally {
      this.dom.screens.loader?.classList.remove('active');
    }
  }

  // ===================================================================
  // 4) ربط الأحداث (Event Binding)
  // ===================================================================
  bindEvents() {
    const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

    // (أ) تفويض أحداث النقر على مستوى الوثيقة
    on(document.body, 'click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');

      // خريطة الإجراءات — كل زر عليه data-action يستدعي دالة معينة
      const actions = {
        // تنقل بين الشاشات الأساسية
        showAvatarScreen: () => this.showScreen('avatar'),
        showNameEntryScreen: () => this.showScreen('name'),
        showStartScreen: () => this.showScreen('start'),

        // تثبيت الاسم/البدء
        confirmName: () => this.handleNameConfirm(),
        postInstructionsStart: () => this.afterInstructionsStart(),

        // الصدارة
        showLeaderboard: () => this.openLeaderboard(),

        // الثيم/الخروج
        toggleTheme: () => this.toggleTheme(),
        showConfirmExitModal: () => this.showModal('confirmExit'),

        // إدارة اللعبة
        endGame: () => this.endGame(false),
        nextLevel: () => this.nextLevel(),
        playAgain: () => window.location.reload(),

        // مشاركة
        shareOnX: () => this.shareOnX(),
        shareOnInstagram: () => this.copyForInstagram(),

        // المطوّر
        showDevPasswordModal: () => this.showModal('devPassword'),
        checkDevPassword: () => this.checkDevPassword(),
        startDevLevel: () => {
          const idx = Number(btn.getAttribute('data-level-index')) || 0;
          this.startGameAtLevel(idx);
        },

        // النوافذ المنبثقة
        closeModal: () => this.hideModal(btn.getAttribute('data-modal-id')),

        // الصورة الرمزية
        saveCroppedAvatar: () => this.saveCroppedAvatar()
      };

      if (actions[action]) actions[action]();
    });

    // (ب) إدخال الاسم — تحقّق فوري + إنتر = تأكيد
    this.dom.nameInput?.addEventListener('input', () => this.validateNameField());
    this.dom.nameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleNameConfirm(); });

    // (ج) كلمة مرور المطوّر — إنتر = تحقق
    this.dom.devPasswordInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkDevPassword(); });

    // (د) نموذج الإبلاغ
    this.dom.reportForm?.addEventListener('submit', (e) => this.onReportSubmit(e));

    // (هـ) شبكة الخيارات (إجابات الأسئلة)
    this.dom.optionsGrid?.addEventListener('click', (e) => {
      const option = e.target.closest('.option-btn');
      if (option) this.onAnswer(option);
    });

    // (و) أزرار المساعدات
    this.dom.helpers?.addEventListener('click', (e) => {
      const hbtn = e.target.closest('.helper-btn');
      if (!hbtn) return;
      const type = hbtn.dataset.type; // fiftyFifty | freezeTime | skipQuestion
      if (type === 'fiftyFifty') return this.useFifty();
      if (type === 'freezeTime') return this.useFreeze();
      if (type === 'skipQuestion') return this.useSkip();
    });

    // (ز) زر عائم للمطوّر — تبديل تعطيل مؤقت لامتيازات المطوّر إن لزم
    this.dom.devFab?.addEventListener('click', () => {
      if (!this.state.flags.dev) return;
      this.state.flags.devTempDisabled = !this.state.flags.devTempDisabled;
      this.dom.devFab.classList.toggle('active', !this.state.flags.devTempDisabled);
      this.dom.devFab.classList.toggle('inactive', this.state.flags.devTempDisabled);
      this.dom.devFab.querySelector('span').textContent = this.state.flags.devTempDisabled ? '⛔' : '⚡';
      this.toast(this.state.flags.devTempDisabled ? 'تم تعطيل امتيازات المطوّر مؤقتًا' : 'تم تفعيل امتيازات المطوّر', 'info');
    });

    // (ح) زر الإبلاغ العائم يفتح نافذة البلاغ
    this.dom.reportFab?.addEventListener('click', () => this.showModal('report'));
  }

  // ===================================================================
  // 5) الثيم (داكن/فاتح)
  // ===================================================================
  loadTheme() {
    // نحفظ الثيم في localStorage تحت key "theme" — الافتراضي: dark
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.state.ui.theme = saved;
    // تحديث أيقونة الزر (إن وُجد)
    const tbtn = document.querySelector('.theme-toggle-btn');
    if (tbtn) tbtn.textContent = saved === 'dark' ? '☀️' : '🌙';
  }

  toggleTheme() {
    const isDark = this.state.ui.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.state.ui.theme = next;
    const tbtn = document.querySelector('.theme-toggle-btn');
    if (tbtn) tbtn.textContent = next === 'dark' ? '☀️' : '🌙';
  }

  // ===================================================================
  // 6) إدارة الشاشات والنوافذ
  // ===================================================================
  showScreen(name) {
    Object.entries(this.dom.screens).forEach(([key, el]) => el && el.classList.toggle('active', key === name));
    this.state.ui.currentScreen = name;
  }

  showModal(key) {
    const modal = this.dom.modals[key];
    if (!modal) return;
    modal.classList.add('active');
    this.state.ui.activeModal = key;
  }

  hideModal(key) {
    const modal = this.dom.modals[key];
    if (!modal) return;
    modal.classList.remove('active');
    if (this.state.ui.activeModal === key) this.state.ui.activeModal = null;
  }

  toast(message, type = 'info') {
    const box = document.createElement('div');
    box.className = `toast ${type}`;
    box.setAttribute('role', 'alert');
    box.textContent = message;
    this.dom.toastContainer?.appendChild(box);
    setTimeout(() => box.remove(), 3000);
  }

  // ===================================================================
  // 7) اختيار/رفع الصورة الرمزية (Avatar)
  // ===================================================================
  populateAvatarGrid() {
    const grid = document.querySelector('.avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // زر رفع مخصص
    const upload = document.createElement('div');
    upload.className = 'avatar-upload-btn';
    upload.title = 'رفع صورة';
    upload.innerHTML = '<span aria-hidden="true">+</span><label for="avatarUploadInput" class="sr-only">رفع صورة</label><input id="avatarUploadInput" type="file" accept="image/*" hidden>';
    grid.appendChild(upload);

    const fileInput = upload.querySelector('input');
    upload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.onAvatarFile(e));

    // مجموعة صور افتراضية (إيموجي/أفاتار)
    const avatars = [
      'https://em-content.zobj.net/thumbs/120/apple/354/woman_1f469.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/man_1f468.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/person-beard_1f9d4.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/old-man_1f474.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/student_1f9d1-200d-1f393.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/teacher_1f9d1-200d-1f3eb.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/scientist_1f9d1-200d-1f52c.png',
      'https://em-content.zobj.net/thumbs/120/apple/354/artist_1f9d1-200d-1f3a8.png'
    ];

    avatars.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src; img.alt = `صورة رمزية ${i+1}`; img.loading = 'lazy';
      img.className = 'avatar-option';
      grid.appendChild(img);
    });

    // اختيار عند النقر
    grid.addEventListener('click', (e) => {
      const opt = e.target.closest('.avatar-option, .avatar-upload-btn');
      if (!opt) return;
      grid.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      // حفظ المسار إن كان IMG، أو سيُحفظ لاحقًا عند الحفظ من الكروبر
      if (opt.tagName === 'IMG') this.state.player.avatar = opt.src;
      // زر التالي يفعل
      this.dom.confirmAvatarBtn.disabled = false;
    });
  }

  async onAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.getElementById('image-to-crop');
      img.src = reader.result;
      this.showModal('avatarEditor');

      // تفعيل الكروبر بعد فتح النافذة
      setTimeout(() => {
        if (this.cropper) this.cropper.destroy();
        // ملاحظة: Cropper.js محمّل من CDN في index.html
        this.cropper = new window.Cropper(img, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
      }, 250);
    };
    reader.readAsDataURL(file);
  }

  saveCroppedAvatar() {
    if (!this.cropper) return;
    const dataURL = this.cropper.getCroppedCanvas({ width: 256, height: 256 }).toDataURL('image/png');
    // إنشاء عنصر IMG مخصص إن لم يوجد
    let custom = document.getElementById('custom-avatar');
    if (!custom) {
      custom = document.createElement('img');
      custom.id = 'custom-avatar';
      custom.className = 'avatar-option';
      const upload = document.querySelector('.avatar-upload-btn');
      upload.after(custom);
    }
    custom.src = dataURL;
    // تحديده كخيار محدّد
    document.querySelectorAll('.avatar-option, .avatar-upload-btn').forEach(el => el.classList.remove('selected'));
    custom.classList.add('selected');
    this.state.player.avatar = dataURL;
    this.dom.confirmAvatarBtn.disabled = false;
    this.hideModal('avatarEditor');
  }

  // ===================================================================
  // 8) إدخال الاسم والتحقّق
  // ===================================================================
  validateNameField() {
    const name = sanitizeInput(this.dom.nameInput.value.trim());
    const ok = validateNameInput(name);
    this.dom.nameError.textContent = ok ? '' : 'الاسم يجب أن يكون بين 2 و 25 حرفًا.';
    this.dom.nameError.classList.toggle('show', !ok);
    this.dom.confirmNameBtn.disabled = !ok;
  }

  handleNameConfirm() {
    const raw = this.dom.nameInput.value.trim();
    const name = sanitizeInput(raw);
    if (!validateNameInput(name)) return this.validateNameField();

    // اختصار وضع المطوّر عند إدخال الاسم نفسه
    if (name.toLowerCase() === CONFIG.DEV.NAME_SHORTCUT.toLowerCase()) this.activateDev();

    // تهيئة اللاعب (playerId + deviceId)
    const deviceId = localStorage.getItem('quizGameDeviceId') || uid('D');
    localStorage.setItem('quizGameDeviceId', deviceId);

    this.state.player.name = name;
    this.state.player.playerId = uid('PL');
    this.state.player.deviceId = deviceId;

    this.showScreen('instructions');
  }

  checkDevPassword() {
    const input = (this.dom.devPasswordInput.value || '').trim();
    if (input && input.toLowerCase() === CONFIG.DEV.PASSWORD.toLowerCase()) {
      this.dom.devPasswordError.textContent = '';
      this.hideModal('devPassword');
      this.activateDev();
      this.toast('تم تفعيل وضع المطوّر بنجاح ✅', 'success');
    } else {
      this.dom.devPasswordError.textContent = 'كلمة المرور غير صحيحة.';
      this.dom.devPasswordError.classList.add('show');
    }
  }

  activateDev() {
    this.state.flags.dev = true;
    this.dom.devFab.style.display = 'flex';
    this.dom.devFab.classList.add('active');
    this.dom.devFab.classList.remove('inactive');
    this.dom.devFab.querySelector('span').textContent = '⚡';
  }

  // ===================================================================
  // 9) بدء اللعب بعد التعليمات
  // ===================================================================
  afterInstructionsStart() {
    // إن كان المطوّر مفعّلًا — يمكنه اختيار مستوى البداية
    if (this.state.flags.dev && !this.state.flags.devTempDisabled) {
      this.showScreen('levelSelect');
    } else {
      this.startGameAtLevel(0); // الوضع العادي يبدأ من السهل
    }
  }

  startGameAtLevel(levelIndex = 0) {
    // تهيئة حالة اللعبة للجولة الجديدة
    this.state.game.currentLevelIdx = clamp(levelIndex, 0, CONFIG.LEVELS.length - 1);
    this.state.game.currentScore = CONFIG.STARTING_SCORE;
    this.state.game.wrongAnswers = 0;
    this.state.game.correctAnswers = 0;
    this.state.game.skips = 0;
    this.state.game.helpersUsed = { fifty: false, freeze: false, skipCount: 0 };
    this.state.game.questionIndex = 0;
    this.state.game.roundStartAt = Date.now();

    // تحديث واجهة اللاعب العلوية
    this.dom.playerAvatar.src = this.state.player.avatar || '';
    this.dom.playerName.textContent = this.state.player.name || 'لاعب';
    this.dom.playerId.textContent = this.state.player.playerId;

    // نقل إلى شاشة اللعب وبدء المستوى
    this.showScreen('game');
    this.startLevel();
  }

  startLevel() {
    const L = CONFIG.LEVELS[this.state.game.currentLevelIdx];
    document.body.setAttribute('data-level', L.key);
    this.dom.currentLevelBadge.textContent = L.label;

    // تحضير أسئلة المستوى
    const levelQuestions = (this.questions?.[L.key] || QUESTIONS_FALLBACK[L.key] || []).slice(0, L.count);
    const list = CONFIG.RANDOMIZE_QUESTIONS ? this.shuffle(levelQuestions) : levelQuestions.slice();
    this.state.game.shuffledQuestions = list;

    // إعادة ضبط مؤشرات الأسئلة والمساعدات الخاصة بالجولة
    this.state.game.questionIndex = 0;
    this.state.game.helpersUsed.fifty = false;
    this.state.game.helpersUsed.freeze = false;

    // تحديث مؤشرات واجهة تقدم المستوى (الدوائر أعلى)
    this.updateLevelIndicators();

    // إظهار أول سؤال
    this.renderQuestion();
  }

  updateLevelIndicators() {
    const indicators = this.$$('.level-indicator');
    indicators.forEach((el, idx) => {
      el.classList.toggle('active', idx === this.state.game.currentLevelIdx);
      el.classList.toggle('completed', idx < this.state.game.currentLevelIdx);
    });
  }

  // ===================================================================
  // 10) الأسئلة والمؤقّت
  // ===================================================================
  renderQuestion() {
    // هل انتهت أسئلة المستوى؟
    const Qs = this.state.game.shuffledQuestions;
    const i = this.state.game.questionIndex;
    if (i >= Qs.length) return this.onLevelComplete();

    const q = Qs[i];
    // عدّل ترتيب الخيارات إن لزم
    const correctText = q.options[q.correct];
    const options = CONFIG.RANDOMIZE_OPTIONS ? this.shuffle(q.options.slice()) : q.options.slice();

    // عنوان العداد
    this.dom.questionCounter.textContent = `السؤال ${i + 1} من ${Qs.length}`;
    // نص السؤال
    this.dom.questionText.textContent = q.q;

    // رسم الأزرار
    this.dom.optionsGrid.innerHTML = '';
    const frag = document.createDocumentFragment();
    options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.textContent = opt;
      b.dataset.correct = String(opt === correctText);
      frag.appendChild(b);
    });
    this.dom.optionsGrid.appendChild(frag);

    // تحديث إحصاءات الواجهة (نقاط/أخطاء/تكلفة التخطي)
    this.refreshHUD();

    // بدء المؤقّت لهذا السؤال
    this.startTimer();

    // حفظ وقت بدء السؤال
    this.state.game.questionStartAt = Date.now();
  }

  startTimer() {
    clearInterval(this.timer.interval);
    this.timer.frozen = false;
    this.timer.remaining = CONFIG.QUESTION_TIME;

    // شريط الزمن — إعادة ضبط الانتقال ثم تحريكه من 100% إلى 0%
    this.dom.timerBar.style.transition = 'none';
    this.dom.timerBar.style.width = '100%';
    void this.dom.timerBar.offsetWidth; // إعادة تهيئة
    this.dom.timerBar.style.transition = `width ${CONFIG.QUESTION_TIME}s linear`;
    this.dom.timerBar.style.width = '0%';

    this.dom.timerText.textContent = this.timer.remaining;

    this.timer.interval = setInterval(() => {
      if (this.timer.frozen) return; // مُجمّد مؤقتًا
      this.timer.remaining -= 1;
      this.dom.timerText.textContent = this.timer.remaining;
      if (this.timer.remaining <= 0) {
        clearInterval(this.timer.interval);
        // الوقت انتهى = إجابة خاطئة تلقائيًا
        this.toast('⏱️ انتهى الوقت!', 'error');
        // محاكاة زر خاطئ دون تغيير الـ DOM الحالي
        this.applyAnswerResult(false);
        // الانتقال للسؤال التالي أو إنهاء الجولة بعد مهلة وجيزة
        setTimeout(() => this.advanceAfterAnswer(), 1200);
      }
    }, 1000);
  }

  // ===================================================================
  // 11) التفاعل مع الإجابات وحساب النقاط
  // ===================================================================
  onAnswer(btnEl) {
    if (!btnEl || btnEl.classList.contains('disabled')) return;
    // قفل بقية الأزرار
    this.$$('.option-btn').forEach(b => b.classList.add('disabled'));

    const isCorrect = btnEl.dataset.correct === 'true';
    // تلوين الزر المحدد + إبراز الصحيح إن كانت الإجابة خاطئة
    if (isCorrect) {
      btnEl.classList.add('correct');
    } else {
      btnEl.classList.add('wrong');
      const correctBtn = this.dom.optionsGrid.querySelector('[data-correct="true"]');
      if (correctBtn) correctBtn.classList.add('correct');
    }

    // إيقاف المؤقّت
    clearInterval(this.timer.interval);

    // تطبيق نتيجة النقاط/الإحصاءات
    this.applyAnswerResult(isCorrect);

    // الانتقال للسؤال التالي أو إنهاء الجولة بعد 1.2ث تقريبًا
    setTimeout(() => this.advanceAfterAnswer(), 1200);
  }

  applyAnswerResult(isCorrect) {
    const g = this.state.game;

    if (isCorrect) {
      // +100 نقاط أساسية
      g.currentScore += CONFIG.POINT_CORRECT;
      g.correctAnswers += 1;

      // مكافأة السرعة إن أُجيب قبل نصف الوقت
      if (this.timer.remaining > Math.floor(CONFIG.QUESTION_TIME / 2)) {
        g.currentScore += CONFIG.SPEED_BONUS;
        this.toast(`إجابة صحيحة! +${CONFIG.POINT_CORRECT} (+${CONFIG.SPEED_BONUS} سرعة)`, 'success');
      } else {
        this.toast(`إجابة صحيحة! +${CONFIG.POINT_CORRECT}`, 'success');
      }
    } else {
      g.currentScore += CONFIG.POINT_WRONG; // -50
      g.wrongAnswers += 1;
      this.toast(`إجابة خاطئة! ${CONFIG.POINT_WRONG}`, 'error');
    }

    // تحديث واجهة الرؤوس
    this.refreshHUD();
  }

  advanceAfterAnswer() {
    const g = this.state.game;
    const isGameOver = g.wrongAnswers >= CONFIG.MAX_WRONG_ANSWERS && !(this.state.flags.dev && !this.state.flags.devTempDisabled);

    if (isGameOver) {
      return this.endGame(false); // لم يكمل كل المستويات
    }

    // سؤال جديد
    g.questionIndex += 1;
    this.renderQuestion();
  }

  refreshHUD() {
    const g = this.state.game;
    this.dom.scoreEl.textContent = formatNumber(g.currentScore);
    this.dom.wrongEl.textContent = `${g.wrongAnswers} / ${CONFIG.MAX_WRONG_ANSWERS}`;
    this.dom.skipCountEl.textContent = g.skips;

    const skipCost = CONFIG.HELPERS.skip.costByCount(g.helpersUsed.skipCount);
    this.dom.skipCostEl.textContent = `(${skipCost})`;

    // تفعيل/تعطيل أزرار المساعدات وفق القيود
    const Lkey = CONFIG.LEVELS[g.currentLevelIdx].key;
    const isImpossible = Lkey === 'impossible';

    this.$$('.helper-btn').forEach((b) => {
      const type = b.dataset.type;
      if (this.state.flags.dev && !this.state.flags.devTempDisabled) {
        b.disabled = false; return;
      }
      if (isImpossible && type !== 'skipQuestion') { b.disabled = true; return; }
      if (type === 'fiftyFifty') b.disabled = g.helpersUsed.fifty;
      if (type === 'freezeTime') b.disabled = g.helpersUsed.freeze;
      if (type === 'skipQuestion') b.disabled = false; // التخطي غير محدود
    });
  }

  // ===================================================================
  // 12) المساعدات (50:50 / تجميد / تخطي)
  // ===================================================================
  useFifty() {
    const g = this.state.game;
    if (!this.state.flags.dev && g.helpersUsed.fifty) return; // مرة واحدة فقط

    // إخفاء خيارين خاطئين عشوائيًا
    const wrong = this.$$('.option-btn:not([data-correct="true"])');
    if (wrong.length <= 1) return;
    this.shuffle(wrong).slice(0, 2).forEach(btn => btn.classList.add('hidden'));

    if (!this.state.flags.dev) g.helpersUsed.fifty = true;
    this.refreshHUD();
    this.toast('تم تفعيل 50:50 — حُذِف خياران خاطئان', 'info');
  }

  useFreeze() {
    const g = this.state.game;
    if (!this.state.flags.dev && g.helpersUsed.freeze) return; // مرة واحدة فقط

    this.timer.frozen = true;
    this.dom.timerBar.classList.add('frozen');
    setTimeout(() => {
      this.timer.frozen = false;
      this.dom.timerBar.classList.remove('frozen');
    }, 10_000); // 10 ثوانٍ

    if (!this.state.flags.dev) g.helpersUsed.freeze = true;
    this.refreshHUD();
    this.toast('تم تجميد الوقت 10 ثوانٍ ❄️', 'info');
  }

  useSkip() {
    const g = this.state.game;
    const cost = CONFIG.HELPERS.skip.costByCount(g.helpersUsed.skipCount);

    if (!(this.state.flags.dev && !this.state.flags.devTempDisabled)) {
      if (g.currentScore < cost) return this.toast('نقاطك غير كافية للتخطي', 'error');
      g.currentScore -= cost;
    }

    g.skips += 1;
    g.helpersUsed.skipCount += 1;
    clearInterval(this.timer.interval);

    // الانتقال مباشرة للسؤال التالي
    g.questionIndex += 1;
    this.refreshHUD();
    this.renderQuestion();
    this.toast(`تم التخطي −${cost} نقطة`, 'info');
  }

  // ===================================================================
  // 13) إكمال المستوى/اللعبة
  // ===================================================================
  onLevelComplete() {
    const L = CONFIG.LEVELS[this.state.game.currentLevelIdx];
    // تعبئة شاشة نهاية المستوى
    document.getElementById('levelCompleteTitle').textContent = `🎉 أكملت المستوى ${L.label}!`;
    document.getElementById('levelScore').textContent = formatNumber(this.state.game.currentScore);
    document.getElementById('levelErrors').textContent = this.state.game.wrongAnswers;
    document.getElementById('levelCorrect').textContent = this.state.game.correctAnswers;
    this.showScreen('levelDone');
  }

  nextLevel() {
    this.state.game.currentLevelIdx += 1;
    if (this.state.game.currentLevelIdx >= CONFIG.LEVELS.length) return this.endGame(true);
    this.showScreen('game');
    this.startLevel();
  }

  async endGame(completedAllLevels = false) {
    clearInterval(this.timer.interval);
    this.hideModal('confirmExit');

    const stats = this.computeFinalStats(completedAllLevels);

    // حفظ النتائج — إلا في جلسة المطوّر (اختياريًا نتخطى)
    let attemptNumber = 'DEV';
    if (!(this.state.flags.dev && !this.state.flags.devTempDisabled)) {
      const r = await this.persistResults(stats);
      if (r?.attemptNumber) attemptNumber = r.attemptNumber;
    }

    // عرض النتائج النهائية على الشاشة
    this.fillEndScreen({ ...stats, attemptNumber });
    this.showScreen('end');
  }

  computeFinalStats(completedAll) {
    const g = this.state.game; const p = this.state.player;
    const levelLabel = CONFIG.LEVELS[Math.min(g.currentLevelIdx, CONFIG.LEVELS.length - 1)].label;
    const totalTimeSec = Math.floor((Date.now() - g.roundStartAt) / 1000);
    const answered = g.correctAnswers + g.wrongAnswers;
    const accuracy = answered ? +( (g.correctAnswers / answered) * 100 ).toFixed(1) : 0;
    const avgTime = answered ? +( (totalTimeSec / answered).toFixed(1) ) : 0;

    const performance = (acc) => acc >= 90 ? 'ممتاز 🏆' : acc >= 75 ? 'جيد جدًا ⭐' : acc >= 60 ? 'جيد 👍' : acc >= 40 ? 'مقبول 👌' : 'يحتاج تحسين 📈';

    return {
      name: p.name,
      player_id: p.playerId,
      device_id: p.deviceId,
      avatar: p.avatar,
      correct_answers: g.correctAnswers,
      wrong_answers: g.wrongAnswers,
      skips: g.skips,
      score: g.currentScore,
      total_time: totalTimeSec,
      level: levelLabel,
      accuracy,
      avg_time: avgTime,
      performance_rating: performance(accuracy),
      completed_all: !!completedAll,
      used_fifty_fifty: g.helpersUsed.fifty,
      used_freeze_time: g.helpersUsed.freeze
    };
  }

  fillEndScreen(stats) {
    this.$('#finalName').textContent = stats.name;
    this.$('#finalId').textContent = stats.player_id;
    this.$('#finalAttemptNumber').textContent = stats.attemptNumber;
    this.$('#finalCorrect').textContent = stats.correct_answers;
    this.$('#finalWrong').textContent = stats.wrong_answers;
    this.$('#finalSkips').textContent = stats.skips;
    this.$('#finalScore').textContent = formatNumber(stats.score);
    this.$('#totalTime').textContent = toMinSec(stats.total_time);
    this.$('#finalLevel').textContent = stats.level;
    this.$('#finalAccuracy').textContent = `${stats.accuracy}%`;
    this.$('#finalAvgTime').textContent = `${toMinSec(stats.avg_time)} / سؤال`;
    this.$('#performanceText').textContent = stats.performance_rating;
  }

  // ===================================================================
  // 14) تخزين النتائج (Supabase) + إشعار عبر GAS
  // ===================================================================
  async persistResults(stats) {
    if (!this.supabase) return { error: 'Supabase not initialized' };

    try {
      // حساب رقم المحاولة لكل جهاز
      const { count, error: cErr } = await this.supabase
        .from('log')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', stats.device_id);
      if (cErr) throw cErr;
      const attemptNumber = (count || 0) + 1;

      // إدراج في جدول log
      const { error: iErr } = await this.supabase.from('log').insert({ ...stats, attempt_number: attemptNumber });
      if (iErr) throw iErr;

      // تحديث/إدراج في leaderboard (upsert)
      const isImpossibleFinisher = stats.completed_all && stats.level === 'مستحيل';
      const board = {
        device_id: stats.device_id,
        player_id: stats.player_id,
        name: stats.name,
        avatar: stats.avatar,
        score: stats.score,
        level: stats.level,
        accuracy: stats.accuracy,
        total_time: stats.total_time,
        avg_time: stats.avg_time,
        correct_answers: stats.correct_answers,
        wrong_answers: stats.wrong_answers,
        skips: stats.skips,
        attempt_number: attemptNumber,
        performance_rating: stats.performance_rating,
        is_impossible_finisher: isImpossibleFinisher
      };
      const { error: uErr } = await this.supabase.from('leaderboard').upsert(board);
      if (uErr) throw uErr;

      this.toast('تم حفظ نتيجتك بنجاح ✅', 'success');

      // إشعار بوتات تيليجرام عبر GAS (نتيجة + سجل)
      this.notifyAppsScript('gameResult', { ...stats, attempt_number: attemptNumber });

      return { attemptNumber };
    } catch (e) {
      console.error('persistResults error:', e);
      this.toast('فشل حفظ النتائج في السيرفر', 'error');
      return { error: e?.message };
    }
  }

  async notifyAppsScript(type, data) {
    if (!CONFIG.APPS_SCRIPT_URL) return;
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, secretKey: CONFIG.TEST_KEY })
      });
    } catch (e) {
      // في الوضع no-cors قد لا نستقبل استجابة — لا بأس
      console.warn('Apps Script notify issue:', e?.message);
    }
  }

  // ===================================================================
  // 15) لوحة الصدارة (قراءة + تفاصيل + Realtime/تحديث دوري)
  // ===================================================================
  async openLeaderboard() {
    this.showScreen('leaderboard');
    this.dom.leaderboardContent.innerHTML = '<div class="spinner" aria-hidden="true"></div>';

    await this.loadLeaderboard();

    // اشتراك Realtime (إن أمكن)، وإلا فالتحديث الدوري
    this.subscribeLeaderboardRealtime();
    // تحديث دوري كضمان
    if (!this._pollTimer) this._pollTimer = setInterval(() => this.loadLeaderboard(), CONFIG.POLL_LEADERBOARD_MS);
  }

  async loadLeaderboard() {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('*')
        .order('is_impossible_finisher', { ascending: false })
        .order('score', { ascending: false })
        .order('accuracy', { ascending: false })
        .order('total_time', { ascending: true })
        .limit(100);
      if (error) throw error;
      this.renderLeaderboard(data || []);
    } catch (e) {
      console.error('loadLeaderboard error:', e);
      this.dom.leaderboardContent.innerHTML = '<p>حدث خطأ في تحميل لوحة الصدارة.</p>';
    }
  }

  renderLeaderboard(players) {
    if (!players?.length) {
      this.dom.leaderboardContent.innerHTML = '<p>لوحة الصدارة فارغة حاليًا!</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'leaderboard-list';

    let rank = 1; const medal = ['🥇','🥈','🥉'];
    players.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';

      let rankDisplay = rank; // رقم عادي
      if (p.is_impossible_finisher) {
        li.classList.add('impossible-finisher');
        rankDisplay = '🎖️';
      } else if (rank <= 3) {
        li.classList.add(`rank-${rank}`);
        rankDisplay = medal[rank - 1];
      }

      li.innerHTML = `
        <span class="leaderboard-rank">${rankDisplay}</span>
        <img class="leaderboard-avatar" src="${p.avatar || ''}" alt="صورة ${p.name || ''}" style="visibility:${p.avatar ? 'visible':'hidden'}">
        <div class="leaderboard-details">
          <span class="leaderboard-name">${p.name || 'غير معروف'}</span>
          <span class="leaderboard-score">${formatNumber(p.score || 0)}</span>
        </div>`;

      li.addEventListener('click', () => this.openPlayerDetails(p));
      ul.appendChild(li);

      if (!p.is_impossible_finisher) rank += 1;
    });

    this.dom.leaderboardContent.innerHTML = '';
    this.dom.leaderboardContent.appendChild(ul);
  }

  subscribeLeaderboardRealtime() {
    try {
      if (this.leaderboardChannel) { this.leaderboardChannel.unsubscribe(); this.leaderboardChannel = null; }
      this.leaderboardChannel = this.supabase
        .channel('public:leaderboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => this.loadLeaderboard())
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscribe failed:', e?.message);
    }
  }

  async openPlayerDetails(row) {
    // جلب تفاصيل المحاولات من جدول log حسب player_id
    try {
      const { data, error } = await this.supabase
        .from('log')
        .select('*')
        .eq('player_id', row.player_id)
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) throw error;

      // تعبئة رأس النافذة
      this.dom.detailsName.textContent = row.name || 'غير معروف';
      this.dom.detailsPlayerId.textContent = row.player_id || 'N/A';
      this.dom.detailsAvatar.src = row.avatar || '';
      this.dom.detailsAvatar.style.visibility = row.avatar ? 'visible' : 'hidden';

      // إنشاء شبكة تفاصيل مبسطة من آخر محاولة + المتوسطات
      const latest = data?.[0];
      const body = [];
      body.push(`<div class="detail-item"><span class="label">⭐ النقاط النهائية</span><span class="value score">${formatNumber(row.score||0)}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">👑 المستوى</span><span class="value">${row.level||'N/A'}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">✅ الصحيحة</span><span class="value">${formatNumber(row.correct_answers||0)}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">❌ الخاطئة</span><span class="value">${formatNumber(row.wrong_answers||0)}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">⏱️ الوقت</span><span class="value">${toMinSec(row.total_time||0)}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">⏳ المتوسط</span><span class="value">${toMinSec(row.avg_time||0)}/س</span></div>`);
      body.push(`<div class="detail-item full-width"><span class="label">🎯 نسبة الدقة</span><span class="value">${row.accuracy || 0}%</span><div class="progress-bar-container"><div class="progress-bar" style="width:${row.accuracy||0}%"></div></div></div>`);
      body.push(`<div class="detail-item"><span class="label">⏭️ التخطي</span><span class="value">${formatNumber(row.skips||0)}</span></div>`);
      body.push(`<div class="detail-item"><span class="label">🔢 المحاولة</span><span class="value">${formatNumber(row.attempt_number||latest?.attempt_number||0)}</span></div>`);
      body.push(`<div class="detail-item full-width"><span class="label">📊 الأداء</span><span class="value">${row.performance_rating||latest?.performance_rating||'جيد'}</span></div>`);

      this.dom.detailsBody.innerHTML = body.join('');
      this.showModal('playerDetails');
    } catch (e) {
      console.error('openPlayerDetails error:', e);
      this.toast('تعذّر تحميل تفاصيل اللاعب', 'error');
    }
  }

  // ===================================================================
  // 16) التقارير (Reports)
  // ===================================================================
  async onReportSubmit(e) {
    e.preventDefault();
    const fd = new FormData(this.dom.reportForm);

    // تجميع بيانات تقنية خفيفة للمساعدة في التشخيص
    const deviceHints = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language,
      time: new Date().toISOString(),
      currentQuestion: this.dom.questionText?.textContent || 'N/A',
      timerRemaining: this.timer.remaining,
      lastWrong: this.state.game.wrongAnswers,
      level: CONFIG.LEVELS[this.state.game.currentLevelIdx]?.label
    };

    const data = {
      type: fd.get('problemType'),
      description: fd.get('problemDescription'),
      name: this.state.player.name || 'لم يبدأ اللعب',
      player_id: this.state.player.playerId || 'N/A',
      question_text: this.dom.questionText?.textContent || 'لا يوجد',
      device_hints: deviceHints
    };

    this.toast('جاري إرسال البلاغ...', 'info');
    this.hideModal('report');

    try {
      // حفظ في جدول reports
      const { error } = await this.supabase.from('reports').insert({
        name: data.name,
        player_id: data.player_id,
        type: data.type,
        description: `${data.description}\n\nHints: ${JSON.stringify(deviceHints)}`,
        question_text: data.question_text
      });
      if (error) throw error;

      // إشعار عبر GAS
      this.notifyAppsScript('report', data);

      this.toast('تم إرسال بلاغك بنجاح. شكرًا لك! ✅', 'success');
      this.dom.reportForm.reset();
    } catch (err) {
      console.error('report submit error:', err);
      this.toast('حدث خطأ أثناء إرسال البلاغ', 'error');
    }
  }

  // ===================================================================
  // 17) مشاركة النتائج
  // ===================================================================
  shareText() {
    const score = this.$('#finalScore').textContent;
    const level = this.$('#finalLevel').textContent;
    const perf  = this.$('#performanceText').textContent;
    return `🏆 لقد حصلت على ${score} نقطة في مسابقة المعلومات!\n\nوصلت إلى المستوى: ${level}\nتقييم الأداء: ${perf}\n`;
  }

  shareOnX() {
    const text = `${this.shareText()}\n🔗 تحداني الآن!\n${location.href}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  copyForInstagram() {
    const text = this.shareText();
    navigator.clipboard.writeText(text)
      .then(() => this.toast('تم نسخ النص — الصقه في قصة/منشور إنستغرام ✨', 'success'))
      .catch(() => this.toast('تعذّر نسخ النص', 'error'));
  }

  // ===================================================================
  // 18) تحميل الأسئلة
  // ===================================================================
  async loadQuestions() {
    try {
      const res = await fetch(CONFIG.QUESTIONS_SRC, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.questions = await res.json();
    } catch (e) {
      console.warn('loadQuestions fallback used:', e?.message);
      this.questions = QUESTIONS_FALLBACK;
    }
  }

  // ===================================================================
  // 19) أدوات متفرقة
  // ===================================================================
  shuffle(arr) {
    // نسخة في-المكان (Fisher–Yates)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// =======================================================================
// 20) تشغيل اللعبة بعد تحميل الـ DOM
// =======================================================================
window.addEventListener('DOMContentLoaded', () => {
  // ضمان وجود الثيم من أول لحظة (يُضبط أيضًا بسكربت في index.html قبل الرسم)
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  // إنشاء وتشغيل اللعبة
  window.__QUIZ__ = new QuizGame();
});
