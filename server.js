const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
// .env fayli (ixtiyoriy): KEY=VALUE qatorlari
try{for(const l of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}}catch{}
const E=process.env,PORT=+E.PORT||3000,PASS=E.ADMIN_PASSWORD||'',AP='/'+(E.ADMIN_PATH||'panel').replace(/^\/+/,''),SEC=E.SECRET||crypto.randomBytes(32).toString('hex'),TG=E.TG_API||'https://api.telegram.org';
const DIR=E.DATA_DIR||__dirname,DB=path.join(DIR,'data.json'),UP=path.join(DIR,'uploads'),PUB=path.join(__dirname,'public');
// Supabase (ixtiyoriy): SUPABASE_URL + SUPABASE_KEY berilsa, ma'lumot va rasmlar Supabase'da saqlanadi
const SB=E.SUPABASE_URL&&E.SUPABASE_KEY?{u:E.SUPABASE_URL.replace(/\/+$/,''),k:E.SUPABASE_KEY,b:E.SUPABASE_BUCKET||'uploads'}:null;
if(!SB)fs.mkdirSync(UP,{recursive:true});
const KEEP=E.ORDER_KEEP_DAYS!==undefined&&E.ORDER_KEEP_DAYS!==''?Math.max(0,+E.ORDER_KEEP_DAYS||0):3;
// Mini App havolasi (https): PUBLIC_URL yoki Render bergan RENDER_EXTERNAL_URL. Chatlar: admin va (ixtiyoriy) kuryerlar
const PURL=(E.PUBLIC_URL||E.RENDER_EXTERNAL_URL||'').trim().replace(/\/+$/,''),WA=/^https:\/\//.test(PURL)?PURL:'';
const CH_A=String(E.CHAT_ID||''),CH_C=E.COURIER_CHAT_ID&&String(E.COURIER_CHAT_ID)!==CH_A?String(E.COURIER_CHAT_ID):'';
const TZ=5*36e5,dkey=t=>new Date(t+TZ).toISOString().slice(0,10); // Toshkent kuni (UTC+5)
const CSP=(n,fa)=>["default-src 'self'","script-src 'self' 'nonce-"+n+"' https://cdnjs.cloudflare.com https://api-maps.yandex.ru https://yastatic.net https://telegram.org blob:","style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://yastatic.net","font-src 'self' https://fonts.gstatic.com https://yastatic.net data:","img-src 'self' data: blob: https://commons.wikimedia.org https://upload.wikimedia.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com https://*.maps.yandex.net https://*.yandex.net https://*.yandex.ru https://yastatic.net"+(SB?' https://*.supabase.co':''),"connect-src 'self' https://nominatim.openstreetmap.org https://api-maps.yandex.ru https://*.maps.yandex.net https://*.yandex.net https://*.yandex.ru https://yandex.ru","worker-src blob:","frame-src 'none'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors "+(fa?"'self' https://web.telegram.org https://*.telegram.org https://telegram.org":"'none'")].join('; ');
const cl=(s,n)=>String(s??'').trim().slice(0,n),h=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const seedMenu=[
['Olma (Samarqand)','Mevalar',14000,'kg','🍎','Shirin va sersuv'],
['Banan','Mevalar',18000,'kg','🍌','Import, pishgan'],
['Uzum (Husayni)','Mevalar',22000,'kg','🍇','Mahalliy'],
['Anor','Mevalar',20000,'kg','🍒','Shirin-nordon'],
['Kartoshka','Sabzavotlar',6000,'kg','🥔','Yangi hosil'],
['Piyoz','Sabzavotlar',4500,'kg','🧅','Sariq piyoz'],
['Sabzi','Sabzavotlar',5000,'kg','🥕','Palov uchun'],
['Pomidor','Sabzavotlar',12000,'kg','🍅','Issiqxona'],
['Bodring','Sabzavotlar',9000,'kg','🥒','Yangi'],
['Sut 1 l (3.2%)','Sut mahsulotlari',11000,'dona','🥛','Pasterizatsiya qilingan'],
['Qatiq 1 kg','Sut mahsulotlari',13000,'dona','🥛','Tabiiy'],
['Sariyogʻ 180 g','Sut mahsulotlari',16000,'dona','🧈','82.5%'],
['Tuxum (30 dona)','Sut mahsulotlari',48000,'tabaqa','🥚','Birinchi navli'],
['Mol goʻshti','Goʻsht va parranda',95000,'kg','🥩','Suyaksiz'],
['Tovuq goʻshti','Goʻsht va parranda',38000,'kg','🍗','Butun, sovutilgan'],
['Qoʻy goʻshti','Goʻsht va parranda',90000,'kg','🍖','Yangi'],
['Tandir non','Non va qandolat',4000,'dona','🍞','Issiq'],
['Bulka non','Non va qandolat',3500,'dona','🥖','Kunlik'],
['Guruch (Lazer)','Un va yormalar',16000,'kg','🌾','Palov uchun'],
['Un 50 kg','Un va yormalar',330000,'qop','🌾','Oliy nav'],
['Makaron 400 g','Un va yormalar',7000,'dona','🍝','Qattiq navdan'],
['Grechka','Un va yormalar',18000,'kg','🌾','Tozalangan'],
['Kungaboqar yogʻi 5 l','Yogʻ va ziravorlar',85000,'dona','🫒','Rafinadlangan'],
['Shakar','Yogʻ va ziravorlar',13000,'kg','🧂','Oq'],
['Tuz 1 kg','Yogʻ va ziravorlar',2500,'dona','🧂','Yodlangan'],
['Coca-Cola 1.5 l','Ichimliklar',13000,'dona','🥤','Sovuq'],
['Mineral suv 1.5 l','Ichimliklar',4500,'dona','💧','Gazsiz'],
['Qora choy 200 g','Ichimliklar',22000,'dona','🍵','Barg choy'],
['Shokolad plitka','Shirinliklar',12000,'dona','🍫','Sutli'],
['Pechenye 500 g','Shirinliklar',14000,'dona','🍪','Assorti'],
['Kir yuvish kukuni 3 kg','Uy-roʻzgʻor',48000,'dona','🧴','Avtomat uchun'],
['Idish yuvish suyuqligi','Uy-roʻzgʻor',16000,'dona','🧴','500 ml']
].map((x,i)=>({id:i+1,n:x[0],c:x[1],p:x[2],u:x[3],e:x[4],d:x[5],a:1,img:''}));
const seedSlides=[
{id:1,a:1,bg:'g',k:'Yangi hosil',h:'Eng *yangi* meva va sabzavotlar',p:'Har kuni yangi keltiriladi. Optom va chakana narxlarda.',b:'Xarid qilish',l:'#menu',i1:'',e:''},
{id:2,a:1,bg:'o',k:'Optom narxlar',h:'Koʻproq oling, *koʻproq* tejang',p:'Un, guruch, yogʻ, shakar va boshqa mahsulotlar optom narxlarda.',b:'Katalogga oʻtish',l:'#menu',i1:'',e:''},
{id:3,a:1,bg:'r',k:'Yetkazib berish',h:'Buyurtma *eshigingizgacha*',p:'Saytdan buyurtma bering, biz uyingizgacha yetkazib beramiz. Toʻlov naqd.',b:'Buyurtma berish',l:'#menu',i1:'',e:''}];
const seedGroups=[{n:'Meva va sabzavotlar',i:'',cats:['Mevalar','Sabzavotlar']},{n:'Sut va tuxum',i:'',cats:['Sut mahsulotlari']},{n:'Goʻsht va parranda',i:'',cats:['Goʻsht va parranda']},{n:'Non va shirinliklar',i:'',cats:['Non va qandolat','Shirinliklar']},{n:'Bakaleya',i:'',cats:['Un va yormalar','Yogʻ va ziravorlar']},{n:'Ichimliklar',i:'',cats:['Ichimliklar']},{n:'Uy-roʻzgʻor',i:'',cats:['Uy-roʻzgʻor']}];
// ---- doʻkon maʼlumotlari (admin paneldan oʻzgartiriladi) va kategoriyalar ----
const SET_DEF={phone:'',address:'Andijon viloyati, Poytugʻ',hours:'08:00 – 22:00',rating:'',telegram:'',instagram:'',lat:40.892109,lng:72.252442,delFirst:5000,delKm:2500,delOn:1,minOn:0,minSum:0,yandexKey:'',yandexGeoKey:''};
const urlOk=s=>/^https?:\/\/[^\s<>"']{3,200}$/i.test(String(s||'').trim())?String(s).trim():'';
const numIn=(v,min,max,d)=>{const x=v===''||v==null?NaN:+v;return Number.isFinite(x)&&x>=min&&x<=max?x:d};
const cleanSettings=s=>{s=s||{};return{phone:cl(s.phone,30)||SET_DEF.phone,address:cl(s.address,200)||SET_DEF.address,hours:cl(s.hours,40)||SET_DEF.hours,rating:cl(s.rating,60),telegram:urlOk(s.telegram),instagram:urlOk(s.instagram),yandexKey:cl(s.yandexKey,80).replace(/[^\w-]/g,''),yandexGeoKey:cl(s.yandexGeoKey,80).replace(/[^\w-]/g,''),lat:numIn(s.lat,-90,90,SET_DEF.lat),lng:numIn(s.lng,-180,180,SET_DEF.lng),delFirst:Math.round(numIn(s.delFirst,0,1e6,SET_DEF.delFirst)),delKm:Math.round(numIn(s.delKm,0,1e6,SET_DEF.delKm)),delOn:s.delOn===undefined?SET_DEF.delOn:(s.delOn&&s.delOn!=='0'?1:0),minOn:s.minOn&&s.minOn!=='0'?1:0,minSum:Math.round(numIn(s.minSum,0,1e9,0))}};
const cleanCats=a=>[...new Set((Array.isArray(a)?a:[]).map(x=>cl(x,30)).filter(Boolean))].slice(0,30);
let db={menu:seedMenu,cats:cleanCats(seedMenu.map(m=>m.c)),settings:{},orders:[],slides:seedSlides,groups:seedGroups,catimg:{},users:{},stats:{},lastId:1000};
const cfgFull=()=>({...SET_DEF,...db.settings});
const cfgPub=()=>{const c=cfgFull();return{phone:c.phone,address:c.address,hours:c.hours,rating:c.rating,telegram:c.telegram,instagram:c.instagram,yandexKey:c.yandexKey||cl(E.YANDEX_MAPS_KEY,80).replace(/[^\w-]/g,''),lat:c.lat,lng:c.lng,delFirst:c.delFirst,delKm:c.delKm,delOn:c.delOn?1:0,minOn:c.minOn?1:0,minSum:c.minSum||0}};
// ---- yetkazish: masofa, narx va manzilni aniqlash (Yandex geokoder; kalit boʻlmasa OpenStreetMap) ----
const UA='SevimliMarket/1.0',OSRM=(E.OSRM_URL||'https://router.project-osrm.org').replace(/\/+$/,''),YGEO=E.YANDEX_GEO_URL||'https://geocode-maps.yandex.ru/1.x/',NOM=(E.NOMINATIM_URL||'https://nominatim.openstreetmap.org').replace(/\/+$/,''),MAXKM=+E.DELIVERY_MAX_KM||60;
const rad=x=>x*Math.PI/180,hav=(a,b,c,d)=>{const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(x))};
const fmtN=n=>Number(n).toLocaleString('ru-RU');
// 1 km gacha delFirst, undan keyin har bir boshlangan km uchun delKm
const feeOf=(km,c)=>c.delOn?c.delFirst+Math.ceil(Math.max(0,km-1))*c.delKm:0;
const minErr=(sub,c)=>c.minOn&&c.minSum>0&&sub<c.minSum?`Minimal buyurtma summasi ${fmtN(c.minSum)} soʻm. Yana ${fmtN(c.minSum-sub)} soʻm qoʻshing`:'';
const ptOf=b=>{const la=b.lat==null||b.lat===''?NaN:+b.lat,lo=b.lng==null||b.lng===''?NaN:+b.lng;return Number.isFinite(la)&&Number.isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180?{lat:la,lng:lo}:null};
const yKey=c=>c.yandexGeoKey||c.yandexKey||cl(E.YANDEX_GEO_KEY,80).replace(/[^\w-]/g,'')||cl(E.YANDEX_MAPS_KEY,80).replace(/[^\w-]/g,'');
let SITE=(E.SITE_URL||'').replace(/\/+$/,'');const BUILD='2026-11-05-f';
const yh=url=>SITE&&/yandex/.test(String(url))?{referer:SITE+'/',origin:SITE}:{};
async function getJson(url,ms=6000){const r=await fetch(url,{signal:AbortSignal.timeout(ms),headers:{'user-agent':UA,'accept-language':'uz,ru',...yh(url)}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
const GC=new Map(),RC=new Map(),memo=(m,k,v)=>{m.set(k,v);if(m.size>500)m.delete(m.keys().next().value);return v};
const YST={e:'',t:0};let MAPERR=null,MAPINFO=''; // YST: oxirgi Yandex geokoder xatosi; MAPERR: brauzerdagi oxirgi xarita xatosi
// Yandex geokoder: avval oʻzbekcha (uz_UZ), boʻlmasa ruscha (ru_RU) javob
let UZ_BAD=false; // Yandex uz_UZ tilini qabul qilmasa (HTTP 400) — keyingi soʻrovlarda ru_RU dan boshlanadi
async function ygeoReq(key,extra){
  let last=null;
  for(const lang of UZ_BAD?['ru_RU']:['uz_UZ','ru_RU']){
    try{
      const u=new URL(YGEO);u.search=new URLSearchParams({apikey:key,format:'json',lang,...extra});
      const fm=((((await getJson(u,3500)).response||{}).GeoObjectCollection||{}).featureMember)||[];
      last=null;YST.e='';
      if(fm.length)return fm;
    }catch(e){last=e;if(lang==='uz_UZ'&&e.message==='HTTP 400')UZ_BAD=true}
  }
  if(last){YST.e=last.message;YST.t=Date.now();throw last}
  return[];
}
const gObj=o=>{const m=(o.metaDataProperty||{}).GeocoderMetaData||{},p=String((o.Point||{}).pos||'').split(' ').map(Number);if(p.length!==2||!p.every(Number.isFinite))return null;return{lat:p[1],lng:p[0],text:cl(m.text,200),apx:!['exact','number','near'].includes(m.precision)}};
async function geoYandex(q,key,c){
  const f=(await ygeoReq(key,{geocode:q,results:'1',ll:c.lng+','+c.lat,spn:'0.3,0.3',rspn:'1'}))[0];return f?gObj(f.GeoObject):null;
}
async function geoOsm(q,c){
  const d=.15,u=new URL(NOM+'/search');u.search=new URLSearchParams({format:'jsonv2',limit:'1',countrycodes:'uz',q,viewbox:[c.lng-d,c.lat+d,c.lng+d,c.lat-d].join(','),bounded:'1','accept-language':'uz,ru'});
  const r=(await getJson(u))[0];if(!r)return null;
  return{lat:+r.lat,lng:+r.lon,text:cl(r.display_name,200),apx:!/^(house|building)$/.test(r.addresstype||r.type||'')};
}
async function geocode(addr,c){
  const k=addr.toLowerCase().replace(/\s+/g,' ');if(GC.has(k))return GC.get(k);
  const key=yKey(c);let g=null;
  if(key){try{g=await geoYandex(addr,key,c)}catch(e){console.error('Yandex geokoder xatosi:',e.message)}}
  if(!g){try{g=await geoOsm(addr,c)}catch(e){console.error('OSM geokoder xatosi:',e.message)}}
  return g?memo(GC,k,g):null;
}
// Davlat nomi koʻrsatilmaydi: manzil viloyatdan boshlanadi
const noC=t=>String(t||'').replace(/^\s*(?:O[ʻʼ‘’'`]?zbekiston|Ўзбекистон|Узбекистан|Uzbekistan)\s*,\s*/i,'').trim();
let LREV='';
async function yRev(key,la,lo,kind){
  const ex={geocode:lo+','+la,results:'1'};if(kind)ex.kind=kind;
  const o=((await ygeoReq(key,ex))[0]||{}).GeoObject;if(!o)return null;
  const m=(o.metaDataProperty||{}).GeocoderMetaData||{},comp=(m.Address||{}).Components||[];
  return{text:cl(m.text||[o.description,o.name].filter(Boolean).join(', '),200),street:comp.some(x=>x.kind==='street'),house:comp.some(x=>x.kind==='house')};
}
// Koordinata boʻyicha toʻliq manzil: viloyat, tuman, aholi punkti, koʻcha, uy raqami
let RLOG=[];
async function revgeo(la,lo,c,nc){
  const k=la.toFixed(5)+','+lo.toFixed(5);if(!nc&&RC.has(k))return RC.get(k);
  RLOG=[];
  const keys=[...new Set([c.yandexGeoKey,c.yandexKey,cl(E.YANDEX_GEO_KEY,80).replace(/[^\w-]/g,''),cl(E.YANDEX_MAPS_KEY,80).replace(/[^\w-]/g,'')].filter(Boolean))];
  let best=null,src='';
  if(!keys.length)RLOG.push('Yandex kaliti kiritilmagan');
  for(const key of keys){
    const tag='kalit …'+key.slice(-4);
    try{
      const sc=x=>x?(x.house?2:x.street?1:0):-1;
      const rs=await Promise.all(['house','street',''].map(kind=>yRev(key,la,lo,kind).then(r=>({kind,r})).catch(e=>({kind,r:null,e}))));
      for(const {kind,r,e} of rs){RLOG.push(tag+' ['+(kind||'umumiy')+']: '+(e?'xato '+e.message:r?(r.house?'uy topildi':r.street?'koʻcha topildi':'faqat aholi punkti'):'natija yoʻq'));if(sc(r)>sc(best))best=r}
      if(!best&&rs.every(x=>x.e))throw rs[0].e;
      if(best)break;
    }catch(e){RLOG.push(tag+': xato '+e.message);console.error('Yandex teskari geokoder xatosi:',e.message)}
  }
  let a=best?noC(best.text):'';src=best?'yandex:'+(best.house?'uy':best.street?'koʻcha':'aholi punkti'):'';
  // Yandex koʻcha/uyni topa olmasa — OpenStreetMap maʼlumoti bilan toʻldiramiz
  if(!a||!(best&&(best.street||best.house))){
    try{
      const d=await getJson(NOM+'/reverse?format=jsonv2&addressdetails=1&accept-language=uz,ru&zoom=18&lat='+la+'&lon='+lo,4500),x=d.address||{};
      const base=a||[x.state,x.county||x.city_district||x.district,x.village||x.town||x.city||x.hamlet].filter(Boolean).join(', ');
      const add=[x.road,x.house_number].filter(p=>p&&!base.toLowerCase().includes(String(p).toLowerCase()));
      a=[base,...add].filter(Boolean).join(', ');RLOG.push('OSM: '+(add.length?'koʻcha/uy qoʻshildi':'koʻcha ham topilmadi'));if(add.length)src+=(src?'+':'')+'osm';else if(!src)src='osm';
    }catch(e){RLOG.push('OSM: xato '+e.message)}
  }
  a=cl(a,200);LREV=src;return a?memo(RC,k,a):'';
}
// Manzil qidirish (takliflar)
async function suggest(q,c){
  q=cl(q,120);if(q.length<2)return[];
  const key=yKey(c);let out=[];
  if(key){try{out=(await ygeoReq(key,{geocode:q,results:'6',ll:c.lng+','+c.lat,spn:'0.5,0.5',rspn:'0'})).map(f=>gObj(f.GeoObject)).filter(Boolean)}catch(e){console.error('Yandex qidiruv xatosi:',e.message)}}
  if(!out.length){try{const d=.4,u=new URL(NOM+'/search');u.search=new URLSearchParams({format:'jsonv2',limit:'6',countrycodes:'uz',q,viewbox:[c.lng-d,c.lat+d,c.lng+d,c.lat-d].join(','),bounded:'0','accept-language':'uz,ru'});out=(await getJson(u)).map(r=>({lat:+r.lat,lng:+r.lon,text:cl(r.display_name,200)}))}catch(e){}}
  return out.slice(0,6).map(r=>({t:noC(r.text),lat:+r.lat.toFixed(6),lng:+r.lng.toFixed(6)}));
}
// Yoʻl masofasi (OSRM). Xizmat javob bermasa: toʻgʻri chiziq × 1.3 (taxminiy, est=1)
async function roadKm(la,lo,c){
  const air=hav(c.lat,c.lng,la,lo);
  try{
    const j=await getJson(`${OSRM}/route/v1/driving/${c.lng},${c.lat};${lo},${la}?overview=false&alternatives=false&steps=false`,5000),m=j&&j.code==='Ok'&&j.routes&&j.routes[0]&&j.routes[0].distance;
    if(m>0)return{km:Math.max(m/1000,air),est:0,air};
  }catch(e){console.error('OSRM xatosi:',e.message)}
  return{km:air*1.3,est:1,air};
}
// Yetkazish narxi: xaritadan belgilangan nuqta (lat/lng) boʻlsa — shu nuqta, boʻlmasa — yozilgan manzil geokodlanadi
async function quote(b,allowAddr){
  const c=cfgFull();if(!c.delOn)return{on:0,fee:0,km:0};
  let p=ptOf(b),src='pin',found='',apx=0;
  if(!p){
    if(!allowAddr)throw new Error('Yetkazish manzilini xaritadan tanlang');
    const addr=cl(b.addr,200);if(addr.length<3)throw new Error('Manzil yoki koordinata kiriting');
    const g=await geocode(addr,c);if(!g)throw new Error('Manzil topilmadi. Xaritadan joyingizni belgilang');
    p={lat:g.lat,lng:g.lng};src='addr';found=g.text;apx=g.apx?1:0;
  }
  const d=await roadKm(p.lat,p.lng,c);
  if(d.air>MAXKM)throw new Error(src==='pin'?'Bu joy yetkazish hududidan tashqarida':'Manzil yetkazish hududidan tashqarida yoki notoʻgʻri aniqlandi. Xaritadan belgilang');
  const km=Math.round(d.km*10)/10;
  return{on:1,fee:feeOf(km,c),km,lat:+p.lat.toFixed(6),lng:+p.lng.toFixed(6),src,found,apx,est:d.est};
}
// ---- Supabase (REST, kutubxonasiz) ----
const sbh=x=>({apikey:SB.k,...(SB.k.startsWith('sb_')?{}:{authorization:'Bearer '+SB.k}),...x});
async function sbFetch(url,opt,tries=3){let err;for(let i=0;i<tries;i++){try{const r=await fetch(url,opt);if(r.ok||r.status===409)return r;err=new Error('Supabase '+r.status+': '+(await r.text()).slice(0,180))}catch(e){err=e}await new Promise(s=>setTimeout(s,400*(i+1)))}throw err}
const sbPut=(key,value)=>sbFetch(`${SB.u}/rest/v1/kv?on_conflict=key`,{method:'POST',headers:sbh({'content-type':'application/json',prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({key,value,updated_at:new Date().toISOString()})});
const sbDel=key=>sbFetch(`${SB.u}/rest/v1/kv?key=eq.${encodeURIComponent(key)}`,{method:'DELETE',headers:sbh()});
async function sbAll(){const out=[];for(let off=0;;off+=1000){const r=await sbFetch(`${SB.u}/rest/v1/kv?select=key,value&order=key&limit=1000&offset=${off}`,{headers:sbh()});const rows=await r.json();out.push(...rows);if(rows.length<1000)break}return out}
async function sbUpload(name,buf){await sbFetch(`${SB.u}/storage/v1/object/${SB.b}/${name}`,{method:'POST',headers:sbh({'content-type':'image/jpeg','x-upsert':'true'}),body:buf});return `${SB.u}/storage/v1/object/public/${SB.b}/${name}`}
// ---- saqlash ----
// Tugagan buyurtmalar KEEP kundan keyin oʻchadi; ularning summasi kunlik statistikaga (db.stats) yigʻib qoʻyiladi
let statsDirty=false;
function fold(o){
  if(!o.done||(o.st!==3&&o.st!==4))return;
  const k=dkey(o.done),d=db.stats[k]||(db.stats[k]={n:0,s:0,c:0,it:{}});
  if(o.st===3){d.n++;d.s+=(o.sub!=null?o.sub:o.total);d.f=(d.f||0)+(o.fee||0);for(const i of o.items){const x=d.it[i.n]||(d.it[i.n]=[0,0]);x[0]+=i.q;x[1]+=i.p*i.q}}else d.c++;
  statsDirty=true;
}
async function purge(){
  const n=Date.now(),old=db.orders.filter(o=>o.done&&n-o.done>=KEEP*864e5);let any=false;
  for(const o of old){try{if(SB)await sbDel('order:'+o.id);db.orders=db.orders.filter(x=>x!==o);fold(o);any=true}catch(e){console.error('Eski buyurtmani oʻchirish xatosi:',e.message)}}
  const lim=dkey(n-800*864e5);for(const k of Object.keys(db.stats))if(k<lim){delete db.stats[k];statsDirty=true}
  if(statsDirty){try{if(SB)await sbPut('stats',db.stats);else saveLocal();statsDirty=false}catch(e){console.error('Statistikani saqlash xatosi:',e.message)}}
  else if(any&&!SB)saveLocal();
}
// Davr boʻyicha statistika (sanalar Toshkent vaqti bilan, YYYY-MM-DD, ikkala chegara ham kiradi)
function statsRange(from,to){
  const days=new Map(),top=new Map(),iso=t=>new Date(t).toISOString().slice(0,10);
  for(let t=Date.parse(from),e=Date.parse(to);t<=e;t+=864e5)days.set(iso(t),{d:iso(t),n:0,s:0,c:0,f:0});
  const put=(k,n,s,c,f=0)=>{const d=days.get(k);if(d){d.n+=n;d.s+=s;d.c+=c;d.f+=f}};
  const dish=(name,q,s)=>{const x=top.get(name)||{n:name,q:0,s:0};x.q+=q;x.s+=s;top.set(name,x)};
  for(const[k,d]of Object.entries(db.stats))if(days.has(k)){put(k,d.n,d.s,d.c,d.f||0);for(const[name,v]of Object.entries(d.it||{}))dish(name,v[0],v[1])}
  for(const o of db.orders){
    if(!o.done)continue;const k=dkey(o.done);if(!days.has(k))continue;
    if(o.st===3){put(k,1,o.sub!=null?o.sub:o.total,0,o.fee||0);for(const i of o.items)dish(i.n,i.q,i.p*i.q)}else if(o.st===4)put(k,0,0,1);
  }
  const arr=[...days.values()],n=arr.reduce((a,d)=>a+d.n,0),s=arr.reduce((a,d)=>a+d.s,0),c=arr.reduce((a,d)=>a+d.c,0),f=arr.reduce((a,d)=>a+d.f,0);
  return{days:arr,tot:{n,s,c,f,avg:n?Math.round(s/n):0},top:[...top.values()].sort((a,b)=>b.q-a.q||b.s-a.s).slice(0,8)};
}
const saveLocal=()=>{fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)};
const saveK=async k=>{if(SB)await sbPut(k,db[k]);else saveLocal()};
const saveOrder=async o=>{if(SB)await sbPut('order:'+o.id,o);else saveLocal()};
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const IMG=new RegExp('^(/img/[\\w-]+\\.jpg|/photos/[\\w-]+\\.jpg|https://commons\\.wikimedia\\.org/wiki/Special:FilePath/[\\w%.\\-]+(\\?width=\\d+)?'+(SB?'|'+esc(SB.u)+'/storage/v1/object/public/'+esc(SB.b)+'/[\\w-]+\\.jpg':'')+')$');
const okImg=s=>IMG.test(s||'')?s:'';
const cleanMenu=(m,i)=>({id:Math.floor(+m.id)||Date.now()+i,n:cl(m.n,60),c:cl(m.c,30)||'Boshqa',p:Math.max(0,Math.floor(+m.p)||0),e:cl(m.e,8),u:cl(m.u,12),d:cl(m.d,120),a:m.a?1:0,img:okImg(m.img)});
const cleanSlide=(s,i)=>({id:Math.floor(+s.id)||Date.now()+i,a:s.a?1:0,bg:['g','o','r','d'].includes(s.bg)?s.bg:'g',e:cl(s.e,12),k:cl(s.k,60),h:cl(s.h,120),p:cl(s.p,260),b:cl(s.b,30),l:/^(#[\w-]*|\/[\w\-\/]*)$/.test(s.l||'')?s.l:'#menu',i1:okImg(s.i1)});
const cleanGroups=(a,cats)=>{const used=new Set();return(Array.isArray(a)?a:[]).slice(0,30).map(g=>({n:cl(g&&g.n,30),i:okImg(g&&g.i),cats:[...new Set((Array.isArray(g&&g.cats)?g.cats:[]).map(x=>cl(x,30)))].filter(c=>cats.includes(c)&&!used.has(c)&&used.add(c))})).filter(g=>g.n)};
const cleanCatImg=(o,cats)=>{const r={};if(o&&typeof o==='object')for(const c of cats){const v=okImg(o[c]);if(v)r[c]=v}return r};
function gc(){if(SB)return;try{const u=new Set(),add=x=>{const m=/^\/img\/([\w-]+\.jpg)$/.exec(x||'');if(m)u.add(m[1])};db.menu.forEach(m=>add(m.img));db.slides.forEach(s=>add(s.i1));Object.values(db.catimg).forEach(add);db.groups.forEach(g=>add(g.i));for(const f of fs.readdirSync(UP))if(!u.has(f)&&Date.now()-fs.statSync(path.join(UP,f)).mtimeMs>864e5)fs.unlinkSync(path.join(UP,f))}catch(e){console.error('gc:',e.message)}}
// ---- Telegram: bot, tugmalar, Mini App ----
const tgOn=()=>!!(E.BOT_TOKEN&&CH_A),BOT={un:'',mode:''};
const TGS=crypto.createHash('sha256').update('wh|'+(E.BOT_TOKEN||'')+'|'+SEC).digest('hex').slice(0,48);
async function tgCall(method,body){
  const r=await fetch(`${TG}/bot${E.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(method==='getUpdates'?40000:10000)});
  const j=await r.json().catch(()=>({}));if(!j.ok){const e=new Error(j.description||'HTTP '+r.status);e.retry=(j.parameters||{}).retry_after;throw e}return j.result}
const SN=['Yangi','Yigʻilmoqda','Yoʻlda','Yetkazildi','Bekor qilindi'],SE=['🆕','🧺','🛵','✅','❌'];
const kst=o=>{const L=o.log||[];return L.some(e=>e.k==='rdy')?3:L.some(e=>e.k==='cook')?2:o.st>=1?1:0}; // oshxona: 1 qabul, 2 tayyorlanmoqda, 3 tayyor
const lab=o=>o.st===1?['','Qabul qilindi','Yigʻilmoqda','Tayyor'][kst(o)]:SN[o.st];
const emo=o=>o.st===1?['','📝','🧺','🍽'][kst(o)]:SE[o.st];
const tm=t=>new Date(t).toLocaleTimeString('ru-RU',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit'});
const nm=u=>cl([u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||'ID '+u.id,60);
const RT={a:' (admin)',c:' (kuryer)',p:' (panel)'},LG={acc:'✅ Qabul qildi',cook:'🧺 Yigʻishni boshladi',rdy:'🍽 Tayyor qildi',cl:'🙋 Kuryer',way:'🛵 Yoʻlga chiqdi',dl:'📦 Yetkazdi',cx:'❌ Bekor qildi'};
// Buyurtma xabari: ma'lumot + kim nima qilgani (tugmalar tepasida)
function msgText(o){
  const who=o.uid?`<a href="tg://user?id=${o.uid}">${h(o.name)}</a>`:h(o.name);
  let t=`${emo(o)} <b>Buyurtma #${o.id}</b> · <i>${lab(o)}</i>\n👤 ${who}\n📞 ${h(o.phone)}\n📍 ${h(o.addr)}\n━━━━━━━━\n`+o.items.map(i=>`• ${h(i.n)} × ${i.q} — ${(i.p*i.q).toLocaleString('ru-RU')}`).join('\n')+(o.fee?`\n🚚 Yetkazish${o.km?` (${o.km} km)`:''} — ${o.fee.toLocaleString('ru-RU')}${o.es||o.ax?' ⚠️ taxminiy':''}`:'')+`\n━━━━━━━━\n💰 <b>Jami: ${o.total.toLocaleString('ru-RU')} soʻm</b> (${o.pay})`+(o.note?`\n💬 ${h(o.note)}`:'')+(o.lat!=null?`\n🗺 <a href="https://yandex.uz/maps/?pt=${o.lng},${o.lat}&amp;z=17&amp;l=map">Yandex</a> · <a href="https://www.google.com/maps?q=${o.lat},${o.lng}">Google</a>${o.ls==='addr'?` (manzil matndan aniqlandi${o.ax?', taxminiy':''})`:''}`:'');
  const L=(o.log||[]).filter(e=>LG[e.k]);
  if(L.length)t+='\n━━━━━━━━\n'+L.map(e=>`${LG[e.k]}: <b>${h(e.by||'')}</b>${RT[e.r]||''} · ${tm(e.t)}`).join('\n');
  return t}
const btn=(t,k,o)=>({text:t,callback_data:`o|${o.id}|${k}`});
// role: 'a' = admin chati, 'c' = kuryerlar chati. Har bosilgandan keyin keyingi tugma chiqadi.
function kb(o,role){
  let r=[];
  if(role==='a'){
    if(o.st===0)r=[[btn('Qabul qilish','acc',o),btn('Bekor qilish','cx',o)]];
    else if(o.st===1&&kst(o)===1)r=[[btn('Yigʻilmoqda','cook',o)],[btn('Bekor qilish','cx',o)]];
    else if(o.st===1&&kst(o)===2)r=[[btn('Tayyor','rdy',o)],[btn('Bekor qilish','cx',o)]];
  }else{
    if(o.st===1)r=[[o.cr?btn('Yoʻlda','way',o):btn('Qabul qilish','cl',o)]];
    else if(o.st===2)r=[[btn('Yetkazildi','dl',o)]];
  }
  return {inline_keyboard:r}}
async function tgSend(o,role){
  const chat=role==='a'?CH_A:CH_C;
  const r=await tgCall('sendMessage',{chat_id:chat,text:msgText(o),parse_mode:'HTML',disable_web_page_preview:true,reply_markup:kb(o,role)});
  (o.m||(o.m={}))[role]={c:chat,i:r.message_id};
  if(o.lat!=null&&!o.ax)await tgCall('sendLocation',{chat_id:chat,latitude:o.lat,longitude:o.lng}).catch(()=>{});
}
async function tg(o){
  if(!tgOn())return false;
  try{await tgSend(o,'a');return true}catch(e){console.error('Telegram xatosi:',e.message);return false}
}
// Bir buyurtma xabarlari ketma-ket yangilanadi (tartib buzilmasligi uchun)
const rq=new Map();
const queue=(id,fn)=>{const p=(rq.get(id)||Promise.resolve()).then(fn,fn);rq.set(id,p);const d=()=>{if(rq.get(id)===p)rq.delete(id)};p.then(d,d);return p};
const renderChats=o=>queue(o.id,async()=>{
  if(!tgOn())return;
  for(const role of['a','c']){
    const m=o.m&&o.m[role];
    try{
      if(m)await tgCall('editMessageText',{chat_id:m.c,message_id:m.i,text:msgText(o),parse_mode:'HTML',disable_web_page_preview:true,reply_markup:kb(o,role)});
      else if(role==='c'&&CH_C&&o.st===1&&kst(o)===3)await tgSend(o,'c');
    }catch(e){if(!/not modified/i.test(e.message))console.error(`Telegram (${role}) xabarini yangilash xatosi:`,e.message)}
  }
  await saveOrder(o).catch(()=>{});
});
const DM={
  acc:o=>`Buyurtmangiz #${o.id} qabul qilindi.`,
  cook:o=>`Buyurtmangiz #${o.id} yigʻilmoqda.`,
  rdy:o=>`Buyurtmangiz #${o.id} tayyor. Kuryer tez orada yoʻlga chiqadi.`,
  cl:o=>`Kuryer <b>${h(String((o.cr||{}).name||'').split(' ')[0])}</b> buyurtmangizni qabul qildi.`,
  way:o=>`Buyurtmangiz #${o.id} yoʻlda.`+(o.cr?` Kuryer: <b>${h(String(o.cr.name).split(' ')[0])}</b>.`:''),
  dl:o=>`Buyurtmangiz #${o.id} yetkazildi. Xaridingiz uchun rahmat!`,
  cx:o=>`Buyurtmangiz #${o.id} bekor qilindi.`};
async function notifyUser(o,k){
  if(!o.uid||!E.BOT_TOKEN||!DM[k])return;
  try{await tgCall('sendMessage',{chat_id:o.uid,text:DM[k](o),parse_mode:'HTML',...(WA?{reply_markup:{inline_keyboard:[[{text:'Buyurtmani kuzatish',web_app:{url:WA+'/?open=orders'}}]]}}:{})})}
  catch(e){/* foydalanuvchi botni ishga tushirmagan boʻlishi mumkin */}
}
const KST={acc:1,way:2,dl:3,cx:4};
// Holatni oʻzgartirish (sinxron tekshiruv + oʻzgartirish: ikki kishi bir vaqtda bossa, faqat biri oʻtadi)
function transition(o,k,by){
  const r=by.r,cur=o.st,bad=msg=>({ok:false,msg});
  if(cur===3)return bad('Buyurtma allaqachon yetkazilgan');
  if(cur===4)return bad('Buyurtma bekor qilingan');
  if(r==='a'){
    if(k==='acc'){if(cur!==0)return bad('Buyurtma allaqachon qabul qilingan')}
    else if(k==='cx'){if(cur>1)return bad('Yoʻlga chiqqan buyurtmani bekor qilib boʻlmaydi')}
    else if(k==='cook'){if(cur!==1)return bad('Avval buyurtmani qabul qiling');if(kst(o)>1)return bad('Allaqachon yigʻilmoqda')}
    else if(k==='rdy'){if(cur!==1||kst(o)<2)return bad('Avval "Tayyorlanmoqda" tugmasini bosing');if(kst(o)>2)return bad('Allaqachon tayyor')}
    else return bad('Bu tugma operator chati uchun emas');
  }else{
    const who=o.cr&&o.cr.id!==by.id;
    if(k==='cl'){if(cur!==1||kst(o)<3)return bad('Buyurtma hali tayyor emas');if(o.cr)return bad(o.cr.id===by.id?'Siz allaqachon qabul qilgansiz':`Bu buyurtmani ${o.cr.name} qabul qilgan`)}
    else if(k==='way'){if(cur!==1||kst(o)<3)return bad('Buyurtma hali tayyor emas');if(!o.cr)return bad('Avval "Qabul qilish" tugmasini bosing');if(who)return bad(`Bu buyurtmani ${o.cr.name} qabul qilgan`)}
    else if(k==='dl'){if(cur!==2)return bad('Avval "Yoʻlda" tugmasini bosing');if(who)return bad(`Bu buyurtmani ${o.cr.name} qabul qilgan`)}
    else return bad('Bu tugma kuryerlar uchun emas');
  }
  const t=Date.now();(o.log||(o.log=[])).push({k,t,by:by.name,uid:by.id,r});
  if(k==='cl')o.cr={id:by.id,name:by.name};
  else if(k==='cook'||k==='rdy'){/* st oʻzgarmaydi: ichki bosqich */}
  else{
    o.st=KST[k];o.done=o.st>=3?t:null;
    if(k==='dl'&&r==='c'&&!o.cr)o.cr={id:by.id,name:by.name};
    if(o.st===3&&o.uid)userDelivered(o);
  }
  return{ok:true,msg:{acc:'Qabul qilindi',cook:'Yigʻilmoqda deb belgilandi',rdy:'Tayyor deb belgilandi',cl:'Buyurtma sizda',way:'Yoʻlda deb belgilandi',dl:'Yetkazildi deb belgilandi',cx:'Bekor qilindi'}[k]};
}
// Admin paneldan (zaxira usul) holatni toʻgʻridan-toʻgʻri oʻzgartirish
function panelSet(o,st){
  const k=['re','acc','way','dl','cx'][st],prev=o.st;
  o.st=st;o.done=st>=3?Date.now():null;(o.log||(o.log=[])).push({k,t:Date.now(),by:'Panel',uid:0,r:'p'});
  if(o.uid){if(st===3&&prev!==3)userDelivered(o);else if(prev===3&&st!==3)userDelivered(o,true)}
  return k;
}
async function after(o,k){
  await saveOrder(o).catch(e=>console.error('Buyurtmani yangilash xatosi:',e.message));
  await Promise.allSettled([renderChats(o),notifyUser(o,k)]);
  if(KEEP===0&&o.st>=3)await purge().catch(()=>{});
}
const answer=(id,text,alert)=>tgCall('answerCallbackQuery',{callback_query_id:id,text,show_alert:!!alert}).catch(()=>{});
async function onCb(cq){
  const m=/^o\|(\d+)\|(acc|cx|way|dl|cl|cook|rdy)$/.exec(cq.data||''),chat=cq.message&&cq.message.chat?String(cq.message.chat.id):'';
  const role=chat&&chat===CH_A?'a':chat&&CH_C&&chat===CH_C?'c':null;
  if(!m||!role)return answer(cq.id);
  const o=db.orders.find(x=>x.id===+m[1]);
  if(!o)return answer(cq.id,'Buyurtma topilmadi (arxivdan oʻchirilgan boʻlishi mumkin)',true);
  const res=transition(o,m[2],{id:cq.from.id,name:nm(cq.from),r:role});
  if(!res.ok){await answer(cq.id,res.msg,true);return void renderChats(o)}
  await answer(cq.id,res.msg,false);
  await after(o,m[2]);
}
async function onUpdate(u){
  if(u.callback_query)return onCb(u.callback_query);
  const m=u.message;if(!m||!m.text)return;const cmd=m.text.split(/[\s@]/)[0];
  if(cmd==='/start'&&m.chat.type==='private'){
    const f=m.from||{};if(f.id){try{const x=touchUser(f);if(x.bl){delete x.bl;saveUser(x)}}catch(e){}}
    const first=h(cl(f.first_name||f.username||'doʻstim',40));
    return tgCall('sendMessage',{chat_id:m.chat.id,parse_mode:'HTML',text:`Assalomu alaykum, <b>${first}</b>!\n\n<b>Sevimli Market</b> botiga xush kelibsiz!\nOptom oziq-ovqat doʻkoni: meva, sabzavot, sut mahsulotlari, goʻsht va boshqalar.`,...(WA?{reply_markup:{inline_keyboard:[[{text:'Katalogni ochish',web_app:{url:WA}}],[{text:'Buyurtmalarim',web_app:{url:WA+'/?open=orders'}}]]}}:{})}).catch(()=>{});
  }
}
async function poll(){
  let off=0;for(;;){
    try{const r=await tgCall('getUpdates',{offset:off,timeout:25,allowed_updates:['message','callback_query']});for(const u of r){off=u.update_id+1;onUpdate(u).catch(e=>console.error('Update xatosi:',e.message))}}
    catch(e){console.error('getUpdates xatosi:',e.message);await new Promise(s=>setTimeout(s,4000))}
  }
}
async function tgStart(){
  if(!E.BOT_TOKEN)return;
  try{
    const me=await tgCall('getMe');BOT.un=me.username||'';
    await tgCall('setMyCommands',{commands:[{command:'start',description:'Boshlash'}]}).catch(()=>{});
    if(WA){
      await tgCall('setWebhook',{url:WA+'/tg/hook',secret_token:TGS,allowed_updates:['message','callback_query'],max_connections:10});BOT.mode='webhook';
      await tgCall('setChatMenuButton',{menu_button:{type:'web_app',text:'Katalog',web_app:{url:WA}}}).catch(e=>console.error('Katalog tugmasini oʻrnatib boʻlmadi:',e.message));
    }else{await tgCall('deleteWebhook',{});BOT.mode='polling';poll()}
    console.log('Telegram bot: @'+BOT.un,'|',BOT.mode==='webhook'?'webhook':'polling (mahalliy)',CH_C?'| kuryerlar chati ulangan':'');
  }catch(e){console.error('Telegram bot ishga tushmadi:',e.message)}
}
// ---- Telegram Mini App foydalanuvchilari ----
const saveUser=x=>{if(SB)sbPut('user:'+x.id,x).catch(e=>console.error('Foydalanuvchini saqlash xatosi:',e.message));else try{saveLocal()}catch(e){console.error(e.message)}};
// Mini App berган initData ni Telegram imzosi bilan tekshiradi (soxta ID yuborib boʻlmaydi)
function tgUser(req){
  const raw=String(req.headers['x-tg-init']||'');if(!raw||raw.length>4096||!E.BOT_TOKEN)return null;
  let p;try{p=new URLSearchParams(raw)}catch{return null}
  const hash=p.get('hash');if(!hash||!/^[a-f0-9]{64}$/.test(hash))return null;p.delete('hash');
  const dcs=[...p.entries()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0).map(([k,v])=>k+'='+v).join('\n');
  const key=crypto.createHmac('sha256','WebAppData').update(E.BOT_TOKEN).digest();
  if(!crypto.timingSafeEqual(crypto.createHmac('sha256',key).update(dcs).digest(),Buffer.from(hash,'hex')))return null;
  const ad=+p.get('auth_date');if(!ad||Date.now()/1000-ad>172800)return null;
  try{const u=JSON.parse(p.get('user')||'null');return u&&Number.isSafeInteger(u.id)?u:null}catch{return null}
}
function touchUser(u,noSave){
  const n=Date.now(),id=String(u.id),fn=cl(u.first_name,60),ln=cl(u.last_name,60),un=cl(u.username,40),lc=cl(u.language_code,8);let x=db.users[id],ch=false;
  if(!x){x=db.users[id]={id:u.id,fn,ln,un,lc,t0:n,t1:n,n:0,s:0,ph:'',ad:''};ch=true}
  else if(x.fn!==fn||x.ln!==ln||x.un!==un||n-x.t1>36e5){Object.assign(x,{fn,ln,un,lc,t1:n});ch=true}
  if(ch&&!noSave)saveUser(x);return x}
function userDelivered(o,back){const x=db.users[o.uid];if(x){x.s=Math.max(0,x.s+(back?-o.total:o.total));saveUser(x)}}
const pub=o=>{const g=k=>((o.log||[]).find(e=>e.k===k)||{}).t||0;return{id:o.id,t:o.t,st:o.st,total:o.total,sub:o.sub!=null?o.sub:o.total,fee:o.fee||0,km:o.km||0,items:o.items,addr:o.addr,pay:o.pay,kp:o.st===1?kst(o):0,ts:{acc:g('acc'),cook:g('cook'),rdy:g('rdy'),way:g('way'),dl:g('dl'),cx:g('cx')},cr:o.cr?String(o.cr.name).split(' ')[0]:''}};
// ---- Xabar yuborish: admin botdagi mijozlarga matn / rasm / video yuboradi ----
const os=require('os'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BCDIR=path.join(os.tmpdir(),'sevimli-bc'),BC_MAX=48*1048576,BCF=new Map(),bc={job:null};
try{fs.mkdirSync(BCDIR,{recursive:true})}catch(e){}
setInterval(()=>{const n=Date.now();for(const[k,f]of BCF)if(n-f.t>3*36e5){BCF.delete(k);fs.unlink(f.path,()=>{})}},9e5).unref();
const kindOf=(mime,size)=>/^image\/gif$/i.test(mime)?'animation':/^image\/(jpeg|png|webp)$/i.test(mime)?(size<=10*1048576?'photo':'doc'):/^video\/(mp4|quicktime)$/i.test(mime)?'video':'doc';
async function tgForm(method,fields,file){
  const fd=new FormData();for(const[k,v]of Object.entries(fields))fd.append(k,typeof v==='object'?JSON.stringify(v):String(v));
  fd.append(file.field,new Blob([file.buf],{type:file.mime}),file.name);
  const r=await fetch(`${TG}/bot${E.BOT_TOKEN}/${method}`,{method:'POST',body:fd,signal:AbortSignal.timeout(180000)});
  const j=await r.json().catch(()=>({}));if(!j.ok){const e=new Error(j.description||'HTTP '+r.status);e.retry=(j.parameters||{}).retry_after;throw e}return j.result;
}
const BM={photo:['sendPhoto','photo'],video:['sendVideo','video'],animation:['sendAnimation','animation'],doc:['sendDocument','document']};
const fileIdOf=(kind,r)=>kind==='photo'?r.photo[r.photo.length-1].file_id:kind==='video'?r.video.file_id:kind==='animation'?(r.animation||r.document).file_id:r.document.file_id;
// Bitta chatga xabar yuboradi. Fayl birinchi marta yuklanadi, keyin Telegram file_id si bilan qayta ishlatiladi
async function bcSendOne(chat,spec){
  const mk=spec.menu&&WA?{inline_keyboard:[[{text:'Katalogni ochish',web_app:{url:WA}}]]}:null;
  if(!spec.file)return tgCall('sendMessage',{chat_id:chat,text:spec.text,...(mk?{reply_markup:mk}:{})});
  const cap=spec.text&&spec.text.length<=1024?spec.text:'';
  const send=async kind=>{
    const[method,field]=BM[kind],base={chat_id:chat,...(cap?{caption:cap}:{}),...(mk&&(!spec.text||cap)?{reply_markup:mk}:{}),...(kind==='video'?{supports_streaming:true}:{})};
    if(spec.tgid&&spec.kind===kind)return tgCall(method,{...base,[field]:spec.tgid});
    const buf=await fs.promises.readFile(spec.file.path),r=await tgForm(method,base,{field,buf,mime:spec.file.mime,name:spec.file.name});
    spec.tgid=fileIdOf(kind,r);spec.kind=kind;return r;
  };
  try{await send(spec.kind)}catch(e){
    if(spec.kind==='photo'&&/PHOTO_|dimension|too big/i.test(e.message)){spec.tgid='';await send('doc')}else throw e;
  }
  if(spec.text&&!cap)await tgCall('sendMessage',{chat_id:chat,text:spec.text,...(mk?{reply_markup:mk}:{})});
}
async function bcRun(job,spec,recips){
  for(const x of recips){
    if(job.cancel)break;
    for(let tries=0;;){
      try{await bcSendOne(x.id,spec);job.ok++;break}
      catch(e){
        if(e.retry&&tries++<2){await sleep((e.retry+1)*1000);continue}
        if(/blocked|deactivated|chat not found|forbidden|initiate conversation/i.test(e.message)){job.bl++;x.bl=Date.now();saveUser(x)}else{job.fail++;job.err=e.message}
        break;
      }
    }
    job.done++;await sleep(60);
  }
  job.state=job.cancel?'cancelled':'done';job.end=Date.now();
  if(spec.file){BCF.delete(spec.file.fid);fs.unlink(spec.file.path,()=>{})}
}
async function bcUpload(req,res){
  const q=new URL(req.url,'http://x').searchParams,name=cl(q.get('name')||'fayl',80).replace(/[^\w.\- ]/g,'_')||'fayl',mime=cl(q.get('mime')||'application/octet-stream',80);
  if((+req.headers['content-length']||0)>BC_MAX)return send(res,413,{error:'Fayl 48 MB dan katta boʻlmasligi kerak'});
  const fid=crypto.randomBytes(12).toString('hex'),fp=path.join(BCDIR,fid);let n=0;
  try{
    await new Promise((ok,no)=>{const ws=fs.createWriteStream(fp);req.on('data',c=>{n+=c.length;if(n>BC_MAX){no(new Error('big'));req.unpipe(ws);ws.destroy();req.resume()}});req.pipe(ws);ws.on('finish',ok);ws.on('error',no);req.on('error',no)});
  }catch(e){fs.unlink(fp,()=>{});return send(res,e.message==='big'?413:500,{error:e.message==='big'?'Fayl 48 MB dan katta boʻlmasligi kerak':'Faylni qabul qilib boʻlmadi'})}
  if(!n){fs.unlink(fp,()=>{});return send(res,400,{error:'Fayl boʻsh'})}
  const kind=kindOf(mime,n);BCF.set(fid,{fid,path:fp,name,mime,kind,size:n,t:Date.now()});
  return send(res,200,{fid,name,kind,size:n});
}
const bcInfo=()=>({audience:Object.values(db.users).filter(x=>!x.bl).length,total:Object.keys(db.users).length,job:bc.job,bot:!!E.BOT_TOKEN,menu:!!WA,admin:!!CH_A});
async function bcStart(b,res){
  if(!E.BOT_TOKEN)return send(res,400,{error:'Telegram bot ulanmagan'});
  if(bc.job&&bc.job.state==='running')return send(res,409,{error:'Hozir boshqa xabar yuborilmoqda. Tugashini kuting'});
  const text=String(b.text||'').trim();if(text.length>4096)return send(res,400,{error:'Matn 4096 belgidan oshmasligi kerak'});
  const f=b.fid?BCF.get(String(b.fid)):null;if(b.fid&&!f)return send(res,400,{error:'Fayl topilmadi, uni qayta tanlang'});
  if(!text&&!f)return send(res,400,{error:'Xabar matnini yozing yoki rasm/video tanlang'});
  const spec={text,file:f,kind:f?f.kind:'',menu:!!b.menu,tgid:''};
  if(b.test){
    if(!CH_A)return send(res,400,{error:'Admin guruhi (CHAT_ID) ulanmagan'});
    try{await bcSendOne(CH_A,spec)}catch(e){return send(res,200,{ok:false,error:e.message})}
    return send(res,200,{ok:true});
  }
  const recips=Object.values(db.users).filter(x=>!x.bl);
  if(!recips.length)return send(res,400,{error:'Hozircha xabar yuboriladigan mijoz yoʻq. Mijozlar botga /start bosganda yoki Mini App ga kirganda roʻyxatga tushadi'});
  const job={id:Date.now(),t:Date.now(),state:'running',total:recips.length,done:0,ok:0,fail:0,bl:0,err:'',text:text.slice(0,120),kind:f?f.kind:'text'};bc.job=job;
  bcRun(job,spec,recips).catch(e=>{job.state='done';console.error('Xabar yuborish xatosi:',e.message)});
  return send(res,200,{ok:true,job});
}
// ---- auth ----
const sign=x=>crypto.createHmac('sha256',SEC).update(x).digest('hex'),sha=x=>crypto.createHash('sha256').update(x).digest();
const authed=req=>{const m=(req.headers.cookie||'').match(/(?:^|; )s=(\d+)\.([a-f0-9]+)/);if(!m||!SEC)return false;const a=Buffer.from(sign(m[1])),b=Buffer.from(m[2]);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&+m[1]>Date.now()};
const tries=new Map(),ordT=new Map(),postT=new Map(),quoT=new Map();
setInterval(()=>{const n=Date.now();for(const m of[tries,ordT,postT,quoT])for(const[k,v]of m)if(Array.isArray(v)?!v.some(t=>n-t<6e5):n-v.t>6e5)m.delete(k)},6e5).unref();
const body=(req,max=2e5)=>new Promise((r,j)=>{let d='';req.on('data',c=>{d+=c;if(d.length>max){req.destroy();j(new Error('big'))}});req.on('end',()=>{try{r(JSON.parse(d||'{}'))}catch{j(new Error('json'))}})});
const gz=(res,body,h)=>{if(body.length>1024&&/\bgzip\b/.test((res.req&&res.req.headers['accept-encoding'])||'')){h['content-encoding']='gzip';h.vary='accept-encoding';return zlib.gzipSync(body)}return body};
const send=(res,c,o,hd={})=>{const h={'content-type':'application/json; charset=utf-8','cache-control':'no-store',...hd};const b=gz(res,Buffer.from(JSON.stringify(o)),h);res.writeHead(c,h);res.end(b)};
const sendFile=(res,f,type,hd={})=>fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff',...hd});res.end(d)});
const page=(res,f,extra={},frame=false)=>fs.readFile(path.join(PUB,f),'utf8',(e,d)=>{
  if(e){res.writeHead(404);return res.end('404')}
  const n=crypto.randomBytes(16).toString('base64');
  if(f==='index.html')d=d.replace('/*SETTINGS*/','Object.assign(CFG,'+JSON.stringify(cfgPub()).replace(/</g,'\\u003c')+');');
  const h={'content-type':'text/html; charset=utf-8','cache-control':'no-cache',...(frame?{}:{'x-frame-options':'DENY'}),'content-security-policy':CSP(n,frame),...extra};
  const b=gz(res,Buffer.from(d.replace(/<script>/g,'<script nonce="'+n+'">')),h);res.writeHead(200,h);res.end(b);
});
const fail=(res,e)=>{console.error('Saqlash xatosi:',e.message);send(res,500,{error:'Saqlab boʻlmadi: '+e.message})};
const server=http.createServer(async(req,res)=>{try{
  {const hh=req.headers.host;if(!E.SITE_URL&&hh&&/^[\w.-]+(:\d+)?$/.test(hh))SITE=(req.headers['x-forwarded-proto']==='https'||!/^(localhost|127\.)/.test(hh)?'https':'http')+'://'+hh}
  const M=req.method==='HEAD'?'GET':req.method,u=req.url.split('?')[0],ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','strict-origin-when-cross-origin');res.setHeader('permissions-policy','geolocation=(self), camera=(), microphone=(), payment=()');res.setHeader('cross-origin-opener-policy','same-origin');
  if(req.headers['x-forwarded-proto']==='https')res.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
  if(M==='GET'){
    if(u==='/healthz')return send(res,200,{ok:1,db:SB?'supabase':'local'});
    if(u==='/')return page(res,'index.html',{},true);
    if(u===AP)return page(res,'admin.html',{'x-robots-tag':'noindex, nofollow','cache-control':'no-store','referrer-policy':'same-origin'});
    if(u==='/logo.png'||u==='/favicon.png')return sendFile(res,path.join(PUB,u),'image/png',{'cache-control':'public, max-age=86400'});
    let m;
    if(!SB&&(m=u.match(/^\/img\/([\w-]+\.jpg)$/)))return sendFile(res,path.join(UP,m[1]),'image/jpeg',{'cache-control':'public, max-age=2592000'});
    if(u==='/api/cfg')return send(res,200,cfgPub());
    if(u==='/api/menu')return send(res,200,db.menu.filter(x=>x.a));
    if(u==='/api/groups')return send(res,200,db.groups);
    if(u==='/api/cats')return send(res,200,db.cats.map(c=>({n:c,i:db.catimg[c]||''})));
    if(u==='/api/slides')return send(res,200,db.slides.filter(x=>x.a));
    if(u==='/api/my'){
      const tu=tgUser(req);if(!tu)return send(res,401,{error:'Telegram ichida oching'});
      const x=touchUser(tu);
      return send(res,200,{me:{id:x.id,fn:x.fn,ln:x.ln,un:x.un,n:x.n,s:x.s,ph:x.ph,ad:x.ad},orders:db.orders.filter(o=>o.uid===x.id).slice(-30).reverse().map(pub)});
    }
    if(u==='/api/admin/bc'){if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});return send(res,200,bcInfo())}
    if(u==='/api/admin/stats'){
      if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});
      const q=new URL(req.url,'http://x').searchParams,from=q.get('from')||'',to=q.get('to')||'',re=/^\d{4}-\d{2}-\d{2}$/;
      if(!re.test(from)||!re.test(to)||isNaN(Date.parse(from))||isNaN(Date.parse(to)))return send(res,400,{error:'Sana notoʻgʻri'});
      const span=Math.round((Date.parse(to)-Date.parse(from))/864e5)+1;
      if(span<1)return send(res,400,{error:'Boshlanish sanasi tugash sanasidan keyin boʻlmasligi kerak'});
      if(span>366)return send(res,400,{error:'Davr 1 yildan oshmasligi kerak (eng koʻp 366 kun)'});
      const iso=t=>new Date(t).toISOString().slice(0,10);
      return send(res,200,{from,to,span,...statsRange(from,to),prev:statsRange(iso(Date.parse(from)-span*864e5),iso(Date.parse(from)-864e5)).tot});
    }
    if(u==='/api/admin/users'){
      if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});
      const l=Object.values(db.users).sort((a,b)=>b.t1-a.t1);return send(res,200,{total:l.length,users:l.slice(0,500)});
    }
    if(u==='/api/admin/data')return authed(req)?send(res,200,{menu:db.menu,cats:db.cats,settings:cfgFull(),ymap:!!cfgPub().yandexKey,orders:db.orders.slice(-300),slides:db.slides,catimg:db.catimg,groups:db.groups,tg:{on:tgOn(),courier:!!CH_C,bot:BOT.un,mode:BOT.mode,app:WA},today:statsRange(dkey(Date.now()),dkey(Date.now())).tot,db:SB?'supabase':'local',keep:KEEP}):send(res,401,{error:'Ruxsat yoʻq'});
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});return res.end('404 — sahifa topilmadi');
  }
  if(M!=='POST')return res.writeHead(405).end();
  if(u==='/tg/hook'){
    const s=String(req.headers['x-telegram-bot-api-secret-token']||'');
    if(!E.BOT_TOKEN||s.length!==TGS.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(TGS)))return send(res,403,{error:'Ruxsat yoʻq'});
    let up;try{up=await body(req,1e6)}catch{return send(res,400,{error:'Xato soʻrov'})}
    send(res,200,{ok:1});onUpdate(up).catch(e=>console.error('Update xatosi:',e.message));return;
  }
  const og=req.headers.origin;if(og){try{if(new URL(og).host!==req.headers.host)return send(res,403,{error:'Ruxsat yoʻq'})}catch{return send(res,403,{error:'Ruxsat yoʻq'})}}
  if(u==='/api/admin/bc/file'){if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});return bcUpload(req,res)}
  if(!/^application\/json/i.test(req.headers['content-type']||''))return send(res,415,{error:'Notoʻgʻri soʻrov turi'});
  const pn=Date.now(),pl=(postT.get(ip)||[]).filter(t=>pn-t<6e4);if(pl.length>=120)return send(res,429,{error:'Juda koʻp soʻrov'});pl.push(pn);postT.set(ip,pl);
  let b;try{b=await body(req,u==='/api/admin/upload'&&authed(req)?5e6:2e5)}catch(e){return send(res,e.message==='big'?413:400,{error:e.message==='big'?'Soʻrov juda katta (rasm hajmi katta)':'Xato soʻrov'})}
  if(u==='/api/quote'||u==='/api/rev'||u==='/api/suggest'||u==='/api/maplog'){
    const sg=u==='/api/suggest',rv=u==='/api/rev',qk=sg?'s'+ip:rv?'r'+ip:ip,qn=Date.now(),ql=(quoT.get(qk)||[]).filter(t=>qn-t<6e4);if(ql.length>=(sg?90:rv?150:40))return send(res,429,{error:'Juda koʻp soʻrov. Birozdan keyin urinib koʻring'});ql.push(qn);quoT.set(qk,ql);
    if(u==='/api/maplog'){if(b.i)MAPINFO=cl(b.i,200);else MAPERR={t:Date.now(),e:cl(b.e,300),csp:cl(b.csp,400)};return send(res,200,{ok:1})}
    if(sg)return send(res,200,{list:await suggest(b.q,cfgFull())});
    if(u==='/api/rev'){const p=ptOf(b);if(!p)return send(res,400,{error:'Koordinata notoʻgʻri'});return send(res,200,{addr:await Promise.race([revgeo(p.lat,p.lng,cfgFull()).catch(()=>''),new Promise(r=>setTimeout(()=>r(''),9000))])})}
    try{return send(res,200,await quote(b))}catch(e){return send(res,400,{error:e.message})}
  }
  if(u==='/api/order'){
    if(b.hp)return send(res,200,{id:0});
    const now=Date.now(),L=(ordT.get(ip)||[]).filter(t=>now-t<6e5);
    if(L.length>=6)return send(res,429,{error:'Juda koʻp buyurtma. Birozdan keyin urinib koʻring'});
    const items=[];let total=0;
    for(const it of Array.isArray(b.items)?b.items.slice(0,40):[]){const m=db.menu.find(x=>x.id===it.id&&x.a),q=Math.floor(+it.q);if(m&&q>=1&&q<=50){items.push({n:m.n,q,p:m.p});total+=m.p*q}}
    const name=cl(b.name,60),addr=cl(b.addr,260)||'Xaritada belgilangan nuqta',pd=String(b.phone||'').replace(/\D/g,''),nd=pd.startsWith('998')?pd.slice(3):pd.replace(/^0+/,''),phone=nd.length===9?`+998 ${nd.slice(0,2)} ${nd.slice(2,5)} ${nd.slice(5,7)} ${nd.slice(7)}`:'';
    if(!items.length)return send(res,400,{error:'Savat boʻsh yoki mahsulotlar mavjud emas'});
    if(!name)return send(res,400,{error:'Ismingizni kiriting'});
    if(!phone)return send(res,400,{error:'Telefon raqamini toʻliq kiriting: +998 XX XXX XX XX'});
    const la=b.lat==null||b.lat===''?NaN:+b.lat,lo=b.lng==null||b.lng===''?NaN:+b.lng,geo=Number.isFinite(la)&&Number.isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180;
    if(!geo)return send(res,400,{error:'Yetkazish manzilini xaritadan tanlang'});
    const cf=cfgFull(),me=minErr(total,cf);if(me)return send(res,400,{error:me});
    let dq={fee:0,km:0};if(cf.delOn){try{dq=await quote(b)}catch(e){return send(res,400,{error:e.message})}}
    const sub=total,fee=dq.fee||0,gp=dq.lat!=null?{lat:dq.lat,lng:dq.lng}:geo?{lat:+la.toFixed(6),lng:+lo.toFixed(6)}:null;
    const tu=tgUser(req),o={id:++db.lastId,t:now,name,phone,addr,note:cl(b.note,300),pay:'Naqd',items,sub,fee,km:dq.km||0,total:sub+fee,st:0,tg:null,log:[{k:'new',t:now}],m:{},...(tu?{uid:tu.id}:{}),...(gp?{lat:gp.lat,lng:gp.lng}:{}),...(dq.src?{ls:dq.src}:{}),...(dq.src==='addr'&&dq.apx?{ax:1}:{}),...(dq.est?{es:1}:{})};
    L.push(now);ordT.set(ip,L);db.orders.push(o);
    if(tu){const x=touchUser(tu,true);x.n++;x.ph=phone;x.ad=addr;x.t1=now;saveUser(x)}
    if(SB)sbPut('meta',{lastId:db.lastId}).catch(()=>{});
    await saveOrder(o).catch(e=>console.error('Buyurtmani saqlash xatosi:',e.message));
    send(res,200,{id:o.id,total:o.total,sub:o.sub,fee:o.fee,km:o.km});
    tg(o).then(ok=>{o.tg=ok;return saveOrder(o)}).catch(e=>console.error('Buyurtmani yangilash xatosi:',e.message));
    return;
  }
  if(u==='/api/login'){
    const t=tries.get(ip)||{n:0,t:Date.now()};if(Date.now()-t.t>6e4){t.n=0;t.t=Date.now()}
    if(t.n>=5)return send(res,429,{error:'Biroz kuting'});t.n++;tries.set(ip,t);
    if(!PASS||!crypto.timingSafeEqual(sha(String(b.password||'')),sha(PASS)))return send(res,401,{error:'Parol notoʻgʻri'});
    const x=String(Date.now()+6048e5),sec=req.headers['x-forwarded-proto']==='https'?'; Secure':'';
    return send(res,200,{ok:1},{'set-cookie':`s=${x}.${sign(x)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${sec}`});
  }
  if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});
  if(u==='/api/admin/logout')return send(res,200,{ok:1},{'set-cookie':'s=; Path=/; HttpOnly; Max-Age=0'});
  if(u==='/api/admin/status'){const o=db.orders.find(x=>x.id===b.id);if(!o)return send(res,404,{error:'Buyurtma topilmadi'});if(!Number.isInteger(b.st)||b.st<0||b.st>4)return send(res,400,{error:'Holat notoʻgʻri'});if(b.st!==o.st){const k=panelSet(o,b.st);await after(o,k)}return send(res,200,{ok:1})}
  if(u==='/api/admin/resend'){const o=db.orders.find(x=>x.id===b.id);if(!o)return send(res,404,{error:'Buyurtma topilmadi'});o.tg=await tg(o);try{await saveOrder(o)}catch(e){return fail(res,e)}return send(res,200,{ok:o.tg})}
  if(u==='/api/admin/menu'&&Array.isArray(b.menu)){
    const items=b.menu.slice(0,300).map(cleanMenu).filter(m=>m.n&&m.p>0),cats=cleanCats(b.cats);
    for(const m of items)if(!cats.includes(m.c))cats.push(m.c); // kategoriyasi roʻyxatda yoʻq taom yoʻqolmasin
    db.menu=items;db.cats=cats.slice(0,30);db.catimg=cleanCatImg(b.catimg,db.cats);db.groups=cleanGroups(b.groups,db.cats);
    try{await saveK('menu');await saveK('cats');await saveK('catimg');await saveK('groups')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,menu:db.menu,cats:db.cats,catimg:db.catimg,groups:db.groups});
  }
  if(u==='/api/admin/bc/send')return bcStart(b,res);
  if(u==='/api/admin/bc/cancel'){if(bc.job&&bc.job.state==='running')bc.job.cancel=true;return send(res,200,{ok:1})}
  if(u==='/api/admin/settings'&&b.settings&&typeof b.settings==='object'){db.settings=cleanSettings(b.settings);try{await saveK('settings')}catch(e){return fail(res,e)}return send(res,200,{ok:1,settings:cfgFull(),ymap:!!cfgPub().yandexKey})}
  if(u==='/api/admin/slides'&&Array.isArray(b.slides)){db.slides=b.slides.slice(0,20).map(cleanSlide).filter(s=>s.h);try{await saveK('slides')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,slides:db.slides})}
  if(u==='/api/admin/upload'){
    const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(b.data||'');if(!m)return send(res,400,{error:'Rasm formati notoʻgʻri (JPG boʻlishi kerak)'});
    const buf=Buffer.from(m[1],'base64');if(buf.length>4e6)return send(res,413,{error:'Rasm juda katta'});
    if(!(buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff))return send(res,400,{error:'Bu rasm fayli emas'});
    const f=crypto.randomBytes(8).toString('hex')+'.jpg';
    try{if(SB)return send(res,200,{url:await sbUpload(f,buf)});fs.writeFileSync(path.join(UP,f),buf);return send(res,200,{url:'/img/'+f})}catch(e){return fail(res,e)}
  }
  if(u==='/api/admin/ytest'){
    const c=cfgFull(),gk=yKey(c),jk=c.yandexKey||cl(E.YANDEX_MAPS_KEY,80).replace(/[^\w-]/g,'');
    const chk=async url=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(7000),headers:{'user-agent':UA,...yh(url)}}),t=await r.text();return{ok:r.ok,status:r.status,msg:r.ok?'':t.slice(0,160)}}catch(e){return{ok:false,status:0,msg:e.message}}};
    const no={ok:false,status:0,msg:'Kalit kiritilmagan'};
    return send(res,200,{geo:gk?await chk(YGEO+'?'+new URLSearchParams({apikey:gk,geocode:'Poytug',format:'json',results:'1'})):no,js:jk?await chk('https://api-maps.yandex.ru/v3/?'+new URLSearchParams({apikey:jk,lang:'ru_RU'})):no,map:MAPERR,rev:await revgeo(c.lat,c.lng,c,1).catch(()=>''),revsrc:LREV,revlog:RLOG,yerr:YST.e,build:BUILD,info:MAPINFO});
  }
  if(u==='/api/admin/quote'){try{return send(res,200,await quote(b,true))}catch(e){return send(res,400,{error:e.message})}}
  if(u==='/api/admin/telegram-test'){
    if(!tgOn())return send(res,200,{ok:false,error:'BOT_TOKEN yoki CHAT_ID berilmagan. .env faylini tekshiring.'});
    try{
      const me=await tgCall('getMe'),chats=[];
      await tgCall('sendMessage',{chat_id:CH_A,text:'✅ Sevimli Market: test xabar. Admin chati ulangan.'});chats.push('Admin chati: ishlayapti');
      if(CH_C){try{await tgCall('sendMessage',{chat_id:CH_C,text:'✅ Sevimli Market: test xabar. Kuryerlar chati ulangan.'});chats.push('Kuryerlar chati: ishlayapti')}catch(e){chats.push('Kuryerlar chati: xato ('+e.message+')')}}
      return send(res,200,{ok:true,bot:'@'+me.username,chats});
    }catch(e){return send(res,200,{ok:false,error:e.message})}
  }
  send(res,404,{error:'Topilmadi'});
}catch(e){console.error(e);try{send(res,500,{error:'Server xatosi'})}catch{}}});
async function boot(){
  if(SB){
    let rows;
    try{rows=await sbAll()}catch(e){console.error('Supabase bilan ulanib boʻlmadi: '+e.message+'\nAgar "kv" jadvali yoʻq boʻlsa, supabase.sql ni Supabase SQL Editor da ishga tushiring.');process.exit(1)}
    const g=k=>{const r=rows.find(x=>x.key===k);return r&&Array.isArray(r.value)?r.value:null};
    for(const k of['menu','slides']){const v=g(k);if(v)db[k]=v;else await saveK(k).catch(e=>console.error('Boshlangʻich maʼlumotni yozib boʻlmadi:',e.message))}
    {const v=g('groups');if(v)db.groups=v}
    {const r=rows.find(x=>x.key==='catimg');if(r&&r.value&&typeof r.value==='object'&&!Array.isArray(r.value))db.catimg=r.value}
    {const v=g('cats');if(v)db.cats=cleanCats(v);else{db.cats=cleanCats(db.menu.map(m=>m.c));await saveK('cats').catch(e=>console.error('Boshlangʻich maʼlumotni yozib boʻlmadi:',e.message))}}
    {const r=rows.find(x=>x.key==='settings');if(r&&r.value&&typeof r.value==='object'&&!Array.isArray(r.value))db.settings=cleanSettings(r.value)}
    for(const r of rows)if(String(r.key).startsWith('user:')&&r.value&&r.value.id)db.users[r.value.id]=r.value;
    {const r=rows.find(x=>x.key==='stats');if(r&&r.value&&typeof r.value==='object'&&!Array.isArray(r.value))db.stats=r.value}
    db.orders=rows.filter(x=>String(x.key).startsWith('order:')).map(x=>x.value).sort((a,b)=>a.id-b.id);
    const mt=rows.find(x=>x.key==='meta');db.lastId=Math.max(1000,(mt&&mt.value&&+mt.value.lastId)||0);
    await sbFetch(`${SB.u}/storage/v1/bucket`,{method:'POST',headers:sbh({'content-type':'application/json'}),body:JSON.stringify({id:SB.b,name:SB.b,public:true})},1).catch(()=>{});
    setInterval(()=>sbFetch(`${SB.u}/rest/v1/kv?select=key&limit=1`,{headers:sbh()}).catch(e=>console.error('Supabase keep-alive:',e.message)),6*36e5);
  }else{try{const d=JSON.parse(fs.readFileSync(DB,'utf8'));for(const k of['menu','slides'])if(Array.isArray(d[k]))db[k]=d[k];db.cats=cleanCats(Array.isArray(d.cats)?d.cats:db.menu.map(m=>m.c));if(Array.isArray(d.groups))db.groups=d.groups;if(d.catimg&&typeof d.catimg==='object')db.catimg=d.catimg;if(d.settings&&typeof d.settings==='object')db.settings=cleanSettings(d.settings);if(d.users&&typeof d.users==='object'&&!Array.isArray(d.users))db.users=d.users;if(d.stats&&typeof d.stats==='object'&&!Array.isArray(d.stats))db.stats=d.stats;if(Array.isArray(d.orders))db.orders=d.orders;db.lastId=Math.max(1000,+d.lastId||0)}catch{}gc()}
  for(const m of db.menu)if(!db.cats.includes(m.c))db.cats.push(m.c);
  // eski (Marakand) maʼlumot qolgan boʻlsa — Sevimli Market namunasi bilan almashtiramiz
  if(db.menu.some(m=>m.n==='Osh (palov)')){db.menu=seedMenu;db.cats=cleanCats(seedMenu.map(m=>m.c));db.groups=seedGroups;db.catimg={};if(db.settings&&(db.settings.phone==='1414'||/Navoiy/.test(db.settings.address||'')))db.settings={};for(const k of['menu','cats','groups','catimg','settings'])await saveK(k).catch(()=>{})}
  if(db.slides.some(x=>/Kafemizga|Marakand/i.test((x.h||'')+(x.p||'')))){db.slides=seedSlides;await saveK('slides').catch(()=>{})}
  for(const m of db.menu)if(!db.cats.includes(m.c))db.cats.push(m.c);
  db.catimg=cleanCatImg(db.catimg,db.cats);db.groups=cleanGroups(db.groups,db.cats);
  db.lastId=Math.max(db.lastId,...db.orders.map(o=>+o.id||0),1000);db.orders.forEach(o=>{if(o.st>=3&&!o.done)o.done=Date.now()});
  await purge();setInterval(()=>purge().catch(()=>{}),36e5).unref();
  // Render bepul rejasi 15 daqiqa soʻrovsiz qolsa uxlab qoladi: har 10 daqiqada oʻz manzilimizga soʻrov yuboramiz
  if(/^https:\/\//.test(E.RENDER_EXTERNAL_URL||''))setInterval(()=>fetch(E.RENDER_EXTERNAL_URL.replace(/\/+$/,'')+'/healthz',{signal:AbortSignal.timeout(15000)}).catch(()=>{}),10*6e4).unref();
  // Supabase bepul loyihasi 1 hafta harakatsiz qolsa pauza boʻladi: kuniga ikki marta yengil soʻrov yuboramiz
  if(SB)setInterval(()=>sbFetch(`${SB.u}/rest/v1/kv?select=key&limit=1`,{headers:sbh()},1).catch(()=>{}),12*36e5).unref();
  server.listen(PORT,()=>{console.log('Sevimli Market: http://localhost:'+PORT,'| admin:',AP,'| maʼlumot:',SB?'Supabase':'mahalliy fayl');if(!PASS)console.warn('DIQQAT: ADMIN_PASSWORD berilmagan, admin kirish ishlamaydi');else if(PASS.length<10)console.warn('DIQQAT: ADMIN_PASSWORD juda qisqa (kamida 10 belgi boʻlsin)');if(!E.SECRET)console.warn('DIQQAT: SECRET berilmagan. Server qayta yonganda admin qayta kirishi kerak boʻladi');if(!tgOn())console.warn('Eslatma: BOT_TOKEN/CHAT_ID yoʻq, buyurtmalar Telegramga yuborilmaydi');else{if(!CH_C)console.warn('Eslatma: COURIER_CHAT_ID yoʻq, kuryerlar chati ishlatilmaydi');if(!WA)console.warn('Eslatma: PUBLIC_URL (https) yoʻq: bot polling rejimida ishlaydi va Mini App tugmasi oʻrnatilmaydi. Mahalliy sinov uchun alohida test bot tokenidan foydalaning, chunki polling ishlayotgan serverning webhookini oʻchiradi')}tgStart()});
}
boot();
