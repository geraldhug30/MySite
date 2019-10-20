require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(
  // process.env.MONGOOSE_URI ||
  process.env.MONGOOSE_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  },
  err => {
    if (err) console.log(err);
    console.log('database is connected');
  }
);
