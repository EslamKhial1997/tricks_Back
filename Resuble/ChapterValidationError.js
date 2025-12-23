const { check } = require("express-validator");
const { default: slugify } = require("slugify");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createChaptersModel = require("../Modules/createChapter");
const createClassModel = require("../Modules/createClasses");
exports.createChaptersValidator = [
  check("name")
    .notEmpty()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    })
    .withMessage("Name Chapter is required"),
    check("class")
    .notEmpty()
    .withMessage("Must be at ID Class")
    .custom((val) =>
      createClassModel.findOne({ _id: val }).then((e) => {
        if (!e) {
          return Promise.reject(new Error("Sorry Class is not available"));
        }
      })
    ),
  MiddlewareValidator,
];
exports.getChapterValidator = [
    check("id").isMongoId().withMessage("Id Not Vaild To get Chapter"),
    MiddlewareValidator,
  ];
exports.updateChapterValidator = [
    check("id").isMongoId().withMessage("Id Not Vaild To Update Chapter"),
    MiddlewareValidator,
  ];
exports.deleteChapterValidator = [
    check("id").isMongoId().withMessage("Id Not Vaild To delete Chapter"),
    MiddlewareValidator,
  ];