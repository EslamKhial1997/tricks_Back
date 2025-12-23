const mongoose = require("mongoose");

const createMessage = new mongoose.Schema(
  {
    groupId: String,
    senderId: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      required: [true, "معرف المرسل مطلوب"],
    },
    senderName: String,
    text: String,
  },
  { timestamps: true }
);
createMessage.pre(/^find/, function (next) {
  this.populate([
    {
      path: "group",
      select: "name",
    },
    { path: "user", select: "name" },
  ]);
  next();
});
const createMessageModel = mongoose.model("Message", createMessage);
module.exports = createMessageModel;
