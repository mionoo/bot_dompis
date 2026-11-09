const canonical = new Map([
  ['setgrup', 'set'], ['set', 'set'], ['start', 'start'], ['register', 'register'],
  ['cancel', 'cancel'], ['help', 'help'], ['naker', 'naker'],
  ['testtr', 'testtr'], ['tesploting', 'tesploting'], ['cekofficer', 'cekofficer'],
  ['tesgrupb2b', 'tesgrupb2b'], ['tesgruphd', 'tesgrupHD'],
  ['teskirimevident', 'teskirimevident'],
]);
function parseCommand(text, chatType, username) {
  const raw = String(text || '');
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return { text: raw, isCommand: false, ignore: false };
  const match = /^\/([A-Za-z0-9_]+)(?:@([A-Za-z0-9_]+))?(?=\s|$)([\s\S]*)$/.exec(trimmed);
  if (!match) return { ignore: true, isCommand: true };
  const [, name, mention, args] = match;
  const ownUsername = String(username || '').replace(/^@/, '').toLowerCase();
  if ((mention && mention.toLowerCase() !== ownUsername) ||
      (!mention && ['group', 'supergroup'].includes(chatType))) return { ignore: true, isCommand: true };
  let command = canonical.get(name.toLowerCase()) || name.toLowerCase();
  for (const prefix of ['monHD_', 'ttrb2b_', 'ffg_', 'wohi_']) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      command = prefix + name.slice(prefix.length); break;
    }
  }
  return { text: `/${command}${args}`, command: `/${command}`, isCommand: true, ignore: false };
}
module.exports = { parseCommand };
