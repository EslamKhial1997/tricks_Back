const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const os = require("os");

const ApiError = require("../Resuble/ApiErrors");
const sendCode = require("../Utils/SendCodeEmail");
const createUsersModel = require("../Modules/createUsers");
const createTeachersModel = require("../Modules/createTeacher");
const sendVerificationEmail = require("../Utils/SendCodeEmail");
exports.createFirstManagerAccount = async () => {
  const existingManager = await createUsersModel.findOne({
    email: "manager@gmail.com",
  });
  if (existingManager) {
    console.log("Manager account already exists");
    return;
  }

  const manager = await createUsersModel.create({
    name: "manager",
    email: "manager@gmail.com",
    phone: "01000000000",
    active: true,
    role: "manager",
    password: await bcrypt.hash("123456789", 12),
    confirmPassword: await bcrypt.hash("123456789", 12),
  });

  console.log("Manager account created successfully");
};

exports.getLoggedUserData = expressAsyncHandler(async (req, res, next) => {  
  req.params.id = req.user._id;
  next();
});
exports.SingUp = expressAsyncHandler(async (req, res) => {
  req.body.password = await bcrypt.hash(req.body.password, 12);
  const user = await createUsersModel.create(req.body);

  try {
    const token = jwt.sign({ userId: user._id }, process.env.DB_URL, {
      expiresIn: "360d",
    });
    await user.save();
    res.status(200).json({
      status: "success",
      token,
    });
  } catch (error) {
    return next(new ApiError("Somthing failed"));
  }
});

exports.Login = expressAsyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await createUsersModel.findOne({
      $or: [{ email }, { phone: email }],
    });

    let teacher = await createTeachersModel.findOne({
      $or: [{ email }, { phone: email }],
    });

    if (user?.password) {
      if (await bcrypt.compare(password, user.password)) {
        const accessToken = jwt.sign({ userId: user._id }, process.env.DB_URL, {
          expiresIn: "365d",
        });

        return res.status(200).json({
          token: accessToken,
          data: user,
        });
      } else {
        return res.status(403).json({
          status: "Error",
          msg: "اسم المستخدم او كلمة السر خطأ",
        });
      }
    }
    if (teacher?.password) {
      if (await bcrypt.compare(password, teacher.password)) {
        const accessToken = jwt.sign(
          { userId: teacher._id },
          process.env.DB_URL,
          {
            expiresIn: "365d",
          }
        );

        return res.status(200).json({
          token: accessToken,
          data: teacher,
        });
      } else {
        // إذا كانت كلمة المرور غير صحيحة
        return res.status(403).json({
          status: "Error",
          msg: "اسم المستخدم او كلمة السر خطأ",
        });
      }
    }

    // إذا لم يتم العثور على المستخدم أو المعلم
    return res.status(403).json({
      status: "Error",
      msg: "يمكنك تسجيل الدخول عن طريق جوجل فقط",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      msg: "حدث خطأ في السيرفر",
    });
  }
});
exports.allowedTo = (...roles) =>
  expressAsyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        res.status(403).json({
          status: "Error",
          massage: "ليس لديك صلاحيه الوصول",
        })
      );
    }
    next();
  });

exports.protect = expressAsyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else {
    return res.status(401).json({
      statusCode: "Error",
      msg: "لم يتم توفير رمز التفويض",
    });
  }

  try {
    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, process.env.DB_URL);

    if (!decoded) {
      return res.status(401).json({
        statusCode: "Error",
        msg: "الرمز غير صالح. يرجى تسجيل الدخول مرة أخرى.",
      });
    }

    // العثور على المستخدم بناءً على الـID المستخرج من التوكن
    const currentUser =
      (await createUsersModel.findById(decoded.userId)) ||
      (await createTeachersModel.findById(decoded.userId));

    if (!currentUser) {
      return res.status(401).json({
        statusCode: "Error",
        msg: "المستخدم غير موجود",
      });
    }

    // التحقق مما إذا قام المستخدم بتغيير كلمة المرور بعد إصدار التوكن
    if (currentUser.passwordChangedAt) {
      const passChangedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );
      if (passChangedTimestamp > decoded.iat) {
        return res.status(401).json({
          statusCode: "Error",
          msg: "لقد قمت بتغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى.",
        });
      }
    }

    // تحديد الدور وتعيين النموذج المناسب
    if (
      currentUser.role === "user" ||
      currentUser.role === "admin" ||
      currentUser.role === "manager"
    ) {
      req.model = createUsersModel;
    } else if (currentUser.role === "teacher") {
      req.model = createTeachersModel;
    } else {
      return res.status(403).json({
        statusCode: "Error",
        msg: "تم رفض الوصول. ليس لديك الإذن للقيام بهذا الإجراء.",
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    // التحقق من نوع الخطأ وتخصيص الرسالة
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        statusCode: "Error",
        msg: "التوكن غير صحيح",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        statusCode: "Error",
        msg: "التوكن منتهي الصلاحيه",
      });
    } else {
      return res.status(500).json({
        statusCode: "Error",
        msg: "حدث خطأ داخلي في الخادم.",
      });
    }
  }
});

exports.resendCodeVerify = expressAsyncHandler(async (req, res, next) => {
  const email = req.user.email;
  const user = await createUsersModel.findOne({ email: email });
  if (!user) {
    return next(new ApiError(`This Email ${email} Not Exist `));
  }
  const digitCode = Math.floor(100000 + Math.random() * 900000).toString();
  const ciphertext = crypto
    .createHash("sha256")
    .update(digitCode)
    .digest("hex");

  user.code = ciphertext;
  user.codeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendCode(
    user.email,
    digitCode,
    "لقد تلقينا طلبًا لإعادة تعيين كلمة المرور على حساب المنصة التعليمية ابداع اكاديمي ."
  );
  res.status(200).json({ status: "success", msg: "تم إرسال الرمز  بنجاح" });
});
exports.forgetPassword = expressAsyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const [user, teacher] = await Promise.all([
    createUsersModel.findOne({ email }),
    createTeachersModel.findOne({ email }),
  ]);

  const target = user || teacher;
  if (!target) {
    return next(new ApiError(`البريد الإلكتروني ${email} غير موجود.`, 404));
  }

  const tokenVerify = crypto.randomBytes(32).toString("hex");
  target.verificationToken = tokenVerify;
  await target.save();

  try {
    await sendVerificationEmail(target.email, tokenVerify, target.name);
    res.status(200).json({ status: "success", msg: "تم إرسال الرمز بنجاح" });
  } catch (error) {
    return next(new ApiError("حدث خطأ أثناء إرسال البريد الإلكتروني", 500));
  }
});

exports.restCodeSent = expressAsyncHandler(async (req, res, next) => {
  const restcode = req.body.code.toString();
  const ciphertext = crypto.createHash("sha256").update(restcode).digest("hex");

  // البحث عن المستخدم أو المعلم بناءً على الكود المشفر وتحقق من صلاحية الكود
  const user = await createUsersModel.findOne({
    code: ciphertext,
    codeExpires: { $gt: Date.now() },
  });

  const teacher = await createTeachersModel.findOne({
    code: ciphertext,
    codeExpires: { $gt: Date.now() },
  });
  console.log(teacher);

  if (!user && !teacher) {
    return res
      .status(400)
      .json({ status: "error", msg: "الكود غير صالح اومنتهي الصلاحيه " });
  }

  // تحديث حالة التحقق للمستخدم أو المعلم
  if (user) {
    user.userVerify = true;
    await user.save();
  }

  if (teacher) {
    teacher.teacherVerify = true; // يمكنك تعديل اسم الحقل حسب نموذج المعلم
    await teacher.save();
  }

  res.status(200).json({ status: "success", msg: "تم التحقق من الكود" });
});
exports.restNewPassword = (UserPassword) =>
  expressAsyncHandler(async (req, res, next) => {
    const { setNewPassword } = req.body;
    const { id } = req.params;

    const user = await createUsersModel.findOne({ verificationToken: id });

    const teacher = await createTeachersModel.findOne({
      verificationToken: id,
    });

    if (!user && !teacher) {
      return next(new ApiError(`لايوجد ايميل بهذا الاسم`, 404));
    }

    const target = user || teacher;
    // 3) تحديث كلمة المرور إذا كانت العملية تتعلق بكلمة المرور
    if (UserPassword === "password") {
      target.password = await bcrypt.hash(setNewPassword, 12);
    }
    target.verificationToken = undefined;
    await target.save();
    return res.redirect("/login");
  });
