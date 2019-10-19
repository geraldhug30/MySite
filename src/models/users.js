const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const userSchema = mongoose.Schema(
  {
    fname: {
      type: String,
      unique: true,
      required: true
    },
    uname: {
      type: String,
      unique: true,
      required: true
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error({ msg: 'Email is invalid' });
        }
      }
    },
    password: {
      type: String,
      trim: true,
      minLength: 7,
      required: true,
      validate(value) {
        if (value.toLowerCase().includes('password')) {
          throw new Error({ msg: 'pasword cannot containe "password"' });
        }
      }
    },
    tokens: [
      {
        token: {
          type: String,
          require: true
        }
      }
    ],
    saveFile: {
      type: Buffer
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;
  return userObject;
};

// create virtual field for users and tasks and cannot see on users database
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'owner'
});

// create token to create user and login user
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = await user.tokens.concat({ token });
  await user.save();

  return token;
};

// check email and password auth in user.js /router
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.find({ email });

  if (!user) {
    return 'Unable to login e';
  }

  const isMatch = await bcrypt.compare(password, user[0].password);

  if (!isMatch) {
    return 'Unable to login p';
  }
  return user;
};

//hash password
userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// remove task when user deleted profile
userSchema.pre('remove', async function(next) {
  const user = this;
  await Task.deleteMany({ owner: user._id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
