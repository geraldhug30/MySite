const express = require('express');
const http = require('http');
const helmet = require('helmet');
const hpp = require('hpp');
const bodyParser = require('body-parser');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
var cookieParser = require('cookie-parser');

//file routing
const Users = require('./models/users');
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

app.post('/register', async (req, res) => {
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
});

app.get('/dashboard', auth, (req, res) => {
  try {
    res.render('dashboard', { user: req.user });
  } catch (err) {
    res.send({ error: 'error' });
  }
});

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

// upload file usesing multer
const multer = require('multer');
const sharp = require('sharp');
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
  upload.single('uploadF'),
  auth,
  async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['fname', 'uname', 'email', 'confirmPassword'];
    const isValidUpdates = updates.every(update =>
      allowedUpdates.includes(update)
    );
    if (!isValidUpdates) {
      error.push({ msgPassword: 'error password updates' });
      return res.redirect('/profile');
    }
    console.log(updates);
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

      await req.user.save(err => {
        if (err) console.log(err);
        console.log('saved');
      });

      res.redirect('/dashboard');
    } catch (err) {
      console.log(err);
    }
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

var server = app.listen(3000, () => {
  console.log('server is running on port: ', server.address().port);
});
