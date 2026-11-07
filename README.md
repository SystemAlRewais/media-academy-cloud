# Media Academy Cloud

الواجهة الرئيسية لمنصة Media Academy بهوية كحلي داكن وتركواز وذهبي، وواجهة عربية RTL متجاوبة.

## الملفات
- `index.html`: صفحة الدخول، اختيار نوع الحساب، التسجيل، ومساحة الطالب والإدارة.
- `assets/css/style.css`: الهوية البصرية والتصميم المتجاوب.
- `assets/js/config.js`: إعداد رابط خدمة النظام.
- `assets/js/app.js`: التفاعلات والاتصال بواجهة الخادم.

## ربط الخادم
عدّل `assets/js/config.js` وضع عنوان API الأساسي في `API_BASE_URL`.

الواجهة تتوقع المسارات التالية:
- `POST /auth/login` — يستقبل `identity, password, role, remember` ويعيد `token, user`.
- `POST /auth/register` — يستقبل بيانات طلب الطالب ويعيد رسالة تأكيد.
- `GET /api/student/{section}` و `GET /api/admin/{section}` — بيانات الأقسام حسب الدور.

الأقسام: `home, profile, courses, materials, lectures, schedule, exams, attendance, announcements, complaints, students, settings`.

## ملاحظة تشغيل وأمان
لا توجد حسابات افتراضية أو كلمات مرور تجريبية أو بيانات طلاب وهمية في هذا المشروع. لا تُفعّل تسجيل الدخول أو تنشره للاستخدام الفعلي قبل إعداد API آمن على الخادم؛ التحقق من كلمات المرور والصلاحيات وحالة اعتماد الطالب يجب أن يتم على الخادم، وليس داخل المتصفح. استخدم HTTPS، وخزّن كلمات المرور مشفّرة تجزئياً على الخادم، ولا تضع مفاتيح سرية في ملفات الواجهة.
