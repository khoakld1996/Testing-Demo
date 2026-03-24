// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbxWLT1Xf85VssPnEuwfo7POhLw-Xb2RpLH8nC-_K46wkDXrk46MuVbjHVWnvqgsQG89/exec";

// ===== GLOBAL =====
let questions = [];
let index = 0;
let score = 0;
let selected = -1;

// ================= NAVIGATION =================
function go(page){
  window.location.href = page;
}

function goHome(){
  window.location.href = "index.html";
}

// ================= LOGIN =================
function login(){
  let user = document.getElementById("user")?.value.trim();
  let pass = document.getElementById("pass")?.value.trim();
  let notify = document.getElementById("notify");

  if(notify) notify.style.display = "none";

  if(user === "admin" && pass === "123"){
    localStorage.setItem("role", "teacher");
    window.location.href = "dashboard.html";
  } else {
    if(notify){
      notify.className = "notify error";
      notify.innerText = "Sai tài khoản hoặc mật khẩu";
      notify.style.display = "block";
    }
  }
}

// ================= USER =================
function saveName(){
  const input = document.getElementById("username");
  if(!input) return;

  const name = input.value.trim();
  if(name === ""){
    alert("Nhập tên!");
    return;
  }

  localStorage.setItem("username", name);
  go("select.html");
}

function loadName(){
  const el = document.getElementById("welcome");
  if(!el) return;

  const name = localStorage.getItem("username");
  if(name){
    el.innerText = "Xin chào: " + name;
  }
}

// ================= QUIZ LOAD =================
if (document.getElementById("question")) {
  fetch("questions.json")
    .then(res => res.json())
    .then(data => {
      questions = data;
      loadQuestion();
    })
    .catch(err => console.log("Lỗi load JSON:", err));
}

// ================= HIỂN THỊ CÂU HỎI =================
function loadQuestion(){
  const questionEl = document.getElementById("question");
  const answerEl = document.getElementById("answers");

  if (!questionEl || !answerEl) return;
  if (!questions || !questions.length) return;

  let q = questions[index];

  questionEl.innerText = q.q;

  let html = "";
  q.a.forEach((ans, i) => {
    html += `<button onclick="select(${i})">${ans}</button>`;
  });

  answerEl.innerHTML = html;

  updateProgress();
}

// ================= CHỌN =================
function select(i){
  selected = i;

  let btns = document.querySelectorAll(".answers button");
  btns.forEach(b => b.classList.remove("selected"));

  if(btns[i]) btns[i].classList.add("selected");
}

// ================= NEXT =================
function next(){
  if(selected === -1){
    alert("Chọn đáp án!");
    return;
  }

  if(selected === questions[index].correct){
    score++;
  }

  index++;
  selected = -1;

  if(index >= questions.length){
    localStorage.setItem("score", score);
    localStorage.setItem("total", questions.length);
    window.location.href = "result.html";
    return;
  }

  loadQuestion();
}

// ================= PROGRESS =================
function updateProgress(){
  let bar = document.getElementById("progress");
  if (!bar) return;

  let percent = ((index+1)/questions.length)*100;
  bar.style.width = percent + "%";
}

// ================= TIMER =================
let time = 60;
let timerEl = document.getElementById("timer");

if(timerEl){
  let countdown = setInterval(()=>{
    time--;
    timerEl.innerText = time + "s";

    if(time <= 0){
      clearInterval(countdown);
      localStorage.setItem("score", score);
      localStorage.setItem("total", questions.length);
      window.location.href = "result.html";
    }
  },1000);
}

// ================= ADD QUESTION =================
function addQuestion() {
  const typeEl = document.getElementById("type");
  const qEl = document.getElementById("question");

  if(!typeEl || !qEl) return;

  const type = typeEl.value;
  const question = qEl.value.trim();

  let data = { type, question };

  // MULTIPLE
  if (type === "multiple") {
    data.options = [
      document.getElementById("m1")?.value,
      document.getElementById("m2")?.value,
      document.getElementById("m3")?.value,
      document.getElementById("m4")?.value
    ].filter(v => v);
  }

  // MATCHING
  if (type === "matching") {
    const rows = document.querySelectorAll("#pairsContainer > div");
    data.pairs = Array.from(rows).map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        left: inputs[0].value.trim(),
        right: inputs[1].value.trim()
      };
    });
  }

  // ORDERING
  if (type === "ordering") {
    const inputs = document.querySelectorAll("#stepsContainer input");
    data.steps = Array.from(inputs).map(i => i.value.trim());
  }

  if (type === "image") data.image = document.getElementById("imageUrl")?.value;
  if (type === "audio") data.audio = document.getElementById("audioUrl")?.value;

  if (type === "code") {
    data.code = document.getElementById("codeContent")?.value;
    data.correct = document.getElementById("codeAnswer")?.value;
  }

  if (type === "external") {
    data.link = document.getElementById("externalLink")?.value;
  }

  // ===== LOCAL =====
  let list = JSON.parse(localStorage.getItem("questions")) || [];
  list.push(data);
  localStorage.setItem("questions", JSON.stringify(list));

  // ===== GOOGLE SHEET =====
  const testId = localStorage.getItem("currentTestId");

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "addQuestion",
      testId: testId,
      type: type,
      question: question,
      answer: JSON.stringify(data)
    })
  })
  .then(res => res.json())
  .then(() => console.log("Đã lưu Google Sheet"))
  .catch(err => console.log("Lỗi API:", err));

  alert("✅ Đã thêm!");
}

// ================= LOAD LIST =================
function loadQuestions() {
  const listEl = document.getElementById("questionList");
  if (!listEl) return;

  const data = JSON.parse(localStorage.getItem("questions")) || [];

  listEl.innerHTML = "";

  if (data.length === 0) {
    listEl.innerHTML = "<p>Chưa có câu hỏi nào</p>";
    return;
  }

  data.forEach((q, i) => {
    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${i+1}. ${q.question}</b>
      <button onclick="deleteQuestion(${i})">Xóa</button>
    `;

    listEl.appendChild(div);
  });
}

// ================= DELETE =================
function deleteQuestion(i){
  let data = JSON.parse(localStorage.getItem("questions")) || [];
  data.splice(i,1);
  localStorage.setItem("questions", JSON.stringify(data));
  loadQuestions();
}

// ============== GO BACK =================
function goBack() {
  window.location.href = "dashboard.html";
}

// ================= ONLOAD =================
window.onload = function(){
  loadQuestions();
  loadName();
};

