# Media Academy Cloud

منصة إدارة أكاديمية عربية، بواجهة ثابتة على GitHub Pages وقاعدة بيانات Google Sheets عبر Google Apps Script.

## الملفات الأساسية
- `index.html`: الموقع كاملًا (واجهة الطالب ولوحة الإدارة).
- `backend/Code.gs`: واجهة API التي تقرأ وتكتب في Google Sheets.
- `Media_Academy_Cloud_Database.xlsx`: قالب الجداول. ارفعه إلى Google Drive وافتحه كـ Google Sheets.

## التشغيل
1. ارفع ملف Excel إلى Google Drive وافتحه باستخدام Google Sheets.
2. من داخل الشيت افتح Extensions → Apps Script.
3. استبدل محتوى `Code.gs` بالكود الموجود في `backend/Code.gs` ثم Save.
4. Deploy → New deployment → Web app. اختر Execute as: Me و Who has access: Anyone ثم Deploy.
5. انسخ رابط Web app وأرسله لي لأربطه في `index.html`.
6. انتظر نجاح GitHub Actions ثم افتح رابط GitHub Pages.

## حسابات البداية
- الإدارة: `Owner` / `4455445`
- الطالب التجريبي: `AZ1` / `5656`

ينشئ السكربت الجداول والحسابين تلقائيًا عند أول تشغيل. غيّر كلمات المرور بعد أول دخول.

## التخزين
Google Sheets يخزن بيانات المنصة وروابط الكتب والملفات. ملفات PDF والفيديو نفسها يجب رفعها إلى Google Drive، ثم حفظ رابط المشاركة في سجل الكتاب أو المحتوى.
