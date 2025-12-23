const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createLectures,
  getLectures,
  getLecture,
  updateLecture,
  deleteLecture,
  resizeImage,
  deleteVideo,
  getVideo,
  updateMediaItem,
  deleteMediaItem,
  pushMediaItem,
} = require("../Service/LectureService");
const {
  createLectureValidator,
  getLectureValidator,
  updateLectureValidator,
  deleteLectureValidator,
} = require("../Resuble/LectureValidationError");
const { validateMedia2 } = require("../Resuble/validateMedia2");
const { uploadPDF } = require("../Utils/imagesHandler");
const { createMiddleware, updateMiddleware } = require("../Service/Middleware");
const createLecturesModel = require("../Modules/createAlecture");

const Routes = Router();

// add item

Routes.route("/lecture/")
  .post(
    protect,
    allowedTo("teacher", "admin"),
    createMiddleware,
    uploadPDF,
    createLectureValidator,
    resizeImage,
    createLectures
  ).get(getLectures);
Routes.route("/lecture/video/:id").delete(
  protect,
  allowedTo("teacher"),
  deleteVideo
);

Routes.route("/lecture/:id")
  .get(getLectureValidator, getLecture)
  .put(
    protect,
    allowedTo("teacher", "admin"),
    updateMiddleware(createLecturesModel),
    uploadPDF,
    updateLectureValidator,
    resizeImage,
    updateLecture
  )
  .delete(
    protect,
    allowedTo("teacher"),
    updateMiddleware(createLecturesModel),
    deleteLectureValidator,
    deleteLecture
  );
Routes.route("/lecture/item/:id")
  .put(
    protect,
    allowedTo("teacher", "admin"),
    updateLectureValidator,
    updateMediaItem
  )
  .delete(
    protect,
    allowedTo("teacher", "admin"),
    deleteLectureValidator,
    deleteMediaItem
  );
Routes.route("/lecture/video/:id/:mediaId")
  .get(protect, getVideo)
  .delete(protect, allowedTo("admin", "teacher"), deleteVideo);
Routes.route("/lecture/pushMedia/:lectureId").post(
  protect,
  allowedTo("teacher", "admin"),
  createMiddleware,
  uploadPDF,
  resizeImage,
  validateMedia2,
  pushMediaItem
);

// delete item & put item
Routes.route("/lecture/:id/media/:mediaId")
  .delete(protect, allowedTo("teacher"), deleteMediaItem)
  .put(
    protect,
    allowedTo("teacher", "admin"),
    updateMiddleware(createLecturesModel),
    uploadPDF,
    updateLectureValidator,
    resizeImage,
    updateMediaItem
  );
module.exports = Routes;
