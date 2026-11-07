(() => {
"use strict";
const cfg = window.MEDIA_ACADEMY_CONFIG || {API_BASE_URL:"",REQUEST_TIMEOUT_MS:15000};
const $ = id => document.getElementById(id);
let role = "student", token = null, currentUser = null, activeSection = "home";
const COHORTS=["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"];
let selectedCohort=sessionStorage.getItem("ma_admin_cohort")||"__all__";
const studentNav = [
 ["home","الرئيسية","⌂"],["profile","ملفي الشخصي","◉"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات","▶"],["schedule","جدول المحاضرات","▦"],["exams","الامتحانات","✧"],["results","النتائج","◈"],["attendance","الحضور","◷"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"]
];
const adminNav = [
 ["home","لوحة التحكم","⌂"],["students","إدارة الطلاب","♙"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات والجداول","▶"],["exams","الامتحانات","✧"],["results","النتائج","◈"],["attendance","سجل الحضور","◷"],["attendance_sessions","جلسات الحضور والموقع","◎"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"],["settings","إعدادات النظام والحضور","⚙"]
];
const sectionNames = {home:"OVERVIEW",profile:"MY PROFILE",students:"STUDENTS",courses:"COURSES",materials:"MATERIALS",lectures:"LECTURES",schedule:"SCHEDULE",exams:"EXAMS & RESULTS",attendance:"ATTENDANCE",attendance_sessions:"ATTENDANCE SESSIONS",announcements:"ANNOUNCEMENTS",complaints:"MESSAGES",settings:"SYSTEM SETTINGS"};
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
 if(!cfg.API_BASE_URL) throw new Error("لم يتم إعداد رابط خدمة النظام بعد.");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),cfg.REQUEST_TIMEOUT_MS||20000);
 try{
  const headers={"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"};
  if(auth&&token) headers.Authorization="Bearer "+token;
  const url=cfg.API_BASE_URL.replace(/\/$/,"");
  let response;
  if(method==="GET"){
   const params=new URLSearchParams({path});
   if(auth&&token) params.set("token",token);
   if(auth&&currentUser&&currentUser.role==="admin"&&selectedCohort) params.set("cohort",selectedCohort);
   response=await fetch(url+"?"+params.toString(),{method:"GET",headers:{Accept:"application/json"},signal:controller.signal});
  }else{
   const payload=body?{...body}:{};
   if(auth&&currentUser&&currentUser.role==="admin"&&selectedCohort) payload.cohort=selectedCohort;
   if(path==="/auth/login") payload.action="login";
   else if(path==="/auth/register") payload.action="register";
   else payload.path=path;
   if(auth&&token) payload.token=token;
   response=await fetch(url,{method:"POST",headers,body:JSON.stringify(payload),signal:controller.signal});
  }
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error((data&&(data.message||data.error))||("خطأ من الخادم ("+response.status+")."));
  if(!data) throw new Error("الخادم لم يُرجع JSON صالحاً. راجع نشر Google Apps Script.");
  if(data.success===false) throw new Error(data.message||data.error||"رفض الخادم الطلب.");
  return data;
 }catch(error){
  if(error.name==="AbortError") throw new Error("انتهت مهلة الاتصال بالخادم.");
  if(error instanceof TypeError) throw new Error("تعذر الاتصال بخادم Google Apps Script. تحقق من رابط النشر وصلاحية الوصول وإعدادات الاستجابة.");
  throw error;
 }finally{clearTimeout(timer)}
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
 $("sidebarRole").textContent=currentUser.role==="admin"?"OWNER / ADMIN PORTAL":"STUDENT PORTAL";
 const cohortControl=$("cohortSelector");
 if(cohortControl){cohortControl.classList.toggle("hidden",currentUser.role!=="admin");cohortControl.value=selectedCohort;}
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
function toLocalDateTime(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return value||"";const pad=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
function fieldDefs(section){
 const common={status:{label:"الحالة",type:"select",options:["active","inactive","pending","published","draft"]},cohort:{label:"الفرقة",type:"text"},department:{label:"القسم",type:"text"}};
 const defs={
 students:[["student_code","كود الطالب"],["full_name","الاسم بالكامل"],["username","اسم المستخدم"],["email","البريد الإلكتروني","email"],["phone","رقم الهاتف"],["password","كلمة المرور","password"],["cohort","الفرقة","select",["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"]],["department","القسم"],["status","الحالة","select",["pending","active","inactive","rejected"]]],
 courses:[["title","اسم المادة"],["description","الوصف","textarea"],["cohort","الفرقة"],["department","القسم"],["teacher","اسم المدرس"],["sort_order","الترتيب","number"],["status","الحالة","select",["active","inactive"]]],
 materials:[["title","عنوان الكتاب أو الملف"],["description","الوصف","textarea"],["course_id","معرّف المادة"],["cohort","الفرقة"],["department","القسم"],["status","الحالة","select",["active","inactive"]]],
 lectures:[["title","عنوان المحاضرة"],["description","الوصف","textarea"],["course_id","معرّف المادة"],["cohort","الفرقة"],["department","القسم"],["teacher","المدرس"],["lecture_date","التاريخ","date"],["start_time","من الساعة","time"],["end_time","إلى الساعة","time"],["room","القاعة"],["meeting_url","رابط المحاضرة","url"],["status","الحالة","select",["active","inactive"]]],
 exams:[["title","اسم الامتحان"],["description","الوصف","textarea"],["course_id","معرّف المادة"],["cohort","الفرقة"],["start_at","موعد البداية","datetime-local"],["end_at","موعد النهاية","datetime-local"],["duration_minutes","المدة بالدقائق","number"],["status","الحالة","select",["draft","published","closed"]]],
 results:[["exam_id","معرّف الامتحان"],["student_id","معرّف الطالب"],["student_code","كود الطالب"],["cohort","الفرقة"],["score","الدرجة","number"],["max_score","النهاية العظمى","number"],["notes","ملاحظات","textarea"],["published","منشور","select",["true","false"]]],
 attendance_sessions:[["title","اسم جلسة الحضور"],["lecture_id","معرّف المحاضرة"],["location_url","رابط موقع Google Maps","url"],["latitude","خط العرض","number"],["longitude","خط الطول","number"],["radius_meters","النطاق بالمتر","number"],["opens_at","بداية الحضور","datetime-local"],["closes_at","نهاية الحضور","datetime-local"],["access_code","كود الحضور","password"],["status","الحالة","select",["active","closed","draft"]]],
 attendance:[["student_id","معرّف الطالب"],["student_code","كود الطالب"],["lecture_id","معرّف المحاضرة"],["attendance_date","التاريخ","date"],["check_in","وقت الحضور","time"],["status","الحالة","select",["present","absent","late"]],["notes","ملاحظات","textarea"]],
 announcements:[["title","عنوان الإعلان"],["body","نص الإعلان","textarea"],["target_cohort","الفرقة المستهدفة","select",["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"]],["status","الحالة","select",["draft","published"]],["publish_at","موعد النشر","datetime-local"],["expire_at","انتهاء الإعلان","datetime-local"]],
 complaints:[["subject","موضوع الشكوى"],["message","نص الشكوى","textarea"],["reply","رد الإدارة","textarea"],["status","الحالة","select",["new","in_progress","resolved","archived"]]],
 settings:[["key","اسم الإعداد"],["value","القيمة","textarea"]]
 };
 return (defs[section]||[]).map(x=>({name:x[0],label:x[1],type:x[2]||"text",options:x[3]||[]}));
}
function bindStudentAttendanceForm(){
 const form=$("studentAttendanceForm");
 if(!form)return;
 form.addEventListener("submit",e=>{
  e.preventDefault();
  if(!navigator.geolocation){$("studentAttendanceMessage").textContent="المتصفح لا يدعم تحديد الموقع.";return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent="جارٍ تحديد الموقع...";
  navigator.geolocation.getCurrentPosition(async position=>{
   try{
    const result=await api("/api/student/attendance",{method:"POST",body:{action:"checkin",session_id:form.elements.session_id.value,access_code:form.elements.access_code.value,latitude:position.coords.latitude,longitude:position.coords.longitude}});
    $("studentAttendanceMessage").textContent=result.message+(result.distance_meters!==undefined?" — بُعدك عن نقطة الحضور "+result.distance_meters+" متر.":"");
    form.reset();showToast("تم تسجيل الحضور بنجاح.");loadSection("attendance");
   }catch(err){$("studentAttendanceMessage").textContent=err.message;}
   finally{button.disabled=false;button.textContent="تحديد موقعي وتسجيل الحضور";}
  },err=>{
   $("studentAttendanceMessage").textContent=err.code===1?"اسمح للمتصفح بالوصول إلى موقعك ثم حاول مرة أخرى.":"تعذر تحديد موقعك. فعّل GPS وحاول مرة أخرى.";
   button.disabled=false;button.textContent="تحديد موقعي وتسجيل الحضور";
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 });
}
function bindStudentComplaintForm(){
 const form=$("studentComplaintForm");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const subject=form.elements.subject.value.trim(),messageText=form.elements.message.value.trim();
  const status=$("studentComplaintMessage");status.textContent="جارٍ إرسال الشكوى...";
  try{
   await api("/api/student/complaints",{method:"POST",body:{action:"submit_complaint",subject,message:messageText}});
   form.reset();status.textContent="تم إرسال الشكوى بنجاح.";showToast("تم إرسال الشكوى إلى الإدارة.");loadSection("complaints");
  }catch(err){status.textContent=err.message;}
 });
}
function renderSection(section,data){
 const title=({home:"نظرة عامة",profile:"ملفي الشخصي",students:"إدارة الطلاب",courses:"المواد الدراسية",materials:"الكتب والملفات",lectures:"المحاضرات والجداول",schedule:"الجدول الدراسي",exams:"الامتحانات",results:"النتائج",attendance:"الحضور",attendance_sessions:"جلسات الحضور",announcements:"الإعلانات",complaints:"الشكاوى والمقترحات",settings:"إعدادات النظام"})[section]||"الأكاديمية";
 if(section==="home"){
  const entries=Object.entries(data.stats||{});
  $("workspaceView").innerHTML='<h2 class="dashboard-title">'+title+'</h2><div class="dashboard-stats">'+(entries.length?entries.map(([k,v])=>'<div class="dashboard-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join(""):'<div class="empty-state">لا توجد إحصائيات متاحة.</div>')+'</div><p class="section-note">'+escapeHtml(data.message||"")+'</p>';return;
 }
 if(section==="profile"){
  const fields=data.profile||data.user||currentUser;
  $("workspaceView").innerHTML='<h2 class="dashboard-title">'+title+'</h2><div class="data-table-wrap"><table class="data-table"><tbody>'+Object.entries(fields).filter(([k])=>!["password","token","password_hash","password_salt"].includes(k.toLowerCase())).map(([k,v])=>'<tr><th>'+escapeHtml(k)+'</th><td>'+escapeHtml(v)+'</td></tr>').join("")+'</tbody></table></div>';return;
 }
 const rows=Array.isArray(data.items)?data.items:(Array.isArray(data[section])?data[section]:[]);
 const admin=currentUser.role==="admin"||currentUser.role==="owner";
 const defs=fieldDefs(section);
 const canManage=admin&&(section==="settings"||COHORTS.includes(selectedCohort)||(section==="students"&&selectedCohort==="__unassigned__"));
 const canCreate=admin&&(section==="settings"||COHORTS.includes(selectedCohort));
 let html='<div class="section-toolbar"><h2>'+title+'</h2>';
 if(canCreate && defs.length) html+='<button type="button" class="small-primary" data-create>＋ إضافة جديد</button>';
 html+='</div>';
 if(section==="complaints"&&!admin) html+='<div class="record-editor"><h3>إرسال شكوى أو مقترح</h3><form id="studentComplaintForm"><div class="record-fields"><label class="field-label">الموضوع<input class="form-input" name="subject" required maxlength="180"></label><label class="field-label">التفاصيل<textarea class="form-input" name="message" rows="4" required maxlength="5000"></textarea></label></div><div class="editor-actions"><button class="small-primary" type="submit">إرسال للإدارة</button></div><p class="section-note" id="studentComplaintMessage"></p></form></div>';
 if(section==="attendance"&&!admin){
  const sessions=Array.isArray(data.activeSessions)?data.activeSessions:[];
  if(sessions.length) html+='<div class="record-editor"><h3>تسجيل الحضور بالموقع</h3><form id="studentAttendanceForm"><div class="record-fields"><label class="field-label">جلسة الحضور<select class="form-input" name="session_id" required>'+sessions.map(x=>'<option value="'+escapeHtml(x.session_id)+'">'+escapeHtml(x.title||"جلسة حضور")+'</option>').join("")+'</select></label><label class="field-label">كود الحضور<input class="form-input" name="access_code" required autocomplete="off"></label></div><div class="editor-actions"><button class="small-primary" type="submit">تحديد موقعي وتسجيل الحضور</button></div><p class="section-note" id="studentAttendanceMessage">يجب تفعيل GPS والسماح للمتصفح بالوصول إلى موقعك.</p></form></div>';
  else html+='<p class="section-note">لا توجد جلسات حضور مفتوحة لفرقتك حالياً.</p>';
 }
 if(admin) html+='<p class="section-note">نطاق الإدارة الحالي: <b>'+escapeHtml(selectedCohort==="__all__"?"كل الفرق (عرض فقط)":selectedCohort)+'</b>'+(selectedCohort==="__all__"?" — اختر فرقة من القائمة أعلى الصفحة لتفعيل الإضافة والتعديل والحذف.":" — بيانات هذا القسم وإجراءاته مرتبطة بهذه الفرقة فقط.")+'</p>';
 if(admin && (section==="materials"||section==="lectures")) html+='<p class="section-note">لإضافة كتاب أو ملف، اضغط «إضافة جديد» ثم اختر ملف PDF أو مستند من جهازك.</p>';
 if(canManage && defs.length) html+='<div id="recordEditor" class="record-editor hidden"><h3 id="editorTitle">إضافة سجل</h3><form id="recordForm" class="record-form" data-section="'+section+'"><div class="record-fields">'+defs.map(f=>'<label class="field-label">'+escapeHtml(f.label)+(f.type==="password"?' (اختياري عند التعديل)':'')+(f.type==="textarea"?'<textarea name="'+f.name+'" class="form-input" rows="3"></textarea>':f.type==="select"?'<select name="'+f.name+'" class="form-input">'+f.options.map(o=>'<option value="'+o+'">'+o+'</option>').join("")+'</select>':'<input class="form-input" name="'+f.name+'" type="'+f.type+'" '+(f.name==="password"?'':'')+' >')+'</label>').join("")+((section==="materials"||section==="lectures")?'<label class="field-label">ملف للرفع إلى Google Drive<input class="form-input" type="file" name="uploadFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"></label>':'')+'</div><div class="editor-actions"><button class="small-primary" type="submit">حفظ</button><button class="small-primary" type="button" data-cancel>إلغاء</button></div><p class="section-note" id="editorMessage"></p></form></div>';
 if(!rows.length){html+='<div class="empty-state"><div class="empty-symbol">◇</div><b>لا توجد بيانات حتى الآن</b><p class="section-note">'+(canManage?'ابدأ بإضافة أول سجل من الزر الموجود بالأعلى.':(admin?'اختر فرقة محددة من القائمة أعلى الصفحة لإدارة بياناتها.':'ستظهر البيانات هنا بعد إضافتها واعتمادها من الإدارة.'))+'</p></div>';$("workspaceView").innerHTML=html;bindStudentComplaintForm();bindStudentAttendanceForm();const emptyEditor=$("recordEditor"),emptyForm=$("recordForm"),emptyCreate=$("workspaceView").querySelector("[data-create]");if(emptyEditor&&emptyForm&&emptyCreate&&canCreate){emptyCreate.addEventListener("click",()=>{emptyForm.reset();emptyForm.dataset.id="";$("editorTitle").textContent="إضافة سجل جديد";emptyEditor.classList.remove("hidden")});emptyForm.addEventListener("submit",saveRecord);emptyForm.addEventListener("click",e=>{if(e.target.closest("[data-cancel]"))emptyEditor.classList.add("hidden")})}return}
 const cols=Object.keys(rows[0]).filter(k=>!["password","token","password_hash","password_salt","code_hash","code_salt"].includes(k.toLowerCase()));
 html+='<div class="data-table-wrap"><table class="data-table"><thead><tr>'+cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join("")+(canManage?'<th>الإجراءات</th>':'')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+cols.map(c=>'<td>'+escapeHtml(row[c])+'</td>').join("")+(canManage?'<td class="row-actions">'+(section==="students"&&row.status==="pending"&&selectedCohort!=="__unassigned__"?'<button type="button" data-approve="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">قبول</button><button type="button" data-reject="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">رفض</button>':'')+'<button type="button" data-edit="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">تعديل</button><button type="button" data-delete="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">حذف</button></td>':'')+'</tr>').join("")+'</tbody></table></div>';
 $("workspaceView").innerHTML=html;
 bindStudentComplaintForm();
 bindStudentAttendanceForm();
 const editor=$("recordEditor"),form=$("recordForm"),createButton=$("workspaceView").querySelector("[data-create]");
 if(editor&&form){
  if(createButton&&canCreate) createButton.addEventListener("click",()=>{form.reset();form.dataset.id="";$("editorTitle").textContent="إضافة سجل جديد";editor.classList.remove("hidden");});
  form.addEventListener("submit",saveRecord);
  form.addEventListener("click",e=>{if(e.target.closest("[data-cancel]"))editor.classList.add("hidden")});
  $("workspaceView").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{const row=rows.find(x=>String(x[section==="attendance_sessions"?"session_id":"id"])===b.dataset.edit);if(!row)return;form.reset();form.dataset.id=row.id;defs.forEach(f=>{const el=form.elements[f.name];if(el&&f.name!=="password")el.value=f.type==="datetime-local"?toLocalDateTime(row[f.name]):(row[f.name]??"")});$("editorTitle").textContent="تعديل البيانات";editor.classList.remove("hidden")}));
  $("workspaceView").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("هل تريد حذف هذا السجل نهائياً؟"))return;await mutateRecord(section,"delete",b.dataset.delete,{});loadSection(section)}));
  $("workspaceView").querySelectorAll("[data-approve],[data-reject]").forEach(b=>b.addEventListener("click",async()=>{const action=b.dataset.approve?"approve":"reject";await api("/api/admin/"+section,{method:"POST",body:{action,section,id:b.dataset.approve||b.dataset.reject,cohort:selectedCohort}});showToast(action==="approve"?"تم اعتماد الطالب":"تم رفض الطلب");loadSection(section)}));
 }
}
async function mutateRecord(section,action,id,record){
 const data={action,section,record};if(id)data.id=id;
 return api("/api/admin/"+section,{method:"POST",body:data});
}
async function saveRecord(e){
 e.preventDefault();const form=e.currentTarget,section=form.dataset.section,id=form.dataset.id||"",record={};
 fieldDefs(section).forEach(f=>{const el=form.elements[f.name];if(el&&el.value!==""&&!(f.name==="password"&&!el.value))record[f.name]=el.value});
 if(section==="attendance_sessions"){if(record.opens_at)record.opens_at=new Date(record.opens_at).toISOString();if(record.closes_at)record.closes_at=new Date(record.closes_at).toISOString();}
 if(["students","courses","materials","lectures","exams","results","attendance","attendance_sessions","complaints"].includes(section)&&selectedCohort!=="__unassigned__")record.cohort=selectedCohort;
 if(section==="announcements")record.target_cohort=selectedCohort;
 const msg=$("editorMessage");msg.textContent="جارٍ الحفظ...";
 try{
  if(section==="materials"||section==="lectures"){
   const file=form.elements.uploadFile.files[0];
   if(file){
    if(file.size>8*1024*1024)throw new Error("الحد الأقصى لحجم الملف 8 ميجابايت حالياً.");
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=reject;reader.readAsDataURL(file)});
    const uploaded=await api("/api/admin/materials",{method:"POST",body:{action:"upload",name:file.name,mimeType:file.type||"application/octet-stream",base64}});
    record.file_id=uploaded.fileId;record.file_url=uploaded.url;record.mime_type=file.type||"application/octet-stream";
   }
  }
  await mutateRecord(section,id?"update":"create",id,record);
  showToast(id?"تم تحديث السجل بنجاح":"تمت إضافة السجل بنجاح");loadSection(section);
 }catch(err){msg.textContent=err.message}
}
const cohortSelector=$("cohortSelector");
if(cohortSelector){cohortSelector.addEventListener("change",()=>{selectedCohort=cohortSelector.value;sessionStorage.setItem("ma_admin_cohort",selectedCohort);loadSection(activeSection);});}
$("logoutButton").addEventListener("click",()=>{token=null;currentUser=null;sessionStorage.removeItem("ma_session");$("appPage").classList.add("hidden");$("authPage").classList.remove("hidden");$("loginForm").reset();message("loginMessage","");selectRole("student");window.scrollTo({top:0,behavior:"smooth"})});
const saved=sessionStorage.getItem("ma_session");
if(saved){try{const session=JSON.parse(saved);if(session.token&&session.user){token=session.token;currentUser=session.user;openWorkspace()}}catch{sessionStorage.removeItem("ma_session")}}
})();