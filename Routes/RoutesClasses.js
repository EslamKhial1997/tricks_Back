const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createClasses,
  getClassess,
  getClass,
  deleteClass,
  updateClass,
} = require("../Service/ClassService");
const {
  getClassValidator,
  createClassValidator,
  updateClassValidator,
  deleteClassValidator,
} = require("../Resuble/ClassValidationError");
const { uploadImage, resizeImage } = require("../Utils/imagesHandler");
const { createMiddleware, updateMiddleware } = require("../Service/Middleware");
const createClassModel = require("../Modules/createClasses");

const Routes = Router();

Routes.route("/class/")
  .post(
    protect,
    allowedTo("teacher"),
    createMiddleware,
    uploadImage,
    createClassValidator,
    resizeImage("/class"),
    createClasses
  )
  .get(getClassess);
Routes.route("/class/:id")
  .get(getClassValidator, getClass)
  .put(
    protect,
    allowedTo("teacher", "admin"),
    updateMiddleware(createClassModel),
    uploadImage,
    updateClassValidator,
    resizeImage("/class"),
    updateClass
  )
  .delete(
    protect,
    allowedTo("teacher"),
    updateMiddleware(createClassModel),
    deleteClassValidator,
    deleteClass
  );
module.exports = Routes;
