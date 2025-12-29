const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");
const {
  createQuiz,
  getQuizs,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getMyQuiz,
} = require("../Service/QuizService");
const {
  QuizMiddleWare,
  createMiddleware,
  updateMiddleware,
} = require("../Service/Middleware");
const createQuizModel = require("../Modules/createQuiz");

const Routes = Router();
Routes.use(protect);

Routes.route("/quiz/")
  .post(allowedTo("teacher", "admin"), createMiddleware, createQuiz)
  .get(QuizMiddleWare, getQuizs);

Routes.get(
  "/quiz/myquiz",
  allowedTo("teacher", "admin"),
  createMiddleware,
  getMyQuiz
);

Routes.route("/quiz/:id")
  .get(protect,QuizMiddleWare, getQuiz)
  .put(
    allowedTo("teacher", "admin"),
    updateMiddleware(createQuizModel),
    updateQuiz
  )
  .delete(
    allowedTo("teacher", "admin"),
    updateMiddleware(createQuizModel),
    deleteQuiz
  );


module.exports = Routes;
