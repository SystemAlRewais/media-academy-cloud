/** MEDIA ACADEMY CLOUD — Google Apps Script backend
 * Attach this script to the Google Sheet (Extensions > Apps Script).
 * Deploy as Web App: Execute as Me / Anyone.
 */
const TABLES={
  Institutions:['institution_id','name','status','logo_url','primary_color','created_at'],
  Users:['user_id','institution_id','username','full_name','email','phone','password_hash','password_salt','role','cohort_id','status','created_at','updated_at'],
  Cohorts:['cohort_id','institution_id','name','level','academic_year','status'],
  Subjects:['subject_id','institution_id','cohort_id','name','subject_code','instructor','description','status','created_at'],
  Books:['book_id','institution_id','cohort_id','subject_id','title','author','description','file_url','cover_url','status','created_at'],
  Content:['content_id','institution_id','cohort_id','subject_id','title','content_type','file_url','description','created_at','status'],
  Lectures:['lecture_id','institution_id','cohort_id','subject_id','title','starts_at','ends_at','location_name','status'],
  AttendanceSessions:['session_id','institution_id','lecture_id','location_url','latitude','longitude','radius_meters','opens_at','closes_at','status'],
  Attendance:['attendance_id','institution_id','session_id','student_id','student_code','checked_at','latitude','longitude','distance_meters','status'],
  Exams:['exam_id','institution_id','cohort_id','subject_id','title','exam_date','total_marks','status'],
  Grades:['grade_id','institution_id','student_id','subject_id','exam_id','score','total_marks','published_at'],
  Announcements:['announcement_id','institution_id','cohort_id','title','body','created_at','status'],
  Settings:['key','value','updated_at'],
  AuditLog:['log_id','institution_id','actor_id','action','entity','entity_id','details','created_at']
};
const ID_KEYS={Institutions:'institution_id',Users:'user_id',Cohorts:'cohort_id',Subjects:'subject_id',Books:'book_id',Content:'content_id',Lectures:'lecture_id',AttendanceSessions:'session_id',Attendance:'attendance_id',Exams:'exam_id',Grades:'grade_id',Announcements:'announcement_id',AuditLog:'log_id'};
const PUBLIC=['health','setup','login'];
const ADMIN=['Institutions','Users','Cohorts','Subjects','Books','Content','Lectures','AttendanceSessions','Attendance','Exams','Grades','Announcements','Settings','AuditLog'];
function doGet(e){
  var p=e&&e.parameter||{},req={};
  try{req=p.q?JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p.q)).getDataAsString()):{action:p.action||'health'};}catch(x){req={action:'bad_request'};}
  var result=route_(req),json=JSON.stringify(result),cb=p.callback||'';
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function route_(r){
  try{
    var a=String(r.action||'health');
    if(a==='health')return {ok:true,service:'Media Academy Cloud',version:'2.0'};
    if(a==='setup')return setup_();
    if(a==='login')return login_(r);
    var user=authorize_(r.token);
    if(a==='me')return {ok:true,user:safe_(user)};
    if(a==='logout'){CacheService.getScriptCache().remove('s_'+r.token);return {ok:true};}
    if(a==='list')return list_(r.entity,user);
    if(a==='save')return save_(r.entity,r.record||{},user);
    if(a==='delete')return remove_(r.entity,r.id,user);
    if(a==='changePassword')return changePassword_(r,user);
    throw new Error('UNKNOWN_ACTION');
  }catch(err){return {ok:false,error:String(err.message||err)};}
}
function db_(){var ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('OPEN_SCRIPT_FROM_GOOGLE_SHEET');return ss;}
function setup_(){
  var ss=db_();
  Object.keys(TABLES).forEach(function(n){var sh=ss.getSheetByName(n);if(!sh)sh=ss.insertSheet(n);if(sh.getLastRow()===0)sh.getRange(1,1,1,TABLES[n].length).setValues([TABLES[n]]);sh.setFrozenRows(1);});
  var now=new Date().toISOString(),ins=rows_('Institutions');
  if(!ins.length)db_().getSheetByName('Institutions').appendRow(['default','Media Academy','active','','#16C7C2',now]);
  var cohorts=rows_('Cohorts');
  for(var i=1;i<=4;i++)if(!cohorts.some(function(x){return x.cohort_id==='cohort-'+i;}))db_().getSheetByName('Cohorts').appendRow(['cohort-'+i,'default','الفرقة '+i,String(i),'','active']);
  var users=rows_('Users');
  if(!users.some(function(x){return x.username==='Owner';}))addUser_('Owner','مدير المنصة','owner','','4455445');
  users=rows_('Users');
  if(!users.some(function(x){return x.username==='AZ1';}))addUser_('AZ1','طالب تجريبي','student','cohort-1','5656');
  return {ok:true,message:'SETUP_COMPLETE',sheets:Object.keys(TABLES).length};
}
function addUser_(username,name,role,cohort,password){
  var salt=Utilities.getUuid(),now=new Date().toISOString();
  db_().getSheetByName('Users').appendRow([Utilities.getUuid(),'default',username,name,'','',hash_(password,salt),salt,role,cohort,'active',now,now]);
}
function login_(r){
  var username=String(r.username||'').trim(),password=String(r.password||'');
  var u=rows_('Users').filter(function(x){return String(x.username).toLowerCase()===username.toLowerCase()&&x.status==='active';})[0];
  if(!u||hash_(password,u.password_salt)!==u.password_hash)throw new Error('INVALID_LOGIN');
  var token=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put('s_'+token,u.user_id,21600);
  audit_(u,'LOGIN','Users',u.user_id,{});
  return {ok:true,token:token,user:safe_(u)};
}
function authorize_(token){
  if(!token)throw new Error('AUTH_REQUIRED');
  var id=CacheService.getScriptCache().get('s_'+token);
  if(!id)throw new Error('SESSION_EXPIRED');
  var u=rows_('Users').filter(function(x){return x.user_id===id&&x.status==='active';})[0];
  if(!u)throw new Error('ACCOUNT_DISABLED');
  return u;
}
function isAdmin_(u){return u.role==='owner'||u.role==='admin';}
function safe_(u){var x=Object.assign({},u);delete x.password_hash;delete x.password_salt;return x;}
function rows_(name){
  var sh=db_().getSheetByName(name);if(!sh||sh.getLastRow()<2)return [];
  var v=sh.getDataRange().getValues(),h=v.shift().map(String);
  return v.filter(function(row){return row.some(function(c){return c!=='';});}).map(function(row){var o={};h.forEach(function(k,i){o[k]=row[i] instanceof Date?row[i].toISOString():row[i];});return o;});
}
function list_(entity,u){
  if(!TABLES[entity])throw new Error('INVALID_ENTITY');
  if(!isAdmin_(u)&&['Users','Settings','AuditLog','Institutions','AttendanceSessions'].indexOf(entity)>=0)throw new Error('FORBIDDEN');
  var data=rows_(entity);
  if(!isAdmin_(u)){
    data=data.filter(function(x){
      if(x.institution_id&&x.institution_id!=='default')return false;
      if(x.cohort_id)return x.cohort_id===u.cohort_id;
      if(entity==='Grades'||entity==='Attendance')return x.student_id===u.user_id;
      return true;
    });
  }
  if(entity==='Users')data=data.filter(function(x){return x.role==='student';}).map(safe_);
  return {ok:true,data:data};
}
function save_(entity,record,u){
  if(!isAdmin_(u))throw new Error('ADMIN_ONLY');
  if(!TABLES[entity]||entity==='AuditLog')throw new Error('INVALID_ENTITY');
  if(entity==='Settings'){
    var key=String(record.key||'').trim();if(!key)throw new Error('SETTING_KEY_REQUIRED');
    var settingsSheet=db_().getSheetByName('Settings'),settings=rows_('Settings'),found=settings.find(function(x){return x.key===key;});
    var settingRow=found?settings.findIndex(function(x){return x.key===key;})+2:settingsSheet.getLastRow()+1;
    settingsSheet.getRange(settingRow,1,1,3).setValues([[key,String(record.value||''),new Date().toISOString()]]);
    audit_(u,found?'UPDATE':'CREATE','Settings',key,{});return {ok:true,id:key};
  }
  var headers=TABLES[entity],idKey=ID_KEYS[entity],id=record[idKey]||Utilities.getUuid(),sh=db_().getSheetByName(entity),all=sh.getDataRange().getValues(),idx=headers.indexOf(idKey),rowNum=-1;
  for(var i=1;i<all.length;i++)if(String(all[i][idx])===String(id)){rowNum=i+1;break;}
  var creating=rowNum<0;if(creating)rowNum=sh.getLastRow()+1;
  var data=Object.assign({},record);data[idKey]=id;
  if(headers.indexOf('institution_id')>=0)data.institution_id='default';
  if(entity==='Users'){
    data.username=String(data.username||'').trim();
    if(!data.username||!data.full_name)throw new Error('USERNAME_AND_NAME_REQUIRED');
    if(creating){var pass=String(data.password||'');if(pass.length<4)throw new Error('PASSWORD_MIN_4');var salt=Utilities.getUuid();data.password_salt=salt;data.password_hash=hash_(pass,salt);data.role=data.role==='owner'?'owner':'student';data.status='active';data.created_at=new Date().toISOString();}
    else if(data.password){var s=Utilities.getUuid();data.password_salt=s;data.password_hash=hash_(String(data.password),s);}
    delete data.password;
  }
  if(creating&&headers.indexOf('created_at')>=0)data.created_at=data.created_at||new Date().toISOString();
  if(headers.indexOf('updated_at')>=0)data.updated_at=new Date().toISOString();
  var old=creating?[]:all[rowNum-1],values=headers.map(function(k,i){return data[k]!==undefined?data[k]:(creating?'':old[i]);});
  sh.getRange(rowNum,1,1,headers.length).setValues([values]);
  audit_(u,creating?'CREATE':'UPDATE',entity,id,{});
  return {ok:true,id:id};
}
function remove_(entity,id,u){
  if(!isAdmin_(u))throw new Error('ADMIN_ONLY');
  if(!TABLES[entity]||['Institutions','Users','AuditLog','Settings'].indexOf(entity)>=0)throw new Error('DELETE_NOT_ALLOWED');
  var sh=db_().getSheetByName(entity),h=TABLES[entity],col=h.indexOf(ID_KEYS[entity])+1;
  for(var i=2;i<=sh.getLastRow();i++)if(String(sh.getRange(i,col).getValue())===String(id)){sh.deleteRow(i);audit_(u,'DELETE',entity,id,{});return {ok:true};}
  throw new Error('RECORD_NOT_FOUND');
}
function changePassword_(r,u){
  if(r.oldPassword&&hash_(String(r.oldPassword),u.password_salt)!==u.password_hash)throw new Error('OLD_PASSWORD_INCORRECT');
  var p=String(r.newPassword||'');if(p.length<4)throw new Error('PASSWORD_MIN_4');
  var salt=Utilities.getUuid(),sh=db_().getSheetByName('Users'),all=sh.getDataRange().getValues(),h=TABLES.Users;
  for(var i=1;i<all.length;i++)if(String(all[i][0])===u.user_id){sh.getRange(i+1,h.indexOf('password_hash')+1).setValue(hash_(p,salt));sh.getRange(i+1,h.indexOf('password_salt')+1).setValue(salt);return {ok:true};}
  throw new Error('USER_NOT_FOUND');
}
function hash_(p,s){var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)+'|'+String(p),Utilities.Charset.UTF_8);return b.map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('');}
function audit_(u,action,entity,id,details){try{db_().getSheetByName('AuditLog').appendRow([Utilities.getUuid(),'default',u.user_id,action,entity,id,JSON.stringify(details||{}),new Date().toISOString()]);}catch(e){}}
