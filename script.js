// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbzAnLalxZL4W3fcKLrScY-xI4gv1Pez9oYRC5z7kueRQVXDGvuigJ-NbN45dJoBLQBg/exec";

// ================= GLOBAL =================
let questions = [];
let currentIndex = 0;
let score = 0;
let selectedAnswer = -1;

// ================= NAVIGATION =================
function go(page){ window.location.href = page; }
function goHome(){ window.location.href = "index.html"; }

// ================= LOGIN =================
function login(){
  const user = document.getElementById("user")?.value.trim();
  const pass = document.getElementById("pass")?.value.trim();
  const notify = document.getElementById("notify");

  if(notify) notify.style.display="none";

  if(user==="admin" && pass==="123"){
    localStorage.setItem("role","teacher");
    go("dashboard.html");
  } else if(notify){
    notify.className="notify error";
    notify.innerText="Sai tài khoản hoặc mật khẩu";
    notify.style.display="block";
  }
}

// ================= LOAD TESTS FROM API =================
function loadTestsFromAPI(){
  const grid = document.getElementById("testGrid");
  if(!grid) return;
  grid.innerHTML = "<p>⏳ Đang tải bài test...</p>";

  fetch(API + "?action=getTests")
    .then(res => res.json())
    .then(data => {
      grid.innerHTML = "";
      if(!data.length){ grid.innerHTML="<p>Chưa có bài test</p>"; return; }

      data.forEach(test=>{
        const div = document.createElement("div");
        div.className="card";
        div.innerHTML=`<img src="https://picsum.photos/400/200?random=${test.id}">
                       <b>${test.name}</b>
                       <span class="tag">${test.totalQuestions} câu</span>`;
        div.onclick = () => {
            localStorage.setItem("currentTest", JSON.stringify(test));
            go(localStorage.getItem("role") === "teacher" ? "question-list.html" : "quiz.html");
        };
        grid.appendChild(div);
      });
    })
    .catch(() => { if(grid) grid.innerHTML="<p>❌ Lỗi tải dữ liệu</p>"; });
}

// ================= QUIZ LOGIC =================
async function initQuiz(){
  const questionEl = document.getElementById("question");
  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  if(!questionEl || !currentTest) return;

  questionEl.innerText = "⏳ Đang tải câu hỏi...";
  
  try {
    const res = await fetch(`${API}?action=getQuestions&testId=${currentTest.id}`);
    questions = await res.json();
    if(questions.length > 0) loadQuestion();
    else questionEl.innerText = "Bài này chưa có câu hỏi!";
  } catch(e) {
    questionEl.innerText = "❌ Lỗi tải câu hỏi!";
  }
}

function loadQuestion(){
  const q = questions[currentIndex];
  const answerEl = document.getElementById("answers");
  if(!q || !answerEl) return;

  document.getElementById("question").innerText = q.question;
  
  let details;
  try { details = JSON.parse(q.answer); } catch(e) { details = q; }

  let html = "";
  if(details.options){
    details.options.forEach((opt,i)=>{
      html += `<button class="btn-option" onclick="select(${i})">${opt}</button>`;
    });
  }
  answerEl.innerHTML = html;
  updateProgress();
}

function select(i){
  selectedAnswer = i;
  document.querySelectorAll(".btn-option").forEach((btn, idx) => {
    btn.classList.toggle("selected", idx === i);
  });
}

function next(){
  if(selectedAnswer === -1){ alert("Chọn đáp án!"); return; }
  const q = questions[currentIndex];
  let details;
  try { details = JSON.parse(q.answer); } catch(e) { details = q; }
  const map = ["A","B","C","D"];
  if(map[selectedAnswer] === details.correct) score++;
  currentIndex++;
  selectedAnswer = -1;
  if(currentIndex >= questions.length){
    localStorage.setItem("score", score);
    localStorage.setItem("total", questions.length);
    go("result.html");
  } else {
    loadQuestion();
  }
}

// ================= (FIXED) HÀM THAY ĐỔI LOẠI CÂU HỎI =================
function changeType() {
  const type = document.getElementById("type")?.value;
  const boxes = ["mcqBox", "multipleBox", "tfBox", "fillBox", "matchingBox", "orderingBox", "essayBox", "codeBox"];
  
  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (type) {
    const target = document.getElementById(type + "Box");
    if (target) target.style.display = "block";
  }
}

// ================= HÀM RESET TẤT CẢ Ô NHẬP LIỆU =================
function clearAllInputs() {
  const commonIds = ["question", "qImage"];
  commonIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const answerContainers = ["mcqBox", "multipleBox", "tfBox", "fillBox", "matchingBox", "orderingBox", "essayBox", "codeBox"];
  answerContainers.forEach(boxId => {
    const container = document.getElementById(boxId);
    if (container) {
      const inputs = container.querySelectorAll("input, textarea");
      inputs.forEach(input => input.value = "");
      const selects = container.querySelectorAll("select");
      selects.forEach(s => s.selectedIndex = 0);
    }
  });

  document.getElementById("question").focus();
}

// ================= HÀM THÊM CÂU HỎI =================
async function addQuestion() {
  const type = document.getElementById("type").value;
  const question = document.getElementById("question").value.trim();
  const qImage = document.getElementById("qImage")?.value.trim() || "";
  const currentTest = JSON.parse(localStorage.getItem("currentTest"));

  if (!question || !currentTest) {
    alert("⚠️ Vui lòng nhập nội dung câu hỏi!");
    return;
  }

  let details = { type, question, image: qImage };

  // Thu thập dữ liệu theo loại
  if (type === "mcq") {
    details.options = [document.getElementById("a").value, document.getElementById("b").value, document.getElementById("c").value, document.getElementById("d").value];
    details.correct = document.getElementById("correct").value;
  } 
  else if (type === "multiple") {
    details.options = document.getElementById("multiOptions").value.split(",").map(s => s.trim()).filter(s => s);
    details.correct = document.getElementById("multiCorrect").value;
  }
  else if (type === "tf") {
    details.options = ["Đúng", "Sai"];
    details.correct = document.getElementById("tfCorrect").value;
  }
  else if (type === "matching") {
    details.pairs = document.getElementById("matchPairs").value.split("\n").map(l => l.split("|").map(i => i.trim())).filter(p => p.length === 2);
  }
  else if (type === "ordering") {
    details.items = document.getElementById("orderItems").value.split(",").map(i => i.trim()).filter(i => i);
  }

  const btn = document.querySelector(".btn-save");
  btn.innerText = "⏳ Đang lưu...";
  btn.disabled = true;

  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify({
        action: "addQuestion", // Chú ý: Chữ 'Q' phải viết hoa đúng như Code.gs
        testId: currentTest.id,
        type: type,
        question: question,
        answer: JSON.stringify(details)
      })
    });

    const result = await res.json();
    if (result.status === "ok") {
      alert("✅ Đã lưu thành công!");
      clearAllInputs();
    } else {
      alert("❌ Lỗi: " + result.message);
    }
  } catch (e) {
    alert("❌ Lỗi kết nối server!");
  } finally {
    btn.innerText = "💾 Lưu câu hỏi";
    btn.disabled = false;
  }
}

// ================= KHỞI TẠO =================
function updateProgress(){
  const bar = document.getElementById("progress");
  if(bar && questions.length) bar.style.width = ((currentIndex + 1) / questions.length) * 100 + "%";
}

function renderResults(){
  const name = localStorage.getItem("username");
  const score = localStorage.getItem("score");
  const total = localStorage.getItem("total");
  if(document.getElementById("name")) document.getElementById("name").innerText = "Học sinh: " + name;
  if(document.getElementById("score")) document.getElementById("score").innerText = `Điểm: ${score}/${total}`;
}

window.onload = function(){
  const path = window.location.pathname;
  if(path.includes("select.html") || path.includes("dashboard.html")) loadTestsFromAPI();
  if(path.includes("add-question.html")) {
    const test = JSON.parse(localStorage.getItem("currentTest"));
    if(document.getElementById("testInfo")) 
      document.getElementById("testInfo").innerHTML = `📘 <b>${test?.name || "Chưa chọn"}</b>`;
    changeType(); // Gọi hàm này để hiển thị Box mặc định
  }
  if(path.includes("quiz.html")) initQuiz();
  if(path.includes("result.html")) renderResults();
};