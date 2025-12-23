const { check } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");

exports.UtilsValidator = [
  check("id").isMongoId().withMessage("المعرف غير موجود"),
  MiddlewareValidator,
];
