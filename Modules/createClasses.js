const mongoose = require("mongoose");

const createClass = new mongoose.Schema(
  {
    name: {
      type: "string",
      required: [true, "Class Name Is Required"],
    },
    image: {
      type: String,
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "Teacher ID Is Required"],
    },
  },
  { timestamps: true }
);
createClass.pre(/^find/, function (next) {
  this.populate({
    path: "teacher",
    select: "name",
  });
  next();
});
createClass.post("save", async function (doc, next) {
  await doc.populate({ path: "teacher", select: "name" });
  next();
});
const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/class`)) {
    const image = `${process.env.BASE_URL}/class/${doc.image}`;
    doc.image = image;
  }
};
createClass.post("init", (doc) => {
  ImageURL(doc);
});
createClass.post("save", (doc) => {
  ImageURL(doc);
});
const createClassModel = mongoose.model("Class", createClass);
module.exports = createClassModel;
