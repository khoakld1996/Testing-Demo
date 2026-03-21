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
    window.location.href = "Dasboard.html";
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

// ===== PROGRESS =====
function updateProgress(){
  let percent = ((index+1)/questions.length)*100;
  document.getElementById("progress").style.width = percent + "%";
}

// ===== TIMER =====
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



