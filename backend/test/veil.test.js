// The Veil, end to end: a sister sets aside one unveiled photo, it is
// withheld from everyone until she unveils it for a specific match, and
// nothing — not time, not his asking — reveals it on her behalf.
//
//   node backend/test/veil.test.js   (needs the API running on :3000)
const API='http://localhost:3000/api';
const api=async(p,{method='GET',body,token}={})=>{const r=await fetch(`${API}${p}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));return {status:r.status, body:j};};
let pass=0,fail=0;
const ok=(n,c,x)=>{ if(c){pass++;console.log('  ✓',n);} else {fail++;console.log('  ✗',n, x!==undefined?JSON.stringify(x).slice(0,200):'');} };
(async()=>{
  const mk=async(name,profile)=>{
    const r=await api('/auth/register',{method:'POST',body:{email:`${name}${Date.now()}@v.test`,password:'Passw0rd!test',displayName:name}});
    const token=r.body.token;
    const p=await api('/dating/profile',{method:'PUT',token,body:profile});
    return {token,put:p};
  };

  console.log('\nA sister must set aside an unveiled photo');
  const noPhoto = await mk('Amina',{name:'Amina',age:26,gender:'Woman',veil:'Niqab',city:'London'});
  ok('profile refused without it', noPhoto.put.status===422 && noPhoto.put.body.unveiledPhotoRequired===true, noPhoto.put);

  const her = await mk('Khadija',{name:'Khadija',age:26,gender:'Woman',veil:'Niqab',city:'London',distance:2,unveiledPhoto:'/uploads/khadija-unveiled.jpg'});
  ok('accepted with it', her.put.status===200, her.put.status);
  const him = await mk('Bilal',{name:'Bilal',age:29,gender:'Man',city:'London'});
  ok('a brother needs no such photo', him.put.status===200, him.put.status);

  console.log('\nHer photo is not handed out with her profile');
  const disc = await api('/dating/discover',{token:him.token});
  const seen = (disc.body.candidates||[]).map(c=>c.person).find(p=>p.name==='Khadija');
  ok('he sees her profile', !!seen);
  ok('but not the reserved photo', seen && seen.unveiledPhoto===null, seen && seen.unveiledPhoto);
  ok('he can see that she has one', seen && seen.hasUnveiledPhoto===true, seen && seen.hasUnveiledPhoto);

  console.log('\nMatch, then the veil state');
  await api('/dating/swipe',{method:'POST',token:her.token,body:{targetId:seen ? (await api('/dating/discover',{token:her.token})).body.candidates.map(c=>c.person).find(p=>p.name==='Bilal').id : 0, action:'like'}});
  const sw = await api('/dating/swipe',{method:'POST',token:him.token,body:{targetId:seen.id,action:'like'}});
  ok('they match', sw.body.match===true, sw.body);
  const matchId = sw.body.matchId;

  let v = await api(`/dating/matches/${matchId}/veil`,{token:him.token});
  ok('she has not unveiled', v.body.theyUnveiled===false, v.body);
  ok('not ripe yet (new match, no messages)', v.body.ripe===false, v.body);

  console.log('\nHe asks; she is not unveiled by the asking');
  const ask = await api(`/dating/matches/${matchId}/unveil-ask`,{method:'POST',token:him.token});
  ok('ask accepted', ask.status===200, ask.body);
  const ask2 = await api(`/dating/matches/${matchId}/unveil-ask`,{method:'POST',token:him.token});
  ok('asking twice is a no-op', ask2.body.alreadyAsked===true, ask2.body);
  v = await api(`/dating/matches/${matchId}/veil`,{token:her.token});
  ok('she sees the request', v.body.theyAskedMe===true, v.body);
  ok('still veiled after the ask', v.body.iUnveiled===false, v.body);
  const stillHidden = await api('/dating/discover',{token:him.token});
  const her2 = (stillHidden.body.candidates||[]).map(c=>c.person).find(p=>p.name==='Khadija');
  ok('photo still withheld from him', !her2 || her2.unveiledPhoto===null);

  console.log('\nShe unveils — only then does he receive it');
  const un = await api(`/dating/matches/${matchId}/unveil`,{method:'POST',token:her.token});
  ok('unveil accepted', un.status===200, un.body);
  const ms = await api('/dating/matches',{token:him.token});
  const hers = (ms.body.matches||[]).find(m=>m.person.name==='Khadija');
  ok('he now receives the photo', hers && hers.person.unveiledPhoto==='/uploads/khadija-unveiled.jpg', hers && hers.person.unveiledPhoto);

  console.log('\nA stranger never receives it');
  const stranger = await mk('Omar',{name:'Omar',age:31,gender:'Man',city:'London'});
  const sd = await api('/dating/discover',{token:stranger.token});
  const asStranger = (sd.body.candidates||[]).map(c=>c.person).find(p=>p.name==='Khadija');
  ok('withheld from him', asStranger && asStranger.unveiledPhoto===null, asStranger && asStranger.unveiledPhoto);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
