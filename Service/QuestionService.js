const expressAsyncHandler = require("express-async-handler");
const createQuestionModel = require("../Modules/createQuestion");
const factory = require("./FactoryHandlerQuiz");
const createQuizModel = require("../Modules/createQuiz");
const FeatureApi = require("../Utils/Feature");

exports.createQuestion = expressAsyncHandler(async (req, res) => {
  req.body.teacher = req.teacher;
  const question = await createQuestionModel.create(req.body);
  const quiz = await createQuizModel.findById(req.body.quiz);
  if (!quiz) {
    return res.status(404).json({ message: "Quiz غير موجود" });
  }
  quiz.questions.push(question._id);
  await quiz.save();
  res.status(201).json({
    message: "تم إنشاء السؤال بنجاح وربطه بالكويز",
    data: question,
  });
});

// exports.getQuestions = expressAsyncHandler(async (req, res) => {
//   let fillter = {};
//   if (req.filterObject) {
//     fillter = req.filterObject;
//   }
//   const countDocs = await createQuestionModel.countDocuments();
//   const ApiFeatures = new FeatureApi(
//     createQuestionModel
//       .find(fillter)
//       .populate({ path: "teacher", select: "name" }),
//     req.query
//   )
//     .Fillter(createQuestionModel)
//     .Sort()
//     .Fields()
//     .Search()
//     .Paginate(countDocs);

//   const { MongooseQueryApi, PaginateResult } = ApiFeatures;
//   const getDoc = await MongooseQueryApi;

//   let data = getDoc;

//   if (req.user) {
//     data = getDoc.map((doc) => {
//       const { correctAnswer, correctText, ...rest } = doc.toObject();
//       return rest;
//     });
//   }

//   res.status(201).json({
//     results: data.length,
//     PaginateResult,
//     data,
//   });
// });

exports.getQuestion = expressAsyncHandler(async (req, res, next) => {
  const question = await createQuestionModel
    .findById(req.params.id)
    .select(
      req.user.role === "user" ? { correctAnswer: 0, correctText: 0 } : {}
    );

  if (!question)
    next(
      new ApiError(`Sorry Can't get This ID From ID :${req.params.id}`, 404)
    );
  res.status(200).json({ data: question });
});
exports.updateQuestion = factory.updateOne(createQuestionModel, "Question");
exports.deleteQuestion = factory.deleteOne(createQuestionModel, "Question");
