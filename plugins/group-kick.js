const { cmd } = require('../command');

cmd({
    pattern: "kick",
    alias: ["remove", "k"],
    desc: "Remove a group member (admin only)",
    category: "admin",
    react: "🗑️",
    filename: __filename
},
async (Void, citel, text) => {
    try {
        if (!citel.isOwner) return citel.reply("❌ This command works only in groups!");

        const groupMetadata = await Void.groupMetadata(citel.chat);
        const admins = groupMetadata.participants
            .filter(p => p.admin === "admin" || p.admin === "superadmin")
            .map(p => p.id);

        // Check if user is admin
        if (!admins.includes(citel.sender)) {
            return citel.reply("⚠️ Only group admins can use this command!");
        }

        // Get target user (quoted or mentioned)
        const target = citel.quoted?.sender || citel.mentionedJid?.[0];
        if (!target) return citel.reply("❌ Reply to a message or mention a user to kick!");

        // Prevent kicking other admins
        if (admins.includes(target)) {
            return citel.reply("🚫 You can't kick another admin!");
        }

        // Remove user
        await Void.groupParticipantsUpdate(citel.chat, [target], "remove");

        // Success message
        await citel.reply(`🚫 @${target.split('@')[0]} has been kicked by an admin!`, {
            mentions: [target]
        });

    } catch (error) {
        console.error("[KICK ERROR]", error);
        citel.reply("❌ Failed to kick. Please check bot permissions or try again.");
    }
});