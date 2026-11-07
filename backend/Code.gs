/** Media Academy Cloud — Google Apps Script backend.
 * Configure Script Properties before setup:
 * SPREADSHEET_ID = ID of the private Google Sheet
 * BOOTSTRAP_EMAIL = first owner email
 * BOOTSTRAP_PASSWORD = temporary owner password (12+ characters)
 * Run setupInitialOwner() once from the Apps Script editor.
 * The owner creates all student accounts later from the admin panel.
 */
const TABLES = {
  Institutions: ['institution_id','name','slug','status','logo_url','primary_color','created_at'],
  Users: ['user_id','institution_id','student_code','username','full_name','email','phone','password_hash','password_salt','role','cohort_id','department','status','avatar_url','created_at','updated_at'],
  Cohorts: ['cohort_id','institution_id','name','level','academic_year','status'],
  Departments: ['department_id','institution_id','name','status'],
  Subjects: ['subject_id','institution_id','cohort_id','name','code','instructor','status'],
  Enrollments: ['enrollment_id','institution_id','student_id','subject_id','academic_year','status'],
  Content: ['content_id','institution_id','cohort_id','subject_id','title','content_type','file_url','description','created_by','created_at','status'],
  Lectures: ['lecture_id','institution_id','cohort_id','subject_id','title','starts_at','ends_at','location_name','status','created_by'],
  AttendanceSessions: ['session_id','institution_id','lecture_id','location_url','secret_code_hash','latitude','longitude','radius_meters','opens_at','closes_at','status','created_by'],
  Attendance: ['attendance_id','institution_id','session_id','student_id','student_code','checked_at','latitude','longitude','distance_meters','status'],
  Exams: ['exam_id','institution_id','cohort_id','subject_id','title','exam_date','total_marks','status'],
  Grades: ['grade_id','institution_id','student_id','subject_id','exam_id','score','total_marks','published_at'],
  Announcements: ['announcement_id','institution_id','cohort_id','title','body','created_by','created_at','status'],
  ForumRooms: ['room_id','institution_id','cohort_id','name','room_type','status','created_at'],
  ForumPosts: ['post_id','institution_id','room_id','author_id','body','attachment_url','created_at','status'],
  ForumReplies: ['reply_id','institution_id','post_id','author_id','body','created_at','status'],
  ForumReactions: ['reaction_id','post_id','user_id','reaction','created_at'],
  Discipline: ['event_id','institution_id','student_id','student_code','event_type','title','description','decision','recorded_by','recorded_at','appeal_status','visibility','status'],
  Messages: ['message_id','institution_id','sender_id','recipient_id','cohort_id','body','created_at','read_at','status'],
  SupportTickets: ['ticket_id','institution_id','student_id','category','subject','body','status','assigned_to','created_at','updated_at'],
  Roles: ['role_id','institution_id','name','permissions_json','status'],
  AuditLog: ['log_id','institution_id','actor_id','action','entity','entity_id','details_json','created_at'],
  Settings: ['key','value','updated_by','updated_at']
};
const PUBLIC_ACTIONS = ['health','login','bootstrapStatus','bootstrapOwner'];
const ADMIN_ROLES = ['owner','super_admin','admin','staff'];
const ADMIN_ONLY_ACTIONS = ['dashboard','listStudents','listDiscipline','listForumPosts','listLectures','listAttendanceSessions','listExams','saveExam','saveStudent','changeStudentCohort','saveCohort','saveSubject','saveLecture','saveForumRoom','saveContent','saveAnnouncement','recordDiscipline','createAttendanceSession','closeAttendanceSession','saveGrade','updateTicket','auditLog','saveSetting','saveInstitution','listInstitutions','listManagers','saveManager'];

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  const result = route_(parseRequest_(e));
  const json = JSON.stringify(result);
  if (callback && /^[a-zA-Z_$][0-9a-zA-Z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  let request = {};
  try {
    request = e && e.parameter && e.parameter.payload ? JSON.parse(e.parameter.payload) :
      JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) { return json_({ok:false,error:'INVALID_JSON'}); }
  return json_(route_(request));
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function parseRequest_(e) {
  try {
    if (e.parameter && e.parameter.q) return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(e.parameter.q)).getDataAsString());
    return {action:(e.parameter && e.parameter.action) || 'health'};
  } catch (err) { return {action:'invalid'}; }
}
function route_(req) {
  try {
    const action = String(req.action || 'health');
    if (action === 'health') return {ok:true,service:'Media Academy Cloud API',time:new Date().toISOString()};
    if (action === 'bootstrapStatus') return {ok:true,initialized:rows_('Users').some(u=>u.role==='owner'||u.role==='super_admin')};
    if (action === 'bootstrapOwner') return bootstrapOwner_(req);
    if (action === 'login') return login_(req);
    const user = authorize_(req.token, action);
    if (ADMIN_ONLY_ACTIONS.indexOf(action) >= 0) requireAdmin_(user);
    if (action === 'logout') { CacheService.getScriptCache().remove('sess_' + req.token); return {ok:true}; }
    return dispatch_(action, req, user);
  } catch (err) {
    auditError_(req, err);
    return {ok:false,error:err.code || 'SERVER_ERROR',message:String(err.message || err)};
  }
}
function dispatch_(action, req, user) {
  switch (action) {
    case 'me': return {ok:true,user:safeUser_(user)};
    case 'dashboard': return dashboard_(user);
    case 'listStudents': { const result=listRows_('Users', user, r => r.role === 'student' && (!req.cohort_id || r.cohort_id === req.cohort_id)); result.data=result.data.map(safeUser_); return result; }
    case 'listDiscipline': requireAdmin_(user); return listRows_('Discipline',user);
    case 'listForumPosts': requireAdmin_(user); return listRows_('ForumPosts',user);
    case 'listMessages': return listRows_('Messages',user,r=>r.sender_id===user.user_id||r.recipient_id===user.user_id||isAdmin_(user));
    case 'saveStudent': return saveStudent_(req, user);
    case 'changeStudentCohort': return changeStudentCohort_(req, user);
    case 'listCohorts': return listRows_('Cohorts', user, r => isAdmin_(user) || r.cohort_id === user.cohort_id);
    case 'saveCohort': return saveCohort_(req,user);
    case 'listSubjects': return listRows_('Subjects', user, r => isAdmin_(user) || !r.cohort_id || r.cohort_id === user.cohort_id);
    case 'saveSubject': return saveSubject_(req,user);
    case 'listLectures': return listRows_('Lectures',user,r=>isAdmin_(user)||!r.cohort_id||r.cohort_id===user.cohort_id);
    case 'saveLecture': return saveLecture_(req,user);
    case 'saveForumRoom': return saveForumRoom_(req,user);
    case 'listAttendanceSessions': return listRows_('AttendanceSessions',user);
    case 'listContent': return listRows_('Content', user, r => !r.cohort_id || r.cohort_id === user.cohort_id || isAdmin_(user));
    case 'saveContent': return saveContent_(req,user);
    case 'listAnnouncements': return listRows_('Announcements', user, r => !r.cohort_id || r.cohort_id === user.cohort_id || isAdmin_(user));
    case 'saveAnnouncement': return saveAnnouncement_(req,user);
    case 'studentProfile': return studentProfile_(req.student_id || user.user_id, user);
    case 'disciplineHistory': return disciplineHistory_(req.student_id || user.user_id, user);
    case 'recordDiscipline': return saveDiscipline_(req,user);
    case 'forumRooms': return forumRooms_(user);
    case 'forumFeed': return forumFeed_(req, user);
    case 'createForumPost': return createForumPost_(req, user);
    case 'replyForumPost': return replyForumPost_(req, user);
    case 'listAttendance': return listRows_('Attendance', user, r => isAdmin_(user) || r.student_id === user.user_id);
    case 'openAttendanceSessions': return openAttendanceSessions_(user);
    case 'createAttendanceSession': requireAdmin_(user); return createAttendanceSession_(req,user);
    case 'closeAttendanceSession': return closeAttendanceSession_(req,user);
    case 'checkIn': return checkIn_(req, user);
    case 'listGrades': { const result=listRows_('Grades',user,r=>isAdmin_(user)||r.student_id===user.user_id); result.data=result.data.map(g=>{const subject=findById_('Subjects','subject_id',g.subject_id);const exam=findById_('Exams','exam_id',g.exam_id);return Object.assign({},g,{subject_name:subject?subject.name:'',exam_title:exam?exam.title:''})});return result; }
    case 'listExams': requireAdmin_(user); return listRows_('Exams',user);
    case 'saveExam': return saveExam_(req,user);
    case 'saveGrade': requireAdmin_(user); return saveGrade_(req,user);
    case 'listTickets': return listRows_('SupportTickets', user, r => isAdmin_(user) || r.student_id === user.user_id);
    case 'createTicket': return createTicket_(req, user);
    case 'updateTicket': return updateTicket_(req,user);
    case 'listInstitutions': requireRole_(user, ['owner','super_admin']); return listRows_('Institutions', user);
    case 'listManagers': requireRole_(user, ['owner','super_admin']); return {ok:true,data:rows_('Users').filter(r=>r.role!=='student'&&r.role!=='owner').map(safeUser_)};
    case 'saveManager': return saveManager_(req,user);
    case 'saveInstitution': requireRole_(user, ['owner','super_admin']); return saveRow_('Institutions', Object.assign({},req.data||{},{institution_id:(req.data&&req.data.institution_id)||Utilities.getUuid()}), user, 'institution_id');
    case 'auditLog': requireAdmin_(user); return listRows_('AuditLog', user);
    case 'saveSetting': requireRole_(user, ['owner','super_admin']); return saveSetting_(req, user);
    default: throw new Error('UNKNOWN_ACTION');
  }
}
function db_() {
  const id = '11_AlAxy147RlG96pBh1l9C3rD5lG0SHkrSEODfvQ9qs';
  return SpreadsheetApp.openById(id);
}
function prop_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }
function initializeCurrentSpreadsheet() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Open this Apps Script project from the new Google Spreadsheet first.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',ss.getId());
  return setupDatabase()+' — '+ss.getUrl();
}
function setupDatabase() {
  const ss = db_();
  Object.keys(TABLES).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,TABLES[name].length).setValues([TABLES[name]]);
    sh.setFrozenRows(1);
  });
  return 'Database tabs initialized: ' + Object.keys(TABLES).length;
}
function setupInitialOwner() {
  setupDatabase();
  throw new Error('OWNER_SETUP_MOVED_TO_ADMIN_PORTAL');
}
function bootstrapOwner_(req) {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(15000)) throw new Error('SETUP_BUSY');
  try {
    setupDatabase();
    if(rows_('Users').some(u=>u.role==='owner'||u.role==='super_admin')) throw new Error('OWNER_ALREADY_EXISTS');
    const d=req.data||{};
    const name=String(d.full_name||'').trim();
    const email=String(d.email||'').trim().toLowerCase();
    const password=String(d.password||'');
    if(name.length<2) throw new Error('OWNER_NAME_REQUIRED');
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error('INVALID_OWNER_EMAIL');
    if(password.length<12) throw new Error('OWNER_PASSWORD_TOO_SHORT');
    if(findUserByEmail_(email)) throw new Error('EMAIL_EXISTS');
    const now=new Date().toISOString(), salt=Utilities.getUuid(), id=Utilities.getUuid();
    db_().getSheetByName('Institutions').appendRow(['default','Main Academy','main','active','','#35d6c1',now]);
    db_().getSheetByName('Users').appendRow([id,'default','',email,name,email,'',hash_(password,salt),salt,'owner','','','active','',now,now]);
    const cohortSheet=db_().getSheetByName('Cohorts'), roomSheet=db_().getSheetByName('ForumRooms');
    [['cohort-1','الفرقة الأولى','1'],['cohort-2','الفرقة الثانية','2'],['cohort-3','الفرقة الثالثة','3'],['cohort-4','الفرقة الرابعة','4']].forEach(x=>{
      cohortSheet.appendRow([x[0],'default',x[1],x[2],'','active']);
      roomSheet.appendRow([Utilities.getUuid(),'default',x[0],'منتدى '+x[1],'cohort','active',now]);
    });
    roomSheet.appendRow([Utilities.getUuid(),'default','','المنتدى العام','general','active',now]);
    const token=Utilities.getUuid()+Utilities.getUuid();
    CacheService.getScriptCache().put('sess_'+token,id,21600);
    return {ok:true,token:token,user:safeUser_(findById_('Users','user_id',id)),expires_in:21600};
  } finally { lock.releaseLock(); }
}

function login_(req) {
  const identifier = String(req.identifier || req.email || '').trim().toLowerCase();
  const password = String(req.password || '');
  const cache=CacheService.getScriptCache();
  const attemptKey='login_fail_'+hash_(identifier,'attempts').slice(0,32);
  const attempts=Number(cache.get(attemptKey)||0);
  if(attempts>=5) throw new Error('TOO_MANY_ATTEMPTS');
  const user = findUserByLogin_(identifier);
  if (!user || user.status !== 'active' || hash_(password,user.password_salt) !== user.password_hash) {
    cache.put(attemptKey,String(attempts+1),900);
    throw new Error('INVALID_CREDENTIALS');
  }
  cache.remove(attemptKey);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('sess_' + token, user.user_id, 21600);
  audit_(user,'LOGIN','Users',user.user_id,{});
  return {ok:true,token,user:safeUser_(user),expires_in:21600};
}
function authorize_(token, action) {
  if (PUBLIC_ACTIONS.indexOf(action) >= 0) return null;
  if (!token) throw new Error('AUTH_REQUIRED');
  const id = CacheService.getScriptCache().get('sess_' + token);
  if (!id) throw new Error('SESSION_EXPIRED');
  const user = findById_('Users','user_id',id);
  if (!user || user.status !== 'active') throw new Error('ACCOUNT_DISABLED');
  return user;
}
function findUserByEmail_(email) { if (!email) return null; return rows_('Users').find(r => String(r.email).toLowerCase() === String(email).toLowerCase()) || null; }
function findUserByLogin_(identifier) { if (!identifier) return null; const key=String(identifier).trim().toLowerCase(); return rows_('Users').find(r => String(r.email||'').toLowerCase()===key || String(r.student_code||'').toLowerCase()===key || String(r.username||'').toLowerCase()===key) || null; }
function findById_(table,key,value) { return rows_(table).find(r => String(r[key]) === String(value)) || null; }
function rows_(table) {
  const sh = db_().getSheetByName(table);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== '')).map(row => headers.reduce((o,k,i) => {o[k] = row[i] instanceof Date ? row[i].toISOString() : row[i]; return o;},{}));
}
function listRows_(table,user,filter) {
  let data = rows_(table);
  if (user && !isOwner_(user)) data = data.filter(r => r.institution_id === user.institution_id);
  if (filter) data = data.filter(filter);
  return {ok:true,data:data};
}
function saveRow_(table,data,user,idKey) {
  if (!TABLES[table] || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_DATA');
  const record = Object.assign({},data);
  const id = record[idKey] || Utilities.getUuid();
  record[idKey] = id;
  const sh = db_().getSheetByName(table);
  if (!sh) throw new Error('TABLE_NOT_FOUND');
  const headers = TABLES[table];
  const all = sh.getDataRange().getValues();
  let rowIndex = -1;
  for (let i=1;i<all.length;i++) if (String(all[i][headers.indexOf(idKey)]) === String(id)) { rowIndex=i+1; break; }
  const isCreate = rowIndex < 0;
  if (!isCreate && user && table !== 'Institutions') {
    const institutionCol = headers.indexOf('institution_id');
    if (institutionCol >= 0 && String(all[rowIndex-1][institutionCol]) !== String(user.institution_id)) throw new Error('FORBIDDEN');
  }
  if (isCreate) rowIndex=sh.getLastRow()+1;
  if (headers.indexOf('institution_id') >= 0 && table !== 'Institutions' && user) record.institution_id = user.institution_id;
  const row = headers.map(h => record[h] === undefined ? (isCreate ? '' : all[rowIndex-1][headers.indexOf(h)]) : record[h]);
  sh.getRange(rowIndex,1,1,headers.length).setValues([row]);
  audit_(user,isCreate?'CREATE':'UPDATE',table,id,{});
  return {ok:true,id:id};
}
function updateRow_(table,data,user,idKey) { return saveRow_(table,data,user,idKey); }
function activeCohort_(cohortId,user) {
  if(!cohortId)return null;
  const cohort=findById_('Cohorts','cohort_id',cohortId);
  if(!cohort||cohort.institution_id!==user.institution_id||cohort.status!=='active')throw new Error('INVALID_COHORT');
  return cohort;
}
function saveSubject_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.name||!d.code)throw new Error('SUBJECT_NAME_AND_CODE_REQUIRED');
  if(d.cohort_id)activeCohort_(d.cohort_id,user);
  return saveRow_('Subjects',d,user,'subject_id');
}
function saveLecture_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.title||!d.cohort_id)throw new Error('LECTURE_TITLE_AND_COHORT_REQUIRED');
  activeCohort_(d.cohort_id,user);
  if(d.subject_id) {
    const subject=findById_('Subjects','subject_id',d.subject_id);
    if(!subject||subject.institution_id!==user.institution_id)throw new Error('SUBJECT_NOT_FOUND');
    if(subject.cohort_id&&subject.cohort_id!==d.cohort_id)throw new Error('SUBJECT_COHORT_MISMATCH');
  }
  return saveRow_('Lectures',d,user,'lecture_id');
}
function saveContent_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.title||!d.file_url)throw new Error('CONTENT_TITLE_AND_URL_REQUIRED');
  if(d.cohort_id)activeCohort_(d.cohort_id,user);
  if(d.subject_id) {
    const subject=findById_('Subjects','subject_id',d.subject_id);
    if(!subject||subject.institution_id!==user.institution_id)throw new Error('SUBJECT_NOT_FOUND');
  }
  return saveRow_('Content',d,user,'content_id');
}
function saveAnnouncement_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.title||!d.body)throw new Error('ANNOUNCEMENT_TITLE_AND_BODY_REQUIRED');
  if(d.cohort_id)activeCohort_(d.cohort_id,user);
  return saveRow_('Announcements',d,user,'announcement_id');
}
function saveForumRoom_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.name)throw new Error('FORUM_NAME_REQUIRED');
  if(d.cohort_id)activeCohort_(d.cohort_id,user);
  d.status=d.status||'active';
  return saveRow_('ForumRooms',d,user,'room_id');
}
function saveExam_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.title||!d.cohort_id||!d.total_marks)throw new Error('EXAM_FIELDS_REQUIRED');
  activeCohort_(d.cohort_id,user);
  if(d.subject_id) {
    const subject=findById_('Subjects','subject_id',d.subject_id);
    if(!subject||subject.institution_id!==user.institution_id)throw new Error('SUBJECT_NOT_FOUND');
    if(subject.cohort_id&&subject.cohort_id!==d.cohort_id)throw new Error('SUBJECT_COHORT_MISMATCH');
  }
  const total=Number(d.total_marks);
  if(!isFinite(total)||total<=0)throw new Error('INVALID_TOTAL_MARKS');
  return saveRow_('Exams',d,user,'exam_id');
}
function saveManager_(req,user) {
  requireRole_(user,['owner','super_admin']);
  const d=Object.assign({},req.data||{});
  const existing=d.user_id?findById_('Users','user_id',d.user_id):null;
  if(existing && (existing.institution_id!==user.institution_id || !['admin','staff','super_admin'].includes(existing.role)))throw new Error('MANAGER_NOT_FOUND');
  if(!d.full_name||!d.email||(!existing&&!d.institution_id)) throw new Error('MANAGER_FIELDS_REQUIRED');
  if(!['admin','staff','super_admin'].includes(d.role)) throw new Error('INVALID_MANAGER_ROLE');
  if(d.role==='super_admin'&&user.role!=='owner') throw new Error('FORBIDDEN');
  const institutionId=existing?existing.institution_id:d.institution_id;
  const institution=findById_('Institutions','institution_id',institutionId);
  if(!institution) throw new Error('INSTITUTION_NOT_FOUND');
  const email=String(d.email).trim().toLowerCase();
  if(rows_('Users').some(x=>x.user_id!==(existing&&existing.user_id) && String(x.email||'').toLowerCase()===email)) throw new Error('EMAIL_EXISTS');
  let salt=existing?existing.password_salt:'', passwordHash=existing?existing.password_hash:'';
  if(d.initial_password) {
    if(String(d.initial_password).length<12) throw new Error('MANAGER_PASSWORD_TOO_SHORT');
    salt=Utilities.getUuid();passwordHash=hash_(String(d.initial_password),salt);
  } else if(!existing) throw new Error('MANAGER_PASSWORD_TOO_SHORT');
  const record={user_id:existing?existing.user_id:Utilities.getUuid(),institution_id:institutionId,username:String(d.username||email).trim(),full_name:String(d.full_name).trim(),email,phone:d.phone||'',password_hash:passwordHash,password_salt:salt,role:d.role,status:d.status||'active',created_at:existing?existing.created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  delete d.initial_password;
  return saveRow_('Users',record,user,'user_id');
}
function saveStudent_(req,user) {
  requireAdmin_(user);
  const d = Object.assign({},req.data || {});
  d.full_name = String(d.full_name || '').trim();
  d.student_code = String(d.student_code || '').trim();
  if (!d.full_name || !d.student_code || !d.cohort_id) throw new Error('NAME_CODE_AND_COHORT_REQUIRED');
  const cohort=findById_('Cohorts','cohort_id',d.cohort_id);
  if(!cohort || cohort.institution_id!==user.institution_id || cohort.status!=='active') throw new Error('INVALID_STUDENT_COHORT');
  const duplicate=rows_('Users').find(x=>x.institution_id===user.institution_id && x.user_id!==d.user_id && (String(x.student_code||'').toLowerCase()===d.student_code.toLowerCase() || (d.email && String(x.email||'').toLowerCase()===String(d.email).trim().toLowerCase())));
  if (duplicate) throw new Error('STUDENT_CODE_OR_EMAIL_EXISTS');
  if (!d.user_id) {
    if (String(d.initial_password || '').length < 8) throw new Error('STUDENT_PASSWORD_TOO_SHORT');
    const salt = Utilities.getUuid();
    d.user_id = Utilities.getUuid(); d.password_salt = salt;
    d.password_hash = hash_(String(d.initial_password),salt);
    d.username = d.student_code;
    d.role = 'student'; d.status = 'active'; d.created_at = new Date().toISOString();
  } else {
    const existing = findById_('Users','user_id',d.user_id);
    if (!existing || existing.institution_id !== user.institution_id || existing.role !== 'student') throw new Error('STUDENT_NOT_FOUND');
    d.institution_id = existing.institution_id; d.role = 'student'; d.username = d.student_code;
    d.password_hash = existing.password_hash; d.password_salt = existing.password_salt; d.created_at = existing.created_at;
    if (d.initial_password) {
      if (String(d.initial_password).length < 8) throw new Error('STUDENT_PASSWORD_TOO_SHORT');
      const salt = Utilities.getUuid(); d.password_salt = salt; d.password_hash = hash_(String(d.initial_password),salt);
    }
  }
  d.institution_id = user.institution_id;
  delete d.initial_password; d.updated_at = new Date().toISOString();
  return saveRow_('Users',d,user,'user_id');
}
function changeStudentCohort_(req,user) {
  requireAdmin_(user);
  const student = findById_('Users','user_id',req.student_id);
  if (!student || student.institution_id !== user.institution_id || student.role !== 'student') throw new Error('STUDENT_NOT_FOUND');
  activeCohort_(req.cohort_id,user);
  student.cohort_id = req.cohort_id; student.updated_at = new Date().toISOString();
  return saveRow_('Users',student,user,'user_id');
}
function saveDiscipline_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  const student=findById_('Users','user_id',d.student_id);
  if(!student||student.institution_id!==user.institution_id||student.role!=='student')throw new Error('STUDENT_NOT_FOUND');
  if(!d.title||!d.event_type)throw new Error('DISCIPLINE_FIELDS_REQUIRED');
  d.student_code=student.student_code;
  d.recorded_by=user.user_id;
  d.recorded_at=new Date().toISOString();
  d.visibility=d.visibility||'admin';
  d.status=d.status||'active';
  return saveRow_('Discipline',d,user,'event_id');
}
function studentProfile_(id,user) {
  if (!isAdmin_(user) && user.user_id !== id) throw new Error('FORBIDDEN');
  const student = findById_('Users','user_id',id);
  if (!student || student.institution_id !== user.institution_id) throw new Error('STUDENT_NOT_FOUND');
  return {ok:true,profile:safeUser_(student),discipline:rows_('Discipline').filter(r=>r.student_id===id && r.institution_id===user.institution_id && (isAdmin_(user)||r.visibility!=='admin')),grades:rows_('Grades').filter(r=>r.student_id===id && r.institution_id===user.institution_id),attendance:rows_('Attendance').filter(r=>r.student_id===id && r.institution_id===user.institution_id)};
}
function disciplineHistory_(id,user) {
  if (!isAdmin_(user) && user.user_id !== id) throw new Error('FORBIDDEN');
  return {ok:true,data:rows_('Discipline').filter(r=>r.student_id===id && r.institution_id===user.institution_id && (isAdmin_(user)||r.visibility!=='admin'))};
}
function saveCohort_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  if(!d.name)throw new Error('COHORT_NAME_REQUIRED');
  const result=saveRow_('Cohorts',d,user,'cohort_id');
  const cohortId=result.id;
  const exists=rows_('ForumRooms').some(r=>r.institution_id===user.institution_id && r.cohort_id===cohortId);
  if (!exists) saveRow_('ForumRooms',{room_id:Utilities.getUuid(),cohort_id:cohortId,name:d.name||'منتدى الفرقة',room_type:'cohort',status:'active',created_at:new Date().toISOString()},user,'room_id');
  return result;
}
function canAccessRoom_(room,user) { return !!room && room.institution_id===user.institution_id && (isAdmin_(user) || !room.cohort_id || room.cohort_id===user.cohort_id); }
function forumRooms_(user) { return {ok:true,data:rows_('ForumRooms').filter(r=>r.status==='active' && canAccessRoom_(r,user))}; }
function forumFeed_(req,user) {
  const room = findById_('ForumRooms','room_id',req.room_id);
  if (!canAccessRoom_(room,user)) throw new Error('ROOM_NOT_FOUND');
  const posts = rows_('ForumPosts').filter(p=>p.room_id===req.room_id && p.status==='active' && p.institution_id===user.institution_id);
  return {ok:true,data:posts.map(p=>{const author=findById_('Users','user_id',p.author_id);const replies=rows_('ForumReplies').filter(r=>r.post_id===p.post_id && r.status==='active').map(r=>{const replyAuthor=findById_('Users','user_id',r.author_id);return Object.assign({},r,{author_name:replyAuthor?replyAuthor.full_name:'طالب'});});return Object.assign({},p,{author_name:author?author.full_name:'طالب',replies:replies});})};
}
function createForumPost_(req,user) {
  const room = findById_('ForumRooms','room_id',req.room_id);
  if (!canAccessRoom_(room,user) || room.status!=='active') throw new Error('ROOM_NOT_AVAILABLE');
  if (!String(req.body||'').trim()) throw new Error('EMPTY_POST');
  return saveRow_('ForumPosts',{post_id:Utilities.getUuid(),room_id:req.room_id,author_id:user.user_id,body:String(req.body).slice(0,5000),attachment_url:'',created_at:new Date().toISOString(),status:'active'},user,'post_id');
}
function replyForumPost_(req,user) {
  const post = findById_('ForumPosts','post_id',req.post_id);
  if (!post || post.institution_id!==user.institution_id || !canAccessRoom_(findById_('ForumRooms','room_id',post.room_id),user) || !String(req.body||'').trim()) throw new Error('POST_NOT_FOUND');
  return saveRow_('ForumReplies',{reply_id:Utilities.getUuid(),post_id:req.post_id,author_id:user.user_id,body:String(req.body).slice(0,3000),created_at:new Date().toISOString(),status:'active'},user,'reply_id');
}
function extractMapCoordinates_(url) {
  const patterns=[
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:%2C|,|%252C)(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /(-?\d{1,2}\.\d{4,})[, ]+(-?\d{1,3}\.\d{4,})/
  ];
  for (const pattern of patterns) {
    const match=String(url||'').match(pattern);
    if(match)return {latitude:Number(match[1]),longitude:Number(match[2])};
  }
  return null;
}
function coordinatesFromMapsUrl_(url) {
  let current=String(url||'').trim();
  if(!/^https?:\/\//i.test(current))throw new Error('INVALID_MAPS_LINK');
  for(let i=0;i<5;i++) {
    const host=(current.match(/^https?:\/\/([^/]+)/i)||[])[1]||'';
    if(!/(^|\.)google\.[a-z.]+$/i.test(host) && !/(^|\.)goo\.gl$/i.test(host) && host.toLowerCase()!=='maps.app.goo.gl')throw new Error('INVALID_MAPS_LINK');
    const found=extractMapCoordinates_(current);
    if(found)return found;
    try {
      const response=UrlFetchApp.fetch(current,{followRedirects:false,muteHttpExceptions:true});
      const headers=response.getAllHeaders();
      const next=headers.Location||headers.location;
      if(!next)break;
      current=String(next);
    } catch(e) { break; }
  }
  throw new Error('INVALID_MAPS_LINK');
}
function createAttendanceSession_(req,user) {
  const d=Object.assign({},req.data||{});
  if (!d.lecture_id || !d.code || !d.radius_meters) throw new Error('SESSION_FIELDS_REQUIRED');
  const lecture=findById_('Lectures','lecture_id',d.lecture_id);
  if (!lecture || lecture.institution_id!==user.institution_id) throw new Error('LECTURE_NOT_FOUND');
  let lat=Number(d.latitude),lon=Number(d.longitude);
  if(d.location_url) {
    const coords=coordinatesFromMapsUrl_(d.location_url);
    lat=coords.latitude;lon=coords.longitude;
  }
  const radius=Number(d.radius_meters);
  if (!isFinite(lat)||lat < -90||lat > 90||!isFinite(lon)||lon < -180||lon > 180||!isFinite(radius)||radius < 10||radius > 5000) throw new Error('INVALID_GEOFENCE');
  if (String(d.code).length < 4 || String(d.code).length > 32) throw new Error('INVALID_ATTENDANCE_CODE_LENGTH');
  d.latitude=lat;d.longitude=lon;d.radius_meters=radius;d.created_by=user.user_id;
  d.session_id=Utilities.getUuid();
  d.secret_code_hash=hash_(String(d.code),d.session_id);
  delete d.code;
  d.status='open';
  return saveRow_('AttendanceSessions',d,user,'session_id');
}
function closeAttendanceSession_(req,user) {
  requireAdmin_(user);
  const session=findById_('AttendanceSessions','session_id',req.session_id);
  if(!session||session.institution_id!==user.institution_id)throw new Error('SESSION_NOT_FOUND');
  if(session.status!=='open')throw new Error('SESSION_ALREADY_CLOSED');
  return updateRow_('AttendanceSessions',{session_id:session.session_id,status:'closed'},user,'session_id');
}
function studentCanAttendLecture_(lecture,user) {
  return !!lecture && lecture.institution_id===user.institution_id && (isAdmin_(user) || !lecture.cohort_id || lecture.cohort_id===user.cohort_id);
}
function openAttendanceSessions_(user) {
  const now=Date.now();
  const data=rows_('AttendanceSessions').filter(s=>{
    const lecture=findById_('Lectures','lecture_id',s.lecture_id);
    return s.institution_id===user.institution_id && s.status==='open' && studentCanAttendLecture_(lecture,user) &&
      (!s.opens_at || now>=new Date(s.opens_at).getTime()) && (!s.closes_at || now<=new Date(s.closes_at).getTime());
  }).map(s=>{const l=findById_('Lectures','lecture_id',s.lecture_id);return {session_id:s.session_id,lecture_title:l?l.title:'محاضرة',opens_at:s.opens_at,closes_at:s.closes_at};});
  return {ok:true,data:data};
}
function checkIn_(req,user) {
  if (user.role !== 'student') throw new Error('STUDENT_ACCOUNT_REQUIRED');
  const session = findById_('AttendanceSessions','session_id',req.session_id);
  if (!session || session.institution_id!==user.institution_id || session.status!=='open') throw new Error('SESSION_CLOSED');
  const lecture=findById_('Lectures','lecture_id',session.lecture_id);
  if(!studentCanAttendLecture_(lecture,user)) throw new Error('LECTURE_NOT_AVAILABLE_FOR_STUDENT');
  const now = Date.now();
  if (session.opens_at && now < new Date(session.opens_at).getTime()) throw new Error('SESSION_NOT_OPEN');
  if (session.closes_at && now > new Date(session.closes_at).getTime()) throw new Error('SESSION_CLOSED');
  if (hash_(String(req.code||''),session.session_id)!==session.secret_code_hash) throw new Error('INVALID_ATTENDANCE_CODE');
  const lat=Number(req.latitude), lon=Number(req.longitude);
  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('INVALID_LOCATION');
  const distance=distanceMeters_(lat,lon,Number(session.latitude),Number(session.longitude));
  if (!isFinite(distance) || distance>Number(session.radius_meters)) throw new Error('OUTSIDE_ALLOWED_AREA');
  if (rows_('Attendance').some(a=>a.session_id===session.session_id && a.student_id===user.user_id)) throw new Error('ALREADY_CHECKED_IN');
  return saveRow_('Attendance',{attendance_id:Utilities.getUuid(),session_id:session.session_id,student_id:user.user_id,student_code:user.student_code,checked_at:new Date().toISOString(),latitude:lat,longitude:lon,distance_meters:Math.round(distance),status:'present'},user,'attendance_id');
}
function distanceMeters_(lat1,lon1,lat2,lon2) {
  const rad=x=>x*Math.PI/180, dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function saveGrade_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  const student=findById_('Users','user_id',d.student_id);
  if(!student || student.institution_id!==user.institution_id || student.role!=='student') throw new Error('STUDENT_NOT_FOUND');
  let subject=null,exam=null;
  if(d.subject_id) {
    subject=findById_('Subjects','subject_id',d.subject_id);
    if(!subject || subject.institution_id!==user.institution_id) throw new Error('SUBJECT_NOT_FOUND');
    if(subject.cohort_id && subject.cohort_id!==student.cohort_id) throw new Error('SUBJECT_COHORT_MISMATCH');
  }
  if(d.exam_id) {
    exam=findById_('Exams','exam_id',d.exam_id);
    if(!exam || exam.institution_id!==user.institution_id) throw new Error('EXAM_NOT_FOUND');
    if(exam.cohort_id && exam.cohort_id!==student.cohort_id) throw new Error('EXAM_COHORT_MISMATCH');
    if(exam.subject_id && d.subject_id && exam.subject_id!==d.subject_id) throw new Error('EXAM_SUBJECT_MISMATCH');
    if(exam.subject_id && !d.subject_id) d.subject_id=exam.subject_id;
    d.total_marks=exam.total_marks;
  }
  const score=Number(d.score),total=Number(d.total_marks);
  if(!isFinite(score)||!isFinite(total)||total<=0||score<0||score>total) throw new Error('INVALID_GRADE');
  d.published_at=d.published_at||new Date().toISOString();
  return saveRow_('Grades',d,user,'grade_id');
}
function updateTicket_(req,user) {
  requireAdmin_(user);
  const d=Object.assign({},req.data||{});
  const ticket=findById_('SupportTickets','ticket_id',d.ticket_id);
  if(!ticket || ticket.institution_id!==user.institution_id) throw new Error('TICKET_NOT_FOUND');
  const allowed=['new','in_progress','resolved','closed'];
  if(allowed.indexOf(String(d.status||''))<0) throw new Error('INVALID_TICKET_STATUS');
  return updateRow_('SupportTickets',{ticket_id:ticket.ticket_id,status:d.status,assigned_to:String(d.assigned_to||'')},user,'ticket_id');
}
function createTicket_(req,user) {
  if (!req.subject || !req.body) throw new Error('SUBJECT_AND_BODY_REQUIRED');
  return saveRow_('SupportTickets',{ticket_id:Utilities.getUuid(),student_id:user.user_id,category:req.category||'inquiry',subject:req.subject,body:req.body,status:'new',created_at:new Date().toISOString(),updated_at:new Date().toISOString()},user,'ticket_id');
}
function saveSetting_(req,user) {
  const sh=db_().getSheetByName('Settings'), rows=rows_('Settings');
  const found=rows.find(r=>r.key===req.key);
  const row=[req.key,String(req.value),user.user_id,new Date().toISOString()];
  if(found) { const i=rows.findIndex(r=>r.key===req.key)+2; sh.getRange(i,1,1,4).setValues([row]); }
  else sh.appendRow(row);
  audit_(user,'SETTING_UPDATE','Settings',req.key,{});
  return {ok:true};
}
function dashboard_(user) {
  const scoped=table=>rows_(table).filter(r=>r.institution_id===user.institution_id);
  return {ok:true,summary:{students:scoped('Users').filter(u=>u.role==='student'&&u.status==='active').length,cohorts:scoped('Cohorts').length,content:scoped('Content').length,openTickets:scoped('SupportTickets').filter(t=>t.status==='new'||t.status==='open').length,forumPosts:scoped('ForumPosts').length}};
}
function safeUser_(u) { const x=Object.assign({},u); delete x.password_hash; delete x.password_salt; if(x.cohort_id){const cohort=findById_('Cohorts','cohort_id',x.cohort_id);x.cohort_name=cohort?cohort.name:'';} return x; }
function isOwner_(u) { return u && ['owner','super_admin'].includes(u.role); }
function isAdmin_(u) { return u && ADMIN_ROLES.includes(u.role); }
function requireAdmin_(u) { if (!isAdmin_(u)) throw new Error('ADMIN_REQUIRED'); }
function requireRole_(u,roles) { if (!u || roles.indexOf(u.role)<0) throw new Error('FORBIDDEN'); }
function hash_(password,salt) { const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+'|'+password,Utilities.Charset.UTF_8); return bytes.map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join(''); }
function audit_(user,action,entity,id,details) {
  try { db_().getSheetByName('AuditLog').appendRow([Utilities.getUuid(),user.institution_id,user.user_id,action,entity,id,JSON.stringify(details||{}),new Date().toISOString()]); } catch(e) {}
}
function auditError_(req,err) { console.error((req&&req.action)||'unknown',err); }
