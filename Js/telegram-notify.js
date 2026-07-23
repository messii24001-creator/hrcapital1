// Sends admin alerts to Telegram directly from the browser — no
// backend or Cloud Function needed. Telegram's Bot API allows
// direct calls from client-side JS (CORS-enabled).
//
// SETUP: replace the two values below with your own bot's details.
//
// SECURITY NOTE: this token is visible to anyone who views the
// page source. That's an acceptable trade-off for a small
// business alert bot — worst case someone could send junk
// messages to this same Telegram chat, but a leaked bot token
// can't read your messages or access anything else. Use a bot
// created only for this purpose, not one reused elsewhere.

const TELEGRAM_BOT_TOKEN = "8885312322:AAEnFmrkgeyFHusM795mS9nPayHPQxjybGc";
const TELEGRAM_CHAT_ID = "8943944289";

export async function sendTelegramAlert(message) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    TELEGRAM_BOT_TOKEN === "PASTE_YOUR_BOT_TOKEN_HERE" ||
    !TELEGRAM_CHAT_ID ||
    TELEGRAM_CHAT_ID === "PASTE_YOUR_CHAT_ID_HERE"
  ) {
    console.warn("Telegram alerts not configured yet — skipping notification.");
    return;
  }

  try {

    const url =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage` +
      `?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}` +
      `&text=${encodeURIComponent(message)}` +
      `&parse_mode=HTML`;

    // A plain GET request never triggers a CORS "preflight" (unlike
    // POST + a JSON body), so this avoids a class of silent
    // cross-origin failures some browsers hit against Telegram's API.
    await fetch(url);

  } catch (e) {
    console.error("Telegram alert failed:", e);
  }

}
