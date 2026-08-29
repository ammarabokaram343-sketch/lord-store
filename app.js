let products=[], cart=JSON.parse(localStorage.getItem("lord_cart")||"[]"), currentFilter="الكل", searchTerm="";
const grid=document.getElementById("productGrid"),count=document.getElementById("cartCount"),drawer=document.getElementById("cartDrawer"),overlay=document.getElementById("overlay"),dialog=document.getElementById("checkoutDialog");
const money=n=>new Intl.NumberFormat("ar-SY").format(n)+" ل.س";
async function load(){
  const r=await fetch("/api/store"); const d=await r.json(); products=d.products;
  document.getElementById("deliveryNote").textContent=d.settings.deliveryNote+" • الدفع عند الاستلام أو عبر شام كاش";
  document.getElementById("waLink").href="https://wa.me/"+d.settings.whatsapp;
  document.getElementById("facebookText").textContent="فيسبوك: "+d.settings.facebook;
  render(); renderCart();
}
function render(){
 const f=products.filter(p=>(currentFilter==="الكل"||p.cat===currentFilter)&&(!searchTerm||p.name.includes(searchTerm)||p.cat.includes(searchTerm)));
 grid.innerHTML=f.length?f.map(p=>`<article class="product-card ${p.stock<1?"out":""}"><div class="product-visual ${p.image?"has-image":""}">${p.image?`<img src="${p.image}" alt="${p.name}">`:``}${p.stock<1?`<span class="product-tag">نفد</span>`:""}</div><div class="product-info"><div class="product-cat">${p.cat}</div><h3>${p.name}</h3><div class="price">${money(p.price)} <small>للقطعة</small></div><div class="stock-note">${p.stock>0?"متوفر: "+p.stock:"غير متوفر حالياً"}</div><button class="add-btn" ${p.stock<1?"disabled":""} onclick="addToCart(${p.id})">${p.stock>0?"أضف إلى السلة":"غير متوفر"}</button></div></article>`).join(""):`<div class="no-results">ما لقينا منتجات مطابقة.</div>`;
}
function save(){localStorage.setItem("lord_cart",JSON.stringify(cart));renderCart()}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;let i=cart.find(x=>x.id===id);if(i){if(i.qty<p.stock)i.qty++;}else cart.push({id,qty:1});save();openCart()}
function changeQty(id,d){let i=cart.find(x=>x.id===id),p=products.find(x=>x.id===id);if(!i)return;i.qty+=d;if(i.qty>p.stock)i.qty=p.stock;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);save()}
function renderCart(){count.textContent=cart.reduce((s,x)=>s+x.qty,0);let total=0;const box=document.getElementById("cartItems");if(!cart.length){box.innerHTML='<div class="empty">السلة فاضية حالياً.<br>اختار القطع اللي عجبتك ✦</div>'}else{box.innerHTML=cart.map(x=>{let p=products.find(y=>y.id===x.id);if(!p)return"";total+=p.price*x.qty;return`<div class="cart-item"><div><h4>${p.name}</h4><span>${money(p.price)} × ${x.qty}</span></div><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><b>${x.qty}</b><button onclick="changeQty(${p.id},1)">+</button></div></div>`}).join("")}document.getElementById("cartTotal").textContent=money(total)}
function openCart(){drawer.classList.add("open");overlay.classList.add("show")}function closeCart(){drawer.classList.remove("open");overlay.classList.remove("show")}
document.getElementById("cartBtn").onclick=openCart;document.getElementById("closeCart").onclick=closeCart;overlay.onclick=closeCart;document.getElementById("clearCart").onclick=()=>{cart=[];save()};
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentFilter=b.dataset.filter;render()});
document.querySelectorAll(".category-card").forEach(b=>b.onclick=()=>{currentFilter=b.dataset.category;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter===currentFilter));render();document.getElementById("products").scrollIntoView({behavior:"smooth"})});
document.getElementById("searchBtn").onclick=()=>{document.getElementById("searchPanel").classList.add("open");document.getElementById("searchInput").focus()};document.getElementById("closeSearch").onclick=()=>document.getElementById("searchPanel").classList.remove("open");document.getElementById("searchInput").oninput=e=>{searchTerm=e.target.value.trim();render()};
document.getElementById("checkoutBtn").onclick=()=>{if(!cart.length)return alert("أضف منتجاً إلى السلة أولاً.");dialog.showModal()};
document.getElementById("checkoutForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);try{const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:{name:fd.get("name"),phone:fd.get("phone"),city:fd.get("city"),address:fd.get("address")},items:cart,payment:fd.get("payment"),notes:fd.get("notes")})});const d=await r.json();if(!r.ok)throw Error(d.error);alert("تم تسجيل طلبك بنجاح: "+d.order.id+"\\nسنتواصل معك لتأكيد الطلب.");cart=[];save();dialog.close();closeCart();load()}catch(err){alert(err.message)}};
load();
