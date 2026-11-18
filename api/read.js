// Public, read-only view of the catalog files as they are in the repository right now. The admin
// panel commits there, so an edit is live without waiting for a deployment (this Vercel project is
// not connected to the repository, so a commit does not rebuild the site).
//
// Read through the GitHub contents API, not raw.githubusercontent: raw answers from a cache of up to
// five minutes, so a fresh edit looked missing.
const ALLOWED = /^(games|features|config|notices|edits)\.json$|^data\/(pages|releases)\/[A-Za-z0-9_-]+\.json$/;

module.exports = async (req, res) => {
  const path = (req.query && req.query.path) || '';
  if (!ALLOWED.test(path)) return res.status(400).json({error: 'path'});
  const repo = process.env.GITHUB_REPO || 'whiteravix/XCat5';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const headers = {Accept: 'application/vnd.github+json', 'User-Agent': 'xg5-read'};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const answer = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {headers});
    if (answer.status === 404) return res.status(404).json({error: 'missing'});
    if (!answer.ok) return res.status(502).json({error: `github ${answer.status}`});
    const file = await answer.json();
    if (!file || file.type !== 'file' || !file.content) return res.status(502).json({error: 'unreadable'});
    const text = Buffer.from(file.content, 'base64').toString('utf8');
    res.setHeader('Cache-Control', 'public, s-maxage=30, max-age=15');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
