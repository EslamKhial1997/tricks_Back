const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");
const { uploadImage, resizeImage } = require("../Utils/imagesHandler");
const {
  createHonor,
  getHonors,
  getHonor,
  updateHonor,
  deleteHonor,
} = require("../Service/HonorService");
const { updateClassValidator } = require("../Resuble/ClassValidationError");
const Routes = Router();

Routes.route("/honor/")
  .post(
    protect,
    allowedTo("manager"),
    uploadImage,
    resizeImage("honor"),
    createHonor
  )
  .get(getHonors);
Routes.route("/honor/:id")
  .get(getHonor)
  .put(
    protect,
    allowedTo("manager"),
    uploadImage,
    updateClassValidator,
    resizeImage("honor"),
    updateHonor
  )
  .delete(protect, allowedTo("manager"), deleteHonor);
module.exports = Routes;
