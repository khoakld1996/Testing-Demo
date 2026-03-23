// NAVIGATION
function go(page){
  window.location.href = page;
}

// SAVE NAME
function saveName(){
  const name = document.getElementById("username").value;
  if(name.trim() === ""){
    alert("Nhập tên!");
    return;
  }
  localStorage.setItem("username", name);
  go("select.html");
}

// START QUIZ
function startQuiz(test){
  localStorage.setItem("test", test);
  go("quiz.html");
}

// LOAD NAME
function loadName(){
  const name = localStorage.getItem("username");
  if(name){
    document.getElementById("welcome").innerText = "Xin chào: " + name;
  }
}

// ANSWER
function answer(ans){
  if(ans === "B"){
    alert("✅ Đúng!");
  } else {
    alert("❌ Sai!");
  }
}

// LOGIN
/*function login(){
  let user = document.getElementById("user").value;
  let pass = document.getElementById("pass").value;

  let notify = document.getElementById("notify");

  // ===== GIÁO VIÊN ĐÚNG =====
  if(user === "admin" && pass === "123"){
    notify.className = "notify success";
    notify.innerText = "Đăng nhập thành công!";
    notify.style.display = "block";

    localStorage.setItem("role", "teacher");

    setTimeout(()=>{
      window.location.href = "dashboard.html";
    },1000);
  }

  // ===== SAI → CHO VỀ HS =====
  else{
    notify.className = "notify error";
    notify.innerText = "Sai tài khoản hoặc mật khẩu";
    notify.style.display = "block";

    localStorage.setItem("role", "student");

    setTimeout(()=>{
      window.location.href = "name.html";
    },1500);
  }
} */
function login(){
  let user = document.getElementById("user").value.trim();
  let pass = document.getElementById("pass").value.trim();

  let notify = document.getElementById("notify");
  // Reset Thông báo mỗi lần bấm login
  notify.style.display = "none";

  // ✅ ĐÚNG (GV)
  if(user === "admin" && pass === "123"){
    localStorage.setItem("role", "teacher");
    window.location.href = "dashboard.html";
    return;
  }

  // ❌ SAI → CHỈ THÔNG BÁO
  else{
    notify.className = "notify error";
    notify.innerText = "Sai tài khoản hoặc mật khẩu";
    notify.style.display = "block";
  }

}


//Test Result 
// ===== LOAD NAME =====
const nameEl = document.getElementById("name");
if(nameEl){
  nameEl.innerText = localStorage.getItem("username") || "Guest";
}

// ===== BIẾN =====
let questions = [];
let index = 0;
let score = 0;
let selected = -1;

// ===== LOAD JSON =====
fetch("questions.json")
.then(res => res.json())
.then(data => {
  questions = data;
  loadQuestion();
})
.catch(err => {
  console.log("Lỗi load JSON:", err);
});


// ===== HIỂN THỊ CÂU HỎI =====
function loadQuestion(){
  if(!questions.length) return;

  let q = questions[index];

  document.getElementById("question").innerText = q.q;

  let html = "";
  q.a.forEach((ans, i) => {
    html += `<button onclick="select(${i})">${ans}</button>`;
  });

  document.getElementById("answers").innerHTML = html;

  updateProgress();
}

// ===== CHỌN ĐÁP ÁN =====
function select(i){
  selected = i;

  let btns = document.querySelectorAll(".answers button");
  btns.forEach(b => b.classList.remove("selected"));

  btns[i].classList.add("selected");
}

// ===== NEXT =====
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

  // ===== KẾT THÚC =====
  if(index >= questions.length){
    localStorage.setItem("score", score);
    localStorage.setItem("total", questions.length);
    window.location.href = "result.html";
    return;
  }

  loadQuestion();
}

// ===== PROGRESS % TEST =====
function updateProgress(){
  let percent = ((index+1)/questions.length)*100;
  document.getElementById("progress").style.width = percent + "%";
}

// ===== TIMER TEST=====
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
// Back Button
function goHome(){
  window.location.href = "index.html";
}

// FUNCTION BUILD CHART
function renderChart(data){
  let names = data.map(r => r.name);
  let scores = data.map(r => Math.round((r.score/r.total)*100));

  let ctx = document.getElementById("chart");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: names,
      datasets: [{
        label: "% điểm",
        data: scores
      }]
    }
  });
}

// FUNCTION LỌC HS SORT & FILTER
let allResults = JSON.parse(localStorage.getItem("results")) || [];

function filterResult(){
  let key = document.getElementById("search").value.toLowerCase();

  let filtered = allResults.filter(r =>
    r.name.toLowerCase().includes(key)
  );

  renderResults(filtered);
  renderChart(filtered);
}

// FUNCTION ADD-QUESTION
// ===== HIỆN / ẨN FORM =====
function changeType() {
  const type = document.getElementById("type").value;

  const boxes = [
    "mcqBox","tfBox","fillBox","externalBox",
    "multiBox","matchingBox","orderingBox",
    "imageBox","audioBox","codeBox"
  ];

  boxes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (type === "mcq") show("mcqBox");
  if (type === "multiple") show("multiBox");
  if (type === "truefalse") show("tfBox");
  if (type === "fill") show("fillBox");
  if (type === "external") show("externalBox");

  // ===== MATCHING =====
  if (type === "matching") {
    show("matchingBox");

    const container = document.getElementById("pairsContainer");
    container.innerHTML = "";

    addPair();
    addPair();
  }

  // ===== ORDERING =====
  if (type === "ordering") {
    show("orderingBox");

    const container = document.getElementById("stepsContainer");
    container.innerHTML = "";

    addStep();
    addStep();
    addStep();
  }

  if (type === "image") show("imageBox");
  if (type === "audio") show("audioBox");
  if (type === "code") show("codeBox");
}

function show(id){
  document.getElementById(id).style.display = "block";
}

// ===== MATCHING DYNAMIC =====

function addPair(left = "", right = "") {
  const container = document.getElementById("pairsContainer");

  const index = container.children.length + 1;

  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.marginBottom = "8px";

  div.innerHTML = `
    <input type="text" placeholder="Vế trái ${index}" value="${left}">
    <input type="text" placeholder="Vế phải ${index}" value="${right}">
    <button class="btn btn-danger" onclick="this.parentElement.remove(); updatePairIndex()">❌</button>
  `;

  container.appendChild(div);
}

function updatePairIndex() {
  const rows = document.querySelectorAll("#pairsContainer > div");

  rows.forEach((row, i) => {
    const inputs = row.querySelectorAll("input");
    inputs[0].placeholder = "Vế trái " + (i + 1);
    inputs[1].placeholder = "Vế phải " + (i + 1);
  });
}

// ===== ORDERING DYNAMIC =====

function addStep(value = "") {
  const container = document.getElementById("stepsContainer");

  const index = container.children.length + 1;

  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.marginBottom = "8px";

  div.innerHTML = `
    <input type="text" placeholder="Bước ${index}" value="${value}">
    <button class="btn btn-danger" onclick="this.parentElement.remove()">❌</button>
  `;

  container.appendChild(div);
}

// ===== LƯU CÂU HỎI =====

function addQuestion() {
  const type = document.getElementById("type").value;
  const question = document.getElementById("question").value.trim();

  let data = {
    type: type,
    question: question
  };

  // ===== MULTIPLE =====
  if (type === "multiple") {
    data.options = [
      document.getElementById("m1").value,
      document.getElementById("m2").value,
      document.getElementById("m3").value,
      document.getElementById("m4").value
    ].filter(v => v);
  }

  // ===== MATCHING (FIX CHUẨN) =====
  if (type === "matching") {
    const rows = document.querySelectorAll("#pairsContainer > div");

    data.pairs = Array.from(rows).map(row => {
      const inputs = row.querySelectorAll("input");

      return {
        left: inputs[0].value.trim(),
        right: inputs[1].value.trim()
      };
    }).filter(p => p.left && p.right);
  }

  // ===== ORDERING =====
  if (type === "ordering") {
    const inputs = document.querySelectorAll("#stepsContainer input");

    data.steps = Array.from(inputs)
      .map(i => i.value.trim())
      .filter(v => v);
  }

  // ===== IMAGE =====
  if (type === "image") {
    data.image = document.getElementById("imageUrl").value;
  }

  // ===== AUDIO =====
  if (type === "audio") {
    data.audio = document.getElementById("audioUrl").value;
  }

  // ===== CODE =====
  if (type === "code") {
    data.code = document.getElementById("codeContent").value;
    data.correct = document.getElementById("codeAnswer").value;
  }

  // ===== EXTERNAL =====
  if (type === "external") {
    data.link = document.getElementById("externalLink").value;
  }

  console.log("DATA:", data);

   let questions = JSON.parse(localStorage.getItem("questions")) || [];

  let editIndex = localStorage.getItem("editIndex");
  let isEdit = editIndex !== null;

  if (isEdit) {
    questions[editIndex] = data;
  } else {
    questions.push(data);
  }

  localStorage.setItem("questions", JSON.stringify(questions));

  if (isEdit) {
    localStorage.removeItem("editIndex");
    localStorage.removeItem("editData");
  }

  alert(isEdit ? "✏️ Đã cập nhật!" : "✅ Đã thêm!");

  if (isEdit) {
    window.location.href = "question-list.html";
  } else {
    resetForm();
  }
}
// END CODE FUNCTION ADD QUESTION

// FUNCTION RESET FORM QUESTION 

function resetForm() {
  // clear question
  document.getElementById("question").value = "";

  // clear tất cả input (trừ file)
  document.querySelectorAll("input").forEach(input => {
    if (input.type !== "file") input.value = "";
  });

  // clear textarea
  document.querySelectorAll("textarea").forEach(t => t.value = "");

  // reset type về mặc định
  document.getElementById("type").value = "mcq";

  // reset UI (ẩn/hiện lại form)
  changeType();
}

// END FUNCTION RESET FORM QUESTION

// FUNCTION LOAD QUESTION LIST

function loadQuestions() {
  const list = document.getElementById("questionList");
  if (!list) return;

  const data = JSON.parse(localStorage.getItem("questions")) || [];

  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = "<p>Chưa có câu hỏi nào</p>";
    return;
  }

  data.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "card";

   div.innerHTML = `
  <b>${index + 1}. ${q.question}</b>

  <div class="q-type">
    Loại: <span class="tag">${formatType(q.type)}</span>
  </div>

  <div class="action-btns">
    <button class="btn btn-warning" onclick="editQuestion(${index})">✏️ Sửa</button>
    <button class="btn btn-danger" onclick="deleteQuestion(${index})">🗑 Xóa</button>
  </div>
`;

    list.appendChild(div);
  });
}
// FORMAT TYPE QUESTION 
function formatType(type) {
  const map = {
    mcq: "Trắc nghiệm",
    multiple: "Nhiều đáp án",
    truefalse: "True / False",
    fill: "Điền từ",
    matching: "Nối cặp",
    ordering: "Sắp xếp",
    image: "Câu hỏi hình ảnh",
    audio: "Câu hỏi âm thanh",
    code: "Code",
    external: "Liên kết ngoài"
  };

  return map[type] || type;
}
// LOAD TỰ ĐỘNG
window.onload = function () {
  loadQuestions();
};

// END FUNCTION LOAD QUESTION LIST

// DELETE QUESTION FUNCTION 

function deleteQuestion(index) {
  let data = JSON.parse(localStorage.getItem("questions")) || [];

  if (!confirm("Xóa câu hỏi này?")) return;

  data.splice(index, 1);

  localStorage.setItem("questions", JSON.stringify(data));

  loadQuestions();
}

// END DELETE QUESTION FUNCTION

// EDIT QUESTION 

function editQuestion(index) {
  const data = JSON.parse(localStorage.getItem("questions")) || [];

  localStorage.setItem("editIndex", index);
  localStorage.setItem("editData", JSON.stringify(data[index]));

  window.location.href = "add-question.html";
}

// END EDIT QUESTION

// BUTTON GO BACK
function goBack() {
  window.location.href = "add-question.html";
}
// BUTTON GO BACK

// LOAD DATA QUESTION VÀO TRANG 
window.onload = function () {
  const editData = JSON.parse(localStorage.getItem("editData"));
  if (!editData) return;

  // set type + question
  document.getElementById("type").value = editData.type;
  document.getElementById("question").value = editData.question || "";

  // trigger UI
  changeType();

  // ===== MCQ =====
  if (editData.type === "mcq") {
    document.getElementById("a").value = editData.options?.[0] || "";
    document.getElementById("b").value = editData.options?.[1] || "";
    document.getElementById("c").value = editData.options?.[2] || "";
    document.getElementById("d").value = editData.options?.[3] || "";
    document.getElementById("correct").value = editData.correct || "A";
  }

  // ===== MULTIPLE =====
  if (editData.type === "multiple") {
    document.getElementById("m1").value = editData.options?.[0] || "";
    document.getElementById("m2").value = editData.options?.[1] || "";
    document.getElementById("m3").value = editData.options?.[2] || "";
    document.getElementById("m4").value = editData.options?.[3] || "";
  }

  // ===== MATCHING =====
  if (editData.type === "matching") {
    const container = document.getElementById("pairsContainer");
    container.innerHTML = "";

    (editData.pairs || []).forEach(p => {
      addPair(p.left, p.right);
    });
  }

  // ===== ORDERING =====
  if (editData.type === "ordering") {
    const container = document.getElementById("stepsContainer");
    container.innerHTML = "";

    (editData.steps || []).forEach(step => {
      addStep(step);
    });
  }

  // ===== TRUE/FALSE =====
  if (editData.type === "truefalse") {
    document.getElementById("tfCorrect").value = editData.correct || "true";
  }

  // ===== FILL =====
  if (editData.type === "fill") {
    document.getElementById("fillAnswer").value = editData.answer || "";
  }

  // ===== IMAGE =====
  if (editData.type === "image") {
    document.getElementById("imageUrl").value = editData.image || "";
  }

  // ===== AUDIO =====
  if (editData.type === "audio") {
    document.getElementById("audioUrl").value = editData.audio || "";
  }

  // ===== CODE =====
  if (editData.type === "code") {
    document.getElementById("codeContent").value = editData.code || "";
    document.getElementById("codeAnswer").value = editData.correct || "";
  }

  // ===== EXTERNAL =====
  if (editData.type === "external") {
    document.getElementById("externalLink").value = editData.link || "";
  }
};
// END LOAD DATA QUESTION VÀO TRANG
