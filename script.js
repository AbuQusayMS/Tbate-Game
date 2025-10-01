let player = {
  name: "",
  avatar: "",
  score: 0,
  skips: 0,
  wrong: 0,
  correct: 0,
  level: "",
};

let questions = {};
let currentQuestionIndex = 0;
let currentLevel = "";
let skipCost = 20;
let timer;
let timeLeft = 30;

async function loadQuestions() {
  const res = await fetch("questions.json");
  questions = await res.json();
}

function goToScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

function confirmName() {
  const name = document.getElementById("playerName").value;
  if (!name) return alert("الرجاء إدخال الاسم");
  player.name = name;
  goToScreen("avatar-screen");
}

function confirmAvatar() {
  player.avatar = "🙂"; // افتراضياً
  goToScreen("instructions-screen");
}

function startGame(level) {
  player.level = level;
  player.score = 100;
  player.correct = 0;
  player.wrong = 0;
  player.skips = 0;
  skipCost = 20;
  currentLevel = level;
  currentQuestionIndex = 0;
  goToScreen("game-screen");
  showQuestion();
}

function showQuestion() {
  clearInterval(timer);
  timeLeft = 30;
  timer = setInterval(updateTimer, 1000);

  const q = questions[currentLevel][currentQuestionIndex];
  document.getElementById("question-text").innerText = q.q;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(i === q.correct);
    optionsDiv.appendChild(btn);
  });
}

function updateTimer() {
  document.getElementById("timer-label").innerText = timeLeft;
  if (timeLeft <= 0) {
    clearInterval(timer);
    checkAnswer(false);
  }
  timeLeft--;
}

function checkAnswer(isCorrect) {
  if (isCorrect) {
    player.score += 100;
    player.correct++;
  } else {
    player.score -= 50;
    player.wrong++;
    if (player.wrong >= 3) return endGame();
  }
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions[currentLevel].length) {
    endGame();
  } else {
    showQuestion();
  }
}

function useHelper(type) {
  if (type === "skip") {
    player.score -= skipCost;
    player.skips++;
    skipCost += 20;
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions[currentLevel].length) {
      endGame();
    } else {
      showQuestion();
    }
  }
}

function endGame() {
  clearInterval(timer);
  goToScreen("results-screen");
  document.getElementById("final-results").innerHTML = `
    الاسم: ${player.name}<br>
    النقاط: ${player.score}<br>
    الصحيحة: ${player.correct}<br>
    الخاطئة: ${player.wrong}<br>
    مرات التخطي: ${player.skips}<br>
    المستوى: ${player.level}
  `;
}

function shareResults() {
  alert("تم نسخ النتائج للمشاركة 🚀");
}

function restartGame() {
  goToScreen("start-screen");
}

loadQuestions();
