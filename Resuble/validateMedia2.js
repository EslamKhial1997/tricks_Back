const { body } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");

exports.validateMedia2 = [
  body("name").notEmpty().withMessage("الاسم مطلوب"),

  body("type")
    .notEmpty()
    .withMessage("نوع المحتوى مطلوب")
    .isIn(["pdf", "youtube", "external", "exam"])
    .withMessage("النوع يجب أن يكون pdf أو youtube أو external أو exam"),

  body().custom((body) => {
    const { type, pdf, linkYoutube, duration, idVideo, quizId } = body;

    if (type === "pdf") {
      if (!pdf) throw new Error("pdf مطلوب في نوع pdf");
    }

    if (type === "youtube") {
      if (!linkYoutube) throw new Error("linkYoutube مطلوب في youtube");
      if (isNaN(Number(duration)))
        throw new Error("duration يجب أن يكون رقم صالح في نوع youtube");
    }

    if (type === "external") {
      if (!idVideo) throw new Error("idVideo مطلوب في external");
    }

    if (type === "exam") {
      if (!quizId) throw new Error("quizId مطلوب في exam");
    }

    return true;
  }),

  MiddlewareValidator,
];
