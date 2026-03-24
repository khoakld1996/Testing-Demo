// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbx5656b8NL_ZirmZbMbqR70QnM3PnAKbvVvoB--BWmMRtIOasJyp6f5oRfsPpw7Rqjv/exec";

// ===== GLOBAL =====
let questions = [];
let index = 0;
let score = 0;
let selected = -1;

// ================= NAVIGATION =================
function go(page){
  window.location.href = page;
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

// ================= LOAD TEST INFO =================
function loadTestInfo(){
  const box = document.getElementById("testInfo");
  if(!box) return;

  const test = JSON.parse(localStorage.getItem("currentTest"));

  if(test){
    box.innerHTML = `📘 ${test.name}`;
  }
}

// ================= QUIZ LOAD =================
function initQuiz(){
  const questionEl = document.getElementById("question");
  const answerEl = document.getElementById("answers");

  if(!questionEl || !answerEl) return;

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  questions = all[testId] || [];

  if(questions.length){
    loadQuestion();
  } else {
    questionEl.innerText = "Chưa có câu hỏi!";
  }
}

// ================= HIỂN THỊ =================
function loadQuestion(){
  let q = questions[index];

  document.getElementById("question").innerText = q.question;

  let html = "";

  if(q.options){
    q.options.forEach((ans, i) => {
      html += `<button onclick="select(${i})">${ans}</button>`;
    });
  }

  document.getElementById("answers").innerHTML = html;

  updateProgress();
}

// ================= CHỌN =================
function select(i){
  selected = i;

  let btns = document.querySelectorAll("#answers button");
  btns.forEach(b => b.classList.remove("selected"));

  if(btns[i]) btns[i].classList.add("selected");
}

// ================= NEXT =================
function next(){
  if(selected === -1){
    alert("Chọn đáp án!");
    return;
  }

  if(selected == questions[index].correct){
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

// ================= ADD QUESTION =================
function addQuestion() {

  const type = document.getElementById("type")?.value;
  const question = document.getElementById("question")?.value.trim();

  if (!question) {
    alert("❌ Nhập câu hỏi!");
    return;
  }

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  if (!testId) {
    alert("❌ Chưa chọn bài test!");
    return;
  }

  let data = { type, question };

  // ===== MCQ =====
  if (type === "mcq") {
    data.options = [
      document.getElementById("a")?.value,
      document.getElementById("b")?.value,
      document.getElementById("c")?.value,
      document.getElementById("d")?.value
    ];
    data.correct = document.getElementById("correct")?.value;
  }

  // ===== MULTIPLE =====
  if (type === "multiple") {
    data.options = [
      document.getElementById("m1")?.value,
      document.getElementById("m2")?.value,
      document.getElementById("m3")?.value,
      document.getElementById("m4")?.value
    ].filter(v => v);
    data.correct = document.getElementById("multiCorrect")?.value;
  }

  // ===== MATCHING =====
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

  // ===== ORDERING =====
  if (type === "ordering") {
    const inputs = document.querySelectorAll("#stepsContainer input");
    data.steps = Array.from(inputs).map(i => i.value.trim());
  }

  // ===== IMAGE =====
  const file = document.getElementById("imageFile")?.files[0];
  const url = document.getElementById("imageUrl")?.value;

  if (type === "image") {
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        data.image = e.target.result;
        saveQuestion(data, testId);
      };
      reader.readAsDataURL(file);
      return;
    } else if (url) {
      data.image = url;
    } else {
      alert("❌ Chọn ảnh!");
      return;
    }
  }

  // ===== AUDIO =====
  if (type === "audio") {
    data.audio = document.getElementById("audioUrl")?.value;
  }

  // ===== CODE =====
  if (type === "code") {
    data.code = document.getElementById("codeContent")?.value;
    data.correct = document.getElementById("codeAnswer")?.value;
  }

  // ===== EXTERNAL =====
  if (type === "external") {
    data.link = document.getElementById("externalLink")?.value;
  }

  saveQuestion(data, testId);
}

// ================= SAVE =================
function saveQuestion(data, testId) {

  console.log("📤 SEND:", data);

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};

  if (!all[testId]) all[testId] = [];

  all[testId].push(data);
  localStorage.setItem("allQuestions", JSON.stringify(all));

  fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "addQuestion",
      testId: testId,
      type: data.type,
      question: data.question,
      answer: JSON.stringify(data)
    })
  })
  .then(res => res.json())
  .then(res => {
    console.log("✅ API:", res);
    alert("✅ Đã lưu!");
    resetForm();
  })
  .catch(err => {
    console.log("❌ API:", err);
    alert("❌ Lỗi Google Sheet!");
  });
}

// ================= RESET =================
function resetForm(){
  document.getElementById("question").value = "";

  document.querySelectorAll("input").forEach(i => i.value = "");
  document.querySelectorAll("textarea").forEach(t => t.value = "");
}

// ================= LOAD LIST =================
function loadQuestions() {
  const listEl = document.getElementById("questionList");
  if (!listEl) return;

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  const data = all[testId] || [];

  listEl.innerHTML = "";

  if (!data.length) {
    listEl.innerHTML = "<p>Chưa có câu hỏi</p>";
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
  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  all[testId].splice(i,1);

  localStorage.setItem("allQuestions", JSON.stringify(all));
  loadQuestions();
}

// ================= DRAG IMAGE =================
document.addEventListener("dragover", e => e.preventDefault());

document.addEventListener("drop", function(e){
  e.preventDefault();

  const file = e.dataTransfer.files[0];

  if(file && file.type.startsWith("image/")){
    const reader = new FileReader();
    reader.onload = function(evt){
      let input = document.getElementById("imageUrl");
      if(input) input.value = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// ================= INIT =================
window.onload = function(){
  loadQuestions();
  loadTestInfo();
  initQuiz();
};

function goBack(){
  const test = JSON.parse(localStorage.getItem("currentTest"));
  if(test){
    window.location.href = "add-question.html";
  } else {
    window.location.href = "dashboard.html";
  }
}