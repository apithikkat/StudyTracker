require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const validateCookie = require('./middleware/validateCookie');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const PORT = process.env.port || 5000;
const User = require('./model/User');

//connect to mongodb
connectDB();

//CORS: cross origin resource sharing
app.use(cors(corsOptions));

//built-in middleare to handle url encoded data aka, form data:
//'content-type: application/x-www-form-urlencoded'
app.use(express.urlencoded({ extended: false }));

//built-in middleware for json, supplied to all routes as it comes in
app.use(express.json());

//middleware for cookies
app.use(cookieParser())

app.get("/api", async (req, res) => {
    try {
        const users = await User.find({}, 'name roles');
        const filtered = users.filter(user => !user.roles || !user.roles.Admin);
        const usernames = filtered.map(user => user.name);
        res.json({ users: usernames });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.use('/', require('./routes/removeStudent'));
app.use('/', require('./routes/root'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));

//need a valid session and JWT Token in the Cookie for routes below
app.use(validateCookie)
app.use('/tasks', require('./routes/api/tasks'))
app.use('/courses', require('./routes/api/courses'))
app.use('/logout', require('./routes/logout'))

//backend server on port 5000, client server (REACT) running on port 3000
//only listen for requests if we dont connect to mongoose
mongoose.connection.once('open', () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});