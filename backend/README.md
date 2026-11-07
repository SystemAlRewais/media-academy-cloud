# Google Apps Script setup

هذا السكربت يجب إنشاؤه من داخل Google Sheet نفسه:
1. افتح Google Sheet.
2. Extensions → Apps Script.
3. الصق `Code.gs` كاملًا.
4. Save.
5. Deploy → New deployment → Web app.
6. Execute as: Me.
7. Who has access: Anyone.
8. Deploy ثم انسخ رابط Web app.

عند فتح الموقع لأول مرة ينفذ `setup` تلقائيًا لإنشاء الجداول والحسابات الافتراضية. لا تضع Spreadsheet ID في الكود؛ السكربت مرتبط بالشيت ويستخدم Active Spreadsheet.
