// Sends the browser to a project's newest release asset, so the catalog link stays correct forever.
// `repo` is owner/name, `match` a regular expression over the asset file name; with no match, or no
// release at all, it lands on the project's latest-release page instead.
const REPO = /^[A-Za-z0-9_.-]{1,40}\/[A-Za-z0-9_.-]{1,60}$/;

// Only the projects the apps feed lists: the endpoint resolves catalog links, not any repository.
let allowed = null;
let allowedAt = 0;
async function listed(repo) {
  if (!allowed || Date.now() - allowedAt > 300000) {
    const {readJson} = require('./_lib/github');
    const feed = await readJson('apps.json').catch(() => null);
    allowed = new Set((feed || []).map(app => app.repo).filter(Boolean));
    allowedAt = Date.now();
  }
  return allowed.has(repo);
}

module.exports = async (req, res) => {
  const repo = (req.query && req.query.repo) || '';
  if (!REPO.test(repo)) return res.status(400).json({error: 'repo'});
  if (!(await listed(repo))) return res.status(404).json({error: 'unknown app'});
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
    let release = null;
    const latest = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {headers});
    if (latest.ok) release = await latest.json();
    else {
      // A project whose releases are all prereleases has no "latest"; its newest listed one is
      // still a real download (MihawkOS). Without this the app was sent to an HTML page and the
      // download became a browser capture.
      const list = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=1`, {headers});
      if (list.ok) { const found = await list.json(); if (Array.isArray(found)) release = found[0] || null; }
    }
    if (!release) return res.redirect(302, page);
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = (pattern && assets.find(item => pattern.test(item.name))) || null;
    // The address changes only with a new release; the console asks once per download.
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    // `json=1`: the app must know the address before opening the browser; a plain click still gets
    // the redirect.
    if (req.query.json) {
      return res.status(200).json({
        url: asset ? asset.browser_download_url : page,
        version: release.tag_name || '',
        asset: asset ? asset.name : '',
      });
    }
    return res.redirect(302, asset ? asset.browser_download_url : page);
  } catch {
    return res.redirect(302, page);
  }
};
