const mongoose = require("mongoose");

const createGallery = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Gallery Image Is Required"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      
    },
  },
  { timestamps: true }
);
createGallery.pre(/^find/, function (next) {
  this.populate({
    path: "teacher",
    select: "name",
  });
  next();
});

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/gallery`)) {
    const image = `${process.env.BASE_URL}/gallery/${doc.image}`;
    doc.image = image;
  }
};
createGallery.post("init", (doc) => {
  ImageURL(doc);
});
createGallery.post("save", (doc) => {
  ImageURL(doc);
});
const createGalleryModel = mongoose.model("Gallerys", createGallery);
module.exports = createGalleryModel;
