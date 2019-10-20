const express = require('express');
const http = require('http');
const helmet = require('helmet');
const hpp = require('hpp');
const bodyParser = require('body-parser');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var path = require('path');
const { body } = require('express-validator');
const { sanitizeBody } = require('express-validator');
// upload file usesing multer
const multer = require('multer');
const sharp = require('sharp');
//file routing
const Users = require('./models/users');
const Post = require('./models/post');
const auth = require('./middleware/auth');
const app = express();
require('dotenv').config();
//connect database
require('./db/db');

app.use(express.static('public'));
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
    // cookie: { secure: true }
  })
);
//app.use(hpp({ checkQuery: false }));
//for scurity
app.use(helmet());
app.use(hpp());

let error = [];
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register', { error });
});

app.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('must have email')
      .normalizeEmail(),
    body('fname')
      .isLength({ min: 3 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    sanitizeBody('notifyOnReply').toBoolean(),
    body('uname')
      .isLength({ min: 3 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    sanitizeBody('notifyOnReply').toBoolean()
  ],
  async (req, res) => {
    const { fname, uname, email, password, cpassword } = req.body;
    error = [];
    try {
      if (!fname || !uname || !email || !password || !cpassword) {
        error.push({ msg: 'all fields are required' });
        return res.redirect('/register');
      }
      if (password !== cpassword) {
        error.push({ msg: 'password do not match' });
        return res.redirect('/register');
      }

      // pass verification
      const user = new Users({
        fname,
        uname,
        email,
        password
      });
      await user.save();
      const token = await user.generateAuthToken();
      res.redirect('/');
    } catch (err) {
      error.push(err);

      return res.render('register', { error });
    }
  }
);

app.get('/dashboard', auth, async (req, res) => {
  try {
    // sorted descending
    const post = await Post.find({ owner: req.user._id }).sort({
      createdAt: 'desc'
    });
    // console.log(post);
    // adding newPost in post

    const image =
      'data:image/png;base64,' + req.user.saveFile.toString('base64');

    res.render('dashboard', { user: req.user, post, image });
  } catch (err) {
    console.log(err);
    res.send({ error: 'error' });
  }
});

// SET STORAGE
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads');
  },
  limits: {
    fileSize: 5000000
  },
  filename: function(req, file, cb) {
    //path.extname(file.originalname)
    cb(null, Date.now() + '-' + file.originalname);
  }
});
var uploadFile = multer({ storage: storage });
// const uploadFile = multer({
//   dest: 'uploads',
//   limits: {
//     fileSize: 5000000
//   },
//   filename: function(req, file, cb) {
//     cb(undefined, file.originalname);
//   }
// });

app.get('/uploads/:id', (req, res) => {
  const getFile = req.params.id;
  res.sendFile(`uploads/${getFile}`);
});

app.post(
  '/postMessage',
  auth,
  uploadFile.single('myFile'),
  [
    body('UserPost')
      .isLength({ min: 3 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    sanitizeBody('notifyOnReply').toBoolean()
  ],
  async (req, res) => {
    const file = req.file;

    const post = new Post({
      ...req.body,
      owner: req.user._id
    });
    try {
      if (file) {
        post.path = file.path;
        post.fileName = file.filename;
        post.mimetype = file.mimetype;
        // post.file = file.buffer;
        //req.user.saveFile = buffer;
      }
      await post.save(err => {
        if (err) console.log(err);
        console.log('saved');
      });
      res.redirect('/dashboard');
    } catch (err) {
      res.status(500).send(err);
    }
  }
);

app.get('/profile', auth, async (req, res) => {
  try {
    // implementing buffer image to img src

    const image =
      'data:image/png;base64,' + req.user.saveFile.toString('base64');

    res.render('profile', { user: req.user, image, error });
  } catch (err) {
    console.log(err);
  }
});

app.get('/contact', (req, res) => {
  res.render('contact');
});
app.post('/login', async (req, res) => {
  try {
    const user = await Users.findByCredentials(
      req.body.email,
      req.body.password
    );

    if (!user) {
      return res.send('unable to login');
    }
    const token = await user[0].generateAuthToken();
    res.cookie('auth', token);
    res.redirect('/dashboard');

    //res.send(user)
  } catch (err) {
    console.log(err);
    res.statusd(400).send(err);
  }
});

app.post('/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(token => {
      return token.token !== req.token;
    });
    await req.user.save();

    res.redirect('/');
  } catch (err) {
    res.status(500).send;
  }
});

// multer config file, desitination and validate
const upload = multer({
  limits: {
    fileSize: 5000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload an image'));
    }

    cb(undefined, true);
  }
});

// endpoint
app.post(
  '/update',
  [
    body('email')
      .isEmail()
      .normalizeEmail(),
    body('fname')
      .isLength({ min: 3 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    sanitizeBody('notifyOnReply').toBoolean(),
    body('uname')
      .isLength({ min: 3 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    sanitizeBody('notifyOnReply').toBoolean()
  ],
  upload.single('uploadF'),
  auth,
  async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'fname',
      'uname',
      'email',
      'confirmPassword',
      'newPassword',
      'currentPassword'
    ];
    const isValidUpdates = updates.every(update =>
      allowedUpdates.includes(update)
    );
    if (!isValidUpdates) {
      error.push({ msg: 'error updates' });
      return res.redirect('/profile');
    }

    try {
      const user = await Users.findOne(req.user);
      updates.forEach(update => {
        if (req.body[update] !== '') {
          req.user[update] = req.body[update];
        }
      });

      if (req.file) {
        const buffer = await sharp(req.file.buffer)
          .resize({ width: 250, height: 250 })
          .png()
          .toBuffer();
        req.user.saveFile = buffer;
      }

      const save = await req.user.save(err => {
        if (err) {
          return new Error('Unavailable');
        }
        console.log('saved');
      });

      res.redirect('/dashboard');
    } catch (err) {
      console.log(err);
      res.send({ error: 'temporary unavailable' });
    }
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

// var server = app.listen(3000, () => {
//   console.log('server is running on port: ', server.address().port);
// });

app.listen(3000 || process.env.PORT, err => {
  if (err) console.log(err);
  console.log('success on port');
});
