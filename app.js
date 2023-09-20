const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const express = require('express');
const db = require('./data/database');
const demoRoutes = require('./routes/demo');
const { get } = require('http');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

const sessionStore = new MongoDBStore({
  uri: 'mongodb://localhost:27017',
  databaseName: 'demo',
  collection: 'sessions'
});

app.use(session({
  secret: 'super-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

app.use(async function(req, res, next){
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;

  if(!user || !isAuth){
    return next();
  }

  const userDoc = await db.getDb().collection('users').findOne({_id: user.id})
  const isAdmin = userDoc.isAdmin;

  res.locals.isAuth = isAuth;
  res.locals.isAdmin = isAdmin;

  next();
})


app.use(demoRoutes);

app.use(function(error, req, res, next) {
  console.error(error); // Log the error for debugging purposes
  res.status(500).render('500'); // Respond with a 500 status and render an error page
  next(error); // Propagate the error
});

db.connectToDatabase().then(function () {
  app.listen(30001, () => {
    console.log('Started running on port 30001');
  });
});
