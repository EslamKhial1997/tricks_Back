const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const morgan = require("morgan");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const mongoSanitize = require("express-mongo-sanitize");
const http = require("http");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const { Server } = require("socket.io");
const dbCollection = require("./config/config");
const globalError = require("./Middleware/globalError");
const ApiError = require("./Resuble/ApiErrors");
const { createFirstManagerAccount } = require("./Service/AuthService");

const RoutesGoogleAuth = require("./Routes/RoutesGoogleAuth");
const RoutesAuth = require("./Routes/RoutesAuth");
const RoutesUsers = require("./Routes/RoutesUsers");
const RoutesTransactions = require("./Routes/RoutesTransaction");
const RoutesClasses = require("./Routes/RoutesClasses");
const RoutesTeachers = require("./Routes/RoutesTeachers");
const RoutesSections = require("./Routes/RoutesSections");
const RoutesLectures = require("./Routes/RoutesLectures");
const RoutesQuizes = require("./Routes/RoutesQuiz");
const RoutesQuestion = require("./Routes/RoutesQuestion");
const RoutesResults = require("./Routes/RoutesResults");
const RoutesCoupons = require("./Routes/RoutesCoupons");
const RoutesCouress = require("./Routes/RoutesCoures");
const RoutesSliders = require("./Routes/RoutesSlider");
const RoutesGallerys = require("./Routes/RoutesGallerys");
const RoutesHonors = require("./Routes/RoutesHonors");
const RoutesPackage = require("./Routes/RoutesPackage");
const RoutesGroups = require("./Routes/RoutesGroup");
const RoutesQrCodes = require("./Routes/RoutesQrCodes");
const RoutesCenters = require("./Routes/RoutesCenters");
const RoutesWallet = require("./Routes/RoutesWallet");
const RoutesTransfer = require("./Routes/RoutesTransfer");
const createMessageModel = require("./Modules/createMessage");
const createGroupModel = require("./Modules/createGroup");
const createUsersModel = require("./Modules/createUsers");
const createTeachersModel = require("./Modules/createTeacher");
const { startCleanupTask } = require("./Service/CleanupService");

dotenv.config({ path: "config.env" });
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*"],
  },
});
dbCollection();
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json({ limit: "50kb" }));
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4000",
  "https://dev.ebda3acadmy.com",
  "http://localhost:3000",
  "exp://192.168.1.5",
  "http://192.168.1.5",
  "https://tricks.dengatech.com",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(hpp());
app.use(mongoSanitize());
app.use(xss());
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
const uploadsPath = path.join(__dirname, "../uploads");
app.use(express.static(uploadsPath));
app.use(express.static(path.join(__dirname, "../dist")));
createFirstManagerAccount();
app.use("/", RoutesGoogleAuth);
app.use("/api/v1", [
  RoutesSliders,
  RoutesGallerys,
  RoutesHonors,
  RoutesClasses,
  RoutesSections,
  RoutesTeachers,
  RoutesLectures,
  RoutesAuth,
  RoutesTransactions,
  RoutesPackage,
  RoutesQuizes,
  RoutesQuestion,
  RoutesResults,
  RoutesCoupons,
  RoutesCouress,
  RoutesGroups,
  RoutesQrCodes,
  RoutesCenters,
  RoutesUsers,
  RoutesWallet,
  RoutesTransfer,
]);

app.get("*", (req, res, next) => {
  if (!req.originalUrl.startsWith("/api")) {
    return res.sendFile(path.join(__dirname, "../dist", "index.html"));
  } else {
    next(
      new ApiError(`Sorry, this URL ${req.originalUrl} does not exist`, 400)
    );
  }
  next();
});
app.use(globalError);
startCleanupTask();
io.use(async (socket, next) => {
  let token = socket.handshake.query?.token || socket.handshake.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  if (!token) {
    console.log("❌ Socket Auth: No token provided");
    return next(new Error("توكن المستخدم مطلوب"));
  }

  try {
    const secret = process.env.DB_URL;
    if (!secret) {
        console.error("❌ CRITICAL: process.env.DB_URL is undefined!");
    }

    console.log(`🔓 Attempting socket auth with token starting with: ${token.substring(0, 10)}...`);
    
    const decoded = jwt.verify(token, secret);
    console.log("✅ Token verified for user ID:", decoded.userId);
    
    const user = (await createUsersModel.findById(decoded.userId)) || (await createTeachersModel.findById(decoded.userId));

    if (!user) {
      console.log("❌ Socket Auth: User/Teacher not found in DB for ID:", decoded.userId);
      return next(new Error("المستخدم غير موجود"));
    }

    console.log(`👤 Socket Auth Success: ${user.name} (${user.role})`);
    socket.user = decoded;
    socket.dbUser = user;
    next();
  } catch (err) {
    console.error("❌ Socket Auth JWT Error:", err.message);
    return next(new Error("توكن غير صالح"));
  }
});

io.on("connection", (socket) => {
  console.log(`🔗 user Connected: ${socket.user.userId} (${socket.dbUser.role})`);

  // Join a specific group
  socket.on("joinGroup", async ({ groupId }) => {
    try {
      console.log(`📡 Join Request: User ${socket.user.userId} -> Group ${groupId}`);
      
      const group = await createGroupModel.findById(groupId);
      if (!group) {
        console.log(`❌ Join Error: Group ${groupId} not found`);
        return socket.emit("error", "الجروب غير موجود");
      }

      const userId = socket.user.userId.toString();
      
      // Handle populated teacher object or raw ID
      const teacherObj = group.teacher?._id || group.teacher;
      if (!teacherObj) {
        console.log(`❌ Join Error: Group has no teacher assigned`);
        return socket.emit("error", "خطأ في بيانات الجروب (لا يوجد مدرس)");
      }

      const teacherId = teacherObj.toString();
      const isTeacher = teacherId === userId;
      
      const isMember = group.members && group.members.some(m => {
        const mid = (m && m._id) ? m._id.toString() : (m ? m.toString() : null);
        return mid === userId;
      });

      const isBanned = group.bannedUsers && group.bannedUsers.some(b => {
        const bid = (b && b._id) ? b._id.toString() : (b ? b.toString() : null);
        return bid === userId;
      });

      console.log(`🔍 Permissions: User ${userId} | isTeacher=${isTeacher}, isMember=${isMember}, isBanned=${isBanned}`);

      if (isBanned && !isTeacher) {
        console.log(`❌ Join Error: User ${userId} is banned`);
        return socket.emit("error", "تم حظرك من هذا الجروب");
      }
      
      if (!isTeacher && !isMember) {
        console.log(`❌ Join Error: User ${userId} is not a member`);
        return socket.emit("error", "يجب عليك الانضمام للجروب أولاً");
      }

      socket.join(groupId);
      console.log(`✅ Success: User ${userId} joined room ${groupId}`);
      
      // Load last messages
      const messages = await createMessageModel.find({ groupId }).sort({ createdAt: -1 }).limit(50);
      socket.emit("previousMessages", messages.reverse());
    } catch (error) {
      console.error("🔥 Join Group Crash:", error);
      socket.emit("error", `حدث خطأ أثناء الانضمام للجروب: ${error.message}`);
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ groupId, text }) => {
    try {
      if (!text || !text.trim()) return;

      const group = await createGroupModel.findById(groupId);
      if (!group) return;

      const userId = socket.user.userId.toString();
      const teacherObj = group.teacher?._id || group.teacher;
      const isTeacher = teacherObj && teacherObj.toString() === userId;
      const isMember = group.members && group.members.some(m => {
          const mid = (m && m._id) ? m._id.toString() : (m ? m.toString() : null);
          return mid === userId;
      });

      if (!isTeacher && !isMember) {
          console.log(`❌ Send Message Error: User ${userId} lacks permissions for group ${groupId}`);
          return socket.emit("error", "غير مسموح لك بإرسال رسائل في هذا الجروب");
      }

      const newMessage = new createMessageModel({
        groupId,
        senderId: socket.user.userId,
        senderName: socket.dbUser.name || socket.user.userName,
        text,
      });

      await newMessage.save();
      io.to(groupId).emit("receiveMessage", newMessage);
    } catch (error) {
      console.error("🔥 Send Message Crash:", error);
      socket.emit("error", `حدث خطأ أثناء إرسال الرسالة: ${error.message}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User ${socket.user.userId} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
