const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
} = require("../Service/GroupService");
const { createMiddleware } = require("../Service/Middleware");

const Routes = Router();
Routes.use(protect);
Routes.route("/group/").post(allowedTo("teacher"), createGroup).get(getGroups);
Routes.route("/group/:id")
  .get(getGroups)
  .put(createMiddleware, updateGroup)
  .delete(createMiddleware, deleteGroup);

module.exports = Routes;
