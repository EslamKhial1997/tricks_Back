const mongoose = require("mongoose");

const createMessage = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.ObjectId,
      ref: "Group",
      required: [true, "معرف الجروب مطلوب"],
    },
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
      path: "groupId",
      select: "name",
    },
    { path: "senderId", select: "name" },
  ]);
  next();
});
const createMessageModel = mongoose.model("Message", createMessage);
module.exports = createMessageModel;
