const Course = require('../model/Course');
const User = require('../model/User');
const Task = require('../model/Task');

const createNewCourse = async (req, res) => {
    if (!req?.body?.courseName) {
        return res.status(400).json({ "message": "Course name is required." });
    }
    if (!req.cookies?.jwt) {
        return res.status(401).json({ message: 'No token found in cookies' });
    }
    try {
        const token = req.cookies.jwt;
        const foundUser = await User.findOne({ token });

        //create and store the new course record with mongoose
        const newCourse = await Course.create({
            courseName: req.body.courseName,
            user: foundUser._id,
            folderColor: req.body.folderColor
        });

        //push the course's objectId onto the user's courses array & save the change
        foundUser.courses = foundUser.courses || [];
        foundUser.courses.push(newCourse._id);
        await foundUser.save();

        //http 201 means created successfully
        res.status(201).json(newCourse);
    } catch (err) {
        console.error(err);
    }
}

/*
const getAllCourses = async (req, res) => {
    if (!req.cookies.jwt) {
        return res.status(401).json({ message: 'No valid Token or Cookie found associated with this session' });
    }
    try {
        const token = req.cookies.jwt;

        // MongoDB still holds only ObjectID references
        // At runtime, in Node.js memory, user.courses becomes full Course documents with populate
        // Populate just makes your JavaScript code nicer, not the stored documents richer.
        const foundUser = await User.findOne({ token }).populate('courses');
        res.status(201).json(foundUser);
    } catch (err) {
        console.error(err);
    }
}
*/

const getAllCourses = async (req, res) => {
  if (!req.cookies.jwt) {
    return res
      .status(401)
      .json({ message: 'No valid Token or Cookie found associated with this session' });
  }
  try {
    const token = req.cookies.jwt;

    // 1) Find the user and populate BOTH courses and their nested tasks
    const foundUser = await User.findOne({ token })
      .populate({
        path: 'courses',
        populate: { path: 'tasks' }
      })
      .exec();
    if (!foundUser) return res.sendStatus(401);

    // 2) Return exactly the array of courses
    return res
      .status(200)                // 200 OK for GET
      .json(foundUser.courses);  // front end gets an array directly
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
}






const updateCourse = async (req, res) => {
  const { id, courseName } = req.body;
  const token              = req.cookies.jwt;

  //  Validate inputs & auth (everything is not vital for our project)
  if (!id)         return res.status(400).json({ message: 'Course ID required.' });
  if (!courseName) return res.status(400).json({ message: 'New courseName required.' });
  if (!token)      return res.status(401).json({ message: 'Authentication required.' });

  try {
    
    const user = await User.findOne({ token }).exec();
    if (!user) {
      console.error('updateCourse: no user for token', token);
      return res.status(401).json({ message: 'Invalid session.' });
    }

    if (!user.courses.includes(id)) {
      console.error(`updateCourse: user ${user._id} does not own course ${id}`);
      return res.status(403).json({ message: 'Not allowed to update this course.' });
    }

    // Load & update the Course document
    const course = await Course.findById(id).exec();
    if (!course) {
      console.error('updateCourse: course not found', id);
      return res.status(404).json({ message: `No course with id ${id}.` });
    }

    course.courseName = courseName;
    const updated = await course.save();
    console.log(`updateCourse: course ${id} renamed to "${courseName}"`);

    // return the updated document
    return res.json(updated);

  } catch (err) {
    console.error('🔥 updateCourse error:', err);
    return res.status(500).json({ message: 'Server error updating course.' });
  }
};



const deleteCourse = async (req, res) => {
  const { id }    = req.body;
  const token     = req.cookies.jwt;

  if (!id)    return res.status(400).json({ message: 'Course ID required.' });

  try {
    console.log('deleteCourse: incoming id=', id, 'token=', token);

    // Authentication (not vital for our project)
    const user = await User.findOne({ token }).exec();
    if (!user) {
      console.error('deleteCourse: no user for token');
      return res.status(401).json({ message: 'Invalid session.' });
    }

    
    if (!user.courses.includes(id)) {
      console.error(`deleteCourse: user ${user._id} does not own course ${id}`);
      return res.status(403).json({ message: 'Not allowed to delete this course.' });
    }

    // Load & delete the Course document
    const course = await Course.findById(id).exec();
    if (!course) {
      console.error('deleteCourse: course not found', id);
      return res.status(404).json({ message: `No course with id ${id}.` });
    }
    console.log('deleteCourse: deleting course doc', course.courseName);
    await course.deleteOne();

    // Pull out that course ID from the user document and save
    user.courses = user.courses.filter(cid => cid.toString() !== id);
    console.log(`deleteCourse: user.courses now = [${user.courses.join(',')}]`);
    await user.save();

    // delete all Tasks tied to that course
    const del = await Task.deleteMany({ course: id }).exec();
    console.log(`deleteCourse: deleted ${del.deletedCount} tasks for course ${id}`);

    
    return res.json({ message: `Course "${course.courseName}" and its ${del.deletedCount} task(s) deleted.` });
  } catch (err) {
    console.error('🔥 deleteCourse error:', err);
    return res.status(500).json({ message: 'Server error deleting course.' });
  }
};




module.exports = {
    createNewCourse,
    getAllCourses,
    updateCourse,
    deleteCourse
};