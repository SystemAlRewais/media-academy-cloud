import React,{useEffect,useState} from 'react';
import {GraduationCap,UserRound,LogIn,ShieldCheck} from 'lucide-react';
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
  const [adminPin,setAdminPin]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!APP_CONFIG.appsScriptUrl){setChecking(false);return;}
    if(!getSessionToken()){setChecking(false);return;}
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

  const submitAdminPin=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      const r=await api('adminPinLogin',{data:{pin:adminPin}},{public:true});
      saveSessionToken(r.token);setAdminUser(r.user);setAdminPin('');
    }catch(err){
      const messages={INVALID_ADMIN_PIN:'كود الإدارة غير صحيح.',TOO_MANY_ATTEMPTS:'تم إيقاف المحاولات مؤقتًا. حاول بعد 15 دقيقة.',BACKEND_NOT_CONFIGURED:'تعذر الاتصال بالخادم.'};
      setError(messages[err.message]||err.message||'تعذر دخول الإدارة.');
    }finally{setBusy(false);}
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

  if(isAdminPortal)return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submitAdminPin}>
    <div className="auth-logo"><ShieldCheck size={27}/></div>
    <span className="auth-kicker">MEDIA ACADEMY CLOUD</span>
    <h1>دخول الإدارة</h1>
    <p>أدخل رمز الإدارة للانتقال إلى لوحة التحكم الرئيسية.</p>
    <label>رمز الإدارة<input type="password" inputMode="numeric" value={adminPin} onChange={e=>setAdminPin(e.target.value.replace(/\\D/g,'').slice(0,8))} placeholder="••••••••" required minLength={8} maxLength={8} autoComplete="off"/></label>
    {error&&<div className="auth-error">{error}</div>}
    <button className="auth-submit" disabled={busy||adminPin.length!==8}><ShieldCheck size={16}/>{busy?'جارٍ التحقق...':'دخول لوحة الإدارة'}</button>
  </form></div>;

  return <div className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={submit}>
    <div className="auth-logo"><GraduationCap size={27}/></div>
    <span className="auth-kicker">MEDIA ACADEMY CLOUD</span>
    <h1>أهلاً بيك في بوابتك الجامعية</h1>
    <p>سجل دخولك لمتابعة ملفك وخدماتك والتواصل مع زملائك.</p>
    <label>كود الطالب<input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="أدخل كود الطالب" required autoComplete="username"/></label>
    <label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
    {error&&<div className="auth-error">{error}</div>}
    <button className="auth-submit" disabled={busy}><LogIn size={16}/>{busy?'جارٍ التحقق...':'تسجيل الدخول'}</button>
  </form></div>;
}
