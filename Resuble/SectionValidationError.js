const { check } = require("express-validator");
const { default: slugify } = require("slugify");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createClassModel = require("../Modules/createClasses");
const createTeachersModel = require("../Modules/createTeacher");

exports.createSectionsValidator = [
  check("name")
    .notEmpty()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    })
    .withMessage("Name Section is required"),
  check("teacher").custom((val, { req }) => {
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
  check("class")
    .notEmpty()
    .isMongoId()
    .withMessage("Class To Mongo is not Invalid ID")
    .custom(async (val, { req }) => {
      const classData = await createClassModel.findOne({ _id: val });

      if (!classData) {
        return Promise.reject(new Error("Sorry, Class is not available"));
      }

      if (req.user.role === "admin") {
        if (req.user.teacher.toString() !== classData.teacher._id.toString()) {
          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء فصل لهذا المدرس")
          );
        }
      } else if (req.user.role === "teacher") {
        if (req.user._id.toString() !== classData.teacher._id.toString()) {
          console.log(req.user._id.toString(), classData.teacher.toString());

          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء فصل لهذا المدرس")
          );
        }
      }

      return true;
    }),

  MiddlewareValidator,
];
exports.getSectionValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To get Section"),
  MiddlewareValidator,
];
exports.updateSectionValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To update Section"),
  MiddlewareValidator,
];
exports.deleteSectionValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To delete Section"),
  MiddlewareValidator,
];
