const factory = require("./FactoryHandler");
const createSliderModel = require("../Modules/createSlider");

exports.createSlider = factory.createOne(createSliderModel);
exports.getSliders = factory.getAll(createSliderModel);
exports.getSlider = factory.getOne(createSliderModel);
exports.updateSlider = factory.updateOne(createSliderModel, "slider");
exports.deleteSlider = factory.deleteOne(createSliderModel, "slider");
