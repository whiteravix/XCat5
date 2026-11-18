// Session and password checks for the admin panel. Every secret comes from the environment, set in
// the Vercel dashboard; none of it is ever sent to the browser or written into the repo.
const crypto = require('crypto');

const COOKIE = 'xg5admin';
const TTL = 12 * 3600;

const secret = () => process.env.ADMIN_SECRET || '';

const sign = value => crypto.createHmac('sha256', secret()).update(value).digest('base64url');

const token = () => {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return `${exp}.${sign(String(exp))}`;
};

const verify = value => {
  if (typeof value !== 'string') return false;
  const [exp, mac] = value.split('.');
  if (!exp || !mac || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const passwordOk = given => {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

const cookieOf = req => {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
};

const authed = req => verify(cookieOf(req));

const loginCookie = () => `${COOKIE}=${token()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
const logoutCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

module.exports = {authed, passwordOk, loginCookie, logoutCookie};
