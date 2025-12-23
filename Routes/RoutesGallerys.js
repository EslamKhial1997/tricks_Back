const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const { uploadImage, resizeImage } = require("../Utils/imagesHandler");
const {
  createGallery,
  getGallerys,
  getGallery,
  updateGallery,
  deleteGallery,
} = require("../Service/GalleryService");
const { createMiddleware } = require("../Service/Middleware");
const Routes = Router();

Routes.route("/gallery/")
  .post( 
    protect,
    allowedTo("admin", "teacher"),
    createMiddleware,
    uploadImage,
    resizeImage("gallery"),
    createGallery
  )
  .get(getGallerys);
Routes.route("/gallery/:id")
  .get(getGallery)
  .put(
    protect,
    allowedTo("admin", "teacher"),
    createMiddleware,
    uploadImage,
    resizeImage("gallery"),
    updateGallery
  )
  .delete(protect, allowedTo("teacher"), createMiddleware, deleteGallery);
module.exports = Routes;
