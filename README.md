# Media Academy — نسخة واجهة مستقلة

موقع أكاديمية إعلامية بواجهة عربية RTL، يعمل حالياً كتجربة Front-end مستقلة دون Google Apps Script أو قاعدة بيانات سحابية.

## التشغيل
- افتح `index.html` مباشرة أو انشر المستودع على GitHub Pages.
- البيانات التجريبية تحفظ في Local Storage على نفس المتصفح والجهاز.
- لا توجد أي مفاتيح API أو روابط تخزين سحابي في هذه النسخة.

## دخول تجريبي
- الإدارة: `admin` / `admin123`
- الطالب: `AZ1001` / `1234`

## الملفات
- `index.html`: نقطة الدخول.
- `styles.css`: التصميم المتجاوب.
- `app.js`: تسجيل الدخول والتسجيل والواجهات والبيانات المحلية.
- `sheets/`: قوالب CSV لأوراق Google Sheets المستقبلية.

## أوراق Google Sheets المقترحة
Students, Admins, Materials, Lectures, Schedules, Exams, Grades, Attendance, Announcements, Complaints, Settings.

## حدود النسخة الحالية
هذه نسخة عرض وتجربة وليست نظام إنتاج آمناً. تسجيل الدخول محلي ويمكن تجاوز الحماية من أدوات المتصفح، وكلمات المرور التجريبية محفوظة محلياً. تسجيل الحضور تجريبي ولا يتحقق من الموقع الجغرافي. عند ربط Apps Script يجب نقل التحقق والصلاحيات وكلمات المرور إلى الخادم وعدم الاعتماد على Local Storage.

## نشر GitHub Pages
من إعدادات المستودع: Settings → Pages → Deploy from a branch → main / root.
