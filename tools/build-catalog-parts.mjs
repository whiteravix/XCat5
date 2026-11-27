// Merges every game's releases and page into one catalogue file, and stamps its version.
// Run from the catalog folder: node tools/build-catalog-parts.mjs
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const games = read('games.json');
const byStem = folder => new Map(readdirSync(folder).filter(name => name.endsWith('.json'))
  .map(name => [name.slice(0, -5), readFileSync(`${folder}/${name}`)]));
const releases = byStem('data/releases');
const pages = byStem('data/pages');

const merged = {};
for (const game of games) {
  merged[game.id] = {
    releases: JSON.parse(releases.get(game.id)?.toString('utf8') || '[]'),
    page: JSON.parse(pages.get(game.id)?.toString('utf8') || '{"about":[],"shots":[],"summary":""}'),
  };
}

const hash = createHash('sha1').update(readFileSync('games.json'));
for (const folder of ['data/releases', 'data/pages'])
  for (const file of readdirSync(folder).sort()) hash.update(readFileSync(`${folder}/${file}`));
const version = hash.digest('hex');

const text = JSON.stringify(merged);
writeFileSync('data/catalog.json', text);
writeFileSync('data/catalog-version.json', JSON.stringify({version}));
// The console's JS heap cannot parse the whole file while the store runs, so the same content is
// also written as four derived shards the app downloads and parses one at a time.
const partOf = id => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  return (hash >>> 0) % 4;
};
const shards = Array.from({length: 4}, () => ({}));
for (const [id, entry] of Object.entries(merged)) shards[partOf(id)][id] = entry;
mkdirSync('data/catalog', {recursive: true});
shards.forEach((shard, number) => writeFileSync(`data/catalog/part-${number}.json`, JSON.stringify(shard)));
console.log(`data/catalog.json ${(text.length / 2 ** 20).toFixed(2)} MiB, ${games.length} games, 4 shards`);
console.log(`version ${version}`);
