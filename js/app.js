// ===============================
// إعدادات عامة
// ===============================
const API_URL = "https://script.google.com/macros/s/AKfycbyrH5T16IblW-X8glLx_OG_SZNS2FCK5PlDc1Lv6QgkBp4QyGR6nIrmVnfI8jDGzWGo/exec";
const QUESTIONS_URL = "./data/questions.json?v=1";

// مدة السؤال بالثواني
const QUESTION_TIME = 90;

// الجوائز (15 جائزة)
const prizes = [
  { points: 100, title: "" },
  { points: 200, title: "" },
  { points: 300, title: "" },
  { points: 500, title: "" },
  { points: 1000, title: "وسام العقل اللامع" },
  { points: 2000, title: "" },
  { points: 4000, title: "" },
  { points: 8000, title: "" },
  { points: 16000, title: "" },
  { points: 32000, title: "حكيم الزمان" },
  { points: 64000, title: "" },
  { points: 125000, title: "" },
  { points: 250000, title: "" },
  { points: 500000, title: "" },
  { points: 1000000, title: "نجم المعرفة الذهبية" },
  { name: "تيتة", username: "@aroa_requiem" }
];

// سؤال احتياطي لتغيير السؤال
const reserveQuestion = {
  q: "ما المعنى الرمزي لعبارة سيلفيا الأخيرة: شكراً لك يا طفلي؟",
  options: ["شكر لأنه قبل الحجر وحمى سرها", "شكر على منحه إياها فرصة للشعور بالأمومة قبل موتها", "شكر على محاولته إنقاذها رغم استحالة الأمر", "شكر لأنه لم يتركها وحيدة حتى النهاية"],
  correct: 1
};

// الأسماء المسموحة
const allowedNames = [
  { name: "القارئ الوحيد", username: "@MS_AbuQusay" },
  { name: "کایرا", username: "@Mavimixx7" },
  { name: "عقيل", username: "@EZxAqeel" },
  { name: "Hussain XAlx", username: "@hussainx_10_x" },
  { name: "الموقر خالد الحب العظيم", username: "@souhail_2054" },
  { name: "الموقر طارق", username: "@_tarek_lb_" },
  { name: "حسان", username: "@hs_aizen" },
  { name: "تيسيا", username: "@sky65791" },
  { name: "مرتضى", username: "@MurtadaMur98079" },
  { name: "غراي", username: "@AyzwmyR" },
  { name: "The fool", username: "@Chuchiin516" },
  { name: "محمد", username: "@MHD_MX" },
  { name: "یزن", username: "@Princeyz2010" },
  { name: "ميس الريم", username: "@R2e0e0m1" },
  { name: "Kai", username: "@Kai_Virtra" },
  { name: "‏‎السير بلا شمس", username: "@Mabruok242139" },
  { name: "محمد جمال", username: "@HamoJamal99" }
];

// --- محاولات ومراقبة الجولة ---
const LIMIT_PER_DAY = 3;        // (للعرض فقط – الحد الفعلي يطبَّق بالـGAS)
const PING_EVERY_MS = 20000;    // نرسل نبضة كل 20 ثانية

let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = (crypto.randomUUID && crypto.randomUUID()) ||
             (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  localStorage.setItem('deviceId', deviceId);
}

// ===============================
// حالة اللعبة
// ===============================
let questions = [];         // تأتي من الملف JSON
let shuffledQuestions = []; // ترتيب العرض (عشوائي دائمًا)
let currentQuestion = 0;

let playerName = "";
let participantId = "";
let attemptId = null;

let timer;
let timeLeft = QUESTION_TIME;

let score = 0;
let wrongAnswers = 0;
const maxWrongAnswers = 3;

let timeHelpUsed = false;
let changeQuestionUsed = false;
let fiftyFiftyUsed = false;
let usedPoints = 0;

let playerStats = {
  attempts: 0,
  bestScore: 0,
  bestTitle: "",
  lastScore: 0,
  lastTitle: ""
};
let currentAttemptNumber = 0;

let gameStartTime;
let gameEndTime;

let eventsLog = [];
let pingTimer = null;
let gameFinished = false;

// ===============================
// عناصر DOM
// ===============================
const questionText = document.getElementById("questionText");
const optionsBox = document.getElementById("optionsBox");
const prizeList = document.getElementById("prizeList");
const timerElement = document.getElementById("timer");
const currentQuestionNum = document.getElementById("currentQuestionNum");
const totalQuestionsEl = document.getElementById("totalQuestions");
const playerDisplayName = document.getElementById("playerDisplayName");
const playerAvatar = document.getElementById("playerAvatar");
const scoreElement = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const prizeEarned = document.getElementById("prizeEarned");
const endTitle = document.getElementById("endTitle");
const wrongCountElement = document.getElementById("wrongCount");
const currentTitleElement = document.getElementById("currentTitle");
const finalTitleElement = document.getElementById("highestTitle");
const addTimeBtn = document.getElementById("addTimeBtn");
const changeQuestionBtn = document.getElementById("changeQuestionBtn");
const totalPointsElement = document.getElementById("totalPointsEnd");
const usedPointsElement = document.getElementById("usedPointsEnd");
const netPointsElement = document.getElementById("netPointsEnd");
const playerNameEnd = document.getElementById("playerNameEnd");
const endTimeElement = document.getElementById("endTime");
const fiftyBtn = document.getElementById("fiftyBtn");
const shareTextContent = document.getElementById("shareTextContent");
const saveStatus = document.getElementById("saveStatus");
const playerSelect = document.getElementById("playerSelect");

// ===============================
// أدوات مساعدة
// ===============================
function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) {
    return "0";
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function showSaveStatus(message, type = 'saving') {
  saveStatus.textContent = message;
  saveStatus.className = 'save-status ' + type;
  saveStatus.style.display = 'block';
  if (type !== 'saving') setTimeout(() => (saveStatus.style.display = 'none'), 3000);
}
function generateParticipantId(name) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${name.replace(/\s+/g, '_')}_${ts}_${rnd}`;
}
function logEvent(type, details = {}) {
  const event = { type, timestamp: new Date().toISOString(), ...details };
  eventsLog.push(event);
  // حفظ محلي فقط
  if (['answer', 'helper_used', 'game_start', 'game_end'].includes(type)) saveGameState();
}

// تطبيع الاسم/اليوزر (إزالة التشكيل، توحيد الألف..)
function normalizeName(s){
  return (s || "")
    .trim()
    .replace(/\u0640/g, '')                // ـ (التطويل)
    .replace(/[\u064B-\u0652\u0670]/g,'')  // التشكيل
    .replace(/[إأآٱا]/g,'ا')               // الألف
    .replace(/ى/g,'ي')
    .replace(/ؤ/g,'و')
    .replace(/ئ/g,'ي')
    .replace(/\s+/g,' ');                  // مسافة واحدة
}

// ===============================
// حفظ/استرجاع (محلي فقط)
// ===============================
function getCurrentTitle() {
  let title = "";
  for (const prize of prizes) {
    if (score >= prize.points && prize.title && score > 0) {
      title = prize.title;
    }
  }
  return title;
}
function updateWrongCount() { wrongCountElement.textContent = wrongAnswers; }
function updateTitle() { currentTitleElement.textContent = getCurrentTitle(); }

function saveGameState() {
  const gameState = {
    participantId,
    name: playerName,
    attempt: currentAttemptNumber,
    currentQuestion,
    score,
    status: 'in_progress',
    lastUpdate: new Date().toISOString(),
    startTime: gameStartTime ? gameStartTime.toISOString() : null,
    endTime: gameEndTime ? gameEndTime.toISOString() : null,
    totalTime: gameStartTime && gameEndTime ? (gameEndTime - gameStartTime) : 0,
    wrongAnswers,
    usedPoints,
    helpersUsed: { fiftyFiftyUsed, timeHelpUsed, changeQuestionUsed },
    events: [...eventsLog],
    finalTitle: getCurrentTitle(),
    shuffledOrder: shuffledQuestions.length ? shuffledQuestions.map(q => questions.indexOf(q)) : null
  };
  localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem('gameState');
  if (!savedState) return false;
  try {
    const state = JSON.parse(savedState);
    if (state.name !== playerName) return false;

    participantId = state.participantId || participantId;
    currentQuestion = state.currentQuestion ?? currentQuestion;
    score = state.score ?? score;
    wrongAnswers = state.wrongAnswers ?? wrongAnswers;
    usedPoints = state.usedPoints ?? usedPoints;
    fiftyFiftyUsed = state.helpersUsed?.fiftyFiftyUsed || false;
    timeHelpUsed = state.helpersUsed?.timeHelpUsed || false;
    changeQuestionUsed = state.helpersUsed?.changeQuestionUsed || false;
    eventsLog = state.events || [];

    if (Array.isArray(state.shuffledOrder) && state.shuffledOrder.length) {
      shuffledQuestions = state.shuffledOrder.map(i => questions[i]).filter(Boolean);
    }

    scoreElement.textContent = formatNumber(score);
    updateWrongCount();
    updateTitle();
    return true;
  } catch (e) {
    console.error('Error parsing saved gameState', e);
    return false;
  }
}

// ===============================
// جلب الأسئلة من الملف (ثم عشوائي)
// ===============================
async function loadQuestions() {
  try {
    const res = await fetch(QUESTIONS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('أسئلة فارغة');
    questions = data;
  } catch (e) {
    console.error('Failed to load questions.json', e);
    questions = [
      { q: "سؤال تجريبي: 2 + 2 = ؟", options: ["1","2","3","4"], correct: 3 }
    ];
  }
  totalQuestionsEl.textContent = questions.length;
}

// ===============================
// عرض الجوائز
// ===============================
function renderPrizes() {
  prizeList.innerHTML = "";
  prizes.forEach((prize, i) => {
    const li = document.createElement("li");
    li.textContent = `${formatNumber(prize.points)} نقطة`;
    if (prize.title) li.innerHTML += `<span class="title">${prize.title}</span>`;
    li.id = `prize-${i}`;
    prizeList.appendChild(li);
  });
}
function highlightPrize(index) {
  prizes.forEach((_, i) => {
    const li = document.getElementById(`prize-${i}`);
    if (li) li.classList.remove("current-prize");
  });
  const li = document.getElementById(`prize-${index}`);
  if (li) li.classList.add("current-prize");
}

// ===============================
// منطق الأسئلة (عشوائية العرض)
// ===============================
function shuffleQuestions() {
  shuffledQuestions = [...questions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }
}

function showQuestion() {
  if (!shuffledQuestions || !shuffledQuestions.length) shuffledQuestions = [...questions];

  const q = shuffledQuestions[currentQuestion];
  questionText.textContent = q.q;
  currentQuestionNum.textContent = currentQuestion + 1;
  optionsBox.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i);
    optionsBox.appendChild(btn);
  });

  highlightPrize(currentQuestion);
  resetTimer();
}

function checkAnswer(index) {
  const q = shuffledQuestions[currentQuestion];
  const correct = q.correct;
  const options = document.querySelectorAll(".option");

  clearInterval(timer);
  options.forEach(opt => (opt.style.pointerEvents = "none"));

  const isCorrect = index === correct;
  logEvent('answer', {
    question: currentQuestion,
    selected: index,
    correct: correct,
    isCorrect,
    points: isCorrect ? prizes[currentQuestion].points : 0
  });

  options.forEach((opt, i) => {
    if (i === correct) setTimeout(() => opt.classList.add("correct"), 500);
    if (i === index && i !== correct) setTimeout(() => opt.classList.add("wrong"), 500);
  });

  if (isCorrect) {
    score += prizes[currentQuestion].points;
    scoreElement.textContent = formatNumber(score);
    updateTitle();
    setTimeout(() => {
      currentQuestion++;
      if (currentQuestion < shuffledQuestions.length && wrongAnswers < maxWrongAnswers) {
        showQuestion();
      } else {
        endGame(wrongAnswers < maxWrongAnswers);
      }
    }, 1500);
  } else {
    wrongAnswers++;
    updateWrongCount();
    setTimeout(() => {
      if (wrongAnswers >= maxWrongAnswers) {
        endGame(false);
      } else {
        currentQuestion++;
        if (currentQuestion < shuffledQuestions.length) showQuestion();
        else endGame(true);
      }
    }, 1500);
  }

  saveGameState();
}

// ===============================
// المؤقت
// ===============================
function startTimer() {
  clearInterval(timer);
  timeLeft = QUESTION_TIME;
  timerElement.textContent = timeLeft;

  timer = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      timeUp();
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timer);
  timeLeft = QUESTION_TIME;
  timerElement.textContent = timeLeft;
  startTimer();
}
function timeUp() {
  const options = document.querySelectorAll(".option");
  options.forEach(opt => (opt.style.pointerEvents = "none"));
  setTimeout(() => {
    wrongAnswers++;
    updateWrongCount();
    if (wrongAnswers >= maxWrongAnswers) endGame(false);
    else {
      currentQuestion++;
      if (currentQuestion < shuffledQuestions.length) showQuestion();
      else endGame(true);
    }
  }, 1000);
}

// ===============================
// المساعدات
// ===============================
fiftyBtn.onclick = () => {
  if (fiftyFiftyUsed) return alert("لقد استخدمت هذه المساعدة بالفعل!");
  if (score < 40000) return alert("تحتاج إلى 40000 نقطة على الأقل لاستخدام هذه الميزة!");

  score -= 40000; usedPoints += 40000; fiftyFiftyUsed = true;
  scoreElement.textContent = formatNumber(score);
  fiftyBtn.disabled = true;

  const q = shuffledQuestions[currentQuestion];
  const wrongIndexes = q.options.map((_, i) => i).filter(i => i !== q.correct);
  const shuffled = [...wrongIndexes].sort(() => Math.random() - 0.5);
  const toRemove = shuffled.slice(0, 2);

  const options = document.querySelectorAll(".option");
  toRemove.forEach(i => {
    options[i].style.opacity = "0.3";
    options[i].style.pointerEvents = "none";
  });

  logEvent('helper_used', { helper: 'fifty_fifty', cost: 40000 });
  saveGameState();
};

addTimeBtn.onclick = () => {
  if (timeHelpUsed) return alert("لقد استخدمت هذه المساعدة بالفعل!");
  if (score < 30000) return alert("تحتاج إلى 30000 نقطة على الأقل لاستخدام هذه الميزة!");

  score -= 30000; usedPoints += 30000; timeHelpUsed = true;
  scoreElement.textContent = formatNumber(score);
  timeLeft += 15;
  timerElement.textContent = timeLeft;
  addTimeBtn.disabled = true;

  timerElement.style.color = "#00ff00";
  setTimeout(() => { timerElement.style.color = "var(--accent)"; }, 1000);

  logEvent('helper_used', { helper: 'add_time', cost: 30000 });
  saveGameState();
};

changeQuestionBtn.onclick = () => {
  if (changeQuestionUsed) return alert("لقد استخدمت هذه المساعدة بالفعل!");
  if (score < 50000) return alert("تحتاج إلى 50000 نقطة على الأقل لاستخدام هذه الميزة!");

  score -= 50000; usedPoints += 50000; changeQuestionUsed = true;
  scoreElement.textContent = formatNumber(score);
  changeQuestionBtn.disabled = true;

  shuffledQuestions[currentQuestion] = reserveQuestion;
  showQuestion();

  logEvent('helper_used', { helper: 'change_question', cost: 50000 });
  saveGameState();
};

// ===============================
// شاشات البداية/الاسم/النهاية
// ===============================
function populatePlayerSelect() {
  playerSelect.innerHTML = "";
  
  // إضافة الخيار الافتراضي
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "اختر اسمك من القائمة";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  playerSelect.appendChild(defaultOption);
  
  // إضافة أسماء اللاعبين
  allowedNames.forEach(player => {
    const option = document.createElement("option");
    option.value = player.name;
    option.textContent = `${player.name} (${player.username})`;
    playerSelect.appendChild(option);
  });
}

window.startEntry = function startEntry() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("nameEntry").style.display = "flex";
  populatePlayerSelect();
};

// ===============================
// تواصل مضبوط مع الخادم (start / ping / end / abandon)
// ===============================
async function requestStart(name) {
  showSaveStatus('جارٍ بدء الجولة...', 'saving');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'start', name, deviceId })
    });
    const json = await res.json();

    // لازم success + attemptId
    if (!json.success || !json.attemptId) {
      if (json && json.error === 'limit_reached') {
        alert(`انتهت محاولاتك لهذا اليوم (${json.limit || LIMIT_PER_DAY}). يتجدد العداد عند منتصف الليل.`);
      } else {
        alert((json && json.error) || 'تعذر بدء الجولة');
      }
      showSaveStatus('فشل البدء', 'error');
      return null;
    }

    attemptId = json.attemptId;
    showSaveStatus('تم البدء ✓', 'success');
    return attemptId;
  } catch (e) {
    console.error(e);
    showSaveStatus('خطأ في البدء', 'error');
    alert('تعذر الاتصال بالخادم. حاول مجددًا.');
    return null;
  }
}

function startPing() {
  stopPing();
  pingTimer = setInterval(sendPing, PING_EVERY_MS);
}
function stopPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}
async function sendPing() {
  if (!attemptId) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        action: 'ping',
        attemptId,
        name: playerName,
        deviceId,
        currentQuestion,
        score,
        wrongAnswers,
        lastEventAt: eventsLog.length ? eventsLog[eventsLog.length - 1].timestamp : null
      })
    });
  } catch (e) {
    console.warn('ping failed', e);
  }
}

async function sendEnd(finalPayload) {
  if (!attemptId) return;
  showSaveStatus('جارٍ حفظ النتيجة...', 'saving');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'end',
        attemptId,
        name: playerName,
        deviceId,
        ...finalPayload
      })
    });
    const json = await res.json();
    if (json.success) showSaveStatus('تم الحفظ ✓', 'success');
    else showSaveStatus('فشل حفظ النتيجة', 'error');
  } catch (e) {
    console.error(e);
    showSaveStatus('فشل حفظ النتيجة', 'error');
  }
}

function sendAbandonBeacon() {
  if (!attemptId || gameFinished) return;
  const payload = {
    action: 'abandon',
    attemptId,
    name: playerName,
    deviceId
  };
  try {
    navigator.sendBeacon(API_URL, JSON.stringify(payload));
  } catch (_) {}
}

// ===============================
// بدء اللعبة (طلب start أولًا) + تطبيع الاسم/اليوزر
// ===============================
window.submitName = async function submitName() {
  const selectedName = playerSelect.value;
  
  if (!selectedName) {
    return alert("الرجاء اختيار اسمك من القائمة");
  }

  // البحث عن الاسم المختار في القائمة
  const player = allowedNames.find(p => p.name === selectedName);
  if (!player) return;

  playerName = player.name;
  playerDisplayName.textContent = playerName;
  playerAvatar.textContent = playerName.charAt(0).toUpperCase();

  // اطلب بدء الجولة + حد المحاولات
  const id = await requestStart(playerName);
  if (!id) {
    document.getElementById("nameEntry").style.display = "flex";
    return;
  }

  document.getElementById("nameEntry").style.display = "none";
  document.querySelector(".sidebar").style.display = "flex";
  document.querySelector(".container").style.display = "flex";

  if (!participantId) participantId = generateParticipantId(playerName);

  // حفظ حالة أولية
  gameFinished = false;
  saveGameState();

  // حمّل الأسئلة ثم ابدأ + ابدأ النبضات
  await loadQuestions();
  startGameFlow();
  startPing();
};

function startGameFlow() {
  renderPrizes();

  // إن وُجدت حالة محفوظة، يتم استرجاعها بعد توفر الأسئلة
  const restored = loadGameState();

  // تأمين ترتيب الأسئلة (عشوائي دائمًا عند الجولة الجديدة)
  if (!shuffledQuestions.length) {
    shuffleQuestions();
  }

  totalQuestionsEl.textContent = shuffledQuestions.length;
  if (currentQuestion >= shuffledQuestions.length) currentQuestion = 0;

  showQuestion();
  startTimer();
  updatePlayerStats();
  if (!gameStartTime) gameStartTime = new Date();
  logEvent('game_start');
}

// ===============================
// إحصائيات اللاعب
// ===============================
function updatePlayerStats() {
  const savedData = localStorage.getItem(playerName);
  if (savedData) playerStats = JSON.parse(savedData);
  else playerStats = { attempts: 0, bestScore: 0, bestTitle: "", lastScore: 0, lastTitle: "" };
  currentAttemptNumber = playerStats.attempts + 1;
}
function savePlayerStats() {
  playerStats.attempts = currentAttemptNumber;
  playerStats.lastScore = score;
  playerStats.lastTitle = getCurrentTitle();
  if (score > playerStats.bestScore) {
    playerStats.bestScore = score;
    playerStats.bestTitle = playerStats.lastTitle;
  }
  localStorage.setItem(playerName, JSON.stringify(playerStats));
}

// ===============================
// إنهاء/إعادة/لاعب جديد
// ===============================
window.retryGame = async function retryGame() {
  // نهاية الجولة الحالية بالفعل، ابدأ محاولة جديدة (يستهلك محاولة من الحد اليومي)
  stopPing();
  attemptId = null;
  gameFinished = false;

  const id = await requestStart(playerName);
  if (!id) return; // فشل أو تجاوز الحد

  currentQuestion = 0;
  timeHelpUsed = false;
  changeQuestionUsed = false;
  fiftyFiftyUsed = false;
  score = 0;
  usedPoints = 0;
  wrongAnswers = 0;
  scoreElement.textContent = score;
  updateWrongCount();
  updateTitle();

  fiftyBtn.disabled = false;
  addTimeBtn.disabled = false;
  changeQuestionBtn.disabled = false;

  document.querySelectorAll(".option").forEach(opt => {
    opt.classList.remove("correct", "wrong");
    opt.style.opacity = "1";
    opt.style.pointerEvents = "auto";
  });

  shuffleQuestions();
  logEvent('game_retry');
  saveGameState();

  document.getElementById("endScreen").style.display = "none";
  document.getElementById("retryBox").style.display = "none";
  document.getElementById("shareModal").style.display = "none";

  gameStartTime = new Date();
  showQuestion();
  startTimer();
  startPing();
};

window.newPlayer = function newPlayer() {
  stopPing();
  attemptId = null;
  gameFinished = false;

  document.getElementById("endScreen").style.display = "none";
  document.getElementById("shareModal").style.display = "none";
  document.querySelector(".sidebar").style.display = "none";
  document.querySelector(".container").style.display = "none";
  document.getElementById("nameEntry").style.display = "flex";
  document.getElementById("playerSelect").value = "";
  document.getElementById("playerSelect").focus();

  localStorage.removeItem('gameState');
  eventsLog = [];
  participantId = '';
};

function endGame(isWin) {
  clearInterval(timer);
  stopPing();
  gameEndTime = new Date();
  gameFinished = true;

  const netScore = score - usedPoints;
  const diff = gameEndTime - gameStartTime;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const usedHelpersCount = [fiftyFiftyUsed, timeHelpUsed, changeQuestionUsed].filter(Boolean).length;

  savePlayerStats();

  endTitle.textContent = isWin ? "مبروك! لقد فزت باللقب" : "انتهت اللعبة";
  const currentTitle = getCurrentTitle();
  prizeEarned.textContent = currentTitle;
  finalScore.textContent = formatNumber(score);
  finalTitleElement.textContent = playerStats.bestTitle;

  playerNameEnd.textContent = playerName;
  totalPointsElement.textContent = formatNumber(score);
  netPointsElement.textContent = formatNumber(netScore);
  document.getElementById("highestTitle").textContent = playerStats.bestTitle;
  endTimeElement.textContent = formattedTime;
  document.getElementById("usedHelpersCount").textContent = usedHelpersCount;
  usedPointsElement.textContent = formatNumber(usedPoints);

  document.getElementById("endScreen").style.display = "flex";

  logEvent('game_end', {
    win: isWin,
    finalScore: score,
    finalTitle: currentTitle,
    wrongAnswers,
    usedPoints
  });

  const finalState = {
    status: 'completed',
    startTime: gameStartTime ? gameStartTime.toISOString() : null,
    endTime: gameEndTime.toISOString(),
    totalTime: diff,
    wrongAnswers,
    usedPoints,
    helpersUsed: { fiftyFiftyUsed, timeHelpUsed, changeQuestionUsed },
    finalTitle: currentTitle,
    score,
    currentQuestion,
    shuffledOrder: shuffledQuestions.map(q => questions.indexOf(q)),
    events: eventsLog
  };
  sendEnd(finalState);

  localStorage.removeItem('gameState');
}

// ===============================
// المشاركة
// ===============================
function buildShareText() {
  const netScore = score - usedPoints;
  const usedHelpersCount = [fiftyFiftyUsed, timeHelpUsed, changeQuestionUsed].filter(Boolean).length;
  return `🏆 لقد أنهيت تحدي المسابقة!
🔹 الاسم: ${playerName}
🔹 مجموع النقاط: ${formatNumber(score)}
🔹 أعلى لقب وصلت إليه: ${playerStats.bestTitle}
🔹 عدد المساعدات المستخدمة: ${usedHelpersCount}
🔹 النقاط المخصومة بسبب المساعدات: ${formatNumber(usedPoints)}
🔹 نتيجتي النهائية: ${formatNumber(netScore)} نقطة

هل تستطيع أن تتفوق علي؟ 
رابط المسابقة:
https://abuqusayms.github.io/Tbate-Game/
#تباتي #TBATE`;
}
window.shareResults = function shareResults() {
  shareTextContent.textContent = buildShareText();
  document.getElementById("shareModal").style.display = "flex";
};
window.closeShareModal = function closeShareModal() {
  document.getElementById("shareModal").style.display = "none";
};
window.shareOnTwitter = function shareOnTwitter() {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`;
  window.open(twitterUrl, "_blank");
};
window.shareOnInstagram = function shareOnInstagram() {
  alert("تم نسخ النتائج إلى الحافظة. يُرجى لصقها في تطبيق Instagram لمشاركتها.");
  window.copyResults();
};
window.copyResults = function copyResults() {
  navigator.clipboard.writeText(buildShareText()).then(() => {
    alert("تم نسخ النتائج إلى الحافظة بنجاح!");
  }).catch(err => {
    console.error('Failed to copy: ', err);
    alert("حدث خطأ أثناء النسخ. جرّب مرة أخرى.");
  });
};

// ===============================
// تهيئة أولية
// ===============================
window.onload = () => {
  document.querySelector(".sidebar").style.display = "none";
  document.querySelector(".container").style.display = "none";
  document.getElementById("nameEntry").style.display = "none";
  document.getElementById("endScreen").style.display = "none";
  document.getElementById("shareModal").style.display = "none";
  document.getElementById("maxWrong").textContent = maxWrongAnswers;

  // ملء قائمة الأسماء عند التحميل
  populatePlayerSelect();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGameState();
  });
  window.addEventListener('beforeunload', () => {
    saveGameState();
    // لو أغلق قبل النهاية نعلِّمها "abandon" بدون إنشاء صف جديد
    sendAbandonBeacon();
  });

  renderPrizes(); // تجهّز قائمة الجوائز (تظهر بعد البدء)
};
