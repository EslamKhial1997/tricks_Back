const expressAsyncHandler = require("express-async-handler");
const createQrCodeModel = require("../Modules/createQrCode");
const factory = require("./FactoryHandler");
const createLecturesModel = require("../Modules/createAlecture");
const createCouresModel = require("../Modules/createCouress");
const createTransactionModel = require("../Modules/createtransaction");
const createTeachersModel = require("../Modules/createTeacher");

exports.createCourseByQrCode = expressAsyncHandler(async (req, res, next) => {
  try {
    req.body.createdBy = req.user.name;
    req.body.teacher = req.teacher;

    const lactureModel = await createLecturesModel.findById(req.body.lecture);
    const teacher = await createTeachersModel.findById(req.teacher);
    const user = req.body.user;
    const qrCode = await createQrCodeModel.findOne({
      user,
      lecture: lactureModel,
      teacher: req.teacher,
    });

    if (!qrCode) {
      return res.status(400).json({
        status: "error",
        msg: "لم يتم تسجيل حضور هذا الطالب",
      });
    }
    let coures = await createCouresModel.findOne({ user: user });

    if (!coures) {
      coures = await createCouresModel.create({
        user,
        teacher: [],
        couresItems: [],
      });
    }

    const teacherId = lactureModel.teacher._id.toString();
    const teacherExists = coures.teacher.some(
      (teacher) => teacher.teacherID.toString() === teacherId
    );

    // إذا المدرس مش موجود، نضيفه
    if (!teacherExists) {
      coures.teacher.push({
        name: lactureModel.teacher.name,
        teacherID: lactureModel.teacher._id,
      });
    }

    // تحقق إذا كانت المحاضرة موجودة بالفعل في الكورس
    const lectureExistsIndex = coures.couresItems.findIndex(
      (item) => item.lacture._id.toString() === lactureModel._id.toString()
    );

    // لو المحاضرة مش موجودة، نضيفها
    if (lectureExistsIndex === -1) {
      coures.couresItems.push({
        lacture: lactureModel._id,
        teacherID: teacher._id,
      });
    }

    // لو المحاضرة موجودة، مش هنضيفها تاني
    else {
      return res.status(400).json({
        status: "Failure",
        msg: "المحاضرة موجودة بالفعل لهذا الطالب.",
      });
    }

    // حفظ الكورس بعد التعديل
    await coures.save();

    // إنشاء المعاملة
    await createTransactionModel.create({
      user: user,
      teacher: teacher._id,
      lecture: lactureModel._id,
      type: "qrcode",
    });

    // إرسال الرد
    res.status(200).json({
      data: {
        coures,
        qrCode,
      },
    });
  } catch (error) {
    next(error);
  }
});
exports.createQrCodeAttendance = expressAsyncHandler(async (req, res) => {
  req.body.teacher = req.teacher;
  req.body.createdBy = req.user.name;
  const existUser = await createQrCodeModel.findOne({
    user: req.body.user,
    lecture: req.body.lecture,
  });
  if (existUser) {
    return res.status(400).json({
      status: "Failure",
      msg: "تم تسجيل حضور الطالب من قبل",
    });
  }
  const createDoc = await createQrCodeModel.create(req.body);
  res.status(201).json({ data: createDoc });
});
exports.getQrCodes = factory.getAll(createQrCodeModel);
exports.getQrCode = factory.getOne(createQrCodeModel);
exports.getMyQrCode = expressAsyncHandler(async (req, res, next) => {
  let myDoc = await createQrCodeModel.findOne(
    req.user.role === "user" ? { user: req.user._id } : { teacher: req.teacher }
  );

  if (!myDoc)
    next(
      new ApiError(`Sorry Can't get This ID From ID :${req.params.id}`, 404)
    );
  res.status(200).json({ data: myDoc });
});
exports.updateQrCode = factory.updateOne(createQrCodeModel, "QrCode");
exports.deleteQrCode = factory.deleteOne(createQrCodeModel, "QrCode");
