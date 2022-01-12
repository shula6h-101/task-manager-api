const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const User = require("../models/user");
const auth = require('../middleware/auth');
const router = new express.Router();

//Create user
router.post('/users', async (req, res) => {
  const user = new User(req.body);
  try {
    const token = await user.generateAuthToken();
    res.status(201).send({user, token});
  }catch (e){
    res.status(400).send(e);
  }
})

//Login user
router.post('/users/login/', async (req, res) => {
  try{
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateAuthToken();
    res.send({user, token});
  }catch (e) {
    res.status(400).send(e.message);
  }
});

//Logout user
router.post('/users/logout', auth, async (req, res) => {
  try{
    req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token);
    await req.user.save();
    
    res.send();
  }catch (e) {
    res.status(500).send();
  }
});

//Logout all sessions
router.post('/users/logoutAll', auth, async (req, res) => {
  try{
    req.user.tokens = [];
    await req.user.save();
    
    res.send();
  }catch (e) {
    res.status(500).send();
  }
})

//User profile
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
})

// File upload
const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req, file, cb) {
    if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
      return cb(new Error('Please upload an image file(png, jpg, jpeg).'))
    }
    cb(undefined, true);
  }
});

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  req.user.avatar = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer();
  await req.user.save();
  res.send(req.user);
}, (error, req, res, next) => {
  res.status(400).send({error:error.message});
})

//Serving avatar
router.get('/users/:id/avatar', async (req, res) => {
  try{
    const user = await User.findById(req.params.id);
    
    if(!user || !user.avatar){
      throw new Error();
    }
    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  }catch (e) {
    res.status(404).send();
  }
})

//Update user
router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'age', 'password', 'email'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
  
  if(!isValidOperation){
    return res.status(400).send({error: 'Invalid Update!'});
  }
  
  try{
    // const user  = await User.findById(req.params.id);
    // if(!user){
    //   return res.status(404).send();
    // }
    
    updates.forEach((update) => req.user[update] = req.body[update]);
    await req.user.save();
    
    return res.send(req.user);
  }catch (e) {
    res.status(400).send(e);
  }
})

//Delete avatar
router.delete('/users/me/avatar', auth, async (req, res) => {
  try{
    req.user.avatar = undefined;
    await req.user.save();
    return res.send();
  }catch (e) {
    res.status(500).send();
  }
})

//Delete user
router.delete('/users/me', auth, async (req, res) => {
  try{
    // const user = await User.findByIdAndDelete(req.params.id);
    // if(!user){
    //   return res.status(404).send();
    // }
    await req.user.remove();
    return res.send(req.user);
  }catch (e) {
    res.status(500).send();
  }
})

module.exports = router;
