const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
} = require("../Service/GroupService");
const { createMiddleware } = require("../Service/Middleware");

const Routes = Router();
Routes.use(protect);
Routes.route("/group/").post(allowedTo("teacher"), createGroup).get(getGroups);
Routes.route("/group/:id")
  .get(getGroup)
  .put(createMiddleware, updateGroup)
  .delete(createMiddleware, deleteGroup);

const {
  requestToJoin,
  handleJoinRequest,
  joinByInvite,
  manageMember,
  generateInviteCode,
} = require("../Service/GroupService");

Routes.post("/group/join-invite", joinByInvite);
Routes.post("/group/:id/join-request", requestToJoin);
Routes.post("/group/:id/handle-request", allowedTo("teacher"), handleJoinRequest);
Routes.post("/group/:id/manage-member", allowedTo("teacher"), manageMember);
Routes.post("/group/:id/generate-invite", allowedTo("teacher"), generateInviteCode);

module.exports = Routes;
