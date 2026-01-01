const createGroupModel = require("../Modules/createGroup");
const createMessageModel = require("../Modules/createMessage");

const cleanupMessages = async () => {
  console.log("🧹 Starting message cleanup...");
  try {
    const groups = await createGroupModel.find({ messageExpiration: { $gt: 0 } });

    for (const group of groups) {
      const expirationDate = new Array(Date.now());
      const days = group.messageExpiration;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await createMessageModel.deleteMany({
        groupId: group._id,
        createdAt: { $lt: cutoff },
      });

      if (result.deletedCount > 0) {
        console.log(
          `✅ Deleted ${result.deletedCount} messages from group: ${group.name}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error during message cleanup:", error);
  }
};

// Run cleanup every 24 hours
const startCleanupTask = () => {
  // Run once on startup
  cleanupMessages();
  // Then every 24 hours
  setInterval(cleanupMessages, 24 * 60 * 60 * 1000);
};

module.exports = { startCleanupTask };
