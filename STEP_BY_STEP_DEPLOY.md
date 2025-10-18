# 🚀 راهنمای گام به گام: راه‌اندازی ربات تلگرام با Render.com

## ⚠️ مهم: این راهنما را **مرحله به مرحله** دنبال کنید

این راهنما شما را قدم به قدم برای راه‌اندازی کامل ربات تلگرام با استفاده از **Render.com** همراهی می‌کند.

**⏱️ زمان تقریبی:** 30-45 دقیقه

---

## 📋 پیش‌نیاز: چیزهایی که نیاز دارید

1. ✅ یک حساب Telegram
2. ✅ یک حساب GitHub (برای save کردن کد)
3. ✅ یک حساب Render.com (رایگان)
4. ✅ کامپیوتر با اینترنت
5. ✅ یک ایمیل معتبر (برای تایید حساب Render)

---

## 🎯 مرحله 1: دریافت BOT TOKEN از تلگرام

### گام 1.1: باز کردن BotFather
1. تلگرام خود را باز کنید
2. در قسمت Search بنویسید: `@BotFather`
3. روی BotFather کلیک کنید و `/start` بزنید

### گام 1.2: ساخت ربات جدید
1. دستور `/newbot` را بفرستید
2. BotFather می‌پرسد: "Alright, a new bot. How are we going to call it?"
3. یک **نام** برای ربات خود انتخاب کنید (مثلاً: My Firewall Bot)
4. Enter بزنید

### گام 1.3: انتخاب Username
1. BotFather می‌پرسد: "Now let's choose a username"
2. یک **username** وارد کنید که با `bot` تمام شود (مثلاً: `MyFirewallTestBot`)
3. Enter بزنید

### گام 1.4: دریافت Token
پس از موفقیت، پیامی مثل این دریافت می‌کنید:

```
Done! Congratulations on your new bot...

Use this token to access the HTTP API:
7879361823:AAGqYsVH87CKtQAMaPZGwdQ0Tcw09Bs-C4U

For a description of the Bot API, see this page:
https://core.telegram.org/bots/api
```

**🔴 مهم: این TOKEN را کپی کنید و در جایی امن نگه دارید!**

مثال TOKEN:
```
7879361823:AAGqYsVH87CKtQAMaPZGwdQ0Tcw09Bs-C4U
```

---

## 🆔 مرحله 2: پیدا کردن User ID خودتان

### گام 2.1: باز کردن UserInfoBot
1. در تلگرام Search کنید: `@userinfobot`
2. روی آن کلیک کنید
3. `/start` بزنید

### گام 2.2: دریافت User ID
ربات پیامی مثل این می‌فرستد:

```
Id: 5076130392
First name: Your Name
Username: @yourusername
```

**🔴 مهم: عدد مقابل `Id:` را کپی کنید!**

مثال:
```
5076130392
```

---

## 💾 مرحله 3: ذخیره کردن کد در GitHub

### گام 3.1: Save to GitHub
1. در همین صفحه چت که هستید، پایین صفحه
2. دکمه **"Save to GitHub"** را پیدا کنید
3. روی آن کلیک کنید
4. اگر حساب GitHub ندارید، یکی بسازید (رایگان است)

### گام 3.2: تایید Save
1. اسم repository را وارد کنید (مثلاً: `telegram-firewall-bot`)
2. روی "Save" کلیک کنید
3. منتظر بمانید تا کامل شود

**✅ حالا کد شما در GitHub ذخیره شد!**

---

## ☁️ مرحله 4: راه‌اندازی حساب Render.com

### گام 4.1: ساخت حساب Render
1. به آدرس بروید: https://render.com
2. روی **"Get Started"** یا **"Sign Up"** کلیک کنید
3. می‌توانید با یکی از روش‌های زیر ثبت‌نام کنید:
   - 🔵 **GitHub** (توصیه می‌شود - راحت‌تر است)
   - 🔵 **GitLab**
   - 📧 **Email**

### گام 4.2: اتصال به GitHub
1. اگر با GitHub ثبت‌نام کردید، روی **"Authorize Render"** کلیک کنید
2. Render دسترسی به repository های شما را درخواست می‌کند
3. **"Authorize renderinc"** را بزنید

### گام 4.3: تایید ایمیل
1. یک ایمیل تایید به شما ارسال می‌شود
2. ایمیل خود را باز کنید
3. روی لینک تایید کلیک کنید

**✅ حالا حساب Render.com شما آماده است!**

**📸 نکته:** پس از ورود، یک Dashboard خالی خواهید دید که می‌گوید:
```
"Let's deploy your first project"
```

---

## 🗄️ مرحله 5: راه‌اندازی دیتابیس PostgreSQL در Render

**⚠️ نکته: این پروژه از PostgreSQL استفاده می‌کند**

### گام 5.1: ساخت PostgreSQL Database
1. در Dashboard رندر، روی **"New +"** کلیک کنید
2. از منوی باز شده، **"PostgreSQL"** را انتخاب کنید
3. یک صفحه فرم باز می‌شود

### گام 5.2: پر کردن اطلاعات دیتابیس
در صفحه New PostgreSQL:

| فیلد | مقدار پیشنهادی |
|------|----------------|
| **Name** | `firewall-bot-db` (یا هر نام دلخواه) |
| **Database** | `firewall_bot` (خودکار پر می‌شود) |
| **User** | `firewall_user` (خودکار پر می‌شود) |
| **Region** | انتخاب نزدیک‌ترین (مثلاً `Frankfurt (EU Central)` یا `Oregon (US West)`) |
| **PostgreSQL Version** | 16 (آخرین نسخه) |
| **Plan** | **Free** (رایگان - 90 روز رایگان، بعد از آن $7/ماه) |

### گام 5.3: ایجاد دیتابیس
1. روی **"Create Database"** کلیک کنید
2. صبر کنید تا دیتابیس ایجاد شود (معمولاً 1-2 دقیقه)
3. وقتی آماده شد، وضعیت به **"Available"** تغییر می‌کند

### گام 5.4: دریافت Connection String
پس از ایجاد دیتابیس، یک صفحه Info باز می‌شود:

1. به قسمت **"Connections"** بروید
2. دو نوع Connection String خواهید دید:
   - **Internal Database URL** (برای سرویس‌های داخلی Render)
   - **External Database URL** (برای دسترسی از بیرون)

3. **Connection String** با این فرمت است:
```
postgresql://firewall_user:xxxxxxxxxxxx@dpg-xxxxxxxxxxxxx.frankfurt-postgres.render.com/firewall_bot
```

**🔴 مهم: این Connection String را کپی کنید و در جای امنی نگه دارید!**

### گام 5.5: نکات امنیتی
- 🔒 هرگز Connection String را در GitHub یا جای عمومی قرار ندهید
- 🔑 این رشته شامل رمز عبور دیتابیس شماست
- 📋 آن را در Notepad یا یک فایل امن ذخیره کنید

**مثال واقعی:**
```
postgresql://firewall_user:abc123XYZ456def@dpg-ck7s8d9k8g0s73e4v5g0-a.frankfurt-postgres.render.com/firewall_bot
```

**✅ دیتابیس شما آماده شد!**

---

## 🔧 مرحله 6: راه‌اندازی Backend در Render

Backend باید روی یک سرور اجرا شود. در Render از **Web Service** استفاده می‌کنیم.

### گام 6.1: ایجاد Web Service جدید
1. در Dashboard رندر، روی **"New +"** کلیک کنید
2. **"Web Service"** را انتخاب کنید
3. صفحه **"Connect a repository"** باز می‌شود

### گام 6.2: اتصال Repository از GitHub
1. لیست repository های GitHub شما نمایش داده می‌شود
2. repository ای که در مرحله 3 ساختید را پیدا کنید
3. روی **"Connect"** کنار نام repository کلیک کنید

**📸 نکته:** اگر repository را نمی‌بینید:
- روی **"Configure account"** کلیک کنید
- دسترسی Render به repository مورد نظر را تایید کنید

### گام 6.3: پیکربندی Web Service

یک فرم با فیلدهای زیر نمایش داده می‌شود:

| فیلد | مقدار |
|------|-------|
| **Name** | `firewall-bot-backend` (یا نام دلخواه) |
| **Region** | همان Region دیتابیس (مثلاً `Frankfurt`) |
| **Branch** | `main` (یا `master` - branch اصلی شما) |
| **Root Directory** | خالی بگذارید |
| **Runtime** | **Node** |
| **Build Command** | `npm install && npm run migrate:deploy && npx prisma generate` |
| **Start Command** | `npm run bot:webhook` |
| **Plan** | **Free** (رایگان) |

**⚠️ نکته مهم:** Build Command باید دقیقاً همین باشد تا:
- Dependencies نصب شوند
- Database migrations اجرا شوند  
- Prisma Client تولید شود

### گام 6.4: تنظیم Environment Variables

قبل از Create کردن، به پایین صفحه بروید و **"Advanced"** را باز کنید.

در قسمت **Environment Variables**، این متغیرها را **یکی یکی** اضافه کنید:

#### متغیرهای ضروری:

```bash
# 1. توکن ربات (از مرحله 1)
BOT_TOKEN = 7879361823:AAGqYsVH87CKtQAMaPZGwdQ0Tcw09Bs-C4U

# 2. شناسه مالک (از مرحله 2)
BOT_OWNER_ID = 5076130392

# 3. یوزرنیم ربات (بدون @)
BOT_USERNAME = MyFirewallTestBot

# 4. آدرس دیتابیس (از مرحله 5)
DATABASE_URL = postgresql://firewall_user:abc123XYZ456def@dpg-xxx.frankfurt-postgres.render.com/firewall_bot

# 5. حالت اجرای ربات
BOT_START_MODE = webhook

# 6. پورت سرور
PORT = 3000
```

**🔴 توجه:** مقادیر بالا فقط مثال هستند! از مقادیر واقعی خودتان استفاده کنید.

### گام 6.5: ایجاد و Deploy

1. روی **"Create Web Service"** کلیک کنید
2. Render شروع به Build و Deploy می‌کند
3. این فرآیند 3-5 دقیقه طول می‌کشد

**📊 در این مدت می‌توانید:**
- Logs را در تب **"Logs"** دنبال کنید
- وضعیت Build را ببینید

### گام 6.6: دریافت URL Backend

پس از Deploy موفق:

1. در بالای صفحه، یک URL نمایش داده می‌شود:
```
https://firewall-bot-backend.onrender.com
```

2. این URL را کپی کنید

**🔴 مهم: این URL را نگه دارید - در مرحله بعد به آن نیاز دارید!**

### گام 6.7: تنظیم WEBHOOK_DOMAIN

حالا باید URL را به عنوان متغیر محیطی اضافه کنیم:

1. در صفحه Web Service، به تب **"Environment"** بروید
2. روی **"Add Environment Variable"** کلیک کنید
3. یک متغیر جدید اضافه کنید:

```bash
WEBHOOK_DOMAIN = https://firewall-bot-backend.onrender.com
```

4. روی **"Save Changes"** کلیک کنید
5. Render خودکار redeploy می‌کند (1-2 دقیقه)

### گام 6.8: بررسی وضعیت Backend

برای اطمینان از اینکه Backend کار می‌کند:

1. در مرورگر به این آدرس بروید:
```
https://firewall-bot-backend.onrender.com/healthz
```

2. اگر همه چیز درست باشد، پاسخ زیر را می‌بینید:
```json
{"status":"ok"}
```

**✅ Backend شما آماده است!**

---

## 🔄 مرحله 7: بررسی Database Migrations

**⚠️ خبر خوب:** اگر در Build Command مرحله 6.3 دقیقاً همان دستور را وارد کرده باشید، migrations خودکار اجرا شده است!

### گام 7.1: بررسی Logs

برای اطمینان از اینکه migrations اجرا شده:

1. در صفحه Web Service، به تب **"Logs"** بروید
2. دنبال این خطوط باشید:

```
Running migrations...
Prisma Migrate applied the following migrations:
  ✓ 20240101000000_init
  ✓ 20240102000000_add_tables
```

3. اگر این خطوط را دیدید ✅ **همه چیز درست است!**

### گام 7.2: در صورت خطا (اختیاری)

اگر خطای "table does not exist" دیدید:

**راه حل 1: از Render Shell استفاده کنید**

1. در صفحه Web Service، به تب **"Shell"** بروید
2. روی **"New Shell Session"** کلیک کنید
3. این دستورات را اجرا کنید:

```bash
npm run migrate:deploy
npx prisma generate
```

**راه حل 2: از کامپیوتر خودتان**

1. Terminal یا Command Prompt را باز کنید
2. این دستورات را اجرا کنید:

```bash
# Clone کردن repository (اگر قبلاً نکرده‌اید)
git clone https://github.com/[username]/[repo-name].git
cd [repo-name]

# نصب dependencies
npm install

# تنظیم DATABASE_URL از محیط
# در ویندوز:
set DATABASE_URL=postgresql://firewall_user:password@dpg-xxx.render.com/firewall_bot

# در Mac/Linux:
export DATABASE_URL=postgresql://firewall_user:password@dpg-xxx.render.com/firewall_bot

# اجرای migrations
npm run migrate:deploy

# Generate Prisma Client
npx prisma generate
```

**✅ Database شما آماده است!**

---

## 🤖 مرحله 8: تست ربات

### گام 8.1: یافتن ربات در تلگرام
1. تلگرام خود را باز کنید
2. در Search بنویسید: `@[username_ربات_شما]`
3. روی ربات کلیک کنید

### گام 8.2: شروع ربات
1. دکمه **"START"** را بزنید
2. اگر ربات پاسخ داد ✅ **موفق بودید!**

### گام 8.3: تست Owner Panel
1. دستور `/panel` را بفرستید
2. باید پنل مدیریت باز شود
3. اگر نشد، چک کنید `BOT_OWNER_ID` درست است یا نه

---

## 🌐 مرحله 9: Deploy کردن Mini App در Render (Static Site)

Mini App یک وب اپلیکیشن React است که باید به صورت Static Site منتشر شود.

### گام 9.1: ایجاد Static Site جدید

1. در Dashboard رندر، روی **"New +"** کلیک کنید
2. **"Static Site"** را انتخاب کنید
3. همان repository را که قبلاً وصل کردید، انتخاب کنید
4. روی **"Connect"** کلیک کنید

### گام 9.2: پیکربندی Static Site

| فیلد | مقدار |
|------|-------|
| **Name** | `firewall-bot-miniapp` (یا نام دلخواه) |
| **Branch** | `main` (یا `master`) |
| **Root Directory** | خالی بگذارید |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### گام 9.3: تنظیم Environment Variables برای Build

در قسمت **"Advanced"** > **"Environment Variables"**:

**🔴 مهم:** این متغیر برای Build Time است:

```bash
# URL Backend که در مرحله 6 دریافت کردید
VITE_API_BASE_URL = https://firewall-bot-backend.onrender.com/api/v1
```

**توضیح:** 
- Vite از متغیرهای محیطی با پیشوند `VITE_` استفاده می‌کند
- این URL برای ارتباط Mini App با Backend استفاده می‌شود

### گام 9.4: ویرایش فایل wrangler.toml (اختیاری)

**⚠️ توجه:** چون دیگر از Cloudflare Worker استفاده نمی‌کنیم، این فایل را می‌توانید نادیده بگیرید یا حذف کنید.

اگر می‌خواهید فایل را نگه دارید (برای مرجع)، محتوای آن را به این شکل تغییر دهید:

```toml
# این فایل دیگر استفاده نمی‌شود
# پروژه روی Render.com deploy شده است
# 
# name = "tg-firewall-worker"
# main = "worker/index.ts"
# compatibility_date = "2025-01-12"
```

### گام 9.5: ایجاد Static Site

1. روی **"Create Static Site"** کلیک کنید
2. Render شروع به Build می‌کند (3-5 دقیقه)
3. منتظر بمانید تا Deploy کامل شود

### گام 9.6: دریافت URL Mini App

پس از Deploy موفق:

1. در بالای صفحه، URL را می‌بینید:
```
https://firewall-bot-miniapp.onrender.com
```

2. این URL را کپی کنید

**🔴 مهم: این URL Mini App شما است!**

### گام 9.7: تست Mini App

1. URL را در مرورگر باز کنید
2. باید صفحه Mini App را ببینید
3. اگر خطای API دریافت کردید، نگران نباشید - در مرحله بعد درست می‌شود

**✅ Mini App شما Deploy شد!**

---

## 🔗 مرحله 10: اتصال Mini App به Backend

حالا باید Backend را مطلع کنیم که Mini App کجاست.

### گام 10.1: تنظیم MINI_APP_URL در Backend

1. به صفحه **Web Service** (Backend) در Render برگردید
2. به تب **"Environment"** بروید
3. روی **"Add Environment Variable"** کلیک کنید
4. متغیر جدید اضافه کنید:

```bash
MINI_APP_URL = https://firewall-bot-miniapp.onrender.com
```

**🔴 توجه:** از URL دقیق Static Site خود استفاده کنید!

5. روی **"Save Changes"** کلیک کنید
6. Render خودکار Backend را redeploy می‌کند (1-2 دقیقه)

### گام 10.2: بررسی متغیرهای محیطی

در این مرحله، Backend شما باید این متغیرها را داشته باشد:

```bash
✅ BOT_TOKEN
✅ BOT_OWNER_ID
✅ BOT_USERNAME
✅ DATABASE_URL
✅ BOT_START_MODE = webhook
✅ PORT = 3000
✅ WEBHOOK_DOMAIN = https://firewall-bot-backend.onrender.com
✅ MINI_APP_URL = https://firewall-bot-miniapp.onrender.com
```

---

## 📱 مرحله 11: تنظیم Menu Button در BotFather

حالا باید به ربات بگوییم که Mini App کجاست.

### گام 11.1: باز کردن BotFather
1. به تلگرام بروید
2. `@BotFather` را جستجو کنید
3. وارد چت شوید

### گام 11.2: تنظیم Menu Button
1. دستور `/mybots` را بفرستید
2. ربات خود را از لیست انتخاب کنید
3. روی **"Bot Settings"** کلیک کنید
4. روی **"Menu Button"** کلیک کنید
5. روی **"Configure Menu Button"** کلیک کنید

### گام 11.3: وارد کردن URL
1. BotFather می‌پرسد: "Send me the URL"
2. URL Mini App خود را بفرستید:
```
https://firewall-bot-miniapp.onrender.com
```

3. Enter بزنید

### گام 11.4: تایید
BotFather پیامی می‌فرستد:
```
Success! Menu button URL updated.
```

**✅ Menu Button تنظیم شد!**

**📸 نکته:** حالا در چت ربات، یک دکمه Menu در کنار فیلد پیام نمایش داده می‌شود.

---

## ✅ مرحله 12: تست نهایی

### گام 12.1: تست ربات در چت خصوصی
1. تلگرام خود را باز کنید
2. به ربات خود بروید (`@[username_ربات_شما]`)
3. دستور `/start` را بفرستید
4. اگر ربات پاسخ داد ✅ **موفق بودید!**

### گام 12.2: تست Owner Panel
1. دستور `/panel` را بفرستید
2. باید پنل مدیریت باز شود
3. اگر نشد، چک کنید `BOT_OWNER_ID` درست است یا نه

### گام 12.3: تست Mini App
1. روی دکمه Menu (کنار فیلد پیام) کلیک کنید
2. یا روی دکمه **"Management Panel"** کلیک کنید
3. Mini App باید باز شود! 🎉
4. باید رابط کاربری زیبای داشبورد را ببینید

### گام 12.4: تست در گروه
1. یک گروه تست بسازید
2. ربات را به گروه اضافه کنید
3. ربات را **Admin** کنید (با تمام دسترسی‌ها)
4. در گروه `/start` بزنید
5. یک لینک بفرستید
6. اگر Firewall فعال باشد، لینک پاک می‌شود

---

## 🎉 تبریک! ربات شما آماده است!

### چک‌لیست نهایی:
- ✅ حساب Render.com ساخته شد
- ✅ دیتابیس PostgreSQL در Render راه‌اندازی شد
- ✅ Backend (Web Service) در Render Deploy شد
- ✅ Mini App (Static Site) در Render Deploy شد
- ✅ ربات در تلگرام پاسخ می‌دهد
- ✅ `/panel` کار می‌کند
- ✅ Mini App باز می‌شود و رابط کاربری نمایش داده می‌شود
- ✅ Database به Backend متصل است
- ✅ Firewall قوانین را اجرا می‌کند

---

## 🆘 مشکل دارید?

### مشکل 1: ربات پاسخ نمی‌دهد
**راه حل:**
1. به Railway بروید
2. Logs را چک کنید
3. اگر خطای "DATABASE" دیدید، migrations را دوباره اجرا کنید

### مشکل 2: Mini App باز نمی‌شود
**راه حل:**
1. چک کنید `MINI_APP_URL` درست است
2. Railway را restart کنید
3. Menu Button در BotFather را دوباره تنظیم کنید

### مشکل 3: Webhook Error
**راه حل:**
این دستور را در Terminal اجرا کنید:
```bash
curl "https://api.telegram.org/bot[YOUR_TOKEN]/setWebhook?url=https://[RAILWAY_URL]/telegram/webhook"
```

---

## 📚 مراحل بعدی

حالا که ربات شما کار می‌کند:
1. قوانین Firewall تنظیم کنید
2. ربات را به گروه‌های خود اضافه کنید
3. از پنل Owner استفاده کنید
4. Stars Payment را تست کنید

---

**🎊 ربات شما زنده است و آماده استفاده! 🎊**
