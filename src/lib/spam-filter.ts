// Blocks common spam/phishing link patterns in user-submitted post text
// (recruitment post title/description/requirements). Not a general web-
// reputation service — a fast, static first line of defense against the
// most common patterns seen in gaming-community spam: URL shorteners
// (used to mask the real destination), free-hosting phishing domains, and
// known crypto/gambling-drop scam domains.

const BLOCKED_DOMAINS = new Set([
  // URL shorteners — legitimate use is rare in a recruitment post and they
  // hide the real destination, which is exactly what spam links rely on.
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "shorte.st",
  "adf.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "tiny.cc",
  "s.id",
  // Free-hosting domains disproportionately used for phishing/credential-
  // harvesting pages impersonating game/wallet login screens.
  "weebly.com",
  "000webhostapp.com",
  "webs.com",
  "wixsite.com",
  "glitch.me",
  "repl.co",
  // Common "free skins/gems/coins" scam and crypto-drop domains seen
  // targeting gaming communities.
  "free-robux.com",
  "freegiftcards.co",
  "steamcommunity.ru",
  "steamcommunlty.com",
  "discord-nitro.com",
  "airdrop-claim.com",
]);

// A generic "double word + random suffix" free-hosting pattern also worth
// catching without hardcoding every subdomain.
const SUSPICIOUS_TLD_PATTERN = /\.(?:xyz|top|club|gq|tk|ml|ga|cf)$/i;

const URL_PATTERN = /https?:\/\/([^\s/]+)/gi;

export interface SpamCheckResult {
  isSpam: boolean;
  matchedDomain?: string;
}

/** Scans free-text content for blocked/suspicious links. Case-insensitive, ignores query strings/paths. */
export function checkForSpamLinks(text: string): SpamCheckResult {
  const matches = text.matchAll(URL_PATTERN);
  for (const match of matches) {
    const host = match[1].toLowerCase().replace(/^www\./, "");
    if (BLOCKED_DOMAINS.has(host)) {
      return { isSpam: true, matchedDomain: host };
    }
    if (SUSPICIOUS_TLD_PATTERN.test(host)) {
      return { isSpam: true, matchedDomain: host };
    }
  }
  return { isSpam: false };
}
