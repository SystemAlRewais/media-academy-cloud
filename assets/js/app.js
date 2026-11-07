(() => {
"use strict";
const cfg = window.MEDIA_ACADEMY_CONFIG || {API_BASE_URL:"",REQUEST_TIMEOUT_MS:15000};
const $ = id => document.getElementById(id);
let role = "student", token = null, currentUser = null, activeSection = "home";
const studentNav = [
 ["home","الرئيسية","⌂"],["profile","ملفي الشخصي","◉"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات","▶"],["schedule","جدول المحاضرات","▦"],["exams","الامتحانات والدرجات","✧"],["attendance","الحضور","◷"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"]
];
const adminNav = [
 ["home","لوحة التحكم","⌂"],["students","إدارة الطلاب","♙"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات والجداول","▶"],["exams","الامتحانات والنتائج","✧"],["attendance","سجل الحضور","◷"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"],["settings","إعدادات النظام والحضور","⚙"]
];
const sectionNames = {home:"OVERVIEW",profile:"MY PROFILE",students:"STUDENTS",courses:"COURSES",materials:"MATERIALS",lectures:"LECTURES",schedule:"SCHEDULE",exams:"EXAMS & RESULTS",attendance:"ATTENDANCE",announcements:"ANNOUNCEMENTS",complaints:"MESSAGES",settings:"SYSTEM SETTINGS"};
const COLLEGE_STORAGE_KEY = "media_academy_colleges_v1";
const DEFAULT_COLLEGE = "كلية الإعلام – جامعة الأزهر";
function readCollegeSettings(){try{const saved=JSON.parse(localStorage.getItem(COLLEGE_STORAGE_KEY)||"null");if(saved&&Array.isArray(saved.colleges)&&saved.colleges.length)return {colleges:saved.colleges.filter(x=>typeof x==="string"&&x.trim()),active:saved.active||saved.colleges[0]};}catch{}return {colleges:[DEFAULT_COLLEGE],active:DEFAULT_COLLEGE}}
let collegeSettings=readCollegeSettings();
function saveCollegeSettings(){localStorage.setItem(COLLEGE_STORAGE_KEY,JSON.stringify(collegeSettings));renderCollegeSettings();applyCollegeBranding()}
function applyCollegeBranding(){const el=$("collegeHeaderName");if(el)el.textContent=collegeSettings.active;const footerCollege=$("footerCollegeName");if(footerCollege)footerCollege.textContent=collegeSettings.active;document.title="Media Academy | "+collegeSettings.active}
function renderCollegeSettings(){const select=$("activeCollegeSelect"),list=$("collegeList");if(!select||!list)return;select.innerHTML=collegeSettings.colleges.map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join("");select.value=collegeSettings.active;list.innerHTML=collegeSettings.colleges.map(name=>'<div class="college-list-item"><span>'+escapeHtml(name)+'</span>'+(collegeSettings.colleges.length>1?'<button type="button" data-remove-college="'+encodeURIComponent(name)+'" aria-label="حذف '+escapeHtml(name)+'">حذف</button>':'<small>الكلية الافتراضية</small>')+'</div>').join("");}
function openCollegeSettings(){renderCollegeSettings();$("collegeSettingsModal").classList.remove("hidden")}
function closeCollegeSettings(){$("collegeSettingsModal").classList.add("hidden")}
function message(id,text,success=false){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle("success",success)}
function setBusy(button,busy,label){button.disabled=busy;button.querySelector("span").textContent=busy?"جارٍ التنفيذ...":label}
function showToast(text){const el=$("toast");el.textContent=text;el.classList.remove("hidden");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.add("hidden"),3500)}
function selectRole(next){role=next;const student=next==="student";$("studentRole").classList.toggle("selected",student);$("adminRole").classList.toggle("selected",!student);$("studentRole").setAttribute("aria-selected",String(student));$("adminRole").setAttribute("aria-selected",String(!student));$("identityLabel").textContent=student?"كود الطالب":"اسم المستخدم الإداري";$("identity").placeholder=student?"أدخل كود الطالب":"أدخل اسم المستخدم";$("registerArea").classList.toggle("hidden",!student);$("authTitle").textContent=student?"مرحباً بعودتك":"بوابة إدارة الأكاديمية";$("authSubtitle").textContent=student?"اختر بوابتك وسجّل الدخول للمتابعة":"الدخول المخصص لمسؤولي الأكاديمية";message("loginMessage","")}
async function api(path,{method="GET",body=null,auth=true}={}) {
 if(!cfg.API_BASE_URL) throw new Error("لم يتم إعداد رابط خدمة النظام بعد. أضف رابط الخادم في assets/js/config.js.");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),cfg.REQUEST_TIMEOUT_MS||15000);
 try{
  const headers={"Content-Type":"application/json","Accept":"application/json"};
  if(auth&&token)headers.Authorization="Bearer "+token;
  const response=await fetch(cfg.API_BASE_URL.replace(/\/$/,"")+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:controller.signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||data.error||"تعذر تنفيذ الطلب. راجع البيانات وحاول مرة أخرى.");
  return data;
 }catch(error){if(error.name==="AbortError")throw new Error("انتهت مهلة الاتصال بالخادم.");throw error}
 finally{clearTimeout(timer)}
}
$("openCollegeSettings").addEventListener("click",openCollegeSettings);
$("closeCollegeSettings").addEventListener("click",closeCollegeSettings);
$("collegeSettingsModal").addEventListener("click",e=>{if(e.target===$("collegeSettingsModal"))closeCollegeSettings()});
$("activeCollegeSelect").addEventListener("change",e=>{collegeSettings.active=e.target.value;saveCollegeSettings()});
$("addCollegeButton").addEventListener("click",()=>{const input=$("newCollegeName"),name=input.value.trim();if(!name){$("collegeSettingsNote").textContent="اكتب اسم الكلية أولاً.";return}if(collegeSettings.colleges.some(x=>x.toLowerCase()===name.toLowerCase())){$("collegeSettingsNote").textContent="هذه الكلية مضافة بالفعل.";return}collegeSettings.colleges.push(name);collegeSettings.active=name;input.value="";$("collegeSettingsNote").textContent="تمت إضافة الكلية وحفظها على هذا المتصفح.";saveCollegeSettings()});
$("collegeList").addEventListener("click",e=>{const btn=e.target.closest("[data-remove-college]");if(!btn)return;const name=decodeURIComponent(btn.dataset.removeCollege);collegeSettings.colleges=collegeSettings.colleges.filter(x=>x!==name);if(!collegeSettings.colleges.length)collegeSettings.colleges=[DEFAULT_COLLEGE];if(collegeSettings.active===name)collegeSettings.active=collegeSettings.colleges[0];saveCollegeSettings()});
applyCollegeBranding();
$("studentRole").addEventListener("click",()=>selectRole("student"));
$("adminRole").addEventListener("click",()=>selectRole("admin"));
$("togglePassword").addEventListener("click",()=>{$("password").type=$("password").type==="password"?"text":"password"});
$("forgotButton").addEventListener("click",()=>showToast("يرجى التواصل مع إدارة الأكاديمية لإعادة تعيين كلمة المرور."));
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();message("loginMessage","");
 const identity=$("identity").value.trim(),password=$("password").value;
 if(!identity||!password){message("loginMessage","أدخل بيانات الدخول كاملة.");return}
 const btn=$("loginButton");setBusy(btn,true,"تسجيل الدخول");
 try{
  const data=await api("/auth/login",{method:"POST",auth:false,body:{identity,password,role,remember:$("remember").checked}});
  if(!data.token||!data.user)throw new Error("استجابة تسجيل الدخول غير مكتملة من الخادم.");
  if(data.user.role&&data.user.role!==role)throw new Error("نوع الحساب لا يطابق بوابة الدخول المختارة.");
  token=data.token;currentUser=data.user;activeSection="home";
  if($("remember").checked)sessionStorage.setItem("ma_session",JSON.stringify({token,user:currentUser}));
  openWorkspace();
 }catch(err){message("loginMessage",err.message)}
 finally{setBusy(btn,false,"تسجيل الدخول")}
});
$("openRegister").addEventListener("click",()=>{$("registerModal").classList.remove("hidden");$("regName").focus()});
$("closeRegister").addEventListener("click",closeRegister);
$("registerModal").addEventListener("click",e=>{if(e.target===$("registerModal"))closeRegister()});
function closeRegister(){$("registerModal").classList.add("hidden");message("registerMessage","")}
$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();message("registerMessage","");
 const body={name:$("regName").value.trim(),phone:$("regPhone").value.trim(),email:$("regEmail").value.trim(),studentCode:$("regCode").value.trim(),password:$("regPassword").value};
 if(!body.name||!body.phone||!body.studentCode||body.password.length<8){message("registerMessage","أكمل البيانات المطلوبة، وكلمة المرور لا تقل عن 8 أحرف.");return}
 const btn=$("registerButton");setBusy(btn,true,"إرسال طلب التسجيل");
 try{const result=await api("/auth/register",{method:"POST",auth:false,body});message("registerMessage",result.message||"تم إرسال طلبك إلى إدارة الأكاديمية للمراجعة.",true);$("registerForm").reset()}
 catch(err){message("registerMessage",err.message)}
 finally{setBusy(btn,false,"إرسال طلب التسجيل")}
});
function openWorkspace(){
 $("authPage").classList.add("hidden");$("appPage").classList.remove("hidden");
 $("workspaceLabel").textContent=currentUser.role==="admin"?"لوحة إدارة الأكاديمية":"مساحة الطالب";
 $("welcomeName").textContent="مرحباً، "+(currentUser.name||currentUser.fullName||"بك");
 $("workspaceDescription").textContent=currentUser.role==="admin"?"إدارة الأكاديمية ومتابعة جميع الخدمات.":"تابع رحلتك التعليمية وخدمات الأكاديمية.";
 $("sidebarRole").textContent=currentUser.role==="admin"?"ADMIN PORTAL":"STUDENT PORTAL";
 $("userChip").textContent=currentUser.studentCode||currentUser.username||currentUser.email||"حساب معتمد";
 renderNav();loadSection("home");
}
function renderNav(){
 const nav=currentUser.role==="admin"?adminNav:studentNav;
 $("sideNav").innerHTML=nav.map(([id,label,icon])=>'<button type="button" data-section="'+id+'" class="'+(activeSection===id?"active":"")+'"><span class="nav-ico">'+icon+'</span>'+label+'</button>').join("");
 $("sideNav").querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>loadSection(button.dataset.section)));
}
async function loadSection(section){
 activeSection=section;renderNav();$("sectionEyebrow").textContent=sectionNames[section]||"ACADEMY";$("workspaceView").innerHTML='<div class="loading-state">جارٍ تحميل البيانات...</div>';
 try{
  const data=await api("/api/"+(currentUser.role==="admin"?"admin":"student")+"/"+section);
  renderSection(section,data);
 }catch(err){$("workspaceView").innerHTML='<div class="empty-state"><div class="empty-symbol">◈</div><b>تعذر تحميل القسم</b><p class="section-note">'+escapeHtml(err.message)+'</p></div>'}
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderSection(section,data){
 const title=({home:"نظرة عامة",profile:"ملفي الشخصي",students:"إدارة الطلاب",courses:"المواد الدراسية",materials:"الكتب والملفات",lectures:"المحاضرات",schedule:"الجدول الدراسي",exams:"الامتحانات والنتائج",attendance:"الحضور",announcements:"الإعلانات",complaints:"الشكاوى والمقترحات",settings:"إعدادات النظام"})[section]||"الأكاديمية";
 if(section==="home"){
  const stats=data.stats||{};const entries=Object.entries(stats);
  $("workspaceView").innerHTML='<h2 class="dashboard-title">'+title+'</h2><div class="dashboard-stats">'+(entries.length?entries.map(([k,v])=>'<div class="dashboard-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join(""):'<div class="empty-state">لا توجد إحصائيات متاحة حالياً.</div>')+'</div><p class="section-note">'+escapeHtml(data.message||"مرحباً بك في بوابة الأكاديمية.")+'</p>';
  return;
 }
 if(section==="profile"){
  const fields=data.profile||data.user||currentUser;
  $("workspaceView").innerHTML='<h2 class="dashboard-title">'+title+'</h2><div class="data-table-wrap"><table class="data-table"><tbody>'+Object.entries(fields).filter(([k])=>!["password","token"].includes(k.toLowerCase())).map(([k,v])=>'<tr><th>'+escapeHtml(k)+'</th><td>'+escapeHtml(v)+'</td></tr>').join("")+'</tbody></table></div>';return;
 }
 const rows=Array.isArray(data.items)?data.items:(Array.isArray(data[section])?data[section]:[]);
 if(!rows.length){$("workspaceView").innerHTML='<h2 class="dashboard-title">'+title+'</h2><div class="empty-state"><div class="empty-symbol">◇</div><b>لا توجد بيانات لعرضها حالياً</b><p class="section-note">ستظهر البيانات هنا بعد إضافتها واعتمادها من إدارة الأكاديمية.</p></div>';return}
 const cols=Object.keys(rows[0]).filter(k=>!["id","password","token"].includes(k.toLowerCase()));
 $("workspaceView").innerHTML='<div class="section-toolbar"><h2>'+title+'</h2></div><div class="data-table-wrap"><table class="data-table"><thead><tr>'+cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+cols.map(c=>'<td>'+escapeHtml(row[c])+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
}
$("logoutButton").addEventListener("click",()=>{token=null;currentUser=null;sessionStorage.removeItem("ma_session");$("appPage").classList.add("hidden");$("authPage").classList.remove("hidden");$("loginForm").reset();message("loginMessage","");selectRole("student");window.scrollTo({top:0,behavior:"smooth"})});
const saved=sessionStorage.getItem("ma_session");
if(saved){try{const session=JSON.parse(saved);if(session.token&&session.user){token=session.token;currentUser=session.user;openWorkspace()}}catch{sessionStorage.removeItem("ma_session")}}
})();
