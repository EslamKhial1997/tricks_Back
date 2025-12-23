
const ApiErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    msg: err.message,
  });
};

const ApiErrorProduction = (err, res) => {
  // Operational errors: trusted errors that we can send to the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      msg: err.message,
    });
  } else {
    // Programming or unknown errors: don't leak error details in production
    console.error("ERROR 💥:", err);

    res.status(500).json({
      status: "error",
      msg: "Something went wrong!",
    });
  }
};

const globalError = (err, req, res, next) => {
  // Set default values for status code and status
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    ApiErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    ApiErrorProduction(err, res);
  }
};

module.exports = globalError;
