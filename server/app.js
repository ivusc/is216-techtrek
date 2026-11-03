const express = require('express');
const cors = require('cors');
const session = require('express-session');

const opportunityRouter = require('./routes/opportunity');
const applicationRouter = require('./routes/application');
const userRouter = require('./routes/user');
const interviewRouter = require('./routes/interview');
const teamRouter = require('./routes/teams');
const { requireLogin } = require('./middleware/auth');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      secure: false,
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

module.exports = app;
