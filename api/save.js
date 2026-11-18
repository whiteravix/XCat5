const {authed} = require('../lib/auth');
const {commitFiles} = require('../lib/github');

// Only catalog files the panel edits; anything else is refused, so a stolen session cannot rewrite
// the site or the admin code itself.
const ALLOWED = /^(games\.json|config\.json|notices\.json|edits\.json|data\/(pages|releases)\/[A-Za-z0-9_-]+\.json|covers\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png)|logos\/[A-Za-z0-9_.-]+\.(png|jpg)|heroes\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png))$/;
const MAX_BYTES = 6 * 1024 * 1024;

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({error: 'auth'});
  if (req.method !== 'POST') return res.status(405).json({error: 'method'});
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({error: 'body'});
  }
  const files = body && Array.isArray(body.files) ? body.files : [];
  if (!files.length) return res.status(400).json({error: 'files'});
  let total = 0;
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || !ALLOWED.test(file.path)) {
      return res.status(400).json({error: `path ${file && file.path}`});
    }
    if (typeof file.content !== 'string') return res.status(400).json({error: 'content'});
    total += file.content.length;
  }
  if (total > MAX_BYTES) return res.status(413).json({error: 'too large'});
  try {
    const sha = await commitFiles(files, body.message || 'Catalog edit from admin panel');
    return res.status(200).json({ok: true, sha});
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
