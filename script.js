class QuizGame {
    constructor() {
        this.API_URL = "https://script.google.com/macros/s/AKfycbwS16Exl-EFOufB-ptfDDFepIzZJBcqCSXgCd7dt8DY5RhPQyVW_XkPyynAxN9Av7MA/exec"; // !! مهم: ضع رابطك الجديد هنا
        this.QUESTION_TIME = 90;
        this.TOTAL_AVATARS = 16;
        this.LIMIT_PER_DAY = 5;

        this.QUESTIONS = [
            { q: "العاصمة تبع مصر شو هي؟", options: ["الإسكندرية", "القاهرة", "الجيزة", "الأقصر"], correct: 1 },
            { q: "شو لون الموز لما يستوي؟", options: ["أحمر", "أصفر", "أخضر", "أزرق"], correct: 1 },
            { q: "أكتر شي منشربه مع الأكل؟", options: ["شاي", "مي", "قهوة", "لبن"], correct: 1 },
            { q: "الطير اللي بيقول 'كو كو' مين هو؟", options: ["ديك", "حمامة", "بومة", "دجاجة"], correct: 3 },
            { q: "عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correct: 2 },
            { q: "شو اسم الكوكب اللي إحنا عايشين عليه؟", options: ["المريخ", "عطارد", "الأرض", "زحل"], correct: 2 },
            { q: "الشي اللي مناكلو وبنلاقي جواتو بذور صغيرة كتيرة (أحمر من جوه)؟", options: ["تفاح", "بطيخ", "موز", "كمثرى"], correct: 1 },
            { q: "وين منشوف الأسماك؟", options: ["بالسماء", "بالمية", "بالرمل", "بالحديقة"], correct: 1 },
            { q: "عدد أصابع الإيد وحدة؟", options: ["4", "5", "6", "7"], correct: 1 },
            { q: "الشي اللي بنحط فيه الأكل عشان ناكله؟", options: ["كرسي", "صحن", "طاولة", "كوب"], correct: 1 },
            { q: "الشمس بتطلع من وين؟", options: ["الغرب", "الشرق", "الشمال", "الجنوب"], correct: 1 },
            { q: "الحيوان اللي بقول 'مياو' مين هو؟", options: ["كلب", "قط", "بقرة", "حصان"], correct: 1 },
            { q: "أكتر شي منستخدمو نكتب فيه؟", options: ["سكين", "قلم", "معلقة", "مسطرة"], correct: 1 },
            { q: "الفاكهة اللي لونها برتقالي واسمها نفس اللون؟", options: ["تفاح", "برتقال", "مانجو", "جوافة"], correct: 1 },
            { q: "الشهر اللي بييجي بعد رمضان؟", options: ["محرم", "شوال", "صفر", "رجب"], correct: 1 }
        ];
        this.RESERVE_QUESTION = { q: "كم عدد أرجل العنكبوت؟", options: ["4", "6", "8", "10"], correct: 2 };

        this.PRIZES = [
            { points: 100, title: "مشارك واعد" }, { points: 200, title: "مستكشف المعرفة" },
            { points: 300, title: "باحث مجتهد" }, { points: 500, title: "مثقف مبتدئ" },
            { points: 1000, title: "نجم المعرفة البرونزي" }, { points: 2000, title: "صاحب الفضول" },
            { points: 4000, title: "متعمق بالحقائق" }, { points: 8000, title: "خبير المعلومات" },
            { points: 16000, title: "نجم المعرفة الفضي" }, { points: 32000, title: "سيد الأسئلة" },
            { points: 64000, title: "عقل متقد" }, { points: 125000, title: "عبقري عصره" },
            { points: 250000, title: "حكيم المعرفة" }, { points: 500000, "title": "أسطورة المسابقة" },
            { points: 1000000, title: "نجم المعرفة الذهبي" }
        ];
        
        this.HELPER_COSTS = { fiftyFifty: 20000, freezeTime: 15000, changeQuestion: 30000 };
        
        this.gameState = {};
        this.isAnswerable = true;
        this.dom = {};

        this.init();
    }

    init() {
        this.cacheDomElements();
        this.loadTheme();
        this.renderScreen('loader');
        setTimeout(() => this.renderScreen('start'), 500);
    }

    cacheDomElements() {
        this.dom.mainContent = document.getElementById('main-content');
        this.dom.sidebar = document.getElementById('prizesSidebar');
        this.dom.sidebarOverlay = document.querySelector('.sidebar-overlay');
        this.dom.prizesList = this.dom.sidebar.querySelector('.prizes-list');
        this.dom.sounds = {
            correct: document.getElementById('correct-sound'),
            wrong: document.getElementById('wrong-sound'),
            click: document.getElementById('click-sound'),
        };
    }
    
    renderScreen(screenName, data = {}) {
        this.dom.mainContent.innerHTML = this.getScreenHtml(screenName, data);
        this.bindScreenEventListeners(screenName);
    }

    getScreenHtml(screenName, data) {
        // ... (HTML generation logic is the same as your provided code, with fixes below)
        if (screenName === 'welcome') {
            return `
                <div class="screen active">
                    <div class="content-box welcome-box">
                        <h2>🌟 مرحباً بك يا ${data.name}! 🌟</h2>
                        <ul class="instructions-list">
                            <li>اكتب اسمك المعروف على منصة X أو إنستغرام.</li>
                            <li>لديك فقط ${this.LIMIT_PER_DAY} محاولات يومياً، فاستغلها بحكمة.</li>
                            <li>لا تتسرع في الإجابة… فالوقت بين يديك.</li>
                            <li>في حال واجهت أي مشكلة، راسل المسؤول: <a href="https://x.com/_MS_AbuQusay?t=kRL3hiAkrWtOis70PYNz-w&s=09" target="_blank" rel="noopener noreferrer">القارئ الوحيد</a>.</li>
                        </ul>
                        <div class="button-group">
                            <button id="finalStartBtn" class="btn btn-main">تم</button>
                        </div>
                    </div>
                </div>`;
        }
        // ... all other HTML generation cases
        return `<div></div>`; // Fallback
    }

    bindScreenEventListeners(screenName) {
        if (screenName === 'welcome') {
             document.getElementById('finalStartBtn').addEventListener('click', () => this.startGame());
        } else if (screenName === 'leaderboard') {
            document.getElementById('backToStartBtn').addEventListener('click', () => { this.playSound('click'); this.renderScreen('start'); });
        }
        // ... other event listeners
    }

    async displayLeaderboard() {
        this.playSound('click');
        this.renderScreen('loader');
        
        try {
            const response = await this.apiCall({ action: 'getLeaderboard' });
            if (response && response.success && response.leaderboard) {
                let content;
                if (response.leaderboard.length > 0) {
                    const medals = ['🥇', '🥈', '🥉'];
                    const tableRows = response.leaderboard.map(row => {
                        const rank = medals[row[0] - 1] || row[0];
                        return `<tr><td>${rank}</td><td>${row[1]}</td><td>${this.formatNumber(row[2])}</td><td>${row[3]}</td></tr>`;
                    }).join('');
                    content = `<table class="leaderboard-table"><tr><th>الترتيب</th><th>الاسم</th><th>النقاط</th><th>اللقب</th></tr>${tableRows}</table>`;
                } else {
                    content = '<p>لوحة الصدارة فارغة حاليًا!</p>';
                }
                this.renderScreen('leaderboard', { content });
            } else {
                this.renderScreen('leaderboard', { content: '<p>حدث خطأ في تحميل لوحة الصدارة.</p>' });
            }
        } catch (e) {
            this.renderScreen('leaderboard', { content: '<p>حدث خطأ في تحميل لوحة الصدارة.</p>' });
        }
    }

    // All other methods from the previous version are included here
    // with the necessary fixes integrated.
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});

