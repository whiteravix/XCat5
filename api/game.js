const {authed} = require('./_lib/auth');
const {readJson} = require('./_lib/github');

const ID = /^[A-Za-z0-9_-]{1,40}$/;

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({error: 'auth'});
  const id = (req.query && req.query.id) || '';
  if (!ID.test(id)) return res.status(400).json({error: 'id'});
  try {
    const [page, releases] = await Promise.all([
      readJson(`data/pages/${id}.json`),
      readJson(`data/releases/${id}.json`),
    ]);
    return res.status(200).json({
      page: page || {about: [], shots: [], summary: ''},
      releases: releases || [],
    });
  } catch (error) {
    return res.status(502).json({error: error.message});
  }
};
