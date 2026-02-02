const { cmd } = require("../command");
const axios = require("axios");

const commands = ["mp3url", "ytmp3", "audio"];

commands.forEach(command => {
  cmd({
    pattern: command,
    desc: "Download YouTube audio as MP3",
    category: "downloader",
    react: "🎵",
    filename: __filename
  }, async (conn, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Please provide a YouTube link.");

      let cleanUrl = q.split("&")[0];
      cleanUrl = cleanUrl.replace(
        "https://youtu.be/",
        "https://www.youtube.com/watch?v="
      );

      const apiUrl = `https://sarkar-apis.bandaheali.site/download/ytmp3?url=${encodeURIComponent(cleanUrl)}`;
      const res = await axios.get(apiUrl, { timeout: 20000 });

      if (!res.data || !res.data.success) {
        return reply("❌ Failed to fetch audio.");
      }

      const data = res.data.result;

      await conn.sendMessage(from, {
        image: { url: data.thumbnail },
        caption: `🎶 *${data.title}*
⏱ *Duration:* ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, "0")}
💽 *Size:* ${data.size}

> *🤍ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴀʜᴇᴇᴍ-ᴍᴅ🤍*`
      }, { quoted: mek });

      await conn.sendMessage(from, {
        audio: { url: data.download_url },
        mimetype: "audio/mpeg",
        fileName: `${data.title}.mp3`
      }, { quoted: mek });

    } catch (e) {
      console.error(`${command} command error:`, e);
      reply("❌ An error occurred.");
    }
  });
});