// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbzyZWzip3R6_p_FRPjZ_u34uNbyRHQTOSp2H8cJjb_E5xd_c5oCEIcTaXzVZs6X0Q8u/exec";

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

// ================= SAVE STUDENT NAME =================
function saveName(){
  const name = document.getElementById("username")?.value.trim();
  if(!name){ alert("Nhập tên!"); return; }
  localStorage.setItem("username", name);
  go("select.html");
}

// ================= LOAD TEST INFO (Add Question page) =================
function loadTestInfo(){
  const box = document.getElementById("testInfo");
  const test = JSON.parse(localStorage.getItem("currentTest"));
  if(box){
    if(test) box.innerHTML = `📘 <b>${test.name}</b><br><small>${test.desc || ""}</small>`;
    else box.innerText = "⚠️ Chưa chọn bài test";
  }
}

// ================= LOAD TESTS FROM API (Select Page / Dashboard) =================
function loadTestsFromAPI(){
  const grid = document.getElementById("testGrid");
  if(grid) grid.innerHTML = "<p>⏳ Đang tải...</p>";

  fetch(API + "?action=getTests")
    .then(res => res.json())
    .then(data => {
      if(!grid) return;
      grid.innerHTML = "";
      if(!data.length){ grid.innerHTML="<p>Chưa có bài test</p>"; return; }

      data.forEach(test=>{
        const div = document.createElement("div");
        div.className="card";
        div.innerHTML=`<img src="https://picsum.photos/400/200?random=${test.id}">
                       <b>${test.name}</b>
                       <span class="tag">${test.totalQuestions} câu</span>`;
        div.onclick = () => startTest(test);
        grid.appendChild(div);
      });
    })
    .catch(err => {
      console.error(err);
      if(grid) grid.innerHTML="<p>❌ Lỗi tải dữ liệu</p>";
    });
}

// ================= START TEST =================
function startTest(test){
  localStorage.setItem("currentTest", JSON.stringify(test));
  // reset quiz data
  localStorage.removeItem("allQuestions");
  localStorage.removeItem("score");
  localStorage.removeItem("total");
  go("quiz.html");
}

// ================= QUIZ =================
function initQuiz(){
  const questionEl = document.getElementById("question");
  const answerEl = document.getElementById("answers");
  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;
  if(!questionEl || !answerEl || !testId) return;

  let all = JSON.parse(localStorage.getItem("allQuestions")) || {};
  questions = all[testId] || [];

  if(questions.length) loadQuestion();
  else questionEl.innerText = "Chưa có câu hỏi!";
}

function loadQuestion(){
  const q = questions[currentIndex];
  if(!q) return;

  document.getElementById("question").innerText = q.question;

  let html = "";
  if(q.options){
    q.options.forEach((opt,i)=>{
      html += `<button onclick="select(${i})">${opt}</button>`;
    });
  }
  document.getElementById("answers").innerHTML = html;
  updateProgress();
}

function select(i){
  selectedAnswer = i;
  document.querySelectorAll("#answers button").forEach(b => b.classList.remove("selected"));
  const btns = document.querySelectorAll("#answers button");
  if(btns[i]) btns[i].classList.add("selected");
}

function next(){
  if(selectedAnswer === -1){ alert("Chọn đáp án!"); return; }

  const q = questions[currentIndex];
  if(q.options){
    const map = ["A","B","C","D"];
    if(map[selectedAnswer] === q.correct) score++;
  }

  currentIndex++;
  selectedAnswer = -1;

  if(currentIndex >= questions.length){
    localStorage.setItem("score", score);
    localStorage.setItem("total", questions.length);
    go("result.html");
    return;
  }

  loadQuestion();
}

function updateProgress(){
  const bar = document.getElementById("progress");
  if(bar){
    const percent = ((currentIndex+1)/questions.length)*100;
    bar.style.width = percent + "%";
  }
}

// ================= LOAD RESULTS =================
function renderResults(){
  const nameEl = document.getElementById("name");
  const scoreEl = document.getElementById("score");
  const percentEl = document.getElementById("percent");

  const name = localStorage.getItem("username");
  const score = localStorage.getItem("score");
  const total = localStorage.getItem("total");

  if(nameEl) nameEl.innerText = "Học sinh: " + name;
  if(scoreEl) scoreEl.innerText = "Điểm: " + score + "/" + total;
  if(percentEl){
    const p = Math.round((score/total)*100);
    percentEl.innerText = "Tỉ lệ: " + p + "%";
  }
}

// ================= ADD QUESTION =================
function changeType(){
  const type = document.getElementById("type")?.value;
  const boxes = ["mcqBox","multiBox","tfBox","fillBox","matchingBox","orderingBox","imageBox","audioBox","codeBox","externalBox"];
  boxes.forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display="none"; });
  if(type) show(type + "Box");
}

function show(id){ const el=document.getElementById(id); if(el) el.style.display="block"; }

function addQuestion(){
  const type = document.getElementById("type")?.value;
  const question = document.getElementById("question")?.value.trim();
  if(!question){ alert("Nhập câu hỏi!"); return; }

  const currentTest = JSON.parse(localStorage.getItem("currentTest"));
  const testId = currentTest?.id;
  if(!testId){ alert("Chưa chọn bài test!"); return; }

  let data = {type, question};

  if(type==="mcq"){
    data.options=[document.getElementById("a")?.value,document.getElementById("b")?.value,
                  document.getElementById("c")?.value,document.getElementById("d")?.value];
    data.correct=document.getElementById("correct")?.value;
  }
  if(type==="multiple"){
    data.options=[document.getElementById("m1")?.value,document.getElementById("m2")?.value,
                  document.getElementById("m3")?.value,document.getElementById("m4")?.value].filter(v=>v);
    data.correct=document.getElementById("multiCorrect")?.value;
  }

  // TODO: xử lý các loại khác (fill, matching, ordering, image, audio, code, external)
  
  saveQuestion(data,testId);
}

function saveQuestion(data,testId){
  let all=JSON.parse(localStorage.getItem("allQuestions"))||{};
  if(!all[testId]) all[testId]=[];
  all[testId].push(data);
  localStorage.setItem("allQuestions", JSON.stringify(all));

  const formData=new FormData();
  formData.append("data", JSON.stringify({
    action:"addQuestion",
    testId,
    type:data.type,
    question:data.question,
    answer:JSON.stringify(data)
  }));

  fetch(API,{method:"POST",body:formData})
    .then(res=>res.json())
    .then(()=>alert("✅ Đã lưu!"))
    .catch(()=>alert("❌ Lỗi kết nối Google Sheet!"));
}

// ================= INIT =================
window.onload = function(){
  loadTestsFromAPI();
  loadTestInfo();
  initQuiz();
  changeType();
  renderResults();
};