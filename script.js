// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbyf668rD5EqEKWUX1GV46VV-_O2RPuue-uiD3BGbWhOZ0DZSx7iSTdiUzxSmdCRfHl7/exec";

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
    go("dashboard.html");
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
  if(!name){
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
    box.innerHTML = `📘 <b>${test.name}</b><br><small>${test.desc || ""}</small>`;
  }
}

// ================= QUIZ =================
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

function select(i){
  selected = i;

  let btns = document.querySelectorAll("#answers button");
  btns.forEach(b => b.classList.remove("selected"));

  if(btns[i]) btns[i].classList.add("selected");
}

function next(){
  if(selected === -1){
    alert("Chọn đáp án!");
    return;
  }

  let q = questions[index];

  if(q.options){
    const map = ["A","B","C","D"];
    if(map[selected] == q.correct){
      score++;
    }
  }

  index++;
  selected = -1;

  if(index >= questions.length){
    localStorage.setItem("score", score);
    localStorage.setItem("total", questions.length);
    go("result.html");
    return;
  }

  loadQuestion();
}

function updateProgress(){
  let bar = document.getElementById("progress");
  if (!bar) return;

  let percent = ((index+1)/questions.length)*100;
  bar.style.width = percent + "%";
}

// ================= ADD QUESTION =================
function addQuestion(){

  const type = document.getElementById("type")?.value;
  const question = document.getElementById("question")?.value.trim();

  if(!question){
    alert("❌ Nhập câu hỏi!");
    return;
  }

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  if(!testId){
    alert("❌ Chưa chọn bài test!");
    return;
  }

  let data = { type, question };

  // MCQ
  if(type === "mcq"){
    data.options = [
      document.getElementById("a")?.value,
      document.getElementById("b")?.value,
      document.getElementById("c")?.value,
      document.getElementById("d")?.value
    ];
    data.correct = document.getElementById("correct")?.value;
  }

  // MULTIPLE
  if(type === "multiple"){
    data.options = [
      document.getElementById("m1")?.value,
      document.getElementById("m2")?.value,
      document.getElementById("m3")?.value,
      document.getElementById("m4")?.value
    ].filter(v => v);

    data.correct = document.getElementById("multiCorrect")?.value;
  }

  // MATCHING
  if(type === "matching"){
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
  if(type === "ordering"){
    const inputs = document.querySelectorAll("#stepsContainer input");
    data.steps = Array.from(inputs).map(i => i.value.trim());
  }

  // IMAGE
  const file = document.getElementById("imageFile")?.files[0];
  const url = document.getElementById("imageUrl")?.value;

  if(type === "image"){
    if(file){
      const reader = new FileReader();
      reader.onload = function(e){
        data.image = e.target.result;
        saveQuestion(data, testId);
      };
      reader.readAsDataURL(file);
      return;
    } else if(url){
      data.image = url;
    } else {
      alert("❌ Chọn ảnh!");
      return;
    }
  }

  if(type === "audio"){
    data.audio = document.getElementById("audioUrl")?.value;
  }

  if(type === "code"){
    data.code = document.getElementById("codeContent")?.value;
    data.correct = document.getElementById("codeAnswer")?.value;
  }

  if(type === "external"){
    data.link = document.getElementById("externalLink")?.value;
  }

  saveQuestion(data, testId);
}

// ================= SAVE =================
function saveQuestion(data, testId){

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};

  if(!all[testId]) all[testId] = [];
  all[testId].push(data);

  localStorage.setItem("allQuestions", JSON.stringify(all));

  const formData = new FormData();
  formData.append("data", JSON.stringify({
    action: "addQuestion",
    testId,
    type: data.type,
    question: data.question,
    answer: JSON.stringify(data)
  }));

  fetch(API, { method: "POST", body: formData })
    .then(res => res.json())
    .then(() => {
      alert("✅ Đã lưu!");
      resetForm();
    })
    .catch(() => {
      alert("❌ Lỗi Google Sheet!");
    });
}

// ================= RESET =================
function resetForm(){
  document.getElementById("question").value = "";

  document.querySelectorAll("input").forEach(i => i.value = "");
  document.querySelectorAll("textarea").forEach(t => t.value = "");

  document.getElementById("pairsContainer")?.replaceChildren();
  document.getElementById("stepsContainer")?.replaceChildren();

  document.getElementById("question").focus();
}

// ================= LIST =================
function loadQuestions(){
  const listEl = document.getElementById("questionList");
  const titleEl = document.getElementById("testTitle");

  if(!listEl) return;

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  if(titleEl){
    titleEl.innerHTML = currentTest
      ? `📘 ${currentTest.name}`
      : "⚠️ Chưa chọn bài test";
  }

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  const data = all[testId] || [];

  listEl.innerHTML = "";

  if(!data.length){
    listEl.innerHTML = "<p>Chưa có câu hỏi</p>";
    return;
  }

  const typeName = {
    mcq:"Trắc nghiệm",
    multiple:"Nhiều đáp án",
    truefalse:"Đúng/Sai",
    fill:"Điền khuyết",
    matching:"Nối cặp",
    ordering:"Sắp xếp",
    image:"Hình ảnh",
    audio:"Âm thanh",
    code:"Code",
    external:"Link"
  };

  data.forEach((q,i)=>{
    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${i+1}. ${q.question}</b>
      <div class="tag">${typeName[q.type] || q.type}</div>
      <div class="action-btns">
        <button onclick="editQuestion(${i})">✏️</button>
        <button class="btn-danger" onclick="deleteQuestion(${i})">🗑️</button>
      </div>
    `;

    listEl.appendChild(div);
  });
}

// ================= DELETE =================
function deleteQuestion(i){
  if(!confirm("Xóa câu hỏi này?")) return;

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  all[testId].splice(i,1);

  localStorage.setItem("allQuestions", JSON.stringify(all));
  loadQuestions();
}

// ================= EDIT =================
function editQuestion(i){
  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  const q = all[testId][i];

  localStorage.setItem("editIndex", i);
  localStorage.setItem("editData", JSON.stringify(q));

  go("add-question.html");
}

// ================= TYPE =================
function changeType(){
  const type = document.getElementById("type")?.value;

  const boxes = [
    "mcqBox","multiBox","tfBox","fillBox",
    "matchingBox","orderingBox","imageBox",
    "audioBox","codeBox","externalBox"
  ];

  boxes.forEach(id=>{
    let el = document.getElementById(id);
    if(el) el.style.display = "none";
  });

  if(type) show(type+"Box");
}

function show(id){
  const el = document.getElementById(id);
  if(el) el.style.display = "block";
}

// ================= INIT =================
window.onload = function(){
  loadTestsFromAPI(); // 🔥 THÊM DÒNG NÀY
  loadQuestions();
  loadTestInfo();
  initQuiz();
  changeType();
};

// ENTER QUICK SAVE
document.addEventListener("keydown", function(e){
  if(e.ctrlKey && e.key === "Enter"){
    addQuestion();
  }
});

// BACK
function goBack(){
  const test = JSON.parse(localStorage.getItem("currentTest"));
  go(test ? "add-question.html" : "dashboard.html");
}
// LOAD DATA JS 
function loadTestsFromAPI(){

  fetch(API + "?action=getTests")
    .then(res => res.json())
    .then(data => {

      const grid = document.getElementById("testGrid");
      if(!grid) return;

      grid.innerHTML = "";

      if(!data.length){
        grid.innerHTML = "<p>Chưa có bài test</p>";
        return;
      }

      data.forEach(test => {

        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
          <img src="https://picsum.photos/400/200?random=${test.id}">
          <b>${test.name}</b>
          <span class="tag">${test.totalQuestions} câu</span>
        `;

        div.onclick = () => startTest(test);

        grid.appendChild(div);
      });

    })
    .catch(err => {
      console.log(err);
      alert("❌ Lỗi load API");
    });
}
//START TEST 
function startTest(test){

  // lưu test hiện tại
  localStorage.setItem("currentTest", JSON.stringify(test));

  // chuyển trang làm bài
  window.location.href = "quiz.html";
}