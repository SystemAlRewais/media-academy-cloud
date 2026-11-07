import React,{useEffect,useState} from 'react';
import {GraduationCap,ShieldCheck,UserRound,LogIn} from 'lucide-react';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import {APP_CONFIG} from './config.js';
import {api,login,getSessionToken,logout} from './services/api.js';
import './auth.css';

const DEMO_MODE = true; // Temporary UI preview only. Not a secure account system.
const demoStudent = {user_id:'demo-student',institution_id:'default',student_code:'STU001',full_name:'طالب تجريبي',role:'student',status:'active',cohort_id:'الفرقة الأولى',department:'عام'};
export default function AuthGate(){
  const [user,setUser]=useState(null),[checking,setChecking]=useState(Boolean(!DEMO_MODE&&APP_CONFIG.appsScriptUrl&&getSessionToken())),[mode,setMode]=useState('student'),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[adminMode,setAdminMode]=useState(false);
  useEffect(()=>{if(!DEMO_MODE&&APP_CONFIG.appsScriptUrl&&getSessionToken())api('me').then(r=>setUser(r.user)).catch(()=>logout()).finally(()=>setChecking(false));},[]);
  if(checking)return <div className="auth-screen"><div className="auth-card">جارٍ التحقق من الجلسة...</div></div>;
  if(adminMode)return <AdminApp onExit={()=>setAdminMode(false)}/>;
  if(user)return <App currentUser={user} onLogout={async()=>{if(!DEMO_MODE)await logout();setUser(null);setIdentifier('');setPassword('');}}/>;
  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      if(DEMO_MODE){
        const key=identifier.trim().toLowerCase();
        if(mode==='student' && ['student','stu001','طالب'].includes(key) && password==='5656'){setUser(demoStudent);return;}
        if(mode==='admin' && ['owner','admin','الإدارة الداخلية'].includes(key) && password==='44554455'){setAdminMode(true);return;}
        throw new Error('بيانات الدخول التجريبية غير صحيحة. راجع اسم المستخدم وكلمة المرور.');
      }
      const logged=await login(identifier,password);
      if(['owner','super_admin','admin','staff'].includes(logged.role))setAdminMode(true);else setUser(logged);
    }catch(err){setError(({INVALID_CREDENTIALS:'كود الطالب أو البريد أو كلمة المرور غير صحيحة.',BACKEND_NOT_CONFIGURED:'رابط الخادم غير مضبوط.',SESSION_EXPIRED:'انتهت الجلسة.'})[err.message]||err.message);}
    finally{setBusy(false);}
  };
  return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submit}><div className="auth-logo"><GraduationCap size={27}/></div><span className="auth-kicker">MEDIA ACADEMY CLOUD</span><h1>أهلاً بيك في بوابتك الجامعية</h1><p>سجل دخولك لمتابعة ملفك وخدماتك والتواصل مع زملائك.</p><div className="auth-mode"><button type="button" className={mode==='student'?'selected':''} onClick={()=>{setMode('student');setIdentifier('');setPassword('');setError('');}}><UserRound size={16}/> طالب</button><button type="button" className={mode==='admin'?'selected':''} onClick={()=>{setMode('admin');setIdentifier('');setPassword('');setError('');}}><ShieldCheck size={16}/> إدارة</button></div><label>{mode==='student'?'كود الطالب':'اسم المستخدم الإداري'}<input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='student'?'STU001 أو Student':'Owner أو Admin'} required/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={busy}><LogIn size={16}/>{busy?'جارٍ تسجيل الدخول...':'تسجيل الدخول'}</button><small>وضع تجريبي مؤقت لعرض الواجهات فقط؛ البيانات لا تُحفظ ولا يتم الاتصال بالسحابة في هذا الوضع.</small></form></div>;
}
