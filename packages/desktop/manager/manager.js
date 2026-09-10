const api=window.chronicleDesktop;
const byId=id=>document.getElementById(id);
let waiting=false,restoreTicket,restoreCampaign,gms=[];
// Die zuletzt geladenen Runden samt Mitgliedern. Sie werden nur auf Anforderung geholt:
// die Statusabfrage laeuft alle 1,5 s, und dabei jedes Mal die Datenbank zu lesen waere
// Verschwendung fuer eine Ansicht, die sich selten aendert.
let runden=[],rundenGeladen=false;
const states={stopped:"Host beendet","starting-db":"Datenbank wird gestartet","checking-schema":"Welt wird geprüft","starting-app":"Spieloberfläche wird gestartet",ready:"Deine Welt ist bereit",draining:"Änderungen werden abgeschlossen",failed:"Host benötigt Aufmerksamkeit"};
function message(text,error=false){byId("message").textContent=text;byId("message").classList.toggle("error",error);}
async function invoke(request){const result=await api.invoke(request);if(!result.ok)throw new Error(result.error);return result.value;}
async function action(request,success){if(waiting)return;waiting=true;message("Die lokale Aktion läuft …");try{const result=await invoke(request);message(success||"Abgeschlossen.");return result;}catch(error){message(error.message,true);}finally{waiting=false;await refresh();}}
async function refresh(){try{const state=await invoke({kind:"status"});byId("host-title").textContent=states[state.state]||state.state;byId("host-detail").textContent=state.failure||state.origin||"Der Host ist beendet.";byId("setup").hidden=!state.setupRequired||state.state!=="ready";byId("open").hidden=state.state!=="ready"||state.setupRequired;byId("stop").hidden=state.state==="stopped";byId("backup").hidden=state.state!=="ready";byId("profiles").replaceChildren();for(const profile of state.profiles){const row=document.createElement("div");row.className="profile";const info=document.createElement("div"),name=document.createElement("strong"),detail=document.createElement("p");name.textContent=profile.name;detail.textContent=profile.id===state.profileId?"Aktive lokale Welt":"Auf diesem Rechner";info.append(name,detail);const start=document.createElement("button");start.type="button";start.textContent="Fortsetzen";start.disabled=waiting||state.busy||state.state!=="stopped";start.onclick=()=>action({kind:"start",profileId:profile.id},"Welt gestartet.");row.append(info,start);byId("profiles").append(row);}if(!state.profiles.length)byId("profiles").textContent="Hier beginnt deine erste Welt.";const selectedRecovery=byId("recovery-select").value;byId("recovery-select").replaceChildren();for(const point of state.recovery||[]){const option=document.createElement("option");option.value=point.id;const profile=state.profiles.find(profile=>profile.id===point.sourceProfileId);option.textContent=`${new Date(point.createdAt).toLocaleString()} · ${profile?.name||"Lokale Welt"}`;byId("recovery-select").append(option);}if((state.recovery||[]).some(point=>point.id===selectedRecovery))byId("recovery-select").value=selectedRecovery;for(const formId of["create-form","restore-form","recovery-form"])for(const control of byId(formId).elements)control.disabled=waiting||state.busy||state.state!=="stopped"||(formId==="recovery-form"&&!state.recovery?.length);const selectedWorld=byId("chronist-profile").value;byId("chronist-profile").replaceChildren();for(const profile of state.profiles){const option=document.createElement("option");option.value=profile.id;option.textContent=profile.name;byId("chronist-profile").append(option);}if(state.profiles.some(profile=>profile.id===selectedWorld))byId("chronist-profile").value=selectedWorld;const world=byId("chronist-profile").value;byId("chronist-state").textContent=(!world?"Lege zuerst eine lokale Welt an.":(state.chronistKeys||[]).includes(world)?"Ein Schlüssel ist für diese Welt gespeichert.":"Für diese Welt ist kein Schlüssel gespeichert.")+(state.chronistHinweis&&world===state.profileId?` ${state.chronistHinweis}`:"");for(const control of byId("chronist-form").elements)control.disabled=waiting||state.busy||!world;zeichneZugaenge(state);byId("version").textContent=`Desktop ${state.version}${state.runtime?` · Node ${state.runtime.node} · Bilddecoder ${state.runtime.decoder}`:""}`;}catch(error){message(error.message,true);}}
/**
 * Die Zugangsverwaltung. Sie erscheint nur bei laufender Welt, weil sie deren Datenbank liest.
 *
 * Warum es sie gibt: eine gewoehnliche Sitzung haelt acht Stunden. Wer weder einen Passkey
 * eingerichtet noch den Browser gemerkt hat, steht danach vor der Anmeldeseite ohne Weg zurueck
 * — auch die Spielleitung, die diesen Server selbst eingerichtet hat. Von hier aus gibt es
 * immer einen Weg hinein.
 */
function zeichneZugaenge(state){
  const sichtbar=state.state==="ready"&&!state.setupRequired;
  byId("zugaenge").hidden=!sichtbar;
  if(!sichtbar){rundenGeladen=false;runden=[];return;}
  if(!rundenGeladen){rundenGeladen=true;void ladeRunden();return;}
  const auswahl=byId("zugang-runde"),gewaehlt=auswahl.value;
  auswahl.replaceChildren();
  for(const runde of runden){const option=document.createElement("option");option.value=runde.campaignId;option.textContent=runde.name;auswahl.append(option);}
  if(runden.some(runde=>runde.campaignId===gewaehlt))auswahl.value=gewaehlt;
  const runde=runden.find(kandidat=>kandidat.campaignId===auswahl.value);
  const liste=byId("zugang-mitglieder");liste.replaceChildren();
  if(!runde){liste.textContent="In dieser Welt gibt es noch keine Runde. Lege sie in der Spieloberflaeche an.";byId("zugang-einladung").disabled=true;return;}
  byId("zugang-einladung").disabled=waiting||state.busy;
  for(const mitglied of runde.members){
    const zeile=document.createElement("div");zeile.className="profile";
    const info=document.createElement("div"),name=document.createElement("strong"),detail=document.createElement("p");
    name.textContent=mitglied.displayName;
    // Der wichtigste Satz der Zeile: wer gerade nicht mehr hereinkommt.
    detail.textContent=`${mitglied.role==="leitung"?"Spielleitung":"Spieler"}${mitglied.platformLeitung?" · darf eigene Runden anlegen":""} · ${mitglied.hasAccess?"kommt herein":"kommt gerade nicht herein"}`;
    info.append(name,detail);
    const knoepfe=document.createElement("div");knoepfe.className="actions";
    const zugang=document.createElement("button");zugang.type="button";zugang.textContent="Zugangscode";
    zugang.disabled=waiting||state.busy;
    zugang.onclick=()=>void zugangscode(runde.campaignId,mitglied.userId,mitglied.displayName);
    const rolle=document.createElement("button");rolle.type="button";
    rolle.textContent=mitglied.role==="leitung"?"Zum Spieler machen":"Zur Spielleitung machen";
    rolle.disabled=waiting||state.busy;
    rolle.onclick=()=>void setzeRolle(runde.campaignId,mitglied.userId,mitglied.role==="leitung"?"spieler":"leitung");
    knoepfe.append(zugang,rolle);
    zeile.append(info,knoepfe);liste.append(zeile);
  }
}
async function ladeRunden(){try{runden=await invoke({kind:"runden"});}catch(error){message(error.message,true);runden=[];}await refresh();}
async function zugangscode(campaignId,userId,name){
  const result=await action({kind:"kopplung",campaignId,userId},"Code erzeugt.");
  if(result)byId("zugang-ausgabe").textContent=`Zugangscode fuer ${name}: ${result.code}\nZehn Minuten gueltig, einmal einloesbar. In der Welt unter „Neues Geraet verbinden" eingeben.`;
}
async function setzeRolle(campaignId,userId,role){
  const result=await action({kind:"rolle",campaignId,userId,role},role==="leitung"?"Spielleitung gesetzt.":"Zum Spieler gemacht.");
  if(result){rundenGeladen=false;byId("zugang-ausgabe").textContent=result.changed?"Rolle geaendert.":"Diese Rolle war bereits gesetzt.";}
}
byId("zugang-runde").onchange=()=>{byId("zugang-ausgabe").textContent="";void refresh();};
byId("zugang-einladung").onclick=async()=>{
  const campaignId=byId("zugang-runde").value;if(!campaignId)return;
  const result=await action({kind:"einladung",campaignId},"Einladungscode erzeugt.");
  if(result){
    const runde=runden.find(kandidat=>kandidat.campaignId===campaignId);
    byId("zugang-ausgabe").textContent=`Einladung fuer ${runde?runde.name:"diese Runde"}: ${result.code}\nSieben Tage gueltig. Die eingeladene Person gibt den Code auf der Anmeldeseite unter „Zu einer Runde kommen" ein; die Spielleitung gibt den Beitritt danach in der Welt frei.`;
  }
};
byId("create-form").onsubmit=event=>{event.preventDefault();void action({kind:"create",name:byId("profile-name").value},"Neue Welt bereit. Richte jetzt deine Spielleitung ein.");};
byId("setup-form").onsubmit=event=>{event.preventDefault();void action({kind:"setup",name:byId("gm-name").value},"Spielleitung eingerichtet. Die Welt wurde geöffnet.");};
byId("remote-form").onsubmit=event=>{event.preventDefault();void action({kind:"remote",origin:byId("remote-origin").value},"Server geöffnet.");};
// The entered key leaves the field before the request and is never read back from Main.
byId("chronist-form").onsubmit=event=>{event.preventDefault();const field=byId("chronist-key"),value=field.value.trim();field.value="";if(!value){message("Bitte zuerst einen Schlüssel eingeben.",true);return;}void action({kind:"chronist-key",profileId:byId("chronist-profile").value,action:"set",value},"Schlüssel verschlüsselt in dieser Welt gespeichert. Ein Anbieterwechsel wirkt erst nach einem Neustart der Welt.");};
byId("chronist-clear").onclick=()=>{byId("chronist-key").value="";void action({kind:"chronist-key",profileId:byId("chronist-profile").value,action:"clear"},"Schlüssel entfernt. Ein laufender Host verwendet ihn bis zum nächsten Neustart der Welt weiter.");};
byId("chronist-profile").onchange=()=>{byId("chronist-key").value="";void refresh();};
byId("stop").onclick=()=>action({kind:"stop"},"Host geordnet beendet.");
byId("open").onclick=()=>action({kind:"open"},"Welt geöffnet.");
byId("backup").onclick=()=>action({kind:"backup"},"Recovery-Punkt mit Gerätezugängen gesichert. Host geordnet beendet.");
byId("recovery-form").onsubmit=event=>{event.preventDefault();void action({kind:"recovery-restore",recoveryId:byId("recovery-select").value,name:byId("recovery-name").value},"Host-Sicherung in neuer Welt wiederhergestellt. Deine ursprüngliche Welt bleibt erhalten.");};
byId("restore-form").onsubmit=async event=>{event.preventDefault();const result=await action({kind:"restore-select",name:byId("restore-name").value},"Datei geprüft. Bitte den Bericht bestätigen.");if(!result||result.canceled)return;restoreTicket=result.ticket;restoreCampaign=result.report.campaignId;gms=result.gms;byId("restore-report").textContent=`Format V${result.report.formatVersion} · ${result.report.rows} Datensätze · ${result.report.identitiesWithoutCredentials} historische Identitäten. Ziel ist die soeben angelegte leere Welt. Öffentliche Auslieferung bleibt aus.`;byId("restore-review").hidden=false;};
byId("restore-confirm").onclick=async()=>{const result=await action({kind:"restore-confirm",ticket:restoreTicket},"Kampagne wiederhergestellt. Verbinde jetzt die historische Spielleitung.");if(!result)return;byId("restore-review").hidden=true;byId("gm-select").replaceChildren();for(const gm of gms){const option=document.createElement("option");option.value=gm.id;option.textContent=gm.name;byId("gm-select").append(option);}byId("enrollment").hidden=false;};
byId("enroll").onclick=async()=>{const result=await action({kind:"enroll",campaignId:restoreCampaign,userId:byId("gm-select").value},"Einmaligen Code jetzt in der Welt unter „Gerät verbinden“ einlösen.");if(result)byId("pairing").textContent=`${result.code}\nGültig für zehn Minuten. Teile diesen Code nur mit der gewählten Spielleitung.`;};
void refresh();setInterval(()=>{void refresh();},1500);
