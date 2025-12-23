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
        required: [true, "معرف الطالب مطلوب"],
      },
    ],
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
  ]);
  next();
});
const createGroupModel = mongoose.model("Group", createGroup);
module.exports = createGroupModel;
