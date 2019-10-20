const mongoose = require('mongoose');
// const validator = require('validator');

const postSchema = mongoose.Schema(
  {
    UserPost: {
      type: String,
      require: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    fileName: {
      type: String
    },
    mimetype: {
      type: String
    },
    path: {
      type: String
    },
    file: {
      type: Buffer
    }
  },
  {
    timestamps: true
  }
);

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
