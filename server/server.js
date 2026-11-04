require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.log('Connection error: ', err));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
