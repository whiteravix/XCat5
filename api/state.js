const {authed} = require('../lib/auth');
const {readJson} = require('../lib/github');

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({error: 'auth'});
  try {
    const [games, config, notices] = await Promise.all([
      readJson('games.json'),
      readJson('config.json'),
      readJson('notices.json'),
    ]);
    return res.status(200).json({
      games: games || [],
      config: config || {strings: {}},
      notices: notices || [],
    });
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
