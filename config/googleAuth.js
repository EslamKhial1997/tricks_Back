const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const createUsersModel = require("../Modules/createUsers");
const createTeachersModel = require("../Modules/createTeacher");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // البحث في user أولًا
        let user = await createUsersModel.findOne({
          $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
        });

        if (!user) {
          // إذا لم يكن في user، نبحث في teacher
          let teacher = await createTeachersModel.findOne({
            $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
          });

          if (teacher) {
            return done(null, teacher);
          }

          user = new createUsersModel({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
          });

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    let user = await createUsersModel.findById(id);
    if (!user) {
      user = await createTeachersModel.findById(id);
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
