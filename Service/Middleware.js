const expressAsyncHandler = require("express-async-handler");
const createCouresModel = require("../Modules/createCouress");
const createQuestionModel = require("../Modules/createQuestion");
const createQuizModel = require("../Modules/createQuiz");
const mongoose = require("mongoose");

exports.createMiddleware = expressAsyncHandler((req, res, next) => {
  if (!req.user.active) {
    return res.status(403).json({ msg: "تم حظرك من المنصة" });
  }
  if (req.user.role === "admin") {
    req.teacher = req.user.teacher;
  } else if (req.user.role === "teacher") {
    req.teacher = req.user._id;
  }
  return next();
});
exports.updateMiddleware = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    if (!req.user.active) {
      return res.status(403).json({ msg: "تم حظرك من المنصة" });
    }
    const { id } = req.params;
    const doc = await Model.findOne({ _id: id });

    if (!doc) {
      return res.status(404).json({ msg: "الوثيقة غير موجودة" });
    }
    const docTeacherId = doc.teacher?._id || doc.teacher;

    if (req.user.role === "admin") {
      if (!docTeacherId || req.user.teacher.toString() !== docTeacherId.toString()) {
        return res.status(403).json({ msg: "ليس لديك صلاحية وصول" });
      }
    } else if (req.user.role === "teacher") {
      // If the document has a teacher assigned, it must match the requesting teacher
      // If it doesn't (like many students), we allow the teacher to proceed if they have permission
      if (docTeacherId && req.user._id.toString() !== docTeacherId.toString()) {
        return res.status(403).json({ msg: "ليس لديك صلاحية وصول" });
      }
    }
    return next();
  });
exports.toggleTeacherStatus = expressAsyncHandler(async (req, res, next) => {
  try {
    console.log(req.params.id);

    const teacher = await createTeachersModel.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ msg: "المدرس غير موجود" });
    }

    const updatedTeacher = await createTeachersModel.findByIdAndUpdate(
      req.params.id,
      { active: !teacher.active },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ msg: "المدرس غير موجود" });
    }

    res.status(200).json({ msg: "تم تعديل حاله المدرس", updatedTeacher });
  } catch (error) {
    next(error);
  }
});

// exports.QuizMiddleWare = expressAsyncHandler(async (req, res, next) => {
//   try {
//     req.user.role === "user" ? (req.user = true) : (req.user = false);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });
exports.QuestionMiddleWare = expressAsyncHandler(async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role === "teacher" || role === "admin") {
      return next();
    }

    const qId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(qId)) {
      return res.status(400).json({ msg: "معرّف السؤال غير صالح" });
    }

    const quiz = await createQuizModel
      .findOne({ questions: { $in: [new mongoose.Types.ObjectId(qId)] } })
      .select("lacture lecture");

    if (!quiz) {
      return res.status(404).json({ msg: "السؤال غير موجود في أي كويز" });
    }

    const lectureId = quiz.lecture || quiz.lecture;
    if (!lectureId) {
      return res.status(404).json({ msg: "لا توجد محاضرة مرتبطة بهذا السؤال" });
    }

    const existsCourseItem = await createCouresModel.exists({
      user: req.user._id,
      "couresItems.lacture": lectureId,
    });

    if (!existsCourseItem) {
      return res.status(403).json({ msg: "ليس لديك صلاحية الوصول إلى السؤال" });
    }

    req.hasAccess = true;

    return next();
  } catch (err) {
    return next(err);
  }
});
exports.QuizMiddleWare = expressAsyncHandler(async (req, res, next) => {
  try {
    const quiz = await createQuizModel.findOne({ _id: req.params.id });
    if (!quiz) {
      return res.status(403).json({ msg: "الاختبار غير موجود" });
    }

    const lectureId = quiz.lecture || quiz.lecture;
    if (!lectureId) {
      return res.status(404).json({ msg: "لا توجد محاضرة مرتبطة بهذا السؤال" });
    }

    const existsCourseItem = await createCouresModel.exists({
      user: req.user._id,
      "couresItems.lacture": lectureId,
    });

    if (
      (!existsCourseItem && req.user.role === "user") ||
      (req.user.role === "user" && quiz.active === false)
    ) {
      return res
        .status(403)
        .json({ msg: "ليس لديك صلاحية الوصول إلى الاختبار" });
    }

    req.hasAccess = true;

    return next();
  } catch (err) {
    return next(err);
  }
});
exports.ResultMiddleWare = expressAsyncHandler(async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role === "teacher" || role === "admin") {
      return next();
    }

    const qId = req.params.question;

    if (!mongoose.Types.ObjectId.isValid(qId)) {
      return res.status(400).json({ msg: "معرّف السؤال غير صالح" });
    }

    const quiz = await createQuizModel
      .findOne({ questions: { $in: [new mongoose.Types.ObjectId(qId)] } })
      .select("lacture lecture");

    if (!quiz) {
      return res.status(404).json({ msg: "السؤال غير موجود في أي كويز" });
    }

    const lectureId = quiz.lecture || quiz.lecture;
    if (!lectureId) {
      return res.status(404).json({ msg: "لا توجد محاضرة مرتبطة بهذا السؤال" });
    }

    const existsCourseItem = await createCouresModel.exists({
      user: req.user._id,
      "couresItems.lacture": lectureId,
    });

    if (!existsCourseItem) {
      return res.status(403).json({ msg: "ليس لديك صلاحية الوصول إلى السؤال" });
    }

    req.hasAccess = true;

    return next();
  } catch (err) {
    return next(err);
  }
});
exports.QuizMiddleWareUpdate = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      req.params.id !== next();
    } catch (error) {
      next(error);
    }
  });
