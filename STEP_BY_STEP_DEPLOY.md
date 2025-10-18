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

## 🔧 مرحله 6: راه‌اندازی Backend با Railway (رایگان)

Backend باید روی یک سرور اجرا شود. ساده‌ترین راه: **Railway**

### گام 6.1: ساخت حساب Railway
1. به آدرس بروید: https://railway.app
2. روی "Login with GitHub" کلیک کنید
3. GitHub خود را وصل کنید

### گام 6.2: ساخت پروژه جدید
1. روی "New Project" کلیک کنید
2. گزینه "Deploy from GitHub repo" را انتخاب کنید
3. Repository که در مرحله 3 ساختید را انتخاب کنید
4. روی "Deploy Now" کلیک کنید

### گام 6.3: تنظیم Environment Variables
1. در صفحه پروژه، به تب "Variables" بروید
2. این متغیرها را **یکی یکی** اضافه کنید:

```
BOT_TOKEN = [TOKEN از مرحله 1]
BOT_OWNER_ID = [User ID از مرحله 2]
BOT_USERNAME = [Username ربات شما بدون @]
DATABASE_URL = [Connection String از مرحله 5]
BOT_START_MODE = webhook
PORT = 3000
```

**مثال واقعی:**
```
BOT_TOKEN = 7879361823:AAGqYsVH87CKtQAMaPZGwdQ0Tcw09Bs-C4U
BOT_OWNER_ID = 5076130392
BOT_USERNAME = MyFirewallTestBot
DATABASE_URL = postgresql://alex:abc123xyz@ep-cool-waterfall-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
BOT_START_MODE = webhook
PORT = 3000
```

### گام 6.4: دریافت URL Backend
1. پس از Deploy، Railway یک URL به شما می‌دهد
2. مثال: `https://telegram-firewall-bot-production.up.railway.app`
3. این URL را کپی کنید

### گام 6.5: تنظیم WEBHOOK_DOMAIN
1. برگردید به Variables
2. یک متغیر دیگر اضافه کنید:

```
WEBHOOK_DOMAIN = [URL Railway شما]
```

مثال:
```
WEBHOOK_DOMAIN = https://telegram-firewall-bot-production.up.railway.app
```

### گام 6.6: اجرای Database Migrations
1. در Railway، به تب "Deployments" بروید
2. روی "View Logs" کلیک کنید
3. اگر خطایی دیدید که می‌گوید "table does not exist"، نگران نباشید

**راه حل:** باید migrations را اجرا کنیم

---

## 🔄 مرحله 7: اجرای Database Migrations

### گام 7.1: نصب Node.js (اگر ندارید)
1. به آدرس بروید: https://nodejs.org
2. نسخه LTS را دانلود کنید
3. نصب کنید

### گام 7.2: Clone کردن Repository
1. Terminal یا Command Prompt را باز کنید
2. دستورات زیر را اجرا کنید:

```bash
# Clone کردن
git clone https://github.com/[username]/[repo-name].git
cd [repo-name]

# نصب dependencies
npm install

# تنظیم DATABASE_URL
# در ویندوز:
set DATABASE_URL=postgresql://...

# در Mac/Linux:
export DATABASE_URL=postgresql://...

# اجرای migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**✅ Database شما آماده شد!**

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

## 🌐 مرحله 9: Deploy Mini App در Cloudflare Workers

### گام 9.1: نصب Wrangler CLI
```bash
npm install -g wrangler
```

### گام 9.2: Login به Cloudflare
```bash
wrangler login
```

یک صفحه مرورگر باز می‌شود، "Allow" را بزنید.

### گام 9.3: ویرایش wrangler.toml
1. فایل `wrangler.toml` را باز کنید
2. خط مربوط به `BACKEND_URL` را پیدا کنید:

```toml
[vars]
BACKEND_URL = "https://your-backend-server.com"
```

3. آن را به URL Railway خود تغییر دهید:

```toml
[vars]
BACKEND_URL = "https://telegram-firewall-bot-production.up.railway.app"
```

### گام 9.4: Build و Deploy
```bash
# Build
npm run build

# Deploy
npm run worker:deploy
```

### گام 9.5: دریافت Worker URL
پس از deploy موفق، یک URL دریافت می‌کنید:

```
Published tg-firewall-worker
  https://tg-firewall-worker.[your-subdomain].workers.dev
```

این URL را کپی کنید!

---

## 🔗 مرحله 10: اتصال Mini App به ربات

### گام 10.1: تنظیم MINI_APP_URL در Railway
1. برگردید به Railway
2. به Variables بروید
3. یک متغیر جدید اضافه کنید:

```
MINI_APP_URL = [Worker URL شما]
```

مثال:
```
MINI_APP_URL = https://tg-firewall-worker.username.workers.dev
```

4. ذخیره کنید
5. Railway خودکار redeploy می‌کند

### گام 10.2: تنظیم Menu Button در BotFather
1. به `@BotFather` در تلگرام بروید
2. دستور `/mybots` را بفرستید
3. ربات خود را انتخاب کنید
4. "Bot Settings" → "Menu Button" → "Configure Menu Button"
5. URL Mini App خود را وارد کنید:
   ```
   https://tg-firewall-worker.username.workers.dev
   ```
6. "Send" را بزنید

---

## ✅ مرحله 11: تست نهایی

### گام 11.1: Restart ربات
در تلگرام، به ربات خود بروید و:
1. `/start` بزنید
2. روی دکمه "Management Panel" کلیک کنید
3. Mini App باید باز شود! 🎉

### گام 11.2: تست در گروه
1. یک گروه تست بسازید
2. ربات را به گروه اضافه کنید
3. ربات را Admin کنید
4. در گروه `/start` بزنید
5. یک لینک بفرستید
6. اگر Firewall فعال باشد، لینک پاک می‌شود

---

## 🎉 تبریک! ربات شما آماده است!

### چک‌لیست نهایی:
- ✅ ربات در تلگرام پاسخ می‌دهد
- ✅ `/panel` کار می‌کند
- ✅ Mini App باز می‌شود
- ✅ Database وصل است
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
