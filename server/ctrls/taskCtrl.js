
const Task   = require('../model/Task');
const Course = require('../model/Course');
const User   = require('../model/User');
//test test test


// GET /tasks
// Return all tasks for the user (across all their courses)
const getAllTasks = async (req, res) => {
  const token = req.cookies?.jwt;
  if (!token) return res.status(401).json({ message: 'No token.' });

  const user = await User
    .findOne({ token })
    .populate({
      path: 'courses',
      populate: { path: 'tasks' }
    })
    .exec();
  if (!user) return res.sendStatus(401);

  const tasks = user.courses.flatMap(c => c.tasks);
  return res.json(tasks);
};

// POST /tasks
// Create a new task under a given course
// Body: { taskname: string, course: ObjectId }

const createNewTask = async (req, res) => {
  const { taskname, course: courseId } = req.body;
  const token = req.cookies?.jwt;

  if (!taskname) return res.status(400).json({ message: 'Task name is required.' });
  if (!courseId) return res.status(400).json({ message: 'Course ID is required.' });
  if (!token)    return res.status(401).json({ message: 'Authentication required.' });

  //Auth & ownership
  const user = await User.findOne({ token }).exec();
  if (!user || !user.courses.includes(courseId)) {
    return res.status(403).json({ message: 'Not allowed to add tasks to this course.' });
  }

  //Create the Task
  const newTask = await Task.create({ taskname, course: courseId });

  // Load the Course, push the task ID, then save
  const course = await Course.findById(courseId).exec();
  course.tasks = course.tasks || [];
  course.tasks.push(newTask._id);
  await course.save();

  return res.status(201).json(newTask);
};


// PUT /tasks
// Update a task’s name or completion flag
// Body: { id: ObjectId, taskname?: string, completed?: boolean }

const updateTask = async (req, res) => {
  const { id, taskname, completed } = req.body;
  const token = req.cookies?.jwt;
  if (!id)    return res.status(400).json({ message: 'Task id required.' });
  if (!token) return res.status(401).json({ message: 'No token.' });

  const user = await User.findOne({ token }).exec();
  if (!user) return res.sendStatus(401);

  const task = await Task.findById(id).exec();
  if (!task) return res.status(404).json({ message: `No task with id ${id} found.` });
  if (!user.courses.includes(task.course.toString())) {
    return res.status(403).json({ message: 'Not allowed to update this task.' });
  }

  if (taskname)                     task.taskname = taskname;
  if (typeof completed === 'boolean') task.completed = completed;
  const updated = await task.save();

  return res.json(updated);
};


// DELETE /tasks
// Remove a task by id
// Body: { id: ObjectId }

const deleteTask = async (req, res) => {
  const { id } = req.body;
  const token = req.cookies?.jwt;
  if (!id)    return res.status(400).json({ message: 'Task id required.' });
  if (!token) return res.status(401).json({ message: 'No token.' });

  const user = await User.findOne({ token }).exec();
  if (!user) return res.sendStatus(401);

  const task = await Task.findById(id).exec();
  if (!task) return res.status(404).json({ message: `No task with id ${id}` });
  if (!user.courses.includes(task.course.toString())) {
    return res.status(403).json({ message: 'Not allowed to delete this task.' });
  }

  // Remove the Task document
  await task.deleteOne();



  //Pull its ID out of the parent Course and save
  const course = await Course.findById(task.course).exec();
  if (course) {
    course.tasks = (course.tasks || []).filter(
      tid => tid.toString() !== id
    );
    await course.save();
  }

  return res.json({ message: 'Task deleted.' });
};

module.exports = { getAllTasks, createNewTask, updateTask, deleteTask };
