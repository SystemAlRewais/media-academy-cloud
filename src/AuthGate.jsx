import React,{useEffect,useState} from 'react';
import {GraduationCap,UserRound,LogIn} from 'lucide-react';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import {APP_CONFIG} from './config.js';
import {api,login,getSessionToken,logout} from './services/api.js';
import './auth.css';

const ADMIN_ROLES=['owner','super_admin','admin','staff'];
export default function AuthGate(){
  const isAdminPortal=new URLSearchParams(window.location.search).get('panel')==='owner';
  const [user,setUser]=useState(null),[adminUser,setAdminUser]=useState(null);
  const [checking,setChecking]=useState(Boolean(APP_CONFIG.appsScriptUrl&&getSessionToken()));
  const [identifier,setIdentifier]=useState(''),[password,setPassword]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!APP_CONFIG.appsScriptUrl||!getSessionToken()){setChecking(false);return;}
    api('me').then(r=>{
      if(ADMIN_ROLES.includes(r.user?.role))setAdminUser(r.user);
      else setUser(r.user);
    }).catch(()=>logout()).finally(()=>setChecking(false));
  },[]);

  if(checking)return <div className="auth-screen"><div className="auth-card">جارٍ التحقق من الحساب...</div></div>;
  if(adminUser)return <AdminApp initialUser={adminUser} onExit={async()=>{try{await logout()}finally{setAdminUser(null);window.history.replaceState({},'',window.location.pathname)}}}/>;
  if(user)return <App currentUser={user} onLogout={async()=>{await logout();setUser(null);setIdentifier('');setPassword('')}}/>;

  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      const logged=await login(identifier,password);
      if(ADMIN_ROLES.includes(logged.role)){setAdminUser(logged);return;}
      if(isAdminPortal){await logout();throw new Error('ADMIN_REQUIRED');}
      if(logged.role!=='student'){await logout();throw new Error('ACCOUNT_ROLE_INVALID');}
      setUser(logged);
    }catch(err){
      const messages={INVALID_CREDENTIALS:'كود الطالب أو اسم المستخدم أو كلمة المرور غير صحيحة.',BACKEND_NOT_CONFIGURED:'تعذر الاتصال بالخادم. راجع إعداد الربط.',SESSION_EXPIRED:'انتهت الجلسة. سجل الدخول مرة أخرى.',ADMIN_REQUIRED:'هذا الحساب غير مصرح له بدخول الإدارة.',ACCOUNT_ROLE_INVALID:'نوع الحساب غير صالح.'};
      setError(messages[err.message]||err.message||'تعذر تسجيل الدخول.');
    }finally{setBusy(false);}
  };

  return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submit}>
    <div className="auth-logo"><GraduationCap size={27}/></div>
    <span className="auth-kicker">MEDIA ACADEMY CLOUD</span>
    <h1>{isAdminPortal?'دخول الإدارة':'أهلاً بيك في بوابتك الجامعية'}</h1>
    <p>{isAdminPortal?'منطقة دخول مخصصة لفريق الإدارة.':'سجل دخولك لمتابعة ملفك وخدماتك والتواصل مع زملائك.'}</p>
    <label>{isAdminPortal?'اسم مستخدم الإدارة أو البريد الإلكتروني':'كود الطالب'}<input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={isAdminPortal?'اسم المستخدم الإداري':'أدخل كود الطالب'} required autoComplete="username"/></label>
    <label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
    {error&&<div className="auth-error">{error}</div>}
    <button className="auth-submit" disabled={busy}><LogIn size={16}/>{busy?'جارٍ التحقق...':'تسجيل الدخول'}</button>
  </form></div>;
}
