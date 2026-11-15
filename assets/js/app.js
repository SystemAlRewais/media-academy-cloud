(() => {
"use strict";
const cfg = window.MEDIA_ACADEMY_CONFIG || {API_BASE_URL:"",REQUEST_TIMEOUT_MS:15000};
const $ = id => document.getElementById(id);
const isAdminUser = () => !!currentUser && (currentUser.role === "admin" || currentUser.role === "owner");
let role = "student", token = null, currentUser = null, activeSection = "home";
let COHORTS=["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"];
let selectedCohort=sessionStorage.getItem("ma_admin_cohort")||"__all__";
let selectedEntityId=sessionStorage.getItem("ma_admin_entity")||"legacy-media";
let selectedTeacherId=sessionStorage.getItem("ma_admin_teacher")||"__all__";
const studentNav = [
 ["home","الرئيسية","⌂"],["profile","ملفي الشخصي","◉"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات","▶"],["schedule","جدول المحاضرات","▦"],["exams","الامتحانات","✧"],["results","النتائج","◈"],["attendance","الحضور","◷"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"]
];
const adminNav = [
 ["home","لوحة التحكم","⌂"],["students","قائمة الطلاب","♙"],["add_student","إضافة طالب","＋"],["centers","السناتر والمدرسون","▣"],["courses","المواد الدراسية","▤"],["materials","الكتب والملفات","▧"],["lectures","المحاضرات والجداول","▶"],["exams","الامتحانات","✧"],["results","النتائج","◈"],["attendance","سجل الحضور","◷"],["attendance_sessions","جلسات الحضور والموقع","◎"],["announcements","الإعلانات","◇"],["complaints","الشكاوى والمقترحات","✉"],["settings","إعدادات النظام والحضور","⚙"]
];
const sectionNames = {home:"OVERVIEW",profile:"MY PROFILE",students:"STUDENTS",add_student:"ADD STUDENT",centers:"CENTERS & TEACHERS",courses:"COURSES",materials:"MATERIALS",lectures:"LECTURES",schedule:"SCHEDULE",exams:"EXAMS & RESULTS",attendance:"ATTENDANCE",attendance_sessions:"ATTENDANCE SESSIONS",announcements:"ANNOUNCEMENTS",complaints:"MESSAGES",settings:"SYSTEM SETTINGS"};
const DEFAULT_COLLEGE = "كلية الإعلام – جامعة الأزهر";
let collegeSettings={colleges:[DEFAULT_COLLEGE],entities:[{id:"entity-default",name:DEFAULT_COLLEGE,type:"college",levels:[]}],active:DEFAULT_COLLEGE,platformName:"المنصة التعليمية المفتوحة",};
async function loadCollegeSettings(){
 if(!currentUser||!isAdminUser())throw new Error("إعدادات الجهات التعليمية متاحة للإدارة العامة فقط.");
 const data=await api("/api/admin/settings"),rows=Array.isArray(data.items)?data.items:[];
 const values=Object.fromEntries(rows.map(x=>[String(x.key),String(x.value||"")]));
 let entities=[];try{entities=JSON.parse(values.education_entities||"[]")}catch{}
 if(!Array.isArray(entities)||!entities.length){
  let names=[];try{names=JSON.parse(values.college_list||"[]")}catch{}
  if(!Array.isArray(names)||!names.length)names=[values.college_name||DEFAULT_COLLEGE];
  entities=names.map((name,i)=>({id:"entity-"+i,name,type:"college",levels:LEGACY_LEVELS.slice()}));
 }
 entities=entities.filter(x=>x&&x.name).map((x,i)=>({id:String(x.id||("entity-"+i)),name:String(x.name),type:x.type||"college",levels:Array.isArray(x.levels)&&x.levels.length?x.levels.filter(v=>v&&v.name).map((v,j)=>({id:String(v.id||("level-"+j)),name:String(v.name)})):(String(x.type||"college")==="college"?LEGACY_LEVELS.map((name,j)=>({id:"legacy-"+(j+1),name})):[]),settings:x.settings&&typeof x.settings==="object"?x.settings:{},teachers:Array.isArray(x.teachers)?x.teachers.filter(t=>t&&t.id&&t.name).map(t=>({id:String(t.id),name:String(t.name)})):[]}));
 if(!entities.length)entities=[{id:"entity-default",name:DEFAULT_COLLEGE,type:"college",levels:LEGACY_LEVELS.map((name,i)=>({id:"level-"+i,name}))}];
 collegeSettings={colleges:entities.map(x=>x.name),entities,active:values.active_college||entities[0].name,platformName:values.platform_name||"المنصة التعليمية المفتوحة",};
 if(!collegeSettings.colleges.includes(collegeSettings.active))collegeSettings.active=entities[0].name;
 const entityControl=$("entitySelector");if(entityControl){entityControl.innerHTML=entities.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(x.name)+'</option>').join("");if(!entities.some(x=>x.id===selectedEntityId))selectedEntityId=entities[0].id;entityControl.value=selectedEntityId;}
 COHORTS=(entities.find(x=>x.id===selectedEntityId)||entities[0]).levels.map(x=>x.name);
 const teacherControl=$("teacherSelector"),currentEntity=entities.find(x=>x.id===selectedEntityId)||entities[0];if(teacherControl){teacherControl.innerHTML='<option value="__all__">كل المدرسين</option>'+(currentEntity.teachers||[]).map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("");if(!(currentEntity.teachers||[]).some(t=>t.id===selectedTeacherId))selectedTeacherId="__all__";teacherControl.value=selectedTeacherId;}
 const cohortControl=$("cohortSelector");if(cohortControl){cohortControl.innerHTML='<option value="__all__">كل الفرق والمستويات</option><option value="__unassigned__">طلبات بدون فرقة</option>'+COHORTS.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join("");if(selectedCohort!=="__all__"&&selectedCohort!=="__unassigned__"&&!COHORTS.includes(selectedCohort))selectedCohort="__all__";cohortControl.value=selectedCohort;}
 renderCollegeSettings();applyCollegeBranding();
 const p=$("platformNameInput"),c=$("collegeNameInput");if(p)p.value=collegeSettings.platformName;if(c)c.value=collegeSettings.active;
}
async function persistCollegeSettings(){
 const data=await api("/api/admin/settings"),rows=Array.isArray(data.items)?data.items:[];
 const values={education_entities:JSON.stringify(collegeSettings.entities),college_list:JSON.stringify(collegeSettings.colleges),active_college:collegeSettings.active,platform_name:collegeSettings.platformName||"المنصة التعليمية المفتوحة",college_name:collegeSettings.active};
 for(const [key,value] of Object.entries(values)){
  const existing=rows.find(x=>String(x.key)===key);
  await mutateRecord("settings",existing?"update":"create",key,{value});
 }
}
async function saveCollegeSettings(){
 const note=$("collegeSettingsNote");
 try{collegeSettings.colleges=collegeSettings.entities.map(x=>x.name);await persistCollegeSettings();selectedEntityId=activeEntity().id;sessionStorage.setItem("ma_admin_entity",selectedEntityId);const entitySelect=$("entitySelector");if(entitySelect){entitySelect.innerHTML=collegeSettings.entities.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(x.name)+'</option>').join("");entitySelect.value=selectedEntityId;}COHORTS=(activeEntity().levels||[]).map(x=>x.name);if(!COHORTS.includes(selectedCohort))selectedCohort="__all__";const cohortSelect=$("cohortSelector");if(cohortSelect){cohortSelect.innerHTML='<option value="__all__">كل الفرق والمستويات</option><option value="__unassigned__">طلبات بدون فرقة</option>'+COHORTS.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join("");cohortSelect.value=selectedCohort;}const teacherSelect=$("teacherSelector"),entity=collegeSettings.entities.find(x=>x.id===selectedEntityId);if(teacherSelect){teacherSelect.innerHTML='<option value="__all__">كل المدرسين</option>'+(entity?.teachers||[]).map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("");if(!(entity?.teachers||[]).some(t=>t.id===selectedTeacherId))selectedTeacherId="__all__";teacherSelect.value=selectedTeacherId;}renderCollegeSettings();applyCollegeBranding();if(note)note.textContent="تم حفظ إعدادات الجهات والمستويات سحابياً.";}
 catch(err){if(note)note.textContent="تعذر الحفظ: "+err.message;showToast("لم يتم حفظ الإعدادات.");}
}
const LEGACY_LEVELS=["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"];
function activeEntity(){return collegeSettings.entities.find(x=>x.name===collegeSettings.active)||collegeSettings.entities[0];}
function loadActiveEntitySettings(){const s=activeEntity()?.settings||{};const fields={entityWelcomeMessage:"welcomeMessage",entityContactPhone:"contactPhone",entityWhatsapp:"whatsapp",entityAddress:"address",entityLogoUrl:"logoUrl"};for(const [id,key] of Object.entries(fields)){const el=$(id);if(el)el.value=s[key]||"";}}
function renderCollegeSettings(){
 const select=$("activeCollegeSelect"),list=$("collegeList");if(!select||!list)return;
 select.innerHTML=collegeSettings.entities.map(x=>'<option value="'+escapeHtml(x.name)+'">'+escapeHtml(x.name)+'</option>').join("");select.value=collegeSettings.active;
 const entity=activeEntity();
 const teachers=(entity.teachers||[]).map(t=>'<div class="college-list-item"><span>'+escapeHtml(t.name)+'</span><button type="button" data-remove-teacher="'+escapeHtml(t.id)+'">حذف المدرس</button></div>').join("");
 const levels=(entity.levels||[]).map(l=>'<div class="college-list-item"><span>'+escapeHtml(l.name)+'</span><button type="button" data-remove-level="'+escapeHtml(l.id)+'">حذف المستوى</button></div>').join("");
 list.innerHTML='<div class="college-list-item"><b>'+escapeHtml(entity.name)+'</b><small>'+((entity.levels||[]).length)+' مستويات · '+((entity.teachers||[]).length)+' مدرسين</small></div>'+levels+teachers+collegeSettings.entities.map(x=>x.name===entity.name?"":'<div class="college-list-item"><span>'+escapeHtml(x.name)+'</span><button type="button" data-remove-entity="'+escapeHtml(x.id)+'">حذف الجهة</button></div>').join("");
 const type=$("entityTypeInput");if(type)type.value=entity.type||"college";loadActiveEntitySettings();
}
function applyCollegeBranding(){
 const platform=collegeSettings.platformName||"المنصة التعليمية المفتوحة";
 const academyEl=$("academyHeaderName");if(academyEl)academyEl.textContent=platform;
 const el=$("collegeHeaderName");if(el){el.textContent="";el.parentElement.style.display="none";}
 const footerCollege=$("footerCollegeName");if(footerCollege)footerCollege.textContent=platform;
 document.title=platform;
 document.querySelectorAll(".brand-copy b,.sidebar-brand b").forEach(node=>node.textContent=platform.toUpperCase());
 document.querySelectorAll(".brand-copy small").forEach(node=>node.textContent="OPEN EDUCATION PLATFORM");
 const footerMeta=document.querySelector(".footer-meta span");if(footerMeta)footerMeta.textContent="© "+platform.toUpperCase();
 const authHeading=$("authTitle");if(authHeading&&authHeading.textContent.includes("الأكاديمية"))authHeading.textContent=authHeading.textContent.replaceAll("الأكاديمية",platform);
 const settings=currentUser&&currentUser.role==="student"?(collegeSettings.activeEntitySettings||{}):(activeEntity()?.settings||{});
 const welcome=document.querySelector(".hero-lead");if(welcome)welcome.textContent=settings.welcomeMessage||"كل ما تحتاجه في رحلتك التعليمية، في مساحة واحدة تجمع المحاضرات والمواد الدراسية والاختبارات والحضور والمتابعة.";
 const logoUrl=String(settings.logoUrl||"").trim();let safeLogo="";
 try{const parsed=new URL(logoUrl);if(parsed.protocol==="https:"||parsed.protocol==="http:")safeLogo=parsed.href;}catch(e){}
 document.querySelectorAll(".brand-mark").forEach(mark=>{mark.style.backgroundImage=safeLogo?'url("'+safeLogo.replace(/["\\]/g,"")+'")':"";mark.style.backgroundSize="cover";mark.style.backgroundPosition="center";if(safeLogo)mark.textContent="";else mark.textContent="MA";});
}

async function openCollegeSettings(){try{await loadCollegeSettings();$("collegeSettingsModal").classList.remove("hidden")}catch(err){showToast(err.message)}}
function closeCollegeSettings(){$("collegeSettingsModal").classList.add("hidden")}
function message(id,text,success=false){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle("success",success)}
function setBusy(button,busy,label){button.disabled=busy;button.querySelector("span").textContent=busy?"جارٍ التنفيذ...":label}
function showToast(text){const el=$("toast");el.textContent=text;el.classList.remove("hidden");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.add("hidden"),3500)}
function selectRole(next){role=next;const student=next==="student";$("studentRole").classList.toggle("selected",student);$("adminRole").classList.toggle("selected",!student);$("studentRole").setAttribute("aria-selected",String(student));$("adminRole").setAttribute("aria-selected",String(!student));$("identityLabel").textContent=student?"كود الطالب":"اسم المستخدم الإداري";$("identity").placeholder=student?"أدخل كود الطالب":"أدخل اسم المستخدم";$("registerArea").classList.toggle("hidden",!student);$("authTitle").textContent=student?"مرحباً بعودتك":"إدارة المنصة";$("authSubtitle").textContent=student?"اختر بوابتك وسجّل الدخول للمتابعة":"الدخول المخصص لمسؤولي المنصة";message("loginMessage","")}
async function api(path,{method="GET",body=null,auth=true,params:extraParams={}}={}) {
 if(!cfg.API_BASE_URL) throw new Error("لم يتم إعداد رابط خدمة النظام بعد.");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),cfg.REQUEST_TIMEOUT_MS||20000);
 try{
  const headers={"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"};

  const url=cfg.API_BASE_URL.replace(/\/$/,"");
  let response;
  if(method==="GET"){
   const params=new URLSearchParams({path,...extraParams});
   if(auth&&token) params.set("token",token);
   if(auth&&currentUser&&isAdminUser()&&selectedCohort) params.set("cohort",selectedCohort);
   if(auth&&currentUser&&isAdminUser()&&selectedEntityId) params.set("entity_id",selectedEntityId);
   if(auth&&currentUser&&isAdminUser()&&selectedTeacherId) params.set("teacher_id",selectedTeacherId);
   response=await fetch(url+"?"+params.toString(),{method:"GET",headers:{Accept:"application/json"},signal:controller.signal});
  }else{
   const payload=body?{...body}:{};
   if(auth&&currentUser&&isAdminUser()&&selectedCohort&&selectedCohort!=="__all__"&&selectedCohort!=="__unassigned__") payload.cohort=selectedCohort;
   if(auth&&currentUser&&isAdminUser()&&selectedEntityId) payload.entity_id=selectedEntityId;
   if(auth&&currentUser&&isAdminUser()&&selectedTeacherId&&selectedTeacherId!=="__all__") payload.teacher_id=selectedTeacherId;
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
const openCollegeSettingsButton=$("openCollegeSettings");if(openCollegeSettingsButton)openCollegeSettingsButton.addEventListener("click",openCollegeSettings);
$("closeCollegeSettings").addEventListener("click",closeCollegeSettings);
$("collegeSettingsModal").addEventListener("click",e=>{if(e.target===$("collegeSettingsModal"))closeCollegeSettings()});
$("activeCollegeSelect").addEventListener("change",e=>{collegeSettings.active=e.target.value;const input=$("collegeNameInput");if(input)input.value=collegeSettings.active;renderCollegeSettings();saveCollegeSettings()});
$("saveBrandButton").addEventListener("click",async()=>{collegeSettings.platformName="المنصة التعليمية المفتوحة";$("platformNameInput").value=collegeSettings.platformName;await saveCollegeSettings()});

$("saveCollegeNameButton").addEventListener("click",async()=>{const name=$("collegeNameInput").value.trim();if(!name){$("collegeSettingsNote").textContent="اكتب اسم الجهة أولاً.";return}const entity=activeEntity();entity.name=name;collegeSettings.active=name;await saveCollegeSettings()});
$("addCollegeButton").addEventListener("click",async()=>{const name=$("newCollegeName").value.trim(),type=$("entityTypeInput").value;if(!name){$("collegeSettingsNote").textContent="اكتب اسم الجهة أولاً.";return}if(collegeSettings.entities.some(x=>x.name.toLowerCase()===name.toLowerCase())){$("collegeSettingsNote").textContent="الجهة مضافة بالفعل.";return}collegeSettings.entities.push({id:"entity-"+Date.now(),name,type,levels:[]});collegeSettings.active=name;$("newCollegeName").value="";await saveCollegeSettings()});
$("saveEntitySettingsButton").addEventListener("click",async()=>{
 const entity=activeEntity();if(!entity)return;
 entity.settings=entity.settings||{};
 const fields={entityWelcomeMessage:"welcomeMessage",entityContactPhone:"contactPhone",entityWhatsapp:"whatsapp",entityAddress:"address",entityLogoUrl:"logoUrl"};
 for(const [id,key] of Object.entries(fields)){const el=$(id);entity.settings[key]=el?el.value.trim():"";}
 await saveCollegeSettings();
});
$("addTeacherButton").addEventListener("click",async()=>{const name=$("newTeacherName").value.trim(),entity=activeEntity();if(!name||!entity)return;entity.teachers=entity.teachers||[];if(entity.teachers.some(t=>t.name.toLowerCase()===name.toLowerCase())){$("collegeSettingsNote").textContent="اسم المدرس موجود بالفعل داخل هذه الجهة.";return}entity.teachers.push({id:"teacher-"+Date.now(),name});$("newTeacherName").value="";await saveCollegeSettings()});
$("addLevelButton").addEventListener("click",async()=>{const name=$("newLevelName").value.trim(),entity=activeEntity();if(!name||!entity)return;if(entity.levels.some(x=>x.name.toLowerCase()===name.toLowerCase())){$("collegeSettingsNote").textContent="المستوى موجود بالفعل.";return}entity.levels.push({id:"level-"+Date.now(),name});$("newLevelName").value="";await saveCollegeSettings()});
$("collegeList").addEventListener("click",async e=>{const teacher=e.target.closest("[data-remove-teacher]"),level=e.target.closest("[data-remove-level]"),entityBtn=e.target.closest("[data-remove-entity]");if(teacher){const entity=activeEntity();entity.teachers=(entity.teachers||[]).filter(x=>x.id!==teacher.dataset.removeTeacher);if(selectedTeacherId===teacher.dataset.removeTeacher)selectedTeacherId="__all__";await saveCollegeSettings()}else if(level){const entity=activeEntity();entity.levels=entity.levels.filter(x=>x.id!==level.dataset.removeLevel);await saveCollegeSettings()}else if(entityBtn){if(collegeSettings.entities.length===1){$("collegeSettingsNote").textContent="لا يمكن حذف آخر جهة.";return}collegeSettings.entities=collegeSettings.entities.filter(x=>x.id!==entityBtn.dataset.removeEntity);collegeSettings.active=collegeSettings.entities[0].name;await saveCollegeSettings()}});
applyCollegeBranding();
$("studentRole").addEventListener("click",()=>selectRole("student"));
$("adminRole").addEventListener("click",()=>selectRole("admin"));
$("togglePassword").addEventListener("click",()=>{$("password").type=$("password").type==="password"?"text":"password"});
$("forgotButton").addEventListener("click",()=>showToast("يرجى التواصل مع إدارة المنصة لإعادة تعيين كلمة المرور."));
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();message("loginMessage","");
 const identity=$("identity").value.trim(),password=$("password").value;
 if(!identity||!password){message("loginMessage","أدخل بيانات الدخول كاملة.");return}
 const btn=$("loginButton");setBusy(btn,true,"تسجيل الدخول");
 try{
  const data=await api("/auth/login",{method:"POST",auth:false,body:{identity,password,role,remember:$("remember").checked}});
  if(!data.token||!data.user)throw new Error("استجابة تسجيل الدخول غير مكتملة من الخادم.");
  if(data.user.role && (role==="admin" ? !["admin","owner"].includes(data.user.role) : data.user.role!=="student")) throw new Error("نوع الحساب لا يطابق بوابة الدخول المختارة.");
  token=data.token;currentUser=data.user;activeSection="home";if(!isAdminUser()&&currentUser.entity_name){collegeSettings.active=currentUser.entity_name;applyCollegeBranding();}
  if($("remember").checked)sessionStorage.setItem("ma_session",JSON.stringify({token,user:currentUser}));
  openWorkspace();
 }catch(err){message("loginMessage",err.message)}
 finally{setBusy(btn,false,"تسجيل الدخول")}
});
async function loadRegistrationEntities(){
 const select=$("regEntity"),typeSelect=$("regType"),levelSelect=$("regCohort"),teacherSelect=$("regTeacher"),registerButton=$("registerButton");
 select.dataset.entities="[]";
 select.innerHTML='<option value="">جارٍ تحميل الجهات التعليمية...</option>';
 levelSelect.innerHTML='<option value="">اختر الجهة أولاً</option>';if(teacherSelect)teacherSelect.innerHTML='<option value="">اختر الجهة أولاً</option>';
 levelSelect.disabled=true;
 registerButton.disabled=false;
 try{
  const data=await api("/api/public/education",{auth:false});
  const entities=Array.isArray(data.entities)?data.entities:[];
  if(data.apiVersion!=="2026.11.15-centers-v2")throw new Error("رابط الخدمة متصل بنسخة قديمة. يجب نشر ملف Code.gs المحدث على Google Apps Script أولاً.");
  if(!entities.length)throw new Error("الخادم لم يُرجع أي جهات تعليمية. راجع نشر نسخة Apps Script المحدثة.");
  select.dataset.entities=JSON.stringify(entities);
  if(typeSelect&&![ "college","center","other"].includes(typeSelect.value))typeSelect.value="college";
  if(typeSelect&&!entities.some(x=>String(x.type||"college")===typeSelect.value))typeSelect.value=String(entities[0].type||"college");
  updateRegistrationEntities();
  message("registerMessage","");
 }catch(err){
  select.dataset.entities="[]";
  select.innerHTML='<option value="">تعذر تحميل الجهات</option>';
  levelSelect.innerHTML='<option value="">التسجيل متوقف لحين الاتصال بالخادم</option>';
  levelSelect.disabled=true;
  registerButton.disabled=true;
  message("registerMessage","تعذر تحميل الجهات من الخادم، لذلك أوقفنا التسجيل بدل عرض بيانات قديمة. "+err.message);
 }
}
function updateRegistrationEntities(){
 const typeSelect=$("regType"),select=$("regEntity"),all=JSON.parse(select.dataset.entities||"[]");
 const type=typeSelect?typeSelect.value:"college",entities=all.filter(x=>String(x.type||"college")===type);
 select.innerHTML='<option value="">اختر الجهة التعليمية</option>'+entities.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(x.name)+'</option>').join("");
 if(entities.length===1)select.value=entities[0].id;
 updateRegistrationTeachers();
 updateRegistrationLevels();
}
function updateRegistrationTeachers(){
 const all=JSON.parse(($("regEntity")&&$("regEntity").dataset.entities)||"[]");
 const entity=all.find(x=>String(x.id)===String($("regEntity").value));
 const control=$("regTeacher"),teachers=entity&&Array.isArray(entity.teachers)?entity.teachers:[];
 if(control){control.innerHTML='<option value="">'+(entity?(teachers.length?"اختر المدرس":"لم تتم إضافة مدرسين لهذه الجهة بعد"):"اختر الجهة أولاً")+'</option>'+teachers.map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("");control.disabled=!entity||!teachers.length;}
}
async function loadPublicBranding(entityId=""){try{const data=await api("/api/public/education",{auth:false,params:entityId?{entity_id:entityId}:{}});collegeSettings.platformName=data.platformName||collegeSettings.platformName;if(data.activeCollege&&!entityId)collegeSettings.active=data.activeCollege;collegeSettings.activeEntitySettings=data.entitySettings||{};if(entityId&&currentUser&&String(currentUser.entity_id)===String(entityId)&&currentUser.entity_name)collegeSettings.active=currentUser.entity_name;applyCollegeBranding();}catch(err){console.warn("Public branding unavailable",err.message)}}
function updateRegistrationLevels(){
 const entities=JSON.parse($("regEntity").dataset.entities||"[]"),entity=entities.find(x=>x.id===$("regEntity").value),select=$("regCohort");
 const levels=entity&&Array.isArray(entity.levels)?entity.levels:[];
 select.innerHTML='<option value="">'+(entity?(levels.length?"اختر الفرقة أو المستوى":"لم تتم إضافة مستويات لهذه الجهة بعد"):"اختر الجهة أولاً")+'</option>'+levels.map(x=>'<option value="'+escapeHtml(x.name)+'">'+escapeHtml(x.name)+'</option>').join("");
 select.disabled=!entity||!levels.length;
 if(levels.length===1)select.value=levels[0].name;
}
$("regEntity").addEventListener("change",()=>{updateRegistrationTeachers();updateRegistrationLevels();});
if($("regType"))$("regType").addEventListener("change",updateRegistrationEntities);
$("openRegister").addEventListener("click",()=>{$("registerModal").classList.remove("hidden");loadRegistrationEntities();$("regName").focus()});
$("closeRegister").addEventListener("click",closeRegister);
$("registerModal").addEventListener("click",e=>{if(e.target===$("registerModal"))closeRegister()});
function closeRegister(){$("registerModal").classList.add("hidden");message("registerMessage","")}
$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();message("registerMessage","");
 const body={name:$("regName").value.trim(),phone:$("regPhone").value.trim(),email:$("regEmail").value.trim(),entity_id:$("regEntity").value,teacher_id:$("regTeacher").value,cohort:$("regCohort").value,password:$("regPassword").value};
 if(!body.name||!body.phone||!body.entity_id||!body.teacher_id||!body.cohort||body.password.length<8){message("registerMessage","أكمل الاسم والهاتف والجهة والمدرس والمستوى، وكلمة المرور لا تقل عن 8 أحرف.");return}
 const btn=$("registerButton");setBusy(btn,true,"إرسال طلب التسجيل");
 try{const result=await api("/auth/register",{method:"POST",auth:false,body});message("registerMessage",result.message||"تم إرسال طلبك إلى إدارة المنصة للمراجعة.",true);$("registerForm").reset()}
 catch(err){message("registerMessage",err.message)}
 finally{setBusy(btn,false,"إرسال طلب التسجيل")}
});
function openWorkspace(){
 $("authPage").classList.add("hidden");$("appPage").classList.remove("hidden");
 $("workspaceLabel").textContent=isAdminUser()?"لوحة إدارة المنصة":"مساحة الطالب";
 $("welcomeName").textContent="مرحباً، "+(currentUser.name||currentUser.fullName||"بك");
 $("workspaceDescription").textContent=isAdminUser()?"إدارة المنصة ومتابعة جميع الخدمات.":"تابع رحلتك التعليمية وخدمات المنصة.";
 $("sidebarRole").textContent=isAdminUser()?"OWNER / ADMIN PORTAL":"STUDENT PORTAL";
 const collegeButton=$("openCollegeSettings");if(collegeButton)collegeButton.classList.toggle("hidden",!isAdminUser());
 
 const entityControl=$("entitySelector");if(entityControl)entityControl.classList.toggle("hidden",!isAdminUser());
  const teacherControl=$("teacherSelector");if(teacherControl)teacherControl.classList.toggle("hidden",!isAdminUser());
 const cohortControl=$("cohortSelector");
 if(cohortControl){cohortControl.classList.toggle("hidden",!isAdminUser());cohortControl.value=selectedCohort;}
 $("userChip").textContent=currentUser.studentCode||currentUser.username||currentUser.email||"حساب معتمد";
 renderNav();if(isAdminUser())loadCollegeSettings().then(()=>loadSection("home")).catch(()=>loadSection("home"));else{loadPublicBranding(currentUser.entity_id||"");loadSection("home");}
}
function renderNav(){
 const nav=isAdminUser()?adminNav:studentNav;
 $("sideNav").innerHTML=nav.map(([id,label,icon])=>'<button type="button" data-section="'+id+'" class="'+(activeSection===id?"active":"")+'"><span class="nav-ico">'+icon+'</span>'+label+'</button>').join("");
 $("sideNav").querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>loadSection(button.dataset.section)));
}
async function loadSection(section){
 activeSection=section;renderNav();$("sectionEyebrow").textContent=sectionNames[section]||"ACADEMY";$("workspaceView").innerHTML='<div class="loading-state">جارٍ تحميل البيانات...</div>';
 if(isAdminUser()&&(section==="centers"||section==="add_student")){try{await loadCollegeSettings();if(section==="centers")renderCentersWorkspace();else renderStudentCreateWorkspace();}catch(err){$("workspaceView").innerHTML='<div class="empty-state">'+escapeHtml(err.message)+'</div>';}return;}
 try{
  const data=await api("/api/"+(isAdminUser()?"admin":"student")+"/"+section);
  renderSection(section,data);
 }catch(err){$("workspaceView").innerHTML='<div class="empty-state"><div class="empty-symbol">◈</div><b>تعذر تحميل القسم</b><p class="section-note">'+escapeHtml(err.message)+'</p></div>'}
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toLocalDateTime(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return value||"";const pad=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
function fieldDefs(section){
 const common={status:{label:"الحالة",type:"select",options:["active","inactive","pending","published","draft"]},cohort:{label:"الفرقة",type:"text"},department:{label:"القسم",type:"text"}};
 const defs={
 students:[["full_name","اسم الطالب بالكامل"],["email","البريد الإلكتروني","email"],["phone","رقم الهاتف"],["password","كلمة المرور (8 أحرف على الأقل)","password"],["teacher_id","المدرس","select",teacherOptions()],["cohort","الجهة / المستوى","select",COHORTS],["department","القسم"],["status","حالة الحساب","select",["active","pending","inactive","rejected"]]],
 courses:[["title","اسم المادة"],["description","الوصف","textarea"],["image_url","رابط صورة المادة","url"],["teacher_id","المدرس","select",teacherOptions()],["cohort","الفرقة"],["department","القسم"],["teacher","اسم المدرس"],["sort_order","الترتيب","number"],["status","الحالة","select",["active","inactive"]]],
 materials:[["title","عنوان الكتاب أو الملف"],["description","الوصف","textarea"],["teacher_id","المدرس","select",teacherOptions()],["course_id","معرّف المادة"],["file_url","رابط الملف (اختياري)","url"],["image_url","رابط صورة الغلاف (اختياري)","url"],["cohort","الفرقة"],["department","القسم"],["status","الحالة","select",["active","inactive"]]],
 lectures:[["title","عنوان المحاضرة"],["description","الوصف","textarea"],["teacher_id","المدرس","select",teacherOptions()],["course_id","معرّف المادة"],["file_url","رابط ملف المحاضرة (اختياري)","url"],["image_url","رابط صورة المحاضرة (اختياري)","url"],["cohort","الفرقة"],["department","القسم"],["teacher","المدرس"],["lecture_date","التاريخ","date"],["start_time","من الساعة","time"],["end_time","إلى الساعة","time"],["room","القاعة"],["meeting_url","رابط المحاضرة المباشر","url"],["status","الحالة","select",["active","inactive"]]],
 exams:[["title","اسم الامتحان"],["description","الوصف","textarea"],["teacher_id","المدرس","select",teacherOptions()],["course_id","معرّف المادة"],["file_url","رابط ملف الامتحان (اختياري)","url"],["image_url","رابط صورة الامتحان (اختياري)","url"],["cohort","الفرقة"],["start_at","موعد البداية","datetime-local"],["end_at","موعد النهاية","datetime-local"],["duration_minutes","المدة بالدقائق","number"],["status","الحالة","select",["draft","published","closed"]]],
 results:[["teacher_id","المدرس","select",teacherOptions()],["exam_id","معرّف الامتحان"],["student_id","معرّف الطالب"],["student_code","كود الطالب"],["cohort","الفرقة"],["score","الدرجة","number"],["max_score","النهاية العظمى","number"],["notes","ملاحظات","textarea"],["file_url","رابط ملف النتيجة (اختياري)","url"],["image_url","رابط صورة النتيجة (اختياري)","url"],["published","منشور","select",["true","false"]]],
 attendance_sessions:[["teacher_id","المدرس","select",teacherOptions()],["title","اسم جلسة الحضور"],["lecture_id","معرّف المحاضرة"],["location_url","رابط مشاركة موقع Google Maps","url"],["latitude","خط العرض (اختياري إذا استُخرج من الرابط)","number"],["longitude","خط الطول (اختياري إذا استُخرج من الرابط)","number"],["radius_meters","النطاق المسموح بالمتر","number"],["opens_at","بداية الحضور","datetime-local"],["closes_at","نهاية الحضور","datetime-local"],["access_code","كود الحضور","password"],["status","الحالة","select",["active","closed","draft"]]],
 attendance:[["teacher_id","المدرس","select",teacherOptions()],["student_id","معرّف الطالب"],["student_code","كود الطالب"],["lecture_id","معرّف المحاضرة"],["attendance_date","التاريخ","date"],["check_in","وقت الحضور","time"],["status","الحالة","select",["present","absent","late"]],["notes","ملاحظات","textarea"]],
 announcements:[["teacher_id","المدرس","select",teacherOptions()],["title","عنوان الإعلان"],["body","نص الإعلان","textarea"],["target_cohort","الفرقة المستهدفة","select",["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"]],["status","الحالة","select",["draft","published"]],["publish_at","موعد النشر","datetime-local"],["expire_at","انتهاء الإعلان","datetime-local"]],
 complaints:[["teacher_id","المدرس","select",teacherOptions()],["subject","موضوع الشكوى"],["message","نص الشكوى","textarea"],["reply","رد الإدارة","textarea"],["status","الحالة","select",["new","in_progress","resolved","archived"]]],
 settings:[["key","اسم الإعداد"],["value","القيمة","textarea"]]
 };
 return (defs[section]||[]).map(x=>({name:x[0],label:x[1],type:x[2]||"text",options:(x[0]==="cohort"&&section==="students")||(x[0]==="target_cohort"&&section==="announcements")?COHORTS:(x[3]||[])}));
}
function teacherOptions(){const entity=collegeSettings.entities.find(x=>String(x.id)===String(selectedEntityId));return (entity?.teachers||[]).map(t=>({value:t.id,label:t.name}));}
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
function formFieldValue(field,row){
 let value=row[field.name]??"";
 if(field.type==="datetime-local"&&value){const d=new Date(value);if(!Number.isNaN(d.getTime()))value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 return value;
}

function renderCentersWorkspace(){
 const entities=collegeSettings.entities||[];
 const entity=entities.find(x=>x.id===selectedEntityId)||entities[0];
 if(!entity){$("workspaceView").innerHTML='<div class="empty-state">لا توجد جهات بعد. أضف أول سنتر من النموذج.</div>';return;}
 const teachers=(entity.teachers||[]).map(t=>'<div class="college-list-item"><span>'+escapeHtml(t.name)+'</span><small>مدرس</small></div>').join("")||'<p class="section-note">لا يوجد مدرسون مضافون لهذه الجهة بعد.</p>';
 const levels=(entity.levels||[]).map(l=>'<div class="college-list-item"><span>'+escapeHtml(l.name)+'</span><small>مستوى</small></div>').join("")||'<p class="section-note">لم تتم إضافة مستويات لهذه الجهة بعد.</p>';
 $("workspaceView").innerHTML='<div class="section-toolbar"><h2>إدارة السناتر والمدرسين</h2></div><p class="section-note">أنشئ الجهة أولاً، ثم اخترها وأضف المدرسين والمستويات. كل التغييرات تحفظ في قاعدة البيانات السحابية المشتركة.</p><div class="record-editor"><h3>إضافة سنتر أو جهة</h3><div class="record-fields"><label class="field-label">اسم الجهة<input class="form-input" id="centerNewName" placeholder="اكتب اسم السنتر"></label><label class="field-label">نوع الجهة<select class="form-input" id="centerNewType"><option value="center">سنتر تعليمي</option><option value="college">كلية / جامعة</option><option value="other">جهة أخرى</option></select></label></div><div class="editor-actions"><button class="small-primary" id="centerCreateButton" type="button">إنشاء الجهة</button></div></div><div class="record-editor"><h3>إدارة الجهة المحددة</h3><label class="field-label">اختر السنتر أو الجهة<select class="form-input" id="centerChoose">'+entities.map(x=>'<option value="'+escapeHtml(x.id)+'" '+(x.id===entity.id?'selected':'')+'>'+escapeHtml(x.name)+'</option>').join("")+'</select></label><div class="record-fields"><label class="field-label">إضافة مدرس<input class="form-input" id="centerTeacherName" placeholder="اسم المدرس"></label><label class="field-label">إضافة مستوى<input class="form-input" id="centerLevelName" placeholder="اسم المستوى أو الفرقة"></label></div><div class="editor-actions"><button class="small-primary" id="centerAddTeacher" type="button">إضافة المدرس</button><button class="small-primary" id="centerAddLevel" type="button">إضافة المستوى</button></div><p class="section-note" id="centerMessage"></p></div><div class="record-editor"><h3>'+escapeHtml(entity.name)+'</h3><div class="record-fields"><div><b>المدرسون ('+(entity.teachers||[]).length+')</b>'+teachers+'</div><div><b>المستويات ('+(entity.levels||[]).length+')</b>'+levels+'</div></div></div>';
 $("centerChoose").addEventListener("change",e=>{selectedEntityId=e.target.value;sessionStorage.setItem("ma_admin_entity",selectedEntityId);const next=collegeSettings.entities.find(x=>x.id===selectedEntityId);if(next){collegeSettings.active=next.name;selectedTeacherId="__all__";sessionStorage.setItem("ma_admin_teacher",selectedTeacherId);saveCollegeSettings().then(renderCentersWorkspace);}});
 $("centerCreateButton").addEventListener("click",async()=>{const name=$("centerNewName").value.trim(),type=$("centerNewType").value,msg=$("centerMessage");if(!name){showToast("اكتب اسم الجهة أولاً.");return;}if(collegeSettings.entities.some(x=>x.name.toLowerCase()===name.toLowerCase())){showToast("الجهة موجودة بالفعل.");return;}collegeSettings.entities.push({id:"entity-"+Date.now(),name,type,levels:[],teachers:[]});collegeSettings.active=name;selectedEntityId=collegeSettings.entities[collegeSettings.entities.length-1].id;await saveCollegeSettings();showToast("تم إنشاء الجهة وحفظها سحابياً.");renderCentersWorkspace();});
 $("centerAddTeacher").addEventListener("click",async()=>{const name=$("centerTeacherName").value.trim(),msg=$("centerMessage");if(!name){msg.textContent="اكتب اسم المدرس.";return;}const target=collegeSettings.entities.find(x=>x.id===selectedEntityId);if(!target)return;target.teachers=target.teachers||[];if(target.teachers.some(t=>t.name.toLowerCase()===name.toLowerCase())){msg.textContent="المدرس مضاف بالفعل.";return;}target.teachers.push({id:"teacher-"+Date.now(),name});await saveCollegeSettings();showToast("تمت إضافة المدرس للجهة المحددة.");renderCentersWorkspace();});
 $("centerAddLevel").addEventListener("click",async()=>{const name=$("centerLevelName").value.trim(),msg=$("centerMessage");if(!name){msg.textContent="اكتب اسم المستوى.";return;}const target=collegeSettings.entities.find(x=>x.id===selectedEntityId);if(!target)return;target.levels=target.levels||[];if(target.levels.some(t=>t.name.toLowerCase()===name.toLowerCase())){msg.textContent="المستوى مضاف بالفعل.";return;}target.levels.push({id:"level-"+Date.now(),name});await saveCollegeSettings();showToast("تمت إضافة المستوى للجهة المحددة.");renderCentersWorkspace();});
}
function renderStudentCreateWorkspace(){
 const entity=collegeSettings.entities.find(x=>x.id===selectedEntityId)||collegeSettings.entities[0];
 const teachers=entity?.teachers||[],levels=entity?.levels||[];
 $("workspaceView").innerHTML='<div class="section-toolbar"><h2>إضافة طالب جديد</h2></div><p class="section-note">صفحة مستقلة لإضافة الطالب وربطه بالجهة والمدرس والمستوى. سيتم حفظ بياناته على قاعدة البيانات السحابية وربطه بمحتوى مدرسه.</p><form id="dedicatedStudentForm" class="record-editor"><div class="record-fields"><label class="field-label">اسم الطالب بالكامل<input class="form-input" name="full_name" required maxlength="180"></label><label class="field-label">رقم الهاتف<input class="form-input" name="phone" type="tel" required></label><label class="field-label">البريد الإلكتروني<input class="form-input" name="email" type="email"></label><label class="field-label">الجهة / السنتر<select class="form-input" name="entity_id">'+collegeSettings.entities.map(x=>'<option value="'+escapeHtml(x.id)+'" '+(x.id===entity?.id?'selected':'')+'>'+escapeHtml(x.name)+'</option>').join("")+'</select></label><label class="field-label">المدرس<select class="form-input" name="teacher_id" required><option value="">اختر المدرس</option>'+teachers.map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("")+'</select></label><label class="field-label">المستوى<select class="form-input" name="cohort" required><option value="">اختر المستوى</option>'+levels.map(l=>'<option value="'+escapeHtml(l.name)+'">'+escapeHtml(l.name)+'</option>').join("")+'</select></label><label class="field-label">كلمة المرور<input class="form-input" name="password" type="password" minlength="8" required></label><label class="field-label">حالة الحساب<select class="form-input" name="status"><option value="active">نشط</option><option value="pending">قيد المراجعة</option></select></label></div><div class="editor-actions"><button class="small-primary" type="submit">حفظ الطالب وإنشاء حسابه</button></div><p class="section-note" id="dedicatedStudentMessage"></p></form>';
 const form=$("dedicatedStudentForm");
 form.elements.entity_id.addEventListener("change",()=>{const selected=collegeSettings.entities.find(x=>x.id===form.elements.entity_id.value);form.elements.teacher_id.innerHTML='<option value="">اختر المدرس</option>'+(selected?.teachers||[]).map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("");form.elements.cohort.innerHTML='<option value="">اختر المستوى</option>'+(selected?.levels||[]).map(l=>'<option value="'+escapeHtml(l.name)+'">'+escapeHtml(l.name)+'</option>').join("");});
 form.addEventListener("submit",async e=>{e.preventDefault();const msg=$("dedicatedStudentMessage"),button=form.querySelector('button[type="submit"]');const record={full_name:form.elements.full_name.value.trim(),phone:form.elements.phone.value.trim(),email:form.elements.email.value.trim(),teacher_id:form.elements.teacher_id.value,cohort:form.elements.cohort.value,password:form.elements.password.value,status:form.elements.status.value};const entityId=form.elements.entity_id.value;const entity=collegeSettings.entities.find(x=>x.id===entityId);if(!entity||!entity.teachers?.some(t=>t.id===record.teacher_id)){msg.textContent="المدرس غير تابع للجهة المختارة.";return;}selectedEntityId=entityId;selectedCohort="__all__";selectedTeacherId="__all__";button.disabled=true;msg.textContent="جارٍ حفظ الطالب في قاعدة البيانات السحابية...";try{const saved=await api("/api/admin/students",{method:"POST",body:{action:"create",section:"students",record:{...record,entity_id:entityId}}});msg.textContent="تم إنشاء حساب الطالب بنجاح."+(saved.studentCode?" كود الطالب: "+saved.studentCode:"");showToast("تمت إضافة الطالب.");form.reset();form.elements.entity_id.value=entityId;}catch(err){msg.textContent="تعذر حفظ الطالب: "+err.message;}finally{button.disabled=false;}});
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
 const admin=isAdminUser();
 const defs=fieldDefs(section);
 const canManage=admin&&(section==="settings"||COHORTS.includes(selectedCohort)||(section==="students"&&selectedCohort==="__unassigned__"));
 const canCreate=admin&&(section==="settings"||COHORTS.includes(selectedCohort)||(section==="students"&&selectedCohort==="__all__"&&COHORTS.length>0));
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
 if(admin && section==="attendance_sessions") html+='<p class="section-note">ألصق رابط مشاركة الموقع من Google Maps وحدد النطاق بالمتر. سيحاول النظام استخراج الإحداثيات تلقائياً من الرابط، ويمكنك إدخال خط العرض والطول يدوياً إذا لم يتضمن الرابط دبوساً واضحاً. لا تشارك كود الحضور مع غير طلاب الفرقة.</p>';
 if(admin && (section==="materials"||section==="lectures")) html+='<p class="section-note">لإضافة كتاب أو ملف، اضغط «إضافة جديد» ثم اختر ملف PDF أو مستند من جهازك.</p>';
 if(canCreate && defs.length) html+='<div id="recordEditor" class="record-editor hidden"><h3 id="editorTitle">إضافة سجل</h3><form id="recordForm" class="record-form" data-section="'+section+'"><div class="record-fields">'+defs.map(f=>'<label class="field-label">'+escapeHtml(f.label)+(f.type==="password"?' (اختياري عند التعديل)':'')+(f.type==="textarea"?'<textarea name="'+f.name+'" class="form-input" rows="3"></textarea>':f.type==="select"?'<select name="'+f.name+'" class="form-input">'+(f.name==="cohort"&&section==="students"?'<option value="">اختر الفرقة</option>':'')+f.options.map(o=>{const value=typeof o==="object"?o.value:o,label=typeof o==="object"?o.label:o;return '<option value="'+escapeHtml(value)+'">'+escapeHtml(label)+'</option>'}).join("")+'</select>':'<input class="form-input" name="'+f.name+'" type="'+f.type+'" '+(f.name==="password"?'':'')+' >')+'</label>').join("")+'<div class="field-label">مرفق إضافي (اختياري)<input class="form-input" type="url" name="attachment_url" placeholder="الصق رابط صورة أو PDF أو ملف"><small>أو ارفع صورة / PDF / Word / PowerPoint من جهازك</small><input class="form-input" type="file" name="attachmentFile" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"></div>'+'</div><div class="editor-actions"><button class="small-primary" type="submit">حفظ</button><button class="small-primary" type="button" data-cancel>إلغاء</button></div><p class="section-note" id="editorMessage"></p></form></div>';
 if(!rows.length){html+='<div class="empty-state"><div class="empty-symbol">◇</div><b>لا توجد بيانات حتى الآن</b><p class="section-note">'+(canCreate?'ابدأ بإضافة أول سجل من الزر الموجود بالأعلى.':(admin?'اختر فرقة محددة من القائمة أعلى الصفحة لإدارة بياناتها.':'ستظهر البيانات هنا بعد إضافتها واعتمادها من الإدارة.'))+'</p></div>';$("workspaceView").innerHTML=html;bindStudentComplaintForm();bindStudentAttendanceForm();const emptyEditor=$("recordEditor"),emptyForm=$("recordForm"),emptyCreate=$("workspaceView").querySelector("[data-create]");if(emptyEditor&&emptyForm&&emptyCreate&&canCreate){emptyCreate.addEventListener("click",()=>{emptyForm.reset();emptyForm.dataset.id="";if(section==="students"&&emptyForm.elements.cohort&&selectedCohort!=="__all__")emptyForm.elements.cohort.value=selectedCohort;if(emptyForm.elements.teacher_id&&selectedTeacherId!=="__all__")emptyForm.elements.teacher_id.value=selectedTeacherId;$("editorTitle").textContent="إضافة سجل جديد";emptyEditor.classList.remove("hidden")});emptyForm.addEventListener("submit",saveRecord);emptyForm.addEventListener("click",e=>{if(e.target.closest("[data-cancel]"))emptyEditor.classList.add("hidden")})}return}
 const cols=Object.keys(rows[0]).filter(k=>!["password","token","password_hash","password_salt","code_hash","code_salt"].includes(k.toLowerCase()));
 html+='<div class="data-table-wrap"><table class="data-table"><thead><tr>'+cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join("")+(canManage?'<th>الإجراءات</th>':'')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+cols.map(c=>'<td>'+(c==="attachment_url"&&row[c]?(String(row.attachment_type||"").startsWith("image/")?'<a href="'+escapeHtml(row[c])+'" target="_blank" rel="noopener"><img src="'+escapeHtml(row[c])+'" alt="مرفق" loading="lazy" style="max-width:110px;max-height:76px;object-fit:cover;border-radius:8px"></a>':'<a href="'+escapeHtml(row[c])+'" target="_blank" rel="noopener">فتح المرفق</a>'):(c==="image_url"&&row[c]?'<a href="'+escapeHtml(row[c])+'" target="_blank" rel="noopener"><img src="'+escapeHtml(row[c])+'" alt="صورة مرفقة" loading="lazy" style="max-width:110px;max-height:76px;object-fit:cover;border-radius:8px"></a>':(c==="file_url"&&row[c]?'<a href="'+escapeHtml(row[c])+'" target="_blank" rel="noopener">فتح الملف</a>':escapeHtml(row[c]))))+'</td>').join("")+(canManage?'<td class="row-actions">'+(section==="students"&&row.status==="pending"&&selectedCohort!=="__unassigned__"?'<button type="button" data-approve="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">قبول</button><button type="button" data-reject="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">رفض</button>':'')+'<button type="button" data-edit="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">تعديل</button><button type="button" data-delete="'+escapeHtml(row[section==="attendance_sessions"?"session_id":"id"])+'">حذف</button></td>':'')+'</tr>').join("")+'</tbody></table></div>';
 $("workspaceView").innerHTML=html;
 bindStudentComplaintForm();
 bindStudentAttendanceForm();
 const editor=$("recordEditor"),form=$("recordForm"),createButton=$("workspaceView").querySelector("[data-create]");
 if(editor&&form){
  if(createButton&&canCreate) createButton.addEventListener("click",()=>{form.reset();form.dataset.id="";if(section==="students"&&form.elements.cohort&&selectedCohort!=="__all__")form.elements.cohort.value=selectedCohort;if(form.elements.teacher_id&&selectedTeacherId!=="__all__")form.elements.teacher_id.value=selectedTeacherId;$("editorTitle").textContent="إضافة سجل جديد";editor.classList.remove("hidden");});
  form.addEventListener("submit",saveRecord);
  if(section==="attendance_sessions"&&form.elements.location_url){form.elements.location_url.addEventListener("input",()=>{form.elements.latitude.value="";form.elements.longitude.value="";});}
  form.addEventListener("click",e=>{if(e.target.closest("[data-cancel]"))editor.classList.add("hidden")});
  $("workspaceView").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{const row=rows.find(x=>String(x[section==="attendance_sessions"?"session_id":"id"])===b.dataset.edit);if(!row)return;form.reset();form.dataset.id=row[section==="attendance_sessions"?"session_id":"id"];defs.forEach(f=>{const el=form.elements[f.name];if(el&&f.name!=="password")el.value=f.type==="datetime-local"?toLocalDateTime(row[f.name]):(row[f.name]??"")});if(form.elements.attachment_url)form.elements.attachment_url.value=row.attachment_url||"";$("editorTitle").textContent="تعديل البيانات";editor.classList.remove("hidden")}));
  $("workspaceView").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("هل تريد حذف هذا السجل نهائياً؟"))return;await mutateRecord(section,"delete",b.dataset.delete,{});loadSection(section)}));
  $("workspaceView").querySelectorAll("[data-approve],[data-reject]").forEach(b=>b.addEventListener("click",async()=>{const action=b.dataset.approve?"approve":"reject";await api("/api/admin/"+section,{method:"POST",body:{action,section,id:b.dataset.approve||b.dataset.reject,cohort:selectedCohort}});showToast(action==="approve"?"تم اعتماد الطالب":"تم رفض الطلب");loadSection(section)}));
 }
}
async function mutateRecord(section,action,id,record){
 const payload={...(record||{})};
 // Settings are keyed by their setting name; the backend reads record.key on create.
 if(section==="settings"&&action==="create"&&id)payload.key=id;
 const data={action,section,record:payload};if(id)data.id=id;
 return api("/api/admin/"+section,{method:"POST",body:data});
}
async function saveRecord(e){
 e.preventDefault();const form=e.currentTarget,section=form.dataset.section,id=form.dataset.id||"",record={};
 fieldDefs(section).forEach(f=>{const el=form.elements[f.name];if(el&&el.value!==""&&!(f.name==="password"&&!el.value))record[f.name]=el.value});
 if(section==="attendance_sessions"){if(record.opens_at)record.opens_at=new Date(record.opens_at).toISOString();if(record.closes_at)record.closes_at=new Date(record.closes_at).toISOString();}
 if(["students","courses","materials","lectures","exams","results","attendance","attendance_sessions","complaints"].includes(section)&&selectedCohort!=="__unassigned__"&&selectedCohort!=="__all__")record.cohort=selectedCohort;
 if(section==="announcements"&&selectedCohort!=="__all__"&&selectedCohort!=="__unassigned__")record.target_cohort=selectedCohort;
  if(selectedTeacherId!=="__all__"&&!record.teacher_id)record.teacher_id=selectedTeacherId;
 const msg=$("editorMessage");msg.textContent="جارٍ الحفظ...";
 try{
  const attachmentFile=form.elements.attachmentFile&&form.elements.attachmentFile.files[0];
  const attachmentLink=form.elements.attachment_url&&form.elements.attachment_url.value.trim();
  if(attachmentFile&&attachmentLink)throw new Error("اختر رفع ملف أو وضع رابط، وليس الاثنين معاً.");
  if(attachmentFile){
   if(attachmentFile.size>6*1024*1024)throw new Error("الحد الأقصى للمرفق 6 ميجابايت لتفادي انقطاع الاتصال.");
   const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("تعذرت قراءة الملف من الجهاز."));reader.readAsDataURL(attachmentFile)});
   msg.textContent="جارٍ رفع المرفق إلى Google Drive... يرجى الانتظار وعدم إغلاق الصفحة.";
   const uploaded=await api("/api/admin/materials",{method:"POST",body:{action:"upload",name:attachmentFile.name,mimeType:attachmentFile.type||"application/octet-stream",base64}});
   record.attachment_url=uploaded.url;record.attachment_type=attachmentFile.type||"application/octet-stream";record.attachment_name=attachmentFile.name;
  }else if(attachmentLink){
   if(!/^https?:\/\//i.test(attachmentLink))throw new Error("أدخل رابطاً يبدأ بـ https:// أو http://");
   record.attachment_url=attachmentLink;record.attachment_type="link";record.attachment_name="رابط مرفق";
  }
  const saved=await mutateRecord(section,id?"update":"create",id,record);
  if(!id&&section==="students"&&saved.studentCode) alert("تم إنشاء حساب الطالب بنجاح.\nكود الدخول: "+saved.studentCode+"\nاحتفظ بالكود وأرسله للطالب."); else showToast(id?"تم تحديث السجل بنجاح":"تمت إضافة السجل بنجاح");loadSection(section);
 }catch(err){msg.textContent=err.message}
}
const entitySelector=$("entitySelector");
if(entitySelector){entitySelector.addEventListener("change",()=>{selectedEntityId=entitySelector.value;sessionStorage.setItem("ma_admin_entity",selectedEntityId);const entity=collegeSettings.entities.find(x=>x.id===selectedEntityId);if(entity){collegeSettings.active=entity.name;const activeSelect=$("activeCollegeSelect");if(activeSelect)activeSelect.value=entity.name;const collegeInput=$("collegeNameInput");if(collegeInput)collegeInput.value=entity.name;renderCollegeSettings();}COHORTS=(entity?.levels||[]).map(x=>x.name);const cohortSelector=$("cohortSelector");if(cohortSelector){cohortSelector.innerHTML='<option value="__all__">كل الفرق والمستويات</option><option value="__unassigned__">طلبات بدون فرقة</option>'+COHORTS.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join("");if(!COHORTS.includes(selectedCohort))selectedCohort="__all__";cohortSelector.value=selectedCohort;}selectedTeacherId="__all__";sessionStorage.setItem("ma_admin_teacher",selectedTeacherId);const tc=$("teacherSelector");if(tc){tc.innerHTML='<option value="__all__">كل المدرسين</option>'+(entity?.teachers||[]).map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join("");tc.value="__all__";}loadSection(activeSection);});}
const teacherSelector=$("teacherSelector");if(teacherSelector)teacherSelector.addEventListener("change",()=>{selectedTeacherId=teacherSelector.value||"__all__";sessionStorage.setItem("ma_admin_teacher",selectedTeacherId);loadSection(activeSection);});
const cohortSelector=$("cohortSelector");
if(cohortSelector){cohortSelector.addEventListener("change",()=>{selectedCohort=cohortSelector.value;sessionStorage.setItem("ma_admin_cohort",selectedCohort);loadSection(activeSection);});}
$("logoutButton").addEventListener("click",()=>{token=null;currentUser=null;collegeSettings.activeEntitySettings={};$("openCollegeSettings").classList.add("hidden");sessionStorage.removeItem("ma_session");$("appPage").classList.add("hidden");$("authPage").classList.remove("hidden");$("loginForm").reset();message("loginMessage","");selectRole("student");loadPublicBranding();window.scrollTo({top:0,behavior:"smooth"})});
loadPublicBranding();
const saved=sessionStorage.getItem("ma_session");
if(saved){try{const session=JSON.parse(saved);if(session.token&&session.user){token=session.token;currentUser=session.user;openWorkspace()}}catch{sessionStorage.removeItem("ma_session")}}
})();