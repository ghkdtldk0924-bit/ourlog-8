"use strict";
/* 서버 동기화 (Firebase). 두 사람이 초대 코드로 같은 기록장을 쓰게 해요.
   - 기록·기념일·버킷리스트·위시·컨디션·사진 정보는 "items"에 하나씩 저장돼요.
   - 사진 파일은 크기를 줄여서 "blobs"에 저장돼요 (Firebase 무료 요금제 안에서 쓰려고 Cloud Storage는 쓰지 않아요).
   - 인터넷이 끊겨도 쓸 수 있고, 연결되면 자동으로 맞춰져요. 같은 항목을 동시에 고치면 나중에 고친 것이 남아요. */
const FIREBASE_CONFIG={apiKey:"AIzaSyANoaIRVOAj4kV3_LZKKp52DtFyVE-0mtk",authDomain:"ourlog-a42ac.firebaseapp.com",projectId:"ourlog-a42ac",storageBucket:"ourlog-a42ac.firebasestorage.app",messagingSenderId:"552213467910",appId:"1:552213467910:web:0fa7ede05b5f31719e8487"};
const FB_VER="10.12.2";

/* ── 진짜 서버(Firebase) ── */
const RealBackend={
 async init(){if(this.db)return;const b=`https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const[A,Au,F]=await Promise.all([import(b+"firebase-app.js"),import(b+"firebase-auth.js"),import(b+"firebase-firestore.js")]);
  this.Au=Au;this.F=F;this.app=A.initializeApp(FIREBASE_CONFIG);this.auth=Au.getAuth(this.app);
  try{this.db=F.initializeFirestore(this.app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})})}catch{this.db=F.getFirestore(this.app)}},
 async restore(){try{await this.Au.getRedirectResult(this.auth)}catch(e){this.redirectErr=e}try{await this.auth.authStateReady()}catch{}return this.user()},
 user(){const u=this.auth&&this.auth.currentUser;return u?{uid:u.uid,name:u.displayName||"",anon:u.isAnonymous}:null},
 uidNow(){return this.auth&&this.auth.currentUser?this.auth.currentUser.uid:null},
 async loginGoogle(){const{GoogleAuthProvider:G,signInWithPopup:pop,signInWithRedirect:red}=this.Au,p=new G();
  try{await pop(this.auth,p)}catch(e){if(/popup-blocked|operation-not-supported|cancelled-popup|web-storage|internal-error/.test(e.code||"")){await red(this.auth,p);return"redirect"}throw e}return this.user()},
 async loginAnon(){await this.Au.signInAnonymously(this.auth);return this.user()},
 async logout(){await this.Au.signOut(this.auth)},
 async getUserRoom(uid){try{const s=await this.F.getDoc(this.ref(`users/${uid}`));return s.exists()?s.data():null}catch{return null}},
 async setUserRoom(uid,o){try{await this.F.setDoc(this.ref(`users/${uid}`),o)}catch{}},
 ref(p){return this.F.doc(this.db,...p.split("/"))},
 async createRoom(rid,code){const{setDoc,serverTimestamp:t}=this.F;await setDoc(this.ref(`rooms/${rid}`),{members:[this.uidNow()],created:t()});await setDoc(this.ref(`invites/${code}`),{rid,created:t()})},
 async joinByCode(code){const{getDoc,updateDoc,arrayUnion}=this.F,s=await getDoc(this.ref(`invites/${code}`));if(!s.exists())throw Object.assign(new Error("not-found"),{code:"invite-not-found"});
  const rid=s.data().rid;await updateDoc(this.ref(`rooms/${rid}`),{members:arrayUnion(this.uidNow())});return rid},
 async setItem(rid,k,o){await this.F.setDoc(this.ref(`rooms/${rid}/items/${k}`),o)},
 listen(rid,cb,err){const{collection,onSnapshot}=this.F;return onSnapshot(collection(this.db,"rooms",rid,"items"),s=>cb(s.docChanges().map(c=>({key:c.doc.id,data:c.doc.data(),pending:c.doc.metadata.hasPendingWrites,type:c.type})),s.metadata.fromCache),err)},
 async setBlob(rid,id,o){await this.F.setDoc(this.ref(`rooms/${rid}/blobs/${id}`),o)},
 async getBlob(rid,id){const s=await this.F.getDoc(this.ref(`rooms/${rid}/blobs/${id}`));return s.exists()?s.data():null},
 async delBlob(rid,id){await this.F.deleteDoc(this.ref(`rooms/${rid}/blobs/${id}`))},
 async ping(){const s=await this.F.getDoc(this.ref("invites/diagnose0"));return s.exists()?"exists":"ok"}
};
/* ── 테스트용 가짜 서버 (주소 뒤에 ?mock=1 을 붙였을 때만 사용) ── */
const MockBackend={
 db(){return JSON.parse(localStorage.getItem("mockcloud")||'{"rooms":{},"invites":{},"items":{},"blobs":{},"users":{}}')},wr(d){localStorage.setItem("mockcloud",JSON.stringify(d))},
 async init(){},uidNow(){return this.u},
 user(){const s=localStorage.getItem("mockauth-"+KEY);return s?JSON.parse(s):null},async restore(){const u=this.user();if(u)this.u=u.uid;return u},
 async loginGoogle(){const n=new URLSearchParams(location.search).get("mockuser")||"tester",u={uid:"g-"+n,name:n,anon:false};localStorage.setItem("mockauth-"+KEY,JSON.stringify(u));this.u=u.uid;return u},
 async loginAnon(){const u={uid:"a"+Math.random().toString(36).slice(2,7),name:"",anon:true};localStorage.setItem("mockauth-"+KEY,JSON.stringify(u));this.u=u.uid;return u},
 async logout(){localStorage.removeItem("mockauth-"+KEY);this.u=null},
 async getUserRoom(uid){return(this.db().users||{})[uid]||null},async setUserRoom(uid,o){const d=this.db();(d.users=d.users||{})[uid]=o;this.wr(d)},
 async createRoom(rid,code){const d=this.db();if(d.invites[code])throw Object.assign(new Error("exists"),{code:"permission-denied"});d.rooms[rid]={members:[this.u]};d.invites[code]={rid};d.items[rid]={};this.wr(d)},
 async joinByCode(code){const d=this.db(),iv=d.invites[code];if(!iv)throw Object.assign(new Error("nf"),{code:"invite-not-found"});const r=d.rooms[iv.rid];if(!r.members.includes(this.u))r.members.push(this.u);this.wr(d);return iv.rid},
 async setItem(rid,k,o){const d=this.db();(d.items[rid]=d.items[rid]||{})[k]=o;this.wr(d)},
 listen(rid,cb){let prev={};const run=f=>{const cur=this.db().items[rid]||{},ch=[];for(const k in cur)if(JSON.stringify(cur[k])!==JSON.stringify(prev[k]))ch.push({key:k,data:cur[k],pending:false,type:prev[k]?"modified":"added"});prev=JSON.parse(JSON.stringify(cur));if(ch.length||f)cb(ch,false)};
  const h=e=>{if(e.key==="mockcloud")run(false)};addEventListener("storage",h);setTimeout(()=>run(true),0);return()=>removeEventListener("storage",h)},
 async setBlob(rid,id,o){const d=this.db();(d.blobs[rid]=d.blobs[rid]||{})[id]=o;this.wr(d)},async getBlob(rid,id){return(this.db().blobs[rid]||{})[id]||null},
 async delBlob(rid,id){const d=this.db();if(d.blobs[rid])delete d.blobs[rid][id];this.wr(d)},async ping(){return"ok"}
};

const toDataURL=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
async function cloudShrink(blob,max=1280,q=.72){const b=await createImageBitmap(blob),k=Math.min(1,max/Math.max(b.width,b.height)),c=document.createElement("canvas");c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);c.getContext("2d").drawImage(b,0,0,c.width,c.height);return new Promise(r=>c.toBlob(r,"image/jpeg",q))}

const Cloud={
 be:/[?&]mock=1/.test(location.search)?MockBackend:RealBackend,
 status:"off",err:"",unsub:null,timer:null,last:0,fromCache:false,
 get rid(){return(S.cloud||{}).rid||""},
 sk(){return KEY+"-sync"},
 load(){try{const j=JSON.parse(localStorage.getItem(this.sk())||"{}");this.lp=j.lp||{};this.lu=j.lu||{}}catch{this.lp={};this.lu={}}},
 persist(){try{localStorage.setItem(this.sk(),JSON.stringify({lp:this.lp,lu:this.lu}))}catch{}},
 /* 지금 앱 데이터를 항목 목록으로 */
 items(){const m={"profile:main":{names:S.names,start:S.start,av:S.av}};
  S.diary.forEach(x=>m["diary:"+x.id]=x);S.anns.forEach(x=>m["ann:"+x.id]=x);S.bucket.forEach(x=>m["bucket:"+x.id]=x);S.wish.forEach(x=>m["wish:"+x.id]=x);
  S.photos.forEach(x=>m["photo:"+x.id]=x);["m","f"].forEach(w=>{const l=(S.lines||{})[w];if(l)m["line:"+w]=l});S.periods.forEach(x=>m["period:"+x.start]=x);Object.entries(S.cond).forEach(([d,c])=>m["cond:"+d]={date:d,...c});return m},
 /* 서버에서 온 항목을 앱 데이터에 반영 */
 apply(key,d,del){const t=key.split(":")[0],id=key.slice(t.length+1),arr={diary:"diary",ann:"anns",bucket:"bucket",wish:"wish",photo:"photos"}[t];
  if(t==="profile"){if(!del&&d){S.names=d.names;S.start=d.start;S.av=d.av}}
  else if(arr){const i=S[arr].findIndex(x=>x.id===id);if(del){if(i>=0)S[arr].splice(i,1)}else if(i>=0)S[arr][i]=d;else t==="photo"?S[arr].unshift(d):S[arr].push(d);
   if(t==="photo"&&del){delete urls[id];pDel(id).catch(()=>{})}}
  else if(t==="period"){const i=S.periods.findIndex(x=>x.start===id);if(del){if(i>=0)S.periods.splice(i,1)}else if(i>=0)S.periods[i]=d;else S.periods.push(d);sortP()}
  else if(t==="line"){S.lines=S.lines||{};if(del)delete S.lines[id];else S.lines[id]=d}
  else if(t==="cond"){if(del)delete S.cond[id];else{const{date,...c}=d;S.cond[id]=c}}},
 /* 서버 연결 시작 (이미 방에 들어와 있는 경우) */
 async start(){if(!this.rid||this.unsub)return;this.load();if(!Object.keys(this.lp).length)this.quiet=true;this.set("connecting");
  try{await this.be.init();await this.be.restore();const u=this.be.user();if(!u){this.set("login");return}this.uid=u.uid;
   this.unsub=this.be.listen(this.rid,(ch,fc)=>this.onChanges(ch,fc),e=>{this.set("error",e)});this.set(navigator.onLine?"online":"offline")}
  catch(e){this.set(navigator.onLine?"error":"offline",e);this.retry()}},
 retry(){clearTimeout(this.rt);this.rt=setTimeout(()=>{if(this.rid&&!this.unsub)this.start()},15000)},
 onChanges(ch,fc){this.fromCache=fc;let any=false;const ev=[],before=this.items();
  for(const c of ch){if(c.pending||c.type==="removed")continue;const d=c.data,k=c.key,u=d.u||0,val=d.x?null:d.d;
   if(this.lp[k]===val&&(this.lu[k]||0)>=u)continue;if(u<(this.lu[k]||0))continue;
   let nv;try{nv=val==null?null:JSON.parse(val);this.apply(k,nv,!!d.x)}catch(e){console.warn("apply",k,e);continue}ev.push({k,d:nv,del:!!d.x,isNew:!(k in before),by:d.by});
   this.lp[k]=val;this.lu[k]=u;any=true}
  this.last=Date.now();this.persist();
  if(any){saveLocal();render();if(typeof afterRemote==="function")afterRemote();if(!this.quiet&&typeof gotRemote==="function")gotRemote(ev)}if(this.quiet&&!this.qt)this.qt=setTimeout(()=>{this.quiet=false;this.qt=null},5000);
  this.set(navigator.onLine&&!fc?"online":navigator.onLine?"online":"offline");
  clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),200)},
 /* 내 폰의 변경을 서버로 */
 changed(){if(!this.rid||!this.unsub)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),400)},
 async push(){if(!this.rid||!this.lp)return;const cur=this.items(),now=Date.now(),jobs=[];
  for(const[k,v]of Object.entries(cur)){const js=JSON.stringify(v);if(this.lp[k]!==js){const isNewPhoto=k.startsWith("photo:")&&this.lp[k]===undefined;this.lp[k]=js;this.lu[k]=now;
    jobs.push(this.be.setItem(this.rid,k,{t:k.split(":")[0],d:js,u:now,x:false,by:S.me}));if(isNewPhoto)jobs.push(this.uploadBlob(k.slice(6)))}}
  for(const k of Object.keys(this.lp)){if(!(k in cur)&&this.lp[k]!==null){this.lp[k]=null;this.lu[k]=now;jobs.push(this.be.setItem(this.rid,k,{t:k.split(":")[0],d:"",u:now,x:true,by:S.me}));if(k.startsWith("photo:"))jobs.push(this.be.delBlob(this.rid,k.slice(6)).catch(()=>{}))}}
  this.persist();if(!jobs.length)return;
  try{this.set("syncing");await Promise.all(jobs);this.last=Date.now();this.set(navigator.onLine?"online":"offline")}catch(e){this.set("error",e)}},
 async uploadBlob(id){try{const b=await pGet(id);if(!b)return;const small=await cloudShrink(b);await this.be.setBlob(this.rid,id,{d:await toDataURL(small),u:Date.now()})}catch(e){console.warn("blob up",e)}},
 async fetchBlob(id){if(!this.rid)return null;try{await this.be.init();await this.be.restore();if(!this.be.user())return null;const r=await this.be.getBlob(this.rid,id);if(!r)return null;const blob=await(await fetch(r.d)).blob();await pPut(id,blob);return blob}catch(e){return null}},
 /* 방 만들기 */
 async need(){await this.be.init();await this.be.restore();const u=this.be.user();if(!u)throw Object.assign(new Error("need-login"),{code:"need-login"});this.uid=u.uid;return u},
 async create(){await this.need();const al="23456789ABCDEFGHJKLMNPQRSTUVWXYZ",pick=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>al[b%al.length]).join("");
  const rid=pick(20);let code,ok=false;for(let i=0;i<4&&!ok;i++){code=pick(8);try{await this.be.createRoom(rid,code);ok=true;await this.be.setUserRoom(this.uid,{rid,code,me:S.me})}catch(e){if(i===3)throw e}}
  S.cloud={rid,code};this.lp={};this.lu={};this.persist();saveLocal();this.unsub=null;await this.start();clearTimeout(this.timer);await this.push()},
 /* 초대 코드로 입장 */
 async join(code){code=String(code||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");if(code.length<8)throw Object.assign(new Error("short"),{code:"code-short"});
  await this.need();this.quiet=true;const rid=await this.be.joinByCode(code);await this.be.setUserRoom(this.uid,{rid,code,me:S.me});S.cloud={rid,code};this.lp={};this.lu={};this.persist();saveLocal();this.unsub=null;await this.start()},
 ready:false,
 signedIn(){return!!(this.be.user&&this.be.user())},
 account(){return this.be.user&&this.be.user()},
 async boot(){try{await this.be.init();await this.be.restore();await this.afterLogin()}catch(e){this.set(navigator.onLine?"error":"offline",e)}this.ready=true;this.paint()},
 async login(){await this.be.init();const r=await this.be.loginGoogle();if(r==="redirect")return r;await this.afterLogin();return r},
 async loginAnon(){await this.be.init();const r=await this.be.loginAnon();await this.afterLogin();return r},
 async logout(){try{await this.be.logout()}catch{}if(this.unsub){try{this.unsub()}catch{}}this.unsub=null;this.set(this.rid?"login":"off")},
 async afterLogin(){const u=this.be.user();if(!u)return null;this.uid=u.uid;
  if(!this.rid){const r=await this.be.getUserRoom(u.uid);if(r&&r.rid){S.cloud={rid:r.rid,code:r.code};if(r.me)S.me=r.me;this.lp={};this.lu={};this.persist();saveLocal();this.unsub=null;await this.start();return"restored"}}
  else if(!this.unsub)await this.start();return"ok"},
 leave(){if(this.unsub){try{this.unsub()}catch{}}this.unsub=null;S.cloud=null;this.lp={};this.lu={};this.persist();saveLocal();this.set("off")},
 set(s,e){this.status=s;this.err=e?(e.code||e.message||String(e)):"";this.paint()},
 statusText(){const t={off:"연결 안 됨",connecting:"서버에 연결하는 중...",online:"🟢 연결됨",syncing:"🟡 동기화 중...",offline:"⚪ 오프라인 (연결되면 자동으로 맞춰져요)",error:"🔴 연결에 문제가 있어요 ("+this.explain({code:this.err})+")",login:"🔐 구글 로그인이 필요해요"}[this.status]||"";
  return t+(this.last&&this.status==="online"?" · 마지막 동기화 "+new Date(this.last).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}):"")},
 paint(){const d={online:"🟢",syncing:"🟡",connecting:"🟡",offline:"⚪",error:"🔴",login:"🔐",off:""}[this.status]||"",el=document.getElementById("cs");if(el)el.textContent=this.rid?d:"";const s=document.getElementById("cst");if(s)s.textContent=this.statusText()},
 explain(e){const c=(e&&(e.code||e.message))||"";
  if(/need-login/.test(c))return"먼저 구글로 로그인해주세요";
  if(/unauthorized-domain/.test(c))return"이 사이트 주소가 승인되지 않았어요. Firebase → Authentication → 설정 → 승인된 도메인에 ghkdtldk0924-bit.github.io 를 추가해주세요";
  if(/popup-closed|cancelled-popup|user-cancelled/.test(c))return"로그인 창이 닫혔어요. 다시 눌러 로그인해주세요";
  if(/popup-blocked/.test(c))return"팝업이 차단됐어요. 브라우저에서 팝업을 허용해주세요";
  if(/account-exists/.test(c))return"이미 다른 방법으로 가입된 계정이에요";
  if(/operation-not-allowed|admin-restricted/.test(c))return"이 로그인 방식이 꺼져 있어요. Firebase → Authentication → 로그인 방법에서 Google(구글)을 사용 설정해주세요 (익명으로 연결하려면 익명을 켜주세요)";
  if(/api-key|invalid-api/.test(c))return"앱 설정값(apiKey)이 달라요. cloud.js의 FIREBASE_CONFIG를 확인해주세요";
  if(/permission-denied|insufficient/.test(c))return"권한이 없어요. 보안 규칙을 게시했는지, Firestore를 만들었는지 확인해주세요";
  if(/invite-not-found/.test(c))return"초대 코드를 찾을 수 없어요. 코드를 다시 확인해주세요";
  if(/code-short/.test(c))return"초대 코드는 8자리예요";
  if(/network|unavailable|offline|Failed to fetch|import/i.test(c))return"인터넷 연결을 확인해주세요";
  if(/not-found/.test(c))return"Firestore 데이터베이스가 아직 없어요. Firebase에서 만들어주세요";
  return c||"알 수 없는 오류"},
 /* 연결 점검: 어디가 막혔는지 알려줘요 */
 async diag(){const out=[],ok=(t,h)=>out.push(["✅",t,h||""]),no=(t,e)=>out.push(["❌",t,this.explain(e)]);
  try{await this.be.init();ok("서버 도구 불러오기")}catch(e){no("서버 도구 불러오기",e);return out}
  ok("프로젝트 설정",FIREBASE_CONFIG.projectId);
  await this.be.restore();const au=this.be.user();if(!au){out.push(["⚠️","로그인","아직 로그인하지 않았어요. 설정의 '구글로 로그인'을 눌러주세요"]);return out}ok("로그인",au.anon?"익명으로 연결됨":"구글 계정"+(au.name?" ("+au.name+")":""));
  try{await this.be.ping();ok("데이터 저장소와 보안 규칙")}catch(e){no("데이터 저장소와 보안 규칙",e);return out}
  out.push(["ℹ️","내 기록장",this.rid?"연결됨 ("+this.status+")":"아직 방에 들어가지 않았어요"]);return out}
};
Cloud.load();
addEventListener("online",()=>{if(Cloud.rid){Cloud.set("online");Cloud.unsub?Cloud.changed():Cloud.start()}});
addEventListener("offline",()=>{if(Cloud.rid)Cloud.set("offline")});
