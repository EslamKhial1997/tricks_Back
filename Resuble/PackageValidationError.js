const { check } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");

exports.createPackageValidator = [
  check("libraryID").notEmpty().withMessage("معرف المكتبة مطلوب"),
  check("apiKey").notEmpty().withMessage("معرف المفتاح مطلوب"),
  check("teacher").notEmpty().withMessage("معرف المدرس مطلوب"),

  MiddlewareValidator,
];
