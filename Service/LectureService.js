const factory = require("./FactoryHandler");
const axios = require("axios");
const createLecturesModel = require("../Modules/createAlecture");
const expressAsyncHandler = require("express-async-handler");
const createCouresModel = require("../Modules/createCouress");
const createPackageModel = require("../Modules/createPackage");
const ApiError = require("../Resuble/ApiErrors");
const crypto = require("crypto");
const FeatureApi = require("../Utils/Feature");
const createQuizModel = require("../Modules/createQuiz");
exports.resizeImage = expressAsyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.pdf = req.file.filename;
  }

  next();
});

exports.createLectures = expressAsyncHandler(async (req, res) => {
  const { lectureId, lecture, price, section, description } = req.body;

  if (lectureId) {
    const lectureDoc = await createLecturesModel.findById(lectureId);
    if (!lectureDoc) return res.status(404).json({ msg: "محاضرة غير موجودة" });

    // يمكن تعديل معلومات المحاضرة هنا إذا لزم الأمر
    return res.status(200).json({
      msg: "تم العثور على المحاضرة",
      data: lectureDoc,
    });
  }

  const newLecture = await createLecturesModel.create({
    lecture,
    price: price || 0,
    section,
    teacher: req.teacher,
    description: description || null,
  });

  // await createSectionModel.findByIdAndUpdate(section, {
  //   $addToSet: { lecture: newLecture._id },
  // });

  res.status(201).json({ data: newLecture });
});

exports.getLectures = expressAsyncHandler(async (req, res) => {
  let fillter = {};
  if (req.filterObject) {
    fillter = req.filterObject;
  }

  const countDocs = await createLecturesModel.countDocuments();
  const ApiFeatures = new FeatureApi(
    createLecturesModel.find(fillter),
    req.query
  )
    .Fillter(createLecturesModel)
    .Sort()
    .Fields()
    .Search()
    .Paginate(countDocs);

  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  let getDoc = await MongooseQueryApi;

  if (!req.user || req.user.role === "user") {
    getDoc = getDoc.map((lecture) => {
      if (Array.isArray(lecture.media)) {
        lecture.media = lecture.media
          .filter(
            (item) => !(item.type === "exam" && item?.quizId?.active === false)
          )
          .map((item) => {
            if (item.type === "youtube") {
              return { ...item, linkYoutube: null };
            }
            return item;
          });
      }
      return lecture;
    });
  }

  res
    .status(201)
    .json({ results: getDoc.length, PaginateResult, data: getDoc });
});

exports.getLecture = expressAsyncHandler(async (req, res, next) => {
  let getDocById = await createLecturesModel.findById(req.params.id);
  if (req.user && req.user.role === "user") {
    if (Array.isArray(getDocById.media)) {
      getDocById.media = getDocById.media.filter((item) => {
        return !(
          item.type === "exam" &&
          item.quizId &&
          item.quizId.active === false
        );
      });
    }
  }

  res.status(200).json({ data: getDocById });
});

exports.updateLecture = factory.updateOne(createLecturesModel, "lecture");

exports.deleteLecture = factory.deleteOne(createLecturesModel, "lecture");

exports.deleteVideo = expressAsyncHandler(async (req, res, next) => {
  const findDocument = await createLecturesModel.findById(req.params.id);
  const package = await createPackageModel.findOne({
    teacher: req.user.role === "admin" ? req.user.teacher._id : req.user._id,
  });
  if (!findDocument || !package) {
    return next(new ApiError("لايمكن حذف الفيديو", 403));
  }
  try {
    await axios
      .delete(
        `https://video.bunnycdn.com/library/${package.libraryID}/videos/${findDocument.bunny.guid}`,
        {
          headers: {
            accept: "application/json",
            AccessKey: package.apiKey,
          },
        }
      )
      .then(async (res) => {
        await createLecturesModel.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              "bunny.guid": "",
              video: false,
            },
          },
          { new: true }
        );
      });
    res.status(200).json({ status: " Success", msg: "تم حذف الفيديو بنجاح" });
  } catch (error) {
    return next(new ApiError("خطأ في سيرفر الفيديوهات أثناء الحذف", 500));
  }
});
exports.getVideo = expressAsyncHandler(async (req, res, next) => {
  const lectureId = req.params.id;
  const mediaId = req.params.mediaId;

  const findDocument = await createLecturesModel.findById(lectureId);
  if (!findDocument) {
    return next(new ApiError("لم يتم العثور علي المحاضرة", 404));
  }

  const mediaItem = findDocument.media.find(
    (item) => item._id.toString() === mediaId
  );
  if (!mediaItem) {
    return next(new ApiError("لم يتم العثور علي الفيديو داخل media", 404));
  }

  const package = await createPackageModel.findOne({
    teacher: findDocument.teacher._id,
  });

  // ✅ إذا كان المدرس، يرجع مباشرة
  if (req.user.role === "teacher") {
    if (mediaItem.type == "external") {
      const generateSignedUrl = (baseUrl, securityKey, expirationTime) => {
        const expires = Math.floor(Date.now() / 1000) + expirationTime;
        const urlObject = new URL(baseUrl);
        const path = urlObject.pathname;

        const hash = crypto
          .createHmac("sha256", securityKey)
          .update(`${path}${expires}`)
          .digest("hex");

        return `${baseUrl}?token=${expires}_${hash}`;
      };

      const urlPath = `https://${package.hostname}/${mediaItem.idVideo}/playlist.m3u8`;
      const signedUrl = generateSignedUrl(urlPath, package.apiKey, 3600);

      return res.status(200).json({
        status: "Success",
        data: mediaItem,
        signedUrl,
      });
    } else {
      return res.status(200).json({
        status: "Success",
        data: mediaItem,
      });
    }
  }

  // ✅ باقي الشروط فقط للمستخدم العادي
  const myCourse = await createCouresModel.findOne({
    user: req.user.id,
    "couresItems.lacture": lectureId,
  });

  if (!myCourse || myCourse.couresItems.length === 0) {
    return next(new ApiError("لم يتم شراء المحاضرة", 404));
  }

  const courseItem = myCourse.couresItems.find(
    (item) => item.lacture._id.toString() === lectureId
  );

  if (!courseItem) {
    return next(new ApiError("لم يتم العثور على العنصر داخل الكورس", 404));
  }

  const seenEntry = courseItem.seenItem.find(
    (entry) => entry.type.toString() === mediaId
  );

  if (seenEntry) {
    if (seenEntry.count === 0) {
      return next(new ApiError("تجاوزت الحد الأقصى للمشاهدات", 403));
    }
  } else {
    await createCouresModel.findOneAndUpdate(
      {
        user: req.user.id,
        "couresItems.lacture": lectureId,
      },
      {
        $addToSet: {
          "couresItems.$.seenItem": {
            type: mediaItem._id,
            count: mediaItem.seen || 5,
            videoTime: mediaItem.duration,
            duration: 0,
          },
        },
      }
    );
  }

  // ✅ في النهاية، أرجع الرابط للمستخدم العادي
  try {
    if (mediaItem.type == "external") {
      const generateSignedUrl = (baseUrl, securityKey, expirationTime) => {
        const expires = Math.floor(Date.now() / 1000) + expirationTime;
        const urlObject = new URL(baseUrl);
        const path = urlObject.pathname;

        const hash = crypto
          .createHmac("sha256", securityKey)
          .update(`${path}${expires}`)
          .digest("hex");

        return `${baseUrl}?token=${expires}_${hash}`;
      };

      const urlPath = `https://${package.hostname}/${mediaItem.idVideo}/playlist.m3u8`;
      const signedUrl = generateSignedUrl(urlPath, package.apiKey, 3600);

      res.status(200).json({
        status: "Success",
        data: mediaItem,
        signedUrl,
      });
    } else {
      res.status(200).json({
        status: "Success",
        data: mediaItem,
      });
    }
  } catch (error) {
    return next(new ApiError("خطأ في سيرفر الفيديوهات", 500));
  }
});

function validateAndBuildMediaItem({
  type,
  pdf,
  linkYoutube,
  duration,
  idVideo,
  quizId,
  isEdit = false, // <-- هل العملية تعديل؟
}) {
  if (!type || !["pdf", "youtube", "external", "exam"].includes(type)) {
    return null;
  }

  if (type === "pdf") {
    if (!pdf) return null;
    return { type, pdf };
  }

  if (type === "youtube") {
    const numericDuration = Number(duration);
    if (!linkYoutube || isNaN(numericDuration)) return null;
    return { type, linkYoutube, duration: numericDuration };
  }

  if (type === "external") {
    if (!idVideo) return null;

    const mediaItem = { type, idVideo };

    if (isEdit) {
      const numericDuration = Number(duration);
      if (!duration || isNaN(numericDuration)) return null;
      mediaItem.duration = numericDuration;
      mediaItem.video = true; // في التعديل فقط
    } else {
      mediaItem.video = false; // في الإنشاء فقط
    }

    return mediaItem;
  }

  if (type === "exam") {
    if (!quizId) return null;
    return { type, quizId };
  }

  return null;
}

exports.pushMediaItem = expressAsyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;
  const { name, type, pdf, linkYoutube, duration, idVideo, quizId } = req.body;

  if (!name) {
    return res.status(404).json({ message: "اسم المحاضرة مطلوب" });
  }

  const lecture = await createLecturesModel.findById(lectureId);
  if (!lecture) {
    return res.status(404).json({ message: "المحاضرة غير موجودة" });
  }

  const newItem = validateAndBuildMediaItem({
    type,
    pdf,
    linkYoutube,
    duration,
    idVideo,
    quizId,
  });

  if (!newItem) {
    return res
      .status(400)
      .json({ message: "البيانات غير صحيحة أو غير مكتملة حسب النوع" });
  }

  newItem.name = name;

  lecture.media.push(newItem);
  await lecture.save();

  const lastItem = lecture.media[lecture.media.length - 1];

  res.status(200).json({
    message: "تمت إضافة العنصر إلى media بنجاح",
    currentMediaCount: lecture.media.length,
    data: lastItem,
  });
});

exports.deleteMediaItem = expressAsyncHandler(async (req, res, next) => {
  const { id, mediaId } = req.params;

  const lecture = await createLecturesModel.findById(id);
  if (!lecture) {
    return res.status(404).json({ message: "المحاضرة غير موجودة" });
  }

  const mediaItem = lecture.media.find(
    (item) => item._id.toString() === mediaId
  );

  if (!mediaItem) {
    return res.status(404).json({ message: "العنصر غير موجود في media" });
  }

  if (mediaItem.type === "external") {
    const package = await createPackageModel.findOne({
      teacher: req.user.role === "admin" ? req.user.teacher._id : req.user._id,
    });
    if (!package) {
      return next(new ApiError("لايمكن حذف الفيديو", 403));
    }

    try {
      await axios.delete(
        `https://video.bunnycdn.com/library/${package.libraryID}/videos/${mediaItem.idVideo}`,
        {
          headers: {
            accept: "application/json",
            AccessKey: package.apiKey,
          },
        }
      );

      res.status(200).json({ status: " Success", msg: "تم حذف الفيديو بنجاح" });
    } catch (error) {
      return next(new ApiError("خطأ في سيرفر الفيديوهات أثناء الحذف", 500));
    }
  }
  if (mediaItem.type === "exam") {
    const quiz = await createQuizModel.findOneAndDelete({
      _id: mediaItem.quizId._id,
    });
    if (!quiz) {
      return next(new ApiError("لايمكن حذف الاختبار", 404));
    }
  }

  // احذف العنصر من المصفوفة
  lecture.media = lecture.media.filter(
    (item) => item._id.toString() !== mediaId
  );

  await lecture.save();

  res.status(200).json({
    message: "تم حذف العنصر من media بنجاح",
    currentMediaCount: lecture.media.length,
  });
});

exports.updateMediaItem = expressAsyncHandler(async (req, res) => {
  const { id, mediaId } = req.params;

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([, v]) => v !== undefined && v !== null)
  );

  const lecture = await createLecturesModel.findById(id);
  if (!lecture) {
    return res.status(404).json({ message: "المحاضرة غير موجودة" });
  }

  const mediaItem = lecture.media.id(mediaId);
  if (!mediaItem) {
    return res.status(404).json({ message: "العنصر غير موجود في media" });
  }

  Object.keys(updates).forEach((key) => {
    mediaItem.set(key, updates[key]);
  });

  await lecture.save();

  return res.status(200).json({
    message: "تم تعديل العنصر بنجاح",
    data: mediaItem,
  });
});
