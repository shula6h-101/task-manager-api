const express = require('express');
const Task = require("../models/task");
const router = new express.Router();
const auth  = require('../middleware/auth');

router.post('/tasks', auth, async (req, res) => {
  const task = new Task({ ...req.body, owner: req.user._id })
  try{
    await task.save();
    res.status(201).send(task)
  }catch (e) {
    res.status(500).send(e);
  }
})

// GET /tasks?completed=true
// GET /tasks?limit=5&skip=0
// GET /tasks?sortBy=createdAt_desc
router.get('/tasks', auth, async (req, res) => {
  const match = req.query?.completed ? {completed: req.query.completed === 'true'}: {};
  const sort = {};
  
  if(req.query.sortBy){
    const part = req.query.sortBy.split('_');
    sort[part[0]] = part[1] === 'asc'? 1: -1;
  }
  
  try{
    await req.user.populate({
      path: 'tasks',
      match,
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort
      }
    });
    res.send(req.user.tasks);
  }catch(e){
    res.status(404).send(e);
  }
})

router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id;

  try{
    const task = await Task.findOne({ owner: req.user._id, _id});
    if(!task){
      return res.status(404).send();
    }
    return res.send(task);
  }catch(e){
    res.status(500).send(e);
  }
})

router.patch('/tasks/:id', auth, async(req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['description', 'completed'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if(!isValidOperation){
    return res.status(400).send({error: 'Invalid Update!'});
  }

  try{
    const task = await Task.findOne({_id: req.params.id, owner: req.user._id});
    if(!task){
      return res.status(404).send();
    }
    updates.forEach((update) => task[update]=req.body[update]);
  
    await task.save();
    return res.send(task);
  }catch (e) {
    res.status(400).send({error: e});
  }
})

router.delete('/tasks/:id', auth, async (req, res) => {
  try{
    const task = await Task.findOneAndDelete({_id: req.params.id, owner: req.user._id});
    if(!task){
      return res.status(404).send();
    }
    return res.send(task);
  }catch (e) {
    res.status(500).send();
  }
})

module.exports = router;
