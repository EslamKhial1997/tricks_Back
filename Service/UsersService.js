const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");
const ApiError = require("../Resuble/ApiErrors");
const factory = require("./FactoryHandler");
const createUsersModel = require("../Modules/createUsers");
const createTransactionModel = require("../Modules/createtransaction");
const { UploadSingleImage } = require("../Middleware/UploadImageMiddleware");
const fs = require("fs");

exports.uploadImage = UploadSingleImage("image");
exports.fsRemove = async (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(" Faild Delete:", err);
    } else {
      console.log("Delete Is Success in local filesystem");
    }
  });
};

exports.createUsers = expressAsyncHandler(async (req, res) => {
  req.body.password = await bcrypt.hash(req.body.password, 12);
  req.body.role = "admin";
  req.body.teacher = req.user._id;
  const user = await createUsersModel.create(req.body);

  await user.save();
  res.status(200).json({
    status: "success",
    data: user,
  });
});

exports.getUsers = factory.getAll(createUsersModel, "Users");
exports.getUser = (model) => factory.getOne(model);
exports.deleteUser = factory.deleteOne(createUsersModel, "admin");

exports.updateLoggedUserPassword = (model) =>
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await model.findByIdAndUpdate(
        req.user._id,
        {
          password: await bcrypt.hash(req.body.password, 12),
        },
        {
          new: true,
        }
      );
      const token = jwt.sign({ userId: user._id }, process.env.DB_URL, {
        expiresIn: "365d",
      });
      user.passwordChangedAt = new Date(Date.now());
      await user.save();
      res.status(200).json({ data: user, token });
    } catch (error) {
      return next(new ApiError("البيانات غير موجودة"));
    }
  });
exports.updateUser = (model, path) => factory.updateOne(model, path);

exports.toggleAdminStatus = expressAsyncHandler(async (req, res, next) => {
  try {
    const admin = await createUsersModel.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: "الادمن غير موجود" });
    }
    if (admin.teacher.toString() !== req.user._id.toString()) {
      return res.status(404).json({ msg: "ليس لديك صلاحية علي الادمن" });
    }

    const updatedAdmin = await createUsersModel.findByIdAndUpdate(
      req.params.id,
      { active: !admin.active },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ msg: "المدرس غير موجود" });
    }

    res.status(200).json({ msg: "تم تعديل حاله الادمن", updatedAdmin });
  } catch (error) {
    next(error);
  }
});
exports.getUserAnalytics = expressAsyncHandler(async (req, res) => {
  let teacherId = req.user._id;
  let isManager = req.user.role === "manager";

  // If Manager wants to see specific teacher's analytics
  if (isManager && req.query.teacherId) {
    teacherId = req.query.teacherId;
    isManager = false; // Switch to "Teacher View" logic
  }

  // 1. Get unique students associated with this teacher via transactions (if not manager)
  let uniqueStudentIds = [];
  if (isManager) {
    uniqueStudentIds = await createUsersModel.distinct("_id", { role: "user" });
  } else {
    uniqueStudentIds = await createTransactionModel.distinct("user", {
      teacher: teacherId,
    });
  }

  // 2. Top Point Collectors (Students with most points)
  const topPoints = await createUsersModel
    .find({ _id: { $in: uniqueStudentIds }, role: "user" })
    .sort({ point: -1 })
    .limit(10)
    .select("name image email point");

  // 3. Top Governorates (Distribution by address)
  const governorateStats = await createUsersModel.aggregate([
    { $match: { _id: { $in: uniqueStudentIds }, role: "user" } },
    { $group: { _id: "$address", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // 4. Top Buyers (Students with most purchases)
  const buyerMatchStage = isManager
    ? { type: "lecture" }
    : { teacher: teacherId, type: "lecture" };

  const topBuyers = await createTransactionModel.aggregate([
    { $match: buyerMatchStage },
    { $group: { _id: "$user", purchaseCount: { $sum: 1 } } },
    { $sort: { purchaseCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userData",
      },
    },
    { $unwind: "$userData" },
    {
      $project: {
        purchaseCount: 1,
        name: "$userData.name",
        email: "$userData.email",
        image: "$userData.image",
      },
    },
  ]);

  // 5. Registration Growth (Monthly)
  const growth = await createUsersModel.aggregate([
    { $match: { _id: { $in: uniqueStudentIds }, role: "user" } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      topPoints,
      governorateStats,
      topBuyers,
      growth,
    },
  });
});
