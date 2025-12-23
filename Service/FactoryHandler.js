const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const ApiError = require("../Resuble/ApiErrors");
const FeatureApi = require("../Utils/Feature");
const path = require("path");

const { filePathImage } = require("../Utils/imagesHandler");
const createCouresModel = require("../Modules/createCouress");
const { default: rateLimit } = require("express-rate-limit");

exports.createOne = (Model) =>
  expressAsyncHandler(async (req, res) => {
    req.body.teacher = req.teacher;
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }
    if (req.body.passwordDB) {
      req.body.passwordDB = await bcrypt.hash(req.body.passwordDB, 12);
    }

    const createDoc = await Model.create(req.body);
    res.status(201).json({ data: createDoc });
  });
exports.getAll = (Model, keyword) =>
  expressAsyncHandler(async (req, res) => {
    let fillter = {};
    if (req.filterObject) {
      fillter = req.filterObject;
    }

    const countDocs = await Model.countDocuments();
    const ApiFeatures = new FeatureApi(Model.find(fillter), req.query)
      .Fillter(Model)
      .Sort()
      .Fields()
      .Search(keyword)
      .Paginate(countDocs);
    const { MongooseQueryApi, PaginateResult } = ApiFeatures;
    const getDoc = await MongooseQueryApi;
    res
      .status(201)
      .json({ results: getDoc.length, PaginateResult, data: getDoc });
  });

exports.getMyTransaction = (Model, keyword) =>
  expressAsyncHandler(async (req, res) => {
    let filter = {};
    if (req.filterObject) {
      filter = req.filterObject;
    }

    const countDocs = await Model.countDocuments();
    const ApiFeatures = new FeatureApi(
      Model.find({
        $or: [{ "sender.id": req.user._id }, { "receiver.id": req.user._id }],
      }),
      req.query
    )
      .Fillter(Model)
      .Sort()
      .Fields()
      .Search(keyword)
      .Paginate(countDocs);

    const { MongooseQueryApi, PaginateResult } = ApiFeatures;
    const getDoc = await MongooseQueryApi;

    // حساب مجموع النقاط باستخدام aggregate
    const totalPoints = await Model.aggregate([
      {
        $match: {
          $or: [{ "sender.id": req.user._id }, { "receiver.id": req.user._id }],
        },
      },
      { $group: { _id: null, total: { $sum: "$pointsSent" } } },
    ]);

    const total = totalPoints.length > 0 ? totalPoints[0].total : 0;

    res.status(201).json({
      results: getDoc.length,
      PaginateResult,
      data: getDoc,
      totalPoints: total, // إضافة مجموع النقاط إلى الاستجابة
    });
  });

exports.getOne = (Model, populateOpt) =>
  expressAsyncHandler(async (req, res, next) => {
    let query = Model.findById(req.params.id).select("-password");

    if (populateOpt) {
      query = query.populate(populateOpt);
    }
    const getDocById = await query;
    if (!getDocById)
      next(
        new ApiError(`Sorry Can't get This ID From ID :${req.params.id}`, 404)
      );
    res.status(200).json({ data: getDocById });
  });

exports.getOneCourse = (Model, populateOpt) =>
  expressAsyncHandler(async (req, res, next) => {
    let query = Model.findOne({ user: req.user.id });

    if (populateOpt) {
      query = query.populate(populateOpt);
    }

    const getDocById = await query;

    if (!getDocById) {
      return res.status(200).json({ data: null });
    }

    const expiredItems = getDocById.couresItems.filter(
      (item) => item.expires < Date.now()
    );

    if (
      !getDocById.couresItems &&
      getDocById.couresItems.length === 0 &&
      getDocById.youtubeItems & (getDocById.youtubeItems.length === 0)
    ) {
      await createCouresModel.findOneAndDelete({ user: req.user._id });
      return res.status(200).json({ data: getDocById });
    }

    if (expiredItems.length > 0) {
      const expiredIds = expiredItems.map((item) => item._id);

      const courseItem = await createCouresModel.findOneAndUpdate(
        { user: req.user._id },
        { $pull: { couresItems: { _id: { $in: expiredIds } } } },
        { new: true }
      );

      if (!courseItem) {
        return res.status(200).json({ message: "تم حذف الدورة بالكامل." });
      }

      return res.status(200).json({
        results: courseItem.couresItems.length,
        data: courseItem,
      });
    }

    res.status(200).json({
      results: getDocById.couresItems.length,
      data: getDocById,
    });
  });

exports.updateOne = (Model, filePath) =>
  expressAsyncHandler(async (req, res, next) => {
    try {
      const baseUrl = `${process.env.BASE_URL}/${filePath}/`;

      const findDocument = await Model.findById(req.params.id);

      if (!findDocument) {
        return next(
          new ApiError(
            `Sorry, can't find the document with ID: ${req.params.id}`,
            404
          )
        );
      }

      const imageKeys = ["image", "avater", "picture", "pdf"];

      for (const key of imageKeys) {
        if (req.body[key] !== undefined) {
          if (findDocument[key] && findDocument[key] !== req.body[key]) {
            const relativePathImage = findDocument[key].split(baseUrl)[1];
            filePathImage(filePath, relativePathImage);
          }
        }
      }

      const updateData = req.body;
      for (const key of imageKeys) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }

      const updateDocById = await Model.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updateDocById) {
        return next(
          new ApiError(
            `Sorry, can't update the document with ID: ${req.params.id}`,
            404
          )
        );
      }

      res.status(200).json({ data: updateDocById });
    } catch (error) {
      next(error);
    }
  });

exports.deleteOne = (Model, filePath) =>
  expressAsyncHandler(async (req, res, next) => {
    try {
      if (!req.user.active) {
        return res.status(403).json({ msg: "تم حظرك من المنصة" });
      }
      const baseUrl = `${process.env.BASE_URL}/${filePath}/`;
      const findDocument = await Model.findById(req.params.id);

      if (!findDocument) {
        return next(
          new ApiError(
            `Sorry, can't find the document with ID: ${req.params.id}`,
            404
          )
        );
      }
      await Model.findByIdAndDelete(req.params.id);

      const imageKeys = ["image", "avater", "picture", "pdf"];
      for (const key of imageKeys) {
        if (findDocument[key]) {
          const relativePathImage = findDocument[key].split(baseUrl)[1];
          filePathImage(filePath, relativePathImage); // حذف الصورة القديمة
        }
      }

      res.status(200).json({ status: "تم الحذف بنجاح" });
    } catch (error) {
      next(error);
    }
  });

exports.limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "لا يمكن تنفيذ الاجراء في الوقت الحالي حاول مرة اخري بعد 10 دقائق",
});
