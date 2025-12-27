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
io.use(async (socket, next) => {
  let token = socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("توكن المستخدم مطلوب"));
  }

  try {
    // التحقق من توكن المستخدم
    const decoded = jwt.verify(token, process.env.DB_URL);
    const user = await createUsersModel.findById(decoded.userId);

    if (!user) {
      return next(new Error("المستخدم غير موجود"));
    }

    const group = await createGroupModel.findOne({ token: user.groupToken });

    if (!group) {
      return next(new Error("الجروب غير موجود"));
    }

    // منع الطلاب المحظورين من الانضمام
    if (group.bannedUsers.includes(user._id.toString())) {
      return next(new Error("تم حظرك من هذا الجروب"));
    }

    socket.user = decoded;
    socket.group = group;
    next();
  } catch (err) {
    return next(new Error("توكن غير صالح"));
  }
});

io.on("connection", (socket) => {
  console.log(`🔗 user Connection ${socket.user.userId}`);

  // 📌 حدث إرسال رسالة
  socket.on("msg", async (message) => {
    try {
      console.log("📩 استقبال رسالة:", message);

      // استخراج النص من داخل كائن الحدث
      const messageText =
        message.text || message.event === "msg" ? message.text : null;

      if (!messageText || !messageText.trim()) {
        console.log("⚠️ الرسالة فارغة!");
        return;
      }

      // حفظ الرسالة في قاعدة البيانات
      const newMessage = new createMessageModel({
        groupId: message.groupId || "global",
        senderId: socket.user.userId,
        senderName: socket.user.userName || "مستخدم مجهول",
        text: messageText,
      });

      await newMessage.save();

      console.log("✅ تم حفظ الرسالة:", newMessage);
      io.emit("receiveMessage", newMessage);
    } catch (error) {
      console.log("❌ خطأ أثناء حفظ الرسالة:", error.message);
      socket.emit("error", { status: "error", message: error.message });
    }
  });

  // 📌 حدث حظر المستخدم
  socket.on("banUser", async ({ userId }) => {
    console.log(`🚫 طلب حظر المستخدم: ${userId}`);

    if (!userId) return socket.emit("error", "❌ معرف المستخدم مطلوب");

    io.emit("userBanned", userId);
  });

  // 📌 عند قطع الاتصال
  socket.on("disconnect", () => {
    console.log(`❌ المستخدم ${socket.user.userId} غادر`);
  });
}); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
