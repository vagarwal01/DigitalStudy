const mongoose = require('mongoose')

var userSchema = new mongoose.Schema({
    userName: String,
    userEmail: String,
    userPhoto: String,
    userId: String,
    userType: String,
    cls: String,
    subjects: Object
})

mongoose.model('users', userSchema)