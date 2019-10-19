const jwt = require('jsonwebtoken');
const User = require('../models/users');
require('dotenv').config();

const auth = async (req, res, next) => {
  try {
    //const token = req.header('Authorization').replace('Bearer ', '');
    var token = req.cookies.auth;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // find user data and verify token
    const user = await User.findOne({
      _id: decoded._id,
      'tokens.token': token
    });

    if (!user) {
      throw new Error();
    }
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send({ error: 'Unauthorize, Please login!' });
  }
};

module.exports = auth;
