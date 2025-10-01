/*
 * ملف وظائف ومنطق لعبة مسابقة المعلومات (Script.js)
 * يحتوي على إدارة الحالة، منطق اللعب، ومعالجة نداءات API.
 */

// --------------------------------------
// 1. الثوابت والتكوينات
// --------------------------------------

// معلومات Supabase و Google App Script
// يجب نقل هذه إلى متغيرات بيئة (ENV) في تطبيق حقيقي
const CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://qffcnljopolajeufkrah.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24zMF281oYeaaeIEQM0aKkUg',
    // Google App Script
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec',
    TEST_KEY: 'AbuQusay', // مفتاح سري بسيط للتواصل مع GAS
    DEV_MODE: false, // وضع المطوّر مغلق افتراضياً
    DEV_PASSWORD: 'admin' // كلمة مرور افتراضية لوضع المطوّر
};

// تسلسل المستويات
const LEVEL_SEQUENCE = ["easy", "medium", "hard", "impossible"];
const MAX_ERRORS = 3;
const QUESTION_TIME_LIMIT = 30; // ثانية

// ربط Supabase (يتم استيراد المكتبة عبر CDN في بيئة الإنتاج)
// في هذه البيئة، سنعتمد على دالة مساعدة لنداءات Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// --------------------------------------
// 2. إدارة الحالة (State Management)
// --------------------------------------

const initialState = {
    // حالة اللاعب
    player: {
        name: '',
        avatar: '1', // رقم الصورة الرمزية الافتراضي
        playerId: crypto.randomUUID(), // معرف فريد للاعب/الجلسة
        deviceId: 'DEVICE-' + crypto.randomUUID().substring(0, 8), // معرف جهاز بسيط
    },
    // حالة اللعب
    game: {
        allQuestions: {}, // سيتم تحميلها من questions.json
        currentLevelIndex: 0,
        currentScore: 0,
        wrongAnswers: 0,
        correctAnswers: 0,
        skips: 0,
        totalTime: 0, // الوقت الإجمالي المستغرق
        questionStartTime: 0, // وقت بدء السؤال الحالي
        helpersUsed: {
            fifty: false,
            freeze: false,
            skipCount: 0, // عدد مرات استخدام التخطي
        },
        questionIndex: 0, // مؤشر السؤال الحالي في المستوى
        timer: null, // مؤقت اللعب
        isFrozen: false,
    },
    // حالة الواجهة
    ui: {
        currentScreen: 'loader',
        activeModal: null, // 'confirm', 'report', 'dev-pass', 'player-details', 'level-select'
        theme: localStorage.getItem('theme') || 'dark', // حفظ الاختيار
    }
};

let state = JSON.parse(JSON.stringify(initialState)); // نسخة عميقة للحالة

// --------------------------------------
// 3. الدوال المساعدة (Utility Functions)
// --------------------------------------

// حساب تكلفة التخطي
const skipCost = (skipCount) => 20 + skipCount * 20;

// تحويل الثواني إلى دقيقة:ثانية
const toMinSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60 | 0;
    return `${m}:${String(s).padStart(2, '0')}`;
};

// التحقق من صلاحية الاسم
const validateNameInput = (n) => n.length >= 2 && n.length <= 25;

// تنظيف المدخلات
const sanitizeInput = (s) => s.replace(/[<>]/g, '').trim();

// تحديث شارة تكلفة التخطي
const updateSkipCostBadge = () => {
    const cost = skipCost(state.game.helpersUsed.skipCount);
    document.getElementById('skip-cost-badge').textContent = `-${cost} نقطة`;
};

// جلب السؤال الحالي
const getCurrentQuestion = () => {
    const levelName = LEVEL_SEQUENCE[state.game.currentLevelIndex];
    const index = state.game.questionIndex;
    return state.game.allQuestions[levelName]?.[index];
};

// --------------------------------------
// 4. وظائف الواجهة (UI/UX)
// --------------------------------------

// تبديل الشاشة النشطة
const switchScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    state.ui.currentScreen = screenId.replace('-screen', '');
};

// تحديث الوضع المظلم/الفاتح
const updateThemeUI = () => {
    const isDark = state.ui.theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.documentElement.classList.toggle('theme-light', !isDark);
    const icon = document.getElementById('theme-toggle-btn').querySelector('i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', state.ui.theme);
};

// عرض/إخفاء النافذة المنبثقة
const showModal = (modalType, title, body, confirmText = 'تأكيد', cancelText = 'إلغاء', inputsHTML = '') => {
    const modalOverlay = document.getElementById('general-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;

    const inputsContainer = document.getElementById('modal-inputs');
    inputsContainer.innerHTML = inputsHTML;
    
    document.getElementById('modal-btn-confirm').textContent = confirmText;
    document.getElementById('modal-btn-cancel').textContent = cancelText;

    modalOverlay.classList.add('active');
    state.ui.activeModal = modalType;

    // إخفاء زر الإلغاء إذا لم يكن مطلوباً
    document.getElementById('modal-btn-cancel').style.display = cancelText ? 'inline-flex' : 'none';
};

const hideModal = () => {
    document.getElementById('general-modal-overlay').classList.remove('active');
    state.ui.activeModal = null;
    document.getElementById('modal-inputs').innerHTML = ''; // تنظيف حقول الإدخال
};

// --------------------------------------
// 5. وظائف اللعب الأساسية
// --------------------------------------

// تحميل الأسئلة من ملف JSON
const loadQuestions = async () => {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        state.game.allQuestions = data;
        // بعد التحميل بنجاح، ننتقل من شاشة اللودر
        switchScreen('start-screen');
    } catch (error) {
        console.error('خطأ في تحميل الأسئلة:', error);
        document.getElementById('loader').innerHTML = `<p style="color: var(--color-wrong);">خطأ في تحميل بيانات اللعبة. الرجاء المحاولة لاحقاً.</p>`;
    }
};

// بدء لعبة جديدة (إعادة تعيين الحالة)
const startNewGame = () => {
    const playerInfo = state.player; // نحتفظ ببيانات اللاعب
    state = JSON.parse(JSON.stringify(initialState)); // إعادة تعيين الحالة
    state.player = playerInfo; // استعادة بيانات اللاعب
    state.ui.theme = localStorage.getItem('theme') || 'dark'; // استعادة الثيم

    // إعادة تعيين بيانات اللعبة
    state.game.allQuestions = state.game.allQuestions; // الاحتفاظ بالأسئلة المحملة
    state.game.currentLevelIndex = 0;
    state.game.questionIndex = 0;
    
    // تحديث الواجهة
    updateThemeUI();
    updateSkipCostBadge();
    switchScreen('instructions-screen');
};

// تحديث حالة شريط اللعب (نقاط، أخطاء)
const updateGameStatusUI = () => {
    const currentLevelName = LEVEL_SEQUENCE[state.game.currentLevelIndex];
    document.getElementById('level-info').textContent = `المستوى: ${currentLevelName === 'easy' ? 'سهل' : currentLevelName === 'medium' ? 'متوسط' : currentLevelName === 'hard' ? 'صعب' : 'مستحيل'}`;
    document.getElementById('score-display').textContent = `النقاط: ${state.game.currentScore}`;
    document.getElementById('errors-display').innerHTML = `<i class="fas fa-heart"></i> ${MAX_ERRORS - state.game.wrongAnswers}`;
};

// بدء تشغيل المؤقت (Timer)
let timeRemaining = QUESTION_TIME_LIMIT;
const startTimer = () => {
    clearInterval(state.game.timer);
    timeRemaining = QUESTION_TIME_LIMIT;
    state.game.questionStartTime = Date.now();

    const updateTimer = () => {
        if (state.game.isFrozen) {
            return; // لا نعد إذا كان الوقت مجمداً
        }
        
        const progressElement = document.getElementById('timer-progress');
        
        if (timeRemaining <= 0) {
            clearInterval(state.game.timer);
            // انتهاء الوقت يعتبر إجابة خاطئة
            handleAnswer(-1, true); // استخدام مؤشر إجابة خاطئ
            return;
        }

        timeRemaining -= 0.1; // تحديث كل 100 مللي ثانية لدقة المؤقت
        
        const percentage = (timeRemaining / QUESTION_TIME_LIMIT) * 100;
        progressElement.style.width = `${percentage}%`;

        // تغيير لون الشريط مع اقتراب الوقت
        if (percentage < 30) {
            progressElement.style.backgroundColor = 'var(--level-impossible)';
        } else if (percentage < 60) {
            progressElement.style.backgroundColor = 'var(--level-hard)';
        } else {
            progressElement.style.backgroundColor = 'var(--level-medium)';
        }
    };
    
    state.game.timer = setInterval(updateTimer, 100);
};

// عرض السؤال الحالي
const renderQuestion = () => {
    const question = getCurrentQuestion();
    if (!question) {
        // إذا لم يكن هناك سؤال، نذهب لنهاية المستوى أو اللعبة
        endLevel();
        return;
    }

    // إعادة ضبط الأزرار
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // تنظيف الخيارات السابقة

    document.getElementById('question-text').textContent = question.q;

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.dataset.index = index;
        button.textContent = option;
        button.addEventListener('click', () => handleAnswer(index));
        optionsContainer.appendChild(button);
    });

    // تفعيل أزرار المساعدات
    document.getElementById('helper-50-50').disabled = state.game.helpersUsed.fifty;
    document.getElementById('helper-freeze').disabled = state.game.helpersUsed.freeze;
    document.getElementById('helper-skip').disabled = false; // التخطي متاح دائماً إذا كانت النقاط كافية

    updateGameStatusUI();
    startTimer();
    updateSkipCostBadge();
};

// معالجة الإجابة (أو انتهاء الوقت)
const handleAnswer = (selectedIndex, isTimeout = false) => {
    clearInterval(state.game.timer); // إيقاف المؤقت فوراً
    
    const questionEndTime = Date.now();
    const timeTaken = (questionEndTime - state.game.questionStartTime) / 1000;
    const isCorrect = !isTimeout && selectedIndex === getCurrentQuestion().correct;
    
    state.game.totalTime += timeTaken;
    
    // تعطيل جميع الأزرار لمنع النقر المزدوج
    document.querySelectorAll('#options-container .option-btn').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        // إجابة صحيحة
        state.game.correctAnswers++;
        state.game.currentScore += 100;
        
        // مكافأة السرعة (قبل نصف الوقت)
        if (timeTaken <= (QUESTION_TIME_LIMIT / 2)) {
            state.game.currentScore += 50;
        }

        // تلوين الزر الصحيح
        document.querySelector(`.option-btn[data-index="${selectedIndex}"]`).classList.add('correct');
        
    } else {
        // إجابة خاطئة أو انتهاء الوقت
        state.game.wrongAnswers++;
        state.game.currentScore -= 50;
        if (state.game.currentScore < 0) state.game.currentScore = 0; // النقاط لا تكون سالبة

        if (!isTimeout) {
            // تلوين الزر الخاطئ الذي تم اختياره
            document.querySelector(`.option-btn[data-index="${selectedIndex}"]`).classList.add('wrong');
        }
        
        // إظهار الإجابة الصحيحة
        const correctIndex = getCurrentQuestion().correct;
        document.querySelector(`.option-btn[data-index="${correctIndex}"]`).classList.add('correct');
    }

    updateGameStatusUI();

    if (state.game.wrongAnswers >= MAX_ERRORS) {
        // انتهت اللعبة بسبب الأخطاء
        setTimeout(endGame, 1500);
    } else {
        // الانتقال للسؤال التالي
        state.game.questionIndex++;
        setTimeout(renderQuestion, 1500); // 1.5 ثانية لإظهار النتيجة
    }
};

// إنهاء المستوى
const endLevel = () => {
    clearInterval(state.game.timer);
    
    if (state.game.currentLevelIndex === LEVEL_SEQUENCE.length - 1) {
        // إذا كان المستوى الأخير، نذهب للنتائج النهائية مباشرة
        endGame(true);
        return;
    }

    const nextLevelName = LEVEL_SEQUENCE[state.game.currentLevelIndex + 1];
    
    document.getElementById('current-total-score').textContent = state.game.currentScore;
    document.getElementById('level-end-message').textContent = `لقد أكملت المستوى "${LEVEL_SEQUENCE[state.game.currentLevelIndex]}". هل أنت مستعد للانتقال إلى المستوى التالي: "${nextLevelName}"؟`;

    switchScreen('level-end-screen');
};

// الانتقال للمستوى التالي
const startNextLevel = () => {
    // إعادة تعيين المساعدات لكل جولة (مستوى)
    state.game.helpersUsed.fifty = false;
    state.game.helpersUsed.freeze = false;
    
    // التقدم في المستوى والسؤال
    state.game.currentLevelIndex++;
    state.game.questionIndex = 0;
    
    switchScreen('quiz-game-screen');
    renderQuestion();
};

// إنهاء اللعبة (الانسحاب أو انتهاء الأخطاء/المستويات)
const endGame = (completedImpossible = false) => {
    clearInterval(state.game.timer);

    // حساب الإحصائيات النهائية
    const totalQuestions = state.game.correctAnswers + state.game.wrongAnswers + state.game.skips;
    const accuracy = totalQuestions > 0 ? ((state.game.correctAnswers / totalQuestions) * 100).toFixed(2) : 0;
    const avgTime = state.game.correctAnswers > 0 ? (state.game.totalTime / state.game.correctAnswers).toFixed(2) : 0;
    const finalLevel = LEVEL_SEQUENCE[state.game.currentLevelIndex];

    const performance = state.game.wrongAnswers >= MAX_ERRORS ? 'ضعيف' : completedImpossible ? 'خارق' : state.game.currentScore > 1000 ? 'جيد جداً' : 'متوسط';

    const results = {
        name: state.player.name,
        playerId: state.player.playerId,
        deviceId: state.player.deviceId,
        attemptId: crypto.randomUUID(),
        correctAnswers: state.game.correctAnswers,
        wrongAnswers: state.game.wrongAnswers,
        skips: state.game.skips,
        finalScore: state.game.currentScore,
        totalTime: state.game.totalTime,
        finalLevel: finalLevel,
        accuracy: accuracy,
        avgTime: avgTime,
        performance: performance,
        completedImpossible: completedImpossible
    };
    
    // حفظ السجل أولاً
    saveGameLog(results);

    // عرض النتائج
    renderFinalResults(results);
    switchScreen('final-results-screen');
};

// عرض النتائج النهائية
const renderFinalResults = (results) => {
    const detailsDiv = document.getElementById('results-details');
    detailsDiv.innerHTML = `
        <p><strong>الاسم:</strong> ${results.name}</p>
        <p><strong>المعرّف:</strong> ${results.playerId}</p>
        <p><strong>رقم المحاولة:</strong> ${results.attemptId.substring(0, 8)}</p>
        <hr style="margin: 5px 0; border-color: var(--color-bg);">
        <p><strong>الإجابات الصحيحة:</strong> <span style="color: var(--color-correct);">${results.correctAnswers}</span></p>
        <p><strong>الإجابات الخاطئة:</strong> <span style="color: var(--color-wrong);">${results.wrongAnswers}</span></p>
        <p><strong>مرات التخطي:</strong> ${results.skips}</p>
        <p style="font-size: 1.5rem; font-weight: bold; margin-top: 10px;"><strong>النقاط النهائية:</strong> <span style="color: var(--color-accent);">${results.finalScore}</span></p>
        <hr style="margin: 5px 0; border-color: var(--color-bg);">
        <p><strong>الوقت المستغرق (د:ث):</strong> ${toMinSec(results.totalTime)}</p>
        <p><strong>المستوى الذي وصلت إليه:</strong> ${results.finalLevel}</p>
        <p><strong>نسبة الدقة:</strong> ${results.accuracy}%</p>
        <p><strong>متوسط وقت الإجابة (د.ث):</strong> ${results.avgTime}</p>
        <p><strong>أداؤك:</strong> <span style="font-weight: bold;">${results.performance}</span></p>
    `;

    // تخزين بيانات المشاركة مؤقتاً
    window.lastResults = results;
};


// --------------------------------------
// 6. وظائف المساعدات (Helpers)
// --------------------------------------

const useFiftyFifty = () => {
    if (state.game.helpersUsed.fifty) return;

    const question = getCurrentQuestion();
    if (!question) return;

    const correctIndex = question.correct;
    const options = [0, 1, 2, 3];
    
    // اختيار خيارين خاطئين لحذفهما
    const wrongOptions = options.filter(i => i !== correctIndex);
    
    // خلط الخيارات الخاطئة واختيار اثنين فقط للحذف
    wrongOptions.sort(() => 0.5 - Math.random()); 
    const optionsToDisable = wrongOptions.slice(0, 2); 

    optionsToDisable.forEach(index => {
        const btn = document.querySelector(`.option-btn[data-index="${index}"]`);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('disabled');
        }
    });

    state.game.helpersUsed.fifty = true;
    document.getElementById('helper-50-50').disabled = true;
};

const useFreeze = () => {
    if (state.game.helpersUsed.freeze) return;

    state.game.isFrozen = true;
    document.getElementById('timer-progress').style.backgroundColor = 'var(--level-medium)'; // لون التجميد

    // إيقاف التجميد بعد 10 ثواني
    setTimeout(() => {
        state.game.isFrozen = false;
    }, 10000); // 10 ثواني

    state.game.helpersUsed.freeze = true;
    document.getElementById('helper-freeze').disabled = true;
};

const useSkip = () => {
    const cost = skipCost(state.game.helpersUsed.skipCount);
    
    if (state.game.currentScore < cost) {
        showModal('info', 'نقاط غير كافية', `لا يمكنك تخطي السؤال! تحتاج إلى ${cost} نقطة. نقاطك الحالية: ${state.game.currentScore}`);
        return;
    }

    state.game.currentScore -= cost;
    state.game.skips++;
    state.game.helpersUsed.skipCount++;
    
    // إنهاء المؤقت وإعادة ضبطه للسؤال التالي
    clearInterval(state.game.timer);
    
    state.game.questionIndex++;
    updateSkipCostBadge();
    
    // عرض رسالة تخطي ثم السؤال الجديد
    document.getElementById('question-text').textContent = 'تم تخطي السؤال... جاري تحميل السؤال التالي.';
    
    setTimeout(() => {
        switchScreen('quiz-game-screen'); // التأكد من البقاء في شاشة اللعب
        renderQuestion();
    }, 1000);
};

// --------------------------------------
// 7. خدمات API (Supabase & GAS)
// --------------------------------------

// إرسال البيانات إلى Google App Script
const sendToGas = async (type, payload) => {
    try {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: type, // 'gameResult', 'report', 'log'
                secretKey: CONFIG.TEST_KEY,
                data: payload
            })
        });
        const result = await response.json();
        if (result.error) {
            console.error('GAS Error:', result.error);
        }
        return result;
    } catch (error) {
        console.error('خطأ في الاتصال بسكربت التطبيقات:', error);
        return { success: false, error: error.message };
    }
};

// حفظ سجل اللعبة (Game Log)
const saveGameLog = async (results) => {
    // 1. إرسال سجل مفصل للبوت عبر GAS
    const logPayload = {
        ...results,
        // تحويل الحقول إلى نص للسجل كما في الوثيقة
        time_min_sec: toMinSec(results.totalTime),
        is_50_50_used: state.game.helpersUsed.fifty ? 'نعم' : 'لا',
        is_freeze_used: state.game.helpersUsed.freeze ? 'نعم' : 'لا',
    };
    sendToGas('log', logPayload);
    sendToGas('gameResult', logPayload); // يمكن أن يرسل نفس البوت أو بوت آخر

    // 2. إدراج في game_logs و leaderboard في Supabase
    try {
        // إدراج السجل المفصل
        await supabase.from('game_logs').insert([
            {
                player_id: results.playerId,
                device_id: results.deviceId,
                player_name: results.name,
                final_score: results.finalScore,
                correct_answers: results.correctAnswers,
                wrong_answers: results.wrongAnswers,
                skips: results.skips,
                total_time: results.totalTime,
                final_level: results.finalLevel,
                is_50_50_used: state.game.helpersUsed.fifty,
                is_freeze_used: state.game.helpersUsed.freeze
            }
        ]);

        // تحديث لوحة الصدارة (upsert)
        await supabase.from('leaderboard').upsert([
            {
                player_id: results.playerId,
                player_name: results.name,
                avatar: state.player.avatar,
                score: results.finalScore,
                final_level: results.finalLevel,
                accuracy: results.accuracy,
                completed_impossible: results.completedImpossible
            }
        ], { onConflict: 'player_id', ignoreDuplicates: false });


    } catch (error) {
        console.error('خطأ في حفظ البيانات في Supabase:', error);
    }
};

// جلب وتحديث لوحة الصدارة
const fetchLeaderboard = async (filter = 'all') => {
    const listElement = document.getElementById('leaderboard-list');
    listElement.innerHTML = '<p id="leaderboard-loading">جارِ تحميل لوحة الصدارة...</p>';
    
    try {
        let query = supabase
            .from('leaderboard')
            .select('player_name, avatar, score, final_level, accuracy, updated_at, player_id')
            .order('score', { ascending: false });

        if (filter === 'top10') {
            query = query.limit(10);
        } else if (filter === 'impossible') {
            query = query.eq('completed_impossible', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        listElement.innerHTML = ''; // تنظيف شريط التحميل

        if (data && data.length > 0) {
            data.forEach((player, index) => {
                const li = document.createElement('li');
                li.className = 'leaderboard-item';
                li.dataset.playerId = player.player_id;
                
                // تحديد الشارات الخاصة بالفلتر الحالي
                let rankText;
                if(filter === 'all' || filter === 'top10') {
                    rankText = `#${index + 1}`;
                } else if (filter === 'impossible') {
                    rankText = '👑';
                }

                li.innerHTML = `
                    <span class="leaderboard-rank">${rankText}</span>
                    <img src="https://placehold.co/40x40/3b82f6/ffffff?text=${player.avatar}" alt="صورة رمزية" class="leaderboard-avatar">
                    <div class="leaderboard-info">
                        <strong>${player.player_name}</strong>
                        <span class="text-sm">المستوى: ${player.final_level}</span>
                    </div>
                    <span class="leaderboard-score">${player.score}</span>
                `;
                listElement.appendChild(li);

                // إضافة مستمع لفتح تفاصيل اللاعب
                li.addEventListener('click', () => showPlayerDetails(player.player_id));
            });
        } else {
            listElement.innerHTML = '<p>لا يوجد مشاركون في هذه القائمة حالياً.</p>';
        }

    } catch (error) {
        console.error('خطأ في جلب لوحة الصدارة:', error);
        listElement.innerHTML = `<p style="color: var(--color-wrong);">حدث خطأ أثناء جلب البيانات: ${error.message}</p>`;
    }
};

// عرض تفاصيل اللاعب (يجب أن يجلب السجلات من Supabase)
const showPlayerDetails = async (playerId) => {
    showModal('player-details', 'تفاصيل اللاعب', 'جارِ تحميل سجلات اللاعب...', 'إغلاق', null);
    
    try {
        const { data: logs, error } = await supabase
            .from('game_logs')
            .select('*') // جلب كل السجلات
            .eq('player_id', playerId)
            .order('created_at', { ascending: false })
            .limit(10); // عرض آخر 10 محاولات

        if (error) throw error;

        // جلب اسم اللاعب مرة واحدة
        const playerName = logs.length > 0 ? logs[0].player_name : 'لاعب غير معروف';

        let htmlContent = `<h3>${playerName}</h3><p class="text-sm">المعرف: ${playerId}</p>`;

        if (logs.length === 0) {
            htmlContent += '<p style="margin-top: 10px;">لا توجد سجلات لعب لهذا اللاعب.</p>';
        } else {
            htmlContent += '<ul style="list-style: none; padding: 0; margin-top: 15px;">';
            logs.forEach((log, index) => {
                htmlContent += `
                    <li style="border-bottom: 1px solid var(--color-secondary); padding: 5px 0;">
                        <span style="font-weight: bold;">#${logs.length - index}</span>: 
                        <span style="color: var(--level-easy);">${log.final_score} نقطة</span>
                        وصل إلى ${log.final_level} |
                        الوقت: ${toMinSec(log.total_time)} |
                        بتاريخ: ${new Date(log.created_at).toLocaleDateString('ar-EG')}
                    </li>
                `;
            });
            htmlContent += '</ul>';
        }
        
        document.getElementById('modal-body').innerHTML = htmlContent;
        document.getElementById('modal-btn-confirm').textContent = 'إغلاق';
        document.getElementById('modal-btn-cancel').style.display = 'none';

    } catch (e) {
        document.getElementById('modal-body').textContent = `حدث خطأ أثناء تحميل التفاصيل: ${e.message}`;
    }
    
    // إعادة تعيين الإجراء بعد تحميل التفاصيل
    document.getElementById('modal-btn-confirm').onclick = hideModal;
};


// --------------------------------------
// 8. المعالجات الرئيسية (Event Handlers)
// --------------------------------------

// الإبلاغ عن السؤال
const reportQuestion = () => {
    const question = getCurrentQuestion();
    if (!question) return;

    const inputsHTML = `
        <select id="report-type-input" class="input-text" style="margin-top: 10px; margin-bottom: 10px;">
            <option value="سؤال غير واضح">سؤال غير واضح</option>
            <option value="إجابة خاطئة">إجابة خاطئة</option>
            <option value="خطأ تقني">خطأ تقني</option>
            <option value="مشكلة مؤقت">مشكلة مؤقت</option>
            <option value="مشكلة عرض/لغة">مشكلة عرض/لغة</option>
            <option value="أخرى">أخرى (يرجى التوضيح)</option>
        </select>
        <textarea id="report-details-input" class="input-text" rows="3" placeholder="أدخل تفاصيل إضافية (اختياري)"></textarea>
    `;

    showModal('report', 'إبلاغ عن السؤال', `هل أنت متأكد من الإبلاغ عن السؤال رقم ${state.game.questionIndex + 1}؟`, 'إرسال البلاغ', 'إلغاء', inputsHTML);
    
    document.getElementById('modal-btn-confirm').onclick = async () => {
        const reportType = document.getElementById('report-type-input').value;
        const reportDetails = document.getElementById('report-details-input').value;

        const reportPayload = {
            question: question.q,
            question_id: question.level_id,
            report_type: reportType,
            details: reportDetails,
            player_id: state.player.playerId,
            player_name: state.player.name,
            device_info: navigator.userAgent, // اكتشاف تلقائي
            screen_resolution: `${window.screen.width}x${window.screen.height}`
        };

        // إرسال البلاغ إلى GAS
        await sendToGas('report', reportPayload);
        hideModal();
        showModal('info', 'تم الإرسال', 'شكراً لك، تم إرسال بلاغك وسيتم مراجعته.', 'موافق', null);
    };
    document.getElementById('modal-btn-cancel').onclick = hideModal;
};

// تفعيل وضع المطوّر
const checkDevModePassword = () => {
    const inputsHTML = `<input type="password" id="dev-pass-input" class="input-text" placeholder="كلمة مرور المطوّر">`;
    showModal('dev-pass', 'وضع المطوّر', 'أدخل كلمة مرور المطوّر لتجاوز تسلسل اللعب.', 'دخول', 'إلغاء', inputsHTML);

    document.getElementById('modal-btn-confirm').onclick = () => {
        const pass = document.getElementById('dev-pass-input').value;
        if (pass === CONFIG.DEV_PASSWORD) {
            CONFIG.DEV_MODE = true;
            hideModal();
            showModal('info', 'وضع المطوّر نشط', 'تم تفعيل وضع المطوّر. يمكنك الآن اختيار المستوى.', 'موافق', null);
            // فتح شاشة اختيار المستوى
            showLevelSelector();
        } else {
            document.getElementById('modal-body').textContent = 'كلمة مرور خاطئة. حاول مرة أخرى.';
        }
    };
    document.getElementById('modal-btn-cancel').onclick = hideModal;
};

// عرض شاشة اختيار المستوى (خاصة بوضع المطوّر)
const showLevelSelector = () => {
    if (!CONFIG.DEV_MODE) return;

    let levelOptions = '';
    LEVEL_SEQUENCE.forEach((level, index) => {
        const levelName = level === 'easy' ? 'سهل' : level === 'medium' ? 'متوسط' : level === 'hard' ? 'صعب' : 'مستحيل';
        levelOptions += `<button class="btn btn-secondary btn-level-select" data-level-index="${index}" style="margin-bottom: 5px;">بدء مستوى: ${levelName}</button>`;
    });

    showModal('level-select', 'اختيار المستوى', 'اختر المستوى للبدء منه:', 'إغلاق', null, levelOptions);

    document.querySelectorAll('.btn-level-select').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt(e.target.dataset.levelIndex);
            
            // إعادة تعيين اللعبة والبدء من المستوى المختار
            startNewGame(); 
            state.game.currentLevelIndex = index;

            hideModal();
            switchScreen('quiz-game-screen');
            renderQuestion();
        };
    });
    
    document.getElementById('modal-btn-confirm').onclick = hideModal;
};

// المشاركة على X/نسخ النتائج
const shareResults = (type) => {
    const results = window.lastResults;
    if (!results) return;

    const shareText = `
        🏆 نتائج مسابقة المعلومات 🏆
        الاسم: ${results.name}
        المستوى الذي وصلت إليه: ${results.finalLevel}
        النقاط النهائية: ${results.finalScore}
        الإجابات الصحيحة: ${results.correctAnswers}
        نسبة الدقة: ${results.accuracy}%
        أداؤك: ${results.performance}
        #مسابقة_المعلومات #تحدي_المعرفة
    `.trim();

    if (type === 'copy') {
        document.execCommand('copy'); // استخدام execCommand كبديل لـ navigator.clipboard في بيئات iFrame
        const tempElement = document.createElement('textarea');
        tempElement.value = shareText;
        document.body.appendChild(tempElement);
        tempElement.select();
        document.execCommand('copy');
        document.body.removeChild(tempElement);

        showModal('info', 'تم النسخ', 'تم نسخ النتائج بنجاح إلى الحافظة!', 'موافق', null);
    } else if (type === 'x') {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    }
};

// --------------------------------------
// 9. تهيئة التطبيق والـ Listeners
// --------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. تهيئة الثيم
    updateThemeUI();

    // 2. تحميل الأسئلة
    loadQuestions();

    // 3. مستمعات الأحداث العالمية

    // تبديل الثيم
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
        updateThemeUI();
    });

    // شاشة البداية
    document.getElementById('btn-start-playing').addEventListener('click', () => switchScreen('profile-setup-screen'));
    document.getElementById('btn-developer-mode').addEventListener('click', checkDevModePassword);
    document.getElementById('btn-view-leaderboard').addEventListener('click', () => {
        switchScreen('leaderboard-screen');
        fetchLeaderboard('all');
    });
    
    // فلاتر لوحة الصدارة
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            fetchLeaderboard(e.target.dataset.filter);
        });
    });
    
    // تحديث لوحة الصدارة دورياً كل دقيقة (Polling)
    setInterval(() => {
        if (state.ui.currentScreen === 'leaderboard') {
            const activeFilter = document.querySelector('.btn-filter.active').dataset.filter;
            fetchLeaderboard(activeFilter);
        }
    }, 60000);

    // إعداد الملف الشخصي
    document.getElementById('btn-confirm-profile').addEventListener('click', () => {
        const nameInput = document.getElementById('name-input');
        const name = sanitizeInput(nameInput.value);
        const errorElement = document.getElementById('name-error');
        
        if (validateNameInput(name)) {
            state.player.name = name;
            errorElement.textContent = '';
            startNewGame();
        } else {
            errorElement.textContent = 'الاسم يجب أن يكون بين 2 و 25 حرفاً.';
        }
    });

    // اختيار الصورة الرمزية (محاكاة بسيطة)
    document.getElementById('player-avatar').addEventListener('click', () => {
        const newAvatarId = (parseInt(state.player.avatar) % 10) + 1; // 1-10
        state.player.avatar = newAvatarId.toString();
        document.getElementById('player-avatar').src = `https://placehold.co/100x100/3b82f6/ffffff?text=${newAvatarId}`;
        document.getElementById('avatar-input').value = newAvatarId.toString();
    });


    // شاشة التعليمات
    document.getElementById('btn-start-game').addEventListener('click', () => {
        switchScreen('quiz-game-screen');
        renderQuestion();
    });

    // شاشة اللعب
    document.getElementById('helper-50-50').addEventListener('click', useFiftyFifty);
    document.getElementById('helper-freeze').addEventListener('click', useFreeze);
    document.getElementById('helper-skip').addEventListener('click', useSkip);
    document.getElementById('btn-report-question').addEventListener('click', reportQuestion);


    // شاشة نهاية المستوى
    document.getElementById('btn-next-level').addEventListener('click', startNextLevel);
    document.getElementById('btn-withdraw').addEventListener('click', endGame);

    // شاشة النتائج النهائية
    document.getElementById('btn-share-x').addEventListener('click', () => shareResults('x'));
    document.getElementById('btn-copy-results').addEventListener('click', () => shareResults('copy'));
    document.getElementById('btn-play-again').addEventListener('click', () => switchScreen('start-screen'));

    // النوافذ المنبثقة العامة (للتأكيد/الإلغاء الافتراضي)
    document.getElementById('modal-btn-cancel').addEventListener('click', hideModal);
    document.getElementById('modal-btn-confirm').addEventListener('click', hideModal); // السلوك الافتراضي
});

