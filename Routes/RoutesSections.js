const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createSections,
  getSections,
  getSection,
  updateSection,
  deleteSection,
} = require("../Service/SectionService");
const {
  createSectionsValidator,
  getSectionValidator,
  updateSectionValidator,
  deleteSectionValidator,
} = require("../Resuble/SectionValidationError");
const { uploadImage, resizeImage } = require("../Utils/imagesHandler");
const { updateMiddleware, createMiddleware } = require("../Service/Middleware");
const createSectionModel = require("../Modules/createSection");

const Routes = Router();

Routes.route("/section/")
  .post(
    protect,
    allowedTo("teacher", "admin"),
    createMiddleware,
    uploadImage,
    createSectionsValidator,
    resizeImage("section"),
    createSections
  )
  .get(getSections);
Routes.route("/section/:id")
  .get(getSectionValidator, getSection)
  .put(
    protect,
    allowedTo("admin", "teacher"),
    updateMiddleware(createSectionModel),
    uploadImage,
    updateSectionValidator,
    resizeImage("section"),
    updateSection
  )
  .delete(
    protect,
    allowedTo("teacher"),
    updateMiddleware(createSectionModel),
    deleteSectionValidator,
    deleteSection
  );
module.exports = Routes;
