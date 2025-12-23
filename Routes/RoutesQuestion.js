const { Router } = require("express");
const { uploadImage, resizeImage } = require("../Utils/imagesHandler");

const { protect, allowedTo } = require("../Service/AuthService");
const {
  createQuiz,
  getQuizs,
  getQuiz,
  updateQuiz,
  deleteQuiz,
} = require("../Service/QuizService");
const {
  createQuestion,
  // getQuestions,
  getQuestion,
  deleteQuestion,
  updateQuestion,
} = require("../Service/QuestionService");
const {
  QuizMiddleWare,
  createMiddleware,
  updateMiddleware,
  QuestionMiddleWare,
} = require("../Service/Middleware");
const createQuestionModel = require("../Modules/createQuestion");

const Routes = Router();
Routes.use(protect);

Routes.route("/question/")
  .post(
    allowedTo("teacher", "admin"),
    uploadImage,
    resizeImage("/question"),
    createMiddleware,
    createQuestion
  )
  // .get(allowedTo("teacher", "admin"), QuizMiddleWare, getQuestions);
Routes.route("/question/:id")
  .get(allowedTo("teacher", "admin", "user"), QuestionMiddleWare, getQuestion)
  .put(
    uploadImage,
    resizeImage("/question"),
    updateMiddleware(createQuestionModel),
    updateQuestion
  )
  .delete(
    allowedTo("teacher", "admin"),
    updateMiddleware(createQuestionModel),
    deleteQuestion
  );

module.exports = Routes;
