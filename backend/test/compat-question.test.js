// End-to-end test of the Compatibility Question gate, run against the
// real Express app and a throwaway SQLite file.
//
//   node backend/test/compat-question.test.js     (exits non-zero on failure)
const os = require('os');
const path = require('path');

process.env.DB_PATH = path.join(os.tmpdir(), `veiled-compat-test-${process.pid}.db`);
process.env.JWT_SECRET = 'test-secret-for-compat-question-gate-0123456789';
process.env.NODE_ENV = 'test';
require('fs').rmSync(process.env.DB_PATH, { force: true });
process.on('exit', () => require('fs').rmSync(process.env.DB_PATH, { force: true }));

const app = require('../server.js');
const http = require('http');

let base;
const req = (method, path, { body, token } = {}) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(`${base}${path}`, {
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch { json = buf; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
};

(async () => {
  const server = http.createServer(app).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;

  // Two accounts: Aisha (sets a question) and Yusuf (must answer it).
  const mk = async (email, profile) => {
    const reg = await req('POST', '/auth/register', { body: { email, password: 'Passw0rd!test', displayName: profile.name } });
    if (!reg.body.token) throw new Error('register failed: ' + JSON.stringify(reg.body));
    const token = reg.body.token;
    const put = await req('PUT', '/dating/profile', { token, body: profile });
    if (put.status !== 200) throw new Error('profile failed: ' + JSON.stringify(put.body));
    return { token, id: put.body.profile.id };
  };

  const aisha = await mk('aisha@test.local', {
    name: 'Aisha', age: 27, gender: 'Woman', veil: 'Niqab', city: 'London',
    compatQuestion: 'How do you want to raise your children in deen?',
  });
  const yusuf = await mk('yusuf@test.local', { name: 'Yusuf', age: 29, gender: 'Man', city: 'London' });
  const omar = await mk('omar@test.local', { name: 'Omar', age: 31, gender: 'Man', city: 'London' });

  console.log('\nQuestion is stored and visible');
  const mine = await req('GET', '/dating/profile', { token: aisha.token });
  check('saved on her own profile', mine.body.profile.compatQuestion === 'How do you want to raise your children in deen?', mine.body.profile.compatQuestion);
  const seen = await req('GET', '/dating/discover', { token: yusuf.token });
  const her = (seen.body.candidates || []).map((c) => c.person).find((p) => p.id === aisha.id);
  check('visible to him in discover', her && her.compatQuestion === 'How do you want to raise your children in deen?', her && her.compatQuestion);

  console.log('\nLiking without an answer is refused');
  const bare = await req('POST', '/dating/swipe', { token: yusuf.token, body: { targetId: aisha.id, action: 'like' } });
  check('422 answerRequired', bare.status === 422 && bare.body.answerRequired === true, bare);
  check('the question comes back with the refusal', bare.body.question === 'How do you want to raise your children in deen?', bare.body.question);
  const likes0 = await req('GET', '/dating/likes-you', { token: aisha.token });
  check('no like was recorded', likes0.body.count === 0, likes0.body);
  const prof0 = await req('GET', '/dating/profile', { token: yusuf.token });
  check('a refused like costs him nothing', prof0.body.likesRemaining === 5, prof0.body.likesRemaining);

  console.log('\nA Rose without an answer is refused, and is not spent');
  const roseNo = await req('POST', '/dating/rose', { token: yusuf.token, body: { targetId: aisha.id } });
  check('422 answerRequired', roseNo.status === 422 && roseNo.body.answerRequired === true, roseNo);
  const superNo = await req('POST', '/dating/super-like', { token: yusuf.token, body: { targetId: aisha.id } });
  check('super like refused too', superNo.status === 422 && superNo.body.answerRequired === true, superNo);

  console.log('\nLiking with an answer goes through');
  const ok = await req('POST', '/dating/swipe', {
    token: yusuf.token,
    body: { targetId: aisha.id, action: 'like', answer: 'With patience, salah together, and a home where questions are welcome.' },
  });
  check('200', ok.status === 200, ok);
  const likes1 = await req('GET', '/dating/likes-you', { token: aisha.token });
  check('he appears in her likes', likes1.body.count === 1, likes1.body);
  const entry = likes1.body.people[0];
  check('she reads his answer', entry.like && entry.like.answer === 'With patience, salah together, and a home where questions are welcome.', entry && entry.like);
  check('the question is stored as asked', entry.like.question === 'How do you want to raise your children in deen?', entry.like.question);

  console.log('\nOnce she has liked him, he can like back freely');
  const herLike = await req('POST', '/dating/swipe', { token: aisha.token, body: { targetId: omar.id, action: 'like' } });
  check('her like on Omar lands', herLike.status === 200, herLike);
  const back = await req('POST', '/dating/swipe', { token: omar.token, body: { targetId: aisha.id, action: 'like' } });
  check('no answer demanded of him', back.status === 200, back);
  check('and they match', back.body.match === true, back.body);

  console.log('\nA blank answer does not satisfy the gate');
  // Yusuf has already liked her, so re-liking would be allowed whatever
  // he sends — the blank case needs someone who hasn't.
  const bilal = await mk('bilal@test.local', { name: 'Bilal', age: 30, gender: 'Man', city: 'London' });
  const blank = await req('POST', '/dating/swipe', {
    token: bilal.token, body: { targetId: aisha.id, action: 'like', answer: '   ' },
  });
  check('whitespace is refused', blank.status === 422 && blank.body.answerRequired === true, blank);

  console.log('\nPassing never needs an answer');
  const passed = await req('POST', '/dating/swipe', { token: bilal.token, body: { targetId: aisha.id, action: 'pass' } });
  check('pass goes through', passed.status === 200, passed);

  console.log('\nNo question set means no gate');
  const noQ = await mk('sumayya@test.local', { name: 'Sumayya', age: 26, gender: 'Woman', veil: 'Hijab', city: 'London' });
  const free = await req('POST', '/dating/swipe', { token: yusuf.token, body: { targetId: noQ.id, action: 'like' } });
  check('like without an answer is fine', free.status === 200, free);

  console.log('\nRemoving the question re-opens likes');
  await req('PUT', '/dating/profile', {
    token: aisha.token,
    body: { name: 'Aisha', age: 27, gender: 'Woman', veil: 'Niqab', city: 'London', compatQuestion: null },
  });
  const hamza = await mk('hamza@test.local', { name: 'Hamza', age: 28, gender: 'Man', city: 'London' });
  const after = await req('POST', '/dating/swipe', { token: hamza.token, body: { targetId: aisha.id, action: 'like' } });
  check('like without an answer now lands', after.status === 200, after);
  const likes2 = await req('GET', '/dating/likes-you', { token: aisha.token });
  const stillThere = likes2.body.people.find((p) => p.id === yusuf.id);
  check("an earlier answer survives the question's removal", stillThere && !!stillThere.like.answer, stillThere && stillThere.like);
  check('and still shows the question it answered', stillThere && stillThere.like.question === 'How do you want to raise your children in deen?', stillThere && stillThere.like.question);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
