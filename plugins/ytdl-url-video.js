const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
};

async function getYupra(url) {
    const api = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`;
    const res = await axios.get(api, AXIOS_DEFAULTS);
    const d = res?.data?.data || {};
    return {
        download: d.download_url || null,
        title: d.title || "YouTube Video",
        thumb: d.thumbnail || null
    };
}

cmd({
    pattern: "mp4url",
    alias: ["ytmp4"],
    desc: "YouTube MP4 Downloader with 1-2 options",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (sock, message) => {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text || "";

        const link = text.split(" ").slice(1).join(" ").trim();
        if (!link.startsWith("http")) return;

        let info;
        try {
            const videoId =
                link.includes("watch?v=") ? link.split("v=")[1].split("&")[0] :
                link.includes("youtu.be/") ? link.split("youtu.be/")[1].split("?")[0] :
                null;
            info = videoId ? await yts({ videoId }) : null;
        } catch {}

        const customName = "⚡ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴀʜᴇᴇᴍ-ᴍᴅ⚡";

        const apiData = await getYupra(link);
        if (!apiData.download) return;

        // Preload video buffer for document option
        const bufferPromise = axios.get(apiData.download, { responseType: 'arraybuffer' });

        // Send thumbnail + options message
        const stylishMsg = `*${apiData.title}*

◈╼╼╼╼╼╼╼╼╼╼╼◈
*sᴇʟᴇᴄᴛ ᴅᴏᴡɴʟᴏᴀᴅ ғᴏʀᴍᴀᴛ*

*1 ▷ ᴠɪᴅᴇᴏ* 🎬
*2 ▷ ᴅᴏᴄᴜᴍᴇɴᴛ* 📁
◈╼╼╼╼╼╼╼╼╼╼╼◈

> *${customName}*`;

        const sentMsg = await sock.sendMessage(message.chat, {
            image: { url: apiData.thumb || info?.thumbnail },
            caption: stylishMsg
        }, { quoted: message });

        const listener = async (update) => {
            const msg = update.messages[0];
            if (!msg.message?.extendedTextMessage) return;

            const replyText = msg.message.extendedTextMessage.text.trim();
            const isReply =
                msg.message.extendedTextMessage.contextInfo?.stanzaId === sentMsg.key.id;

            if (!isReply) return;

            if (replyText === "1") {
                // Send video
                await sock.sendMessage(message.chat, {
                    video: { url: apiData.download },
                    mimetype: "video/mp4",
                    fileName: `${apiData.title}.mp4`,
                    caption: `> *${customName}*`
                }, { quoted: msg });
            } else if (replyText === "2") {
                // Send document
                const buffer = Buffer.from((await bufferPromise).data);
                await sock.sendMessage(message.chat, {
                    document: buffer,
                    mimetype: "video/mp4",
                    fileName: `${apiData.title}.mp4`,
                    caption: `> *${customName}*`
                }, { quoted: msg });
            }

            sock.ev.off("messages.upsert", listener);
        };

        sock.ev.on("messages.upsert", listener);

        // Auto remove listener after 2 mins
        setTimeout(() => {
            sock.ev.off("messages.upsert", listener);
        }, 120000);

    } catch (e) {
        console.log(e);
    }
});