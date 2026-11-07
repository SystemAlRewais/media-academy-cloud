import React,{useEffect,useState} from 'react';
import {GraduationCap,UserRound,LogIn} from 'lucide-react';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import {APP_CONFIG} from './config.js';
import {api,login,getSessionToken,logout,saveSessionToken} from './services/api.js';
import './auth.css';

const ADMIN_ROLES=['owner','super_admin','admin','staff'];
export default function AuthGate(){
  const isAdminPortal=new URLSearchParams(window.location.search).get('panel')==='owner';
  const [user,setUser]=useState(null),[adminUser,setAdminUser]=useState(null);
  const [checking,setChecking]=useState(Boolean(APP_CONFIG.appsScriptUrl&&getSessionToken()));
  const [identifier,setIdentifier]=useState(''),[password,setPassword]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [needsSetup,setNeedsSetup]=useState(false),[ownerName,setOwnerName]=useState(''),[ownerEmail,setOwnerEmail]=useState(''),[ownerPassword,setOwnerPassword]=useState('');

  useEffect(()=>{
    if(!APP_CONFIG.appsScriptUrl){setChecking(false);return;}
    if(!getSessionToken()){
      if(isAdminPortal) api('bootstrapStatus',{}, {public:true}).then(r=>setNeedsSetup(!r.initialized)).catch(()=>{}).finally(()=>setChecking(false));
      else setChecking(false);
      return;
    }
    api('me').then(async r=>{
      const admin=ADMIN_ROLES.includes(r.user?.role);
      if(admin&&!isAdminPortal){await logout();setError('استخدم بوابة الإدارة الخاصة للدخول.');return;}
      if(!admin&&isAdminPortal){await logout();setError('هذا الحساب غير مصرح له بدخول الإدارة.');return;}
      if(admin)setAdminUser(r.user);else setUser(r.user);
    }).catch(()=>logout()).finally(()=>setChecking(false));
  },[]);

  if(checking)return <div className="auth-screen"><div className="auth-card">جارٍ التحقق من الحساب...</div></div>;
  if(adminUser)return <AdminApp initialUser={adminUser} onExit={async()=>{try{await logout()}finally{setAdminUser(null);window.history.replaceState({},'',window.location.pathname)}}}/>;
  if(user)return <App currentUser={user} onLogout={async()=>{await logout();setUser(null);setIdentifier('');setPassword('')}}/>;

  const submitBootstrap=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{const r=await api('bootstrapOwner',{data:{full_name:ownerName,email:ownerEmail,password:ownerPassword}},{public:true});saveSessionToken(r.token);setAdminUser(r.user);setNeedsSetup(false);setOwnerPassword('');}
    catch(err){const messages={OWNER_ALREADY_EXISTS:'تم إنشاء حساب المالك بالفعل. ارجع لتسجيل الدخول.',OWNER_PASSWORD_TOO_SHORT:'كلمة المرور لازم تكون 12 حرفًا على الأقل.',INVALID_OWNER_EMAIL:'اكتب بريدًا إلكترونيًا صحيحًا.',EMAIL_EXISTS:'البريد الإلكتروني مستخدم بالفعل.'};setError(messages[err.message]||err.message||'تعذر إنشاء حساب المالك.');}
    finally{setBusy(false);}
  };

  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      const logged=await login(identifier,password);
      if(ADMIN_ROLES.includes(logged.role)){if(!isAdminPortal){await logout();throw new Error('ADMIN_REQUIRED')}setAdminUser(logged);return;}
      if(isAdminPortal){await logout();throw new Error('ADMIN_REQUIRED');}
      if(logged.role!=='student'){await logout();throw new Error('ACCOUNT_ROLE_INVALID');}
      setUser(logged);
    }catch(err){
      const messages={INVALID_CREDENTIALS:'كود الطالب أو اسم المستخدم أو كلمة المرور غير صحيحة.',BACKEND_NOT_CONFIGURED:'تعذر الاتصال بالخادم. راجع إعداد الربط.',SESSION_EXPIRED:'انتهت الجلسة. سجل الدخول مرة أخرى.',ADMIN_REQUIRED:'هذا الحساب غير مصرح له بدخول الإدارة.',ACCOUNT_ROLE_INVALID:'نوع الحساب غير صالح.',TOO_MANY_ATTEMPTS:'تم إيقاف محاولات الدخول مؤقتاً. حاول بعد 15 دقيقة.'};
      setError(messages[err.message]||err.message||'تعذر تسجيل الدخول.');
    }finally{setBusy(false);}
  };

  if(isAdminPortal&&needsSetup)return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submitBootstrap}><div className="auth-logo"><GraduationCap size={27}/></div><span className="auth-kicker">MEDIA ACADEMY CLOUD</span><h1>إنشاء حساب مالك المنصة</h1><p>دي خطوة التأسيس لمرة واحدة فقط. بعد إنشائها، إنشاء وإدارة كل الحسابات هيكون من لوحة الإدارة.</p><label>اسمك بالكامل<input value={ownerName} onChange={e=>setOwnerName(e.target.value)} required minLength={2}/></label><label>بريد الدخول للإدارة<input type="email" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} required autoComplete="email"/></label><label>كلمة مرور الإدارة<input type="password" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} required minLength={12} autoComplete="new-password"/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={busy}>{busy?'جارٍ إنشاء حساب المالك...':'إنشاء حساب المالك والدخول'}</button></form></div>;

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
