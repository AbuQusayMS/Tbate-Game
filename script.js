// IIFE (Immediately Invoked Function Expression)
// هذا النمط يستخدم لتجنب تلويث النطاق العام (Global Scope) بالمتغيرات.
(function() {
    'use strict';

    // ---------------------------------- //
    // ---      تعريف الثوابت        --- //
    // ---------------------------------- //

    // إعدادات Supabase - يجب أن تكون في متغيرات البيئة في تطبيق حقيقي
    const SUPABASE_URL = 'https://qffcnljopolajeufkrah.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZmNubGpvcG9sYWpldWZrcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzkzNjMsImV4cCI6MjA3NDY1NTM2M30.0vst_km_pweyF2IslQ24JzMF281oYeaaeIEQM0aKkUg';

    // إعدادات Google Apps Script
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnkvDR3bVTwlCUtHxT8zwAx5fKhG57xL7dCU1UhuEsMcsktoPRO5FykkLcE7eZwU86dw/exec';
    const SECRET_KEY = 'AbuQusay'; // المفتاح السري للتواصل مع السكربت

    // إعدادات اللعبة
    const QUESTION_TIME = 30; // 30 ثانية لكل سؤال
    const MAX_WRONG_ANSWERS = 3; // الحد الأقصى للأخطاء
    const INITIAL_SCORE = 100; // النقاط الأولية
    const CORRECT_ANSWER_POINTS = 100; // نقاط الإجابة الصحيحة
    const WRONG_ANSWER_PENALTY = 50; // خصم نقاط الإجابة الخاطئة
    const SPEED_BONUS_POINTS = 50; // نقاط مكافأة السرعة
    const INITIAL_SKIP_COST = 20; // تكلفة التخطي الأولية
    const SKIP_COST_INCREMENT = 20; // زيادة تكلفة التخطي

    // ---------------------------------- //
    // ---  الوصول لعناصر الـ DOM     --- //
    // ---------------------------------- //
    // الوصول لجميع العناصر التي سنتعامل معها في الصفحة لتجنب تكرار البحث عنها
    const dom = {
        loader: document.getElementById('loader'),
        toast: document.getElementById('toast-notification'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        screens: {
            start: document.getElementById('start-screen'),
            avatar: document.getElementById('avatar-screen'),
            name: document.getElementById('name-screen'),
            instructions: document.getElementById('instructions-screen'),
            levelSelection: document.getElementById('level-selection-screen'),
            game: document.getElementById('game-screen'),
            results: document.getElementById('results-screen'),
            leaderboard: document.getElementById('leaderboard-screen'),
        },
        game: {
            avatar: document.getElementById('game-avatar'),
            playerName: document.getElementById('game-player-name'),
            score: document.getElementById('score'),
            levelName: document.getElementById('level-name'),
            wrongAnswers: document.getElementById('wrong-answers-count'),
            timerBar: document.getElementById('timer-bar'),
            questionText: document.getElementById('question-text'),
            optionsContainer: document.getElementById('options-container'),
            helpers: {
                fiftyFifty: document.getElementById('fifty-fifty-btn'),
                freezeTime: document.getElementById('freeze-time-btn'),
                skipQuestion: document.getElementById('skip-question-btn'),
                skipCost: document.getElementById('skip-cost'),
            },
        },
        results: {
            details: document.getElementById('final-results-details'),
        },
        leaderboard: {
            list: document.getElementById('leaderboard-list'),
            filters: document.querySelector('.leaderboard-filters'),
        },
        modals: {
            container: document.getElementById('modal-container'),
            endLevel: document.getElementById('end-level-modal'),
            playerDetails: document.getElementById('player-details-modal'),
            confirmExit: document.getElementById('confirm-exit-modal'),
            devPassword: document.getElementById('dev-password-modal'),
        },
        avatar: {
            grid: document.getElementById('avatar-selection-grid'),
            confirmBtn: document.getElementById('confirm-avatar-btn'),
        },
        playerNameInput: document.getElementById('player-name-input'),
    };

    // ---------------------------------- //
    // ---      الحالة العامة (State)   --- //
    // ---------------------------------- //
    // هذا الكائن سيحتوي على كل بيانات اللعبة الحالية وسيتغير باستمرار
    let state = {};
    let questions = {}; // سيتم تحميل الأسئلة هنا
    let timerInterval = null; // سيحتوي على مؤقت السؤال
    let leaderboardInterval = null; // لتحديث لوحة الصدارة دورياً
    let leaderboardData = []; // لتخزين بيانات لوحة الصدارة محلياً

    // تهيئة الحالة الأولية للعبة
    function resetState() {
        state = {
            player: {
                name: '',
                avatar: '',
                playerId: localStorage.getItem('playerId') || generateUniqueId(),
                deviceId: localStorage.getItem('deviceId') || generateUniqueId(),
            },
            game: {
                startTime: 0,
                endTime: 0,
                currentLevel: 'easy',
                levelIndex: 0,
                questionIndex: 0,
                currentScore: INITIAL_SCORE,
                wrongAnswers: 0,
                correctAnswers: 0,
                skips: 0,
                helpersUsed: {
                    fifty: false,
                    freeze: false,
                },
                timePerQuestion: [],
                questionStartTime: 0,
            },
            ui: {
                currentScreen: 'start',
                activeModal: null,
                theme: localStorage.getItem('theme') || 'dark',
            },
            devMode: false,
        };
        // حفظ المعرفات الفريدة في التخزين المحلي
        localStorage.setItem('playerId', state.player.playerId);
        localStorage.setItem('deviceId', state.player.deviceId);
    }

    // ---------------------------------- //
    // ---   وظائف مساعدة (Utilities)  --- //
    // ---------------------------------- //

    // دالة لتوليد معرف فريد
    function generateUniqueId() {
        return 'id_' + Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // دالة لعرض شاشة معينة وإخفاء البقية
    function showScreen(screenName) {
        state.ui.currentScreen = screenName;
        for (const key in dom.screens) {
            dom.screens[key].classList.remove('active');
        }
        if (dom.screens[screenName]) {
            dom.screens[screenName].classList.add('active');
        }
    }

    // دالة لعرض نافذة منبثقة
    function showModal(modalName) {
        state.ui.activeModal = modalName;
        dom.modals.container.classList.remove('hidden');
        for (const key in dom.modals) {
            if (dom.modals[key].classList && dom.modals[key].classList.contains('modal')) {
                dom.modals[key].style.display = 'none';
            }
        }
        if (dom.modals[modalName]) {
            dom.modals[modalName].style.display = 'block';
        }
    }

    // دالة لإخفاء النافذة المنبثقة
    function hideModal() {
        state.ui.activeModal = null;
        dom.modals.container.classList.add('hidden');
    }
    
    // دالة لعرض رسالة مؤقتة
    function showToast(message) {
        dom.toast.textContent = message;
        dom.toast.classList.add('show');
        setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 3000);
    }

    // دالة لتحويل الثواني إلى صيغة دقائق:ثواني
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // دالة لتنظيف المدخلات من العلامات الخطرة
    function sanitizeInput(str) {
        return str.replace(/[<>]/g, '');
    }

    // دالة للتحقق من صحة الاسم
    function validateName(name) {
        return name.length >= 2 && name.length <= 25;
    }
    
    // دالة لإظهار/إخفاء شاشة التحميل
    function toggleLoader(show) {
        dom.loader.classList.toggle('hidden', !show);
    }

    // ---------------------------------- //
    // ---   منطق تبديل الوضع (Theme)  --- //
    // ---------------------------------- //
    function applyTheme(theme) {
        document.documentElement.className = '';
        document.documentElement.classList.add(`theme-${theme}`);
        localStorage.setItem('theme', theme);
        state.ui.theme = theme;
    }

    function toggleTheme() {
        const newTheme = state.ui.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // ---------------------------------- //
    // --- منطق إعداد اللعبة والبداية --- //
    // ---------------------------------- //

    // دالة لبدء اللعبة
    function startGame() {
        resetState();
        populateAvatars();
        showScreen('avatar');
    }

    // دالة لملء شبكة الصور الرمزية
    function populateAvatars() {
        dom.avatar.grid.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const img = document.createElement('img');
            img.src = `https://api.dicebear.com/8.x/avataaars/svg?seed=avatar${i}`;
            img.alt = `Avatar ${i}`;
            img.classList.add('avatar-option');
            img.dataset.avatarUrl = img.src;
            dom.avatar.grid.appendChild(img);
        }
    }

    // دالة لمعالجة اختيار الصورة الرمزية
    function handleAvatarSelection(e) {
        if (e.target.classList.contains('avatar-option')) {
            // إزالة التحديد من الصورة السابقة
            const selected = dom.avatar.grid.querySelector('.selected');
            if (selected) {
                selected.classList.remove('selected');
            }
            // إضافة التحديد للصورة الجديدة
            e.target.classList.add('selected');
            state.player.avatar = e.target.dataset.avatarUrl;
            dom.avatar.confirmBtn.disabled = false;
        }
    }
    
    // دالة لبدء جولة جديدة
    function startRound(level = null) {
        if (level) {
            state.game.currentLevel = level;
            const levelOrder = ['easy', 'medium', 'hard', 'impossible'];
            state.game.levelIndex = levelOrder.indexOf(level);
        }
        
        hideModal();
        state.game.questionIndex = 0;
        state.game.wrongAnswers = 0;
        updateGameUI();
        showScreen('game');
        loadQuestion();
    }


    // ---------------------------------- //
    // ---   منطق اللعب الأساسي       --- //
    // ---------------------------------- //

    // دالة لتحديث واجهة المستخدم في شاشة اللعب
    function updateGameUI() {
        dom.game.avatar.src = state.player.avatar;
        dom.game.playerName.textContent = state.player.name;
        dom.game.score.textContent = state.game.currentScore;
        const levelNames = {easy: 'سهل', medium: 'متوسط', hard: 'صعب', impossible: 'مستحيل'};
        dom.game.levelName.textContent = levelNames[state.game.currentLevel];
        dom.game.wrongAnswers.textContent = `${state.game.wrongAnswers} / ${MAX_WRONG_ANSWERS}`;
        
        // تحديث حالة أزرار المساعدة
        dom.game.helpers.fiftyFifty.disabled = state.game.helpersUsed.fifty;
        dom.game.helpers.freezeTime.disabled = state.game.helpersUsed.freeze;
        
        const currentSkipCost = INITIAL_SKIP_COST + (state.game.skips * SKIP_COST_INCREMENT);
        dom.game.helpers.skipCost.textContent = currentSkipCost;
        dom.game.helpers.skipQuestion.disabled = state.game.currentScore < currentSkipCost;
    }
    
    // دالة لتحميل وعرض السؤال الحالي
    function loadQuestion() {
        updateGameUI();
        const currentLevelQuestions = questions[state.game.currentLevel];
        if (!currentLevelQuestions || state.game.questionIndex >= currentLevelQuestions.length) {
            endLevel();
            return;
        }

        const question = currentLevelQuestions[state.game.questionIndex];
        dom.game.questionText.textContent = question.q;
        dom.game.optionsContainer.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('option-btn');
            button.textContent = option;
            button.dataset.index = index;
            dom.game.optionsContainer.appendChild(button);
        });

        startTimer();
    }

    // دالة لبدء مؤقت السؤال
    function startTimer() {
        clearInterval(timerInterval);
        let timeLeft = QUESTION_TIME;
        state.game.questionStartTime = Date.now();
        dom.game.timerBar.style.transition = 'none';
        dom.game.timerBar.style.width = '100%';
        // استخدام reflow بسيط لإعادة تفعيل الـ transition
        dom.game.timerBar.offsetHeight; 
        dom.game.timerBar.style.transition = `width ${QUESTION_TIME}s linear`;
        dom.game.timerBar.style.width = '0%';

        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                handleAnswer(-1); // -1 يعني انتهاء الوقت
            }
        }, 1000);
    }
    
    // دالة لمعالجة إجابة اللاعب
    function handleAnswer(selectedIndex) {
        clearInterval(timerInterval);
        const timeTaken = (Date.now() - state.game.questionStartTime) / 1000;
        state.game.timePerQuestion.push(timeTaken);

        const currentLevelQuestions = questions[state.game.currentLevel];
        const question = currentLevelQuestions[state.game.questionIndex];
        const correctIndex = question.correct;
        
        // تعطيل الأزرار بعد الإجابة
        const optionButtons = dom.game.optionsContainer.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => btn.classList.add('disabled'));

        if (selectedIndex == correctIndex) {
            // إجابة صحيحة
            optionButtons[selectedIndex].classList.add('correct');
            state.game.currentScore += CORRECT_ANSWER_POINTS;
            state.game.correctAnswers++;
            // مكافأة السرعة
            if (timeTaken < QUESTION_TIME / 2) {
                state.game.currentScore += SPEED_BONUS_POINTS;
                showToast(`إجابة صحيحة! +${SPEED_BONUS_POINTS} نقاط سرعة!`);
            } else {
                showToast('إجابة صحيحة!');
            }
        } else {
            // إجابة خاطئة أو انتهاء الوقت
            if (selectedIndex !== -1) {
                optionButtons[selectedIndex].classList.add('wrong');
            }
            optionButtons[correctIndex].classList.add('correct');
            state.game.currentScore -= WRONG_ANSWER_PENALTY;
            state.game.wrongAnswers++;
            showToast(selectedIndex === -1 ? 'انتهى الوقت!' : 'إجابة خاطئة!');
        }
        
        updateGameUI();

        if (state.game.wrongAnswers >= MAX_WRONG_ANSWERS) {
            setTimeout(endGame, 2000);
        } else {
            state.game.questionIndex++;
            setTimeout(loadQuestion, 2000);
        }
    }

    // دالة لإنهاء المستوى
    function endLevel() {
        const levelNames = {easy: 'السهل', medium: 'المتوسط', hard: 'الصعب', impossible: 'المستحيل'};
        const currentLevelName = levelNames[state.game.currentLevel];
        
        document.getElementById('end-level-title').textContent = `تهانينا! لقد أكملت المستوى ${currentLevelName}`;
        
        const levelOrder = ['easy', 'medium', 'hard', 'impossible'];
        const nextLevelIndex = state.game.levelIndex + 1;
        
        if (nextLevelIndex < levelOrder.length) {
            state.game.levelIndex = nextLevelIndex;
            state.game.currentLevel = levelOrder[nextLevelIndex];
            const nextLevelName = levelNames[state.game.currentLevel];
            document.getElementById('end-level-message').textContent = `نقاطك الحالية: ${state.game.currentScore}. هل أنت مستعد للمستوى ${nextLevelName}؟`;
            document.getElementById('next-level-btn').style.display = 'inline-block';
        } else {
            document.getElementById('end-level-message').textContent = 'لقد أكملت جميع المستويات بنجاح! أنت بطل!';
            document.getElementById('next-level-btn').style.display = 'none';
        }
        
        showModal('endLevel');
    }
    
    // دالة لإنهاء اللعبة بالكامل
    function endGame() {
        hideModal();
        state.game.endTime = Date.now();
        calculateAndShowResults();
        saveGameData();
    }
    
    // ---------------------------------- //
    // ---      منطق المساعدات         --- //
    // ---------------------------------- //
    
    // مساعدة 50:50
    function useFiftyFifty() {
        if (state.game.helpersUsed.fifty) return;
        state.game.helpersUsed.fifty = true;

        const currentLevelQuestions = questions[state.game.currentLevel];
        const question = currentLevelQuestions[state.game.questionIndex];
        const correctIndex = question.correct;
        const optionButtons = dom.game.optionsContainer.querySelectorAll('.option-btn');
        
        let wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
        // خلط عشوائي للخيارات الخاطئة
        wrongIndices.sort(() => 0.5 - Math.random());
        
        optionButtons[wrongIndices[0]].classList.add('hidden');
        optionButtons[wrongIndices[1]].classList.add('hidden');
        
        updateGameUI();
    }

    // مساعدة تجميد الوقت
    function useFreezeTime() {
        if (state.game.helpersUsed.freeze) return;
        state.game.helpersUsed.freeze = true;
        
        clearInterval(timerInterval);
        const remainingWidth = dom.game.timerBar.style.width;
        
        setTimeout(() => {
            startTimer();
            // إعادة المؤقت إلى حالته قبل التجميد
            dom.game.timerBar.style.transition = 'none';
            dom.game.timerBar.style.width = remainingWidth;
            dom.game.timerBar.offsetHeight;
            const remainingSeconds = (parseFloat(remainingWidth) / 100) * QUESTION_TIME;
            dom.game.timerBar.style.transition = `width ${remainingSeconds}s linear`;
            dom.game.timerBar.style.width = '0%';
        }, 10000); // 10 ثواني تجميد
        
        showToast('تم تجميد الوقت لمدة 10 ثوانٍ!');
        updateGameUI();
    }
    
    // مساعدة تخطي السؤال
    function useSkipQuestion() {
        const cost = INITIAL_SKIP_COST + (state.game.skips * SKIP_COST_INCREMENT);
        if (state.game.currentScore < cost) {
            showToast('ليس لديك نقاط كافية للتخطي!');
            return;
        }
        
        state.game.currentScore -= cost;
        state.game.skips++;
        clearInterval(timerInterval);
        state.game.questionIndex++;
        loadQuestion();
    }

    // ---------------------------------- //
    // ---   النتائج ولوحة الصدارة     --- //
    // ---------------------------------- //

    // دالة لحساب وعرض النتائج النهائية
    function calculateAndShowResults() {
        const totalTimeSeconds = (state.game.endTime - state.game.startTime) / 1000;
        const totalAnswers = state.game.correctAnswers + state.game.wrongAnswers;
        const accuracy = totalAnswers > 0 ? (state.game.correctAnswers / totalAnswers * 100).toFixed(1) : 0;
        const avgTimePerQuestion = state.game.timePerQuestion.length > 0 ? (state.game.timePerQuestion.reduce((a, b) => a + b, 0) / state.game.timePerQuestion.length).toFixed(2) : 0;

        const levelNames = {easy: 'سهل', medium: 'متوسط', hard: 'صعب', impossible: 'مستحيل'};
        
        const performanceMap = {
            100: 'ممتاز!', 90: 'رائع!', 70: 'جيد جداً', 50: 'جيد', 30: 'يمكنك أفضل', 0: 'حاول مجدداً'
        };
        const performance = Object.entries(performanceMap).find(([key]) => accuracy >= key)[1];

        const results = {
            "الاسم": state.player.name,
            "المعرّف": state.player.playerId.substring(0, 8),
            "الإجابات الصحيحة": state.game.correctAnswers,
            "الإجابات الخاطئة": state.game.wrongAnswers,
            "مرات التخطي": state.game.skips,
            "النقاط النهائية": state.game.currentScore,
            "الوقت المستغرق": formatTime(totalTimeSeconds),
            "المستوى الذي وصلت إليه": levelNames[state.game.currentLevel],
            "نسبة الدقة": `${accuracy}%`,
            "متوسط وقت الإجابة": `${avgTimePerQuestion} ث`,
            "أداؤك": performance
        };

        dom.results.details.innerHTML = Object.entries(results).map(([key, value]) => `
            <div class="result-item">
                <span>${key}:</span>
                <strong>${value}</strong>
            </div>
        `).join('');

        showScreen('results');
    }
    
    // دالة لجلب وعرض لوحة الصدارة
    async function fetchAndDisplayLeaderboard(filter = 'all') {
        toggleLoader(true);
        try {
            let query = supabaseClient.from('leaderboard').select('*').order('score', { ascending: false });
            
            if (filter === 'top10') {
                query = query.limit(10);
            } else if (filter === 'impossible') {
                query = query.eq('level', 'impossible').limit(100);
            } else {
                query = query.limit(100);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            leaderboardData = data; // تخزين البيانات
            renderLeaderboard();

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            showToast('حدث خطأ في جلب لوحة الصدارة.');
        } finally {
            toggleLoader(false);
        }
    }
    
    // دالة لعرض لوحة الصدارة بعد جلب البيانات
    function renderLeaderboard() {
        if(leaderboardData.length === 0) {
            dom.leaderboard.list.innerHTML = '<p>لا يوجد لاعبون في لوحة الصدارة بعد.</p>';
            return;
        }

        dom.leaderboard.list.innerHTML = leaderboardData.map((player, index) => `
            <div class="leaderboard-item" data-player-id="${player.player_id}">
                <span class="leaderboard-rank">${index + 1}</span>
                <img src="${player.avatar}" alt="${player.name}" class="leaderboard-avatar">
                <span class="leaderboard-name">${sanitizeInput(player.name)}</span>
                <span class="leaderboard-score">${player.score}</span>
            </div>
        `).join('');
    }

    // دالة لعرض تفاصيل لاعب من لوحة الصدارة
    async function showPlayerDetails(playerId) {
        toggleLoader(true);
        try {
            const { data, error } = await supabaseClient
                .from('game_logs')
                .select('*')
                .eq('player_id', playerId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            const playerInfo = leaderboardData.find(p => p.player_id === playerId);
            document.getElementById('player-details-title').textContent = `سجلات اللاعب: ${playerInfo.name}`;

            if(data.length === 0) {
                 document.getElementById('player-details-content').innerHTML = '<p>لا توجد سجلات لهذا اللاعب.</p>';
            } else {
                 document.getElementById('player-details-content').innerHTML = data.map(log => `
                    <div class="log-item">
                        <p><strong>النقاط:</strong> ${log.score}</p>
                        <p><strong>التاريخ:</strong> ${new Date(log.created_at).toLocaleString()}</p>
                        <p><strong>المستوى:</strong> ${log.level}</p>
                    </div>
                 `).join('');
            }
            showModal('playerDetails');

        } catch(error) {
            console.error('Error fetching player details:', error);
            showToast('خطأ في جلب تفاصيل اللاعب.');
        } finally {
            toggleLoader(false);
        }
    }

    // ---------------------------------- //
    // ---  التفاعل مع الواجهة الخلفية --- //
    // ---------------------------------- //
    
    // إنشاء عميل Supabase
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // دالة لحفظ بيانات اللعبة
    async function saveGameData() {
        const totalTimeSeconds = (state.game.endTime - state.game.startTime) / 1000;
        const totalAnswers = state.game.correctAnswers + state.game.wrongAnswers;
        const accuracy = totalAnswers > 0 ? (state.game.correctAnswers / totalAnswers * 100) : 0;

        const logData = {
            player_id: state.player.playerId,
            device_id: state.player.deviceId,
            name: state.player.name,
            avatar: state.player.avatar,
            score: state.game.currentScore,
            level: state.game.currentLevel,
            correct_answers: state.game.correctAnswers,
            wrong_answers: state.game.wrongAnswers,
            skips: state.game.skips,
            helpers_used: state.game.helpersUsed,
            total_time_seconds: totalTimeSeconds,
            accuracy: accuracy,
        };
        
        try {
            // 1. إدراج في سجلات اللعبة
            const { error: logError } = await supabaseClient.from('game_logs').insert(logData);
            if(logError) console.error('Error saving game log:', logError);
            
            // 2. تحديث لوحة الصدارة (Upsert)
            // Upsert يعني: إذا كان اللاعب موجوداً قم بتحديث بياناته (فقط إذا كانت النتيجة الجديدة أعلى)، وإذا لم يكن موجوداً قم بإضافته.
            const { error: leaderboardError } = await supabaseClient.rpc('upsert_leaderboard', {
                p_player_id: logData.player_id,
                p_name: logData.name,
                p_avatar: logData.avatar,
                p_score: logData.score,
                p_level: logData.level,
                p_accuracy: logData.accuracy
            });
            if(leaderboardError) console.error('Error upserting leaderboard:', leaderboardError);

            // 3. إرسال البيانات إلى Google Apps Script
            sendToGAS('gameResult', logData);
            
        } catch(error) {
            console.error('An error occurred during data saving:', error);
        }
    }

    // دالة لإرسال البيانات إلى Google Apps Script
    async function sendToGAS(type, data) {
        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // مهم عند التعامل مع GAS لتجنب مشاكل CORS
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    secretKey: SECRET_KEY,
                    data: data
                })
            });
        } catch (error) {
            console.error('Error sending data to Google Apps Script:', error);
        }
    }

    // ---------------------------------- //
    // ---      ربط الأحداث           --- //
    // ---------------------------------- //

    function addEventListeners() {
        // زر تبديل الوضع
        dom.themeToggleBtn.addEventListener('click', toggleTheme);
        
        // أزرار شاشة البداية
        document.getElementById('start-game-btn').addEventListener('click', startGame);
        document.getElementById('leaderboard-btn-from-start').addEventListener('click', () => {
            fetchAndDisplayLeaderboard();
            showScreen('leaderboard');
        });
        document.getElementById('dev-mode-btn').addEventListener('click', () => showModal('devPassword'));

        // شاشة اختيار الصورة
        dom.avatar.grid.addEventListener('click', handleAvatarSelection);
        dom.avatar.confirmBtn.addEventListener('click', () => showScreen('name'));
        
        // شاشة إدخال الاسم
        dom.playerNameInput.addEventListener('keyup', (e) => {
            const name = sanitizeInput(e.target.value);
            document.getElementById('confirm-name-btn').disabled = !validateName(name);
        });
        document.getElementById('confirm-name-btn').addEventListener('click', () => {
            const name = sanitizeInput(dom.playerNameInput.value);
            if (validateName(name)) {
                state.player.name = name;
                showScreen('instructions');
            }
        });
        
        // شاشة التعليمات
        document.getElementById('play-now-btn').addEventListener('click', () => {
            state.game.startTime = Date.now();
            if(state.devMode) {
                showScreen('levelSelection');
            } else {
                startRound();
            }
        });

        // شاشة اختيار المستوى (للمطور)
        dom.screens.levelSelection.addEventListener('click', e => {
            if (e.target.classList.contains('btn-level')) {
                state.game.startTime = Date.now();
                startRound(e.target.dataset.level);
            }
        });

        // شاشة اللعب
        dom.game.optionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn') && !e.target.classList.contains('disabled')) {
                handleAnswer(e.target.dataset.index);
            }
        });
        document.getElementById('exit-game-btn').addEventListener('click', () => showModal('confirmExit'));
        
        // أزرار المساعدة
        dom.game.helpers.fiftyFifty.addEventListener('click', useFiftyFifty);
        dom.game.helpers.freezeTime.addEventListener('click', useFreezeTime);
        dom.game.helpers.skipQuestion.addEventListener('click', useSkipQuestion);
        
        // شاشة النتائج
        document.getElementById('play-again-btn').addEventListener('click', startGame);
        document.getElementById('main-menu-btn').addEventListener('click', () => showScreen('start'));
        // (يجب إضافة منطق المشاركة والنسخ هنا)

        // شاشة لوحة الصدارة
        document.getElementById('back-to-menu-btn').addEventListener('click', () => showScreen('start'));
        dom.leaderboard.filters.addEventListener('click', (e) => {
            if(e.target.classList.contains('filter-btn')) {
                dom.leaderboard.filters.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                fetchAndDisplayLeaderboard(e.target.dataset.filter);
            }
        });
        dom.leaderboard.list.addEventListener('click', e => {
            const playerItem = e.target.closest('.leaderboard-item');
            if(playerItem) {
                showPlayerDetails(playerItem.dataset.playerId);
            }
        });

        // أزرار النوافذ المنبثقة
        document.getElementById('next-level-btn').addEventListener('click', () => startRound());
        document.getElementById('withdraw-btn').addEventListener('click', endGame);
        
        document.getElementById('confirm-exit-btn').addEventListener('click', () => {
            hideModal();
            showScreen('start');
        });

        document.getElementById('submit-dev-password-btn').addEventListener('click', () => {
            const pass = document.getElementById('dev-password-input').value;
            if (pass === '12345') { // كلمة مرور بسيطة
                state.devMode = true;
                hideModal();
                showToast('وضع المطور مفعل!');
            } else {
                showToast('كلمة المرور خاطئة.');
            }
        });
        
        // زر الإغلاق العام للنوافذ
        dom.modals.container.addEventListener('click', e => {
            if(e.target.classList.contains('close-modal-btn') || e.target.classList.contains('cancel-modal-btn')) {
                hideModal();
            }
        });
    }

    // ---------------------------------- //
    // ---   دالة التهيئة الرئيسية     --- //
    // ---------------------------------- //

    async function init() {
        // إعادة تعيين الحالة أولاً لإنشاء كائن 'state'
        resetState();

        // تطبيق الوضع المحفوظ
        applyTheme(localStorage.getItem('theme') || 'dark');
        
        // إضافة مستمعي الأحداث
        addEventListeners();
        
        // عرض الشاشة الأولى
        showScreen('start');
        
        // تحميل ملف الأسئلة
        try {
            toggleLoader(true);
            const response = await fetch('questions.json');
            if (!response.ok) throw new Error('Network response was not ok');
            questions = await response.json();
        } catch (error) {
            console.error('Failed to load questions:', error);
            // عرض رسالة خطأ للمستخدم
            document.getElementById('main-content').innerHTML = `
                <div style="text-align: center; color: var(--accent-color);">
                    <h2>حدث خطأ فادح</h2>
                    <p>لم نتمكن من تحميل ملف الأسئلة. الرجاء تحديث الصفحة والمحاولة مرة أخرى.</p>
                </div>
            `;
        } finally {
            toggleLoader(false);
        }
        
        // بدء التحديث الدوري للوحة الصدارة
        leaderboardInterval = setInterval(fetchAndDisplayLeaderboard, 60000);
    }

    // بدء تشغيل التطبيق عند تحميل الصفحة بالكامل
    document.addEventListener('DOMContentLoaded', init);

})();


