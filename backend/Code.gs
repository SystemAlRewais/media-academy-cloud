/** Media Academy Cloud — Google Apps Script backend.
 * Set Script Properties before deployment:
 * SPREADSHEET_ID = ID of the private Google Sheet
 * BOOTSTRAP_EMAIL = first owner email
 * BOOTSTRAP_PASSWORD = temporary strong password (remove after setup)
 * Then run setupInitialOwner() once from the Apps Script editor.
 */
const TABLES = {
  Institutions: ['institution_id','name','slug','status','logo_url','primary_color','created_at'],
  Users: ['user_id','institution_id','student_code','full_name','email','phone','password_hash','password_salt','role','cohort_id','department','status','avatar_url','created_at','updated_at'],
  Cohorts: ['cohort_id','institution_id','name','level','academic_year','status'],
  Departments: ['department_id','institution_id','name','status'],
  Subjects: ['subject_id','institution_id','cohort_id','name','code','instructor','status'],
  Enrollments: ['enrollment_id','institution_id','student_id','subject_id','academic_year','status'],
  Content: ['content_id','institution_id','cohort_id','subject_id','title','content_type','file_url','description','created_by','created_at','status'],
  Lectures: ['lecture_id','institution_id','cohort_id','subject_id','title','starts_at','ends_at','location_name','status','created_by'],
  AttendanceSessions: ['session_id','institution_id','lecture_id','secret_code_hash','latitude','longitude','radius_meters','opens_at','closes_at','status','created_by'],
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
const PUBLIC_ACTIONS = ['health','login','bootstrapStatus'];
const ADMIN_ROLES = ['owner','super_admin','admin','staff'];
const ADMIN_ONLY_ACTIONS = ['dashboard','listStudents','listDiscipline','listForumPosts','saveStudent','changeStudentCohort','saveContent','saveAnnouncement','recordDiscipline','createAttendanceSession','saveGrade','updateTicket','auditLog'];

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
    if (e.parameter && e.parameter.q) return JSON.parse(decodeURIComponent(Utilities.newBlob(Utilities.base64DecodeWebSafe(e.parameter.q)).getDataAsString()));
    return {action:(e.parameter && e.parameter.action) || 'health'};
  } catch (err) { return {action:'invalid'}; }
}
function route_(req) {
  try {
    const action = String(req.action || 'health');
    if (action === 'health') return {ok:true,service:'Media Academy Cloud API',time:new Date().toISOString()};
    if (action === 'bootstrapStatus') return {ok:true,initialized:!!findUserByEmail_(prop_('BOOTSTRAP_EMAIL'))};
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
    case 'listCohorts': return listRows_('Cohorts', user);
    case 'listSubjects': return listRows_('Subjects', user);
    case 'listContent': return listRows_('Content', user, r => !r.cohort_id || r.cohort_id === user.cohort_id || isAdmin_(user));
    case 'saveContent': return saveRow_('Content', req.data, user, 'content_id');
    case 'listAnnouncements': return listRows_('Announcements', user, r => !r.cohort_id || r.cohort_id === user.cohort_id || isAdmin_(user));
    case 'saveAnnouncement': return saveRow_('Announcements', req.data, user, 'announcement_id');
    case 'studentProfile': return studentProfile_(req.student_id || user.user_id, user);
    case 'disciplineHistory': return disciplineHistory_(req.student_id || user.user_id, user);
    case 'recordDiscipline': requireAdmin_(user); return saveRow_('Discipline', req.data, user, 'event_id');
    case 'forumRooms': return forumRooms_(user);
    case 'forumFeed': return forumFeed_(req, user);
    case 'createForumPost': return createForumPost_(req, user);
    case 'replyForumPost': return replyForumPost_(req, user);
    case 'listAttendance': return listRows_('Attendance', user, r => isAdmin_(user) || r.student_id === user.user_id);
    case 'createAttendanceSession': requireAdmin_(user); return createAttendanceSession_(req,user);
    case 'checkIn': return checkIn_(req, user);
    case 'listGrades': return listRows_('Grades', user, r => isAdmin_(user) || r.student_id === user.user_id);
    case 'saveGrade': requireAdmin_(user); return saveRow_('Grades', req.data, user, 'grade_id');
    case 'listTickets': return listRows_('SupportTickets', user, r => isAdmin_(user) || r.student_id === user.user_id);
    case 'createTicket': return createTicket_(req, user);
    case 'updateTicket': requireAdmin_(user); return updateRow_('SupportTickets', req.data, user, 'ticket_id');
    case 'listInstitutions': requireRole_(user, ['owner','super_admin']); return listRows_('Institutions', user);
    case 'saveInstitution': requireRole_(user, ['owner','super_admin']); return saveRow_('Institutions', req.data, user, 'institution_id');
    case 'auditLog': requireAdmin_(user); return listRows_('AuditLog', user);
    case 'saveSetting': requireRole_(user, ['owner','super_admin']); return saveSetting_(req, user);
    default: throw new Error('UNKNOWN_ACTION');
  }
}
function db_() {
  const id = prop_('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID_NOT_CONFIGURED');
  return SpreadsheetApp.openById(id);
}
function prop_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }
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
  const email = prop_('BOOTSTRAP_EMAIL').trim().toLowerCase();
  const password = prop_('BOOTSTRAP_PASSWORD');
  if (!email || password.length < 12) throw new Error('Set BOOTSTRAP_EMAIL and a 12+ character BOOTSTRAP_PASSWORD in Script Properties first.');
  if (findUserByEmail_(email)) throw new Error('Owner already exists.');
  const salt = Utilities.getUuid();
  const sh = db_().getSheetByName('Users');
  const id = Utilities.getUuid();
  sh.appendRow([id,'default','', 'Platform Owner',email,'',hash_(password,salt),salt,'owner','','','active','',new Date().toISOString(),new Date().toISOString()]);
  db_().getSheetByName('Institutions').appendRow(['default','Main Academy','main','active','','#35d6c1',new Date().toISOString()]);
  PropertiesService.getScriptProperties().deleteProperty('BOOTSTRAP_PASSWORD');
  return 'Initial owner created. Temporary bootstrap password property removed.';
}
function login_(req) {
  const identifier = String(req.identifier || req.email || '').trim().toLowerCase();
  const password = String(req.password || '');
  const user = findUserByLogin_(identifier);
  if (!user || user.status !== 'active' || hash_(password,user.password_salt) !== user.password_hash) throw new Error('INVALID_CREDENTIALS');
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, user.user_id, 21600);
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
function findUserByLogin_(identifier) { if (!identifier) return null; const key=String(identifier).toLowerCase(); return rows_('Users').find(r => String(r.email||'').toLowerCase()===key || String(r.student_code||'').toLowerCase()===key) || null; }
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
  if (!data || typeof data !== 'object') throw new Error('INVALID_DATA');
  const record = Object.assign({},data);
  const id = record[idKey] || Utilities.getUuid();
  record[idKey] = id;
  if (TABLES[table].indexOf('institution_id') >= 0 && table !== 'Institutions') record.institution_id = user.institution_id;
  const sh = db_().getSheetByName(table);
  const headers = TABLES[table];
  const all = sh.getDataRange().getValues();
  let rowIndex = -1;
  for (let i=1;i<all.length;i++) if (String(all[i][headers.indexOf(idKey)]) === String(id)) { rowIndex=i+1; break; }
  if (rowIndex < 0) { rowIndex=sh.getLastRow()+1; }
  const row = headers.map(h => record[h] === undefined ? '' : record[h]);
  sh.getRange(rowIndex,1,1,headers.length).setValues([row]);
  audit_(user,rowIndex===sh.getLastRow()?'CREATE':'UPDATE',table,id,{});
  return {ok:true,id:id};
}
function updateRow_(table,data,user,idKey) { return saveRow_(table,data,user,idKey); }
function saveStudent_(req,user) {
  requireAdmin_(user);
  const d = Object.assign({},req.data || {});
  if (!d.full_name || !d.student_code) throw new Error('NAME_AND_STUDENT_CODE_REQUIRED');
  if (!d.user_id) {
    const salt = Utilities.getUuid();
    d.user_id = Utilities.getUuid(); d.password_salt = salt;
    d.password_hash = hash_(String(d.initial_password || Utilities.getUuid()),salt);
    d.role = 'student'; d.status = d.status || 'active'; d.created_at = new Date().toISOString();
  }
  delete d.initial_password; d.updated_at = new Date().toISOString();
  return saveRow_('Users',d,user,'user_id');
}
function changeStudentCohort_(req,user) {
  requireAdmin_(user);
  const student = findById_('Users','user_id',req.student_id);
  if (!student || student.institution_id !== user.institution_id || student.role !== 'student') throw new Error('STUDENT_NOT_FOUND');
  student.cohort_id = req.cohort_id; student.updated_at = new Date().toISOString();
  return saveRow_('Users',student,user,'user_id');
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
function forumRooms_(user) { return {ok:true,data:rows_('ForumRooms').filter(r=>r.institution_id===user.institution_id && r.status==='active')}; }
function forumFeed_(req,user) {
  const room = findById_('ForumRooms','room_id',req.room_id);
  if (!room || room.institution_id!==user.institution_id) throw new Error('ROOM_NOT_FOUND');
  const posts = rows_('ForumPosts').filter(p=>p.room_id===req.room_id && p.status==='active' && p.institution_id===user.institution_id);
  return {ok:true,data:posts.map(p=>Object.assign({},p,{replies:rows_('ForumReplies').filter(r=>r.post_id===p.post_id && r.status==='active')}))};
}
function createForumPost_(req,user) {
  const room = findById_('ForumRooms','room_id',req.room_id);
  if (!room || room.institution_id!==user.institution_id || room.status!=='active') throw new Error('ROOM_NOT_AVAILABLE');
  if (room.cohort_id && room.cohort_id!==user.cohort_id && !isAdmin_(user)) throw new Error('ROOM_ACCESS_DENIED');
  if (!String(req.body||'').trim()) throw new Error('EMPTY_POST');
  return saveRow_('ForumPosts',{post_id:Utilities.getUuid(),room_id:req.room_id,author_id:user.user_id,body:String(req.body).slice(0,5000),attachment_url:'',created_at:new Date().toISOString(),status:'active'},user,'post_id');
}
function replyForumPost_(req,user) {
  const post = findById_('ForumPosts','post_id',req.post_id);
  if (!post || post.institution_id!==user.institution_id || !String(req.body||'').trim()) throw new Error('POST_NOT_FOUND');
  return saveRow_('ForumReplies',{reply_id:Utilities.getUuid(),post_id:req.post_id,author_id:user.user_id,body:String(req.body).slice(0,3000),created_at:new Date().toISOString(),status:'active'},user,'reply_id');
}
function createAttendanceSession_(req,user) {
  const d=Object.assign({},req.data||{});
  if (!d.lecture_id || !d.code || d.latitude === undefined || d.longitude === undefined || !d.radius_meters) throw new Error('SESSION_FIELDS_REQUIRED');
  d.session_id=Utilities.getUuid();
  d.secret_code_hash=hash_(String(d.code),d.session_id);
  delete d.code;
  d.status='open';
  return saveRow_('AttendanceSessions',d,user,'session_id');
}
function checkIn_(req,user) {
  const session = findById_('AttendanceSessions','session_id',req.session_id);
  if (!session || session.institution_id!==user.institution_id || session.status!=='open') throw new Error('SESSION_CLOSED');
  const now = Date.now();
  if (session.opens_at && now < new Date(session.opens_at).getTime()) throw new Error('SESSION_NOT_OPEN');
  if (session.closes_at && now > new Date(session.closes_at).getTime()) throw new Error('SESSION_CLOSED');
  if (hash_(String(req.code||''),session.session_id)!==session.secret_code_hash) throw new Error('INVALID_ATTENDANCE_CODE');
  const lat=Number(req.latitude), lon=Number(req.longitude);
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
function safeUser_(u) { const x=Object.assign({},u); delete x.password_hash; delete x.password_salt; return x; }
function isOwner_(u) { return u && ['owner','super_admin'].includes(u.role); }
function isAdmin_(u) { return u && ADMIN_ROLES.includes(u.role); }
function requireAdmin_(u) { if (!isAdmin_(u)) throw new Error('ADMIN_REQUIRED'); }
function requireRole_(u,roles) { if (!u || roles.indexOf(u.role)<0) throw new Error('FORBIDDEN'); }
function hash_(password,salt) { const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+'|'+password,Utilities.Charset.UTF_8); return bytes.map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join(''); }
function audit_(user,action,entity,id,details) {
  try { db_().getSheetByName('AuditLog').appendRow([Utilities.getUuid(),user.institution_id,user.user_id,action,entity,id,JSON.stringify(details||{}),new Date().toISOString()]); } catch(e) {}
}
function auditError_(req,err) { console.error((req&&req.action)||'unknown',err); }
