const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const RSVP_FILE = path.join(DATA_DIR, 'rsvps.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const FIREBASE_SERVICE_ACCOUNT_BASE64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const SESSION_COOKIE = 'tram_admin';
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

let firestore = null;
if (FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    const { cert, initializeApp } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
    firestore = getFirestore(app);
  } catch (error) {
    console.error('Could not initialize Firebase Admin. Check FIREBASE_SERVICE_ACCOUNT_BASE64.');
    throw error;
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extraHeaders });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readLocalRsvps() {
  try {
    const data = JSON.parse(fs.readFileSync(RSVP_FILE, 'utf8'));
    if (!Array.isArray(data)) throw new Error('RSVP data must be a JSON array.');
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function writeLocalRsvps(rsvps) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${RSVP_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(rsvps, null, 2), 'utf8');
  fs.renameSync(temporaryFile, RSVP_FILE);
}

async function readRsvps() {
  if (firestore) {
    const snapshot = await firestore.collection('rsvps').get();
    return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
  }
  return readLocalRsvps();
}

async function writeRsvps(rsvps) {
  if (!firestore) return writeLocalRsvps(rsvps);
  const batch = firestore.batch();
  const existing = await firestore.collection('rsvps').get();
  const keep = new Set(rsvps.map(item => item.id));
  for (const document of existing.docs) {
    if (!keep.has(document.id)) batch.delete(document.ref);
  }
  for (const rsvp of rsvps) {
    const { id, ...data } = rsvp;
    batch.set(firestore.collection('rsvps').doc(id), data);
  }
  await batch.commit();
}

function normalizeLegacyRsvps() {
  if (firestore) return;
  const rsvps = readLocalRsvps();
  let changed = false;
  for (const rsvp of rsvps) {
    if (!rsvp.id) { rsvp.id = crypto.randomUUID(); changed = true; }
    if (typeof rsvp.message !== 'string') { rsvp.message = ''; changed = true; }
  }
  if (changed) writeLocalRsvps(rsvps);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSessionToken() {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(String(expiry)).digest('base64url');
  return `${expiry}.${signature}`;
}

function hasValidAdminSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const token = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  const [expiryText, signature] = token.split('.');
  const expiry = Number(expiryText);
  if (!Number.isInteger(expiry) || expiry <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(String(expiry)).digest('base64url');
  return safeEqual(signature, expected);
}

function cookieOptions(maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const token = maxAge ? createSessionToken() : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`;
}

function readJson(req, res, callback) {
  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 10_000) req.destroy();
  });
  req.on('end', () => {
    try { callback(JSON.parse(raw)); }
    catch { send(res, 400, { error: 'Invalid request.' }); }
  });
}

async function handleRsvp(input, res) {
  const name = String(input.name || '').trim().slice(0, 100);
  const email = String(input.email || '').trim().slice(0, 150);
  const emailNormalized = email.toLowerCase();
  const guests = Number(input.guests);
  const attending = input.attending === true;
  const message = String(input.message || '').trim().slice(0, 500);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(guests) || guests < 1 || guests > 4 || !message) {
    return send(res, 422, { error: 'Please check your name, email, and guest count.' });
  }

  try {
    if (firestore) {
      const id = crypto.createHash('sha256').update(emailNormalized).digest('hex');
      try {
        await firestore.collection('rsvps').doc(id).create({
          name, email, guests, attending, message, submittedAt: new Date().toISOString()
        });
      } catch (error) {
        if (error.code === 6 || error.code === 'already-exists') {
          return send(res, 409, { error: 'An RSVP has already been submitted with this email.' });
        }
        throw error;
      }
      return send(res, 201, { ok: true });
    }

    const rsvps = await readRsvps();
    if (rsvps.some(item => String(item.email || '').toLowerCase() === emailNormalized)) {
      return send(res, 409, { error: 'An RSVP has already been submitted with this email.' });
    }
    rsvps.push({ id: crypto.randomUUID(), name, email, guests, attending, message, submittedAt: new Date().toISOString() });
    await writeRsvps(rsvps);
    return send(res, 201, { ok: true });
  } catch (error) {
    console.error('Could not save RSVP:', error);
    return send(res, 500, { error: 'Could not save your RSVP right now.' });
  }
}

async function handleAdminSummary(res) {
  try {
    const all = await readRsvps();
    const attending = all.filter(item => item.attending === true);
    const declined = all.filter(item => item.attending !== true);
    return send(res, 200, {
      totalResponses: all.length,
      attendingResponses: attending.length,
      declinedResponses: declined.length,
      expectedGuests: attending.reduce((total, item) => total + (Number(item.guests) || 1), 0),
      recent: all.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    });
  } catch (error) {
    console.error('Could not load RSVP dashboard:', error);
    return send(res, 500, { error: 'Could not load RSVP data.' });
  }
}

async function deleteRsvp(id, res) {
  try {
    if (firestore) {
      const document = firestore.collection('rsvps').doc(id);
      const existing = await document.get();
      if (!existing.exists) return send(res, 404, { error: 'RSVP not found.' });
      await document.delete();
      return send(res, 200, { ok: true });
    }

    const rsvps = await readRsvps();
    const remaining = rsvps.filter(item => item.id !== id);
    if (remaining.length === rsvps.length) return send(res, 404, { error: 'RSVP not found.' });
    await writeRsvps(remaining);
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('Could not delete RSVP:', error);
    return send(res, 500, { error: 'Could not delete this RSVP.' });
  }
}

normalizeLegacyRsvps();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok' });
  if (req.method === 'POST' && url.pathname === '/api/rsvp') return readJson(req, res, input => handleRsvp(input, res));

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    if (!ADMIN_PASSWORD) return send(res, 503, { error: 'Set ADMIN_PASSWORD in .env to enable the admin page.' });
    return readJson(req, res, input => {
      if (!safeEqual(String(input.password || ''), ADMIN_PASSWORD)) return send(res, 401, { error: 'Incorrect password.' });
      return send(res, 200, { ok: true }, 'application/json; charset=utf-8', { 'Set-Cookie': cookieOptions(SESSION_LIFETIME_SECONDS) });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    return send(res, 200, { ok: true }, 'application/json; charset=utf-8', { 'Set-Cookie': cookieOptions(0) });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    if (!hasValidAdminSession(req)) return send(res, 401, { error: 'Please sign in.' });
    return handleAdminSummary(res);
  }

  const deleteMatch = url.pathname.match(/^\/api\/admin\/rsvps\/([a-f0-9-]{36}|[a-f0-9]{64})$/i);
  if (req.method === 'DELETE' && deleteMatch) {
    if (!hasValidAdminSession(req)) return send(res, 401, { error: 'Please sign in.' });
    return deleteRsvp(deleteMatch[1], res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); }
  catch { return send(res, 400, { error: 'Invalid path.' }); }
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  const file = path.resolve(PUBLIC, `.${pathname}`);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Forbidden.' });
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});

function listen(port, attemptsLeft = 20) {
  server.once('error', error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} is in use; trying ${port + 1}...`);
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    console.error('Could not start the invitation server:', error);
    process.exitCode = 1;
  });
  server.listen(port, '0.0.0.0', () => console.log(`Graduation invitation running at http://localhost:${port}`));
}

listen(PORT);
