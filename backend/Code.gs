/**
 * Media Academy Cloud - Google Apps Script API
 * Install: set SPREADSHEET_ID, ADMIN_USERNAME, ADMIN_PASSWORD in Script Properties.
 * Deploy as Web App (execute as you; access: Anyone). Tables are created safely on first request.
 */
const COHORTS = ["الفرقة الأولى","الفرقة الثانية","الفرقة الثالثة","الفرقة الرابعة"];
const TABLES = {
  Students: ["id","student_code","username","full_name","email","phone","password_hash","password_salt","role","cohort","department","status","created_at","updated_at"],
  Admins: ["id","username","full_name","email","password_hash","password_salt","role","status","created_at"],
  Courses: ["id","title","description","cohort","department","teacher","status","sort_order","created_at","updated_at"],
  Materials: ["id","title","description","course_id","cohort","department","file_id","file_url","mime_type","status","created_at","updated_at"],
  Lectures: ["id","title","description","course_id","cohort","department","teacher","lecture_date","start_time","end_time","room","meeting_url","file_id","file_url","mime_type","status","created_at","updated_at"],
  Exams: ["id","title","description","course_id","cohort","start_at","end_at","duration_minutes","status","created_at","updated_at"],
  Results: ["id","exam_id","student_id","student_code","cohort","score","max_score","notes","published","created_at","updated_at"],
  Attendance: ["id","student_id","student_code","cohort","lecture_id","attendance_date","check_in","status","latitude","longitude","notes","created_at"],
  Announcements: ["id","title","body","target_cohort","status","publish_at","expire_at","created_at","updated_at"],
  Complaints: ["id","student_id","student_code","cohort","subject","message","reply","status","created_at","updated_at"],
  Settings: ["key","value","updated_at"],
  AuditLog: ["id","actor","action","section","record_id","details","created_at"]
};
const PUBLIC_SECTIONS = ["courses","materials","lectures","schedule","exams","announcements"];
const SECTION_SHEET = {students:"Students",courses:"Courses",materials:"Materials",lectures:"Lectures",schedule:"Lectures",exams:"Exams",results:"Results",attendance:"Attendance",announcements:"Announcements",complaints:"Complaints",settings:"Settings"};

function doGet(e) {
  try {
    ensureDatabaseSafe_();
    const p = (e && e.parameter) || {};
    const path = String(p.path || "");
    if (!path) return out({success:true,message:"Media Academy Cloud API is active."});
    const m = path.match(/^\/api\/(admin|student)\/([a-zA-Z_]+)$/);
    if (!m) return out({success:false,message:"مسار غير معروف."});
    const role = m[1], section = m[2];
    const user = authenticate_(p.token);
    if (!user) return out({success:false,message:"انتهت الجلسة أو بيانات الدخول غير صالحة."});
    if (role === "admin" && !isOwner_(user)) return out({success:false,message:"الدخول متاح لحساب الإدارة العامة فقط."});
    if (role === "student" && user.role !== "student" && user.role !== "admin" && user.role !== "owner") return out({success:false,message:"غير مصرح."});
    if (section === "home") return out(homeData_(user, String(p.cohort || "")));
    if (section === "profile") return out({success:true,profile:safeUser_(user)});
    if (role === "student" && !PUBLIC_SECTIONS.includes(section) && section !== "attendance" && section !== "complaints" && section !== "results") return out({success:false,message:"غير مصرح."});
    let rows = readRows_(SECTION_SHEET[section]);
    const requestedCohort = String(p.cohort || "").trim();
    if (isOwner_(user) && requestedCohort && requestedCohort !== "__all__") {
      if (requestedCohort === "__unassigned__" && section === "students") rows = rows.filter(r => !String(r.cohort || "").trim());
      else {
        if (!COHORTS.includes(requestedCohort)) return out({success:false,message:"الفرقة المحددة غير معروفة."});
        const field = cohortField_(section);
        if (field) rows = rows.filter(r => String(r[field] || "") === requestedCohort);
      }
    }
    if (user.role === "student") rows = rows.filter(r => {
      if (section === "results") return String(r.student_id) === String(user.id) && (r.published === true || String(r.published).toLowerCase() === "true" || String(r.published) === "1");
      if (section === "attendance" || section === "complaints") return String(r.student_id) === String(user.id);
      const cohortKey = cohortField_(section) || "cohort";
      const rowCohort = r[cohortKey];
      const inCohort = !user.cohort ? !rowCohort : (!rowCohort || String(rowCohort) === String(user.cohort));
      const visibleStatus = ["active","published"].includes(String(r.status || "active"));
      return inCohort && (!r.department || !user.department || String(r.department) === String(user.department)) && visibleStatus;
    });
    if (section === "settings" && !isOwner_(user)) rows = rows.filter(r => !/^admin_/i.test(String(r.key)));
    return out({success:true,items:rows});
  } catch(err) { return out({success:false,message:String(err)}); }
}

function doPost(e) {
  try {
    ensureDatabaseSafe_();
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const path = String(data.path || "");
    if (path === "/auth/login" || data.action === "login") return login_(data);
    if (path === "/auth/register" || data.action === "register") return register_(data);
    const user = authenticate_(data.token);
    if (!user) return out({success:false,message:"يلزم تسجيل الدخول مرة أخرى."});
    if (!isOwner_(user)) return out({success:false,message:"هذه العملية متاحة لحساب الإدارة العامة فقط."});
    const action = String(data.action || "");
    const section = String(data.section || path.split("/").pop() || "");
    const selectedCohort = String(data.cohort || "").trim();
    if (section !== "settings" && action !== "upload" && selectedCohort && selectedCohort !== "__all__" && !(selectedCohort === "__unassigned__" && section === "students") && !COHORTS.includes(selectedCohort)) return out({success:false,message:"الفرقة المحددة غير معروفة."});
    if (section !== "settings" && ["create","update","delete","approve","reject"].includes(action) && (!selectedCohort || selectedCohort === "__all__")) return out({success:false,message:"اختر فرقة محددة قبل تنفيذ الإضافة أو التعديل أو الحذف."});
    if (action === "upload") return upload_(data,user);
    if (!SECTION_SHEET[section] || ["settings"].includes(section) && !isOwner_(user)) return out({success:false,message:"قسم غير صالح أو لا تملك صلاحية إدارته."});
    let result;
    if (action === "create") result = createRecord_(section,data.record || {},user,selectedCohort);
    else if (action === "update") result = updateRecord_(section,data.id,data.record || {},user,selectedCohort);
    else if (action === "delete") result = deleteRecord_(section,data.id,user,selectedCohort);
    else if (action === "approve" || action === "reject") result = setStudentStatus_(data.id,action === "approve" ? "active" : "rejected",user,selectedCohort);
    else return out({success:false,message:"نوع العملية غير مدعوم."});
    return out({success:true,...result});
  } catch(err) { return out({success:false,message:String(err)}); }
}

function initializeDatabase() {
  const ss = db_();
  Object.keys(TABLES).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(TABLES[name]);
    else if (sh.getLastColumn() === 0) sh.appendRow(TABLES[name]);
  });
  const props = PropertiesService.getScriptProperties();
  const username = props.getProperty("ADMIN_USERNAME");
  const password = props.getProperty("ADMIN_PASSWORD");
  if (!username || !password) throw new Error("أضف ADMIN_USERNAME وADMIN_PASSWORD في Script Properties أولاً.");
  const sh = ss.getSheetByName("Admins");
  const exists = readRows_("Admins").some(r => String(r.username) === username);
  if (!exists) {
    const salt = Utilities.getUuid();
    appendObject_("Admins",{id:Utilities.getUuid(),username,full_name:"مدير النظام",email:"",password_hash:hash_(password,salt),password_salt:salt,role:"owner",status:"active",created_at:new Date().toISOString()});
  }
  return "Database initialized";
}

function login_(d) {
  const identity = String(d.identity || "").trim().toLowerCase(), password = String(d.password || "");
  if (!identity || !password) return out({success:false,message:"أدخل بيانات الدخول."});
  const admin = readRows_("Admins").find(r => String(r.username || "").toLowerCase() === identity || String(r.email || "").toLowerCase() === identity);
  let u = admin;
  if (!u) u = readRows_("Students").find(r => [r.student_code,r.username,r.email].some(v => String(v || "").toLowerCase() === identity));
  if (!u || String(u.status || "active") !== "active" || hash_(password,String(u.password_salt || "")) !== String(u.password_hash || "")) return out({success:false,message:"بيانات الدخول غير صحيحة أو الحساب غير مفعل."});
  const expected = d.role === "admin" ? ["admin","owner"] : ["student"];
  if (!expected.includes(String(u.role || (admin ? "admin" : "student")))) return out({success:false,message:"نوع الحساب لا يطابق بوابة الدخول."});
  u.role = String(u.role || (admin ? "admin" : "student"));
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put("session_" + token, JSON.stringify(safeUser_(u)), 21600);
  return out({success:true,token,user:safeUser_(u)});
}

function register_(d) {
  const code = String(d.studentCode || "").trim();
  const name = String(d.name || "").trim();
  const password = String(d.password || "");
  if (!code || !name || password.length < 8) return out({success:false,message:"أكمل الاسم وكود الطالب، وكلمة المرور 8 أحرف على الأقل."});
  if (readRows_("Students").some(r => String(r.student_code) === code)) return out({success:false,message:"كود الطالب مسجل بالفعل."});
  const salt = Utilities.getUuid();
  appendObject_("Students",{id:Utilities.getUuid(),student_code:code,username:String(d.email || code),full_name:name,email:String(d.email || ""),phone:String(d.phone || ""),password_hash:hash_(password,salt),password_salt:salt,role:"student",cohort:"",department:"",status:"pending",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  return out({success:true,message:"تم إرسال طلب التسجيل إلى الإدارة للمراجعة."});
}

function createRecord_(section,record,user,selectedCohort) {
  const sheetName = SECTION_SHEET[section];
  if (section === "settings") {
    const key=String(record.key||"").trim(); if(!key) throw new Error("اسم الإعداد مطلوب.");
    const sh=db_().getSheetByName("Settings"), rows=readRows_("Settings");
    if(rows.some(r=>String(r.key)===key)) throw new Error("اسم الإعداد موجود بالفعل.");
    appendObject_("Settings",{key,value:String(record.value||""),updated_at:new Date().toISOString()});
    audit_(user,"create",section,key,record); return {message:"تمت إضافة الإعداد.",id:key};
  }
  const id = Utilities.getUuid();
  const obj = {...record,id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const cohortKey = cohortField_(section);
  if (cohortKey && selectedCohort === "__unassigned__") throw new Error("لا يمكن إنشاء سجل جديد داخل قائمة الطلاب غير المسندين.");
  if (cohortKey && selectedCohort) obj[cohortKey] = selectedCohort;
  if (section === "students") {
    if (!obj.student_code || !obj.full_name) throw new Error("كود الطالب والاسم مطلوبان.");
    if (obj.password) { const salt=Utilities.getUuid();obj.password_salt=salt;obj.password_hash=hash_(obj.password,salt);delete obj.password; }
    obj.role="student";obj.status=obj.status || "pending";
  }
  appendObject_(sheetName,obj);
  audit_(user,"create",section,id,obj);
  return {message:"تمت الإضافة بنجاح.",id};
}
function updateRecord_(section,id,record,user,selectedCohort) {
  if (!id) throw new Error("معرف السجل مطلوب.");
  if (section === "settings") {
    const sh=db_().getSheetByName("Settings"),v=sh.getDataRange().getValues(),h=v[0].map(String),kc=h.indexOf("key"),vc=h.indexOf("value"),uc=h.indexOf("updated_at");
    const row=v.findIndex((r,i)=>i>0&&String(r[kc])===String(id)); if(row<1) throw new Error("الإعداد غير موجود.");
    if(vc>=0)sh.getRange(row+1,vc+1).setValue(record.value===undefined?"":record.value); if(uc>=0)sh.getRange(row+1,uc+1).setValue(new Date().toISOString());
    audit_(user,"update",section,id,record); return {message:"تم تحديث الإعداد."};
  }
  const sh=db_().getSheetByName(SECTION_SHEET[section]), values=sh.getDataRange().getValues(), headers=values[0].map(String);
  const idx=headers.indexOf("id"), row=values.findIndex((r,i)=>i>0 && String(r[idx])===String(id));
  if(row<1) throw new Error("السجل غير موجود.");
  assertRecordCohort_(section, values, headers, row, selectedCohort);
  const obj={...record,updated_at:new Date().toISOString()};
  const cohortKey=cohortField_(section);
  if(cohortKey && selectedCohort && selectedCohort!=="__unassigned__") obj[cohortKey]=selectedCohort;
  if(section==="students" && selectedCohort==="__unassigned__" && !COHORTS.includes(String(record.cohort||""))) throw new Error("اختر الفرقة الدراسية للطالب قبل حفظه.");
  if(obj.password){const salt=Utilities.getUuid();obj.password_salt=salt;obj.password_hash=hash_(obj.password,salt);delete obj.password;}
  headers.forEach((h,c)=>{if(Object.prototype.hasOwnProperty.call(obj,h)) sh.getRange(row+1,c+1).setValue(obj[h]);});
  audit_(user,"update",section,id,obj);
  return {message:"تم تحديث البيانات."};
}
function deleteRecord_(section,id,user,selectedCohort) {
  if (!id) throw new Error("معرف السجل مطلوب.");
  if (section === "settings") {
    const sh=db_().getSheetByName("Settings"),v=sh.getDataRange().getValues(),h=v[0].map(String),kc=h.indexOf("key");
    const row=v.findIndex((r,i)=>i>0&&String(r[kc])===String(id)); if(row<1) throw new Error("الإعداد غير موجود.");
    sh.deleteRow(row+1); audit_(user,"delete",section,id,{}); return {message:"تم حذف الإعداد."};
  }
  const sh=db_().getSheetByName(SECTION_SHEET[section]),v=sh.getDataRange().getValues(),headers=v[0].map(String),idx=headers.indexOf("id");
  const row=v.findIndex((r,i)=>i>0 && String(r[idx])===String(id));
  if(row<1) throw new Error("السجل غير موجود.");
  assertRecordCohort_(section,v,headers,row,selectedCohort);
  sh.deleteRow(row+1);audit_(user,"delete",section,id,{});
  return {message:"تم الحذف."};
}
function setStudentStatus_(id,status,user,selectedCohort) {
  const sh=db_().getSheetByName("Students"),v=sh.getDataRange().getValues(),h=v[0].map(String),idc=h.indexOf("id"),sc=h.indexOf("status"),uc=h.indexOf("updated_at");
  const row=v.findIndex((r,i)=>i>0 && String(r[idc])===String(id));
  if(row<1) throw new Error("الطالب غير موجود.");
  assertRecordCohort_("students",v,h,row,selectedCohort);
  const cohortCol=h.indexOf("cohort");
  if(status==="active" && cohortCol>=0 && !String(v[row][cohortCol]||"").trim()) throw new Error("حدد الفرقة الدراسية للطالب قبل اعتماد الحساب.");
  sh.getRange(row+1,sc+1).setValue(status);if(uc>=0)sh.getRange(row+1,uc+1).setValue(new Date().toISOString());
  audit_(user,status,"students",id,{});return {message:status==="active"?"تم اعتماد الطالب.":"تم رفض الطلب."};
}
function upload_(d,user) {
  const name=String(d.name || "file"), mime=String(d.mimeType || "application/pdf"), b64=String(d.base64 || "");
  if(!b64 || b64.length>12000000) throw new Error("الملف غير موجود أو أكبر من الحد المسموح (9MB تقريباً).");
  const bytes=Utilities.base64Decode(b64), blob=Utilities.newBlob(bytes,mime,name);
  const folderId=PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");
  const folder=folderId?DriveApp.getFolderById(folderId):DriveApp.getRootFolder();
  const file=folder.createFile(blob);
  audit_(user,"upload","materials",file.getId(),{name});
  return {message:"تم رفع الملف إلى Google Drive.",fileId:file.getId(),url:file.getUrl()};
}
function homeData_(u, selectedCohort) {
  let students=readRows_("Students"),courses=readRows_("Courses"),materials=readRows_("Materials"),lectures=readRows_("Lectures"),exams=readRows_("Exams"),announcements=readRows_("Announcements");
  if(u.role==="student") return {success:true,stats:{"المواد":courses.filter(x=>!x.cohort||x.cohort===u.cohort).length,"الملفات":materials.filter(x=>!x.cohort||x.cohort===u.cohort).length,"المحاضرات":lectures.filter(x=>!x.cohort||x.cohort===u.cohort).length},message:"مرحباً بك في سحابة كلية الإعلام – جامعة الأزهر"};
  if(selectedCohort && selectedCohort!=="__all__" && selectedCohort!=="__unassigned__") {
    students=students.filter(x=>String(x.cohort||"")===selectedCohort); courses=courses.filter(x=>String(x.cohort||"")===selectedCohort); materials=materials.filter(x=>String(x.cohort||"")===selectedCohort); lectures=lectures.filter(x=>String(x.cohort||"")===selectedCohort); exams=exams.filter(x=>String(x.cohort||"")===selectedCohort); announcements=announcements.filter(x=>String(x.target_cohort||"")===selectedCohort);
  } else if(selectedCohort==="__unassigned__") students=students.filter(x=>!String(x.cohort||"").trim());
  return {success:true,stats:{"الطلاب النشطون":students.filter(x=>x.status==="active").length,"طلبات التسجيل":students.filter(x=>x.status==="pending").length,"المواد":courses.length,"الكتب والملفات":materials.length,"المحاضرات":lectures.length,"الامتحانات":exams.length,"الإعلانات":announcements.length},message:"مرحباً بك في لوحة إدارة الأكاديمية."};
}
function authenticate_(token) {
  if(!token) return null;
  const s=CacheService.getScriptCache().get("session_"+token);
  if(!s) return null;
  return JSON.parse(s);
}
function safeUser_(u) {
  const owner = u.role === "owner" || u.is_owner === true;
  return {id:u.id, user_id:u.id, username:u.username || u.student_code || "",studentCode:u.student_code || "",name:u.full_name || "",fullName:u.full_name || "",email:u.email || "",phone:u.phone || "",role:owner?"admin":(u.role || "student"),is_owner:owner,cohort:u.cohort || "",department:u.department || ""};
}
function isOwner_(u){ return !!u && (u.role === "owner" || u.is_owner === true); }

// Safe lazy setup: creates only missing tabs or headers in completely empty tabs.
// It never clears, renames, or overwrites existing data.
function ensureDatabaseSafe_(){
  const ss=db_();
  Object.keys(TABLES).forEach(name=>{
    let sh=ss.getSheetByName(name);
    if(!sh) sh=ss.insertSheet(name);
    if(sh.getLastRow()===0) sh.getRange(1,1,1,TABLES[name].length).setValues([TABLES[name]]);
    else ensureHeadersSafe_(sh,TABLES[name]);
  });
  const props=PropertiesService.getScriptProperties();
  const username=props.getProperty("ADMIN_USERNAME"), password=props.getProperty("ADMIN_PASSWORD");
  if(username && password){
    const exists=readRows_("Admins").some(r=>String(r.username||"").toLowerCase()===username.toLowerCase());
    if(!exists){
      const salt=Utilities.getUuid();
      appendObject_("Admins",{id:Utilities.getUuid(),username,full_name:"مدير النظام",email:"",password_hash:hash_(password,salt),password_salt:salt,role:"owner",status:"active",created_at:new Date().toISOString()});
    }
  }
}

function cohortField_(section) {
  if (section === "announcements") return "target_cohort";
  if (["students","courses","materials","lectures","schedule","exams","results","attendance","complaints"].includes(section)) return "cohort";
  return "";
}
function ensureHeadersSafe_(sheet, required) {
  const last = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1,1,1,last).getValues()[0].map(String);
  const missing = required.filter(h => !current.includes(h));
  if (missing.length) sheet.getRange(1,last+1,1,missing.length).setValues([missing]);
}
function assertRecordCohort_(section, values, headers, rowIndex, selectedCohort) {
  const field = cohortField_(section);
  if (!field) return;
  if (!selectedCohort || selectedCohort === "__all__") throw new Error("اختر فرقة محددة أولاً.");
  const col = headers.indexOf(field);
  const actual = col >= 0 ? String(values[rowIndex][col] || "") : "";
  if (selectedCohort === "__unassigned__") { if (actual) throw new Error("هذا الطالب لم يعد ضمن قائمة غير المسندين."); return; }
  if (actual !== selectedCohort) throw new Error("لا يمكن الوصول إلى سجل خارج الفرقة المحددة.");
}

function readRows_(name) {
  const sh=db_().getSheetByName(name);if(!sh || sh.getLastRow()<2)return [];
  const v=sh.getDataRange().getValues(),h=v[0].map(String);
  return v.slice(1).filter(r=>r.some(x=>x!=="")).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i] instanceof Date?r[i].toISOString():r[i]);return o;});
}
function appendObject_(name,obj) {
  const sh=db_().getSheetByName(name);if(!sh)throw new Error("الورقة غير موجودة: "+name);
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(h.map(k=>obj[k]===undefined?"":obj[k]));
}
function audit_(u,action,section,id,details) {
  try{appendObject_("AuditLog",{id:Utilities.getUuid(),actor:u.username || u.id,action,section,record_id:id,details:JSON.stringify(details).slice(0,4000),created_at:new Date().toISOString()});}catch(e){}
}
function hash_(password,salt) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+"|"+String(password),Utilities.Charset.UTF_8);
  return bytes.map(b=>("0"+((b+256)%256).toString(16)).slice(-2)).join("");
}
function db_() {
  const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if(id)return SpreadsheetApp.openById(id);
  const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error("اضبط SPREADSHEET_ID في Script Properties.");
  return ss;
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
