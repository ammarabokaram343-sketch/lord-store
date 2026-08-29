const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "public", "uploads");
const DB = path.join(DATA_DIR, "store.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DEFAULT = {
  settings: {
    storeName: "اللورد LORD",
    phone: "0997351159",
    whatsapp: "963997351159",
    facebook: "اللورد لزينة الدراجات النارية",
    shamCashNumber: "",
    deliveryNote: "توصيل إلى جميع الأراضي السورية"
  },
  products: [
    {id:1,name:"إضاءة LED داخلية فاخرة",cat:"سيارات",price:85000,stock:12,description:"إضاءة داخلية أنيقة للمقصورة.",image:"",active:true},
    {id:2,name:"شريط LED ديناميكي للسيارة",cat:"سيارات",price:120000,stock:8,description:"شريط LED بتصميم عصري.",image:"",active:true},
    {id:3,name:"حامل هاتف معدني للدراجة",cat:"دراجات",price:95000,stock:10,description:"حامل ثابت ومتين للهاتف.",image:"",active:true},
    {id:4,name:"مرايا رياضية للدراجات",cat:"دراجات",price:175000,stock:6,description:"مرايا بطابع رياضي.",image:"",active:true},
    {id:5,name:"منظم مقاعد متعدد الاستخدام",cat:"إكسسوارات",price:65000,stock:20,description:"تنظيم عملي للمركبة.",image:"",active:true},
    {id:6,name:"معطر LORD للسيارة",cat:"إكسسوارات",price:45000,stock:25,description:"معطر أنيق للسيارة.",image:"",active:true}
  ],
  orders: [],
  admin: { username: "admin", passwordHash: "" }
};

function hash(s){ return crypto.createHash("sha256").update(s).digest("hex"); }
DEFAULT.admin.passwordHash = hash(process.env.ADMIN_PASSWORD || "LORD@2026");

if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify(DEFAULT,null,2));
function readDB(){ return JSON.parse(fs.readFileSync(DB,"utf8")); }
function writeDB(db){ fs.writeFileSync(DB, JSON.stringify(db,null,2)); }

const sessions = new Map();
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req,file,cb)=>{
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now()+"-"+crypto.randomBytes(5).toString("hex")+ext);
    }
  }),
  limits: {fileSize: 5*1024*1024},
  fileFilter: (req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(ROOT,"public")));

function auth(req,res,next){
  const token = req.headers.authorization?.replace("Bearer ","");
  if(!token || !sessions.has(token)) return res.status(401).json({error:"غير مصرح"});
  next();
}

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body;
  const db=readDB();
  if(username===db.admin.username && hash(password||"")===db.admin.passwordHash){
    const token=crypto.randomBytes(32).toString("hex");
    sessions.set(token,Date.now());
    return res.json({token});
  }
  res.status(401).json({error:"بيانات الدخول غير صحيحة"});
});

app.post("/api/logout",auth,(req,res)=>{
  const token=req.headers.authorization.replace("Bearer ",""); sessions.delete(token); res.json({ok:true});
});

app.get("/api/store",(req,res)=>{
  const db=readDB();
  res.json({settings:db.settings, products:db.products.filter(p=>p.active)});
});

app.get("/api/admin/dashboard",auth,(req,res)=>{
  const db=readDB();
  const counts={
    products:db.products.length,
    activeProducts:db.products.filter(p=>p.active).length,
    orders:db.orders.length,
    pending:db.orders.filter(o=>o.status==="جديد").length
  };
  res.json({settings:db.settings,products:db.products,orders:db.orders,counts});
});

app.post("/api/admin/products",auth,(req,res)=>{
  const db=readDB();
  const body=req.body;
  const p={
    id:Date.now(),
    name:String(body.name||"منتج جديد").trim(),
    cat:String(body.cat||"إكسسوارات"),
    price:Number(body.price||0),
    stock:Number(body.stock||0),
    description:String(body.description||""),
    image:String(body.image||""),
    active:body.active!==false
  };
  db.products.push(p); writeDB(db); res.json(p);
});

app.put("/api/admin/products/:id",auth,(req,res)=>{
  const db=readDB(); const p=db.products.find(x=>x.id===Number(req.params.id));
  if(!p) return res.status(404).json({error:"المنتج غير موجود"});
  Object.assign(p,{
    name:String(req.body.name??p.name),
    cat:String(req.body.cat??p.cat),
    price:Number(req.body.price??p.price),
    stock:Number(req.body.stock??p.stock),
    description:String(req.body.description??p.description),
    image:String(req.body.image??p.image),
    active:req.body.active===undefined?p.active:Boolean(req.body.active)
  });
  writeDB(db); res.json(p);
});

app.delete("/api/admin/products/:id",auth,(req,res)=>{
  const db=readDB(); const id=Number(req.params.id);
  db.products=db.products.filter(x=>x.id!==id); writeDB(db); res.json({ok:true});
});

app.post("/api/admin/upload",auth,upload.single("image"),(req,res)=>{
  if(!req.file) return res.status(400).json({error:"أرسل صورة صحيحة"});
  res.json({url:"/uploads/"+req.file.filename});
});

app.put("/api/admin/settings",auth,(req,res)=>{
  const db=readDB();
  db.settings={...db.settings,...req.body};
  writeDB(db); res.json(db.settings);
});

app.post("/api/orders",(req,res)=>{
  const db=readDB();
  const {customer,items,payment,notes}=req.body;
  if(!customer?.name || !customer?.phone || !customer?.city || !customer?.address || !Array.isArray(items) || !items.length)
    return res.status(400).json({error:"بيانات الطلب ناقصة"});
  let total=0, normalized=[];
  for(const item of items){
    const p=db.products.find(x=>x.id===Number(item.id) && x.active);
    const qty=Math.max(1,Number(item.qty||1));
    if(!p) return res.status(400).json({error:"أحد المنتجات غير متوفر"});
    if(p.stock < qty) return res.status(400).json({error:`الكمية غير متوفرة للمنتج: ${p.name}`});
    total += p.price*qty;
    normalized.push({id:p.id,name:p.name,price:p.price,qty});
  }
  const order={
    id:"LORD-"+Date.now().toString(36).toUpperCase(),
    createdAt:new Date().toISOString(),
    customer,items:normalized,total,payment:payment==="shamcash"?"شام كاش":"الدفع عند الاستلام",
    notes:String(notes||""),status:"جديد"
  };
  normalized.forEach(i=>{const p=db.products.find(x=>x.id===i.id);p.stock-=i.qty;});
  db.orders.unshift(order); writeDB(db);
  res.status(201).json({order});
});

app.put("/api/admin/orders/:id",auth,(req,res)=>{
  const db=readDB(); const o=db.orders.find(x=>x.id===req.params.id);
  if(!o) return res.status(404).json({error:"الطلب غير موجود"});
  const allowed=["جديد","قيد التجهيز","تم الشحن","مكتمل","ملغى"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"حالة غير صالحة"});
  o.status=req.body.status; writeDB(db); res.json(o);
});

app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"public","admin.html")));
app.get("/*",
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"غير موجود"});
  res.sendFile(path.join(ROOT,"public","index.html"));
});

app.listen(PORT,()=>console.log(`LORD Store running on http://localhost:${PORT}`));
