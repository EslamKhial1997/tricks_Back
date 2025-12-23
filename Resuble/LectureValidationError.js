const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");

const createSectionModel = require("../Modules/createSection");
const createTeachersModel = require("../Modules/createTeacher");

exports.createLectureValidator = [
  check("lecture")
    .if((value, { req }) => !req.body.lectureId)
    .notEmpty()
    .withMessage("معرف المحاضرة مطلوب")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("teacher").custom(async (val, { req }) => {
    const teacherData = await createTeachersModel.findOne({ _id: req.teacher });

    if (!teacherData) {
      return Promise.reject(new Error("المدرس غير موجود"));
    }

    if (req.user.role === "admin") {
      if (req.user.teacher.toString() !== teacherData._id.toString()) {
        return Promise.reject(
          new Error("ليس لديك صلاحية إنشاء محاضرة لهذا المدرس")
        );
      }
    } else if (req.user.role === "teacher") {
      if (req.user._id.toString() !== teacherData._id.toString()) {
        return Promise.reject(
          new Error("ليس لديك صلاحية إنشاء محاضرة لهذا المدرس")
        );
      }
    }

    return true;
  }),

  check("section")
    .if((value, { req }) => !req.body.lectureId)
    .notEmpty()
    .withMessage("معرف الفصل مطلوب")
    .custom(async (val, { req }) => {
      const SectionData = await createSectionModel.findOne({ _id: val });

      if (!SectionData) {
        return Promise.reject(new Error("الفصل غير موجود"));
      }

      if (req.user.role === "admin") {
        if (
          req.user.teacher.toString() !== SectionData.teacher._id.toString()
        ) {
          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء محاضرة لهذا المدرس")
          );
        }
      } else if (req.user.role === "teacher") {
        if (req.user._id.toString() !== SectionData.teacher._id.toString()) {
          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء محاضرة لهذا المدرس")
          );
        }
      }

      return true;
    }),

  MiddlewareValidator,
];

exports.getLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To get Lecture"),
  MiddlewareValidator,
];
exports.updateLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To update Lecture"),
  MiddlewareValidator,
];
exports.deleteLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To delete Lecture"),
  MiddlewareValidator,
];
