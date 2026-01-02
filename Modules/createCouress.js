const mongoose = require("mongoose");

const createCouresSchema = new mongoose.Schema(
  {
    couresItems: [
      {
        seenItem: [
          {
            type: mongoose.Schema.Types.Mixed,
            count: {
              type: Number,
              default: 5,
            },
            duration: {
              type: Number,
              default: 0,
            },
            videoTime: {
              type: Number,
              default: 0,
            },
          },
        ],
        lacture: {
          type: mongoose.Schema.ObjectId,
          ref: "Lectures",
          require: [true, "معرف المحاضرة مطلوب"],
        },

        teacherID: {
          type: String,
        },
        coupon: {
          type: String,
        },
        expires: Date,
        discount: {
          type: Number,
          default: 0,
        },
      },
    ],

    teacher: [
      {
        name: String,
        teacherID: String,
      },
    ],
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      require: [true, "معرف الطالب مطلوب"],
    },
  },
  { timestamps: true }
);

createCouresSchema.pre(/^find/, function (next) {
  this.populate([
    {
      path: "couresItems.lacture",
      populate: [
        {
          path: "section",
          populate: { path: "class", select: "name" }
        },
        { path: "teacher", select: "name" }
      ]
    },
    { path: "teacher", select: "name" },
  ]);
  next();
});
createCouresSchema.post("save", async function (doc, next) {
  await doc.populate([
    {
      path: "couresItems.lacture",
      populate: [
        {
          path: "section",
          populate: { path: "class", select: "name" }
        },
        { path: "teacher", select: "name" }
      ]
    },
    { path: "teacher", select: "name" },
  ]);
  next();
});
const createCouresModel = mongoose.model("Couress", createCouresSchema);
module.exports = createCouresModel;
