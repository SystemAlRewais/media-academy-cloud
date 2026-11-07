import React,{useEffect,useState} from 'react';
import {GraduationCap,ShieldCheck,UserRound,LogIn} from 'lucide-react';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import {APP_CONFIG} from './config.js';
import {api,login,getSessionToken,logout} from './services/api.js';
import './auth.css';

export default function AuthGate(){
  const [user,setUser]=useState(null),[checking,setChecking]=useState(Boolean(APP_CONFIG.appsScriptUrl&&getSessionToken())),[mode,setMode]=useState('student'),[identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[adminMode,setAdminMode]=useState(false);
  useEffect(()=>{if(APP_CONFIG.appsScriptUrl&&getSessionToken())api('me').then(r=>setUser(r.user)).catch(()=>logout()).finally(()=>setChecking(false));},[]);
  if(!APP_CONFIG.appsScriptUrl)return <div className="auth-screen" dir="rtl"><div className="auth-card"><h1>النظام غير مربوط بالخادم</h1><p>لم يتم إعداد رابط الخدمة بعد. تواصل مع مسؤول المنصة.</p></div></div>;
  if(checking)return <div className="auth-screen"><div className="auth-card">جارٍ التحقق من الجلسة...</div></div>;
  if(adminMode)return <AdminApp onExit={()=>setAdminMode(false)}/>;
  if(user)return <App currentUser={user} onLogout={async()=>{await logout();setUser(null);}}/>;
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const logged=await login(identifier,password);if(['owner','super_admin','admin','staff'].includes(logged.role)){setAdminMode(true);}else{setUser(logged);}}catch(err){setError(({INVALID_CREDENTIALS:'كود الطالب أو البريد أو كلمة المرور غير صحيحة.',BACKEND_NOT_CONFIGURED:'رابط الخادم غير مضبوط.',SESSION_EXPIRED:'انتهت الجلسة.'})[err.message]||err.message);}finally{setBusy(false);}};
  return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submit}><div className="auth-logo"><GraduationCap size={27}/></div><span className="auth-kicker">MEDIA ACADEMY CLOUD</span><h1>أهلاً بيك في بوابتك الجامعية</h1><p>سجل دخولك لمتابعة ملفك وخدماتك والتواصل مع زملائك.</p><div className="auth-mode"><button type="button" className={mode==='student'?'selected':''} onClick={()=>setMode('student')}><UserRound size={16}/> طالب</button><button type="button" className={mode==='admin'?'selected':''} onClick={()=>setMode('admin')}><ShieldCheck size={16}/> إدارة</button></div><label>{mode==='student'?'كود الطالب أو البريد الإلكتروني':'البريد الإلكتروني الإداري'}<input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='student'?'مثال: 20241038':'name@academy.edu'} required/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={busy}><LogIn size={16}/>{busy?'جارٍ تسجيل الدخول...':'تسجيل الدخول'}</button><small>بيانات الدخول يتم التحقق منها عبر Google Apps Script، ولا يتم حفظ كلمة المرور في المتصفح.</small></form></div>;
}
