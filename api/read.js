// Public, read-only view of the catalog files as they are in the repository right now. The admin
// panel commits there, so an edit is live without waiting for a deployment (this Vercel project is
// not connected to the repository, so a commit does not rebuild the site).
const ALLOWED = /^(games|features|config|notices|edits)\.json$|^data\/(pages|releases)\/[A-Za-z0-9_-]+\.json$/;

module.exports = async (req, res) => {
  const path = (req.query && req.query.path) || '';
  if (!ALLOWED.test(path)) return res.status(400).json({error: 'path'});
  const repo = process.env.GITHUB_REPO || 'whiteravix/XCat5';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const minute = Math.floor(Date.now() / 60000);
  try {
    const answer = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}?t=${minute}`);
    if (answer.status === 404) return res.status(404).json({error: 'missing'});
    if (!answer.ok) return res.status(502).json({error: `raw ${answer.status}`});
    const text = await answer.text();
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=30');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
