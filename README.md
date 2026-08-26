# رَشفة

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

تبويب «إعدادات الصفحة» يسمح للأدمن بتعديل اسم الصفحة والوصف واسم الفرع ورقمي الهاتف واللوجو الظاهرين للعملاء.

## حماية الأدمن

ضع رقمًا سريًا قويًا في `ADMIN_PIN` داخل `.env.local`. التحقق يتم على السيرفر، والرقم لا يوضع في `NEXT_PUBLIC_*` ولا يظهر للعملاء. جلسة الإدارة تحفظ في cookie محمية وتنتهي تلقائيًا بعد 8 ساعات.

> تسجيل الدخول بالهاتف عبر Supabase Auth يحتاج تفعيل Phone Provider من Authentication > Providers، ثم إضافة شاشة OTP قبل فتح الكاشير. حقل الهاتف الحالي يربط كل حجز مباشرة بالرقم بدون إنشاء حساب عميل.

## النشر على Vercel

ارفع المشروع إلى GitHub، ثم اختر المستودع من Vercel. أضف متغيري البيئة نفسهما في Project Settings > Environment Variables، وبعدها اضغط Deploy.

## أوامر التحقق

```bash
npm run lint
npm run build
```
