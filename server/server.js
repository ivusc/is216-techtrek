const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const opportunityRouter = require('./routes/opportunity');
const applicationRouter = require('./routes/application');

const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 8000;

app.use(cors());
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

app.use('/opportunity', opportunityRouter);
app.use('/application', applicationRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
