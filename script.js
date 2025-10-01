/* ===========================
   الإعدادات العامة
=========================== */
const CONFIG = {
  TEST_KEY: 'AbuQusay', // مفتاح بسيط مع GAS
  APPS_SCRIPT_URL: 'PUT_YOUR_GAS_ENDPOINT_HERE', // ضع رابط GAS بعد النشر
  SUPABASE_URL: 'PUT_SUPABASE_URL_HERE',
  SUPABASE_KEY: 'PUT_SUPABASE_ANON_KEY_HERE',
  QUESTION_TIME: 30,
  MAX_WRONG: 3,
  STARTING_SCORE: 100,
  DEV_PASSWORD: 'developer' // كلمة مرور وضع المطوّر
};

// الترتيب والعناوين
const LEVEL_LABEL = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', impossible: 'مستحيل' };
const LEVEL_ORDER = ['easy', 'medium', 'hard', 'impossible'];
const LEVEL_COUNTS = { easy: 10, medium: 10, hard: 10, impossible: 1 };

/* ===========================
   حالة التطبيق
=========================== */
const state = {
  player: { name: '', avatar: '🙂', playerId: '', deviceId: '' },
  game: {
    currentLevelIndex: 0,
    score: CONFIG.STARTING_SCORE,
    correct: 0, wrong: 0,
    skips: 0, skipCost: 20,
    usedFifty: false, usedFreeze: false,
    questionIndex: 0,
    totalTimeSec: 0,
    questionStart: 0,
    timer: null, remaining: CONFIG.QUESTION_TIME, frozen: false
  },
  ui: { devMode: false },
  questions: { easy: [], medium: [], hard: [], impossible: [] }
};

/* ===========================
   عناصر DOM
=========================== */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const screens = {
  start: $('#screen-start'),
  avatar: $('#screen-avatar'),
  name: $('#screen-name'),
  instructions: $('#screen-instructions'),
  levelSelect: $('#screen-level-select'),
  game: $('#screen-game'),
  levelEnd: $('#screen-level-end'),
  results: $('#screen-results'),
  leaderboard: $('#screen-leaderboard')
};

const els = {
  themeToggle: $('#themeToggle'),
  startBtn: $('#startBtn'),
  openDevBtn: $('#openDevBtn'),
  avatarGrid: $('#avatarGrid'),
  avatarNextBtn: $('#avatarNextBtn'),
  playerNameInput: $('#playerNameInput'),
  confirmNameBtn: $('#confirmNameBtn'),
  startRoundBtn: $('#startRoundBtn'),

  levelDots: $('#levelDots'), hudScore: $('#hudScore'), hudMistakes: $('#hudMistakes'),
  hudAvatar: $('#hudAvatar'), hudName: $('#hudName'),
  btnSkip: $('#btnSkip'), btnFreeze: $('#btnFreeze'), btnFifty: $('#btnFifty'),
  skipCost: $('#skipCost'),
  timerBar: $('#timerBar'), timerLabel: $('#timerLabel'),
  levelBadge: $('#levelBadge'), qCounter: $('#qCounter'),
  questionText: $('#questionText'), options: $('#options'),

  btnNextLevel: $('#btnNextLevel'), btnWithdraw: $('#btnWithdraw'),
  finalResults: $('#finalResults'), shareText: $('#shareText'),
  shareXBtn: $('#shareXBtn'), copyShareTextBtn: $('#copyShareTextBtn'),
  playAgainBtn: $('#playAgainBtn'), openLeaderboardBtn: $('#openLeaderboardBtn'),
  gotoLeaderboard: $('#gotoLeaderboard'),

  lbFilters: $('#lbFilters'), leaderboardList: $('#leaderboardList'),
  playerDetailsModal: $('#playerDetailsModal'), closePlayerModal: $('#closePlayerModal'),
  playerDetailsBody: $('#playerDetailsBody'),

  openReportBtn: $('#openReportBtn'), reportModal: $('#reportModal'),
  closeReport: $('#closeReport'), reportType: $('#reportType'),
  reportDesc: $('#reportDesc'), reportImage: $('#reportImage'),
  reportAuto: $('#reportAuto'), sendReportBtn: $('#sendReportBtn')
};

/* ===========================
   أدوات عامة
=========================== */
function showScreen(id){ $$('.screen').forEach(sc=>sc.classList.remove('active')); screens[id].classList.add('active'); }
function toMinSec(sec){ const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,'0')}`; }
function uuid(prefix='PL'){ return prefix + Math.random().toString(36).slice(2,6).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase(); }
function getDeviceId(){ let d=localStorage.getItem('quizDeviceId'); if(!d){ d='D'+uuid('').slice(2); localStorage.setItem('quizDeviceId',d);} return d; }
function toast(msg){ alert(msg); } // استبدل لاحقاً بـ Toast أجمل لو رغبت

// محاولة رقم (يزيد عند إظهار النتائج)
function nextAttemptNumber(){
  const key = 'quizAttemptCount';
  let n = +(localStorage.getItem(key) || 0);
  n += 1; localStorage.setItem(key, String(n));
  return n;
}

/* ===========================
   تبديل الوضع (مظلم/فاتح)
=========================== */
(function initTheme(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('theme-light', saved==='light');
  document.body.classList.toggle('theme-dark', saved==='dark');
})();
els.themeToggle.addEventListener('click', ()=>{
  const isLight = document.body.classList.toggle('theme-light');
  document.body.classList.toggle('theme-dark', !isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

/* ===========================
   تحميل الأسئلة
=========================== */
async function loadQuestions(){
  const res = await fetch('./questions.json');
  const data = await res.json();
  state.questions = data;
}

/* ===========================
   تهيئة الواجهة
=========================== */
function initAvatars(){
  const emojis = ['🙂','😁','🤓','🧑‍💻','🧔','👩‍🦱','🧑‍🎓','🧑‍🎨','🧑‍🚀','🧑‍🚒'];
  els.avatarGrid.innerHTML = '';
  emojis.forEach(e => {
    const d = document.createElement('div');
    d.className = 'avatar';
    d.textContent = e;
    d.addEventListener('click', ()=>{
      $$('.avatar', els.avatarGrid).forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      state.player.avatar = e;
      els.avatarNextBtn.disabled = false;
    });
    els.avatarGrid.appendChild(d);
  });
}

function validateName(name){
  const n = (name||'').trim();
  return n.length>=2 && n.length<=25;
}

function updateHUD(){
  els.hudScore.textContent = `النقاط: ${state.game.score}`;
  els.hudMistakes.textContent = `الأخطاء: ${state.game.wrong}/${CONFIG.MAX_WRONG}`;
  els.hudAvatar.textContent = state.player.avatar;
  els.hudName.textContent = state.player.name || '—';
  els.skipCost.textContent = `(${state.game.skipCost})`;
}

function renderLevelDots(){
  els.levelDots.innerHTML = '';
  LEVEL_ORDER.forEach((k, i)=>{
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = `${i+1}`;
    if(i === state.game.currentLevelIndex) span.style.outline='2px solid var(--accent)';
    els.levelDots.appendChild(span);
  });
}

/* ===========================
   منطق الجولة والأسئلة
=========================== */
function getCurrentLevelKey(){ return LEVEL_ORDER[state.game.currentLevelIndex]; }
function getCurrentBucket(){ return state.questions[getCurrentLevelKey()] || []; }

function startLevel(levelKey){
  // الإذن: في الوضع العادي لا نسمح باختيار مستوى يدويًا
  if(levelKey && !state.ui.devMode){
    toast('اختيار المستوى يدويًا متاح فقط في وضع المطوّر');
    return;
  }
  if(levelKey){
    state.game.currentLevelIndex = LEVEL_ORDER.indexOf(levelKey);
  }

  // إعادة ضبط حالة الجولة
  state.game.questionIndex = 0;
  state.game.usedFifty = false;
  state.game.usedFreeze = false;
  state.game.skipCost = 20;

  renderLevelDots();
  showScreen('game');
  nextQuestion();
}

function nextQuestion(){
  const bucket = getCurrentBucket();
  const totalInLevel = LEVEL_COUNTS[getCurrentLevelKey()];

  if(state.game.questionIndex >= totalInLevel){
    showScreen('levelEnd');
    return;
  }

  const q = bucket[state.game.questionIndex];
  els.levelBadge.textContent = LEVEL_LABEL[getCurrentLevelKey()];
  els.qCounter.textContent = `السؤال ${state.game.questionIndex+1} من ${totalInLevel}`;
  els.questionText.textContent = q.q;
  els.options.innerHTML = '';
  q.options.forEach((opt, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt;
    btn.addEventListener('click', ()=> onAnswer(idx, q.correct));
    els.options.appendChild(btn);
  });

  // إن كان 50:50 مستخدم سابقًا أثناء نفس الجولة
  if(state.game.usedFifty){ applyFiftyToOptions(q.correct); }

  // بدء المؤقت
  startTimer();
  updateHUD();
}

function onAnswer(choiceIdx, correctIdx){
  stopTimer();
  const isCorrect = choiceIdx === correctIdx;
  markOptions(choiceIdx, correctIdx);

  const timeSpent = CONFIG.QUESTION_TIME - state.game.remaining;
  state.game.totalTimeSec += Math.max(0, timeSpent);

  if(isCorrect){
    state.game.correct++;
    state.game.score += 100;
    // مكافأة السرعة
    if(state.game.remaining >= CONFIG.QUESTION_TIME/2) state.game.score += 50;
  }else{
    state.game.wrong++;
    state.game.score -= 50;
  }
  updateHUD();

  setTimeout(()=>{
    if(state.game.wrong >= CONFIG.MAX_WRONG){
      finalizeAndShowResults('الخروج بسبب الأخطاء');
    }else{
      state.game.questionIndex++;
      nextQuestion();
    }
  }, 600);
}

function markOptions(choice, correct){
  $$('.option', els.options).forEach((b, i)=>{
    b.classList.add(i===correct ? 'correct' : (i===choice?'wrong':''));
    b.disabled = true;
  });
}

/* ===========================
   المؤقت والتجميد
=========================== */
function startTimer(){
  state.game.remaining = CONFIG.QUESTION_TIME;
  els.timerBar.style.width = '100%';
  els.timerLabel.textContent = `${state.game.remaining}`;
  state.game.frozen = false;

  state.game.timer = setInterval(()=>{
    if(state.game.frozen) return;
    state.game.remaining--;
    els.timerLabel.textContent = `${state.game.remaining}`;
    els.timerBar.style.width = `${(state.game.remaining/CONFIG.QUESTION_TIME)*100}%`;
    if(state.game.remaining <= 0){
      clearInterval(state.game.timer);
      onAnswer(-1, getCurrentBucket()[state.game.questionIndex].correct);
    }
  }, 1000);
}
function stopTimer(){ clearInterval(state.game.timer); }

/* ===========================
   المساعدات
=========================== */
function applyFiftyToOptions(correctIdx){
  const options = $$('.option', els.options);
  let removed = 0;
  for(let i=0;i<options.length && removed<2;i++){
    if(i!==correctIdx && !options[i].classList.contains('disabled')){
      options[i].classList.add('disabled');
      options[i].disabled = true;
      removed++;
    }
  }
}
// 50:50 مرة واحدة في الجولة
els.btnFifty.addEventListener('click', ()=>{
  if(state.game.usedFifty) return toast('تم استخدام 50:50 بالفعل في هذه الجولة');
  state.game.usedFifty = true;
  const q = getCurrentBucket()[state.game.questionIndex];
  applyFiftyToOptions(q.correct);
});
// تجميد 10 ثوانٍ مرة واحدة في الجولة
els.btnFreeze.addEventListener('click', ()=>{
  if(state.game.usedFreeze) return toast('تم استخدام التجميد بالفعل في هذه الجولة');
  state.game.usedFreeze = true;
  state.game.frozen = true;
  let s = 10;
  const tmp = setInterval(()=>{
    s--;
    if(s<=0){
      clearInterval(tmp);
      state.game.frozen = false;
    }
  },1000);
});
// تخطي غير محدود بسعر متزايد
els.btnSkip.addEventListener('click', ()=>{
  state.game.score -= state.game.skipCost;
  state.game.skips++; state.game.skipCost += 20;
  stopTimer();
  updateHUD();
  state.game.questionIndex++;
  nextQuestion();
});

/* ===========================
   نهاية المستوى / النتائج
=========================== */
els.btnNextLevel.addEventListener('click', ()=>{
  state.game.currentLevelIndex++;
  if(state.game.currentLevelIndex >= LEVEL_ORDER.length){
    finalizeAndShowResults('انتهت جميع المستويات');
  }else{
    startLevel();
  }
});
els.btnWithdraw.addEventListener('click', ()=> finalizeAndShowResults('انسحاب اللاعب'));
els.playAgainBtn.addEventListener('click', ()=> location.reload());
els.openLeaderboardBtn.addEventListener('click', ()=> { showScreen('leaderboard'); refreshLeaderboard(); });
els.gotoLeaderboard.addEventListener('click', ()=> { showScreen('leaderboard'); refreshLeaderboard(); });

function finalizeAndShowResults(reason=''){
  const answered = state.game.correct + state.game.wrong;
  const accuracy = answered ? +(100*state.game.correct/answered).toFixed(1) : 0;
  const avg = answered ? Math.round(state.game.totalTimeSec/Math.max(1, answered)) : 0;
  const levelKey = getCurrentLevelKey();
  const rating = accuracy>=85 ? 'ممتاز' : accuracy>=60 ? 'جيّد' : 'يحتاج تحسين';
  const attemptNumber = nextAttemptNumber();

  const stats = {
    name: state.player.name,
    playerId: state.player.playerId,
    attempt: attemptNumber,
    correct: state.game.correct,
    wrong: state.game.wrong,
    skips: state.game.skips,
    score: state.game.score,
    total: state.game.totalTimeSec,
    level: LEVEL_LABEL[levelKey],
    accuracy,
    avg,
    rating
  };

  showScreen('results');
  renderResults(stats);

  // إرسال إلى GAS (نتيجة + سجل)
  if(CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL.startsWith('http')){
    sendToGAS('gameResult', stats).catch(()=>{});
    sendToGAS('log', {
      attemptNumber,
      deviceId: state.player.deviceId,
      playerId: state.player.playerId,
      name: state.player.name,
      correct: stats.correct, wrong: stats.wrong, accuracy: stats.accuracy,
      skips: stats.skips, usedFifty: state.game.usedFifty, usedFreeze: state.game.usedFreeze,
      score: stats.score, totalTimeSec: stats.total, avgTimeSec: stats.avg,
      lastLevel: levelKey, rating: stats.rating, createdAt: new Date().toISOString(), reason
    }).catch(()=>{});
  }

  // تحديث لوحة الصدارة عبر Supabase
  if(supa){
    const isImpossibleFinisher = (levelKey === 'impossible' && state.game.questionIndex >= LEVEL_COUNTS['impossible']);
    supa.from('leaderboard').upsert({
      device_id: state.player.deviceId,
      player_id: state.player.playerId,
      name: state.player.name,
      avatar: state.player.avatar,
      score: stats.score,
      level: levelKey,
      accuracy: stats.accuracy,
      total_time: stats.total,
      avg_time: stats.avg,
      correct_answers: stats.correct,
      wrong_answers: stats.wrong,
      skips: stats.skips,
      is_impossible_finisher: isImpossibleFinisher,
      updated_at: new Date().toISOString()
    }, { onConflict: 'device_id' }).then(()=> refreshLeaderboard());
  }
}

function renderResults(s){
  const rows = [
    ['الاسم', s.name], ['المعرّف', s.playerId], ['رقم المحاولة', s.attempt],
    ['الإجابات الصحيحة', s.correct], ['الإجابات الخاطئة', s.wrong],
    ['مرات التخطي', s.skips], ['النقاط النهائية', s.score],
    ['الوقت المستغرق (د.ث)', toMinSec(s.total)], ['المستوى الذي وصلت إليه', s.level],
    ['نسبة الدقة', `${s.accuracy}%`], ['متوسط وقت الإجابة (د.ث)', toMinSec(s.avg)],
    ['أداؤك', s.rating]
  ];
  els.finalResults.innerHTML = rows.map(([k,v])=> `<div class="kv"><b>${k}:</b><div>${v}</div></div>`).join('');

  const text = buildShareText(s);
  els.shareText.value = text;
}
function buildShareText(s){
  return `🏆 النتائج النهائية 🏆

الاسم: ${s.name}
المعرّف: ${s.playerId}
رقم المحاولة: ${s.attempt}
الإجابات الصحيحة: ${s.correct}
الإجابات الخاطئة: ${s.wrong}
مرات التخطي: ${s.skips}
النقاط النهائية: ${s.score}
الوقت المستغرق (د.ث): ${toMinSec(s.total)}
المستوى الذي وصلت إليه: ${s.level}
نسبة الدقة: ${s.accuracy}%
متوسط وقت الإجابة (د.ث): ${toMinSec(s.avg)}
أداؤك: ${s.rating}`;
}
els.copyShareTextBtn.addEventListener('click', ()=>{
  els.shareText.select(); document.execCommand('copy'); toast('تم نسخ النص');
});
els.shareXBtn.addEventListener('click', ()=>{
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(els.shareText.value)}`;
  window.open(url, '_blank');
});

/* ===========================
   البلاغات (Reports)
=========================== */
els.openReportBtn.addEventListener('click', ()=> els.reportModal.classList.remove('hidden'));
els.closeReport.addEventListener('click', ()=> els.reportModal.classList.add('hidden'));
els.sendReportBtn.addEventListener('click', async ()=>{
  const type = els.reportType.value;
  const description = els.reportDesc.value.trim();
  let screenshot_b64 = '';
  if(els.reportImage.files[0]){ screenshot_b64 = await fileToBase64(els.reportImage.files[0]); }
  const auto = !!els.reportAuto.checked;
  const payload = {
    playerId: state.player.playerId,
    name: state.player.name,
    type, description,
    question_text: $('#questionText')?.textContent || '',
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    auto_detected: auto,
    screenshot_b64
  };
  if(CONFIG.APPS_SCRIPT_URL){
    await sendToGAS('report', payload);
    toast('تم إرسال البلاغ، شكرًا لك!');
  }
  els.reportModal.classList.add('hidden');
});
function fileToBase64(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=> res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ===========================
   GAS Helper
=========================== */
async function sendToGAS(type, data){
  const body = { type, secretKey: CONFIG.TEST_KEY, data };
  const r = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

/* ===========================
   Supabase (لوحة الصدارة)
=========================== */
let supa = null;
if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && window.supabase) {
  supa = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
}
async function refreshLeaderboard(filter='all'){
  if(!supa){ $('#leaderboardList').innerHTML = `<div class="muted">لم تُهيّأ Supabase بعد.</div>`; return; }
  let q = supa.from('leaderboard').select('player_id,name,avatar,score,is_impossible_finisher').order('score',{ascending:false});
  if(filter==='top10') q = q.limit(10);
  if(filter==='impossible') q = q.eq('is_impossible_finisher', true);
  const { data, error } = await q;
  if(error){ $('#leaderboardList').innerHTML = `<div class="muted">خطأ: ${error.message}</div>`; return; }
  $('#leaderboardList').innerHTML = (data||[]).map((row,i)=> `
    <div class="row-item" data-player="${row.player_id}">
      <div class="rank">${i+1}</div>
      <div class="avatar">${row.avatar || '🙂'}</div>
      <div class="grow">
        <div><b>${row.name}</b></div>
        <div class="muted">النقاط: ${row.score}${row.is_impossible_finisher ? ' · مستحيل ✅' : ''}</div>
      </div>
    </div>
  `).join('') || `<div class="muted">لا يوجد بيانات بعد.</div>`;
  $$('#leaderboardList .row-item').forEach(el=>{
    el.addEventListener('click', ()=> openPlayerDetails(el.dataset.player));
  });
}
// تفاصيل اللاعب (من game_logs)
async function openPlayerDetails(playerId){
  if(!supa){ return; }
  const { data, error } = await supa.from('game_logs').select('*').eq('player_id', playerId).order('created_at', {ascending:false}).limit(25);
  if(error){ els.playerDetailsBody.innerHTML = `<div class="muted">خطأ: ${error.message}</div>`; }
  else {
    els.playerDetailsBody.innerHTML = (data||[]).map(x=>`
      <div class="row-item">
        <div class="grow">
          <div><b>${new Date(x.created_at).toLocaleString('ar')}</b></div>
          <div class="muted">نقاط: ${x.score} · دقة: ${x.accuracy}% · مستوى: ${x.level} · تخطي: ${x.skips}</div>
        </div>
      </div>
    `).join('') || `<div class="muted">لا توجد بيانات.</div>`;
  }
  els.playerDetailsModal.classList.remove('hidden');
}
els.closePlayerModal.addEventListener('click', ()=> els.playerDetailsModal.classList.add('hidden'));

// فلاتر الصدارة + تحديث كل دقيقة
els.lbFilters.addEventListener('click', (e)=>{
  const btn = e.target.closest('.pill'); if(!btn) return;
  $$('.pill', els.lbFilters).forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  refreshLeaderboard(btn.dataset.filter);
});
setInterval(()=> {
  if($('.screen.active') === screens.leaderboard) {
    const active = $('.pill.active', els.lbFilters)?.dataset.filter || 'all';
    refreshLeaderboard(active);
  }
}, 60000);

/* ===========================
   تنقّلات عامة
=========================== */
$$('.back-btn').forEach(b=> b.addEventListener('click', ()=> showScreen(b.dataset.back.slice(1)) ));
els.openDevBtn.addEventListener('click', ()=>{
  const p = prompt('أدخل كلمة مرور المطوّر'); if(p !== CONFIG.DEV_PASSWORD) return toast('كلمة المرور غير صحيحة');
  state.ui.devMode = true;
  showScreen('levelSelect');
});
$('#screen-level-select').addEventListener('click', (e)=>{
  const btn = e.target.closest('.pill'); if(!btn) return;
  startLevel(btn.dataset.level);
});
els.startBtn.addEventListener('click', ()=> showScreen('avatar'));
els.avatarNextBtn.addEventListener('click', ()=> showScreen('name'));
els.playerNameInput.addEventListener('input', ()=>{
  const ok = validateName(els.playerNameInput.value);
  els.confirmNameBtn.disabled = !ok;
});
els.confirmNameBtn.addEventListener('click', ()=>{
  const name = els.playerNameInput.value.trim();
  if(!validateName(name)) return toast('الاسم بين 2 و 25 حرفًا');
  state.player.name = name;
  if(!state.player.playerId) state.player.playerId = uuid('PL');
  if(!state.player.deviceId) state.player.deviceId = getDeviceId();
  showScreen('instructions');
});
els.startRoundBtn.addEventListener('click', ()=>{
  state.game.currentLevelIndex = 0;
  state.game.score = CONFIG.STARTING_SCORE;
  state.game.correct = 0; state.game.wrong = 0;
  state.game.skips = 0; state.game.skipCost = 20;
  state.game.totalTimeSec = 0;
  startLevel();
});

/* ===========================
   بدء التطبيق
=========================== */
(async function bootstrap(){
  initAvatars();
  await loadQuestions();
  updateHUD();
  renderLevelDots();
  $('#gotoLeaderboard')?.addEventListener('click', ()=> { showScreen('leaderboard'); refreshLeaderboard(); });
})();
