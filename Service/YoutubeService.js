const factory = require("./FactoryHandler");
const createYoutubeModel = require("../Modules/createYoutube");
const expressAsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const createCouresModel = require("../Modules/createCouress");
const ApiError = require("../Resuble/ApiErrors");

exports.createYoutube = expressAsyncHandler(async (req, res) => {
  const { url, lecture } = req.body;

  try {
    const newYoutube = new createYoutubeModel({
      lecture,
      url,
      teacher: req.teacher,
    });

    await newYoutube.save();

    res.json({ msg: "تم اضافة فيديو بنجاح", data: newYoutube });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الفيديو" });
  }
});

exports.getYoutubeBySection = expressAsyncHandler(async (req, res) => {
  const { sectionId } = req.params;

  const videos = await createYoutubeModel.aggregate([
    {
      $lookup: {
        from: "lectures",
        localField: "lecture",
        foreignField: "_id",
        as: "lecture",
      },
    },
    { $unwind: "$lecture" },

    {
      $lookup: {
        from: "sections",
        localField: "lecture.section",
        foreignField: "_id",
        as: "section",
      },
    },
    { $unwind: "$section" },
    {
      $lookup: {
        from: "teachers",
        localField: "teacher",
        foreignField: "_id",
        as: "teacher",
      },
    },
    { $unwind: "$teacher" },
    {
      $match: {
        "section._id": new mongoose.Types.ObjectId(sectionId),
      },
    },
    {
      $project: {
        _id: 1,
        url: 1,
        createdAt: 1,
        section: "$section",
        lecture: "$lecture",
        teacher: "$teacher",
      },
    },
  ]);

  res.status(200).json({ data: videos });
});

exports.getYoutubeVideoLink = expressAsyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new ApiError("معرّف المحاضرة غير صالح", 400));
  }

  const lectureObjectId = new mongoose.Types.ObjectId(lectureId);

  const myCourses = await createCouresModel.findOne(
    {
      user: req.user.id,
      youtubeItems: { $elemMatch: { lacture: lectureObjectId } },
    },
    {
      "youtubeItems.$": 1,
    }
  );

  if (
    req.user.role === "user" &&
    (!myCourses || myCourses.youtubeItems.length === 0)
  ) {
    return next(new ApiError("لم يتم شراء المحاضرة", 404));
  }

  const link = await createYoutubeModel.find({
    lecture: lectureObjectId,
  });

  return res.status(200).json({ data: link });
});

exports.getYoutubes = factory.getAll(createYoutubeModel);
exports.getYoutube = factory.getOne(createYoutubeModel);
exports.updateYoutube = factory.updateOne(createYoutubeModel);
exports.deleteYoutube = factory.deleteOne(createYoutubeModel);
