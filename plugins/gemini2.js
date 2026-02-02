const { cmd, commands } = require('../command');
const axios = require('axios');
const FormData = require('form-data');

cmd({
    pattern: "banana2",
    alias: ["nano2", "gemini2"], 
    desc: "Generate Stylized AI image using Nano Banana v5",
    category: "ai",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // Image detection logic
        let q_msg = m.quoted ? m.quoted : m;
        let mime = (q_msg.msg || q_msg).mimetype || '';
        
        if (!/image/.test(mime)) return reply("*❌ ᴀᴛᴛᴇɴᴛɪᴏɴ:* Please reply to an image.");
        if (!q) return reply("*❌ ᴍɪssɪɴɢ ɪɴᴘᴜᴛ:* Please provide a prompt.\n\n*Example:* .nano2 cyberpunk style");

        // Stylized Status Message
        reply("🎨 *Ｎａｎｏ Ｂａｎａｎａ ｖ５*\n\n> *Status:* Transforming Image...\n> *Wait:* Please stay online.");

        // Download using bot's internal method
        let media = await q_msg.download();
        if (!media) return reply("❌ *ᴇʀʀᴏʀ:* Could not download media.");

        // Link generation
        let ext = mime.split("/")[1] || "jpg";
        let imageUrl = await uploadToCatbox(media, ext);

        if (!imageUrl) return reply("❌ *ᴜᴘʟᴏᴀᴅ ғᴀɪʟᴇᴅ:* Server error.");

        // API Call
        let apiEndpoint = `https://api.nekolabs.web.id/image-generation/nano-banana/v5?prompt=${encodeURIComponent(q)}&imageUrl=${encodeURIComponent(imageUrl)}`;
        
        let response = await axios.get(apiEndpoint);
        let data = response.data;

        if (data.success && data.result) {
            let stylizedCaption = `✨ *Ｎａｎｏ Ｂａｎａｎａ ｖ５* ✨\n\n` +
                                  `📝 *Prompt:* ${q}\n` +
                                  `⚡ *Response:* Successfully Generated\n\n` +
                                  `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ FAHEEM-MD*`;

            await conn.sendMessage(from, { 
                image: { url: data.result }, 
                caption: stylizedCaption 
            }, { quoted: mek });
        } else {
            reply("❌ *ᴀᴘɪ ᴇʀʀᴏʀ:* Generation failed.");
        }

    } catch (e) {
        console.log(e);
        reply("❌ *sʏsᴛᴇᴍ ᴄʀᴀsʜ ᴘʀᴇᴠᴇɴᴛᴇᴅ:* " + e.message);
    }
});

// Catbox Function
async function uploadToCatbox(buffer, ext) {
    try {
        let form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, `image.${ext}`);
        let res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
        });
        return res.data; 
    } catch (err) {
        return null;
    }
}
