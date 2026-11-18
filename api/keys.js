// Every text key the app ships, with its current wording, so the panel can show the real list
// instead of asking for a key to be typed from memory. Read from the app repository through the
// GitHub API with the same server-side token; the browser never sees it.
const {authed} = require('../lib/auth');

const APP_REPO = process.env.APP_REPO || 'whiteravix/X5-SC';
const LOCALES = process.env.APP_LOCALES || 'game-store/native/i18n/locales';

async function readLocale(path) {
  const headers = {Accept: 'application/vnd.github+json', 'User-Agent': 'xg5-admin'};
  const token = process.env.APP_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const answer = await fetch(`https://api.github.com/repos/${APP_REPO}/contents/${path}?ref=main`, {headers});
  if (!answer.ok) throw new Error(`github ${path}: ${answer.status}`);
  const file = await answer.json();
  return JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
}

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({error: 'auth'});
  try {
    const [en, fa] = await Promise.all([
      readLocale(`${LOCALES}/en.json`),
      readLocale(`${LOCALES}/fa.json`),
    ]);
    return res.status(200).json({en, fa});
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
