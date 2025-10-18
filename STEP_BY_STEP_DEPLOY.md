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

## 🆘 عیب‌یابی: راهنمای حل مشکلات رایج

### ❌ مشکل 1: ربات پاسخ نمی‌دهد

**علائم:**
- وقتی `/start` می‌زنید، ربات جواب نمی‌دهد
- ربات offline به نظر می‌رسد

**راه حل‌ها:**

**گام 1: بررسی Logs Backend**
1. به Dashboard رندر بروید
2. به صفحه **Web Service** (Backend) بروید
3. تب **"Logs"** را باز کنید
4. دنبال خطاها باشید

**خطاهای رایج:**

```
Error: DATABASE_URL is not defined
```
**حل:** متغیر `DATABASE_URL` را در Environment Variables اضافه کنید.

```
Error: connect ECONNREFUSED
```
**حل:** چک کنید دیتابیس Available است (در صفحه PostgreSQL).

```
Error: relation "User" does not exist
```
**حل:** Migrations اجرا نشده‌اند. به مرحله 7 برگردید.

**گام 2: Redeploy کردن**
1. در صفحه Web Service، به تب **"Manual Deploy"** بروید
2. روی **"Deploy latest commit"** کلیک کنید
3. منتظر بمانید تا Deploy کامل شود

**گام 3: بررسی Webhook**
1. این دستور را در Terminal اجرا کنید:
```bash
curl "https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getWebhookInfo"
```

2. خروجی باید این باشد:
```json
{
  "ok": true,
  "result": {
    "url": "https://firewall-bot-backend.onrender.com/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

3. اگر URL غلط بود، آن را ست کنید:
```bash
curl "https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=https://[YOUR_RENDER_URL]/telegram/webhook"
```

---

### ❌ مشکل 2: Mini App باز نمی‌شود

**علائم:**
- روی دکمه Menu یا Management Panel کلیک می‌کنید ولی هیچ اتفاقی نمی‌افتد
- Mini App یک صفحه خالی نمایش می‌دهد

**راه حل‌ها:**

**گام 1: بررسی URL در BotFather**
1. به `@BotFather` بروید
2. `/mybots` بزنید
3. ربات خود → Bot Settings → Menu Button
4. چک کنید URL درست است:
```
https://firewall-bot-miniapp.onrender.com
```

**گام 2: بررسی MINI_APP_URL در Backend**
1. به صفحه Web Service بروید
2. تب **"Environment"** → چک کنید `MINI_APP_URL` درست است

**گام 3: بررسی Static Site**
1. به صفحه **Static Site** بروید
2. مطمئن شوید وضعیت **"Live"** است
3. URL را در مرورگر باز کنید - باید صفحه Mini App را ببینید

**گام 4: Rebuild Static Site**
1. در صفحه Static Site، به **"Manual Deploy"** بروید
2. روی **"Clear build cache & deploy"** کلیک کنید

---

### ❌ مشکل 3: خطای Database Connection

**علائم:**
```
Error: Can't reach database server
Error: Connection timeout
```

**راه حل‌ها:**

**گام 1: چک کردن وضعیت Database**
1. به صفحه **PostgreSQL** در رندر بروید
2. مطمئن شوید Status = **"Available"** است
3. اگر Suspended است، روی **"Resume"** کلیک کنید

**گام 2: بررسی Connection String**
1. در صفحه PostgreSQL، Connection String را دوباره کپی کنید
2. به صفحه Web Service بروید
3. `DATABASE_URL` را Update کنید

**گام 3: اجرای Migrations دوباره**
1. در صفحه Web Service، تب **"Shell"** را باز کنید
2. این دستورات را اجرا کنید:
```bash
npm run migrate:deploy
npx prisma generate
```

---

### ❌ مشکل 4: Mini App خطای API می‌دهد

**علائم:**
- Mini App باز می‌شود ولی داده‌ای نمایش نمی‌دهد
- در Console مرورگر خطای 404 یا 500 می‌بینید

**راه حل‌ها:**

**گام 1: بررسی VITE_API_BASE_URL**
1. به صفحه **Static Site** بروید
2. تب **"Environment"** را باز کنید
3. چک کنید `VITE_API_BASE_URL` درست است:
```
https://firewall-bot-backend.onrender.com/api/v1
```

4. اگر تغییر دادید، Rebuild کنید

**گام 2: تست Backend API**
1. در مرورگر به این آدرس بروید:
```
https://firewall-bot-backend.onrender.com/healthz
```

2. باید جواب بگیرید:
```json
{"status":"ok"}
```

3. اگر خطا دیدید، به لاگ‌های Backend نگاه کنید

---

### ❌ مشکل 5: Free Plan Sleeping

**علائم:**
- ربات بعد از مدتی پاسخ نمی‌دهد
- اولین درخواست بعد از مدتی 30-60 ثانیه طول می‌کشد

**توضیح:**
پلن رایگان Render بعد از 15 دقیقه بی‌استفاده، سرویس را **Sleep** می‌کند.

**راه حل‌های موقت:**

**راه حل 1: Health Check خودکار (UptimeRobot)**
1. به https://uptimerobot.com بروید
2. یک Monitor جدید بسازید:
   - Type: HTTP(s)
   - URL: `https://firewall-bot-backend.onrender.com/healthz`
   - Interval: 5 دقیقه
3. این کار Backend را بیدار نگه می‌دارد

**راه حل 2: Upgrade به Paid Plan**
- پلن Starter: $7/ماه
- سرویس همیشه بیدار می‌ماند
- منابع بیشتر

---

### ❌ مشکل 6: Build Failed

**علائم:**
```
Build failed with exit code 1
npm ERR! Missing script: "build"
```

**راه حل‌ها:**

**برای Web Service (Backend):**
- Build Command باید باشد:
```
npm install && npm run migrate:deploy && npx prisma generate
```

**برای Static Site (Mini App):**
- Build Command باید باشد:
```
npm install && npm run build
```

- Publish Directory باید باشد:
```
dist
```

---

### ❌ مشکل 7: Environment Variables کار نمی‌کنند

**راه حل:**

1. **Backend (Web Service):**
   - متغیرها را در تب **Environment** اضافه کنید
   - بعد از هر تغییر، **Save Changes** را بزنید
   - Render خودکار redeploy می‌کند

2. **Mini App (Static Site):**
   - متغیرها باید با `VITE_` شروع شوند
   - مثال: `VITE_API_BASE_URL`
   - بعد از تغییر، حتماً **Rebuild** کنید

---

### ❌ مشکل 8: Deploy می‌شود ولی کار نمی‌کند

**چک‌لیست کامل:**

```
✅ 1. PostgreSQL: Status = Available
✅ 2. Web Service: Status = Live  
✅ 3. Static Site: Status = Live
✅ 4. همه Environment Variables درست هستند
✅ 5. Build Commands درست هستند
✅ 6. Logs هیچ خطایی ندارند
✅ 7. /healthz پاسخ می‌دهد
✅ 8. Webhook درست تنظیم شده
✅ 9. Menu Button در BotFather درست است
✅ 10. Database Migrations اجرا شده‌اند
```

---

### 🔍 دستورات مفید برای Debug

**1. بررسی Webhook:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**2. تنظیم Webhook:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<BACKEND_URL>/telegram/webhook"
```

**3. پاک کردن Webhook:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

**4. تست Backend Health:**
```bash
curl https://firewall-bot-backend.onrender.com/healthz
```

**5. تست Database Connection از Local:**
```bash
psql "postgresql://user:pass@host/database"
```

---

### 📞 کمک بیشتر

اگر همچنان مشکل دارید:

1. **لاگ‌ها را بررسی کنید:**
   - Backend Logs
   - Database Logs (در صفحه PostgreSQL → Logs)
   - Browser Console (F12 در مرورگر)

2. **سرویس‌ها را Restart کنید:**
   - Web Service: Manual Deploy → Deploy latest commit
   - Static Site: Manual Deploy → Clear cache & deploy
   - PostgreSQL: Resume (اگر Suspended است)

3. **Environment Variables را دوباره چک کنید:**
   - یک به یک همه متغیرها را بررسی کنید
   - مطمئن شوید هیچ فاصله یا کاراکتر اضافی ندارند

4. **از مستندات Render کمک بگیرید:**
   - https://render.com/docs

---

## 📚 مراحل بعدی و بهینه‌سازی

حالا که ربات شما کار می‌کند، می‌توانید:

### 🎨 سفارشی‌سازی ربات
1. **تنظیم قوانین Firewall:**
   - از دستور `/panel` استفاده کنید
   - قوانین مدیریت لینک، رسانه و زبان را تنظیم کنید
   - زمان‌بندی خاص برای قوانین مشخص کنید

2. **افزودن ربات به گروه‌ها:**
   - ربات را به گروه‌های خود اضافه کنید
   - حتماً ربات را **Admin** کنید با این دسترسی‌ها:
     - Delete Messages (پاک کردن پیام‌ها)
     - Ban Users (مسدود کردن کاربران)
     - Invite Users (دعوت کاربران)

3. **استفاده از پنل Owner:**
   - مدیریت Firewall Rules
   - مشاهده آمار و گزارش‌ها
   - تنظیم Panel Admins
   - مدیریت Ban List

4. **تست ویژگی Stars Payment:**
   - از سیستم پرداخت Telegram Stars استفاده کنید
   - اشتراک گروه‌ها را مدیریت کنید

---

### ⚡ بهینه‌سازی Performance

**1. Upgrade کردن Plans (اختیاری):**

| سرویس | Free Plan | Paid Plan |
|-------|-----------|-----------|
| **PostgreSQL** | 90 روز رایگان، سپس $7/ماه | همیشه فعال، Backup خودکار |
| **Web Service** | Auto-sleep بعد از 15 دقیقه | همیشه بیدار، $7/ماه |
| **Static Site** | رایگان همیشه | رایگان همیشه |

**2. استفاده از Custom Domain (اختیاری):**

در Render می‌توانید دامنه شخصی خود را وصل کنید:

- به صفحه Web Service یا Static Site بروید
- تب **"Settings"** → قسمت **"Custom Domain"**
- دامنه خود را اضافه کنید (مثلاً `bot.yourdomain.com`)
- DNS records را طبق دستورالعمل تنظیم کنید
- SSL خودکار توسط Render فعال می‌شود

**3. تنظیم Auto-Deploy:**

- هر بار که به GitHub push می‌کنید، Render خودکار deploy می‌کند
- برای غیرفعال کردن: Settings → Auto-Deploy = Off

---

### 🔐 امنیت و Backup

**1. Backup از Database:**

روش دستی:
```bash
# در Terminal خودتان
pg_dump "postgresql://user:pass@host/db" > backup.sql
```

روش خودکار (توصیه می‌شود):
- Render در پلن Paid، backup خودکار روزانه دارد
- یا از سرویس‌هایی مثل [SimpleBackups](https://simplebackups.com) استفاده کنید

**2. محافظت از Environment Variables:**
- ⚠️ هرگز `.env` را در GitHub commit نکنید
- از `.env.example` برای مثال استفاده کنید
- Secrets را فقط در Render Dashboard نگه دارید

**3. مانیتورینگ:**
- از [UptimeRobot](https://uptimerobot.com) برای monitoring استفاده کنید
- اگر Backend down شد، به شما اطلاع می‌دهد

---

### 📊 مانیتورینگ و Logs

**1. مشاهده Logs در Render:**

**Backend Logs:**
- صفحه Web Service → تب **"Logs"**
- می‌توانید لاگ‌ها را فیلتر کنید (Errors، Info، Warnings)

**Database Logs:**
- صفحه PostgreSQL → تب **"Logs"**  
- Query های کند را ببینید

**Static Site Logs:**
- صفحه Static Site → تب **"Logs"**
- Build logs و Deploy logs

**2. دانلود Logs:**
```bash
# نصب Render CLI
npm install -g render-cli

# Login
render login

# دریافت logs
render logs <service-id>
```

---

### 🚀 Scale کردن پروژه

وقتی پروژه شما بزرگ‌تر شد:

**1. افزایش Resources:**
- در صفحه Web Service → **Settings** → **Instance Type**
- می‌توانید RAM و CPU بیشتری انتخاب کنید

**2. استفاده از Redis برای Cache:**
- Render سرویس Redis رایگان دارد (750MB)
- برای کش کردن Firewall Rules مفید است

**3. جدا کردن Bot از API:**
- می‌توانید دو Web Service جداگانه داشته باشید:
  - یکی برای Bot (Webhook)
  - یکی برای API Server

---

### 🎓 یادگیری بیشتر

**مستندات:**
- [Render Documentation](https://render.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)

**راهنماهای مفید:**
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)

---

### 💡 نکات و ترفندها

**1. توسعه محلی (Local Development):**
```bash
# اجرای Database با Docker
docker-compose up -d postgres

# اجرای Bot در حالت Polling
npm run bot

# اجرای Mini App
npm run dev
```

**2. استفاده از Environment Files:**
```bash
# .env.local برای توسعه محلی
# .env.production از Render Dashboard مدیریت می‌شود
```

**3. تست قبل از Deploy:**
- همیشه در محیط local تست کنید
- از `npm run build` مطمئن شوید که بدون خطا build می‌شود

---

### 🏆 بهترین روش‌ها (Best Practices)

✅ **انجام دهید:**
- متغیرهای محیطی را در Render Dashboard مدیریت کنید
- از Git branches برای ویژگی‌های جدید استفاده کنید
- قبل از deploy، در محیط local تست کنید
- Backup منظم از database بگیرید
- Logs را بررسی کنید

❌ **انجام ندهید:**
- Secrets را در کد commit نکنید
- مستقیماً روی branch اصلی تغییر ندهید
- بدون تست deploy نکنید
- Database را بدون backup تغییر ندهید

---

**🎊 ربات شما زنده است و آماده استفاده! 🎊**

---

## 📸 اسکرین‌شات‌ها و تصاویر راهنما

### 🔹 مرحله 4: ساخت حساب Render

**تصویر 1: صفحه اصلی Render.com**
```
┌──────────────────────────────────────────────┐
│  RENDER                                       │
│  ┌────────────────────────────────────────┐  │
│  │  Build, deploy, and scale your apps    │  │
│  │  with unparalleled ease                │  │
│  │                                         │  │
│  │  [Get Started] [Sign In]               │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  Sign up with:                                │
│  [🔵 GitHub]  [🟠 GitLab]  [📧 Email]       │
└──────────────────────────────────────────────┘
```

### 🔹 مرحله 5: ساخت PostgreSQL Database

**تصویر 2: انتخاب PostgreSQL**
```
┌──────────────────────────────────────────────┐
│  New +                                        │
│  ┌────────────────────────────────────────┐  │
│  │  Web Service                            │  │
│  │  Static Site                            │  │
│  │  ▶ PostgreSQL       [Selected]          │  │
│  │  Redis                                  │  │
│  │  Cron Job                               │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**تصویر 3: فرم ساخت Database**
```
┌──────────────────────────────────────────────┐
│  Create PostgreSQL                            │
│  ┌────────────────────────────────────────┐  │
│  │ Name: firewall-bot-db                  │  │
│  │ Database: firewall_bot                 │  │
│  │ Region: [Frankfurt (EU Central) ▼]    │  │
│  │ PostgreSQL Version: [16 ▼]            │  │
│  │ Plan: [Free ▼]                         │  │
│  │                                         │  │
│  │ [Create Database]                      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**تصویر 4: دریافت Connection String**
```
┌──────────────────────────────────────────────┐
│  firewall-bot-db  [● Available]              │
│  ┌────────────────────────────────────────┐  │
│  │ Connections                             │  │
│  │                                         │  │
│  │ Internal Database URL:                 │  │
│  │ postgresql://...render.internal/...    │  │
│  │ [📋 Copy]                               │  │
│  │                                         │  │
│  │ External Database URL:                 │  │
│  │ postgresql://firewall_user:abc123...   │  │
│  │ [📋 Copy]  👈 این را کپی کنید         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 🔹 مرحله 6: ساخت Web Service (Backend)

**تصویر 5: اتصال Repository**
```
┌──────────────────────────────────────────────┐
│  Connect a repository                         │
│  ┌────────────────────────────────────────┐  │
│  │  📁 telegram-firewall-bot  [Connect]   │  │
│  │  📁 my-other-project                    │  │
│  │  📁 test-repo                           │  │
│  │                                         │  │
│  │  [+ Configure account]                 │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**تصویر 6: فرم Web Service**
```
┌──────────────────────────────────────────────┐
│  Create Web Service                           │
│  ┌────────────────────────────────────────┐  │
│  │ Name: firewall-bot-backend             │  │
│  │ Region: [Frankfurt (EU Central) ▼]    │  │
│  │ Branch: [main ▼]                       │  │
│  │ Runtime: [Node ▼]                      │  │
│  │                                         │  │
│  │ Build Command:                         │  │
│  │ npm install && npm run migrate:deploy  │  │
│  │ && npx prisma generate                 │  │
│  │                                         │  │
│  │ Start Command:                         │  │
│  │ npm run bot:webhook                    │  │
│  │                                         │  │
│  │ Plan: [Free ▼]                         │  │
│  │                                         │  │
│  │ ▼ Advanced                             │  │
│  │   Environment Variables:               │  │
│  │   [+ Add Environment Variable]         │  │
│  │                                         │  │
│  │ [Create Web Service]                   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**تصویر 7: افزودن Environment Variables**
```
┌──────────────────────────────────────────────┐
│  Environment Variables                        │
│  ┌────────────────────────────────────────┐  │
│  │ Key: BOT_TOKEN                         │  │
│  │ Value: 7879361823:AAGqYsVH...         │  │
│  │ [Remove]                               │  │
│  ├────────────────────────────────────────┤  │
│  │ Key: BOT_OWNER_ID                      │  │
│  │ Value: 5076130392                      │  │
│  │ [Remove]                               │  │
│  ├────────────────────────────────────────┤  │
│  │ Key: DATABASE_URL                      │  │
│  │ Value: postgresql://firewall_user...   │  │
│  │ [Remove]                               │  │
│  ├────────────────────────────────────────┤  │
│  │ [+ Add Environment Variable]           │  │
│  └────────────────────────────────────────┘  │
│  [Save Changes]                              │
└──────────────────────────────────────────────┘
```

**تصویر 8: Logs بعد از Deploy**
```
┌──────────────────────────────────────────────┐
│  firewall-bot-backend  [● Live]              │
│  ┌────────────────────────────────────────┐  │
│  │ Logs                                    │  │
│  │                                         │  │
│  │ Building...                             │  │
│  │ ✓ npm install completed                │  │
│  │ ✓ Running migrations...                │  │
│  │ ✓ Prisma generated                     │  │
│  │ ✓ Build succeeded                      │  │
│  │                                         │  │
│  │ Starting server...                     │  │
│  │ ✓ Server listening on port 3000       │  │
│  │ ✓ Webhook set successfully            │  │
│  │ ✓ Bot is running                       │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  Your service is live at:                    │
│  https://firewall-bot-backend.onrender.com   │
└──────────────────────────────────────────────┘
```

### 🔹 مرحله 9: ساخت Static Site (Mini App)

**تصویر 9: فرم Static Site**
```
┌──────────────────────────────────────────────┐
│  Create Static Site                           │
│  ┌────────────────────────────────────────┐  │
│  │ Name: firewall-bot-miniapp             │  │
│  │ Branch: [main ▼]                       │  │
│  │                                         │  │
│  │ Build Command:                         │  │
│  │ npm install && npm run build           │  │
│  │                                         │  │
│  │ Publish Directory:                     │  │
│  │ dist                                   │  │
│  │                                         │  │
│  │ ▼ Advanced                             │  │
│  │   Environment Variables:               │  │
│  │   Key: VITE_API_BASE_URL               │  │
│  │   Value: https://...onrender.com/api/v1│  │
│  │                                         │  │
│  │ [Create Static Site]                   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 🔹 مرحله 11: تنظیم BotFather

**تصویر 10: تنظیم Menu Button در BotFather**
```
┌──────────────────────────────────────────────┐
│  BotFather                                    │
│  ┌────────────────────────────────────────┐  │
│  │ You: /mybots                            │  │
│  │                                         │  │
│  │ BotFather: @MyFirewallTestBot          │  │
│  │ [Select this bot]                      │  │
│  │                                         │  │
│  │ You: [Bot Settings]                    │  │
│  │                                         │  │
│  │ BotFather: [Menu Button]               │  │
│  │                                         │  │
│  │ You: [Configure Menu Button]           │  │
│  │                                         │  │
│  │ BotFather: Send me the URL             │  │
│  │                                         │  │
│  │ You: https://firewall-bot-miniapp...   │  │
│  │                                         │  │
│  │ BotFather: ✅ Success! Menu button     │  │
│  │ URL updated.                           │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 🔹 مرحله 12: تست نهایی

**تصویر 11: ربات در حالت کار**
```
┌──────────────────────────────────────────────┐
│  @MyFirewallTestBot                          │
│  ┌────────────────────────────────────────┐  │
│  │ 🤖 Welcome to Firewall Bot!            │  │
│  │                                         │  │
│  │ [➕ Add to Group]                       │  │
│  │ [📱 Management Panel]                   │  │
│  │ [📢 Join Channel]                       │  │
│  │ [ℹ️ Commands]                          │  │
│  │                                         │  │
│  │ ────────────────────────────────────   │  │
│  │                                         │  │
│  │ Type a message...    [☰ Menu]         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**تصویر 12: Mini App Dashboard**
```
┌──────────────────────────────────────────────┐
│  Firewall Bot Dashboard                      │
│  ┌────────────────────────────────────────┐  │
│  │ 👤 Your Name                           │  │
│  │ 0 XP • Free Plan                       │  │
│  │                                         │  │
│  │ ┌──────────────────┐ ┌──────────────┐ │  │
│  │ │ Active Groups    │ │ Total Members│ │  │
│  │ │ 3                │ │ 1,245        │ │  │
│  │ └──────────────────┘ └──────────────┘ │  │
│  │                                         │  │
│  │ 📱 My Groups:                          │  │
│  │                                         │  │
│  │ ┌────────────────────────────────────┐ │  │
│  │ │ 💬 Test Group            [Active] │ │  │
│  │ │ 👥 125 members • 23 days left     │ │  │
│  │ │ [📊 Analytics] [⚙️ Settings]      │ │  │
│  │ └────────────────────────────────────┘ │  │
│  │                                         │  │
│  │ [+ Add New Group]                      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 🎯 خلاصه مراحل

| مرحله | عنوان | زمان تقریبی |
|-------|--------|-------------|
| 1️⃣ | دریافت BOT TOKEN | 2 دقیقه |
| 2️⃣ | پیدا کردن User ID | 1 دقیقه |
| 3️⃣ | ذخیره در GitHub | 3 دقیقه |
| 4️⃣ | ساخت حساب Render | 3 دقیقه |
| 5️⃣ | راه‌اندازی PostgreSQL | 5 دقیقه |
| 6️⃣ | Deploy Backend (Web Service) | 5-7 دقیقه |
| 7️⃣ | بررسی Migrations | 2 دقیقه |
| 8️⃣ | تست ربات | 2 دقیقه |
| 9️⃣ | Deploy Mini App (Static Site) | 4-6 دقیقه |
| 🔟 | اتصال Mini App به Backend | 2 دقیقه |
| 1️⃣1️⃣ | تنظیم Menu Button | 2 دقیقه |
| 1️⃣2️⃣ | تست نهایی | 3 دقیقه |

**⏱️ مجموع زمان: 35-40 دقیقه**

---

## ✅ چک‌لیست نهایی Deploy

قبل از اینکه بگویید "تمام شد"، این موارد را چک کنید:

### Backend (Web Service)
- [ ] Status = **Live** (سبز)
- [ ] Build موفق بوده
- [ ] همه 8 Environment Variable تنظیم شده
- [ ] Logs بدون خطای Critical
- [ ] `/healthz` پاسخ `{"status":"ok"}` می‌دهد

### Database (PostgreSQL)
- [ ] Status = **Available**
- [ ] Connection String کپی شده
- [ ] Migrations اجرا شده‌اند
- [ ] جداول ایجاد شده‌اند

### Mini App (Static Site)  
- [ ] Status = **Live** (سبز)
- [ ] Build موفق بوده
- [ ] `VITE_API_BASE_URL` تنظیم شده
- [ ] URL در مرورگر باز می‌شود

### Telegram Bot
- [ ] Token از BotFather دریافت شده
- [ ] Owner ID صحیح است
- [ ] ربات به پیام `/start` پاسخ می‌دهد
- [ ] دستور `/panel` کار می‌کند

### Mini App Integration
- [ ] Menu Button در BotFather تنظیم شده
- [ ] `MINI_APP_URL` در Backend ست شده
- [ ] Mini App از داخل تلگرام باز می‌شود
- [ ] API calls کار می‌کنند

### عملکرد کلی
- [ ] ربات در چت خصوصی پاسخ می‌دهد
- [ ] ربات در گروه فعال است
- [ ] Firewall rules اجرا می‌شوند
- [ ] Dashboard داده‌ها را نمایش می‌دهد

---

## 🎓 سوالات متداول (FAQ)

**Q: آیا Render واقعاً رایگان است؟**
A: بله! PostgreSQL 90 روز رایگان است (بعد $7/ماه)، Web Service رایگان با محدودیت Sleep، و Static Site کاملاً رایگان و unlimited است.

**Q: چرا ربات من بعد از 15 دقیقه جواب نمی‌دهد؟**
A: پلن Free بعد از 15 دقیقه بی‌استفاده، سرویس را Sleep می‌کند. با UptimeRobot یا Upgrade به Starter Plan ($7/ماه) حل می‌شود.

**Q: می‌توانم Custom Domain استفاده کنم؟**
A: بله! در Settings هر سرویس، می‌توانید Custom Domain اضافه کنید. SSL رایگان فعال می‌شود.

**Q: چگونه Backup از Database بگیرم؟**
A: در پلن Paid، backup خودکار روزانه دارید. در Free Plan، با `pg_dump` دستی backup بگیرید.

**Q: آیا می‌توانم چند ربات روی یک حساب داشته باشم؟**
A: بله! برای هر ربات یک Web Service و یک Static Site جداگانه بسازید.

**Q: چطور Log ها را ببینم؟**
A: در Dashboard هر سرویس، تب "Logs" را باز کنید. همه لاگ‌ها real-time نمایش داده می‌شوند.

**Q: Migration ها خودکار اجرا می‌شوند؟**
A: بله، اگر Build Command را درست تنظیم کرده باشید: `npm install && npm run migrate:deploy && npx prisma generate`

**Q: چگونه Environment Variable ها را تغییر دهم؟**
A: تب "Environment" → ویرایش یا اضافه کنید → "Save Changes" → سرویس خودکار redeploy می‌شود.

---

## 🌟 تفاوت Render با Cloudflare/Railway

| ویژگی | Render | Cloudflare Workers | Railway |
|-------|--------|-------------------|---------|
| **راحتی استفاده** | ⭐⭐⭐⭐⭐ بسیار آسان | ⭐⭐⭐ متوسط | ⭐⭐⭐⭐ آسان |
| **یکپارچگی** | همه سرویس‌ها در یک جا | نیاز به سرویس‌های جداگانه | همه سرویس‌ها در یک جا |
| **Static Site** | رایگان unlimited | رایگان unlimited | - |
| **PostgreSQL** | 90 روز رایگان | - | محدودیت بیشتر |
| **Auto-Deploy** | ✅ از Git | ✅ با Wrangler CLI | ✅ از Git |
| **مستندات** | ⭐⭐⭐⭐⭐ عالی | ⭐⭐⭐⭐ خوب | ⭐⭐⭐ متوسط |
| **پشتیبانی** | ⭐⭐⭐⭐ خوب | ⭐⭐⭐⭐⭐ عالی | ⭐⭐⭐ متوسط |
| **قیمت** | مناسب | رقابتی | کمی گران‌تر |

**🏆 چرا Render؟**
- همه چیز در یک Dashboard
- Setup آسان‌تر از Cloudflare
- Database بهتر از Railway
- مستندات کامل و مفید
- Deploy خودکار از Git

---

**🎊 ربات شما با Render.com آماده و آنلاین است! 🎊**

**✨ موفق باشید! ✨**