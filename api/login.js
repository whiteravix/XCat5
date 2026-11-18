const {passwordOk, loginCookie, logoutCookie} = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', logoutCookie());
    return res.status(200).json({ok: true});
  }
  if (req.method !== 'POST') return res.status(405).json({error: 'method'});
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (!passwordOk(body.password)) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return res.status(401).json({error: 'wrong password'});
  }
  res.setHeader('Set-Cookie', loginCookie());
  return res.status(200).json({ok: true});
};
