const expressAsyncHandler = require("express-async-handler");
const createQuizModel = require("../Modules/createQuiz");
const factory = require("./FactoryHandlerQuiz");
const FeatureApi = require("../Utils/Feature");
const createLecturesModel = require("../Modules/createAlecture");
const ApiError = require("../Resuble/ApiErrors");

exports.createQuiz = expressAsyncHandler(async (req, res) => {
  req.body.teacher = req.teacher;

  const createDoc = await createQuizModel.create(req.body);
  const lecture = await createLecturesModel.findById(createDoc.lecture);
  if (!lecture) {
    return res.status(404).json({ message: "المحاضرة غير موجودة" });
  }
  lecture.media.push({
    quizId: createDoc._id,
    name: createDoc.text,
    type: "exam",
  });
  lecture.save();
  res.status(201).json({ data: createDoc });
});
exports.getMyQuiz = expressAsyncHandler(async (req, res) => {
  let fillter = { teacher: req.user._id };

  const countDocs = await createQuizModel.countDocuments(fillter);
  const ApiFeatures = new FeatureApi(createQuizModel.find(fillter), req.query)
    .Fillter(createQuizModel)
    .Sort()
    .Fields()
    .Search()
    .Paginate(countDocs);
  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  const getDoc = await MongooseQueryApi;
  res
    .status(200)
    .json({ results: getDoc.length, PaginateResult, data: getDoc });
});
exports.getQuizs = expressAsyncHandler(async (req, res) => {
  let fillter = req.user ? { status: true } : {};

  if (req.filterObject) {
    fillter = { ...fillter, ...req.filterObject };
  }

  const populateOptions = req.user
    ? {
        path: "questions",
        select: "-correctAnswer -correctText -quiz",
      }
    : {
        path: "questions",
        select: { quiz: 0 },
      };
  const countDocs = await createQuizModel.countDocuments();
  const ApiFeatures = new FeatureApi(
    createQuizModel.find(fillter).populate(populateOptions),
    req.query
  )
    .Fillter(createQuizModel)
    .Sort()
    .Fields()
    .Search()
    .Paginate(countDocs);
  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  const getDoc = await MongooseQueryApi;
  res
    .status(201)
    .json({ results: getDoc.length, PaginateResult, data: getDoc });
});
exports.getQuiz = expressAsyncHandler(async (req, res, next) => {
  let query = createQuizModel.findById(req.params.id).populate(
    req.user.role === "user"
      ? {
          path: "questions",
          select: { correctAnswer: 0, correctText: 0 },
        }
      : "questions",
    {
      path: "lecture",
      select: "name",
    }
  );

  const getDocById = await query;

  res.status(200).json({ data: getDocById });
});
exports.updateQuiz = factory.updateOne(createQuizModel, "Quiz");
exports.deleteQuiz = factory.deleteOne(createQuizModel, "Quiz");
