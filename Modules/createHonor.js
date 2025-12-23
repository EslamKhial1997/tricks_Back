const mongoose = require("mongoose");

const createHonor = new mongoose.Schema(
  {
    name: {
      type: "string",
      required: [true, "Honor Name Is Required"],
    },
    image: {
      type: String,
      required: [true, "Honor Image Is Required"],
    },
  },
  { timestamps: true }
);

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/honor`)) {
    const image = `${process.env.BASE_URL}/honor/${doc.image}`;
    doc.image = image;
  }
};
createHonor.post("init", (doc) => {
  ImageURL(doc);
});
createHonor.post("save", (doc) => {
  ImageURL(doc);
});
const createHonorModel = mongoose.model("Honors", createHonor);
module.exports = createHonorModel;
