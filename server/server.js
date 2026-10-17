const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const opportunityRouter = require('./routes/opportunity');
const applicationRouter = require('./routes/application');
const interviewRouter = require('./routes/interview')
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Connection error: ', err));



app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/opportunity', opportunityRouter);
app.use('/application', applicationRouter);
app.use('/interview', interviewRouter);


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
