const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createResults,
  getMyResults,
  updateResult,
  getResultss,
  finishResults,
  startQuiz,
  getResultsQuiz,
} = require("../Service/ResultsService");
const { ResultMiddleWare } = require("../Service/Middleware");

const Routes = Router();
Routes.use(protect);

Routes.route("/results/quiz/:id/question/:question").post(
  allowedTo("user"),
  ResultMiddleWare,
  createResults
);
Routes.post("/results/:id/finish", finishResults);
Routes.get(
  "/results/myresults",
  allowedTo("user" , "teacher", "admin" , "manager"),
  (req, res, next) => {
    if (req.user.role === "user") {
      req.filterObject = { user: req.user._id };
    }
    next();
  },
  getMyResults
);
Routes.get("/results", allowedTo("teacher", "admin"), getResultss);
Routes.get(
  "/results/:quizId",
  allowedTo("user", "teacher", "admin"),
  getResultsQuiz
);
Routes.post("/results/:id/start", allowedTo("user"), startQuiz);
Routes.route("/results/quiz/:id/question/:question").put(
  protect,
  allowedTo("user"),
  updateResult
);
module.exports = Routes;
