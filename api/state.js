const {authed} = require('./_lib/auth');
const {readJson} = require('./_lib/github');

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({error: 'auth'});
  try {
    const [games, config, notices] = await Promise.all([
      readJson('games.json'),
      readJson('config.json'),
      readJson('notices.json'),
    ]);
    const repo = process.env.GITHUB_REPO || 'whiteravix/XCat5';
    const branch = process.env.GITHUB_BRANCH || 'main';
    return res.status(200).json({
      games: games || [],
      config: config || {strings: {}},
      notices: notices || [],
      rawBase: `https://raw.githubusercontent.com/${repo}/${branch}`,
    });
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
