/* ============ الإعدادات ============ */
const CONFIG = {
  TEST_KEY: 'AbuQusay',                // مفتاح بسيط مع GAS
  APPS_SCRIPT_URL: 'PUT_YOUR_GAS_URL', // عدّلها لرابط GAS بعد النشر
  SUPABASE_URL: '',                    // اختياري: URL
  SUPABASE_KEY: '',                    // اختياري: anon key
  QUESTION_TIME: 30,
  MAX_WRONG: 3,
  STARTING_SCORE: 100,
  DEV_PASSWORD: 'developer'            // كلمة مرور وضع المطوّر
};

const LEVEL_LABEL = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', impossible: 'مستحيل' };
const LEVEL_ORDER = ['easy', 'medium', 'hard', 'impossible'];
const LEVEL_COUNTS = { easy: 10, medium: 10, hard: 10, impossible: 1 };

/* ============ الحالة ============ */
const state = {
  player: { name:'', avatar:'🙂', playerId:'', deviceId:'' },
  game: {
    currentLevelIndex: 0,
    score: CONFIG.STARTING_SCORE,
    correct: 0, wrong: 0,
    skips: 0, skipCost: 20,
    usedFifty: false, usedFreeze: false,
    questionIndex: 0,
    totalTimeSec: 0,
    timer: null, remaining: CONFIG.QUESTION_TIME, frozen: false
  },
  ui: { devMode:false },
  questions: { easy:[], medium:[], hard:[], impossible:[] }
};

/* ============ DOM ============ */
const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> [...r.querySelectorAll(s)];

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
  themeToggle: $('#themeToggle'), gotoLeaderboard: $('#gotoLeaderboard'),
  startBtn: $('#startBtn'), openDevBtn: $('#openDevBtn'),
  avatarGrid: $('#avatarGrid'), avatarNextBtn: $('#avatarNextBtn'),
  playerNameInput: $('#playerNameInput'), confirmNameBtn: $('#confirmNameBtn'),
  startRoundBtn: $('#startRoundBtn'),
  levelDots: $('#levelDots'), hudScore: $('#hudScore'), hudMistakes: $('#hudMistakes'),
  hudAvatar: $('#hudAvatar'), hudName: $('#hudName'),
  btnSkip: $('#btnSkip'), btnFreeze: $('#btnFreeze'), btnFifty: $('#btnFifty'), skipCost: $('#skipCost'),
  timerBar: $('#timerBar'), timerLabel: $('#timerLabel'),
  levelBadge: $('#levelBadge'), qCounter: $('#qCounter'),
  questionText: $('#questionText'), options: $('#options'),
  btnNextLevel: $('#btnNextLevel'), btnWithdraw: $('#btnWithdraw'),
  finalResults: $('#finalResults'),
  shareXBtn: $('#shareXBtn'), copyShareTextBtn: $('#copyShareTextBtn'), shareText: $('#shareText'),
  playAgainBtn: $('#playAgainBtn'), openLeaderboardBtn: $('#openLeaderboardBtn'),
  lbFilters: $('#lbFilters'), leaderboardList: $('#leaderboardList'),
  playerDetailsModal: $('#playerDetailsModal'), closePlayerModal: $('#closePlayerModal'), playerDetailsBody: $('#playerDetailsBody'),
  openReportBtn: $('#openReportBtn'), reportModal: $('#reportModal'), closeReport: $('#closeReport'),
  reportType: $('#reportType'), reportDesc: $('#reportDesc'), reportImage: $('#reportImage'),
  reportAuto: $('#reportAuto'), sendReportBtn: $('#sendReportBtn')
};

/* ============ أدوات ============ */
function showScreen(target){
  let el = null;
  if (typeof target === 'string') {
    el = target.startsWith('#') ? document.querySelector(target)
        : (screens[target] || document.querySelector(`#screen-${target}`));
  } else if (target instanceof HTMLElement) {
    el = target;
  }
  if (!el) { console.error('Screen not found:', target); return; }
  document.querySelectorAll('.screen').forEach(sc => sc.classList.remove('active'));
  el.classList.add('active');
}
function toMinSec(sec){ const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,'0')}`; }
function uuid(prefix='PL'){ return prefix + Math.random().toString(36).slice(2,6).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase(); }
function getDeviceId(){ let d=localStorage.getItem('quizDeviceId'); if(!d){ d='D'+uuid('').slice(2); localStorage.setItem('quizDeviceId',d);} return d; }
function toast(m){ alert(m); }

/* تبديل الوضع */
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

/* ============ تحميل الأسئلة ============ */
async function loadQuestions(){
  try{
    const res = await fetch('./questions.json', { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    state.questions = await res.json();
  }catch(err){
    console.error('Error loading questions:', err);
    toast('تعذّر تحميل الأسئلة. تأكد من وجود questions.json بجوار index.html');
  }
}

/* ============ واجهة أولية ============ */
function initAvatars(){
  const emojis = ['🙂','😁','🤓','🧑‍💻','🧔','👩‍🦱','🧑‍🎓','🧑‍🎨','🧑‍🚀','🧑‍🚒'];
  els.avatarGrid.innerHTML = '';
  emojis.forEach(e=>{
    const d = document.createElement('div');
    d.className = 'avatar'; d.textContent = e;
    d.addEventListener('click', ()=>{
      $$('.avatar', els.avatarGrid).forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected'); state.player.avatar = e; els.avatarNextBtn.disabled = false;
    });
    els.avatarGrid.appendChild(d);
  });
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
  LEVEL_ORDER.forEach((_,i)=>{
    const s = document.createElement('span'); s.className='chip'; s.textContent = `${i+1}`;
    if(i===state.game.currentLevelIndex) s.style.outline='2px solid var(--accent)';
    els.levelDots.appendChild(s);
  });
}
const currentLevelKey = ()=> LEVEL_ORDER[state.game.currentLevelIndex];
const currentBucket   = ()=> state.questions[currentLevelKey()] || [];

/* ============ الجولة ============ */
function startLevel(k){
  if(k){ state.game.currentLevelIndex = LEVEL_ORDER.indexOf(k); }
  state.game.questionIndex = 0;
  state.game.usedFifty = false;
  state.game.usedFreeze = false;
  state.game.skipCost = 20;

  renderLevelDots();
  showScreen('game');
  nextQuestion();
}

function nextQuestion(){
  const bucket = currentBucket();
  const totalInLevel = LEVEL_COUNTS[currentLevelKey()];
  if (state.game.questionIndex >= totalInLevel) { showScreen('levelEnd'); return; }

  const q = bucket[state.game.questionIndex];
  els.levelBadge.textContent = LEVEL_LABEL[currentLevelKey()];
  els.qCounter.textContent = `السؤال ${state.game.questionIndex+1} من ${totalInLevel}`;
  els.questionText.textContent = q.q;
  els.options.innerHTML = '';

  q.options.forEach((opt, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'option'; btn.textContent = opt;
    btn.addEventListener('click', ()=> onAnswer(idx, q.correct));
    els.options.appendChild(btn);
  });

  if(state.game.usedFifty){ applyFiftyToOptions(q.correct); }
  startTimer(); updateHUD();
}

function onAnswer(choiceIdx, correctIdx){
  stopTimer();
  const isCorrect = choiceIdx === correctIdx;
  markOptions(choiceIdx, correctIdx);

  const timeSpent = CONFIG.QUESTION_TIME - state.game.remaining;
  state.game.totalTimeSec += Math.max(0, timeSpent);

  if(isCorrect){
    state.game.correct++; state.game.score += 100;
    if(state.game.remaining >= CONFIG.QUESTION_TIME/2) state.game.score += 50;
  }else{
    state.game.wrong++; state.game.score -= 50;
  }
  updateHUD();

  setTimeout(()=>{
    if(state.game.wrong >= CONFIG.MAX_WRONG){
      finalizeAndShowResults('الخروج بسبب الأخطاء');
    }else{
      state.game.questionIndex++; nextQuestion();
    }
  }, 600);
}

function markOptions(choice, correct){
  $$('.option', els.options).forEach((b,i)=>{
    b.classList.add(i===correct ? 'correct' : (i===choice ? 'wrong' : ''));
    b.disabled = true;
  });
}

/* ============ المؤقت ============ */
function startTimer(){
  state.game.remaining = CONFIG.QUESTION_TIME;
  els.timerBar.style.width = '100%'; els.timerLabel.textContent = `${state.game.remaining}`;
  state.game.frozen = false;

  clearInterval(state.game.timer);
  state.game.timer = setInterval(()=>{
    if(state.game.frozen) return;
    state.game.remaining--;
    els.timerLabel.textContent = `${state.game.remaining}`;
    els.timerBar.style.width = `${(state.game.remaining/CONFIG.QUESTION_TIME)*100}%`;
    if(state.game.remaining <= 0){
      clearInterval(state.game.timer);
      const q = currentBucket()[state.game.questionIndex];
      onAnswer(-1, q.correct);
    }
  }, 1000);
}
function stopTimer(){ clearInterval(state.game.timer); }

/* ============ المساعدات ============ */
function applyFiftyToOptions(correctIdx){
  const options = $$('.option', els.options);
  let removed = 0;
  for(let i=0;i<options.length && removed<2;i++){
    if(i!==correctIdx && !options[i].classList.contains('disabled')){
      options[i].classList.add('disabled'); options[i].disabled = true; removed++;
    }
  }
}
els.btnFifty.addEventListener('click', ()=>{
  if(state.game.usedFifty) return toast('تم استخدام 50:50 بالفعل في هذه الجولة');
  state.game.usedFifty = true;
  const q = currentBucket()[state.game.questionIndex];
  applyFiftyToOptions(q.correct);
});
els.btnFreeze.addEventListener('click', ()=>{
  if(state.game.usedFreeze) return toast('تم استخدام التجميد بالفعل في هذه الجولة');
  state.game.usedFreeze = true;
  state.game.frozen = true; let s = 10;
  const t = setInterval(()=>{ s--; if(s<=0){ clearInterval(t); state.game.frozen=false; } },1000);
});
els.btnSkip.addEventListener('click', ()=>{
  state.game.score -= state.game.skipCost;
  state.game.skips++; state.game.skipCost += 20;
  stopTimer(); updateHUD();
  state.game.questionIndex++; nextQuestion();
});

/* ============ نهاية المستوى / النتائج ============ */
els.btnNextLevel.addEventListener('click', ()=>{
  state.game.currentLevelIndex++;
  if(state.game.currentLevelIndex >= LEVEL_ORDER.length){
    finalizeAndShowResults('انتهت جميع المستويات');
  }else{
    startLevel();
  }
});
els.btnWithdraw.addEventListener('click', ()=> finalizeAndShowResults('انسحاب اللاعب') );
els.playAgainBtn.addEventListener('click', ()=> location.reload() );
els.openLeaderboardBtn.addEventListener('click', ()=> showScreen('leaderboard'));
els.gotoLeaderboard.addEventListener('click', ()=> { showScreen('leaderboard'); refreshLeaderboard(); });

function finalizeAndShowResults(reason=''){
  const answered = state.game.correct + state.game.wrong;
  const accuracy = answered ? +(100*state.game.correct/answered).toFixed(1) : 0;
  const avg = answered ? Math.round(state.game.totalTimeSec/answered) : 0;
  cons
