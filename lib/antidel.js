const { isJidGroup } = require('@whiskeysockets/baileys');
const { loadMessage, getAnti } = require('../data');
const config = require('../config');

const getPSTime = () => {
    return new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update) => {
    const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || 'No content';
    deleteInfo += `\n*◈ Content ━* ${messageContent}`;

    await conn.sendMessage(
        jid,
        {
            text: deleteInfo,
            contextInfo: {
                mentionedJid: isGroup ? [update.key.participant || update.key.remoteJid, mek.key.participant || mek.key.remoteJid] : [update.key.remoteJid],
            },
        },
        { quoted: mek },
    );
};

const DeletedMedia = async (conn, mek, jid, deleteInfo) => {
    const antideletedmek = structuredClone(mek.message);
    const messageType = Object.keys(antideletedmek)[0];
    
    if (antideletedmek[messageType]) {
        antideletedmek[messageType].contextInfo = {
            stanzaId: mek.key.id,
            participant: mek.key.participant || mek.key.remoteJid,
            quotedMessage: mek.message,
        };
    }
    
    if (messageType === 'imageMessage' || messageType === 'videoMessage') {
        antideletedmek[messageType].caption = deleteInfo;
    } else {
        await conn.sendMessage(jid, { text: `*⚠️ Deleted Media Alert 🚨*\n\n${deleteInfo}` }, { quoted: mek });
    }
    await conn.relayMessage(jid, antideletedmek, {});
};

const AntiDelete = async (conn, updates) => {
    for (const update of updates) {
        if (update.update.message === null) {
            const store = await loadMessage(update.key.id);

            if (store && store.message) {
                const mek = store.message;
                const isGroup = isJidGroup(store.jid);
                
                const sender = isGroup ? mek.key.participant : mek.key.remoteJid;
                const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
                
                if (sender === ownerNumber || sender === conn.user.id) continue;

                const antiDeleteStatus = await getAnti();
                if (!antiDeleteStatus) continue;

                const deleteTime = getPSTime();
                let deleteInfo, jid;
                
                if (isGroup) {
                    const groupMetadata = await conn.groupMetadata(store.jid);
                    const groupName = groupMetadata.subject;
                    const senderNum = (mek.key.participant || mek.key.remoteJid).split('@')[0];
                    const deleterNum = (update.key.participant || update.key.remoteJid || 'Unknown').split('@')[0];
                    const actionBy = (senderNum === deleterNum) ? "Self Delete" : "Admin Deleted";

                    deleteInfo = `*╭────⬡ FAHEEM-MD ⬡────*
*├♻️ SENDER:* @${senderNum}
*├👥 GROUP:* ${groupName}
*├⏰ TIME:* ${deleteTime}
*├🗑️ DELETED BY:* @${deleterNum}
*├⚠️ ACTION:* ${actionBy}
*╰💬 MESSAGE:* Content Below 🔽`;
                    
                    jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : store.jid;
                } else {
                    const senderNumber = mek.key.remoteJid.split('@')[0];
                    
                    deleteInfo = `*╭────⬡ FAHEEM-MD ⬡────*
*├👤 SENDER:* @${senderNumber}
*├⏰ TIME:* ${deleteTime}
*├⚠️ ACTION:* Private Message Deleted
*╰💬 MESSAGE:* Content Below 🔽`;
                    
                    jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : update.key.remoteJid;
                }

                if (mek.message?.conversation || mek.message?.extendedTextMessage) {
                    await DeletedText(conn, mek, jid, deleteInfo, isGroup, update);
                } else {
                    await DeletedMedia(conn, mek, jid, deleteInfo);
                }
            }
        }
    }
};

module.exports = {
    DeletedText,
    DeletedMedia,
    AntiDelete,
};
