// Sends the browser to a project's newest release asset, so the catalog link stays correct forever.
// `repo` is owner/name, `match` a regular expression over the asset file name; with no match, or no
// release at all, it lands on the project's latest-release page instead.
const REPO = /^[A-Za-z0-9_.-]{1,40}\/[A-Za-z0-9_.-]{1,60}$/;

module.exports = async (req, res) => {
  const repo = (req.query && req.query.repo) || '';
  if (!REPO.test(repo)) return res.status(400).json({error: 'repo'});
  const page = `https://github.com/${repo}/releases/latest`;
  let pattern = null;
  try {
    pattern = req.query.match ? new RegExp(String(req.query.match)) : null;
  } catch {
    pattern = null;
  }
  const headers = {Accept: 'application/vnd.github+json', 'User-Agent': 'xg5-latest'};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const answer = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {headers});
    if (!answer.ok) return res.redirect(302, page);
    const release = await answer.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = (pattern && assets.find(item => pattern.test(item.name))) || null;
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, asset ? asset.browser_download_url : page);
  } catch {
    return res.redirect(302, page);
  }
};
