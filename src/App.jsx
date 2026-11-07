import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, BookOpen, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, CircleHelp, Clock3, FileText, GraduationCap,
  Hash, Home, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, Search, Send, Settings, Shield, ShieldAlert, ShieldCheck,
  Users, UserCircle, X, Zap, Globe2, Award, MapPin, Mail, Phone, Camera,
  MessageSquareText, Pin, ThumbsUp, Heart, Image, Smile, Video, Mic
} from 'lucide-react';
import { APP_CONFIG, COHORTS } from './config.js';
import AdminApp from './admin/AdminApp.jsx';

const initialMessages = [
  { id: 1, name: 'مريم أحمد', cohort: 'الفرقة الثانية', time: 'منذ دقيقتين', text: 'يا جماعة حد معاه ملخص محاضرة التسويق؟', replies: 8, likes: 12, tag: 'مساعدة دراسية', color: 'lavender' },
  { id: 2, name: 'عمر خالد', cohort: 'الفرقة الرابعة', time: 'منذ 12 دقيقة', text: 'تم رفع جدول امتحانات الميدتيرم، بالتوفيق للجميع ❤️', replies: 14, likes: 27, tag: 'إعلان طلابي', color: 'mint' },
  { id: 3, name: 'سارة محمود', cohort: 'الفرقة الأولى', time: 'منذ 25 دقيقة', text: 'مين مهتم نعمل جروب مذاكرة لمادة مدخل الإعلام؟', replies: 5, likes: 9, tag: 'مناقشة', color: 'gold' }
];

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
  const [role, setRole] = useState('student');
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
    setDraft(''); setShowNewPost(false); notify('تم نشر مشاركتك في المنتدى التجريبي');
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
    return <Overview setPage={setPage} />;
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
      <header className="topbar"><div className="top-left"><IconButton onClick={() => setMenuOpen(true)} title="القائمة"><Menu/></IconButton><div className="breadcrumb">بوابة الطالب <ChevronLeft size={14}/><b>{pageTitle}</b></div></div><div className="top-actions">{onLogout && <IconButton onClick={() => onLogout()} title="تسجيل الخروج"><LogOut/></IconButton>}<div className="online-pill"><span className="live-dot"/> وضع العرض التجريبي</div><IconButton onClick={() => notify('لا توجد إشعارات جديدة')} title="الإشعارات"><Bell/><i/></IconButton><div className="top-avatar">{(currentUser?.full_name || 'أ').slice(0,1)}</div></div></header>
      <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">السبت، ٧ نوفمبر ٢٠٢٦ <span>•</span> الفصل الدراسي الأول</div><h1>{page === 'overview' ? `أهلاً بيك، ${currentUser?.full_name || 'أحمد'} 👋` : pageTitle}</h1><p>{page === 'overview' ? 'كل تفاصيل رحلتك الجامعية في مكان واحد.' : 'تابع تفاصيلك وخدماتك الجامعية من مكان واحد.'}</p></div><div className="heading-actions"><button className="btn-outline" onClick={() => notify('سيتم تفعيل المزامنة بعد ربط النظام')}><Activity size={16}/> حالة النظام</button></div></div>{renderPage()}</div>
    </main>
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function Overview({setPage}) {
  return <>
    <div className="welcome-banner"><div className="welcome-copy"><span className="banner-kicker"><Zap size={13}/> مساحتك الجامعية الذكية</span><h2>مستقبلك يبدأ من هنا.</h2><p>تابع دراستك، تواصل مع زملائك، وخلّي كل تفاصيلك الجامعية تحت عينك.</p><button onClick={() => setPage('profile')}>افتح ملفك الجامعي <ChevronLeft size={16}/></button></div><div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="cap-illustration"><GraduationCap size={74}/></div><span className="float-tag tag-one"><Award size={15}/> إنجازاتك</span><span className="float-tag tag-two"><MessageCircle size={15}/> مجتمعك</span></div></div>
    <div className="section-head"><div><h3>ملخصك الجامعي</h3><p>نظرة سريعة على أهم بياناتك</p></div><button className="text-link" onClick={() => setPage('profile')}>عرض الملف بالكامل <ChevronLeft size={15}/></button></div>
    <div className="stats-grid"><Stat icon={Hash} label="كود الطالب" value="20241038" note="الرقم الجامعي الخاص بك" tone="blue"/><Stat icon={BookOpen} label="المواد المسجلة" value="6 مواد" note="للفصل الدراسي الحالي" tone="purple"/><Stat icon={CalendarDays} label="نسبة الحضور" value="92%" note="حتى آخر تحديث تجريبي" tone="green"/><Stat icon={ShieldCheck} label="الحالة الجامعية" value="منتظم" note="لا توجد إجراءات معلقة" tone="gold"/></div>
    <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>آخر المستجدات</h3><p>كل جديد يخص دراستك</p></div><button className="text-link" onClick={() => setPage('announcements')}>كل الإعلانات <ChevronLeft size={14}/></button></div><div className="notice-row"><div className="notice-icon purple"><CalendarDays/></div><div className="notice-copy"><b>جدول المحاضرات الأسبوعي</b><small>تم تحديث جدول الفرقة الثالثة</small><span>منذ ٣ ساعات</span></div><span className="unread-dot"/></div><div className="notice-row"><div className="notice-icon teal"><MessageCircle/></div><div className="notice-copy"><b>نقاش جديد في المنتدى</b><small>مناقشة: مشروع التخرج وأفكار الفرق</small><span>منذ ٥ ساعات</span></div></div><div className="notice-row"><div className="notice-icon gold"><FileText/></div><div className="notice-copy"><b>مادة جديدة متاحة</b><small>تم رفع مرجع لمادة الإعلام الرقمي</small><span>أمس</span></div></div></div><div className="panel quick-panel"><div className="panel-head"><div><h3>وصول سريع</h3><p>خدماتك الأكثر استخداماً</p></div></div><div className="quick-grid"><Quick icon={UserCircle} label="ملفي الجامعي" onClick={() => setPage('profile')}/><Quick icon={MessageCircle} label="المنتدى الطلابي" onClick={() => setPage('forum')}/><Quick icon={ShieldCheck} label="السجل الجامعي" onClick={() => setPage('discipline')}/><Quick icon={BookOpen} label="المحتوى الدراسي" onClick={() => setPage('study')}/></div></div></div>
  </>;
}

function Stat({icon:Icon,label,value,note,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Quick({icon:Icon,label,onClick}) { return <button className="quick-item" onClick={onClick}><span><Icon size={20}/></span><b>{label}</b><ChevronLeft size={15}/></button>; }

function Profile({notify,currentUser}) {
  const [tab,setTab] = useState('personal');
  return <div className="profile-layout"><div className="profile-main"><div className="profile-hero"><div className="profile-cover"><div className="cover-pattern"/></div><div className="profile-identity"><div className="profile-avatar">أ<button title="تغيير الصورة" onClick={() => notify('رفع الصورة يتاح بعد ربط التخزين')}><Camera size={14}/></button></div><div className="identity-copy"><div className="identity-name"><h2>{currentUser?.full_name || 'أحمد سمير محمد'}</h2><span className="verified"><ShieldCheck size={13}/> طالب مقيد</span></div><p>الفرقة الثالثة <i>•</i> قسم الإعلام الرقمي <i>•</i> أكاديمية الإعلام</p><div className="identity-tags"><span><Hash size={13}/> {currentUser?.student_code || '20241038'}</span><span><MapPin size={13}/> الحرم الرئيسي</span></div></div><button className="btn-outline edit-btn" onClick={() => notify('سيتم فتح تعديل البيانات بعد ربط قاعدة البيانات')}>تعديل الملف <Settings size={15}/></button></div><div className="profile-tabs">{[['personal','البيانات الشخصية'],['academic','البيانات الأكاديمية'],['contact','التواصل']].map(([id,label])=><button className={tab===id?'selected':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div></div>
    <div className="panel profile-details"><div className="panel-head"><div><h3>{tab==='personal'?'المعلومات الشخصية':tab==='academic'?'المعلومات الأكاديمية':'بيانات التواصل'}</h3><p>بيانات ملفك الجامعي المسجلة لدى الأكاديمية</p></div><span className="private-label"><Shield size={13}/> بيانات خاصة</span></div><div className="details-grid">{(tab==='personal'?[['الاسم بالكامل','أحمد سمير محمد'],['الرقم القومي','••••••••••••••'],['تاريخ الميلاد','١٥ مايو ٢٠٠٥'],['النوع','ذكر'],['الجنسية','مصري'],['العنوان','القاهرة، مصر']]:tab==='academic'?[['كود الطالب',currentUser?.student_code || '20241038'],['الفرقة الدراسية',currentUser?.cohort_id || 'الفرقة الثالثة'],['القسم',currentUser?.department || 'الإعلام الرقمي'],['العام الدراسي','2026 / 2027'],['حالة القيد','منتظم'],['تاريخ الالتحاق','سبتمبر 2024']]:[['البريد الإلكتروني','ahmed.student@example.com'],['رقم الهاتف','0100 000 0000'],['جهة اتصال للطوارئ','متاح لدى الإدارة'],['العنوان','القاهرة، مصر']]).map(([k,v])=><div className="detail-field" key={k}><small>{k}</small><b>{v}</b></div>)}</div></div>
    <div className="panel"><div className="panel-head"><div><h3>ملخص المسيرة الأكاديمية</h3><p>مؤشرات عامة عن وضعك الدراسي</p></div></div><div className="academic-strip"><div><BookOpen/><b>6</b><small>مواد مسجلة</small></div><div><Award/><b>جيد جداً</b><small>التقدير التراكمي</small></div><div><CalendarDays/><b>92%</b><small>نسبة الحضور</small></div><div><ShieldCheck/><b>سليم</b><small>الموقف الانضباطي</small></div></div></div>
  </div><aside className="profile-side"><div className="panel status-panel"><div className="status-orb"><ShieldCheck size={27}/></div><h3>موقفك الجامعي</h3><span className="status-good">منتظم – لا توجد مخالفات مسجلة</span><p>ملفك الجامعي لا يحتوي على جزاءات أو إجراءات انضباطية في البيانات التجريبية.</p><button className="text-link" onClick={()=>notify('يتم عرض السجل الكامل في قسم السجل الجامعي')}>عرض السجل الكامل <ChevronLeft size={14}/></button></div><div className="panel"><div className="panel-head"><div><h3>الملف والمستندات</h3><p>مستنداتك الجامعية</p></div></div>{['بطاقة الطالب','إثبات القيد','إيصال المصروفات'].map((x,i)=><div className="document-row" key={x}><div className="doc-icon"><FileText size={17}/></div><div><b>{x}</b><small>{i===0?'بطاقة رقمية': 'متاح لدى شؤون الطلاب'}</small></div><ChevronLeft size={15}/></div>)}</div></aside></div>;
}

function Forum({posts,cohortFilter,setCohortFilter,activeForum,setActiveForum,search,setSearch,liked,setLiked,draft,setDraft,addPost,showNewPost,setShowNewPost}) {
  const forums = ['المنتدى العام',...COHORTS];
  return <div className="forum-layout"><aside className="forum-rooms panel"><div className="rooms-title"><div><h3>مساحات النقاش</h3><p>مجتمع الأكاديمية</p></div><button className="round-add" title="إنشاء مساحة"><Plus size={17}/></button></div><div className="room-search"><Search size={15}/><input placeholder="ابحث عن منتدى..." /></div><button className={`room-link ${activeForum==='المنتدى العام'?'current':''}`} onClick={()=>{setActiveForum('المنتدى العام');setCohortFilter('كل الفرق')}}><span className="room-avatar general"><Globe2 size={18}/></span><span><b>المنتدى العام</b><small>كل طلاب الأكاديمية</small></span><i className="room-online">●</i></button><div className="room-label">منتديات الفرق الدراسية</div>{COHORTS.map((f,i)=><button key={f} className={`room-link ${activeForum===f?'current':''}`} onClick={()=>{setActiveForum(f);setCohortFilter(f)}}><span className={`room-avatar room-${i}`}><Users size={17}/></span><span><b>{f}</b><small>{[84,72,65,58][i]} عضو</small></span><i className="room-online">●</i></button>)}<div className="room-foot"><span className="live-dot"/> <span>المنتديات متاحة لكل الفرق</span></div></aside>
    <section className="forum-feed"><div className="forum-top panel"><div><div className="forum-title-line"><span className="forum-title-icon"><MessageSquareText/></span><div><h2>{activeForum}</h2><p>شارك، اسأل، وتواصل مع زملائك</p></div></div></div><div className="forum-online"><span className="live-dot"/> <b>متصلون الآن</b><strong>—</strong></div></div>
      <div className="forum-toolbar"><div className="feed-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث في النقاشات..." /></div><select value={cohortFilter} onChange={e=>{setCohortFilter(e.target.value);setActiveForum(e.target.value==='كل الفرق'?'المنتدى العام':e.target.value)}}><option>كل الفرق</option>{COHORTS.map(f=><option key={f}>{f}</option>)}</select><button className="btn-primary" onClick={()=>setShowNewPost(!showNewPost)}><Plus size={17}/> موضوع جديد</button></div>
      {showNewPost&&<div className="panel composer"><div className="composer-head"><b>ابدأ نقاشاً جديداً</b><button onClick={()=>setShowNewPost(false)}><X size={17}/></button></div><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="اكتب سؤالك أو شارك فكرتك مع زملائك..."/><div className="composer-bottom"><div><button><Paperclip size={16}/></button><button><Image size={16}/></button><button><Smile size={16}/></button></div><button className="btn-primary" onClick={addPost}><Send size={15}/> نشر المشاركة</button></div></div>}
      <div className="feed-label"><b>أحدث النقاشات</b><span>{posts.length} موضوع</span></div>
      {posts.map(p=><article className="post-card panel" key={p.id}><div className="post-head"><div className={`post-avatar ${p.color}`}>{p.name[0]}</div><div className="post-author"><b>{p.name}</b><small>{p.cohort} <i>•</i> {p.time}</small></div><span className="post-tag">{p.tag}</span><button className="more-button"><MoreHorizontal size={19}/></button></div><p className="post-text">{p.text}</p><div className="post-actions"><button className={liked.includes(p.id)?'is-liked':''} onClick={()=>setLiked(liked.includes(p.id)?liked.filter(x=>x!==p.id):[...liked,p.id])}><Heart size={16} fill={liked.includes(p.id)?'currentColor':'none'}/> {p.likes+(liked.includes(p.id)?1:0)} إعجاب</button><button><MessageCircle size={16}/> {p.replies} ردود</button><button><Pin size={15}/> حفظ</button><span className="post-status"><span className="live-dot"/> نقاش مفتوح</span></div></article>)}
      {posts.length===0&&<div className="empty-state"><MessageCircle size={30}/><b>لسه مفيش نقاشات هنا</b><span>ابدأ أول موضوع وخلّي الحوار يبدأ.</span></div>}
      <div className="demo-note"><Activity size={15}/> عرض توضيحي: الرسائل الحالية تجريبية، وسيتم تفعيل المحادثات الحية والمزامنة بين الطلاب بعد ربط خدمة الوقت الفعلي.</div>
    </section></div>;
}

function Discipline() {
  return <><div className="discipline-banner"><div className="discipline-emblem"><ShieldCheck size={34}/></div><div><span>السجل الانضباطي</span><h2>موقفك الانضباطي: سليم</h2><p>يظهر هنا أي تنبيه أو مخالفة أو إجراء رسمي تم تسجيله على كود الطالب.</p></div><span className="status-good">لا توجد مخالفات</span></div><div className="stats-grid"><Stat icon={ShieldCheck} label="مخالفات مسجلة" value="0" note="حتى تاريخ اليوم" tone="green"/><Stat icon={AlertTriangle} label="تنبيهات" value="0" note="لا توجد تنبيهات نشطة" tone="gold"/><Stat icon={FileText} label="إجراءات رسمية" value="0" note="لا توجد قرارات" tone="blue"/><Stat icon={CheckCircle2} label="حالة الملف" value="سليم" note="لا توجد إجراءات معلقة" tone="purple"/></div><div className="panel"><div className="panel-head"><div><h3>السجل التاريخي للأحداث</h3><p>كل ما تم تسجيله على ملفك الجامعي بالترتيب الزمني</p></div><span className="private-label"><Shield size={13}/> مرئي للطالب والإدارة المخولة</span></div><div className="timeline"><div className="timeline-item"><span className="timeline-dot green-dot"/><div><b>إنشاء الملف الجامعي</b><p>تم تسجيل الطالب على النظام وإصدار الكود الجامعي.</p><small>سبتمبر ٢٠٢٤ <i>•</i> حدث إداري</small></div><span className="event-chip">معلومة</span></div><div className="timeline-item"><span className="timeline-dot blue-dot"/><div><b>تأكيد القيد للعام الدراسي 2026 / 2027</b><p>تم تحديث حالة القيد إلى طالب منتظم.</p><small>أكتوبر ٢٠٢٦ <i>•</i> تحديث حالة</small></div><span className="event-chip">تحديث</span></div></div><div className="notice-box"><Shield size={17}/><span>أي مخالفة مستقبلية يجب أن تتضمن تاريخ الواقعة، وصفها، الجهة المسجلة، الإجراء المتخذ، وحالة التظلم. لا يُسجل جزاء نهائي إلا بواسطة صلاحية إدارية معتمدة.</span></div></div></>;
}

function Study() { return <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>المحتوى الدراسي</h3><p>المراجع والكتب الخاصة بفرقتك</p></div><span className="private-label">الفرقة الثالثة</span></div>{['مدخل إلى الإعلام الرقمي','نظريات الاتصال','التسويق الإلكتروني','إنتاج المحتوى المرئي'].map((x,i)=><div className="document-row" key={x}><div className="doc-icon"><BookOpen size={17}/></div><div><b>{x}</b><small>{i+2} ملفات متاحة • آخر تحديث هذا الأسبوع</small></div><ChevronLeft size={15}/></div>)}</div><div className="panel"><div className="panel-head"><div><h3>الامتحانات والتقييم</h3><p>مواعيد ونتائجك</p></div></div><div className="empty-state compact"><CalendarDays size={27}/><b>لا توجد امتحانات قريبة</b><span>ستظهر المواعيد والنتائج هنا عند اعتمادها.</span></div></div></div>; }
function Attendance() { return <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>حضور المحاضرات</h3><p>سجل حضورك ومواعيد الجلسات</p></div><span className="status-good">92% حضور</span></div><div className="attendance-card"><div className="attendance-icon"><MapPin/></div><div><b>تسجيل حضور المحاضرة</b><p>عند فتح جلسة الحضور من الإدارة، استخدم الكود والموقع داخل النطاق المحدد.</p></div><button className="btn-primary" onClick={()=>alert('تسجيل الحضور غير متاح في وضع العرض التجريبي')}>تسجيل الحضور</button></div><div className="notice-box"><Shield size={17}/> لا يتم تسجيل موقعك إلا عند طلب تسجيل الحضور وبموافقتك، ويُتحقق من النطاق الجغرافي على الخادم.</div></div><div className="panel"><div className="panel-head"><div><h3>ملخص الحضور</h3><p>الفصل الدراسي الحالي</p></div></div><div className="attendance-summary"><strong>92%</strong><span>نسبة الحضور</span><div className="progress"><i/></div><small>23 حضور • 2 غياب • 0 تأخير</small></div></div></div>; }
function Announcements() { return <div className="panel"><div className="panel-head"><div><h3>الإعلانات والرسائل</h3><p>التنبيهات الرسمية الموجهة لك</p></div></div>{['تحديث جدول محاضرات الفرقة الثالثة','فتح باب التسجيل في الأنشطة الطلابية','إتاحة مراجع مادة الإعلام الرقمي'].map((x,i)=><div className="notice-row" key={x}><div className="notice-icon teal"><Bell/></div><div className="notice-copy"><b>{x}</b><small>إدارة الأكاديمية • موجه لطلاب الفرقة الثالثة</small><span>{i+1} نوفمبر ٢٠٢٦</span></div></div>)}</div>; }
function Support({notify}) { const [message,setMessage]=useState(''); return <div className="panel support-panel"><div className="panel-head"><div><h3>الشكاوى والمقترحات</h3><p>صوتك مهم، ابعت رسالتك للإدارة المختصة</p></div></div><label>نوع الطلب<select><option>مقترح</option><option>شكوى</option><option>استفسار</option></select></label><label>عنوان الرسالة<input placeholder="اكتب عنواناً مختصراً"/></label><label>تفاصيل الرسالة<textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="اكتب تفاصيل طلبك هنا..."/></label><button className="btn-primary" onClick={()=>{if(message.trim()){notify('تم حفظ الطلب في العرض التجريبي');setMessage('')}}}>إرسال الطلب <Send size={15}/></button></div>; }

export default App;
