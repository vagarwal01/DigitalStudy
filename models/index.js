const mongoose = require('mongoose')

mongoose.connect("mongodb+srv://VAadmin:admin@*2021@cluster0.g7fsc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('success')
    }
})

const user = require('./users.model')
const cls = require('./classes.model')
