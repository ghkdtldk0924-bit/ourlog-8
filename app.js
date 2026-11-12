"use strict";
/* 우리의 모험 기록 — 1단계: 폰 안에 저장. 모든 저장은 save() 한 곳을 거치므로,
   2단계에서 이 함수에 서버(Firebase) 동기화를 붙이면 돼요. */
const $=s=>document.querySelector(s),K=new URLSearchParams(location.search).get("k"),KEY="ourlog-v1"+(K?"-"+K:"");
const D0={setup:false,me:"m",names:{m:"",f:""},start:"",av:{m:"",f:""},anns:[],diary:[],photos:[],periods:[],cond:{},bucket:[],wish:[],cloud:null,lines:{},notifs:[]};
let S;try{S={...D0,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{S={...D0}}
const saveLocal=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("저장 공간이 부족해요")}};
const save=()=>{saveLocal();if(typeof Cloud!=="undefined")Cloud.changed()};
let tab="home",sub=null,dr=null,month=new Date();month.setDate(1);

/* ── 도구 ── */
const pad=n=>String(n).padStart(2,"0"),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const P=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)};
const today=()=>ymd(new Date()),add=(s,n)=>{const d=P(s);d.setDate(d.getDate()+n);return ymd(d)},diff=(a,b)=>Math.round((P(b)-P(a))/864e5);
const kd=s=>{const d=P(s);return`${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nm=w=>S.names[w]||(w==="m"?"남자친구":"여자친구"),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
let tt;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),1900)}
let ac;function tone(f,d=.1,v=.12,t=0){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+t;o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(.001,s+d);o.connect(g).connect(ac.destination);o.start(s);o.stop(s+d)}catch{}}
const ding=()=>{tone(784,.1);tone(1175,.16,.1,.09)};
function confetti(){for(let i=0;i<46;i++){const e=document.createElement("i");e.className="cf";e.style.cssText=`left:${Math.random()*100}%;background:${["#ff7fa8","#5aa9ff","#ffd24a","#5ed19a","#fff"][i%5]}`;document.body.appendChild(e);e.animate([{transform:"translateY(0) rotate(0)",opacity:1},{transform:`translateY(${innerHeight+30}px) rotate(${Math.random()*720}deg)`,opacity:.9}],{duration:1500+Math.random()*1400,delay:Math.random()*300,easing:"ease-in"}).onfinish=()=>e.remove()}ding()}

/* ── 사진 저장소(IndexedDB) ── */
const DB=new Promise(r=>{try{const q=indexedDB.open("ourlog"+(K?"-"+K:""),1);q.onupgradeneeded=()=>q.result.createObjectStore("p");q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)}catch{r(null)}});
const tx=async(m,f)=>{const db=await DB;if(!db)return;return new Promise((res,rej)=>{const t=db.transaction("p",m),q=f(t.objectStore("p"));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})};
const pPut=(id,b)=>tx("readwrite",s=>s.put(b,id)),pGet=id=>tx("readonly",s=>s.get(id)),pDel=id=>tx("readwrite",s=>s.delete(id));
const urls={},pUrl=async id=>{if(urls[id])return urls[id];let b=await pGet(id);if(!b&&typeof Cloud!=="undefined")b=await Cloud.fetchBlob(id);if(!b)throw 0;return urls[id]=URL.createObjectURL(b)};
async function shrink(f,max=1600){const b=await createImageBitmap(f),k=Math.min(1,max/Math.max(b.width,b.height)),c=document.createElement("canvas");c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);c.getContext("2d").drawImage(b,0,0,c.width,c.height);return new Promise(r=>c.toBlob(r,"image/jpeg",.85))}
const pick=(multi,cap,type="image/*")=>new Promise(r=>{const i=document.createElement("input");i.type="file";i.accept=type;i.multiple=!!multi;if(cap)i.capture=cap;i.onchange=()=>r([...i.files]);i.click()});
const hydrate=()=>document.querySelectorAll("[data-pid]").forEach(async i=>{try{i.src=await pUrl(i.dataset.pid)}catch{}});

/* ── 계산 ── */
const days=()=>S.start?diff(S.start,today())+1:0;
const expOf=()=>S.diary.length*10+S.photos.length*5+S.anns.length*5+Object.keys(S.cond).length*2+S.periods.length*5+Math.floor(days()/10)+S.bucket.filter(b=>b.done).length*10+S.wish.filter(w=>w.got).length*5;
const lvOf=()=>1+Math.floor(expOf()/50);
const BADGES=[["📝","첫 기록",()=>S.diary.length>=1],["📚","기록 10개",()=>S.diary.length>=10],["🏅","기록 30개",()=>S.diary.length>=30],["📷","첫 사진",()=>S.photos.length>=1],["🖼️","사진 30장",()=>S.photos.length>=30],["💯","100일",()=>days()>=100],["🎊","1주년",()=>days()>=365],["🎂","기념일 수집가",()=>S.anns.length>=3],["🩷","건강 체크 시작",()=>S.periods.length+Object.keys(S.cond).length>=1],["✅","버킷리스트 달성",()=>S.bucket.some(b=>b.done)],["🎁","위시 달성",()=>S.wish.some(w=>w.got)]];
function annAll(){const t=today(),L=[];
 if(S.start){for(let n=100;n<=3000;n+=100)L.push({t:`${n}일`,e:"💯",d:add(S.start,n-1),auto:1});const s=P(S.start);for(let y=1;y<=15;y++)L.push({t:`${y}주년`,e:"💍",d:ymd(new Date(s.getFullYear()+y,s.getMonth(),s.getDate())),auto:1})}
 S.anns.forEach(a=>{let d=a.date;if(a.yearly){const s=P(a.date);let c=new Date(P(t).getFullYear(),s.getMonth(),s.getDate());if(ymd(c)<t)c=new Date(c.getFullYear()+1,s.getMonth(),s.getDate());d=ymd(c)}L.push({t:a.title,e:a.emoji||"🎉",d,id:a.id,yearly:a.yearly})});
 return L.map(x=>({...x,n:diff(t,x.d)})).sort((a,b)=>a.d.localeCompare(b.d))}
const ddl=n=>n>0?`D-${n}`:n===0?"D-DAY":`D+${-n}`;
function annOnMonth(y,m){const set={};annAll().forEach(a=>{const d=P(a.d);if(d.getFullYear()===y&&d.getMonth()===m)set[a.d]=a.e});
 S.anns.forEach(a=>{if(a.yearly){const s=P(a.date),d=new Date(y,s.getMonth(),s.getDate());if(d.getMonth()===m)set[ymd(d)]=a.emoji||"🎉"}});return set}
/* 생리 주기 */
const sortP=()=>S.periods.sort((a,b)=>a.start.localeCompare(b.start));
const pOf=d=>S.periods.find(p=>p.start<=d&&d<=(p.end||add(p.start,9)));
function cyc(){sortP();const ps=S.periods,st=ps.map(p=>p.start),g=[];for(let i=1;i<st.length;i++)g.push(diff(st[i-1],st[i]));
 const gg=g.slice(-6).filter(x=>x>=18&&x<=60),len=ps.filter(p=>p.end).map(p=>diff(p.start,p.end)+1).slice(-6);
 const avg=gg.length?Math.round(gg.reduce((a,b)=>a+b)/gg.length):28,pl=len.length?Math.round(len.reduce((a,b)=>a+b)/len.length):5,last=ps[ps.length-1];
 return{avg,pl,last,next:last?add(last.start,avg):null,known:gg.length}}
function predSet(){const c=cyc(),s=new Set();if(c.next)for(let i=0;i<c.pl;i++)s.add(add(c.next,i));return s}
function periodSet(){const s=new Set();S.periods.forEach(p=>{const e=p.end||(diff(p.start,today())>=0?add(p.start,Math.min(diff(p.start,today()),9)):p.start);for(let d=p.start;d<=e;d=add(d,1))s.add(d)});return s}

/* ── 시트 ── */
const sheet=h=>{const s=$("#sheet");s.innerHTML=`<div class="sh-bg" data-a="close"></div><div class="sh-box"><button class="x" data-a="close" aria-label="닫기">✕</button>${h}</div>`;s.classList.add("open");hydrate()};
const closeSheet=()=>{$("#sheet").classList.remove("open");$("#sheet").innerHTML=""};
const avEl=(w,sz)=>`<div class="av ${w}" ${sz?`style="width:${sz}px;height:${sz}px;font-size:${sz/2}px"`:""}>${S.av[w]?`<img src="${S.av[w]}" alt="">`:(w==="m"?"👦":"👧")}</div>`;

/* ── 화면 ── */
function render(){
 if(!S.setup){$("#top").innerHTML="<h1>ourlog 💗</h1><span></span>";$("#tabs").style.display="none";$("#view").innerHTML=setupHTML();return}
 $("#top").innerHTML=`<h1>ourlog 💗</h1><div class="tr"><span id="cs" data-a="settings"></span><button id="bell" data-a="notifs" aria-label="새 소식">🔔<b id="bd"></b></button><button data-a="settings" aria-label="설정">⚙️</button></div>`;
 $("#tabs").style.display="flex";
 $("#tabs").innerHTML=[["home","🏠","홈"],["ann","🎂","기념일"],["diary","📖","추억"],["album","🖼️","사진첩"],["health","🩷","컨디션"],["more","🎒","더보기"]].map(([k,i,t])=>`<button data-a="tab" data-v="${k}" class="${tab===k?"on":""}"><b>${i}</b>${t}</button>`).join("");
 $("#view").innerHTML=({home:homeHTML,ann:annHTML,diary:diaryHTML,album:albumHTML,health:healthHTML,more:moreHTML})[tab]();
 hydrate();paintBell();if(typeof Cloud!=="undefined")Cloud.paint()}
function setupHTML(){return`<div class="hero"><div class="big2">💙💗</div><h2 style="margin:6px 0">우리 둘의 이야기를 시작해요 💞</h2><div class="mut">이 폰을 쓰는 사람이 누구인지, 이름과 사귄 날짜를 알려주세요.</div></div>
<div class="card"><label>이 폰의 주인</label><div class="pick"><button data-a="me" data-v="m" class="t ${S.me==="m"?"on":""}">👦 남자</button><button data-a="me" data-v="f" class="t ${S.me==="f"?"on":""}">👧 여자</button></div>
<label>남자 이름(애칭)</label><input id="n-m" value="${esc(S.names.m)}" placeholder="예: 민수"><label>여자 이름(애칭)</label><input id="n-f" value="${esc(S.names.f)}" placeholder="예: 지은"><label>사귄 날짜</label><input id="st" type="date" value="${S.start}" max="${today()}"></div>
<div class="card"><h3>아바타 사진 (직접 찍은 사진)</h3><div class="row sp" style="justify-content:space-around"><div style="text-align:center">${avEl("m")}<button class="btn sm w" data-a="avatar" data-v="m" style="margin-top:8px">사진 선택</button></div><div style="text-align:center">${avEl("f")}<button class="btn sm w" data-a="avatar" data-v="f" style="margin-top:8px">사진 선택</button></div></div><div class="note">사진은 이 폰 안에만 저장돼요. 나중에 설정에서 바꿀 수 있어요.</div></div>
<button class="btn p full" data-a="start">💗 시작할래요!</button><div class="card" style="margin-top:18px"><h3>💞 상대가 이미 방을 만들었나요?</h3><div class="mut">위에서 <b>이 폰의 주인</b>을 먼저 고르고, 받은 초대 코드를 입력하면 이름과 날짜, 기록을 그대로 가져와요.</div>${setupJoinInner()}</div>`}
function homeHTML(){const n=days(),lv=lvOf(),ex=expOf(),pc=(ex%50)/50*100,L=annAll(),next=L.find(a=>a.n>=0),t=today();
 const yrs=Math.floor((n-1)/365),mos=Math.floor(((n-1)%365)/30);
 const todayAnn=L.filter(a=>a.n===0);
 const lines=["오늘도 네 옆에서 웃고 싶어 ☺️","너와 함께라서 평범한 날도 모험이야","사랑해, 어제보다 오늘 더 💗","같이 있으면 시간이 빨라져","오늘 하루도 고생했어, 수고했어 🍀","우리 이번 주말엔 어디 갈까?","너의 하루는 어땠어?"],line=lines[diff("2024-01-01",t)%lines.length];
 return`<div class="card cover"><div class="pair"><div>${avEl("m")}<div class="avn">${esc(nm("m"))}</div></div><div><div class="heart">💗</div></div><div>${avEl("f")}<div class="avn">${esc(nm("f"))}</div></div></div>
<div style="margin-top:12px" class="dday">D+${n}</div><div style="font-weight:800;margin-top:6px;color:var(--ink)">${yrs?yrs+"년 ":""}${mos}개월째 손 잡고 함께 걷는 중 🐾</div>
<div style="margin-top:10px"><span class="lv">Lv.${lv}</span><div class="exp"><i style="width:${pc}%"></i></div><div class="mut" style="margin-top:4px">다음 레벨까지 💗 ${50-ex%50}개</div></div></div>
${todayAnn.length?`<div class="card warn"><h3>🎉 오늘은 ${esc(todayAnn[0].t)} 기념일!</h3><div class="mut">두 사람의 특별한 날, 축하해요 💝</div><button class="btn p sm" data-a="party" style="margin-top:8px">축하하기</button></div>`:""}
${careHTML()}
${next?`<div class="card"><div class="row sp"><div><div class="mut">다음 기념일</div><h3 style="margin:2px 0">${next.e} ${esc(next.t)}</h3><div class="mut">${kd(next.d)}</div></div><div class="dd ${next.n===0?"today":""}">${ddl(next.n)}</div></div></div>`:""}
<div class="card" data-a="editLine" style="cursor:pointer"><div class="row sp"><div class="mut">오늘의 한 줄</div><span class="mut">✏️ 내 한 줄 쓰기</span></div>${todayLines()||`<div style="font-weight:800;margin-top:4px">${line}</div>`}</div>
<div class="row" style="margin-bottom:14px"><button class="btn b" data-a="newDiary">✏️ 추억 남기기</button><button class="btn p" data-a="addPhoto">📷 사진 콕</button><button class="btn g" data-a="gotoHealth">🩷 컨디션</button></div>
<div class="card"><div class="row sp"><h3 style="margin:0">내 업적 배지</h3><button class="btn sm w" data-a="badges">전체 보기</button></div><div class="chips" style="margin-top:8px">${BADGES.map(([e,t,f])=>`<div class="chip ${f()?"":"off"}">${e}<br>${t}</div>`).join("")}</div></div>`}
function todayLines(){const L=S.lines||{},t=today();return["m","f"].filter(w=>L[w]&&L[w].date===t&&L[w].text).map(w=>`<div style="margin-top:8px"><span class="mut">${w==="m"?"💙":"💗"} ${esc(nm(w))}</span><div style="font-weight:800;line-height:1.4">${esc(L[w].text)}</div></div>`).join("")}
function careHTML(){const c=cyc();if(!c.last)return"";const t=today(),p=pOf(t),w=esc(nm("f"));
 if(p&&!(p.end&&t>p.end)){const n=diff(p.start,t)+1;return`<div class="card care"><h3>🩸 ${w}님 생리 ${n}일째</h3><div class="mut">따끈한 물이랑 푹 쉴 시간, 오늘은 더 다정하게 챙겨줘요 🧡</div></div>`}
 const n=diff(t,c.next);if(n>=0&&n<=3)return`<div class="card care"><h3>🩷 생리 예정 ${n===0?"오늘":n+"일 전"}</h3><div class="mut">${w}님이 예민하거나 피곤할 수 있어요. 따뜻하게 챙겨주세요 💗</div></div>`;
 if(n<0&&n>=-7)return`<div class="card care"><h3>🩷 예정일이 ${-n}일 지났어요</h3><div class="mut">주기는 달라질 수 있어요. 생리가 시작되면 건강 탭에서 기록해주세요.</div></div>`;return""}
const dcls=n=>n===0?"today":n<0?"past":n<=7?"hot":n<=30?"warm":"cool";
function dbadge(a){const n=a.n;return`<div class="dd2 ${dcls(n)}">${n===0?"D-DAY":n<0?(a.auto?"✓ 달성":"D+"+(-n)):ddl(n)}</div>`}
function annRow(a){return`<div class="item"><div class="em">${a.e}</div><div class="t"><b>${esc(a.t)}</b><span class="mut">${kd(a.d)}${a.yearly?" · 매년":""}</span></div>${dbadge(a)}${a.id?`<button class="btn sm w" data-a="delAnn" data-v="${a.id}">🗑</button>`:""}</div>`}
function heroAnn(L,link,small){const a=L.find(x=>x.n>=0);if(!a)return"";const past=[...L].reverse().find(x=>x.n<0),from=past?past.d:(S.start||today()),tot=Math.max(1,diff(from,a.d)),done=Math.min(tot,Math.max(0,diff(from,today())));
 return`<div class="annhero ${dcls(a.n)}${small?" small":""}" ${link?'data-a="tab" data-v="ann" style="cursor:pointer"':""}><div class="ah-top">${a.e}<span>⏰ 다가오는 기념일</span></div><div class="ah-t">${esc(a.t)}</div><div class="ah-d">${a.n===0?"D-DAY 🎉":ddl(a.n)}</div><div class="ah-s">${kd(a.d)}</div><div class="ah-bar"><i style="width:${done/tot*100}%"></i></div></div>`}
function homeChips(L,next){const s=L.filter(a=>a!==next&&a.n>0&&a.n<=30).slice(0,3);return s.length?`<div class="chips2">${s.map(a=>`<span class="ch ${dcls(a.n)}">${a.e} ${esc(a.t)} ${ddl(a.n)}</span>`).join("")}</div>`:""}
function annHTML(){const L=annAll(),next=L.find(x=>x.n>=0),soon=L.filter(a=>a!==next&&a.n>=0).slice(0,5),
 mine=[...L.filter(a=>a.id&&a.n>=0),...L.filter(a=>a.id&&a.n<0).slice(-5).reverse()],autoUp=L.filter(a=>a.auto&&a.n>=0).slice(0,8),autoPast=L.filter(a=>a.auto&&a.n<0).slice(-5).reverse();
 return`<button class="btn p full" data-a="newAnn" style="margin-bottom:14px">➕ 기념일 추가</button>${heroAnn(L,false)}
<div class="card"><h3>💝 우리가 만든 기념일</h3>${mine.length?mine.map(annRow).join(""):'<div class="mut">생일, 첫 여행처럼 우리만의 기념일을 추가해보세요</div>'}</div>
<details class="card auto"><summary>💯 100일 · 주년 기념일 보기 ▾</summary>${autoUp.map(annRow).join("")}${autoPast.length?`<div class="mut" style="margin:10px 0 4px">지난 기념일</div>${autoPast.map(annRow).join("")}`:""}</details>`}
function diaryHTML(){const L=[...S.diary].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 return`<button class="btn b full" data-a="newDiary" style="margin-bottom:14px">✏️ 오늘의 추억 남기기</button>${L.length?L.map(d=>`<div class="card" data-a="viewDiary" data-v="${d.id}" style="cursor:pointer"><div class="row sp"><b>${d.mood||"📝"} ${esc(d.title||"제목 없음")}</b><span class="mut">${d.by==="f"?"💗":"💙"}</span></div><div class="mut" style="margin:2px 0 6px">${kd(d.date)}${d.place?" · 📍"+esc(d.place):""}</div><div style="white-space:pre-wrap;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(d.text)}</div>${(d.photos||[]).length?`<div class="thumbs">${d.photos.slice(0,4).map(id=>`<img data-pid="${id}" alt="">`).join("")}</div>`:""}</div>`).join(""):'<div class="empty">아직 추억이 비어있어요 🥺<br>오늘 있었던 일을 콕 적어볼까요? ✏️</div>'}`}
const sortedPh=()=>[...S.photos].sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0)||b.id.localeCompare(a.id));
function photoGrid(L,mk){let h="",cur="";L.forEach(p=>{const m=p.date.slice(0,7);if(m!==cur){cur=m;h+=`<div class="mh">${m.slice(0,4)}년 ${+m.slice(5)}월</div>`}h+=mk(p)});return`<div class="grid">${h}</div>`}
function albumHTML(){return`<div class="row" style="margin-bottom:14px"><button class="btn p" data-a="addPhoto">📷 사진 올리기</button><button class="btn w" data-a="camPhoto">📸 바로 촬영</button></div>${S.photos.length?photoGrid(sortedPh(),p=>`<img data-pid="${p.id}" data-a="viewPhoto" data-v="${p.id}" alt="${esc(p.cap)}">`):'<div class="empty">사진첩이 텅 비었어요 🥺<br>소중한 순간을 콕 담아볼까요? 📷</div>'}`}
function healthHTML(){const y=month.getFullYear(),m=month.getMonth(),dim=new Date(y,m+1,0).getDate(),st=new Date(y,m,1).getDay(),t=today(),pd=periodSet(),pr=predSet(),an=annOnMonth(y,m),c=cyc();
 let cells=["일","월","화","수","목","금","토"].map(d=>`<div class="h">${d}</div>`).join("")+'<div></div>'.repeat(st);
 for(let i=1;i<=dim;i++){const d=`${y}-${pad(m+1)}-${pad(i)}`;cells+=`<div class="d ${pd.has(d)?"pd":pr.has(d)?"pr":""} ${d===t?"td":""}" data-a="day" data-v="${d}">${i}${an[d]?`<small>${an[d]}</small>`:S.cond[d]?"<small>●</small>":""}</div>`}
 const nx=c.next?diff(t,c.next):null;
 return`<div class="card"><div class="row sp" style="margin-bottom:10px"><button class="btn sm w" data-a="mprev">◀</button><b style="font-size:17px">${y}년 ${m+1}월</b><button class="btn sm w" data-a="mnext">▶</button></div><div class="cal">${cells}</div>
<div class="leg"><span><i style="background:var(--pink)"></i>생리</span><span><i style="background:#ffe3ec;border-style:dashed"></i>예정</span><span>💯 기념일</span><span>● 컨디션</span></div></div>
<div class="card"><h3>🩷 ${esc(nm("f"))}님 주기</h3>${c.last?`<div class="row sp"><div><div class="mut">다음 생리 예정일</div><b style="font-size:17px">${kd(c.next)}</b></div><div class="dd ${nx<=3&&nx>=0?"today":nx<0?"past":""}">${nx<0?"+"+(-nx)+"일":"D-"+nx}</div></div><div class="mut" style="margin-top:8px">평균 주기 ${c.avg}일 · 생리 기간 약 ${c.pl}일${c.known?"":" (기본값 · 기록이 쌓이면 정확해져요)"}</div>`:'<div class="mut">달력에서 생리 시작일을 눌러 기록해보세요. 기록이 쌓이면 다음 예정일을 알려드려요.</div>'}
<div class="note">⚠️ 지난 기록으로 계산한 참고용 추정이에요. 주기는 사람마다 매달 달라질 수 있고, 피임이나 임신 계획의 근거로 쓰지 마세요.</div></div>`}

/* ── 아바타 편집 ── */
let ae=null;
async function openAvatar(w){const[f]=await pick(false,null);if(!f)return;ae={w,img:await createImageBitmap(f),x:0,y:0,z:1,cartoon:false};
 sheet(`<h2>${w==="m"?"👦":"👧"} 아바타 만들기</h2><canvas id="ac" width="260" height="260"></canvas><label>확대</label><input id="az" type="range" min="1" max="3" step=".05" value="1"><label style="display:flex;align-items:center;gap:8px"><input id="acar" type="checkbox" style="width:auto;margin:0"> 만화 느낌 필터</label><div class="note">사진을 손가락으로 끌어서 얼굴을 가운데 맞춰주세요.</div><div class="row" style="margin-top:12px"><button class="btn w" data-a="close">취소</button><button class="btn p" data-a="avSave">콕 저장 💗</button></div>`);
 const c=$("#ac");avDraw();$("#az").oninput=e=>{ae.z=+e.target.value;avDraw()};$("#acar").onchange=e=>{ae.cartoon=e.target.checked;avDraw()};
 let drag=null;c.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,ox:ae.x,oy:ae.y};c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!drag)return;ae.x=drag.ox+(e.clientX-drag.x);ae.y=drag.oy+(e.clientY-drag.y);avDraw()};c.onpointerup=()=>drag=null}
function avDraw(c=$("#ac"),size=260){if(!c||!ae)return;const g=c.getContext("2d"),k=size/260,{img}=ae,base=Math.max(size/img.width,size/img.height)*ae.z,w=img.width*base,h=img.height*base;
 g.fillStyle="#fff";g.fillRect(0,0,size,size);g.drawImage(img,(size-w)/2+ae.x*k,(size-h)/2+ae.y*k,w,h);
 if(ae.cartoon){const d=g.getImageData(0,0,size,size),a=d.data;for(let i=0;i<a.length;i+=4){const av=(a[i]+a[i+1]+a[i+2])/3;for(let j=0;j<3;j++){let v=av+(a[i+j]-av)*1.4;v=Math.round(v/42)*42;a[i+j]=Math.max(0,Math.min(255,v))}}g.putImageData(d,0,0)}}

/* ── 동작 ── */
const A={
 close:closeSheet,
 tab:v=>{tab=v;sub=null;render();$("#view").scrollTop=0},
 me:v=>{readSetup();S.me=v;render()},
 avatar:v=>{readSetup();openAvatar(v)},
 avSave:()=>{const c=document.createElement("canvas");c.width=c.height=240;avDraw(c,240);S.av[ae.w]=c.toDataURL("image/jpeg",.85);save();closeSheet();ae=null;render();toast("✨ 귀여운 아바타 완성!")},
 start:()=>{readSetup();if(!S.start)return toast("사귄 날짜를 입력해주세요");S.setup=true;save();render();confetti()},
 party:confetti,
 settings:()=>sheet(`<h2>⚙️ 설정</h2>${cloudHTML()}<label>이 폰의 주인</label><div class="pick"><button data-a="setMe" data-v="m" class="t ${S.me==="m"?"on":""}">👦 남자</button><button data-a="setMe" data-v="f" class="t ${S.me==="f"?"on":""}">👧 여자</button></div><label>남자 이름</label><input id="s-m" value="${esc(S.names.m)}"><label>여자 이름</label><input id="s-f" value="${esc(S.names.f)}"><label>사귄 날짜</label><input id="s-st" type="date" value="${S.start}" max="${today()}"><div class="row" style="margin-bottom:12px"><div style="text-align:center">${avEl("m",64)}<button class="btn sm w" data-a="avatar2" data-v="m" style="margin-top:6px">변경</button></div><div style="text-align:center">${avEl("f",64)}<button class="btn sm w" data-a="avatar2" data-v="f" style="margin-top:6px">변경</button></div></div><button class="btn b full" data-a="saveSet">콕 저장 💗</button><div class="row" style="margin-top:12px"><button class="btn w" data-a="exp">📤 백업 내보내기</button><button class="btn w" data-a="imp">📥 불러오기</button></div><button class="btn sm w" data-a="reset" style="margin-top:12px">🗑 모든 데이터 지우기</button><div class="note">모든 기록과 사진은 이 폰에만 저장돼요. 폰을 바꾸거나 상대와 나누려면 백업 파일을 사용하세요.</div>`),
 setMe:v=>{S.me=v;save();A.settings()},
 avatar2:v=>{closeSheet();openAvatar(v)},
 saveSet:()=>{S.names.m=$("#s-m").value.trim();S.names.f=$("#s-f").value.trim();if($("#s-st").value)S.start=$("#s-st").value;save();closeSheet();render();toast("저장했어요")},
 badges:()=>sheet(`<h2>🏆 업적 도감</h2><div class="grid" style="grid-template-columns:repeat(3,1fr)">${BADGES.map(([e,t,f])=>`<div class="chip ${f()?"":"off"}" style="padding:12px 4px"><div style="font-size:30px">${e}</div>${t}</div>`).join("")}</div><div class="note">Lv.${lvOf()} · ${expOf()} EXP<br>기록 +10 · 사진 +5 · 기념일 +5 · 건강 체크 +2~5 · 함께한 10일마다 +1</div>`),
 gotoHealth:()=>A.tab("health"),
 /* 기념일 */
 newAnn:(v)=>sheet(`<h2>🎂 기념일 추가</h2><label>이름</label><input id="a-t" placeholder="예: 첫 여행, 생일"><label>날짜</label><input id="a-d" type="date" value="${typeof v==="string"&&v.length===10?v:today()}"><label>아이콘</label><div class="pick" id="a-e">${["🎂","💝","✈️","🏠","🎓","🎉","🍰","🌸"].map((e,i)=>`<button data-a="pickE" data-v="${e}" class="${i?"":"on"}">${e}</button>`).join("")}</div><label style="display:flex;align-items:center;gap:8px"><input id="a-y" type="checkbox" style="width:auto;margin:0" checked> 매년 반복 (생일·기념일)</label><button class="btn p full" data-a="saveAnn" style="margin-top:12px">콕 저장 💗</button>`),
 pickE:(v,t)=>{t.parentNode.querySelectorAll("button").forEach(b=>b.classList.remove("on"));t.classList.add("on")},
 saveAnn:()=>{const t=$("#a-t").value.trim();if(!t)return toast("이름을 입력해주세요");S.anns.push({id:uid(),title:t,date:$("#a-d").value||today(),emoji:$("#a-e .on")?.dataset.v||"🎉",yearly:$("#a-y").checked});save();closeSheet();render();ding();toast("🎉 기념일을 추가했어요")},
 delAnn:v=>{if(confirm("이 기념일을 지울까요?")){S.anns=S.anns.filter(a=>a.id!==v);save();render()}},
 /* 기록 */
 newDiary:()=>diaryForm(null),
 viewDiary:v=>{const d=S.diary.find(x=>x.id===v);if(!d)return;sheet(`<h2>${d.mood||"📝"} ${esc(d.title||"제목 없음")}</h2><div class="mut">${kd(d.date)}${d.place?" · 📍"+esc(d.place):""} · ${d.by==="f"?"💗 "+esc(nm("f")):"💙 "+esc(nm("m"))}</div><div style="white-space:pre-wrap;line-height:1.6;margin:14px 0">${esc(d.text)}</div>${(d.photos||[]).length?`<div class="grid" style="margin-bottom:14px">${d.photos.map(id=>`<img data-pid="${id}" alt="">`).join("")}</div>`:""}<div class="row"><button class="btn w" data-a="editDiary" data-v="${d.id}">✏️ 수정</button><button class="btn w" data-a="delDiary" data-v="${d.id}">🗑 삭제</button></div>`)},
 editDiary:v=>diaryForm(S.diary.find(x=>x.id===v)),
 delDiary:v=>{if(confirm("이 기록을 지울까요?")){S.diary=S.diary.filter(x=>x.id!==v);save();closeSheet();render()}},
 pickMood:(v,t)=>{t.parentNode.querySelectorAll("button").forEach(b=>b.classList.remove("on"));t.classList.add("on")},
 pickBy:(v,t)=>A.pickMood(v,t),
 saveDiary:v=>{syncDr();const o={id:v||uid(),date:dr.date||today(),title:dr.title.trim(),text:dr.text.trim(),place:dr.place.trim(),mood:dr.mood,by:dr.by,photos:dr.photos||[]};if(!o.text&&!o.title)return toast("내용을 적어주세요");
  const i=S.diary.findIndex(x=>x.id===o.id);i>=0?S.diary[i]=o:S.diary.push(o);dr=null;save();closeSheet();render();ding();toast(i>=0?"수정했어요":"💗 추억이 저장됐어요! +10 EXP")},
 /* 앨범 */
 addPhoto:async()=>{const fs=await pick(true);if(fs.length)await storePhotos(fs)},
 camPhoto:async()=>{const fs=await pick(false,"environment");if(fs.length)await storePhotos(fs)},
 viewPhoto:v=>photoView(v),
 savePcap:v=>{const p=S.photos.find(x=>x.id===v);if(!p)return;p.cap=$("#pc").value.trim();const d=$("#pd").value;if(d)p.date=d;save();render();photoView(v);toast("저장했어요")},
 delPhoto:async v=>{if(!confirm("이 사진을 지울까요?"))return;const i=S.photos.findIndex(x=>x.id===v);if(i<0)return;const p=S.photos[i];S.photos.splice(i,1);S.diary.forEach(d=>d.photos=(d.photos||[]).filter(x=>x!==p.id));try{await pDel(p.id)}catch{}save();closeSheet();render()},
 /* 건강 */
 mprev:()=>{month.setMonth(month.getMonth()-1);render()},mnext:()=>{month.setMonth(month.getMonth()+1);render()},
 day:d=>{const p=pOf(d),c=S.cond[d],future=d>today();
  sheet(`<h2>${kd(d)}</h2>${p?`<div class="card care" style="margin-bottom:12px"><b>🩸 생리 중</b> <span class="mut">(${kd(p.start)}~${p.end?kd(p.end):"진행 중"})</span></div>`:predSet().has(d)?'<div class="card care" style="margin-bottom:12px"><b>🩷 생리 예정일 근처</b> <span class="mut">참고용 추정</span></div>':""}
  ${c?`<div class="mut" style="margin-bottom:10px">컨디션: ${c.mood||""} ${c.pain!=null?["편안","조금 불편","아파요","많이 아파요"][c.pain]:""} ${(c.sym||[]).join(", ")} ${esc(c.memo||"")}</div>`:""}
  <div class="row" style="flex-direction:column;align-items:stretch">${p?`<button class="btn p" data-a="pend" data-v="${d}">🏁 여기서 생리 끝내기</button><button class="btn w" data-a="pdel" data-v="${d}">↩ 이 생리 기록 지우기</button>`:`<button class="btn p" data-a="pstart" data-v="${d}">🩸 생리 시작일로 기록</button>`}<button class="btn b" data-a="cond" data-v="${d}">💬 컨디션 기록</button><button class="btn w" data-a="newAnn" data-v="${d}">🎂 이 날짜에 기념일 추가</button></div>`)},
 pstart:d=>{S.periods.push({start:d,end:null});save();closeSheet();render();ding();toast("🩸 생리 시작일을 기록했어요")},
 pend:d=>{sortP();const p=[...S.periods].reverse().find(x=>x.start<=d);if(!p)return;p.end=d;save();closeSheet();render();toast("🏁 생리 종료일을 기록했어요")},
 pdel:d=>{const p=pOf(d);S.periods=S.periods.filter(x=>x!==p);save();closeSheet();render()},
 cond:d=>{const c=S.cond[d]||{pain:0,mood:"😊",sym:[],memo:""};
  sheet(`<h2>💬 ${kd(d)} 컨디션</h2><label>통증</label><div class="pick" id="c-p">${["😊 편안","🙂 조금","😣 아파요","😭 많이"].map((t,i)=>`<button data-a="pickMood" data-v="${i}" class="t ${c.pain===i?"on":""}">${t}</button>`).join("")}</div><label>기분</label><div class="pick" id="c-m">${["😊","😢","😠","😴","🥰","😰"].map(e=>`<button data-a="pickMood" data-v="${e}" class="${c.mood===e?"on":""}">${e}</button>`).join("")}</div><label>증상 (여러 개 선택)</label><div class="pick" id="c-s">${["복통","두통","피곤","예민","식욕↑","부종","여드름"].map(t=>`<button data-a="togg" class="t ${(c.sym||[]).includes(t)?"on":""}">${t}</button>`).join("")}</div><label>메모</label><textarea id="c-x" style="min-height:70px" placeholder="오늘 컨디션을 적어보세요">${esc(c.memo)}</textarea><div class="row"><button class="btn w" data-a="cdel" data-v="${d}">지우기</button><button class="btn p" data-a="csave" data-v="${d}">콕 저장 💗</button></div>`)},
 togg:(v,t)=>t.classList.toggle("on"),
 csave:d=>{S.cond[d]={pain:+($("#c-p .on")?.dataset.v??0),mood:$("#c-m .on")?.dataset.v||"😊",sym:[...document.querySelectorAll("#c-s .on")].map(b=>b.textContent),memo:$("#c-x").value.trim()};save();closeSheet();render();ding();toast("💬 컨디션을 기록했어요")},
 cdel:d=>{delete S.cond[d];save();closeSheet();render()},
 /* 백업 */
 exp:async()=>{toast("백업 파일을 만드는 중...");const ph={};for(const p of S.photos){const b=await pGet(p.id);if(b)ph[p.id]=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)})}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({S,ph})],{type:"application/json"}));a.download=`ourlog-${today()}.json`;a.click()},
 imp:async()=>{const[f]=await pick(false,null,".json,application/json");if(!f)return;try{const j=JSON.parse(await f.text());if(!j.S)throw 0;if(!confirm("지금 폰의 데이터가 백업 파일의 내용으로 바뀌어요. 계속할까요?"))return;
  for(const id in j.ph||{})await pPut(id,await (await fetch(j.ph[id])).blob());S={...D0,...j.S};save();closeSheet();render();toast("✅ 불러왔어요")}catch{toast("백업 파일을 읽지 못했어요")}},
 reset:async()=>{if(!confirm("기록, 사진, 설정이 모두 지워져요. 정말 지울까요?"))return;localStorage.removeItem(KEY);try{indexedDB.deleteDatabase("ourlog"+(K?"-"+K:""))}catch{}location.reload()}
};
function readSetup(){if(!$("#n-m"))return;S.names.m=$("#n-m").value.trim();S.names.f=$("#n-f").value.trim();S.start=$("#st").value}
function syncDr(){if(!dr||!$("#d-d"))return;dr.date=$("#d-d").value;dr.title=$("#d-t").value;dr.text=$("#d-x").value;dr.place=$("#d-p").value;dr.mood=$("#d-m .on")?.dataset.v||dr.mood;dr.by=$("#d-b .on")?.dataset.v||dr.by}
function diaryForm(d,keep){if(!keep||!dr)dr=d?{...d,photos:[...(d.photos||[])]}:{id:"",date:today(),title:"",text:"",place:"",mood:"😊",by:S.me,photos:[]};const o=dr;
 sheet(`<h2>${o.id?"✏️ 기록 수정":"✏️ 새 기록"}</h2><label>날짜</label><input id="d-d" type="date" value="${o.date}"><label>누가 쓰나요?</label><div class="pick" id="d-b"><button data-a="pickBy" data-v="m" class="t ${o.by==="m"?"on":""}">💙 ${esc(nm("m"))}</button><button data-a="pickBy" data-v="f" class="t ${o.by==="f"?"on":""}">💗 ${esc(nm("f"))}</button></div><label>오늘의 기분</label><div class="pick" id="d-m">${["😍","😊","😐","😢","😡","🥱"].map(e=>`<button data-a="pickMood" data-v="${e}" class="${o.mood===e?"on":""}">${e}</button>`).join("")}</div><label>제목</label><input id="d-t" value="${esc(o.title)}" placeholder="예: 첫 데이트"><label>장소</label><input id="d-p" value="${esc(o.place)}" placeholder="예: 성수동 카페"><label>내용</label><textarea id="d-x" placeholder="오늘 있었던 일을 적어보세요">${esc(o.text)}</textarea><label>사진</label>${o.photos.length?`<div class="thumbs">${o.photos.map(id=>`<span class="th"><img data-pid="${id}" alt=""><button data-a="rmPh" data-v="${id}">✕</button></span>`).join("")}</div>`:""}<div class="row" style="margin:6px 0 14px"><button class="btn sm w" data-a="pickAlbum">🖼 앨범에서 선택</button><button class="btn sm w" data-a="newPhDiary">📷 새 사진 추가</button></div><button class="btn b full" data-a="saveDiary" data-v="${o.id}">콕 저장 💗</button>`)}
async function storePhotos(fs){toast("사진을 저장하는 중...");const ids=[];for(const f of fs){try{const id="p"+uid(),d=(await exifDate(f))||ymd(new Date(f.lastModified||Date.now()));await pPut(id,await shrink(f));S.photos.push({id,date:d,cap:"",ts:Date.now()});ids.push(id)}catch(e){console.warn(e)}}save();render();if(ids.length){ding();toast(`📷 ${ids.length}장을 저장했어요 +${ids.length*5} EXP`)}return ids}
function photoView(id){const L=sortedPh(),i=L.findIndex(x=>x.id===id),p=L[i];if(!p)return;const n=L.length,prev=L[(i-1+n)%n].id,next=L[(i+1)%n].id;
 sheet(`<img class="big" data-pid="${p.id}" alt=""><div class="mut" style="margin:8px 0">${i+1} / ${n}</div><label>찍은 날짜 (바꾸면 날짜 순서대로 다시 정리돼요)</label><input id="pd" type="date" value="${p.date}" max="${today()}"><label>한 줄 메모</label><input id="pc" value="${esc(p.cap)}" placeholder="한 줄 메모를 남겨보세요"><div class="row"><button class="btn w" data-a="viewPhoto" data-v="${prev}">◀</button><button class="btn b" data-a="savePcap" data-v="${p.id}">저장</button><button class="btn w" data-a="viewPhoto" data-v="${next}">▶</button></div><button class="btn sm w" data-a="delPhoto" data-v="${p.id}" style="margin-top:12px">🗑 사진 삭제</button>`)}


/* ── 더보기: 버킷리스트 · 가계부 · 위시리스트 · 통계 ── */
const fmt=n=>Number(n).toLocaleString("ko-KR")+"원",subHead=t=>`<div class="row" style="margin-bottom:12px"><button class="btn sm w" data-a="subBack" style="flex:none">← 더보기</button><b style="font-size:17px">${t}</b></div>`;
function moreHTML(){if(sub)return({bucket:bucketHTML,wish:wishHTML,stats:statsHTML})[sub]();
 const dn=S.bucket.filter(b=>b.done).length;
 const m=(k,e,t,d)=>`<div class="card menu" data-a="sub" data-v="${k}"><div class="em">${e}</div><div class="t"><b>${t}</b><span class="mut">${d}</span></div><div style="font-size:22px">›</div></div>`;
 return m("bucket","✅","버킷리스트",`같이 하고 싶은 것 · 달성 ${dn}/${S.bucket.length}`)+m("wish","🎁","위시리스트",`받고 싶은 선물 ${S.wish.filter(w=>!w.got).length}개`)+m("stats","📊","우리 통계 · 연말 리포트","기록과 추억을 한눈에")}
function bucketHTML(){const L=[...S.bucket].sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(b.doneDate||"").localeCompare(a.doneDate||"")),dn=S.bucket.filter(b=>b.done).length,pc=S.bucket.length?dn/S.bucket.length*100:0;
 return subHead("✅ 버킷리스트")+`<div class="card"><b>달성 ${dn} / ${S.bucket.length}</b><div class="exp"><i style="width:${pc}%"></i></div></div><div class="card"><div class="row"><input id="b-t" placeholder="같이 하고 싶은 것을 적어보세요" style="margin:0"><button class="btn p sm" data-a="addBucket" style="flex:none">추가</button></div></div>
 <div class="card">${L.length?L.map(b=>`<div class="item"><button class="ck ${b.done?"on":""}" data-a="togBucket" data-v="${b.id}">${b.done?"✓":""}</button><div class="t"><b style="${b.done?"text-decoration:line-through;color:var(--mut)":""}">${esc(b.title)}</b>${b.done?`<span class="mut">${kd(b.doneDate)} 달성</span>`:""}</div>${b.done?`<button class="btn sm w" data-a="bucketDiary" data-v="${b.id}">📝</button>`:""}<button class="btn sm w" data-a="delBucket" data-v="${b.id}">🗑</button></div>`).join(""):'<div class="empty">아직 목록이 없어요.<br>같이 해보고 싶은 것을 적어보세요 ✨</div>'}</div>`}
function wishHTML(){const col=w=>{const L=S.wish.filter(x=>x.owner===w).sort((a,b)=>(a.got?1:0)-(b.got?1:0));return`<div class="card"><h3>${w==="m"?"💙":"💗"} ${esc(nm(w))}의 위시리스트</h3>${L.length?L.map(x=>`<div class="item"><button class="ck ${x.got?"on":""}" data-a="togWish" data-v="${x.id}">${x.got?"✓":""}</button><div class="t"><b style="${x.got?"text-decoration:line-through;color:var(--mut)":""}">${esc(x.title)}</b>${x.note?`<span class="mut">${esc(x.note)}</span>`:""}${x.url?`<a class="mut" href="${esc(x.url)}" target="_blank" rel="noopener">🔗 링크</a>`:""}${x.got?`<span class="mut">${kd(x.gotDate)} 받았어요 🎁</span>`:""}</div><button class="btn sm w" data-a="delWish" data-v="${x.id}">🗑</button></div>`).join(""):'<div class="mut">아직 없어요</div>'}</div>`};
 return subHead("🎁 위시리스트")+`<button class="btn p full" data-a="newWish" style="margin-bottom:14px">➕ 갖고 싶은 것 추가</button>`+col("m")+col("f")}
function statsOf(yr){const dy=S.diary.filter(d=>!yr||d.date.startsWith(yr)),cnt=(arr,f)=>{const o={};arr.forEach(x=>{const k=f(x);if(k)o[k]=(o[k]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])};
 return{diary:dy,places:cnt(dy,d=>d.place.trim()),moods:cnt(dy,d=>d.mood),months:cnt(dy,d=>d.date.slice(0,7)),photos:S.photos.filter(p=>!yr||p.date.startsWith(yr)).length,bucket:S.bucket.filter(b=>b.done&&(!yr||(b.doneDate||"").startsWith(yr))).length}}
function statsHTML(){const st=statsOf(),k=(e,n,t)=>`<div class="kpi"><div style="font-size:22px">${e}</div><b>${n}</b><span class="mut">${t}</span></div>`,mx=Math.max(1,...st.moods.map(x=>x[1]));
 const now=new Date(),ms=[];for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);ms.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`)}const mc=Object.fromEntries(st.months),mmx=Math.max(1,...ms.map(x=>mc[x]||0));
 return subHead("📊 우리 통계")+`<div class="kpis">${k("💞",days()+"일","함께한 날")}${k("📖",st.diary.length+"개","기록")}${k("📷",st.photos+"장","사진")}${k("✅",st.bucket+"개","버킷 달성")}${k("🎂",S.anns.length+"개","우리 기념일")}${k("🏆","Lv."+lvOf(),expOf()+" EXP")}</div>
 <div class="card"><h3>📍 자주 간 곳</h3>${st.places.length?st.places.slice(0,3).map((p,i)=>`<div class="item"><div class="em">${["🥇","🥈","🥉"][i]}</div><div class="t"><b>${esc(p[0])}</b></div><span class="mut">${p[1]}번</span></div>`).join(""):'<div class="mut">기록에 장소를 적으면 여기에 모여요</div>'}</div>
 <div class="card"><h3>😊 기분 모아보기</h3>${st.moods.length?st.moods.map(m=>`<div class="item" style="padding:6px 0"><div class="em" style="font-size:22px">${m[0]}</div><div class="exp" style="flex:1;margin:0"><i style="width:${m[1]/mx*100}%"></i></div><span class="mut" style="width:36px;text-align:right">${m[1]}</span></div>`).join(""):'<div class="mut">아직 기록이 없어요</div>'}</div>
 <div class="card"><h3>📆 월별 기록 (최근 12개월)</h3><div class="chart">${ms.map(x=>`<div class="col"><div class="bc" style="height:${(mc[x]||0)/mmx*100}%"></div><span>${+x.slice(5)}</span></div>`).join("")}</div></div>
 <button class="btn p full" data-a="report" data-v="${now.getFullYear()}">🎁 올해의 우리 보기</button>`}
function reportData(y){const st=statsOf(String(y)),s0=S.start,from=s0&&s0>`${y}-01-01`?s0:`${y}-01-01`,to=today()<`${y}-12-31`?today():`${y}-12-31`,dt=Math.max(0,diff(from,to)+1),best=st.months[0];
 return{y,dt,st,best,place:st.places[0],mood:st.moods[0]}}
function reportLines(r){return[`함께한 날 ${r.dt}일`,`남긴 기록 ${r.st.diary.length}개`,`저장한 사진 ${r.st.photos}장`,r.best?`가장 추억이 많은 달 ${+r.best[0].slice(5)}월 (${r.best[1]}개)`:"",r.place?`가장 자주 간 곳 ${r.place[0]} (${r.place[1]}번)`:"",r.mood?`가장 많은 기분 ${r.mood[0]}`:"",`이룬 버킷리스트 ${r.st.bucket}개`].filter(Boolean)}
Object.assign(A,{
 sub:v=>{sub=v||null;render();$("#view").scrollTop=0},subBack:()=>A.sub(null),
 addBucket:()=>{const t=$("#b-t").value.trim();if(!t)return toast("적어주세요");S.bucket.push({id:uid(),title:t,done:false});save();render();toast("✅ 목록에 추가했어요")},
 togBucket:v=>{const b=S.bucket.find(x=>x.id===v);b.done=!b.done;b.doneDate=b.done?today():"";save();render();if(b.done){confetti();toast("🎉 버킷리스트 달성! +10 EXP")}},
 delBucket:v=>{if(confirm("목록에서 지울까요?")){S.bucket=S.bucket.filter(x=>x.id!==v);save();render()}},
 bucketDiary:v=>{const b=S.bucket.find(x=>x.id===v);dr=null;diaryForm({id:"",date:b.doneDate||today(),title:b.title,text:"",place:"",mood:"😍",by:S.me,photos:[]})},
 newWish:()=>sheet(`<h2>🎁 위시리스트 추가</h2><label>누구의 위시인가요?</label><div class="pick" id="w-o"><button data-a="pickMood" data-v="m" class="t ${S.me==="m"?"on":""}">💙 ${esc(nm("m"))}</button><button data-a="pickMood" data-v="f" class="t ${S.me==="f"?"on":""}">💗 ${esc(nm("f"))}</button></div><label>갖고 싶은 것</label><input id="w-t" placeholder="예: 향수, 에어팟"><label>메모 (색상, 사이즈 등)</label><input id="w-n"><label>링크 (선택)</label><input id="w-u" type="url" placeholder="https://"><button class="btn p full" data-a="saveWish">콕 저장 💗</button>`),
 saveWish:()=>{const t=$("#w-t").value.trim();if(!t)return toast("갖고 싶은 것을 적어주세요");let u=$("#w-u").value.trim();if(u&&!/^https?:\/\//.test(u))u="https://"+u;S.wish.push({id:uid(),owner:$("#w-o .on")?.dataset.v||S.me,title:t,note:$("#w-n").value.trim(),url:u,got:false});save();closeSheet();render();toast("🎁 추가했어요")},
 togWish:v=>{const w=S.wish.find(x=>x.id===v);w.got=!w.got;w.gotDate=w.got?today():"";save();render();if(w.got){confetti();toast("🎁 선물 받았어요! +5 EXP")}},
 delWish:v=>{if(confirm("지울까요?")){S.wish=S.wish.filter(x=>x.id!==v);save();render()}},
 report:v=>{const r=reportData(+v),yrs=[];for(let y=S.start?+S.start.slice(0,4):new Date().getFullYear();y<=new Date().getFullYear();y++)yrs.push(y);
  sheet(`<h2>🎁 ${r.y} 올해의 우리</h2>${yrs.length>1?`<div class="pick">${yrs.map(y=>`<button class="t ${y===r.y?"on":""}" data-a="report" data-v="${y}">${y}</button>`).join("")}</div>`:""}<div class="card cover" style="text-align:center"><div class="pair">${avEl("m",64)}<div class="heart">💗</div>${avEl("f",64)}</div><div style="font-weight:900;margin-top:8px">${esc(nm("m"))} ♥ ${esc(nm("f"))}</div></div><div class="card">${reportLines(r).map(l=>`<div class="item" style="padding:8px 0"><div class="t"><b>${esc(l)}</b></div></div>`).join("")}</div><div class="hero" style="padding:0 0 10px">올해도 함께해서 행복했어요 💗</div><button class="btn b full" data-a="reportImg" data-v="${r.y}">🖼 이미지로 저장</button>`)},
 reportImg:async v=>{const r=reportData(+v),L=reportLines(r),c=document.createElement("canvas");c.width=800;c.height=360+L.length*74+160;const g=c.getContext("2d"),gr=g.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,"#9fd2ff");gr.addColorStop(1,"#ffc4da");g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);
  const loadI=u=>new Promise(res=>{if(!u)return res(null);const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u}),[a,b]=await Promise.all([loadI(S.av.m),loadI(S.av.f)]);
  const circ=(img,x,col,em)=>{g.save();g.beginPath();g.arc(x,150,70,0,7);g.closePath();g.fillStyle="#fff";g.fill();g.clip();if(img)g.drawImage(img,x-70,80,140,140);else{g.font="70px sans-serif";g.textAlign="center";g.fillText(em,x,175)}g.restore();g.lineWidth=8;g.strokeStyle=col;g.beginPath();g.arc(x,150,70,0,7);g.stroke()};
  circ(a,290,"#5aa9ff","👦");circ(b,510,"#ff7fa8","👧");g.textAlign="center";g.font="56px sans-serif";g.fillText("💗",400,165);
  g.fillStyle="#1f2a44";g.font="900 44px sans-serif";g.fillText(`${r.y} 올해의 우리`,400,290);
  L.forEach((l,i)=>{const y=330+i*74;g.fillStyle="#fff";g.strokeStyle="#1f2a44";g.lineWidth=4;g.beginPath();g.roundRect(60,y,680,60,18);g.fill();g.stroke();g.fillStyle="#1f2a44";g.font="800 28px sans-serif";g.fillText(l,400,y+40)});
  g.font="800 30px sans-serif";g.fillText("올해도 함께해서 행복했어요 💗",400,c.height-60);g.font="700 22px sans-serif";g.fillStyle="#7b88a6";g.fillText("ourlog",400,c.height-24);
  const x=document.createElement("a");x.href=c.toDataURL("image/png");x.download=`ourlog-${r.y}.png`;x.click();toast("🖼 이미지를 저장했어요")},
 pickAlbum:()=>{syncDr();sheet(`<h2>🖼 앨범에서 선택</h2>${S.photos.length?photoGrid(sortedPh(),p=>`<div class="sel ${dr.photos.includes(p.id)?"on":""}" data-a="selPh" data-v="${p.id}"><img data-pid="${p.id}" alt=""><i>✓</i></div>`):'<div class="empty">앨범에 사진이 없어요.<br>새 사진 추가를 눌러보세요.</div>'}<button class="btn b full" data-a="pickDone" style="margin-top:14px">선택 완료</button>`)},
 selPh:(v,t)=>t.classList.toggle("on"),
 pickDone:()=>{dr.photos=[...document.querySelectorAll(".sel.on")].map(e=>e.dataset.v);diaryForm(null,true)},
 newPhDiary:async()=>{syncDr();const fs=await pick(true);if(!fs.length)return;const ids=await storePhotos(fs);dr.photos.push(...ids);diaryForm(null,true)},
 rmPh:v=>{syncDr();dr.photos=dr.photos.filter(x=>x!==v);diaryForm(null,true)}
});



/* 사진 찍은 날짜 읽기 (사진 정보의 촬영 시각 → 없으면 파일 날짜) */
async function exifDate(file){try{const buf=await file.slice(0,131072).arrayBuffer(),v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;let o=2;
 while(o<v.byteLength-4){const m=v.getUint16(o);if((m&0xFF00)!==0xFF00)break;const len=v.getUint16(o+2);
  if(m===0xFFE1&&v.getUint32(o+4)===0x45786966){const t=o+10,le=v.getUint16(t)===0x4949,u16=x=>v.getUint16(x,le),u32=x=>v.getUint32(x,le);
   const ifd=p=>{const n=u16(t+p),r={};for(let i=0;i<n;i++){const e=t+p+2+i*12;r[u16(e)]={c:u32(e+4),v:u32(e+8)}}return r};
   const rd=e=>{let s="";for(let k=0;k<Math.min(e.c,19);k++)s+=String.fromCharCode(v.getUint8(t+e.v+k));return s};
   const i0=ifd(u32(t+4));let tag=null;if(i0[0x8769]){const ex=ifd(i0[0x8769].v);if(ex[0x9003])tag=rd(ex[0x9003]);else if(ex[0x9004])tag=rd(ex[0x9004])}if(!tag&&i0[0x0132])tag=rd(i0[0x0132]);
   const mm=tag&&tag.match(/^(\d{4}):(\d{2}):(\d{2})/);if(!mm)return null;const y=+mm[1];return y>=1990&&y<=new Date().getFullYear()+1?`${mm[1]}-${mm[2]}-${mm[3]}`:null}
  o+=2+len}return null}catch{return null}}
/* 새 소식(알림): 상대가 쓰면 알려줘요 */
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);if(m<1)return"방금";if(m<60)return m+"분 전";const h=Math.round(m/60);if(h<24)return h+"시간 전";return Math.round(h/24)+"일 전"};
function paintBell(){const n=(S.notifs||[]).filter(x=>!x.read).length,b=$("#bd");if(b){b.textContent=n>9?"9+":n;b.style.display=n?"flex":"none"}}
function gotRemote(ev){const out=[];let ph=0,phw="";
 ev.forEach(e=>{const t=e.k.split(":")[0],who=e.by&&e.by!==S.me?e.by:(S.me==="m"?"f":"m"),n=nm(who)+"님",d=e.d;if(e.del||!d)return;
  if(t==="diary"&&e.isNew)out.push(`💬 ${n}이 추억을 남겼어요${d.title?" · "+d.title:""}`);
  else if(t==="photo"&&e.isNew){ph++;phw=n}
  else if(t==="line"&&d.date===today()&&d.text)out.push(`✍️ ${n}이 오늘의 한 줄을 남겼어요 · ${d.text}`);
  else if(t==="bucket"&&e.isNew)out.push(`✅ ${n}이 버킷리스트를 추가했어요 · ${d.title}`);
  else if(t==="bucket"&&d.done)out.push(`🎉 ${n}이 버킷리스트를 달성했어요 · ${d.title}`);
  else if(t==="wish"&&e.isNew)out.push(`🎁 ${n}이 위시리스트에 추가했어요 · ${d.title}`);
  else if(t==="ann"&&e.isNew)out.push(`🎂 ${n}이 기념일을 추가했어요 · ${d.title}`)});
 if(ph)out.push(`📷 ${phw}이 사진 ${ph}장을 올렸어요`);
 if(!out.length)return;S.notifs=S.notifs||[];out.forEach(x=>S.notifs.unshift({id:uid(),t:Date.now(),text:x,read:false}));S.notifs=S.notifs.slice(0,50);saveLocal();paintBell();
 toast(out[0]+(out.length>1?` 외 ${out.length-1}건`:""));ding();navigator.vibrate?.(20)}
Object.assign(A,{
 notifs:()=>{const L=S.notifs||[];sheet(`<h2>🔔 새 소식</h2>${L.length?`<div class="card" style="margin-bottom:12px">${L.map(n=>`<div class="item"><div class="t"><b style="font-size:14px;${n.read?"font-weight:600;color:var(--mut)":""}">${esc(n.text)}</b><span class="mut">${ago(n.t)}${n.read?"":" · 새 소식"}</span></div></div>`).join("")}</div><button class="btn w full" data-a="clearNotifs">모두 지우기</button><div class="note">앱을 열어둔 동안은 바로 알려주고, 닫아뒀다면 다음에 열 때 여기에 모여 있어요.</div>`:'<div class="empty">아직 새 소식이 없어요.<br>상대가 추억·사진·한 줄을 남기면 여기에 알려줘요 💗</div>'}`);L.forEach(n=>n.read=true);saveLocal();paintBell()},
 clearNotifs:()=>{S.notifs=[];saveLocal();closeSheet();paintBell()}
});

function acctHTML(){const a=Cloud.account();return a?`<div class="mut" style="margin-bottom:8px">${a.anon?"익명으로 연결됨":"✅ 구글 로그인됨"+(a.name?" ("+esc(a.name)+")":"")} <button class="linkbtn" data-a="gLogout">로그아웃</button></div>`:""}
function loginBtns(){return`<button class="btn b full" data-a="gLogin" style="margin:10px 0 4px">🔑 구글로 로그인</button><button class="linkbtn" data-a="aLogin">구글 로그인이 안 되나요? 익명으로 연결</button>`}
function setupJoinInner(){if(!Cloud.ready)return'<div class="mut" style="margin-top:8px">서버 준비 중...</div>';
 if(!Cloud.account())return loginBtns()+'<div class="note">로그인하면 폰을 바꿔도 같은 계정으로 기록장이 이어져요.</div>';
 return acctHTML()+'<div class="row"><input id="js-code" placeholder="초대 코드 8자리" style="margin:0;text-transform:uppercase"><button class="btn b sm" data-a="joinSetup" style="flex:none">입장</button></div>'}
function cloudHTML(){const c=S.cloud||{};
 if(!Cloud.ready)return'<div class="card" style="margin-bottom:14px"><h3>💞 서로 연결하기</h3><div class="mut">서버 준비 중...</div></div>';
 if(!Cloud.account())return`<div class="card" style="margin-bottom:14px"><h3>💞 서로 연결하기</h3><div class="mut">${c.rid?"기록장에 다시 연결하려면":"연결하려면"} 먼저 구글 계정으로 로그인해주세요. 폰을 바꿔도 같은 계정으로 로그인하면 기록장이 이어져요.</div>${loginBtns()}<button class="btn sm w" data-a="cloudDiag" style="margin-top:10px">🔍 연결 점검</button></div>`;
 if(c.rid)return`<div class="card" style="margin-bottom:14px"><h3>💞 서로 연결됨</h3>${acctHTML()}<div class="mut">초대 코드 (상대 폰에서 입력해요)</div><div class="code">${esc(c.code)}</div><div class="mut" id="cst">${Cloud.statusText()}</div><div class="row" style="margin-top:10px"><button class="btn sm w" data-a="copyCode">📋 코드 복사</button><button class="btn sm w" data-a="cloudDiag">🔍 연결 점검</button></div><button class="btn sm w" data-a="cloudLeave" style="margin-top:10px">연결 끊기</button></div>`;
 return`<div class="card" style="margin-bottom:14px"><h3>💞 서로 연결하기</h3>${acctHTML()}<div class="mut">연결하면 서로의 기록과 사진이 실시간으로 보여요.</div><button class="btn p full" data-a="cloudCreate" style="margin:10px 0">🏠 방 만들고 초대 코드 받기</button><label>상대가 만든 초대 코드가 있다면</label><div class="row"><input id="j-code" placeholder="초대 코드 8자리" style="margin:0;text-transform:uppercase"><button class="btn b sm" data-a="cloudJoin" style="flex:none">입장</button></div><button class="btn sm w" data-a="cloudDiag" style="margin-top:10px">🔍 연결 점검</button></div>`}
function reopenCloud(m){toast(m);if(!S.setup)render();else if($("#sheet").classList.contains("open"))A.settings();else render()}
function cloudFail(e){sheet(`<h2>😢 연결에 실패했어요</h2><div class="card warn"><b>${esc(Cloud.explain(e))}</b></div><button class="btn b full" data-a="cloudDiag">🔍 연결 점검 보기</button>`)}
function afterRemote(){if(!S.setup&&S.start){S.setup=true;saveLocal();render();toast("💞 연결됐어요! 기록을 가져왔어요")}}
Object.assign(A,{
 editLine:()=>{const L=(S.lines||{})[S.me],mine=L&&L.date===today()?L.text:"";sheet(`<h2>✏️ 오늘의 한 줄</h2><div class="mut" style="margin-bottom:8px">${S.me==="m"?"💙":"💗"} ${esc(nm(S.me))}의 한 줄이에요. 상대 홈 화면에도 오늘 하루 동안 보여요.</div><textarea id="l-t" maxlength="60" style="min-height:90px" placeholder="오늘 상대에게 전하고 싶은 한 줄 (60자까지)">${esc(mine)}</textarea><div class="row">${mine?'<button class="btn w" data-a="clearLine">지우기</button>':""}<button class="btn p" data-a="saveLine">콕 저장 💗</button></div>`)},
 saveLine:()=>{const t=$("#l-t").value.trim();if(!t)return toast("한 줄을 적어주세요");S.lines=S.lines||{};S.lines[S.me]={date:today(),text:t,by:S.me};save();closeSheet();render();ding();toast("💗 오늘의 한 줄을 남겼어요")},
 clearLine:()=>{if(S.lines)delete S.lines[S.me];save();closeSheet();render()},
 gLogin:async()=>{try{toast("구글 로그인 창을 여는 중...");const r=await Cloud.login();if(r==="redirect")return;reopenCloud("✅ 로그인됐어요")}catch(e){cloudFail(e)}},
 aLogin:async()=>{try{await Cloud.loginAnon();reopenCloud("익명으로 연결됐어요")}catch(e){cloudFail(e)}},
 gLogout:async()=>{await Cloud.logout();reopenCloud("로그아웃했어요")},
 cloudCreate:async()=>{toast("방을 만드는 중...");try{await Cloud.create();A.settings();toast("💞 방이 만들어졌어요! 코드를 상대에게 알려주세요")}catch(e){cloudFail(e)}},
 cloudJoin:async()=>{toast("입장하는 중...");try{await Cloud.join($("#j-code").value);A.settings();toast("💞 연결됐어요! 기록을 가져오는 중...")}catch(e){cloudFail(e)}},
 joinSetup:async()=>{readSetup();toast("입장하는 중...");try{await Cloud.join($("#js-code").value);toast("💞 연결됐어요! 기록을 가져오는 중...");setTimeout(()=>{if(!S.setup)toast("상대가 아직 이름·날짜를 입력하지 않았어요. 직접 입력해주세요")},5000)}catch(e){cloudFail(e)}},
 copyCode:()=>{const c=(S.cloud||{}).code||"";navigator.clipboard?navigator.clipboard.writeText(c).then(()=>toast("📋 복사했어요"),()=>toast("코드를 길게 눌러 복사해주세요")):toast("코드를 길게 눌러 복사해주세요")},
 cloudLeave:()=>{if(confirm("연결을 끊을까요? 지금까지의 기록은 이 폰에 그대로 남아요.")){Cloud.leave();A.settings()}},
 cloudDiag:async()=>{sheet('<h2>🔍 연결 점검</h2><div class="empty">점검하는 중...</div>');const r=await Cloud.diag();sheet(`<h2>🔍 연결 점검</h2><div class="card">${r.map(([i,t,h])=>`<div class="item"><div class="em">${i}</div><div class="t"><b>${esc(t)}</b><span class="mut">${esc(h)}</span></div></div>`).join("")}</div><div class="note">❌가 있으면 그 줄의 안내대로 Firebase에서 설정한 뒤 다시 점검해보세요.</div>`)}
});

(function(){const f=document.createElement("div");f.id="fl";$("#app").prepend(f);const E=["💗","⭐","🌸","💙","✨","🫧"];for(let i=0;i<9;i++){const e=document.createElement("i");e.textContent=E[i%E.length];e.style.cssText=`left:${Math.random()*92}%;font-size:${14+Math.random()*16}px;animation-duration:${14+Math.random()*12}s;animation-delay:${-Math.random()*20}s`;f.appendChild(e)}})();
function burst(x,y){const E=["💗","💕","✨","⭐"];for(let i=0;i<6;i++){const e=document.createElement("i");e.textContent=E[i%4];e.className="bp";e.style.left=x+"px";e.style.top=y+"px";document.body.appendChild(e);const a=Math.PI*2*i/6+Math.random()*.6,d=34+Math.random()*26;e.animate([{transform:"translate(-50%,-50%) scale(.4)",opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d-18}px)) scale(1.1)`,opacity:0}],{duration:700,easing:"ease-out"}).onfinish=()=>e.remove()}}
document.addEventListener("click",e=>{if(e.target.closest("a[href]"))return;const bt=e.target.closest(".btn,.ck,#tabs button");if(bt){bt.classList.remove("pop");void bt.offsetWidth;bt.classList.add("pop");if(!bt.closest("#tabs"))burst(e.clientX,e.clientY)}const t=e.target.closest("[data-a]");if(!t)return;const f=A[t.dataset.a];if(f){e.preventDefault();f(t.dataset.v,t,e)}});
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
if(typeof Cloud!=="undefined")Cloud.boot().then(()=>{if(!S.setup)render()});
const sp=$("#splash");setTimeout(()=>sp.classList.add("hide"),1700);sp.onclick=()=>sp.classList.add("hide");
