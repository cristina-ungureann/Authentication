const express = require('express');
const bcrypt = require ('bcryptjs');

const db = require('../data/database');

const router = express.Router();

router.get('/', function (req, res) {
  res.render('welcome');
});

router.get('/signup', function (req, res) {
  let sessionInputData = req.session.inputData;

  if(!sessionInputData){
    sessionInputData = {
      hasError: false,
      email:'',
      confirmEmail:'',
      password:''
    }
  }

  req.session.inputData = null;
  res.render('signup', {inputData: sessionInputData});
});

router.get('/login', function (req, res) {
  let sessionInputData = req.session.inputData;

  if(!sessionInputData){
    sessionInputData = {
      hasError: false,
      email:'',
      password:''
    }
  }
  req.session.inputData = null;
  res.render('login', {inputData: sessionInputData});
});



router.post('/signup', async function (req, res) {
  const inputData = req.body;
  const enteredEmail = inputData.email;
  const confirmEmail = inputData['confirm-email'];
  const enteredPassword = inputData.password;

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  const user = { 
    email: enteredEmail,
    password: hashedPassword
  }

  if(!enteredEmail || !confirmEmail || !enteredPassword || enteredPassword.trim()<6 || enteredEmail !== confirmEmail || !enteredEmail.includes('@')){
    req.session.inputData = {
      hasError: true,
      message: 'Invalid input - please check your data.',
      email: enteredEmail,
      confirmEmail: confirmEmail,
      password: enteredPassword
    }
   
    req.session.save(function(){
      res.redirect('/signup');
    })
    return;
  }

  const existingUser = await db.getDb().collection('users').findOne({email: enteredEmail});

  if(existingUser){
    req.session.inputData = {
      hasError: true,
      message: 'User already exist!',
      email: enteredEmail,
      confirmEmail: confirmEmail,
      password: enteredPassword
    };

    req.session.save(function(){
      res.redirect('/signup')
    })
    return;
  }

  await db.getDb().collection('users').insertOne(user);

  res.redirect('/login');
});

router.post('/login', async function (req, res) {
  const inputData = req.body;
  const enteredEmail = inputData.email;
  const enteredPassword = inputData.password;

  const existingUser = await db.getDb().collection('users').findOne({email: enteredEmail});

  if(!existingUser){
    req.session.inputData = {
      hasError: true,
      message: 'Could not log you in - please check your credentials!',
      email: enteredEmail,
      password: enteredPassword
    }
    req.session.save(function(){
      res.redirect('/login')
    })
    return;
  }

  const passwordsAreEqual = await bcrypt.compare(enteredPassword, existingUser.password)

  if(!passwordsAreEqual){
    req.session.inputData = {
      hasError: true,
      message: 'Could not log you in - please check your credentials!',
      email: enteredEmail,
      password: enteredPassword
    }

    req.session.save(function(){
      res.redirect('/login')
    })
    return;
  }

  req.session.user = { 
    id: existingUser._id,
    email: existingUser.email
  }
 req.session.isAuthenticated = true;

 req.session.save(function(){
  console.log("User is authenticated");
  res.redirect('/profile');
 })
 
});

router.get('/admin', async function (req, res) {
  if(!req.session.isAuthenticated){
    return res.status(401).render('401');
  }
  const user = await db.getDb().collection('users').findOne({_id: req.session.user.id})

  if(!user || !user.isAdmin){
    res.status(403).render('403');
  }
  res.render('admin');
});

router.get('/profile', function(req, res){
  if(!req.session.isAuthenticated){
    return res.status(401).render('401');
  }
  res.render('profile');
})

router.post('/logout', function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect('/') 

});

module.exports = router;
