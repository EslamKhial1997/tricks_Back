const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createTeachersModel = require("../Modules/createTeacher");

exports.createClassValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name Class is required")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  
  body("teacher")
    .custom((val, { req }) => {
      const teacherId = req.teacher; 
      if (!teacherId) {
        throw new Error("Must be Teacher Id");
      }
      return createTeachersModel.findOne({ _id: teacherId }).then((teacher) => {
        if (!teacher) {
          return Promise.reject(new Error("Sorry, Teacher is not available"));
        }
      });
    }),

  MiddlewareValidator,
];

exports.getClassValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To get Class"),
  MiddlewareValidator,
];
exports.updateClassValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To update Class"),
  MiddlewareValidator,
];
exports.deleteClassValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To delete Class"),
  MiddlewareValidator,
];
