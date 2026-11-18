// Reads the catalog and commits edits through the GitHub API. The token lives in GITHUB_TOKEN; the
// browser never sees it. Commits go straight to the branch Vercel deploys.

const conf = () => ({
  repo: process.env.GITHUB_REPO || 'whiteravix/XCat5',
  branch: process.env.GITHUB_BRANCH || 'main',
  token: process.env.GITHUB_TOKEN || '',
});

async function call(path, init = {}) {
  const {repo, token} = conf();
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'xg5-admin',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`github ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// A 404 is a normal answer (a game without a page file); anything else is an error.
async function readJson(path) {
  const {repo, branch} = conf();
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}?t=${Date.now()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`raw ${path}: ${res.status}`);
  return res.json();
}

// One commit for every file: the panel changes games.json, a page, a release list and an image
// together, and a half-applied catalog would show for as long as Vercel takes to rebuild.
async function commitFiles(files, message) {
  const {branch} = conf();
  const ref = await call(`/git/ref/heads/${branch}`);
  const head = ref.object.sha;
  const base = await call(`/git/commits/${head}`);
  const tree = [];
  for (const file of files) {
    const blob = await call('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({content: file.content, encoding: file.encoding || 'utf-8'}),
    });
    tree.push({path: file.path, mode: '100644', type: 'blob', sha: blob.sha});
  }
  const made = await call('/git/trees', {
    method: 'POST',
    body: JSON.stringify({base_tree: base.tree.sha, tree}),
  });
  const commit = await call('/git/commits', {
    method: 'POST',
    body: JSON.stringify({message, tree: made.sha, parents: [head]}),
  });
  await call(`/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({sha: commit.sha}),
  });
  return commit.sha;
}

module.exports = {readJson, commitFiles};
