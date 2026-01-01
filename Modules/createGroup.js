const mongoose = require("mongoose");

const createGroup = new mongoose.Schema(
  {
    name: String,
    token: {
      type: String,
      required: [true, "معرف المدرس مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
    grade: {
      type: mongoose.Schema.ObjectId,
      ref: "Class",
      required: [true, "معرف الصف مطلوب"],
    },
    bannedUsers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Users",
      },
    ],
    members: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Users",
      },
    ],
    pendingRequests: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Users",
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    messageExpiration: {
      type: Number,
      enum: [0, 7, 14, 30], // 0 means never
      default: 0,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
createGroup.pre(/^find/, function (next) {
  this.populate([
    {
      path: "teacher",
      select: "name",
    },
    { path: "grade", select: "name" },
    { path: "pendingRequests", select: "name phone" },
  ]);
  next();
});
const createGroupModel = mongoose.model("Group", createGroup);
module.exports = createGroupModel;
