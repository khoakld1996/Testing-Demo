// ===== API GOOGLE SCRIPT =====
const API = "https://script.google.com/macros/s/AKfycbx9A9shGbbkh4E0oBzKUFYzo-hqf2uv72PEOmlDS_BD_m6d1WIqE2L3syFTiYFHD2zv/exec";

// ================= GLOBAL =================
let questions = [];
let index = 0;
let score = 0;
let selected = -1;
let currentTest = null;

// ================= NAVIGATION =================
function go(page){ window.location.href = page; }

// ================= LOAD TEST INFO =================
function loadTestInfo(){
  const box = document.getElementById("testInfo");
  if(!box) return;
  currentTest = JSON.parse(localStorage.getItem("currentTest"));
  if(currentTest){
    box.innerHTML = `📘 <b>${currentTest.name}</b><br><small>${currentTest.desc || ""}</small>`;
  }
}

// ================= LOAD TESTS =================
async function loadTestsFromAPI(){
  const grid = document.getElementById("testGrid");
  if(!grid) return;
  grid.innerHTML = "Đang tải...";

  try{
    const res = await fetch(API+"?action=getTests");
    const data = await res.json();
    grid.innerHTML = "";
    if(!data.length){ grid.innerHTML="<p>Chưa có bài test</p>"; return; }

    data.forEach(test=>{
      const div=document.createElement("div");
      div.className="card";
      div.innerHTML=`<b>${test.name}</b><span class="tag">${test.totalQuestions} câu</span>`;
      div.onclick=()=>startTest(test);
      grid.appendChild(div);
    });
  }catch(err){
    console.log(err);
    grid.innerHTML="<p>❌ Lỗi load API</p>";
  }
}

// ================= START TEST =================
function startTest(test){
  localStorage.setItem("currentTest", JSON.stringify(test));
  go("quiz.html");
}

// ================= LOAD QUESTIONS =================
async function loadQuestionsFromAPI(){
  const listEl=document.getElementById("questionList");
  if(!listEl) return;
  currentTest = JSON.parse(localStorage.getItem("currentTest"));
  if(!currentTest){ listEl.innerHTML="<p>Chưa chọn bài test</p>"; return; }

  try{
    const res = await fetch(`${API}?action=getQuestions&testId=${currentTest.id}`);
    questions = await res.json() || [];
    listEl.innerHTML="";
    if(!questions.length){ listEl.innerHTML="<p>Chưa có câu hỏi</p>"; return; }

    const typeName = { mcq:"Trắc nghiệm", multiple:"Nhiều đáp án", truefalse:"Đúng/Sai",
      fill:"Điền khuyết", matching:"Nối cặp", ordering:"Sắp xếp",
      image:"Hình ảnh", audio:"Âm thanh", code:"Code", external:"Link"};

    questions.forEach((q,i)=>{
      const div=document.createElement("div");
      div.className="card";
      div.innerHTML=`
        <b>${i+1}. ${q.question}</b>
        <div class="tag">${typeName[q.type]||q.type}</div>
        <div class="action-btns">
          <button onclick="editQuestion(${i})">✏️</button>
          <button class="btn-danger" onclick="deleteQuestion(${i})">🗑️</button>
        </div>`;
      listEl.appendChild(div);
    });
  }catch(err){ console.log(err); listEl.innerHTML="<p>❌ Lỗi tải câu hỏi</p>"; }
}

// ================= ADD / EDIT QUESTION =================
function editQuestion(i){
  localStorage.setItem("editIndex", i);
  localStorage.setItem("editData", JSON.stringify(questions[i]));
  go("add-question.html");
}

async function addQuestion(){
  const type=document.getElementById("type")?.value;
  const questionText=document.getElementById("question")?.value.trim();
  if(!questionText){ alert("Nhập câu hỏi!"); return; }
  if(!currentTest){ alert("Chưa chọn bài test!"); return; }

  let data={type, question:questionText};

  if(type==="mcq"){ 
    data.options=[...Array(4)].map((_,i)=>document.getElementById(["a","b","c","d"][i])?.value); 
    data.correct=document.getElementById("correct")?.value; 
  }
  if(type==="multiple"){ 
    data.options=[...Array(4)].map((_,i)=>document.getElementById(["m1","m2","m3","m4"][i])?.value).filter(v=>v); 
    data.correct=document.getElementById("multiCorrect")?.value; 
  }
  if(type==="matching"){ 
    const rows=document.querySelectorAll("#pairsContainer > div"); 
    data.pairs=Array.from(rows).map(r=>{ const i=r.querySelectorAll("input"); return {left:i[0].value.trim(), right:i[1].value.trim()}; }); 
  }
  if(type==="ordering"){ 
    const inputs=document.querySelectorAll("#stepsContainer input"); 
    data.steps=Array.from(inputs).map(i=>i.value.trim()); 
  }
  if(type==="image"){ 
    const url=document.getElementById("imageUrl")?.value; 
    if(url) data.image=url; else { alert("Chọn ảnh!"); return; } 
  }
  if(type==="audio") data.audio=document.getElementById("audioUrl")?.value;
  if(type==="code"){ 
    data.code=document.getElementById("codeContent")?.value; 
    data.correct=document.getElementById("codeAnswer")?.value; 
  }
  if(type==="external") data.link=document.getElementById("externalLink")?.value;

  const formData=new FormData();
  formData.append("data", JSON.stringify({action:"addQuestion", testId:currentTest.id, answer:JSON.stringify(data)}));
  try{ 
    await fetch(API,{method:"POST", body:formData}); 
    alert("✅ Đã lưu"); 
    resetForm(); 
    loadQuestionsFromAPI(); 
  }
  catch(err){ console.log(err); alert("❌ Lỗi lưu Google Sheet"); }
}

// ================= DELETE =================
async function deleteQuestion(i){
  if(!confirm("Xóa câu hỏi này?")) return;
  const formData=new FormData();
  formData.append("data", JSON.stringify({action:"deleteQuestion", testId:currentTest.id, questionIndex:i}));
  try{ await fetch(API,{method:"POST",body:formData}); alert("✅ Đã xóa"); loadQuestionsFromAPI(); }
  catch(err){ console.log(err); alert("❌ Lỗi xóa"); }
}

// ================= RESET =================
function resetForm(){ 
  document.getElementById("question").value=""; 
  document.querySelectorAll("input,textarea").forEach(i=>i.value=""); 
  document.getElementById("pairsContainer")?.replaceChildren(); 
  document.getElementById("stepsContainer")?.replaceChildren(); 
}

// ================= TYPE =================
function changeType(){ 
  const type=document.getElementById("type")?.value; 
  ["mcqBox","multiBox","tfBox","fillBox","matchingBox","orderingBox","imageBox","audioBox","codeBox","externalBox"].forEach(id=>document.getElementById(id)?.style.display="none"); 
  if(type) document.getElementById(type+"Box")?.style.display="block"; 
}

// ================= INIT =================
window.onload=function(){ 
  loadTestInfo(); 
  loadTestsFromAPI(); 
  loadQuestionsFromAPI(); 
  changeType(); 
};

// ================= QUIZ =================
function initQuiz(){
  const questionEl = document.getElementById("question");
  const answerEl = document.getElementById("answers");

  if(!questionEl || !answerEl) return;

  fetch(`${API}?action=getQuestions&testId=${currentTest.id}`)
    .then(res=>res.json())
    .then(data=>{
      questions = data || [];
      if(questions.length) loadQuestion();
      else questionEl.innerText="Chưa có câu hỏi!";
    })
    .catch(err=>{ console.log(err); questionEl.innerText="❌ Lỗi tải câu hỏi"; });
}

function loadQuestion(){
  const q = questions[index];
  document.getElementById("question").innerText = q.question;

  let html = "";
  if(q.options) q.options.forEach((ans,i)=> html+=`<button onclick="select(${i})">${ans}</button>`);
  document.getElementById("answers").innerHTML = html;
  updateProgress();
}

function select(i){
  selected = i;
  document.querySelectorAll("#answers button").forEach(b=>b.classList.remove("selected"));
  document.querySelectorAll("#answers button")[i]?.classList.add("selected");
}

function next(){
  if(selected===-1){ alert("Chọn đáp án!"); return; }
  const q=questions[index];
  if(q.options){
    const map=["A","B","C","D"];
    if(map[selected]==q.correct) score++;
  }
  index++; selected=-1;
  if(index>=questions.length){ localStorage.setItem("score",score); localStorage.setItem("total",questions.length); go("result.html"); return; }
  loadQuestion();
}

function updateProgress(){
  const bar=document.getElementById("progress");
  if(!bar) return;
  bar.style.width=((index+1)/questions.length*100)+"%";
}

// ================= ENTER QUICK SAVE =================
document.addEventListener("keydown", e=>{
  if(e.ctrlKey && e.key==="Enter") addQuestion();
});