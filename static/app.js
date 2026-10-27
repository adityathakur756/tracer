const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pages = [...document.querySelectorAll('.page')];
let activePeerFilter = 'All';
let peers = [], teams = [], members = [], pilgrims = [], cases = [], checkpoints = [], medical = [];

async function api(path, options={}) {
  const response = await fetch(`/api${path}`, {
    headers: {'Content-Type':'application/json', ...(options.headers || {})},
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}
function toast(msg) {
  const t=$('toast'); t.textContent=msg; t.style.display='block';
  clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>t.style.display='none',3200);
}
function go(id) {
  pages.forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
function badge(text,cls=''){return `<span class="badge ${cls}">${esc(text)}</span>`}
function updateSelect(id, items, valueKey, labelFn) {
  const s=$(id); if(!s) return;
  const old=s.value;
  s.innerHTML=items.map(x=>`<option value="${esc(x[valueKey])}">${esc(labelFn(x))}</option>`).join('');
  if(items.some(x=>String(x[valueKey])===old)) s.value=old;
}
function updateSelects(){
  updateSelect('mTeam',teams,'id',t=>t.id+' · '+t.name);
  updateSelect('caseTeam',teams,'id',t=>t.id+' · '+t.name);
  updateSelect('hTeam',teams,'id',t=>t.id+' · '+t.name);
}
function renderPeers(){
  const q=($('peerSearch')?.value||'').toLowerCase();
  const data=peers.filter(p=>(activePeerFilter==='All'||p.status===activePeerFilter)&&Object.values(p).join(' ').toLowerCase().includes(q));
  $('peerList').innerHTML=data.length?data.map(p=>`<div class="row"><div class="avatar">${esc(p.name.split(' ').map(x=>x[0]).join('').slice(0,2))}</div><div class="rowinfo"><b>${esc(p.name)} · ${esc(p.id)}</b><p>${esc(p.group||'Unassigned')} · ${esc(p.checkpoint||'Not verified')}<br>${esc(p.phone||'Not provided')}</p></div>${badge(p.status,p.status==='Pending'?'orange':'')}<button class="btn alt small" onclick="peerCheck('${esc(p.id)}')">Check-in</button></div>`).join(''):'<p class="sub">No matching peers.</p>';
  $('peerCount').textContent=peers.length;
  $('pendingPeers').textContent=peers.filter(p=>p.status==='Pending').length;
  $('peerAlerts').textContent=peers.filter(p=>p.status==='Pending').length?1:0;
  $('statPeers').textContent=peers.length;
}
document.querySelectorAll('#peerTabs button').forEach(b=>b.addEventListener('click',()=>{
  activePeerFilter=b.dataset.filter;
  document.querySelectorAll('#peerTabs button').forEach(x=>x.classList.toggle('active',x===b)); renderPeers();
}));
async function peerCheck(id){
  try { await api(`/peers/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'Connected'})}); await refresh(); toast('Check-in saved to database for '+id); }
  catch(e){toast(e.message)}
}
function renderTeams(){
  const q=($('teamSearch')?.value||'').toLowerCase();
  const data=teams.filter(t=>Object.values(t).join(' ').toLowerCase().includes(q));
  $('teamGrid').innerHTML=data.map(t=>{
    const count=members.filter(m=>m.team===t.id).length;
    return `<div class="card"><div class="head"><span class="badge blue">${esc(t.id)}</span>${badge(t.status,t.status==='Assigned'?'orange':'')}</div><h3>${esc(t.name)}</h3><p class="sub">${esc(t.skill)}</p><div class="membermeta">TEAM LEAD · ${esc(t.lead)}<br>ASSIGNED ZONE · ${esc(t.zone)}<br>ROSTER SIZE · ${count} member(s)</div><div class="actions" style="margin-top:12px"><button class="btn alt small" onclick="teamRoster('${esc(t.id)}')">View Roster</button></div></div>`;
  }).join('')||'<p class="sub">No matching teams.</p>';
  $('statTeams').textContent=teams.length;
}
function teamRoster(id){$('memberSearch').value=id;renderMembers();go('members')}
function renderMembers(){
  const q=($('memberSearch')?.value||'').toLowerCase();
  const data=members.filter(m=>Object.values(m).join(' ').toLowerCase().includes(q));
  $('memberRows').innerHTML=data.map(m=>`<tr><td>${esc(m.id)}</td><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td><button class="btn alt small" onclick="teamRoster('${esc(m.team)}')">${esc(m.team)}</button></td><td>${esc(m.zone||'—')}</td><td>${badge(m.status,m.status==='Standby'?'orange':'')}</td></tr>`).join('')||'<tr><td colspan="6">No matching members.</td></tr>';
  $('memberCount').textContent=members.length;
  $('leadCount').textContent=members.filter(m=>m.role==='Team Lead').length;
  $('medicalRoleCount').textContent=members.filter(m=>m.role==='Medical Responder').length;
  $('assignedCount').textContent=members.filter(m=>m.status==='Assigned').length;
}
function renderPilgrims(){
  $('pilgrimRows').innerHTML=pilgrims.map(p=>`<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.destination)}</td><td>${esc(p.group||'—')}</td><td>${esc(p.checkpoint||'—')}</td></tr>`).join('');
}
function renderReports(){
  const q=($('reportSearch')?.value||'').toLowerCase();
  const data=cases.filter(c=>Object.values(c).join(' ').toLowerCase().includes(q));
  $('reportRows').innerHTML=data.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.name)}</td><td>${esc(c.checkpoint)}</td><td>${badge(c.priority,c.priority==='High'?'red':'orange')}</td><td>${esc(c.team||'Unassigned')}</td><td>${esc(c.status)}</td></tr>`).join('')||'<tr><td colspan="6">No matching cases.</td></tr>';
  $('recentCases').innerHTML=cases.slice(0,4).map(c=>`<div class="row"><div class="avatar">⌖</div><div class="rowinfo"><b>${esc(c.name)} · ${esc(c.id)}</b><p>${esc(c.checkpoint)}<br>Assigned: ${esc(c.team||'Unassigned')} · ${esc(c.status)}</p></div>${badge(c.priority,c.priority==='High'?'red':'orange')}</div>`).join('');
  $('statReports').textContent=cases.length;
}
function renderCheckpoints(){
  $('checkpointRows').innerHTML=checkpoints.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.zone||'—')}</td><td>${esc(c.person)}</td><td>${badge(c.status,c.status==='Verified'?'':'orange')}</td></tr>`).join('');
}
function filterLocations(){
  const q=$('locationSearch').value.toLowerCase();
  document.querySelectorAll('.mappin').forEach(p=>p.style.opacity=!q||p.textContent.toLowerCase().includes(q)?'1':'.25');
}
function renderMedical(){
  $('medicalList').innerHTML=medical.map(m=>`<div class="row"><div class="avatar">✚</div><div class="rowinfo"><b>${esc(m.id)} · ${esc(m.type)}</b><p>${esc(m.person)} · ${esc(m.location)}<br>Team: ${esc(m.team||'Unassigned')}</p></div>${badge(m.urgency,m.urgency==='Urgent'?'red':'')}</div>`).join('') || '<p class="sub">No assistance requests yet.</p>';
  $('statMedical').textContent=medical.length;
}
async function refresh(){
  const data=await api('/bootstrap');
  peers=data.peers; teams=data.teams; members=data.members; pilgrims=data.pilgrims;
  cases=data.cases; checkpoints=data.checkpoints; medical=data.medical;
  updateSelects(); renderPeers(); renderTeams(); renderMembers(); renderPilgrims(); renderReports(); renderCheckpoints(); renderMedical();
}
function formPayload(ids){const out={};ids.forEach(id=>out[id.replace(/^[ptmrc h]/,'')]=($(id)?.value||'').trim());return out}
function bindForm(id, endpoint, mapper, success, after){
  $(id).addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      await api(endpoint,{method:'POST',body:JSON.stringify(mapper())});
      e.target.reset(); await refresh(); if(after)go(after); toast(success);
    }catch(err){toast(err.message)}
  });
}
bindForm('peerForm','/peers',()=>({id:$('pId').value.trim(),name:$('pName').value.trim(),group:$('pGroup').value.trim(),phone:$('pPhone').value.trim(),checkpoint:$('pCheckpoint').value.trim(),status:$('pStatus').value}), 'Peer record saved to database.','peer');
bindForm('teamForm','/teams',()=>({id:$('tId').value.trim(),name:$('tName').value.trim(),lead:$('tLead').value.trim(),skill:$('tSkill').value,zone:$('tZone').value.trim(),status:$('tStatus').value}), 'Rescue team saved to database.','teams');
bindForm('memberForm','/members',()=>({id:$('mId').value.trim(),name:$('mName').value.trim(),team:$('mTeam').value,role:$('mRole').value,zone:$('mZone').value.trim(),status:$('mStatus').value,qual:$('mQual').value.trim(),contact:$('mContact').value.trim()}), 'Team member saved to database.','members');
bindForm('registrationForm','/pilgrims',()=>({id:$('rId').value.trim(),name:$('rName').value.trim(),age:$('rAge').value?Number($('rAge').value):null,phone:$('rPhone').value.trim(),destination:$('rDestination').value.trim(),group:$('rGroup').value.trim(),checkpoint:$('rCheckpoint').value.trim(),emergency:$('rEmergency').value.trim(),notes:$('rNotes').value.trim()}), 'Pilgrim registration saved to database.');
bindForm('reportForm','/cases',()=>({id:$('caseId').value.trim(),name:$('caseName').value.trim(),checkpoint:$('caseCheckpoint').value.trim(),priority:$('casePriority').value,team:$('caseTeam').value,status:$('caseStatus').value,details:$('caseDetails').value.trim()}), 'Missing-person report saved to database.','reports');
bindForm('checkpointForm','/checkpoints',()=>({id:$('cId').value.trim(),person:$('cPerson').value.trim(),zone:$('cZone').value.trim(),status:$('cStatus').value,notes:$('cNotes').value.trim()}), 'Checkpoint saved to database.','locate');
bindForm('medicalForm','/medical',()=>({id:$('hId').value.trim(),person:$('hPerson').value.trim(),type:$('hType').value,location:$('hLocation').value.trim(),urgency:$('hUrgency').value,team:$('hTeam').value,notes:$('hNotes').value.trim()}), 'Medical request saved to database.');

async function init(){
  try { await refresh(); }
  catch(e){toast('Backend connect nahi hua: '+e.message+' — Flask server run karein.');}
}
init();
