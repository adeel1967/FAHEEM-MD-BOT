const { cmd } = require('../command');

// Normalize ID (digits only, LID safe)
function normalizeId(id) {
    if (!id) return '';
    return id
        .replace(/:[0-9]+/g, '')
        .replace(/@(lid|s\.whatsapp\.net|c\.us|g\.us)/g, '')
        .replace(/[^\d]/g, '');
}

// Check user admin
async function isUserAdmin(conn, chatId, userId) {
    const metadata = await conn.groupMetadata(chatId);
    const participants = metadata.participants || [];
    const u = normalizeId(userId);

    for (const p of participants) {
        const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean);
        for (const pid of ids) {
            if (normalizeId(pid) === u) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }
    }
    return false;
}

// Check bot admin
async function isBotAdmin(conn, chatId) {
    const metadata = await conn.groupMetadata(chatId);
    const participants = metadata.participants || [];
    const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean).map(normalizeId);

    for (const p of participants) {
        if (p.admin) {
            const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean);
            for (const pid of ids) {
                if (botIds.includes(normalizeId(pid))) return true;
            }
        }
    }
    return false;
}

cmd({
    pattern: "out",
    alias: ["ck", "🦶", "kick"],
    react: "❌",
    desc: "Remove members by country code",
    category: "admin",
    filename: __filename
}, async (conn, m, store, { from, q, isGroup, sender, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only command.");

        if (!await isUserAdmin(conn, from, sender))
            return reply("❌ Only admins can use this command.");

        if (!await isBotAdmin(conn, from))
            return reply("❌ I must be admin.");

        if (!q) return reply("📝 Example:\n.out 92\n.out +971\n.out 966");

        // ✅ ONLY IMPORTANT LINE
        const targetCode = q.replace(/[^\d]/g, '');

        if (!targetCode) return reply("❌ Invalid country code.");

        const metadata = await conn.groupMetadata(from);
        const participants = metadata.participants || [];

        const targets = participants.filter(p => {
            if (p.admin) return false;
            const number = normalizeId(p.id || p.lid || '');
            return number.startsWith(targetCode);
        });

        if (!targets.length)
            return reply(`❌ No members found with +${targetCode}`);

        reply(`⏳ Removing ${targets.length} members with +${targetCode}...`);

        const batchSize = 5;
        for (let i = 0; i < targets.length; i += batchSize) {
            const batch = targets.slice(i, i + batchSize).map(p => p.id);
            await conn.groupParticipantsUpdate(from, batch, "remove");
            await new Promise(r => setTimeout(r, 1500));
        }

        reply(`✅ Done! Removed ${targets.length} members of +${targetCode}`);

    } catch (e) {
        console.error(e);
        reply("❌ Command failed.");
    }
});