require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const opportunityRouter = require('./routes/opportunity');
const applicationRouter = require('./routes/application');
const userRouter = require('./routes/user');
const interviewRouter = require('./routes/interview')
const teamRouter = require('./routes/teams')
const { requireLogin } = require('./middleware/auth');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
  })
);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Connection error: ', err));



app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/',userRouter)
app.use('/opportunity', opportunityRouter);
app.use('/application', requireLogin, applicationRouter);
app.use('/interview', requireLogin, interviewRouter);
app.use('/teams', requireLogin, teamRouter)


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
