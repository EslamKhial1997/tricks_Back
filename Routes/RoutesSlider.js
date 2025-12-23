const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const { uploadImage, resizeImage } = require("../Utils/imagesHandler");
const {
  createSlider,
  getSliders,
  getSlider,
  updateSlider,
  deleteSlider,
} = require("../Service/SliderService");

const Routes = Router();

Routes.route("/slider/")
  .post(
    protect,
    allowedTo("admin", "manager"),
    uploadImage,
    resizeImage("slider"),
    createSlider
  )
  .get(getSliders);
Routes.route("/slider/:id")
  .get(getSlider)
  .put(
    protect,
    allowedTo("admin", "manager"),
    uploadImage,
    resizeImage("slider"),
    updateSlider
  )
  .delete(protect, allowedTo("admin", "manager"), deleteSlider);
module.exports = Routes;
