const axios = require("axios");
const yts = require("yt-search");
const { cmd } = require("../command");
const converter = require("../data/converter");

const commands = ["play", "song", "mp3"];

commands.forEach(command => {
  cmd({
    pattern: command,
    desc: "Download audio using song name only (Links blocked)",
    category: "downloader",
    react: "🎶",
    filename: __filename
  }, async (conn, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Please provide a song name.");

      const isLink = /^(https?:\/\/)/i.test(q);
      if (isLink) return reply("❌ Only song name is allowed. Links are blocked.");

      const search = await yts(q);
      if (!search.videos.length) return reply("❌ No results found.");

      const video = search.videos[0];
      const ytUrl = video.url;

      const apiUrl = `https://sarkar-apis.bandaheali.site/download/ytmp3?url=${encodeURIComponent(ytUrl)}`;
      const res = await axios.get(apiUrl);

      if (!res.data || !res.data.success) {
        return reply("❌ Failed to fetch audio.");
      }

      const data = res.data.result;
      const downloadUrl = data.download_url;

      const preDownload = axios.get(downloadUrl, {
        responseType: "arraybuffer"
      });

      const stylishMsg = `*${data.title}*

👤 *Channel:* ${video.author.name}
⏳ *Duration:* ${Math.floor(data.duration / 60)}:${data.duration % 60}
💽 *Size:* ${data.size}
◈╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼◈
  *sᴇʟᴇᴄᴛ ᴅᴏᴡɴʟᴏᴀᴅ ғᴏʀᴍᴀᴛ*
  
  (𝟷) ▷ *ᴀᴜᴅɪᴏ* 🎶
  (𝟸) ▷ *ᴅᴏᴄᴜᴍᴇɴᴛ* 📁
  (𝟹) ▷ *ᴠᴏɪᴄᴇ ɴᴏᴛᴇ* 🎙️
◈╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼◈

> *⚡ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴀʜᴇᴇᴍ-ᴍᴅ⚡*`;

      const sentMsg = await conn.sendMessage(from, {
        image: { url: data.thumbnail },
        caption: stylishMsg
      }, { quoted: mek });

      const messageListener = async (msgUpdate) => {
        const msg = msgUpdate.messages[0];
        if (!msg.message?.extendedTextMessage) return;

        const userText = msg.message.extendedTextMessage.text.trim();
        const isReply =
          msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

        if (!isReply) return;

        await conn.sendMessage(from, {
          react: { text: "⏳", key: msg.key }
        });

        const response = await preDownload;
        const buffer = Buffer.from(response.data);

        if (userText === "1") {
          await conn.sendMessage(from, {
            audio: buffer,
            mimetype: "audio/mpeg",
            fileName: `${data.title}.mp3`
          }, { quoted: msg });
        } 
        else if (userText === "2") {
          await conn.sendMessage(from, {
            document: buffer,
            mimetype: "audio/mpeg",
            fileName: `${data.title}.mp3`
          }, { quoted: msg });
        } 
        else if (userText === "3") {
          const ptt = await converter.toPTT(buffer, "mp3");
          await conn.sendMessage(from, {
            audio: ptt,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true
          }, { quoted: msg });
        }

        conn.ev.off("messages.upsert", messageListener);
      };

      conn.ev.on("messages.upsert", messageListener);

      setTimeout(() => {
        conn.ev.off("messages.upsert", messageListener);
      }, 120000);

    } catch (e) {
      console.log(e);
      reply("❌ An error occurred.");
    }
  });
});