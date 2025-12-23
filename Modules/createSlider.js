const mongoose = require("mongoose");

const createSlider = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Slider Image Is Required"],
    },
  },
  { timestamps: true }
);

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/slider`)) {
    const image = `${process.env.BASE_URL}/slider/${doc.image}`;
    doc.image = image;
  }
};
createSlider.post("init", (doc) => {
  ImageURL(doc);
});
createSlider.post("save", (doc) => {
  ImageURL(doc);
});
const createSliderModel = mongoose.model("Sliders", createSlider);
module.exports = createSliderModel;
