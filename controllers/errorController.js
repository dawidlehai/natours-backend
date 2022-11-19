const AppError = require('./../utils/appError');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') sendErrDev(err, res);
  if (process.env.NODE_ENV === 'production') {
    let myErr = { ...err };
    myErr.message = err.message;
    myErr.errmsg = err.errmsg;
    myErr.name = err.name;

    if (myErr.name === 'CastError') myErr = handleCastErrDB(myErr);
    if (myErr.code === 11000) myErr = handleDuplicateFieldsDB(myErr);
    if (myErr.name === 'ValidationError') myErr = handleValidationErrDB(myErr);
    if (myErr.name === 'JsonWebTokenError') myErr = handleJwtError();
    if (myErr.name === 'TokenExpiredError') myErr = handleJwtExpiredError();

    sendErrProd(myErr, res);
  }
};

function sendErrDev(err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
}

function sendErrProd(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('⚠️ ERROR:', err);
    res.status(err.statusCode).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
}

function handleCastErrDB(err) {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
}

function handleDuplicateFieldsDB(err) {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
}

function handleValidationErrDB(err) {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}.`;
  return new AppError(message, 400);
}

function handleJwtError() {
  return new AppError('Invalid token. Please log in again', 401);
}

function handleJwtExpiredError() {
  return new AppError('Your token has expired! Please log in again', 401);
}
