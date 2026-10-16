(function KamaDexMain(){
  'use strict';
  const POSITIONS_CACHE=null;
  const STORE="kamadex.v1.backup";
  const ROOT=document.getElementById("app");
  const LEVEL_NAMES=["","Fácil","Intermedio","Avanzado","Experto"];
  const LEVEL_COLORS=["","#4ccfa2","#69aaf8","#d8a76d","#cf83df"];
  const XP_TABLE={1:50,2:100,3:175,4:275};
  const MILESTONES=[[5,150],[10,300],[25,500],[50,800],[100,1200],[250,2000]];
  const REWARDS=[[2,"Marco Aurora"],[5,"Portada Nocturna"],[8,"Sello Cristal"],[10,"Coleccionista"],[12,"Marco Nebulosa"],[15,"Efecto Holográfico"],[20,"Título Maestro"],[25,"Portada Élite"],[30,"Legendario"]];
  let cards=[],filter="",difficulty=0,statusFilter="all",sort="difficulty",page=0,view="home",selected=null,displayMode="album",uiMessage="";
  let state=readState();
  function readState(){
    const blank={version:1,records:{},everCompleted:[],earnedPages:[],milestones:[],playerName:"Coleccionista",avatar:"🌙",theme:"dark",effects:true,progressionV25:{schema:1,legacyXP:0,awardedCards:{},bonuses:{}}};
    try{
      const prev=JSON.parse(localStorage.getItem(STORE)||"null");
      if(prev&&typeof prev==="object"){
        const merged={...blank,...prev,playerName:prev.playerName||prev.nickname||blank.playerName,avatar:{"star":"⭐","moon":"🌙","heart":"💜","trophy":"🏆"}[prev.avatar]||prev.avatar||blank.avatar,records:prev.records||{},everCompleted:Array.isArray(prev.everCompleted)?prev.everCompleted:[],progressionV25:prev.progressionV25||blank.progressionV25};
        return merged;
      }
    }catch(e){console.warn("KamaDex storage",e)}
    return blank;
  }
  function progression(){
    if(!state.progressionV25||state.progressionV25.schema!==1)state.progressionV25={schema:1,legacyXP:Math.max(0,(state.everCompleted||[]).length*100),awardedCards:{},bonuses:{}};
    const p=state.progressionV25;
    p.awardedCards ||= {};
    p.bonuses ||= {};
    p.legacyXP=Number(p.legacyXP)||0;
    return p;
  }
  function save(){
    state.updatedAt=Date.now();
    try{localStorage.setItem(STORE,JSON.stringify(state))}
    catch(e){flash("No se pudo guardar. Revisa el almacenamiento del navegador.",true)}
  }
  function escapeHtml(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function totalXP(){
    const p=progression();
    return Math.max(0,Math.round(p.legacyXP+Object.values(p.awardedCards).reduce((s,x)=>s+(Number(x.base)||0)+(Number(x.first)||0),0)+Object.values(p.bonuses).reduce((s,x)=>s+(Number(x)||0),0)));
  }
  function threshold(n){return n<=1?0:Math.round(160*Math.pow(n-1,1.7))}
  function levelInfo(){
    const xp=totalXP();
    let n=1;while(n<50&&xp>=threshold(n+1))n++;
    const start=threshold(n),end=threshold(n+1);
    return {xp,n,rank:n<5?"Novato":n<10?"Explorador":n<15?"Coleccionista":n<20?"Aventurero":n<25?"Maestro":n<30?"Élite":"Legendario",pct:n===50?100:Math.max(0,Math.min(100,(xp-start)*100/(end-start))),remaining:Math.max(0,end-xp)};
  }
  function rec(id){return state.records[id]||{status:"pending",favorite:false,note:""}}
  function completed(){return cards.filter(c=>rec(c.id).status==="completed").length}
  function favorites(){return cards.filter(c=>rec(c.id).favorite).length}
  function firstXP(c){
    const p=progression();
    return !state.everCompleted.map(Number).includes(c.id)&&!p.awardedCards[c.id]?(XP_TABLE[c.difficulty]||50)+20:0;
  }
  function maybeBonus(){
    const p=progression(),num=new Set(state.everCompleted.map(Number)).size;
    for(const [count,xp] of MILESTONES){const key="count-"+count;if(num>=count&&!Object.prototype.hasOwnProperty.call(p.bonuses,key))p.bonuses[key]=xp;}
  }
  function toggleCompleted(id){
    const c=cards.find(x=>x.id===id);if(!c)return;
    const before=levelInfo().n,old=rec(id),now=old.status==="completed"?"pending":"completed";
    let award=0;
    if(now==="completed"){
      award=firstXP(c);
      if(award)progression().awardedCards[id]={base:award-20,first:20,difficulty:c.difficulty,at:new Date().toISOString()};
      if(!state.everCompleted.map(Number).includes(id))state.everCompleted.push(id);
    }
    state.records[id]={...old,status:now,completedAt:now==="completed"?(old.completedAt||new Date().toISOString().slice(0,10)):old.completedAt};
    maybeBonus();save();render();
    if(award)flash("¡Carta completada! +"+award+" XP");
    if(levelInfo().n>before)celebrate("LEVEL UP · Nivel "+levelInfo().n);
  }
  function toggleFavorite(id){
    const old=rec(id);state.records[id]={...old,favorite:!old.favorite};save();render();flash(!old.favorite?"Añadida a favoritos":"Quitada de favoritos");
  }
  function flash(message,error=false){
    uiMessage=message;
    const notice=document.getElementById("toast");
    if(notice){notice.textContent=message;notice.className="toast show"+(error?" error":"");setTimeout(()=>notice.classList.remove("show"),2500)}
  }
  function celebrate(text){
    const overlay=document.createElement("div");overlay.className="level-up";overlay.innerHTML='<span>✦</span><strong>'+escapeHtml(text)+'</strong><small>Nuevo rango disponible</small>';
    document.body.append(overlay);setTimeout(()=>overlay.remove(),2800);
  }
  function cardPicture(c){
    const local=!!window.KAMADEX_LOCAL_IMAGES;
    const image=local?"./public/images/positions/"+c.fileName:c.imageSource;
    const backup=local?c.imageSource:"";
    return '<img loading="lazy" decoding="async" alt="Ilustración de '+escapeHtml(c.name)+'" src="'+escapeHtml(image)+'" data-remote="'+escapeHtml(backup)+'" onerror="if(this.dataset.remote){this.src=this.dataset.remote;this.dataset.remote=&quot;&quot;;}else{this.onerror=null;this.style.display=&quot;none&quot;}">';
  }
  function cardHTML(c,i){
    const r=rec(c.id),done=r.status==="completed",fav=r.favorite;
    return '<article class="tc '+(done?"is-done ":"")+'d'+c.difficulty+'" style="--delay:'+(i%12)*25+'ms">'+
      '<button class="tc-body" type="button" data-act="open" data-id="'+c.id+'" aria-label="Abrir '+escapeHtml(c.name)+'">'+
        '<div class="tc-art">'+cardPicture(c)+'<span class="image-fallback">✦</span></div>'+
        '<div class="tc-number">#'+String(c.id).padStart(3,"0")+' <span class="lvdot">'+LEVEL_NAMES[c.difficulty]+'</span></div>'+
        '<div class="tc-name">'+escapeHtml(c.name)+'</div>'+
        (done?'<div class="stamp">COMPLETADA</div>':'')+
      '</button>'+
      '<button type="button" class="heart '+(fav?"active":"")+'" data-act="fav" data-id="'+c.id+'" aria-label="Favorito">♥</button>'+
      '</article>';
  }
  function filtered(){
    let rows=cards.filter(c=>{
      if(filter&&!((c.name+" "+c.id).toLocaleLowerCase()).includes(filter.toLocaleLowerCase()))return false;
      if(difficulty&&c.difficulty!==difficulty)return false;
      const r=rec(c.id);
      if(statusFilter==="done"&&r.status!=="completed")return false;
      if(statusFilter==="pending"&&r.status==="completed")return false;
      if(statusFilter==="favorites"&&!r.favorite)return false;
      if(view==="favorites"&&!r.favorite)return false;
      return true;
    });
    if(sort==="number")rows.sort((a,b)=>a.id-b.id);
    else if(sort==="name")rows.sort((a,b)=>a.name.localeCompare(b.name));
    else rows.sort((a,b)=>a.difficulty-b.difficulty||a.id-b.id);
    return rows;
  }
  function xpBar(xpInfo){
    return '<div class="xp-line"><span>XP acumulada</span><b>'+xpInfo.xp.toLocaleString("es-DO")+' XP</b></div>'+
    '<div class="progress-track"><i style="width:'+xpInfo.pct.toFixed(1)+'%"></i></div>'+
    '<div class="xp-sub">'+xpInfo.remaining+' XP para el siguiente nivel</div>';
  }
  function avatar(){
    return '<div class="avatar">'+escapeHtml(state.avatar||"🌙")+'</div>';
  }
  function home(){
    const inf=levelInfo(),count=completed(),pct=(100*count/cards.length).toFixed(1);
    return '<section class="hero"><div class="eyebrow">TU COLECCIÓN PRIVADA</div><h1>Tu aventura, <em>tu álbum.</em></h1><p>Descubre cartas, registra las que completaste y avanza a tu ritmo.</p>'+
    '<div class="hero-actions"><button class="btn accent" data-go="collection">Explorar colección ↗</button><button class="btn secondary" data-act="random">Carta sorpresa ✦</button></div>'+
    '<div class="hero-orbit" aria-hidden="true"><div class="orbit-card">✧<span>KAMADEX</span></div></div></section>'+
    '<div class="metrics"><div class="metric"><span>Cartas completadas</span><strong>'+count+' <small>/ '+cards.length+'</small></strong></div>'+
    '<div class="metric"><span>Progreso del álbum</span><strong>'+pct+'%</strong></div>'+
    '<div class="metric"><span>Nivel de jugador</span><strong>'+inf.n+'</strong></div>'+
    '<div class="metric"><span>Favoritas</span><strong>'+favorites()+'</strong></div></div>'+
    '<section class="panel hero-profile"><div class="profile-head">'+avatar()+'<div><span class="eyebrow">PERFIL RPG</span><h2>'+escapeHtml(state.playerName)+'</h2><p>Nivel '+inf.n+' · '+inf.rank+'</p></div><button class="btn secondary" data-go="profile">Mi perfil →</button></div>'+xpBar(inf)+'</section>'+
    '<section class="panel"><div class="section-head"><div><span class="eyebrow">ALBUM</span><h2>Primeras cartas de tu colección</h2></div><button class="text-link" data-go="collection">Ver todas →</button></div><div class="cards mini-grid">'+cards.slice().sort((a,b)=>a.difficulty-b.difficulty||a.id-b.id).slice(0,6).map(cardHTML).join("")+'</div></section>';
  }
  function collection(){
    const data=filtered(),per=displayMode==="album"?9:24,pages=Math.max(1,Math.ceil(data.length/per));page=Math.max(0,Math.min(page,pages-1));
    return '<div class="section-head"><div><span class="eyebrow">514 CARTAS · COLECCIÓN</span><h1>'+ (view==="favorites"?"Favoritos":"Mi KamaDex")+'</h1><p>Ordena de fácil a experto. Abre cualquier carta para registrar tu progreso.</p></div><div class="view-options"><button data-mode="album" class="'+(displayMode==="album"?"on":"")+'">Álbum</button><button data-mode="grid" class="'+(displayMode==="grid"?"on":"")+'">Cuadrícula</button></div></div>'+
    '<div class="toolbar"><label class="search-box">⌕ <input id="search" type="search" placeholder="Nombre o número de carta" value="'+escapeHtml(filter)+'" aria-label="Buscar carta"></label>'+
    '<select id="difficulty" aria-label="Dificultad"><option value="0">Todas las dificultades</option>'+[1,2,3,4].map(i=>'<option value="'+i+'" '+(difficulty===i?"selected":"")+'>'+LEVEL_NAMES[i]+'</option>').join("")+'</select>'+
    '<select id="status" aria-label="Estado"><option value="all">Todos los estados</option><option value="pending" '+(statusFilter==="pending"?"selected":"")+'>Pendientes</option><option value="done" '+(statusFilter==="done"?"selected":"")+'>Completadas</option><option value="favorites" '+(statusFilter==="favorites"?"selected":"")+'>Favoritas</option></select>'+
    '<select id="sort" aria-label="Orden"><option value="difficulty">Fácil → Experto</option><option value="number" '+(sort==="number"?"selected":"")+'>Número</option><option value="name" '+(sort==="name"?"selected":"")+'>Nombre</option></select></div>'+
    '<div class="results-line"><span>'+data.length+' resultados</span><span>Página '+(page+1)+' de '+pages+'</span></div>'+
    (data.length?'<div class="'+(displayMode==="album"?"binder":"cards full-grid")+'">'+data.slice(page*per,(page+1)*per).map(cardHTML).join("")+'</div>':'<div class="empty">No hay cartas para esta selección. <button class="btn secondary" data-act="clearFilters">Restablecer filtros</button></div>')+
    '<div class="pagination"><button class="btn secondary" data-act="prev" '+(page===0?"disabled":"")+'>← Anterior</button><span>'+ (page+1)+' / '+pages+'</span><button class="btn secondary" data-act="next" '+(page===pages-1?"disabled":"")+'>Siguiente →</button></div>'+
    '<p class="disclaimer">La dificultad es provisional. Las etiquetas originales de riesgo no son recomendaciones de seguridad.</p>';
  }
  function stats(){
    const count=completed(),inf=levelInfo(),medals=MILESTONES.filter(x=>state.everCompleted.length>=x[0]).length;
    return '<div class="section-head"><div><span class="eyebrow">ESTADÍSTICAS</span><h1>Tu progreso</h1><p>Un resumen privado de tu álbum.</p></div></div>'+
    '<div class="metrics"><div class="metric"><span>Completadas</span><strong>'+count+'</strong></div><div class="metric"><span>Sin completar</span><strong>'+(cards.length-count)+'</strong></div><div class="metric"><span>Total XP</span><strong>'+inf.xp.toLocaleString("es-DO")+'</strong></div><div class="metric"><span>Logros</span><strong>'+medals+'</strong></div></div>'+
    '<section class="panel"><h2>Progreso por dificultad</h2>'+[1,2,3,4].map(l=>{const a=cards.filter(c=>c.difficulty===l),n=a.filter(c=>rec(c.id).status==="completed").length,percent=100*n/Math.max(a.length,1);return '<div class="statrow"><div><b>'+LEVEL_NAMES[l]+'</b><span>'+n+' / '+a.length+'</span></div><div class="progress-track"><i style="width:'+percent+'%;background:'+LEVEL_COLORS[l]+'"></i></div></div>'}).join("")+'</section>'+
    '<section class="panel"><h2>Hitos de colección</h2><div class="medals">'+MILESTONES.map(([num,xp])=>'<div class="medal '+(state.everCompleted.length>=num?"unlocked":"locked")+'"><b>✦ '+num+'</b><span>Cartas únicas</span><small>+'+xp+' XP</small></div>').join("")+'</div></section>';
  }
  function profile(){
    const inf=levelInfo(),unlock=REWARDS.filter(([lv])=>inf.n>=lv);
    return '<div class="section-head"><div><span class="eyebrow">PERFIL DEL JUGADOR</span><h1>Mi perfil RPG</h1><p>Tu identidad, recompensas y evolución.</p></div></div>'+
    '<section class="panel profile-cover"><div class="profile-head">'+avatar()+'<div><div class="eyebrow">RANGO '+inf.rank.toUpperCase()+'</div><h2>'+escapeHtml(state.playerName)+'</h2><p>Nivel '+inf.n+' de 50</p></div><div class="profile-emblem">✦<span>LV '+inf.n+'</span></div></div>'+xpBar(inf)+'</section>'+
    '<section class="panel"><h2>Personaliza tu perfil</h2><div class="personalize"><label>Nombre <input id="player-name" maxlength="34" value="'+escapeHtml(state.playerName)+'"></label><label>Avatar <select id="avatar"><option>🌙</option><option '+(state.avatar==="⭐"?"selected":"")+'>⭐</option><option '+(state.avatar==="💜"?"selected":"")+'>💜</option><option '+(state.avatar==="🏆"?"selected":"")+'>🏆</option><option '+(state.avatar==="🦋"?"selected":"")+'>🦋</option></select></label><button class="btn accent" data-act="saveProfile">Guardar</button></div></section>'+
    '<section class="panel"><h2>Recompensas de nivel</h2><div class="rewards">'+REWARDS.map(([lv,title])=>'<div class="reward '+(inf.n>=lv?"unlocked":"locked")+'"><div>✧</div><b>'+escapeHtml(title)+'</b><small>Nivel '+lv+'</small></div>').join("")+'</div></section>'+
    '<section class="panel"><h2>Mis hitos</h2><p>'+completed()+' posiciones realizadas · '+favorites()+' favoritas · '+inf.xp.toLocaleString("es-DO")+' XP acumulada</p></section>';
  }
  function settings(){
    return '<div class="section-head"><div><span class="eyebrow">CONFIGURACIÓN</span><h1>Ajustes y privacidad</h1><p>Los datos personales se guardan en este navegador, no en GitHub.</p></div></div>'+
    '<section class="panel settings"><div><b>Tema visual</b><p>Cambia la apariencia de KamaDex.</p><button class="btn secondary" data-act="theme">Alternar modo claro/oscuro</button></div>'+
    '<div><b>Animaciones</b><p>Respeta la configuración de movimiento reducido del dispositivo.</p><button class="btn secondary" data-act="effects">'+(state.effects?"Desactivar efectos":"Activar efectos")+'</button></div>'+
    '<div><b>Exportar progreso cifrado</b><p>Genera un archivo .kdx compatible con las versiones anteriores de KamaDex.</p><button class="btn accent" data-act="export">Exportar copia cifrada</button></div>'+
    '<div><b>Restaurar progreso</b><p>Selecciona una copia de seguridad y escribe su contraseña.</p><button class="btn secondary" data-act="import">Importar copia</button><input type="file" id="backup-input" accept=".kdx,.json" hidden></div>'+
    '<div><b>Restablecer el perfil</b><p>Elimina todas las marcas, favoritos, XP y notas de este navegador.</p><button class="btn danger" data-act="reset">Eliminar mis datos</button></div></section>'+
    '<p class="disclaimer">Los datos del navegador no están cifrados en reposo. Las copias exportadas usan PBKDF2 y AES-GCM. La cuenta de GitHub solo aloja código público.</p>';
  }
  function modal(){
    if(selected===null)return "";
    const c=cards.find(x=>x.id===selected);
    if(!c)return "";
    const r=rec(c.id),done=r.status==="completed",xp=firstXP(c);
    return '<div class="modal-overlay" id="modal-overlay"><section class="detail" role="dialog" aria-modal="true" aria-label="'+escapeHtml(c.name)+'"><div class="detail-top"><strong>CARTA #'+String(c.id).padStart(3,"0")+'</strong><button class="icon-btn" data-act="close" aria-label="Cerrar">✕</button></div>'+
    '<div class="detail-grid"><div class="detail-art">'+cardPicture(c)+'</div><div><div class="eyebrow">'+LEVEL_NAMES[c.difficulty]+' · +'+xp+' XP disponibles</div><h2>'+escapeHtml(c.name)+'</h2><p>Ilustración original de SexPositions.Club. Clasificación provisional; respeta tus límites y el consentimiento de todas las personas.</p>'+
    '<div class="detail-buttons"><button class="btn accent" data-act="complete" data-id="'+c.id+'">'+(done?"✓ Desmarcar realizada":"✓ Marcar como realizada")+'</button><button class="btn secondary" data-act="fav" data-id="'+c.id+'">'+(r.favorite?"♥ Favorita":"♡ Añadir a favoritos")+'</button></div>'+
    '<label class="detail-note">Nota privada<textarea id="note" rows="4" placeholder="Escribe una nota para ti...">'+escapeHtml(r.note||"")+'</textarea></label><button class="btn secondary" data-act="saveNote" data-id="'+c.id+'">Guardar nota</button>'+
    '<div class="disclaimer">Fuente original: '+escapeHtml(c.sourceRisk)+'. No es una evaluación médica ni una garantía de seguridad.</div></div></div></section></div>';
  }
  function render(){
    document.documentElement.dataset.theme=state.theme==="light"?"light":"dark";
    document.documentElement.dataset.effects=state.effects?"on":"off";
    const title={home:"Inicio",collection:"Colección",favorites:"Favoritos",stats:"Progreso",profile:"Mi perfil",settings:"Ajustes"}[view];
    ROOT.innerHTML='<div class="site"><aside class="sidebar"><a href="./" class="logo" data-go="home">✧ <b>Kama<span>Dex</span></b></a><div class="aside-sub">TU ÁLBUM PRIVADO</div><nav class="nav">'+[["home","⌂","Inicio"],["collection","▦","Colección"],["favorites","♡","Favoritos"],["stats","▥","Progreso"],["profile","♟","Mi perfil"],["settings","⚙","Ajustes"]].map(([v,i,t])=>'<button class="navlink '+(view===v?"active":"")+'" data-go="'+v+'"><span>'+i+'</span>'+t+'</button>').join("")+'</nav><div class="side-foot"><b>514 cartas</b><small>Explora a tu ritmo</small></div></aside>'+
    '<main class="main"><header class="topbar"><div><span class="mobile-logo">✧ KamaDex</span><span class="breadcrumbs">KAMADEX / '+escapeHtml(title)+'</span></div><div class="top-right"><span class="top-level">✦ NIVEL '+levelInfo().n+'</span><button class="avatar-small" data-go="profile">'+escapeHtml(state.avatar||"🌙")+'</button></div></header>'+
    '<div class="content">'+(view==="home"?home():view==="collection"||view==="favorites"?collection():view==="stats"?stats():view==="profile"?profile():settings())+'</div><footer>© KamaDex · 18+ · Ilustraciones © sus respectivos titulares · <a href="https://sexpositions.club/" target="_blank" rel="noopener">SexPositions.Club</a></footer></main></div>'+
    '<nav class="mobile-nav">'+[["home","⌂","Inicio"],["collection","▦","Álbum"],["favorites","♡","Favoritos"],["profile","♟","Perfil"],["settings","⚙","Ajustes"]].map(([v,i,t])=>'<button class="'+(view===v?"active":"")+'" data-go="'+v+'"><b>'+i+'</b><small>'+t+'</small></button>').join("")+'</nav>'+
    (selected!==null?modal():"")+'<div id="toast" class="toast" role="status"></div>';
  }
  async function derive(password,salt){
    const imported=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},imported,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  const b64=a=>btoa(Array.from(a,x=>String.fromCharCode(x)).join(""));
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function exportBackup(){
    if(!crypto.subtle){flash("El cifrado requiere HTTPS o localhost.",true);return}
    const pwd=prompt("Contraseña para la copia cifrada (8 caracteres mínimo):");if(pwd===null)return;
    if(pwd.length<8){flash("La contraseña debe tener al menos 8 caracteres.",true);return}
    try{
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
      const key=await derive(pwd,salt);
      const data=new TextEncoder().encode(JSON.stringify({format:"kamadex-profile-v1",profile:state,catalog:cards}));
      const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,data);
      const obj={format:"kamadex-encrypted-v1",kdf:"PBKDF2-SHA256",iterations:250000,cipher:"AES-256-GCM",salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))};
      const link=document.createElement("a"),blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
      link.href=URL.createObjectURL(blob);link.download="KamaDex_backup_"+new Date().toISOString().slice(0,10)+".kdx";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),3000);flash("Copia cifrada exportada");
    }catch(e){flash("No fue posible exportar la copia.",true)}
  }
  async function importBackup(file){
    try{
      const obj=JSON.parse(await file.text());
      if(obj.format!=="kamadex-encrypted-v1")throw Error("El archivo no tiene el formato de KamaDex");
      const password=prompt("Contraseña de la copia:");if(password===null)return;
      const key=await derive(password,unb64(obj.salt));
      const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(obj.iv)},key,unb64(obj.data));
      const restored=JSON.parse(new TextDecoder().decode(plaintext));
      if(restored.format!=="kamadex-profile-v1"||!restored.profile||typeof restored.profile.records!=="object")throw Error("Datos no válidos");
      if(!confirm("Esto reemplazará tu progreso actual. ¿Continuar?"))return;
      state={...readState(),...restored.profile,records:restored.profile.records||{}};
      save();selected=null;render();flash("Progreso restaurado");
    }catch(e){flash("No se pudo restaurar la copia: "+e.message,true)}
  }
  function handleAction(action,id,el){
    if(action==="close"){selected=null;render();return}
    if(action==="open"){selected=id;render();return}
    if(action==="complete"){toggleCompleted(id);return}
    if(action==="fav"){toggleFavorite(id);return}
    if(action==="random"){const pool=cards.filter(c=>rec(c.id).status!=="completed"&&c.difficulty<=2);selected=(pool[Math.floor(Math.random()*pool.length)]||cards[0]).id;render();return}
    if(action==="prev"||action==="next"){page+=action==="prev"?-1:1;render();document.querySelector(".content").scrollIntoView();return}
    if(action==="clearFilters"){filter="";difficulty=0;statusFilter="all";page=0;render();return}
    if(action==="saveNote"){const r=rec(id);state.records[id]={...r,note:document.getElementById("note").value.slice(0,2000)};save();flash("Nota guardada");return}
    if(action==="saveProfile"){state.playerName=(document.getElementById("player-name").value.trim()||"Coleccionista").slice(0,34);state.avatar=document.getElementById("avatar").value;save();render();flash("Perfil actualizado");return}
    if(action==="theme"){state.theme=state.theme==="light"?"dark":"light";save();render();return}
    if(action==="effects"){state.effects=!state.effects;save();render();return}
    if(action==="export"){exportBackup();return}
    if(action==="import"){document.getElementById("backup-input").click();return}
    if(action==="reset"&&confirm("¿Seguro que quieres borrar tu progreso? No se puede deshacer.")){localStorage.removeItem(STORE);state=readState();save();view="home";selected=null;render();}
  }
  ROOT.addEventListener("click",e=>{
    const nav=e.target.closest("[data-go]");if(nav){e.preventDefault();view=nav.dataset.go;selected=null;page=0;render();window.scrollTo(0,0);return}
    const mode=e.target.closest("[data-mode]");if(mode){displayMode=mode.dataset.mode;page=0;render();return}
    const button=e.target.closest("[data-act]");if(button){handleAction(button.dataset.act,Number(button.dataset.id),button);return}
    if(e.target.id==="modal-overlay"){selected=null;render()}
  });
  ROOT.addEventListener("input",e=>{
    if(e.target.id==="search"){const value=e.target.value;filter=value;page=0;const pos=e.target.selectionStart;render();const q=document.getElementById("search");if(q){q.focus();q.setSelectionRange(pos,pos)}}
  });
  ROOT.addEventListener("change",e=>{
    if(e.target.id==="difficulty"){difficulty=Number(e.target.value);page=0;render()}
    if(e.target.id==="status"){statusFilter=e.target.value;page=0;render()}
    if(e.target.id==="sort"){sort=e.target.value;page=0;render()}
    if(e.target.id==="backup-input"&&e.target.files[0])importBackup(e.target.files[0]);
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&selected!==null){selected=null;render()}});
  if(localStorage.getItem("kamadex.adult.confirmed")!=="yes"){
    ROOT.innerHTML='<main class="age-gate"><div class="age-card"><div class="age-icon">✧</div><h1>KamaDex</h1><p>Aplicación destinada exclusivamente a personas adultas (18+). El catálogo contiene ilustraciones de posiciones sexuales.</p><div class="age-options"><button class="btn accent" id="age-confirm">Tengo 18 años o más</button><button class="btn secondary" id="age-deny">Salir</button></div><small>Tu confirmación se guarda únicamente en este navegador. No equivale a una verificación oficial de edad.</small></div></main>';
    ROOT.addEventListener("click",e=>{
      if(e.target.id==="age-confirm"){localStorage.setItem("kamadex.adult.confirmed","yes");location.reload();}
      if(e.target.id==="age-deny")ROOT.innerHTML='<main class="age-gate"><div class="age-card"><h1>Acceso restringido</h1><p>Esta aplicación está disponible exclusivamente para adultos.</p></div></main>';
    });
    return;
  }
  import("./catalog.js").then(module=>{
    cards=module.POSITIONS;
    if(cards.length!==514||new Set(cards.map(c=>c.id)).size!==514)throw Error("Se esperaban 514 fichas únicas");
    render();
  }).catch(e=>{console.error(e);ROOT.innerHTML='<main class="fatal"><h1>No se pudo cargar el catálogo</h1><p>Abre esta aplicación mediante un servidor HTTP o GitHub Pages.</p></main>'});
})();
