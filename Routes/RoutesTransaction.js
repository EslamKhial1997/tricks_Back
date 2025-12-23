const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");
const {
  getBunnyData,
  getClassesDetails,
  getMyTransactions,
  getSalesAnalytics
} = require("../Service/TransactionService");

const Routes = Router();
Routes.use(protect);
Routes.route("/transaction/sales").get(
  allowedTo("teacher", "admin"),
  getMyTransactions
);
Routes.route("/transaction/bunny").get(allowedTo("teacher", "manager"), getBunnyData);
Routes.route("/transaction/class").get(
  allowedTo("teacher", "admin", "manager"),
  getClassesDetails
);

Routes.route("/transaction/analytic").get(
  allowedTo("teacher" , "manager"),
  getSalesAnalytics
);
module.exports = Routes;
