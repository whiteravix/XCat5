// Serves cover/logo/hero images uploaded by the admin panel from the repository, so a new image is
// visible at once without a deployment. The console only ever talks to this host.
const ALLOWED = /^(covers|logos|heroes|apps)\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png)$/;
const TYPES = {jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'};

module.exports = async (req, res) => {
  const path = (req.query && req.query.path) || '';
  if (!ALLOWED.test(path)) return res.status(400).json({error: 'path'});
  const repo = process.env.GITHUB_REPO || 'whiteravix/XCat5';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const minute = Math.floor(Date.now() / 300000);
  try {
    const answer = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}?t=${minute}`);
    if (answer.status === 404) return res.status(404).json({error: 'missing'});
    if (!answer.ok) return res.status(502).json({error: `raw ${answer.status}`});
    const bytes = Buffer.from(await answer.arrayBuffer());
    res.setHeader('Content-Type', TYPES[path.split('.').pop()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
    return res.status(200).send(bytes);
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
