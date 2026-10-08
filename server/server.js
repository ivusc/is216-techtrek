const express = require('express');
const mongoose = require('mongoose');

const opportunityRouter = require('./routes/opportunity');

const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Connection error: ', err));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/opportunity', opportunityRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
