# الفيوم للأعلاف والدواجن

واجهة كاشير وحجوزات عربية RTL مبنية بـ Next.js, Tailwind CSS وSupabase.

## تشغيل محلي

```bash
npm install
npm run dev
```

افتح `http://localhost:3000`. الواجهة تعمل ببيانات تجريبية حتى يتم إعداد Supabase.

## إعداد Supabase

1. أنشئ مشروعًا جديدًا من [supabase.com](https://supabase.com).
2. من SQL Editor شغّل محتوى `supabase/schema.sql` لإنشاء جدولي `items` و`orders` والسياسات الأساسية.
3. انسخ `.env.example` إلى `.env.local` وضع Project URL وanon key من Project Settings > API.
4. أعد تشغيل الخادم. ستُحفظ الطلبات وتحديثات حالتها في Supabase.

لتمكين إضافة وتعديل الأصناف من لوحة الأدمن، أضف `SUPABASE_SERVICE_ROLE_KEY` من Project Settings > API إلى `.env.local`. هذا المفتاح سري ولا يبدأ بـ `NEXT_PUBLIC_` ولا يوضع في الواجهة.

رفع الصور يحتاج تشغيل النسخة المحدثة من `supabase/schema.sql` لإنشاء عمود `image_url` وbucket باسم `item-images`. الصور المقبولة PNG وJPG وWebP وبحد أقصى 5MB.

تبويب «إعدادات الصفحة» يسمح للأدمن بتعديل اسم الصفحة والوصف واسم الفرع ورقمي الهاتف واللوجو الظاهرين للعملاء، بالإضافة إلى اسم الموظف وكلمة سر الأدمن والموظف. شغّل نسخة `supabase/schema.sql` المحدثة في Supabase قبل استخدام هذه الإعدادات. كلمات السر تحفظ مشفرة ولا تظهر في الواجهة.

إذا ظهر الخطأ `Could not find the table 'public.employees' in the schema cache`، افتح Supabase > SQL Editor وشغّل جزء إنشاء جدول `public.employees` الموجود في `supabase/schema.sql`، ثم نفّذ `notify pgrst, 'reload schema';`.

## حماية الأدمن

ضع رقمًا سريًا قويًا في `ADMIN_PIN` داخل `.env.local`. التحقق يتم على السيرفر، والرقم لا يوضع في `NEXT_PUBLIC_*` ولا يظهر للعملاء. جلسة الإدارة تحفظ في cookie محمية وتنتهي تلقائيًا بعد 8 ساعات.

يوجد دور موظف مستقل عبر `STAFF_PIN`. الموظف يدخل باختيار «موظف» ويرى الطلبات ويغير حالتها فقط، بينما اختيار «أدمن» يفتح كل تبويبات الإدارة. أضف `STAFF_PIN` إلى Vercel أيضًا.

> تسجيل الدخول بالهاتف عبر Supabase Auth يحتاج تفعيل Phone Provider من Authentication > Providers، ثم إضافة شاشة OTP قبل فتح الكاشير. حقل الهاتف الحالي يربط كل حجز مباشرة بالرقم بدون إنشاء حساب عميل.

## النشر على Vercel

ارفع المشروع إلى GitHub، ثم اختر المستودع من Vercel. أضف متغيري البيئة نفسهما في Project Settings > Environment Variables، وبعدها اضغط Deploy.

## نسخة احتياطية يومية في Google Sheets

يستطيع Google Apps Script نسخ الحجوزات الجديدة إلى Google Sheet مجانًا باستخدام Route التقرير المحمي و`REPORT_SECRET`. أضف هذا الكود إلى مشروع Apps Script بعد ضبط `SITE_URL` و`REPORT_SECRET` الموجودين فيه، ثم ضع معرّف الجدول في `SPREADSHEET_ID`:

```javascript
const SPREADSHEET_ID = "ضع_معرف_جدول_Google_Sheet_هنا";

function backupDailyBookingsToSheet() {
	const properties = PropertiesService.getScriptProperties();
	const endTime = new Date();
	const previousTime = properties.getProperty("lastSheetBackupAt");
	const startTime = previousTime
		? new Date(previousTime)
		: new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

	const requestUrl =
		`${SITE_URL}/api/reports/hourly?from=${encodeURIComponent(startTime.toISOString())}` +
		`&to=${encodeURIComponent(endTime.toISOString())}`;
	const response = UrlFetchApp.fetch(requestUrl, {
		headers: { "x-report-secret": REPORT_SECRET },
		muteHttpExceptions: true,
	});

	if (response.getResponseCode() !== 200) {
		throw new Error(response.getContentText());
	}

	const report = JSON.parse(response.getContentText());
	const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
	const sheet = spreadsheet.getSheetByName("الحجوزات") || spreadsheet.insertSheet("الحجوزات");

	if (sheet.getLastRow() === 0) {
		sheet.appendRow([
			"رقم الحجز",
			"اسم العميل",
			"الهاتف",
			"المحافظة",
			"المركز / المدينة",
			"الأصناف",
			"الإجمالي",
			"الحالة",
			"وقت الحجز",
			"وقت آخر تعديل",
			"الموظف",
		]);
		sheet.setFrozenRows(1);
	}

	const rows = report.newBookingDetails.map((order) => [
		order.id,
		order.customerName,
		order.phone,
		order.governorate,
		order.district || "",
		order.items.join("، "),
		order.total,
		order.status,
		new Date(order.createdAt),
		new Date(order.statusChangedAt),
		order.staffName || "",
	]);

	if (rows.length) {
		sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
		sheet.getRange(2, 9, sheet.getLastRow() - 1, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
	}

	properties.setProperty("lastSheetBackupAt", endTime.toISOString());
}
```

أنشئ Trigger للدالة `backupDailyBookingsToSheet` من النوع `Time-driven` ثم `Day timer`. لا تستخدم مفتاح `lastReportAt` الخاص بتقرير البريد؛ النسخ الاحتياطي يستخدم `lastSheetBackupAt` مستقلًا كي لا تتداخل المهمتان.

## أوامر التحقق

```bash
npm run lint
npm run build
```
