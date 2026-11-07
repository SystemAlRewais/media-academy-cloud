import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bell, BookOpen, CalendarDays, CheckCircle2, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { api, getSessionToken, login, logout } from '../services/api.js';
import './admin.css';

const sections = [
  ['dashboard','لوحة التحكم',LayoutDashboard],['students','الطلاب',Users],['cohorts','الفرق الدراسية',GraduationCap],
  ['content','المحتوى الدراسي',BookOpen],['attendance','الحضور',CalendarDays],['discipline','السجل الانضباطي',ShieldCheck],
  ['announcements','الإعلانات',Bell],['forum','المنتدى',MessageCircle],['tickets','الشكاوى',AlertTriangle],['settings','الإعدادات',Settings]
];

export default function AdminApp({onExit}) {
  const [user,setUser]=useState(null),[section,setSection]=useState('dashboard'),[summary,setSummary]=useState(null),[rows,setRows]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[showAdd,setShowAdd]=useState(false),[student,setStudent]=useState({full_name:'',student_code:'',email:'',phone:'',cohort_id:'',department:'',initial_password:''});
  const load=async (next=section)=>{
    setLoading(true);setError('');
    try {
      if(next==='dashboard'){const r=await api('dashboard');setSummary(r.summary);setRows([]);}
      else {
        const map={students:'listStudents',cohorts:'listCohorts',content:'listContent',attendance:'listAttendance',discipline:'listDiscipline',announcements:'listAnnouncements',forum:'listForumPosts',tickets:'listTickets',settings:'auditLog'};
        const r=await api(map[next]||'dashboard');setRows(r.data||[]);
      }
    } catch(e){setError(errorText(e));}
    finally{setLoading(false);}
  };
  useEffect(()=>{if(getSessionToken()) {api('me').then(r=>{if(['owner','super_admin','admin','staff'].includes(r.user?.role))setUser(r.user);else setError('هذا الحساب ليس لديه صلاحية دخول الإدارة.');}).catch(()=>setError('انتهت الجلسة، سجل الدخول مرة أخرى.'));}},[]);
  useEffect(()=>{if(user)load(section);},[user,section]);
  const submitLogin=async e=>{e.preventDefault();setLoading(true);setError('');try{const logged=await login(email,password);if(!['owner','super_admin','admin','staff'].includes(logged?.role)){await logout();throw new Error('ADMIN_REQUIRED');}setUser(logged);}catch(err){setError(errorText(err));}finally{setLoading(false);}};
  const addStudent=async e=>{e.preventDefault();setLoading(true);try{await api('saveStudent',{data:student});setShowAdd(false);setStudent({full_name:'',student_code:'',email:'',phone:'',cohort_id:'',department:'',initial_password:''});load('students');}catch(err){setError(errorText(err));}finally{setLoading(false);}};
  const doLogout=async()=>{await logout();setUser(null);};
  if(!user)return <div className="admin-login" dir="rtl"><button className="admin-back" onClick={onExit}><X size={17}/> رجوع لبوابة الطالب</button><form className="admin-login-card" onSubmit={submitLogin}><div className="admin-logo"><GraduationCap/></div><span>MEDIA ACADEMY CLOUD</span><h1>دخول الإدارة</h1><p>سجل الدخول بحساب إداري معتمد.</p><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="admin-error">{error}</div>}<button className="admin-primary" disabled={loading}>{loading?'جارٍ التحقق...':'تسجيل الدخول'}</button><small>يتطلب ربط رابط Google Apps Script وإعداد حساب المالك أولاً.</small></form></div>;
  const current=sections.find(s=>s[0]===section)?.[1]||'لوحة التحكم';
  return <div className="admin-shell" dir="rtl"><aside className="admin-sidebar"><div className="admin-brand"><div><GraduationCap/></div><span><b>MEDIA ACADEMY</b><small>CONTROL CENTER</small></span></div><div className="admin-account"><span className="admin-live"/> متصل بحساب الإدارة <small>{user.full_name}</small></div><nav>{sections.map(([id,label,Icon])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}><Icon size={17}/>{label}</button>)}</nav><button className="admin-exit" onClick={doLogout}><LogOut size={17}/> تسجيل الخروج</button></aside><main className="admin-main"><header><div><span>مساحة الإدارة</span><h1>{current}</h1></div><div className="admin-header-actions"><span className="admin-live"/> <small>متصل</small><button onClick={onExit}>بوابة الطالب</button></div></header>
    {error&&<div className="admin-error">{error}</div>}
    {section==='dashboard'?<><div className="admin-welcome"><div><span>لوحة متابعة الأكاديمية</span><h2>أهلاً بيك في مركز التحكم</h2><p>إدارة الطلاب والمحتوى والعمليات من مكان واحد.</p></div><Activity size={42}/></div><div className="admin-stats">{[['الطلاب النشطون',summary?.students??'—',Users],['الفرق الدراسية',summary?.cohorts??'—',GraduationCap],['ملفات المحتوى',summary?.content??'—',BookOpen],['طلبات مفتوحة',summary?.openTickets??'—',AlertTriangle]].map(([l,v,I])=><div key={l}><I/><small>{l}</small><b>{v}</b></div>)}</div><div className="admin-panel"><h3>إدارة المنصة</h3><div className="admin-shortcuts">{sections.slice(1).map(([id,label,Icon])=><button key={id} onClick={()=>setSection(id)}><Icon/>{label}</button>)}</div></div></>:<div className="admin-panel"><div className="admin-panel-head"><div><h3>{current}</h3><p>البيانات المحفوظة في قاعدة Google Sheets</p></div><div className="admin-table-actions"><button onClick={()=>load(section)}><Activity size={15}/> تحديث</button>{section==='students'&&<button className="admin-primary small" onClick={()=>setShowAdd(true)}><Plus size={15}/> إضافة طالب</button>}</div></div>
      {loading?<div className="admin-empty">جارٍ تحميل البيانات...</div>:rows.length===0?<div className="admin-empty"><BookOpen size={28}/><b>لا توجد بيانات للعرض حالياً</b><span>أضف البيانات بعد تجهيز قاعدة الشيت.</span></div>:<div className="admin-table-wrap"><table><thead><tr>{Object.keys(rows[0]).filter(k=>!k.includes('hash')&&!k.includes('salt')).slice(0,7).map(k=><th key={k}>{columnName(k)}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.user_id||r.event_id||r.post_id||r.ticket_id||r.id||i}>{Object.keys(rows[0]).filter(k=>!k.includes('hash')&&!k.includes('salt')).slice(0,7).map(k=><td key={k}>{String(r[k]??'—').slice(0,70)}</td>)}</tr>)}</tbody></table></div>}
    </div>}
    {showAdd&&<div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={addStudent}><div><h3>إضافة طالب جديد</h3><button type="button" onClick={()=>setShowAdd(false)}><X/></button></div>{[['full_name','اسم الطالب'],['student_code','كود الطالب'],['email','البريد الإلكتروني'],['phone','رقم الهاتف'],['cohort_id','معرّف الفرقة'],['department','القسم'],['initial_password','كلمة مرور مؤقتة']].map(([k,l])=><label key={k}>{l}<input required={['full_name','student_code','initial_password'].includes(k)} type={k==='initial_password'?'password':'text'} value={student[k]} onChange={e=>setStudent({...student,[k]:e.target.value})}/></label>)}<button className="admin-primary" disabled={loading}>حفظ الطالب</button></form></div>}
  </main></div>;
}
function columnName(k){return ({full_name:'الاسم',student_code:'كود الطالب',email:'البريد',phone:'الهاتف',role:'الصلاحية',cohort_id:'الفرقة',status:'الحالة',name:'الاسم',title:'العنوان',body:'المحتوى',created_at:'تاريخ الإنشاء',event_type:'نوع الحدث',decision:'القرار',student_id:'معرّف الطالب',room_id:'المنتدى',starts_at:'البداية'})[k]||k;}
function errorText(e){const m=e?.message||String(e);return ({BACKEND_NOT_CONFIGURED:'لم يتم وضع رابط Google Apps Script في إعدادات المنصة.',AUTH_REQUIRED:'سجل الدخول أولاً.',SESSION_EXPIRED:'انتهت الجلسة، سجل الدخول مرة أخرى.',INVALID_CREDENTIALS:'بيانات الدخول غير صحيحة.',ADMIN_REQUIRED:'هذا الإجراء متاح للإدارة فقط.'})[m]||m;}
