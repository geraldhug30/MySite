const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    post: {
      type: String,
      require: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const Task = mongoose.model('Post', taskSchema);

module.exports = Task;
