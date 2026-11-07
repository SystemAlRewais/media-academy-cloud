import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, BookOpen, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, CircleHelp, Clock3, FileText, GraduationCap,
  Hash, Home, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, Search, Send, Settings, Shield, ShieldAlert, ShieldCheck,
  Users, UserCircle, X, Zap, Globe2, Award, MapPin, Mail, Phone, Camera,
  MessageSquareText, Pin, ThumbsUp, Heart, Image, Smile, Video, Mic
} from 'lucide-react';
import { APP_CONFIG, COHORTS } from './config.js';
import { api } from './services/api.js';
import AdminApp from './admin/AdminApp.jsx';

const initialMessages = [];

const navItems = [
  ['overview','الرئيسية',LayoutDashboard], ['profile','ملفي الجامعي',UserCircle],
  ['forum','المنتدى الطلابي',MessageCircle], ['study','المحتوى الدراسي',BookOpen],
  ['attendance','الحضور والمحاضرات',CalendarDays], ['discipline','السجل الجامعي',ShieldCheck],
  ['announcements','الإعلانات والرسائل',Bell], ['support','الشكاوى والمقترحات',CircleHelp], ['admin','إدارة المنصة',Settings]
];

function IconButton({ children, onClick, title }) {
  return <button className="icon-button" onClick={onClick} title={title}>{children}</button>;
}

function App({ currentUser, onLogout }) {
  const [page, setPage] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('كل الفرق');
  const [posts, setPosts] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [activeForum, setActiveForum] = useState('المنتدى العام');
  const [search, setSearch] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [liked, setLiked] = useState([]);
  const [toast, setToast] = useState('');

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const visiblePosts = useMemo(() => posts.filter(p => (cohortFilter === 'كل الفرق' || p.cohort === cohortFilter) && (p.text.includes(search) || p.name.includes(search))), [posts, cohortFilter, search]);

  const addPost = () => {
    if (!draft.trim()) return;
    setPosts([{ id: Date.now(), name: 'أحمد سمير', cohort: 'الفرقة الثالثة', time: 'الآن', text: draft.trim(), replies: 0, likes: 0, tag: 'مناقشة', color: 'blue' }, ...posts]);
    setDraft(''); setShowNewPost(false); notify('تمت إضافة المشاركة إلى العرض الحالي فقط');
  };

  const pageTitle = navItems.find(n => n[0] === page)?.[1] || 'الرئيسية';
  const renderPage = () => {
    if (page === 'profile') return <Profile notify={notify} currentUser={currentUser} />;
    if (page === 'forum') return <Forum posts={visiblePosts} cohortFilter={cohortFilter} setCohortFilter={setCohortFilter} activeForum={activeForum} setActiveForum={setActiveForum} search={search} setSearch={setSearch} liked={liked} setLiked={setLiked} draft={draft} setDraft={setDraft} addPost={addPost} showNewPost={showNewPost} setShowNewPost={setShowNewPost} />;
    if (page === 'discipline') return <Discipline />;
    if (page === 'study') return <Study />;
    if (page === 'attendance') return <Attendance />;
    if (page === 'announcements') return <Announcements />;
    if (page === 'support') return <Support notify={notify} />;
    return <Overview setPage={setPage} currentUser={currentUser} />;
  };

  if (page === 'admin') return <AdminApp onExit={() => setPage('overview')} />;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={24}/></div><div><strong>{APP_CONFIG.name}</strong><small>SMART CAMPUS CLOUD</small></div><button className="close-menu" onClick={() => setMenuOpen(false)}><X/></button></div>
      <div className="campus-chip"><span className="live-dot"/><span>الأكاديمية الرئيسية</span><ChevronDown size={15}/></div>
      <div className="nav-caption">القائمة الرئيسية</div>
      <nav>{navItems.map(([id,label,Icon]) => <button key={id} className={`nav-link ${page===id?'active':''}`} onClick={() => {setPage(id);setMenuOpen(false);}}><Icon size={18}/><span>{label}</span>{id==='forum'&&<i className="nav-count">4</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>محتاج مساعدة؟</b><p>فريق الدعم معاك في أي وقت.</p><button onClick={() => setPage('support')}>تواصل مع الدعم <ChevronLeft size={14}/></button></div><div className="user-mini"><div className="avatar">أ</div><div className="user-mini-info"><b>{currentUser?.full_name || 'أحمد سمير'}</b><small>كود الطالب: {currentUser?.student_code || '20241038'}</small></div><MoreHorizontal size={20}/></div></div>
    </aside>
    {menuOpen && <div className="mobile-scrim" onClick={() => setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><IconButton onClick={() => setMenuOpen(true)} title="القائمة"><Menu/></IconButton><div className="breadcrumb">بوابة الطالب <ChevronLeft size={14}/><b>{pageTitle}</b></div></div><div className="top-actions">{onLogout && <IconButton onClick={() => onLogout()} title="تسجيل الخروج"><LogOut/></IconButton>}<div className="online-pill"><span className="live-dot"/> متصل بالمنصة</div><IconButton onClick={() => notify('لا توجد إشعارات جديدة')} title="الإشعارات"><Bell/><i/></IconButton><div className="top-avatar">{(currentUser?.full_name || 'أ').slice(0,1)}</div></div></header>
      <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">السبت، ٧ نوفمبر ٢٠٢٦ <span>•</span> الفصل الدراسي الأول</div><h1>{page === 'overview' ? `أهلاً بيك، ${currentUser?.full_name || 'أحمد'} 👋` : pageTitle}</h1><p>{page === 'overview' ? 'كل تفاصيل رحلتك الجامعية في مكان واحد.' : 'تابع تفاصيلك وخدماتك الجامعية من مكان واحد.'}</p></div><div className="heading-actions"><button className="btn-outline" onClick={() => notify('سيتم تفعيل المزامنة بعد ربط النظام')}><Activity size={16}/> حالة النظام</button></div></div>{renderPage()}</div>
    </main>
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function Overview({setPage,currentUser}) {
  const content=useRemoteRows('listContent'),attendance=useRemoteRows('listAttendance'),announcements=useRemoteRows('listAnnouncements'),grades=useRemoteRows('listGrades');
  const present=attendance.rows.filter(r=>r.status==='present').length;
  const attendanceRate=attendance.rows.length?Math.round(present/attendance.rows.length*100)+'%':'—';
  return <><div className="welcome-banner"><div className="welcome-copy"><span className="banner-kicker"><Zap size={13}/> مساحتك الجامعية الذكية</span><h2>مستقبلك يبدأ من هنا.</h2><p>تابع دراستك، تواصل مع زملائك، وخلّي كل تفاصيلك الجامعية تحت عينك.</p><button onClick={()=>setPage('profile')}>افتح ملفك الجامعي <ChevronLeft size={16}/></button></div><div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="cap-illustration"><GraduationCap size={74}/></div><span className="float-tag tag-one"><Award size={15}/> إنجازاتك</span><span className="float-tag tag-two"><MessageCircle size={15}/> مجتمعك</span></div></div><div className="section-head"><div><h3>ملخصك الجامعي</h3><p>بيانات فعلية مرتبطة بحسابك</p></div><button className="text-link" onClick={()=>setPage('profile')}>عرض الملف بالكامل <ChevronLeft size={15}/></button></div><div className="stats-grid"><Stat icon={Hash} label="كود الطالب" value={currentUser?.student_code||'—'} note="الرقم الجامعي الخاص بك" tone="blue"/><Stat icon={BookOpen} label="ملفات المحتوى" value={content.busy?'…':content.rows.length} note="المتاح لحسابك" tone="purple"/><Stat icon={CalendarDays} label="نسبة الحضور" value={attendance.busy?'…':attendanceRate} note="من سجلات الحضور" tone="green"/><Stat icon={Award} label="الدرجات المنشورة" value={grades.busy?'…':grades.rows.length} note="نتائج معتمدة" tone="gold"/></div><div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>آخر الإعلانات</h3><p>المستجدات الرسمية الخاصة بك</p></div><button className="text-link" onClick={()=>setPage('announcements')}>كل الإعلانات <ChevronLeft size={14}/></button></div>{announcements.busy?<div className="empty-state compact">جارٍ تحميل الإعلانات...</div>:announcements.error?<div className="empty-state compact">تعذر تحميل الإعلانات</div>:announcements.rows.slice(0,4).map((a,i)=><div className="notice-row" key={a.announcement_id||i}><div className="notice-icon teal"><Bell/></div><div className="notice-copy"><b>{a.title||'إعلان'}</b><small>{a.body||''}</small><span>{a.created_at||''}</span></div></div>)}{!announcements.busy&&!announcements.rows.length&&<div className="empty-state compact">لا توجد إعلانات حالياً</div>}</div><div className="panel quick-panel"><div className="panel-head"><div><h3>وصول سريع</h3><p>خدماتك الأكثر استخداماً</p></div></div><div className="quick-grid"><Quick icon={UserCircle} label="ملفي الجامعي" onClick={()=>setPage('profile')}/><Quick icon={MessageCircle} label="المنتدى الطلابي" onClick={()=>setPage('forum')}/><Quick icon={ShieldCheck} label="السجل الجامعي" onClick={()=>setPage('discipline')}/><Quick icon={BookOpen} label="المحتوى الدراسي" onClick={()=>setPage('study')}/></div></div></div></>;
}

function Stat({icon:Icon,label,value,note,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Quick({icon:Icon,label,onClick}) { return <button className="quick-item" onClick={onClick}><span><Icon size={20}/></span><b>{label}</b><ChevronLeft size={15}/></button>; }

function Profile({notify,currentUser}) {
  const [tab,setTab]=useState('personal');
  const fields=tab==='personal'?
    [['الاسم بالكامل',currentUser?.full_name],['كود الطالب',currentUser?.student_code],['حالة الحساب',currentUser?.status]]:
    tab==='academic'?
    [['الفرقة الدراسية',currentUser?.cohort_id],['القسم',currentUser?.department],['الدور',currentUser?.role]]:
    [['البريد الإلكتروني',currentUser?.email],['رقم الهاتف',currentUser?.phone]];
  return <div className="profile-layout"><div className="profile-main"><div className="profile-hero"><div className="profile-cover"><div className="cover-pattern"/></div><div className="profile-identity"><div className="profile-avatar">{(currentUser?.full_name||'ط').slice(0,1)}</div><div className="identity-copy"><div className="identity-name"><h2>{currentUser?.full_name||'الطالب'}</h2><span className="verified"><ShieldCheck size={13}/> حساب طالب</span></div><p>الملف الجامعي المسجل في الأكاديمية</p><div className="identity-tags"><span><Hash size={13}/> {currentUser?.student_code||'—'}</span></div></div></div><div className="profile-tabs">{[['personal','البيانات الشخصية'],['academic','البيانات الأكاديمية'],['contact','التواصل']].map(([id,label])=><button className={tab===id?'selected':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div></div><div className="panel profile-details"><div className="panel-head"><div><h3>بيانات الحساب</h3><p>المعلومات المسجلة فعلياً في قاعدة الأكاديمية</p></div><span className="private-label"><Shield size={13}/> بيانات خاصة</span></div><div className="details-grid">{fields.map(([k,v])=><div className="detail-field" key={k}><small>{k}</small><b>{v||'غير مسجل'}</b></div>)}</div></div></div><aside className="profile-side"><div className="panel status-panel"><div className="status-orb"><ShieldCheck size={27}/></div><h3>حالة الحساب</h3><span className="status-good">{currentUser?.status==='active'?'نشط':'راجع الإدارة'}</span><p>تعرض هذه الصفحة بيانات الحساب المتاحة فقط، دون بيانات شخصية غير مسجلة.</p></div></aside></div>;
}

function Forum() {
  const [rooms,setRooms]=useState([]),[roomId,setRoomId]=useState(''),[posts,setPosts]=useState([]),[draft,setDraft]=useState(''),[search,setSearch]=useState(''),[busy,setBusy]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
  const loadRooms=()=>api('forumRooms').then(r=>{const list=r.data||[];setRooms(list);if(!roomId&&list.length)setRoomId(list[0].room_id)}).catch(e=>setError(e.message||'تعذر تحميل المنتديات'));
  useEffect(()=>{loadRooms()},[]);
  useEffect(()=>{if(!roomId)return;let live=true;setBusy(true);api('forumFeed',{room_id:roomId}).then(r=>{if(live)setPosts(r.data||[])}).catch(e=>{if(live)setError(e.message||'تعذر تحميل النقاشات')}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[roomId]);
  const active=rooms.find(r=>r.room_id===roomId);
  const publish=async()=>{if(!draft.trim()||!roomId)return;setSending(true);setError('');try{await api('createForumPost',{room_id:roomId,body:draft.trim()});setDraft('');const r=await api('forumFeed',{room_id:roomId});setPosts(r.data||[])}catch(e){setError(e.message||'تعذر نشر المشاركة')}finally{setSending(false)}};
  const filtered=posts.filter(p=>String(p.body||'').includes(search));
  return <div className="forum-layout"><aside className="forum-rooms panel"><div className="rooms-title"><div><h3>مساحات النقاش</h3><p>كل منتديات الأكاديمية</p></div></div>{rooms.map((r,i)=><button key={r.room_id} className={`room-link ${roomId===r.room_id?'current':''}`} onClick={()=>setRoomId(r.room_id)}><span className={`room-avatar room-${i%4}`}>{r.room_type==='general'?<Globe2 size={18}/>:<Users size={17}/>}</span><span><b>{r.name}</b><small>{r.room_type==='general'?'كل الطلاب':'منتدى فرقة دراسية'}</small></span></button>)}{rooms.length===0&&!busy&&<small>لم يتم إنشاء منتديات بعد.</small>}</aside><section className="forum-feed"><div className="forum-top panel"><div className="forum-title-line"><span className="forum-title-icon"><MessageSquareText/></span><div><h2>{active?.name||'المنتدى الطلابي'}</h2><p>شارك، اسأل، وتواصل مع زملائك</p></div></div></div><div className="forum-toolbar"><div className="feed-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث في النقاشات..."/></div><button className="btn-primary" onClick={()=>document.getElementById('forum-composer')?.focus()}><Plus size={17}/> موضوع جديد</button></div><div className="panel composer"><div className="composer-head"><b>ابدأ نقاشاً جديداً</b></div><textarea id="forum-composer" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="اكتب سؤالك أو شارك فكرتك مع زملائك..."/><div className="composer-bottom"><span>المشاركة ستظهر في المنتدى المحدد</span><button className="btn-primary" disabled={sending||!draft.trim()||!roomId} onClick={publish}><Send size={15}/>{sending?'جارٍ النشر...':'نشر المشاركة'}</button></div></div>{error&&<div className="demo-note">{error}</div>}<div className="feed-label"><b>أحدث النقاشات</b><span>{filtered.length} موضوع</span></div>{busy?<div className="empty-state">جارٍ تحميل النقاشات...</div>:filtered.map(p=><article className="post-card panel" key={p.post_id}><div className="post-head"><div className="post-avatar blue">{(p.author_name||'ط').slice(0,1)}</div><div className="post-author"><b>{p.author_name||'طالب'}</b><small>{p.created_at||''}</small></div><span className="post-tag">مناقشة</span></div><p className="post-text">{p.body}</p><div className="post-actions"><span><MessageCircle size={16}/> {(p.replies||[]).length} ردود</span><span className="post-status"><span className="live-dot"/> منشور</span></div></article>)}{!busy&&filtered.length===0&&<div className="empty-state"><MessageCircle size={30}/><b>لا توجد نقاشات هنا حتى الآن</b><span>ابدأ أول موضوع في هذا المنتدى.</span></div>}</section></div>;
}

function useRemoteRows(action) {
  const [rows,setRows]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let live=true;api(action).then(r=>{if(live)setRows(r.data||[])}).catch(e=>{if(live)setError(e.message||'تعذر تحميل البيانات')}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[action]);
  return {rows,busy,error};
}
function EmptyRemote({busy,error,children}) {
  if(busy)return <div className="empty-state compact">جارٍ تحميل البيانات...</div>;
  if(error)return <div className="empty-state compact">{error==='SESSION_EXPIRED'?'انتهت الجلسة، سجل الدخول مرة أخرى.':'تعذر الاتصال بالخادم. حاول تحديث الصفحة.'}</div>;
  return children;
}
function Discipline() {
  const {rows,busy,error}=useRemoteRows('disciplineHistory');
  return <div className="panel"><div className="panel-head"><div><h3>السجل التاريخي للأحداث</h3><p>السجلات المعتمدة على ملفك الجامعي</p></div><span className="private-label"><Shield size={13}/> بيانات خاصة</span></div><EmptyRemote busy={busy} error={error}>{rows.length===0?<div className="empty-state compact"><ShieldCheck size={28}/><b>لا توجد أحداث مسجلة</b><span>لا توجد سجلات انضباطية متاحة لملفك حالياً.</span></div>:<div className="timeline">{rows.map((r,i)=><div className="timeline-item" key={r.event_id||i}><span className="timeline-dot blue-dot"/><div><b>{r.title||r.event_type||'حدث انضباطي'}</b><p>{r.description||r.decision||'لا يوجد وصف إضافي'}</p><small>{r.recorded_at||''}</small></div><span className="event-chip">{r.status||'مسجل'}</span></div>)}</div>}</EmptyRemote></div>;
}
function Study() {
  const content=useRemoteRows('listContent'),grades=useRemoteRows('listGrades');
  return <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>المحتوى الدراسي</h3><p>المراجع والملفات المتاحة لحسابك</p></div></div><EmptyRemote busy={content.busy} error={content.error}>{content.rows.length===0?<div className="empty-state compact"><BookOpen size={27}/><b>لا يوجد محتوى منشور</b><span>سيظهر المحتوى هنا بعد إضافته من الإدارة.</span></div>:content.rows.map((x,i)=><a className="document-row" key={x.content_id||i} href={x.file_url||undefined} target="_blank" rel="noreferrer"><div className="doc-icon"><BookOpen size={17}/></div><div><b>{x.title||'محتوى دراسي'}</b><small>{x.description||x.content_type||''}</small></div><ChevronLeft size={15}/></a>)}</EmptyRemote></div><div className="panel"><div className="panel-head"><div><h3>الامتحانات والتقييم</h3><p>الدرجات المعتمدة</p></div></div><EmptyRemote busy={grades.busy} error={grades.error}>{grades.rows.length===0?<div className="empty-state compact"><CalendarDays size={27}/><b>لا توجد نتائج منشورة</b><span>ستظهر درجاتك بعد اعتمادها من الإدارة.</span></div>:grades.rows.map((g,i)=><div className="document-row" key={g.grade_id||i}><div className="doc-icon"><Award size={17}/></div><div><b>{g.subject_id||'المادة'}</b><small>{g.score??'—'} من {g.total_marks??'—'}</small></div></div>)}</EmptyRemote></div></div>;
}
function Attendance() {
  const history=useRemoteRows('listAttendance');
  const [sessions,setSessions]=useState([]),[sessionId,setSessionId]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const loadSessions=()=>api('openAttendanceSessions').then(r=>{setSessions(r.data||[]);if(!sessionId&&r.data?.length)setSessionId(r.data[0].session_id)}).catch(()=>setMessage('تعذر تحميل جلسات الحضور المفتوحة.'));
  useEffect(()=>{loadSessions()},[]);
  const checkIn=()=>{
    if(!sessionId||!code.trim())return;
    if(!navigator.geolocation){setMessage('المتصفح لا يدعم تحديد الموقع.');return}
    setBusy(true);setMessage('بانتظار موافقة الموقع...');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{await api('checkIn',{session_id:sessionId,code,latitude:pos.coords.latitude,longitude:pos.coords.longitude});setMessage('تم تسجيل حضورك بنجاح.');setCode('');await loadSessions();}
      catch(e){setMessage(({OUTSIDE_ALLOWED_AREA:'أنت خارج النطاق الجغرافي المسموح.',INVALID_ATTENDANCE_CODE:'كود الحضور غير صحيح.',ALREADY_CHECKED_IN:'تم تسجيل حضورك في هذه الجلسة من قبل.',SESSION_CLOSED:'جلسة الحضور مغلقة.'})[e.message]||'تعذر تسجيل الحضور. تحقق من الكود والجلسة.')}
      finally{setBusy(false)}
    },err=>{setBusy(false);setMessage(err.code===1?'يجب السماح للموقع لتسجيل الحضور.':'تعذر تحديد موقعك، حاول مرة أخرى.')},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  const present=history.rows.filter(r=>r.status==='present').length;
  return <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>تسجيل حضور المحاضرة</h3><p>اختر الجلسة وأدخل الكود ثم اسمح بتحديد موقعك</p></div></div>{sessions.length===0?<div className="empty-state compact"><MapPin size={27}/><b>لا توجد جلسات حضور مفتوحة</b><span>ستظهر الجلسات هنا عندما تفتح الإدارة تسجيل الحضور.</span></div>:<div className="attendance-card"><div className="attendance-icon"><MapPin/></div><div className="attendance-check-form"><label>المحاضرة<select value={sessionId} onChange={e=>setSessionId(e.target.value)}>{sessions.map(x=><option key={x.session_id} value={x.session_id}>{x.lecture_title}</option>)}</select></label><label>كود الحضور<input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" placeholder="أدخل الكود السري"/></label><button className="btn-primary" disabled={busy||!code.trim()} onClick={checkIn}>{busy?'جارٍ التحقق...':'تسجيل الحضور'}</button></div></div>}{message&&<div className="notice-box"><Shield size={17}/>{message}</div>}<div className="notice-box"><Shield size={17}/> لا يتم إرسال موقعك إلا بعد الضغط على تسجيل الحضور وموافقتك. يتم التحقق من النطاق الجغرافي على الخادم.</div></div><div className="panel"><div className="panel-head"><div><h3>سجل حضورك</h3><p>عمليات الحضور المسجلة</p></div></div><EmptyRemote busy={history.busy} error={history.error}>{history.rows.length===0?<div className="empty-state compact">لا توجد سجلات حضور بعد.</div>:history.rows.map((r,i)=><div className="document-row" key={r.attendance_id||i}><div className="doc-icon"><CalendarDays size={17}/></div><div><b>{r.status==='present'?'حضور مثبت':r.status||'حالة الحضور'}</b><small>{r.checked_at||''}</small></div></div>)}</EmptyRemote><div className="attendance-summary"><strong>{history.rows.length?Math.round(present/history.rows.length*100)+'%':'—'}</strong><span>نسبة الحضور المسجلة</span><small>{present} حضور من إجمالي {history.rows.length} سجل</small></div></div></div>;
}

function Announcements() {
  const {rows,busy,error}=useRemoteRows('listAnnouncements');
  return <div className="panel"><div className="panel-head"><div><h3>الإعلانات والرسائل</h3><p>الإعلانات الرسمية الموجهة لحسابك</p></div></div><EmptyRemote busy={busy} error={error}>{rows.length===0?<div className="empty-state compact"><Bell size={27}/><b>لا توجد إعلانات حالياً</b></div>:rows.map((x,i)=><div className="notice-row" key={x.announcement_id||i}><div className="notice-icon teal"><Bell/></div><div className="notice-copy"><b>{x.title||'إعلان'}</b><small>{x.body||''}</small><span>{x.created_at||''}</span></div></div>)}</EmptyRemote></div>;
}
function Support({notify}) {
  const [message,setMessage]=useState(''),[subject,setSubject]=useState(''),[category,setCategory]=useState('inquiry'),[busy,setBusy]=useState(false);
  const send=async()=>{if(!subject.trim()||!message.trim())return;setBusy(true);try{await api('createTicket',{subject,body:message,category});notify('تم إرسال الطلب للإدارة بنجاح');setMessage('');setSubject('')}catch(e){notify(e.message==='SESSION_EXPIRED'?'انتهت الجلسة، سجل الدخول مرة أخرى.':'تعذر إرسال الطلب، حاول مرة أخرى.')}finally{setBusy(false)}};
  return <div className="panel support-panel"><div className="panel-head"><div><h3>الشكاوى والمقترحات</h3><p>سيصل طلبك إلى لوحة الإدارة</p></div></div><label>نوع الطلب<select value={category} onChange={e=>setCategory(e.target.value)}><option value="suggestion">مقترح</option><option value="complaint">شكوى</option><option value="inquiry">استفسار</option></select></label><label>عنوان الرسالة<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="اكتب عنواناً مختصراً"/></label><label>تفاصيل الرسالة<textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="اكتب تفاصيل طلبك هنا..."/></label><button className="btn-primary" disabled={busy||!subject.trim()||!message.trim()} onClick={send}>{busy?'جارٍ الإرسال...':'إرسال الطلب'} <Send size={15}/></button></div>;
}

export default App;
