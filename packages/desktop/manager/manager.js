const api=window.chronicleDesktop;
const byId=id=>document.getElementById(id);
let waiting=false,restoreTicket,restoreCampaign,gms=[];
/** Der zuletzt gelesene Status. Die Runden kommen getrennt und zeichnen mit diesem Stand neu. */
let zustand;
// Runden samt Mitgliedern und Wartenden. Gelesen beim Start der Welt, beim Zurueckkehren in dieses
// Fenster, nach jeder eigenen Aenderung und sonst alle zehn Statusabfragen (15 s). Das Lesen nimmt in
// main.ts keine Sperre — in v0.4.1 kollidierte es mit genau dem Klick, der das Fenster nach vorn holt.
let runden=[],rundenBekannt=false,rundenAlter=0,rundenLaeuft=false,rundenNochmal=false;
let gewaehlteRunde="",gewaehlteWelt="",gewaehltesNetz="";
/** Fuer welche Welt in dieser Sitzung schon ein Einladungslink entstand — nur fuer die Liste „Erste Schritte“. */
const eingeladen=new Set();
let loeschKandidat,loeschEingabe="";
// Die Adresse der laufenden Welt. Aus ihr entsteht der Einladungs- oder Zugangslink.
// Zwei Adressen, zwei Zwecke. `weltAdresse` ist die eigene, feste Adresse der Welt: dort
// gehoert der Weg zurueck hin, denn nur dort sind Passkeys moeglich. `gastAdresse` ist das,
// was Mitspieler bekommen — im Heimnetz die Heimnetz-Adresse, sonst dieselbe.
let weltAdresse="",gastAdresse="";
const states={stopped:"Host beendet","starting-db":"Datenbank wird gestartet","checking-schema":"Welt wird geprüft","starting-app":"Spieloberfläche wird gestartet",ready:"läuft",draining:"Änderungen werden abgeschlossen",failed:"braucht Aufmerksamkeit"};
const weltBereit=state=>state.state==="ready"&&!state.setupRequired;
function message(text,error=false){byId("message").textContent=text;byId("message").classList.toggle("error",error);}
async function invoke(request){const result=await api.invoke(request);if(!result.ok)throw new Error(result.error);return result.value;}
async function action(request,success){if(waiting)return;waiting=true;message("Die lokale Aktion läuft …");try{const result=await invoke(request);message(success||"Abgeschlossen.");return result;}catch(error){message(error.message,true);}finally{waiting=false;await refresh();}}
/**
 * Ein Bereich wird nur neu gebaut, wenn sich sein Stand aendert. Bis v0.4.1 baute die Statusabfrage
 * alle 1,5 s alles neu: ein Feld, in das man gerade tippte, verlor den Fokus, und ein Klick zwischen
 * Druecken und Loslassen ging ins Leere.
 */
function zeichne(element,stand,bauen){if(element.dataset.stand===stand)return;element.dataset.stand=stand;element.replaceChildren(...bauen());}
function el(tag,eigenschaften={},...kinder){
  const element=document.createElement(tag);
  for(const [name,wert] of Object.entries(eigenschaften)){
    if(name==="class")element.className=wert;
    else if(name.startsWith("on"))element[name]=wert;
    else if(name==="disabled")element.disabled=!!wert;
    else element.setAttribute(name,wert);
  }
  for(const kind of kinder.flat())if(kind!==null&&kind!==undefined&&kind!==false)element.append(kind);
  return element;
}
async function refresh(){
  try{
    zustand=await invoke({kind:"status"});
    if(!weltBereit(zustand)){runden=[];rundenBekannt=false;rundenAlter=0;}
    else if((!rundenBekannt&&!rundenLaeuft)||++rundenAlter>=10)void ladeRunden();
    render();
  }catch(error){message(error.message,true);}
}
async function ladeRunden(){
  if(!zustand||!weltBereit(zustand))return;
  if(rundenLaeuft){rundenNochmal=true;return;}
  rundenLaeuft=true;rundenAlter=0;
  // Scheitert ein Nachladen, bleibt der letzte Stand stehen, statt „noch keine Runde“ vorzutaeuschen.
  try{runden=await invoke({kind:"runden"});rundenBekannt=true;}
  catch(error){if(!rundenBekannt)message(error.message,true);}
  finally{rundenLaeuft=false;}
  if(rundenNochmal){rundenNochmal=false;return ladeRunden();}
  render();
}
function render(){
  if(!zustand)return;
  const state=zustand;
  weltAdresse=weltBereit(state)&&state.origin?state.origin:"";
  gastAdresse=weltAdresse?(state.lanOrigin??state.origin):"";
  if(!weltAdresse&&!byId("zugang-ergebnis").hidden)verbergeCode();
  zeichneWelt(state);zeichneSchritte(state);zeichneRunde(state);zeichneVerwaltung(state);
  const wartend=runden.reduce((summe,runde)=>summe+(runde.wartend?.length??0),0);
  document.title=`${wartend?`(${wartend}) `:""}Atlas Chronicles – Lokale Welten`;
  byId("version").textContent=`Desktop ${state.version}${state.runtime?` · Node ${state.runtime.node} · Bilddecoder ${state.runtime.decoder}`:""}`;
}
/** Oben: welche Welt, in welchem Zustand, und der eine Knopf, der jetzt dran ist. */
function zeichneWelt(state){
  const ruht=state.state==="stopped",aktiv=state.profiles.find(profile=>profile.id===state.profileId),sperre=waiting||state.busy;
  byId("host-title").textContent=ruht?(state.profiles.length?"Gerade läuft keine Welt":"Bereit für deine erste Welt"):`${aktiv?.name??"Lokale Welt"} ${states[state.state]||state.state}`;
  byId("host-detail").textContent=state.failure||(ruht?(state.profiles.length?"Wähle eine Welt und starte sie. Eine neue legst du darunter an.":"Lege darunter deine erste Welt an.")
    :state.state==="ready"?(state.setupRequired?"Richte als Nächstes die Spielleitung ein.":state.lanOrigin?`Für dich unter ${state.origin}, für Mitspieler im Heimnetz unter ${state.lanOrigin}.`:`Erreichbar unter ${state.origin} — nur auf diesem Rechner.`):"Einen Moment …");
  byId("open").hidden=!weltBereit(state);
  byId("stop").hidden=ruht;
  byId("weltwahl").hidden=!ruht||!state.profiles.length;
  byId("neue-welt").hidden=!ruht;
  const auswahl=byId("welt-select");
  zeichne(auswahl,JSON.stringify(state.profiles.map(profile=>[profile.id,profile.name])),()=>state.profiles.map(profile=>el("option",{value:profile.id},profile.name)));
  if(gewaehlteWelt&&state.profiles.some(profile=>profile.id===gewaehlteWelt)&&auswahl.value!==gewaehlteWelt)auswahl.value=gewaehlteWelt;
  byId("start").disabled=sperre||!ruht;
  for(const control of byId("create-form").elements)control.disabled=sperre||!ruht;
  const netz=byId("netzwerk-adresse"),adressen=state.lanAddresses??[];
  const aktuell=state.lanOrigin?new URL(state.lanOrigin).hostname:"";
  const ausgewaehlt=ruht?gewaehltesNetz:aktuell;
  zeichne(netz,JSON.stringify([adressen,ausgewaehlt]),()=>[
    el("option",{value:""},"Nur dieser Rechner"),
    ...adressen.map(adapter=>el("option",{value:adapter.address},`Heimnetz · ${adapter.address} (${adapter.name})`)),
    ...(ausgewaehlt&&!adressen.some(adapter=>adapter.address===ausgewaehlt)?[el("option",{value:ausgewaehlt,disabled:true},`Nicht mehr verfügbar: ${ausgewaehlt}`)]:[]),
  ]);
  netz.value=ausgewaehlt;netz.disabled=sperre||!ruht;
  byId("netzwerk-hinweis").textContent=ausgewaehlt
    ?"Andere Geräte im selben WLAN oder LAN öffnen den Einladungslink. Die Verbindung dorthin ist unverschlüsselt: nur in einem vertrauten Heimnetz verwenden. Du selbst bleibst auf der eigenen Adresse dieser Welt angemeldet — dort kannst du auch einen Passkey einrichten."
    :adressen.length?"Für andere Geräte im selben WLAN oder LAN wählst du vor dem Weltstart eine Heimnetz-Adresse. Zum Wechseln zuerst die Welt beenden."
    :"Keine private Heimnetz-Adresse gefunden. Verbinde diesen Rechner mit deinem WLAN oder LAN; die Auswahl aktualisiert sich automatisch.";
  if(!ruht&&ausgewaehlt)byId("netzwerk-hinweis").textContent+=" Wechselt deine Heimnetz-Adresse, bekommen Mitspieler einen neuen Einladungslink; deine eigene Anmeldung bleibt davon unberührt.";
}
/** Die Liste für das erste Mal. Sie verschwindet, sobald jemand außer der Spielleitung dabei ist. */
function zeichneSchritte(state){
  const eingerichtet=!state.setupRequired,hatRunde=runden.length>0,hatGast=runden.some(runde=>runde.members.length>1);
  const hatEingeladen=hatGast||runden.some(runde=>runde.wartend?.length)||eingeladen.has(state.profileId);
  byId("schritte").hidden=state.state!=="ready"||(eingerichtet&&!rundenBekannt)||(eingerichtet&&hatRunde&&hatGast);
  byId("setup").hidden=!(state.state==="ready"&&state.setupRequired);
  for(const control of byId("setup-form").elements)control.disabled=waiting||state.busy;
  const schritte=[["Spielleitung einrichten",eingerichtet,"Dein Name als Spielleitung — direkt hier darunter."],
    ["Erste Runde anlegen",hatRunde,"Unter „Runde“: Namen eintippen und „Runde anlegen“."],
    ["Einladungslink weitergeben",hatEingeladen,"Unter „Einladen“ den Link erzeugen, kopieren und der Person schicken."],
    ["Die erste Person hereinlassen",hatGast,"Wer den Link öffnet, steht unter „Vor der Tür“. Dort auf „Freigeben“."]];
  const jetzt=schritte.findIndex(schritt=>!schritt[1]);
  zeichne(byId("schritte-liste"),JSON.stringify(schritte.map(schritt=>schritt[1])),()=>schritte.map(([titel,erledigt,wie],index)=>
    el("li",{class:erledigt?"erledigt":index===jetzt?"jetzt":""},el("strong",{},`${erledigt?"✓ ":""}${titel}`),erledigt?null:el("span",{},wie))));
}
/** Die Runde: anlegen, einladen, die Tür, die Mitglieder. */
function zeichneRunde(state){
  byId("runde").hidden=!weltBereit(state)||!rundenBekannt;
  if(byId("runde").hidden)return;
  const sperre=waiting||state.busy;
  for(const control of byId("runde-form").elements)control.disabled=sperre;
  if(!runden.some(runde=>runde.campaignId===gewaehlteRunde))gewaehlteRunde=runden[0]?.campaignId??"";
  byId("rundenwahl").hidden=!runden.length;
  const auswahl=byId("zugang-runde");
  zeichne(auswahl,JSON.stringify(runden.map(runde=>[runde.campaignId,runde.name])),()=>runden.map(runde=>el("option",{value:runde.campaignId},runde.name)));
  if(auswahl.value!==gewaehlteRunde)auswahl.value=gewaehlteRunde;
  const runde=runden.find(kandidat=>kandidat.campaignId===gewaehlteRunde);
  byId("runde-form-label").textContent=runde?"Noch eine Runde anlegen":"Erste Runde anlegen";
  byId("runde-karten").hidden=!runde;
  if(!runde)return;
  byId("zugang-einladung").disabled=sperre;
  byId("zugang-reichweite").textContent=state.lanOrigin
    ?`Geräte im selben WLAN oder LAN über ${state.lanOrigin}. Der Host bleibt während der Runde eingeschaltet; eine Firewall-Freigabe kann erforderlich sein.`
    :"nur dieser Rechner. Für andere Geräte die Welt beenden und oben eine Heimnetz-Adresse auswählen.";
  const wartend=runde.wartend??[];
  byId("tuer-zahl").hidden=!wartend.length;byId("tuer-zahl").textContent=String(wartend.length);
  zeichne(byId("tuer-liste"),JSON.stringify([runde.campaignId,wartend.map(anfrage=>anfrage.requestId),sperre]),()=>wartend.length?wartend.map(anfrage=>
    el("div",{class:"profile"},
      el("div",{},el("strong",{},anfrage.displayName),el("p",{},`wartet seit ${new Date(anfrage.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} · die Anfrage gilt bis ${new Date(anfrage.expiresAt).toLocaleString([],{weekday:"short",hour:"2-digit",minute:"2-digit"})}`)),
      el("div",{class:"actions"},
        el("button",{type:"button",disabled:sperre,onclick:()=>void entscheide(runde,anfrage,"freigeben")},"Freigeben"),
        el("button",{type:"button",class:"zurueckhaltend",disabled:sperre,onclick:()=>void entscheide(runde,anfrage,"ablehnen")},"Ablehnen"))))
    :[el("p",{class:"note"},"Niemand wartet gerade. Wer deinen Einladungslink öffnet und seinen Namen angibt, erscheint hier von selbst.")]);
  zeichne(byId("zugang-mitglieder"),JSON.stringify([runde.campaignId,runde.members,sperre]),()=>runde.members.map(mitglied=>
    el("div",{class:mitglied.hasAccess?"profile":"profile ausgesperrt"},
      el("div",{},el("strong",{},mitglied.displayName),el("p",{},`${mitglied.role==="leitung"?"Spielleitung":"Spieler"}${mitglied.platformLeitung?" · darf eigene Runden anlegen":""} · ${mitglied.hasAccess?"kommt herein":"kommt gerade nicht herein"}`),
        // Wer ausgesperrt ist, soll den Weg zurück lesen können, ohne ihn zu kennen. Der
        // Einladungslink wäre hier die naheliegende und falsche Wahl: er macht nur neue Spieler auf.
        mitglied.hasAccess?null:el("p",{class:"hinweis"},"Steht vor der Anmeldeseite. „Zugangslink“ erzeugt einen Code, der 10 Minuten gilt und einmal eingelöst wird — das ist der Weg zurück, nicht der Einladungslink.")),
      el("div",{class:"actions"},
        el("button",{type:"button",disabled:sperre,onclick:()=>void zugangscode(runde.campaignId,mitglied.userId,mitglied.displayName)},"Zugangslink"),
        el("button",{type:"button",class:"zurueckhaltend",disabled:sperre,onclick:()=>void setzeRolle(runde.campaignId,mitglied.userId,mitglied.role==="leitung"?"spieler":"leitung")},mitglied.role==="leitung"?"Zum Spieler machen":"Zur Spielleitung machen")))));
}
/** Eingeklappt: Weltenliste mit Löschen, Server, Chronist, Mitbringen, Sicherung. */
function zeichneVerwaltung(state){
  const sperre=waiting||state.busy,ruht=state.state==="stopped";
  zeichne(byId("profiles"),JSON.stringify([state.profiles.map(profile=>[profile.id,profile.name]),state.profileId,state.state,sperre,loeschKandidat]),
    ()=>state.profiles.length?state.profiles.map(profile=>weltZeile(profile,state,sperre)):[el("p",{class:"note"},"Noch keine Welt auf diesem Rechner.")]);
  byId("backup").hidden=state.state!=="ready";
  const recovery=byId("recovery-select");
  zeichne(recovery,JSON.stringify([(state.recovery||[]).map(point=>point.id),state.profiles.map(profile=>profile.name)]),()=>(state.recovery||[]).map(point=>{
    const profile=state.profiles.find(kandidat=>kandidat.id===point.sourceProfileId);
    return el("option",{value:point.id},`${new Date(point.createdAt).toLocaleString()} · ${profile?.name||"Lokale Welt"}`);}));
  for(const formId of["restore-form","recovery-form"])for(const control of byId(formId).elements)control.disabled=sperre||!ruht||(formId==="recovery-form"&&!state.recovery?.length);
  const chronist=byId("chronist-profile");
  zeichne(chronist,JSON.stringify(state.profiles.map(profile=>[profile.id,profile.name])),()=>state.profiles.map(profile=>el("option",{value:profile.id},profile.name)));
  const world=chronist.value;
  byId("chronist-state").textContent=(!world?"Lege zuerst eine lokale Welt an.":(state.chronistKeys||[]).includes(world)?"Ein Schlüssel ist für diese Welt gespeichert.":"Für diese Welt ist kein Schlüssel gespeichert.")+(state.chronistHinweis&&world===state.profileId?` ${state.chronistHinweis}`:"");
  for(const control of byId("chronist-form").elements)control.disabled=sperre||!world;
}
/**
 * Eine Welt in der Liste — und, wenn sie zum Löschen aussteht, die Bestätigung darunter.
 *
 * Bestätigt wird durch Tippen des Namens; geprüft wird er in `ProfileStore.remove` gegen die Welt
 * selbst. Nur die laufende Welt ist gesperrt, und dann steht der Grund daneben.
 */
function weltZeile(profile,state,sperre){
  const laeuftDiese=profile.id===state.profileId&&state.state!=="stopped";
  const row=el("div",{class:`profile${loeschKandidat===profile.id?" loeschend":""}`},
    el("div",{},el("strong",{},profile.name),el("p",{},laeuftDiese?"Läuft gerade":"Auf diesem Rechner")),
    el("div",{class:"actions"},laeuftDiese?el("span",{class:"grund"},"Zum Löschen erst oben „Welt beenden“."):null,
      el("button",{type:"button",class:"zurueckhaltend",disabled:sperre||laeuftDiese,onclick:()=>{loeschKandidat=profile.id;loeschEingabe="";render();byId(`loeschen-${profile.id}`)?.focus();}},"Löschen")));
  if(loeschKandidat!==profile.id)return row;
  const eingabe=el("input",{id:`loeschen-${profile.id}`,maxlength:"80","aria-label":`Name der Welt ${profile.name} zur Bestätigung`});
  eingabe.value=loeschEingabe;eingabe.oninput=()=>{loeschEingabe=eingabe.value;};
  row.append(el("div",{class:"loeschen"},
    el("p",{},`Diese Welt wird mit allem darin von dieser Platte entfernt: Runden, Wiki, Karten, Zugänge. Tippe zum Bestätigen den Namen „${profile.name}“. Gesicherte Stände dieser Welt bleiben unter „Lokale Host-Sicherung“ erhalten.`),
    el("form",{class:"input-row",onsubmit:event=>{event.preventDefault();void weltLoeschen(profile);}},eingabe,
      el("button",{class:"gefahr",disabled:sperre||laeuftDiese},"Endgültig löschen"),
      el("button",{type:"button",class:"zurueckhaltend",onclick:()=>{loeschKandidat=undefined;loeschEingabe="";render();}},"Abbrechen"))));
  return row;
}
async function weltLoeschen(profile){
  const getippt=loeschEingabe.trim();
  if(getippt!==profile.name){message(`Der Name stimmt noch nicht. Diese Welt heißt „${profile.name}“.`,true);return;}
  // Das Getippte bleibt stehen, bis das Löschen wirklich gelungen ist.
  const result=await action({kind:"loeschen",profileId:profile.id,name:getippt},"Welt gelöscht.");
  if(result){loeschKandidat=undefined;loeschEingabe="";message(`„${result.name}“ ist gelöscht. Gesicherte Stände dieser Welt bleiben unter „Lokale Host-Sicherung“ erhalten.`);render();}
}
async function entscheide(runde,anfrage,wie){
  const result=await action({kind:wie,campaignId:runde.campaignId,requestId:anfrage.requestId},
    wie==="freigeben"?`${anfrage.displayName} ist jetzt in der Runde „${runde.name}“.`:`Die Anfrage von ${anfrage.displayName} ist abgelehnt.`);
  if(result)await ladeRunden();
}
/**
 * Einen erzeugten Code zeigen — als Link, nicht als Zeichenkette zum Abtippen. Das Feld ist ein
 * Eingabefeld: daraus lässt sich auch kopieren, wenn die Zwischenablage verwehrt ist.
 */
function zeigeCode(beschriftung,link,erklaerung){
  byId("zugang-ergebnis").hidden=false;
  byId("zugang-linklabel").textContent=beschriftung;
  byId("zugang-link").value=link;
  byId("zugang-ausgabe").textContent=erklaerung;
  byId("zugang-link").focus();byId("zugang-link").select();
}
function verbergeCode(){byId("zugang-ergebnis").hidden=true;byId("zugang-link").value="";byId("zugang-ausgabe").textContent="";}
function codeLink(code,feld,adresse){return adresse?`${adresse}/?${feld}=${encodeURIComponent(code)}`:code;}
async function zugangscode(campaignId,userId,name){
  const result=await action({kind:"kopplung",campaignId,userId},"Zugangslink erzeugt.");
  // Bewusst die eigene Adresse der Welt: nur dort kann sich danach ein Passkey einrichten,
  // und genau der macht den naechsten Weg zurueck ueberfluessig. Fuer ein anderes Geraet im
  // Heimnetz steht die zweite Fassung darunter.
  if(result)zeigeCode(`Zugangslink für ${name}`,codeLink(result.code,"pair",weltAdresse),
    `Zehn Minuten gültig, einmal einlösbar. Der Link öffnet die Anmeldeseite dieser Welt und trägt den Code schon ein.${gastAdresse&&gastAdresse!==weltAdresse?` Auf einem anderen Gerät im Heimnetz stattdessen: ${codeLink(result.code,"pair",gastAdresse)}`:""}`);
}
async function setzeRolle(campaignId,userId,role){
  const result=await action({kind:"rolle",campaignId,userId,role},role==="leitung"?"Spielleitung gesetzt.":"Zum Spieler gemacht.");
  if(result){message(result.changed?"Rolle geändert.":"Diese Rolle war bereits gesetzt.");await ladeRunden();}
}
byId("zugang-kopieren").onclick=async()=>{
  const feld=byId("zugang-link");feld.focus();feld.select();
  try{await navigator.clipboard.writeText(feld.value);message("Kopiert. Schick den Link an die Person, die ihn braucht.");}
  catch{message("Der Link ist markiert — mit Strg+C kopieren.");}
};
byId("zugang-runde").onchange=()=>{gewaehlteRunde=byId("zugang-runde").value;verbergeCode();render();};
byId("zugang-einladung").onclick=async()=>{
  const runde=runden.find(kandidat=>kandidat.campaignId===gewaehlteRunde);if(!runde)return;
  const welt=zustand?.profileId;
  const result=await action({kind:"einladung",campaignId:runde.campaignId},"Einladungslink erzeugt.");
  if(result){
    eingeladen.add(welt);render();
    zeigeCode(`Einladungslink für ${runde.name}`,codeLink(result.code,"join",gastAdresse),"Sieben Tage gültig. Wer den Link öffnet, gibt nur noch seinen Namen an und steht dann hier unter „Vor der Tür“.");
  }
};
byId("runde-form").onsubmit=async event=>{
  event.preventDefault();
  const feld=byId("runde-name");
  const result=await action({kind:"runde-anlegen",name:feld.value},"Runde angelegt. Als Nächstes: Einladungslink erzeugen.");
  if(result){feld.value="";gewaehlteRunde=result.id;verbergeCode();await ladeRunden();}
};
byId("welt-select").onchange=()=>{gewaehlteWelt=byId("welt-select").value;};
byId("netzwerk-adresse").onchange=()=>{gewaehltesNetz=byId("netzwerk-adresse").value;render();};
const netzwerkWahl=()=>gewaehltesNetz?{lanAddress:gewaehltesNetz}:{};
byId("start").onclick=()=>{void action({kind:"start",profileId:byId("welt-select").value,...netzwerkWahl()},"Welt gestartet.");};
byId("create-form").onsubmit=async event=>{event.preventDefault();const result=await action({kind:"create",name:byId("profile-name").value,...netzwerkWahl()},"Neue Welt bereit. Richte jetzt deine Spielleitung ein.");if(result)byId("profile-name").value="";};
byId("setup-form").onsubmit=event=>{event.preventDefault();void action({kind:"setup",name:byId("gm-name").value},"Spielleitung eingerichtet. Das Spielfenster ist offen — lege als Nächstes hier eine Runde an.");};
byId("remote-form").onsubmit=event=>{event.preventDefault();void action({kind:byId("remote-lan").checked?"remote-lan":"remote",origin:byId("remote-origin").value},"Server geöffnet.");};
// The entered key leaves the field before the request and is never read back from Main.
byId("chronist-form").onsubmit=event=>{event.preventDefault();const field=byId("chronist-key"),value=field.value.trim();field.value="";if(!value){message("Bitte zuerst einen Schlüssel eingeben.",true);return;}void action({kind:"chronist-key",profileId:byId("chronist-profile").value,action:"set",value},"Schlüssel verschlüsselt in dieser Welt gespeichert. Ein Anbieterwechsel wirkt erst nach einem Neustart der Welt.");};
byId("chronist-clear").onclick=()=>{byId("chronist-key").value="";void action({kind:"chronist-key",profileId:byId("chronist-profile").value,action:"clear"},"Schlüssel entfernt. Ein laufender Host verwendet ihn bis zum nächsten Neustart der Welt weiter.");};
byId("chronist-profile").onchange=()=>{byId("chronist-key").value="";render();};
byId("stop").onclick=()=>action({kind:"stop"},"Welt geordnet beendet.");
byId("open").onclick=()=>action({kind:"open"},"Spielfenster geöffnet.");
byId("backup").onclick=()=>action({kind:"backup"},"Recovery-Punkt mit Gerätezugängen gesichert. Host geordnet beendet.");
byId("recovery-form").onsubmit=event=>{event.preventDefault();void action({kind:"recovery-restore",recoveryId:byId("recovery-select").value,name:byId("recovery-name").value},"Host-Sicherung in neuer Welt wiederhergestellt. Deine ursprüngliche Welt bleibt erhalten.");};
byId("restore-form").onsubmit=async event=>{event.preventDefault();const result=await action({kind:"restore-select",name:byId("restore-name").value},"Datei geprüft. Bitte den Bericht bestätigen.");if(!result||result.canceled)return;restoreTicket=result.ticket;restoreCampaign=result.report.campaignId;gms=result.gms;byId("restore-report").textContent=`Format V${result.report.formatVersion} · ${result.report.rows} Datensätze · ${result.report.identitiesWithoutCredentials} historische Identitäten. Ziel ist die soeben angelegte leere Welt. Öffentliche Auslieferung bleibt aus.`;byId("restore-review").hidden=false;};
byId("restore-confirm").onclick=async()=>{const result=await action({kind:"restore-confirm",ticket:restoreTicket},"Kampagne wiederhergestellt. Verbinde jetzt die historische Spielleitung.");if(!result)return;byId("restore-review").hidden=true;byId("gm-select").replaceChildren();for(const gm of gms){const option=document.createElement("option");option.value=gm.id;option.textContent=gm.name;byId("gm-select").append(option);}byId("enrollment").hidden=false;};
byId("enroll").onclick=async()=>{const result=await action({kind:"enroll",campaignId:restoreCampaign,userId:byId("gm-select").value},"Einmaligen Code jetzt in der Welt unter „Gerät verbinden“ einlösen.");if(result)byId("pairing").textContent=`${result.code}\nGültig für zehn Minuten. Teile diesen Code nur mit der gewählten Spielleitung.`;};
window.addEventListener("focus",()=>{void ladeRunden();});
void refresh();setInterval(()=>{void refresh();},1500);
