const factory = require("./FactoryHandler");
const createGalleryModel = require("../Modules/createGallary");

exports.createGallery = factory.createOne(createGalleryModel);
exports.getGallerys = factory.getAll(createGalleryModel);
exports.getGallery = factory.getOne(createGalleryModel);
exports.updateGallery = factory.updateOne(createGalleryModel, "gallery");
exports.deleteGallery = factory.deleteOne(createGalleryModel, "gallery");
