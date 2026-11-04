const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');

const opportunityRouter = require('./routes/opportunity');
const applicationRouter = require('./routes/application');
const userRouter = require('./routes/user');
const interviewRouter = require('./routes/interview');
const teamRouter = require('./routes/teams');
const notificationRouter = require('./routes/notifications');
const { requireLogin } = require('./middleware/auth');

const app = express();

// On Vercel this file is the serverless entrypoint (server.js never runs), so it
// connects to Mongo itself and keeps sessions there: function instances share no memory.
const onVercel = Boolean(process.env.VERCEL);
const mongoClient = onVercel
  ? mongoose.connect(process.env.MONGO_URI).then((m) => m.connection.getClient())
  : null;
if (onVercel) app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: onVercel ? MongoStore.create({ clientPromise: mongoClient }) : undefined,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      secure: onVercel,
      sameSite: 'lax',
    },
  }),
);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/', userRouter);
app.use('/opportunity', opportunityRouter);
app.use('/application', requireLogin, applicationRouter);
app.use('/interview', requireLogin, interviewRouter);
app.use('/teams', requireLogin, teamRouter);
app.use('/notifications', requireLogin, notificationRouter);

module.exports = app;
