const expressAsyncHandler = require("express-async-handler");
const createCouresModel = require("../Modules/createCouress");
const createQuestionModel = require("../Modules/createQuestion");
const createResultsModel = require("../Modules/createResults");
const factory = require("./FactoryHandler");

const mongoose = require("mongoose");
const FeatureApi = require("../Utils/Feature");
const createQuizModel = require("../Modules/createQuiz");
const { Types } = require("mongoose");
const isValidObjectId = (v) => Types.ObjectId.isValid(v);
exports.createResults = expressAsyncHandler(async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const questionId = req.params.question;

    if (
      !mongoose.Types.ObjectId.isValid(quizId) ||
      !mongoose.Types.ObjectId.isValid(questionId)
    ) {
      return res.status(400).json({ msg: "معرّفات غير صالحة" });
    }

    const question = await createQuestionModel
      .findOne({ _id: questionId, quiz: quizId })
      .select("options correctAnswer correctText type");
    if (!question) return res.status(404).json({ msg: "السؤال غير موجود" });

    // بيانات الامتحان للأسئلة/الإقفال
    const quizDoc = await createQuizModel.findById(quizId).select("questions");
    if (!quizDoc) return res.status(404).json({ msg: "الاختبار غير موجود" });

    const attempt = await createResultsModel.findOne({
      user: req.user._id,
      quiz: quizId,
    });
    if (!attempt || !attempt.startedAt || !attempt.endsAt) {
      return res
        .status(400)
        .json({ msg: "لا يمكن الاجابة علي الاسألة قبل بداية الوقت" });
    }

    // انتهى الوقت؟
    const now = Date.now();
    const ended = attempt.endsAt && now >= attempt.endsAt.getTime();
    if (attempt.sealed || ended) {
      if (!attempt.sealed) {
        new Set(
          attempt.items.map((it) => String(it.question)) // إنشاء مجموعة تحتوي على الأسئلة التي تم الإجابة عليها
        );

        for (const qid of quizDoc.questions || []) {
          const k = String(qid);

          const existingAnswer = attempt.items.find((item) => {
            return String(item.question._id) === k;
          });

          if (!existingAnswer) {
            attempt.items.push({
              question: qid,
              teacherCorrectAnswer:
                question.options[question.correctAnswer - 1],
              correctAnswer: question.correctAnswer,
              correctText: question.correctText,
              userAnswer: null, // لم يتم الإجابة عليه بعد
              isCorrect: false, // الإجابة خاطئة لأنه لم يتم الإجابة
            });
          }
        }

        attempt.sealed = true;
        attempt.finishedAt = new Date();
        await attempt.save();
      }

      const totalQuestions = quizDoc.questions?.length || attempt.items.length;
      const answered = attempt.items.filter(
        (it) => it.userAnswer != null
      ).length;
      const correct = attempt.items.filter(
        (it) => it.isCorrect === true
      ).length;
      const wrong = attempt.items.filter((it) => it.isCorrect === false).length;
      const percent = totalQuestions
        ? Number(((correct / totalQuestions) * 100).toFixed(2))
        : 0;

      return res.status(403).json({
        msg: "انتهى وقت الاختبار",
        stats: {
          totalQuestions,
          answered,
          correct,
          wrong,
          percent,
          finishedAt: attempt.finishedAt,
          sealed: attempt.sealed,
        },
      });
    }

    const already = attempt.items.some(
      (it) => String(it.question._id) === String(questionId)
    );

    if (already) {
      return res
        .status(400)
        .json({ status: "Failure", msg: "تم الاجابة علي السؤال من قبل" });
    }

    const userAnswer = Number(req.body.userAnswer);
    const correctAnswer = Number(question.correctAnswer);
    const isCorrect = userAnswer === correctAnswer;

    attempt.items.push({
      question: question._id,
      userAnswer,
      userAnswerText: question.options[userAnswer - 1],
      teacherCorrectAnswer: question.options[correctAnswer - 1],
      isCorrect,
      correctAnswer,
      correctText: question.correctText,
    });

    await attempt.save();

    const remainingMs = Math.max(0, attempt.endsAt.getTime() - Date.now());
    return res
      .status(201)
      .json({ status: "Success", msg: "تم حفظ النتيجة", remainingMs });
  } catch (err) {
    next(err);
  }
});

exports.getMyResults = expressAsyncHandler(async (req, res) => {
  let filter = req.filterObject || {};

  // If teacher or admin, restrict to their quizzes
  if (req.user.role === "teacher" || req.user.role === "admin") {
    const teacherId = req.user.role === "teacher" ? req.user._id : req.user.teacher;
    const teacherQuizzes = await createQuizModel.find({ teacher: teacherId }).select("_id");
    const quizIds = teacherQuizzes.map((q) => q._id);
    filter.quiz = { $in: quizIds };
  }

  const countDocs = await createResultsModel.countDocuments(filter);

  const ApiFeatures = new FeatureApi(
    createResultsModel.find(filter).populate([
      { path: "user", select: "_id name" },
      { 
        path: "quiz", 
        select: "_id text teacher",
        populate: { path: "teacher", select: "_id name" }
      },
    ]),
    req.query
  )
    .Fillter(createResultsModel)
    .Sort()
    .Fields()
    .Search()
    .Paginate(countDocs);

  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  const docs = await MongooseQueryApi.lean();

  const data = docs.map((doc) => {
    const itemsSrc = Array.isArray(doc.items)
      ? doc.items
      : Array.isArray(doc.resultsItems)
      ? doc.resultsItems
      : [];

    const items =
      doc.sealed === false
        ? itemsSrc.map((it) => {
            const {
              teacherCorrectAnswer,
              correctText,
              correctAnswer,
              isCorrect,
              ...rest
            } = it || {};

            if (rest && rest.question && typeof rest.question === "object") {
              const {
                correctText: _qCorrectText,
                correctAnswer: _qCorrectAnswer,
                isCorrect: _qIsCorrect,
                ...questionRest
              } = rest.question;

              rest.question = questionRest;
            }

            if (rest && rest.item && typeof rest.item === "object") {
              const { ...itemRest } = rest.item;
              rest.item = itemRest;
            }

            return rest;
          })
        : itemsSrc;

    const answered = items.filter(
      (it) => it.userAnswer !== undefined && it.userAnswer !== null
    );
    const correct = answered.filter((it) => it.isCorrect === true);
    const wrong = answered.filter((it) => it.isCorrect === false);
    const percent = answered.length
      ? Number(((correct.length / answered.length) * 100).toFixed(2))
      : 0;

    return {
      ...doc,
      items,
      stats: {
        answered: answered.length,
        correct: correct.length,
        wrong: wrong.length,
        percent,
      },
    };
  });

  const allItems = docs.flatMap((d) => d.items || []);
  const answeredA = allItems.filter(
    (it) => it.userAnswer !== undefined && it.userAnswer !== null
  );

  const correctA = answeredA.filter((it) => it.isCorrect === true);
  const wrongA = answeredA.filter((it) => it.isCorrect === false);
  const percentA = answeredA.length
    ? Number(((correctA.length / answeredA.length) * 100).toFixed(2))
    : 0;

  const byQuizMap = {};
  for (const it of answeredA) {
    const quizId = (it.quiz?._id || it.quiz)?.toString();
    if (!quizId) continue;
    if (!byQuizMap[quizId])
      byQuizMap[quizId] = {
        quiz: quizId,
        answered: 0,
        correct: 0,
        wrong: 0,
        percent: 0,
      };
    byQuizMap[quizId].answered++;
    if (it.isCorrect === true) byQuizMap[quizId].correct++;
    if (it.isCorrect === false) byQuizMap[quizId].wrong++;
  }
  for (const k in byQuizMap) {
    const g = byQuizMap[k];
    g.percent = g.answered
      ? Number(((g.correct / g.answered) * 100).toFixed(2))
      : 0;
  }

  const totals = {
    answered: answeredA.length,
    correct: correctA.length,
    wrong: wrongA.length,
    percent: percentA,
    byQuiz: Object.values(byQuizMap),
  };

  return res.status(200).json({
    results: data.length,
    PaginateResult,
    totals,
    data,
  });
});

exports.getResultsQuiz = expressAsyncHandler(async (req, res) => {
  try {
    let filter = { ...(req.filterObject || {}) };

    const quizId = req.params.quizId;
    const userId = req.user._id;

    if (quizId && isValidObjectId(quizId)) {
      filter.quiz = quizId;
    }
    if (userId && isValidObjectId(userId)) {
      filter.user = userId;
    }

    const countDocs = await createResultsModel.countDocuments(filter);

    const ApiFeatures = new FeatureApi(
      createResultsModel.find(filter),
      req.query
    ).Fillter(createResultsModel);

    const { MongooseQueryApi, PaginateResult } = ApiFeatures;
    const docs = await MongooseQueryApi.lean();

    let attempt = null;
    if (filter.user && filter.quiz) {
      attempt = await createResultsModel.findOne({
        user: filter.user,
        quiz: filter.quiz,
      });
    }

    const question = await createQuestionModel
      .findOne({ quiz: quizId })
      .select("options correctAnswer correctText type");
    if (!question)
      return res.status(404).json({ msg: "لا يوجد اسأله للاختبار" });

    const quizDoc = await createQuizModel.findById(quizId).select("questions");
    if (!quizDoc) return res.status(404).json({ msg: "الاختبار غير موجود" });

    const now = Date.now();
    const ended = attempt?.endsAt && now >= attempt?.endsAt.getTime();
    if (attempt?.sealed || ended) {
      if (!attempt?.sealed) {
        // جهّز set للـIDs الموجودة بالفعل
        const existingIds = new Set(
          (attempt.items || []).map((it) =>
            String(it.question?._id || it.question)
          )
        );

        // لو quizDoc.questions مُعبّاة فكل عنصر q ممكن يكون document
        for (const q of quizDoc.questions || []) {
          const qId = String(q?._id || q); // يدعم الحالتين: populated أو ObjectId

          if (!existingIds.has(qId)) {
            // لو السؤال مُعبّى نقدر ناخد منه الإجابات الصحيحة
            const qDoc = typeof q === "object" ? q : null;

            attempt.items.push({
              question: q, // خليه زي ما هو (doc أو ObjectId)
              teacherCorrectAnswer: qDoc
                ? qDoc.options?.[(qDoc.correctAnswer ?? 1) - 1]
                : undefined,
              correctAnswer: qDoc?.correctAnswer,
              correctText: qDoc?.correctText,
              userAnswer: null,
              isCorrect: false, // غير المُجاب عنه = خطأ
            });
          }
        }

        attempt.sealed = true;
        attempt.finishedAt = new Date();
        await attempt.save();
      }

      const totalQuestions =
        (quizDoc.questions?.length ?? 0) || attempt.items.length;

      // احسب الإحصائيات
      const { answered, correct } = getQuestionStats(attempt.items);

      // لو عايز تعتبر غير المُجاب عنها = خطأ
      const wrong = totalQuestions - correct;
      const percent = totalQuestions
        ? Math.round((correct / totalQuestions) * 100)
        : 0;

      return res.status(200).json({
        msg: "انتهى وقت الاختبار",
        stats: {
          totalQuestions,
          answered,
          correct,
          wrong,
          percent,
          finishedAt: attempt.finishedAt,
          sealed: attempt.sealed,
        },
        data: docs, // بافتراض إنه معرّف فوق
      });
    }

    const allItems = docs.flatMap((d) => d.items || []);
    const {
      answered: answeredA,
      correct: correctA,
      wrong: wrongA,
      percent: percentA,
    } = getQuestionStats(allItems);

    const byQuizMap = calculateQuizStats(allItems);

    const totals = {
      answered: answeredA,
      correct: correctA,
      wrong: wrongA,
      percent: percentA,
      byQuiz: Object.values(byQuizMap),
    };

    return res.status(200).json({
      totals,
      data: docs,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ msg: "حدث خطأ غير متوقع", error: err.message });
  }
});

// دالة لحساب الإحصائيات (Answered, Correct, Wrong, Percent)
function getQuestionStats(items) {
  const answered = items.filter((it) => it.userAnswer != null);
  const correct = answered.filter((it) => it.isCorrect === true);
  const wrong = answered.filter((it) => it.isCorrect === false);
  const percent = answered.length
    ? Number(((correct.length / answered.length) * 100).toFixed(2))
    : 0;

  return {
    answered: answered.length,
    correct: correct.length,
    wrong: wrong.length,
    percent,
  };
}

// دالة لحساب إحصائيات كل اختبار
function calculateQuizStats(items) {
  const byQuizMap = {};
  for (const it of items) {
    const qzId = (it.quiz?._id || it.quiz)?.toString();
    if (!qzId) continue;
    if (!byQuizMap[qzId]) {
      byQuizMap[qzId] = {
        quiz: qzId,
        answered: 0,
        correct: 0,
        wrong: 0,
        percent: 0,
      };
    }
    byQuizMap[qzId].answered++;
    if (it.isCorrect === true) byQuizMap[qzId].correct++;
    if (it.isCorrect === false) byQuizMap[qzId].wrong++;
  }
  for (const k in byQuizMap) {
    const g = byQuizMap[k];
    g.percent = g.answered
      ? Number(((g.correct / g.answered) * 100).toFixed(2))
      : 0;
  }
  return byQuizMap;
}

// دالة لحساب الإحصائيات (Answered, Correct, Wrong, Percent)
function getQuestionStats(items) {
  const answered = items.filter((it) => it.userAnswer != null);
  const correct = answered.filter((it) => it.isCorrect === true);
  const wrong = answered.filter((it) => it.isCorrect === false);
  const percent = answered.length
    ? Number(((correct.length / answered.length) * 100).toFixed(2))
    : 0;

  return {
    answered: answered.length,
    correct: correct.length,
    wrong: wrong.length,
    percent,
  };
}

// دالة لحساب إحصائيات كل اختبار
function calculateQuizStats(items) {
  const byQuizMap = {};
  for (const it of items) {
    const qzId = (it.quiz?._id || it.quiz)?.toString();
    if (!qzId) continue;
    if (!byQuizMap[qzId]) {
      byQuizMap[qzId] = {
        quiz: qzId,
        answered: 0,
        correct: 0,
        wrong: 0,
        percent: 0,
      };
    }
    byQuizMap[qzId].answered++;
    if (it.isCorrect === true) byQuizMap[qzId].correct++;
    if (it.isCorrect === false) byQuizMap[qzId].wrong++;
  }
  for (const k in byQuizMap) {
    const g = byQuizMap[k];
    g.percent = g.answered
      ? Number(((g.correct / g.answered) * 100).toFixed(2))
      : 0;
  }
  return byQuizMap;
}

exports.getResultss = factory.getAll(createResultsModel);
exports.updateResult = expressAsyncHandler(async (req, res, next) => {
  const question = await createQuestionModel
    .findOne({
      _id: req.params.question,
      quiz: req.params.id,
    })
    .populate("quiz");

  const lecture = await createCouresModel.findOne({
    user: req.user._id,
    couresItems: {
      $elemMatch: {
        lacture: question.quiz.lecture._id,
      },
    },
  });

  if (!question) {
    return res.status(404).json({ msg: "السؤال غير موجود" });
  }

  if (!lecture) {
    return res.status(404).json({ msg: "لايمكنك دخول الامتحان" });
  }

  const result = await createResultsModel.findOne({
    user: req.user.id,
    quiz: req.params.id,
  });

  if (result && result.sealed) {
    return res
      .status(400)
      .json({ msg: "لا يمكن تعديل الإجابة لأن النتيجة مختومة" });
  }

  await createResultsModel.findOneAndUpdate(
    {
      user: req.user.id,
      quiz: req.params.id,
      "resultsItems.question": req.params.question,
    },
    {
      $set: {
        "resultsItems.$.userAnswer": req.body.userAnswer,
        "resultsItems.$.iscorrect": req.body.iscorrect,
      },
    },
    { new: true }
  );

  res.status(201).json({ status: "Success", msg: "تم تعديل الاجابة" });
});

exports.startQuiz = expressAsyncHandler(async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ msg: "معرّف الاختبار غير صالح" });
    }

    const quiz = await createQuizModel
      .findById(quizId)
      .select("timer questions");
    if (!quiz) return res.status(404).json({ msg: "الاختبار غير موجود" });

    const durationMs = Number(quiz.timer);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return res
        .status(400)
        .json({ msg: "قيمة المؤقّت غير صالحة (timer بالمللي ثانية)" });
    }

    let attempt = await createResultsModel.findOne({
      user: req.user._id,
      quiz: quizId,
    });

    if (attempt && attempt.startedAt && attempt.endsAt) {
      const remainingMs = Math.max(0, attempt.endsAt.getTime() - Date.now());
      return res.status(200).json({
        msg: "المحاولة بدأت بالفعل",
        remainingMs,
        endsAt: attempt.endsAt,
        startedAt: attempt.startedAt,
        sealed: attempt.sealed,
      });
    }

    const now = Date.now();
    if (!attempt) {
      attempt = await createResultsModel.create({
        user: req.user._id,
        quiz: quizId,
        startedAt: new Date(now),
        durationMs,
        endsAt: new Date(now + durationMs),
        items: [],
      });
    } else {
      attempt.startedAt = new Date(now);
      attempt.durationMs = durationMs;
      attempt.endsAt = new Date(now + durationMs);
      await attempt.save();
    }

    return res.status(201).json({
      msg: "تم بدء الوقت",
      startedAt: attempt.startedAt,
      endsAt: attempt.endsAt,
      remainingMs: durationMs,
    });
  } catch (err) {
    next(err);
  }
});

exports.finishResults = expressAsyncHandler(async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ msg: "معرّف الاختبار غير صالح" });
  }

  const attempt = await createResultsModel.findOne({
    user: userId,
    quiz: quizId,
  });
  if (!attempt)
    return res.status(404).json({ msg: "لا توجد محاولة لهذا الامتحان" });

  if (attempt.sealed) {
    const stats = buildStats(attempt);
    return res
      .status(200)
      .json({ msg: "المحاولة منتهية مسبقًا", stats, attempt });
  }

  const quiz = await createQuizModel.findById(quizId).select("questions");
  if (!quiz) return res.status(404).json({ msg: "الاختبار غير موجود" });

  // المجيب عليهم
  const answeredSet = new Set(
    attempt.items.map((it) => String(it.question._id))
  );

  for (const qid of quiz.questions || []) {
    const qidStr = String(qid);

    // التحقق إذا كان السؤال قد تمت الإجابة عليه بالفعل
    if (!answeredSet.has(qidStr)) {
      // إذا لم يتم الإجابة على السؤال، أضفه إلى attempt.items
      const q = await createQuestionModel
        .findById(qid)
        .select("correctAnswer correctText");

      // إضافة السؤال مع الإجابة null لأنها لم تتم الإجابة عليها بعد
      attempt.items.push({
        question: qid,
        userAnswer: null,
        isCorrect: false,
        correctAnswer: q?.correctAnswer ?? undefined,
        correctText: q?.correctText ?? undefined,
      });
    }
  }

  attempt.sealed = true;
  attempt.finishedAt = new Date();
  await attempt.save();

  const stats = buildStats(attempt);
  return res.status(200).json({ msg: "تم تسليم الامتحان", stats, attempt });
});

function buildStats(attempt) {
  const answered = attempt.items.filter(
    (it) => it.userAnswer !== undefined && it.userAnswer !== null
  );
  const correct = answered.filter((it) => it.isCorrect === true);
  const wrong = answered.filter((it) => it.isCorrect === false);

  const totalQuestions = attempt.items.length;
  const percent = totalQuestions
    ? Number(((correct.length / totalQuestions) * 100).toFixed(2))
    : 0;

  return {
    totalQuestions,
    answered: answered.length,
    correct: correct.length,
    wrong: wrong.length,
    percent,
    finishedAt: attempt.finishedAt,
    sealed: attempt.sealed,
  };
}
