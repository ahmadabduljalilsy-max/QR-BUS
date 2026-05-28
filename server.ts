import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Mock Database Structure in Server Memory
interface ServerBus {
  id: string;
  driverName: string;
  licensePlate: string;
  phone: string;
  model: string;
  status: 'inside' | 'outside';
}

interface ServerScanLog {
  id: string;
  busId: string;
  driverName: string;
  licensePlate: string;
  action: 'entry' | 'exit';
  timestamp: string; // ISO 8601
  guardId: string;
  guardName: string;
}

interface ServerUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'guard';
}

let users: ServerUser[] = [
  { id: "U-1", username: "admin", password: "A1994ahmed2026", name: "أحمد عبد الجليل (المدير العام)", role: "admin" },
  { id: "U-G1", username: "ahmad.abduljalil.sy@gmail.com", password: "A1994ahmed2026", name: "أحمد عبد الجليل (المدير العام)", role: "admin" },
  { id: "U-2", username: "guard1", password: "123", name: "محمد العتيبي (الحارس - البوابة الشرقية)", role: "guard" },
  { id: "U-3", username: "guard2", password: "123", name: "علي الشمراني (الحارس - البوابة الغربية)", role: "guard" }
];

let buses: ServerBus[] = [
  { id: "BUS-101", driverName: "سعيد القحطاني", licensePlate: "أ ب ج 1234", phone: "0501234567", model: "2023", status: "inside" },
  { id: "BUS-202", driverName: "خالد الشهري", licensePlate: "د هـ و 5678", phone: "0559876543", model: "2022", status: "outside" },
  { id: "BUS-303", driverName: "عمر الحربي", licensePlate: "س ص ع 9012", phone: "0543210987", model: "2024", status: "inside" },
  { id: "BUS-404", driverName: "عبدالله الرويلي", licensePlate: "ر ز س 3456", phone: "0561112223", model: "2023", status: "outside" }
];

let scanLogs: ServerScanLog[] = [
  {
    id: "L-1",
    busId: "BUS-101",
    driverName: "سعيد القحطاني",
    licensePlate: "أ ب ج 1234",
    action: "entry",
    timestamp: "2026-05-27T08:30:00Z",
    guardId: "U-2",
    guardName: "محمد العتيبي"
  },
  {
    id: "L-2",
    busId: "BUS-202",
    driverName: "خالد الشهري",
    licensePlate: "د هـ و 5678",
    action: "entry",
    timestamp: "2026-05-27T09:12:00Z",
    guardId: "U-2",
    guardName: "محمد العتيبي"
  },
  {
    id: "L-3",
    busId: "BUS-202",
    driverName: "خالد الشهري",
    licensePlate: "د هـ و 5678",
    action: "exit",
    timestamp: "2026-05-27T11:45:00Z",
    guardId: "U-3",
    guardName: "علي الشمراني"
  },
  {
    id: "L-4",
    busId: "BUS-303",
    driverName: "عمر الحربي",
    licensePlate: "س ص ع 9012",
    action: "entry",
    timestamp: "2026-05-27T12:05:00Z",
    guardId: "U-3",
    guardName: "علي الشمراني"
  }
];

// Persistent File DB Helpers
const DB_FILE = path.join(process.cwd(), "db.json");

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      if (db.users && Array.isArray(db.users)) users = db.users;
      if (db.buses && Array.isArray(db.buses)) buses = db.buses;
      if (db.scanLogs && Array.isArray(db.scanLogs)) scanLogs = db.scanLogs;
      console.log("[Local Persistent DB] Loaded data successfully from db.json");
    }

    // Always ensure the manager account credentials are secure and updated to requested password
    let adminFound = false;
    let emailFound = false;
    users.forEach(u => {
      if (u.username === "admin") {
        u.password = "A1994ahmed2026";
        u.name = "أحمد عبد الجليل (المدير العام)";
        adminFound = true;
      }
      if (u.username === "ahmad.abduljalil.sy@gmail.com") {
        u.password = "A1994ahmed2026";
        u.name = "أحمد عبد الجليل (المدير العام)";
        emailFound = true;
      }
    });

    if (!adminFound) {
      users.push({ id: "U-1", username: "admin", password: "A1994ahmed2026", name: "أحمد عبد الجليل (المدير العام)", role: "admin" });
    }
    if (!emailFound) {
      users.push({ id: "U-G1", username: "ahmad.abduljalil.sy@gmail.com", password: "A1994ahmed2026", name: "أحمد عبد الجليل (المدير العام)", role: "admin" });
    }

    saveDb();
  } catch (err) {
    console.error("[Local Persistent DB] Error loading database:", err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users, buses, scanLogs }, null, 2), "utf-8");
  } catch (err) {
    console.error("[Local Persistent DB] Error saving database:", err);
  }
}

// Initial Database load on boot
loadDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes ---

  // Auth Integration with Case & Whitespace Insensitive matching
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبة" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find(u => 
      u.username.trim().toLowerCase() === cleanUsername && 
      (u.password || "").trim() === cleanPassword
    );

    if (user) {
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } else {
      res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }
  });

  // Google OAuth configuration & endpoints
  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Return path to mock Google accounts chooser so testing inside preview containers/iFrames is pristine
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/mock-login`;
      return res.json({ url: redirectUri });
    }
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    
    const options = {
      redirect_uri: redirectUri,
      client_id: clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };
    
    const qs = new URLSearchParams(options).toString();
    res.json({ url: `${rootUrl}?${qs}` });
  });

  // Mock Google Login page for sandbox / preview testing
  app.get("/api/auth/google/mock-login", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>تسجيل الدخول باستخدام Google</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Cairo', sans-serif;
            background-color: #f0f4f9;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            width: 420px;
            padding: 36px;
            text-align: center;
            border: 1px solid #e0e0e0;
          }
          .google-logo {
            width: 48px;
            height: 48px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 22px;
            color: #1f1f1f;
            margin: 0 0 8px 0;
            font-weight: 700;
          }
          p {
            font-size: 14px;
            color: #5f6368;
            margin: 0 0 28px 0;
          }
          .account-item {
            display: flex;
            align-items: center;
            padding: 14px;
            border: 1px solid #dadce0;
            border-radius: 12px;
            margin-bottom: 14px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: right;
          }
          .account-item:hover {
            background-color: #f8f9fa;
            border-color: #bdc1c6;
          }
          .avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background-color: #6366f1;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-left: 14px;
            font-size: 18px;
          }
          .avatar.red {
            background-color: #ef4444;
          }
          .details {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
          }
          .name {
            font-size: 14px;
            font-weight: 700;
            color: #3c4043;
          }
          .email {
            font-size: 12px;
            color: #70757a;
            font-family: monospace;
          }
          .badge {
            font-size: 9.5px;
            background: #e0e7ff;
            color: #4f46e5;
            padding: 2px 8px;
            border-radius: 6px;
            align-self: flex-start;
            margin-top: 5px;
            font-weight: 700;
          }
          .badge.red {
            background: #fee2e2;
            color: #ef4444;
          }
          .subtext {
            font-size: 11px;
            color: #9aa0a6;
            margin-top: 28px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <svg class="google-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <h1>اختيار حساب للبدء</h1>
          <p>للمتابعة إلى تطبيق درة المنورة للنقليات</p>
          
          <div class="account-item" id="admin-acc">
            <div class="avatar">أ</div>
            <div class="details">
              <span class="name">أحمد عبد الجليل (المدير العام)</span>
              <span class="email">ahmad.abduljalil.sy@gmail.com</span>
              <span class="badge">المدير العام والمالك المعتمد</span>
            </div>
          </div>

          <div class="account-item" id="unauthorized-acc">
            <div class="avatar red">ش</div>
            <div class="details">
              <span class="name">شخص متعاون أو شريك آخر</span>
              <span class="email">other.partner@gmail.com</span>
              <span class="badge red">غير مصرح بالصلاحية</span>
            </div>
          </div>
          
          <div class="subtext">
            لمتابعة العمل الميداني والرقابي، تتأكد Google من مشاركة اسمك وبريدك الإلكتروني المعتمد مع الإدارة العامة لشركة درة المنورة.
          </div>
        </div>

        <script>
          const adminAcc = document.getElementById('admin-acc');
          const unauthorizedAcc = document.getElementById('unauthorized-acc');

          adminAcc.addEventListener('click', () => {
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: {
                  id: "U-G1",
                  username: "ahmad.abduljalil.sy@gmail.com",
                  name: "أحمد عبد الجليل (المدير العام)",
                  role: "admin",
                  email: "ahmad.abduljalil.sy@gmail.com"
                }
              }, '*');
              window.close();
            }
          });

          unauthorizedAcc.addEventListener('click', () => {
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_FAILURE',
                message: 'عذراً، هذا الحساب (other.partner@gmail.com) غير مصرح له كمدير عام للتطبيق. الدخول محصور بحساب الإدارة المعتمد (ahmad.abduljalil.sy@gmail.com).'
              }, '*');
              window.close();
            }
          });
        </script>
      </body>
      </html>
    `);
  });

  // Google OAuth callback handler
  app.get(["/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', message: 'رمز التحقق غير صالح من جوجل' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

      // Exchange authorization code for access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString()
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to exchange code for tokens");
      }

      const tokens = await tokenRes.json();
      
      // Fetch Google Profile information
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      if (!userinfoRes.ok) {
        throw new Error("Failed to fetch user profiles info");
      }

      const profile = await userinfoRes.json();
      const email = (profile.email || "").trim().toLowerCase();
      const name = profile.name || email.split("@")[0];

      // Strictest enforcement of Manager identity (ahmad.abduljalil.sy@gmail.com)
      if (email !== "ahmad.abduljalil.sy@gmail.com") {
        return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_FAILURE', 
                    message: 'عذراً، هذا الحساب (${email}) غير مصرح له كمدير عام للتطبيق. الدخول محصور بحساب الإدارة المعتمد (ahmad.abduljalil.sy@gmail.com).' 
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/?error=unauthorized';
                }
              </script>
            </body>
          </html>
        `);
      }

      // Exclusively log in as general manager
      const loggedInUser = {
        id: "U-G1",
        username: "ahmad.abduljalil.sy@gmail.com",
        name: "أحمد عبد الجليل (المدير العام)",
        role: "admin" as const,
        email: "ahmad.abduljalil.sy@gmail.com"
      };

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify(loggedInUser)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>تم تسجيل دخولك بنجاح كمدير عام للشركة. سيتم إغلاق النافذة تلقائياً...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', message: '${err.message || 'حدث خطأ في المصادقة'}' }, '*');
              window.close();
            </script>
            <p>حدث خطأ أثناء الاتصال بجوجل: ${err.message}</p>
          </body>
        </html>
      `);
    }
  });

  // Simulation handler for easy testing inside dry iFrame environments without OAuth Setup
  app.post("/api/auth/google/simulate", (req, res) => {
    const { email } = req.body;
    const targetEmail = (email || "").trim().toLowerCase();
    
    if (targetEmail !== "ahmad.abduljalil.sy@gmail.com") {
      return res.status(401).json({ 
        success: false, 
        message: "عذراً، هذا الحساب غير مصرح له كمدير عام للتطبيق. الدخول محصور بحساب الإدارة المعتمد (ahmad.abduljalil.sy@gmail.com)." 
      });
    }

    const simulatedUser = {
      id: "U-SU",
      username: "ahmad.abduljalil.sy@gmail.com",
      name: "أحمد عبد الجليل (المدير العام)",
      role: "admin",
      email: "ahmad.abduljalil.sy@gmail.com"
    };
    
    res.json({ success: true, user: simulatedUser });
  });

  // --- Guards Management APIs ---
  app.get("/api/guards", (req, res) => {
    // Return all users who are guards
    const guards = users.filter(u => u.role === "guard");
    res.json(guards);
  });

  app.post("/api/guards", (req, res) => {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "جميع حقول الحارس مطلوبة (الاسم، اسم المستخدم، كلمة المرور)" });
    }

    const usernameExists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (usernameExists) {
      return res.status(400).json({ error: "اسم المستخدم هذا مسجل بالفعل لمستخدم آخر" });
    }

    const newGuard: ServerUser = {
      id: `U-${Date.now()}`,
      username: username.trim().toLowerCase(),
      password: password.trim(),
      name: name.trim(),
      role: "guard"
    };

    users.push(newGuard);
    saveDb();
    const { password: _, ...safeGuard } = newGuard;
    res.status(201).json({ success: true, guard: safeGuard });
  });

  app.put("/api/guards/:id", (req, res) => {
    const { id } = req.params;
    const { name, username, password } = req.body;

    const userIndex = users.findIndex(u => u.id === id && u.role === "guard");
    if (userIndex === -1) {
      return res.status(404).json({ error: "الحارس غير موجود ببيانات النظام" });
    }

    if (username) {
      const usernameExists = users.some(u => u.id !== id && u.username.toLowerCase() === username.trim().toLowerCase());
      if (usernameExists) {
        return res.status(400).json({ error: "اسم المستخدم الجديد مسجلاً بالفعل لدعم شريك آخر" });
      }
    }

    users[userIndex] = {
      ...users[userIndex],
      ...(name !== undefined && { name: name.trim() }),
      ...(username !== undefined && { username: username.trim().toLowerCase() }),
      ...(password !== undefined && { password: password.trim() })
    };

    saveDb();
    const { password: _, ...safeGuard } = users[userIndex];
    res.json({ success: true, guard: safeGuard });
  });

  app.delete("/api/guards/:id", (req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === id && u.role === "guard");
    if (userIndex === -1) {
      return res.status(404).json({ error: "الحارس غير موجود بقاعدة البيانات" });
    }

    users = users.filter(u => u.id !== id);
    saveDb();
    res.json({ success: true, message: "تم إزالة وإلغاء تسجيل الحارس بنجاح" });
  });

  // Get buses list
  app.get("/api/buses", (req, res) => {
    res.json(buses);
  });

  // Bulk import buses list
  app.post("/api/buses/bulk", (req, res) => {
    const { busesList } = req.body;
    if (!busesList || !Array.isArray(busesList)) {
      return res.status(400).json({ error: "الرجاء إرسال قائمة حافلات صالحة للاستيراد." });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const skippedDetails: string[] = [];

    for (const b of busesList) {
      const busId = b.id ? b.id.toString().trim().toUpperCase() : "";
      const driverName = b.driverName ? b.driverName.toString().trim() : "";
      const licensePlate = b.licensePlate ? b.licensePlate.toString().trim() : "";
      const phone = b.phone ? b.phone.toString().trim() : "";
      const model = b.model ? b.model.toString().trim() : "";

      if (!busId || !driverName || !licensePlate) {
        skippedCount++;
        skippedDetails.push(`تم تخطي سجل غير مكتمل في الملف (أحد البيانات الأساسية مفقود)`);
        continue;
      }

      const exists = buses.some(existing => existing.id.toLowerCase() === busId.toLowerCase());
      if (exists) {
        skippedCount++;
        skippedDetails.push(`المعرف "${busId}" مكرر ومسجل مسبقاً في النظام`);
        continue;
      }

      const newBus: ServerBus = {
        id: busId,
        driverName,
        licensePlate,
        phone,
        model,
        status: "outside"
      };

      buses.push(newBus);
      importedCount++;
    }

    if (importedCount > 0) {
      saveDb();
    }

    res.json({
      success: true,
      importedCount,
      skippedCount,
      skippedDetails,
      message: `تم استيراد ${importedCount} حافلة بنجاح.`
    });
  });

  // Add new bus
  app.post("/api/buses", (req, res) => {
    const { id, driverName, licensePlate, phone, model } = req.body;
    if (!id || !driverName || !licensePlate) {
      return res.status(400).json({ error: "جميع الحقول الأساسية مطلوبة (معرف الحافلة، اسم السائق، رقم اللوحة)" });
    }
    
    const exists = buses.some(b => b.id.toLowerCase() === id.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "معرف الحافلة مسجل مسبقاً في النظام" });
    }

    const newBus: ServerBus = {
      id: id.trim().toUpperCase(),
      driverName: driverName.trim(),
      licensePlate: licensePlate.trim(),
      phone: (phone || "").trim(),
      model: (model || "").trim(),
      status: "outside" // Default status on registry creation is assumed outside
    };

    buses.push(newBus);
    saveDb();
    res.status(201).json({ success: true, bus: newBus });
  });

  // Edit existing bus
  app.put("/api/buses/:id", (req, res) => {
    const { id } = req.params;
    const { driverName, licensePlate, phone, model, status } = req.body;

    const busIndex = buses.findIndex(b => b.id.toLowerCase() === id.toLowerCase());
    if (busIndex === -1) {
      return res.status(404).json({ error: "الحافلة غير موجودة" });
    }

    // Update properties
    const updatedBus = {
      ...buses[busIndex],
      ...(driverName !== undefined && { driverName: driverName.trim() }),
      ...(licensePlate !== undefined && { licensePlate: licensePlate.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(model !== undefined && { model: model.trim() }),
      ...(status !== undefined && { status })
    };

    buses[busIndex] = updatedBus;
    saveDb();
    res.json({ success: true, bus: updatedBus });
  });

  // Delete bus
  app.delete("/api/buses/:id", (req, res) => {
    const { id } = req.params;
    const busIndex = buses.findIndex(b => b.id.toLowerCase() === id.toLowerCase());
    if (busIndex === -1) {
      return res.status(404).json({ error: "الحافلة غير موجودة" });
    }

    buses = buses.filter(b => b.id.toLowerCase() !== id.toLowerCase());
    saveDb();
    res.json({ success: true, message: "تم حذف الحافلة بنجاح" });
  });

  // Get activity scan logs
  app.get("/api/logs", (req, res) => {
    // Return logs ordered from latest to earliest
    const sortedLogs = [...scanLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(sortedLogs);
  });

  // Log new movement (Entry / Exit) from guard scanning
  app.post("/api/logs", (req, res) => {
    const { busId, action, guardId } = req.body;
    console.log(`[API Live Scan] Received scan request: busId="${busId}", action="${action}", guardId="${guardId}"`);

    if (!busId || !action || !guardId) {
      console.warn("[API Live Scan] Missing required fields in scan request");
      return res.status(400).json({ error: "بيانات الإجراء غير مكتملة" });
    }

    // Find the bus
    const bus = buses.find(b => b.id.toUpperCase() === busId.toUpperCase());
    if (!bus) {
      console.warn(`[API Live Scan] Bus matching ID "${busId}" was NOT found in the database. Active buses:`, buses.map(b => b.id));
      return res.status(404).json({ error: "عذراً، معرف الحافلة هذا غير مسجل في قواعد بيانات النظام!" });
    }

    // Find guard info
    const guard = users.find(u => u.id === guardId || u.username === guardId);
    if (!guard) {
      console.log(`[API Live Scan] Guard with ID/username "${guardId}" not found. Creating entry using anonymous fallback.`);
    }
    const guardName = guard ? guard.name.split(" ")[0] : "حارس غير معروف"; // Extract first name or default

    // Update bus current status in-memory
    bus.status = action === 'entry' ? 'inside' : 'outside';

    const newLog: ServerScanLog = {
      id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      busId: bus.id,
      driverName: bus.driverName,
      licensePlate: bus.licensePlate,
      action: action,
      timestamp: new Date().toISOString(),
      guardId: guard ? guard.id : "unknown-guard",
      guardName: guardName
    };

    scanLogs.push(newLog);
    saveDb();
    console.log(`[API Live Scan] Successfully logged movement for bus "${busId}" by guard "${guardName}". New status: "${bus.status}"`);
    res.status(201).json({ success: true, log: newLog, bus: bus });
  });

  // Delete movement log (with reversion of bus status if it was the last movement for that bus)
  app.delete("/api/logs/:id", (req, res) => {
    const { id } = req.params;
    const logIndex = scanLogs.findIndex(l => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ error: "الحركة غير موجودة" });
    }

    const logToDelete = scanLogs[logIndex];
    
    // Find if this is the latest log for this bus
    const busLogs = scanLogs.filter(l => l.busId === logToDelete.busId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const isLatest = busLogs.length > 0 && busLogs[0].id === logToDelete.id;

    if (isLatest) {
      const bus = buses.find(b => b.id.toUpperCase() === logToDelete.busId.toUpperCase());
      if (bus) {
        // If we deleted exit, status should revert to inside. If entry, revert to outside.
        if (busLogs.length > 1) {
          const prevLog = busLogs[1];
          bus.status = prevLog.action === 'entry' ? 'inside' : 'outside';
        } else {
          bus.status = logToDelete.action === 'entry' ? 'outside' : 'inside';
        }
      }
    }

    scanLogs = scanLogs.filter(l => l.id !== id);
    saveDb();
    res.json({ success: true, message: "تم حذف الحركة بنجاح" });
  });

  // Get cumulative stats for the Admin dashboard
  app.get("/api/stats", (req, res) => {
    const busesInsideCount = buses.filter(b => b.status === 'inside').length;
    
    // Calculate total movements today
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const todayLogs = scanLogs.filter(log => log.timestamp.startsWith(todayStr));

    const entriesToday = todayLogs.filter(log => log.action === 'entry').length;
    const exitsToday = todayLogs.filter(log => log.action === 'exit').length;

    res.json({
      busesInsideCount,
      totalMovementsToday: todayLogs.length,
      entriesToday,
      exitsToday
    });
  });

  // Reset demo data endpoint (Optional feature to ease evaluation)
  app.post("/api/system/reset", (req, res) => {
    buses = [
      { id: "BUS-101", driverName: "سعيد القحطاني", licensePlate: "أ ب ج 1234", phone: "0501234567", model: "2023", status: "inside" },
      { id: "BUS-202", driverName: "خالد الشهري", licensePlate: "د هـ و 5678", phone: "0559876543", model: "2022", status: "outside" },
      { id: "BUS-303", driverName: "عمر الحربي", licensePlate: "س ص ع 9012", phone: "0543210987", model: "2024", status: "inside" },
      { id: "BUS-404", driverName: "عبدالله الرويلي", licensePlate: "ر ز س 3456", phone: "0561112223", model: "2023", status: "outside" }
    ];
    scanLogs = [
      {
        id: "L-1",
        busId: "BUS-101",
        driverName: "سعيد القحطاني",
        licensePlate: "أ ب ج 1234",
        action: "entry",
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
        guardId: "U-2",
        guardName: "محمد العتيبي"
      },
      {
        id: "L-2",
        busId: "BUS-202",
        driverName: "خالد الشهري",
        licensePlate: "د هـ و 5678",
        action: "entry",
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
        guardId: "U-2",
        guardName: "محمد العتيبي"
      },
      {
        id: "L-3",
        busId: "BUS-202",
        driverName: "خالد الشهري",
        licensePlate: "د هـ و 5678",
        action: "exit",
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        guardId: "U-3",
        guardName: "علي الشمراني"
      },
      {
        id: "L-4",
        busId: "BUS-303",
        driverName: "عمر الحربي",
        licensePlate: "س ص ع 9012",
        action: "entry",
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
        guardId: "U-3",
        guardName: "علي الشمراني"
      }
    ];
    users = [
      { id: "U-1", username: "admin", password: "A1994ahmed2026", name: "م. أحمد عبد الجليل (المدير العام)", role: "admin" },
      { id: "U-G1", username: "ahmad.abduljalil.sy@gmail.com", password: "A1994ahmed2026", name: "م. أحمد عبد الجليل (المدير العام)", role: "admin" },
      { id: "U-2", username: "guard1", password: "123", name: "محمد العتيبي (الحارس - البوابة الشرقية)", role: "guard" },
      { id: "U-3", username: "guard2", password: "123", name: "علي الشمراني (الحارس - البوابة الغربية)", role: "guard" }
    ];
    saveDb();
    res.json({ success: true, message: "تم إعادة تهيئة البيانات الافتراضية بنجاح" });
  });

  // --- Vite & Production SPA Serving ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Bus QR Tracker] Backend and proxy API running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
