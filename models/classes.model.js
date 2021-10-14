const mongoose = require('mongoose')

var classSchema = new mongoose.Schema({
    name: String,
    students: Object,
    teachers: Object,
    subjects: Object,
    timetable: Object,
    attendance: Object,
    assignments: Object
})

mongoose.model('classes', classSchema)