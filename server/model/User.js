const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    roles: {
        User: {
            type: Number,
            default: 2222
        },
        Admin: Number
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: false
    },
    courses: [{
        type: Schema.Types.ObjectId,
        ref: "Course"
    }]
});

module.exports = mongoose.model("User", UserSchema);