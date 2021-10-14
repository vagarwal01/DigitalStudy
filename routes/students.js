const { response } = require('express');
const express = require('express'),
    multer = require('multer'),
    mongoose = require('mongoose');
const router = express.Router();
var ObjectId = require("mongodb").ObjectID

const userModel = mongoose.model('users')
const classModel = mongoose.model('classes')

var storage3 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + "/uploads/assignments/" + req.params.id);
    },
    filename: (req, file, cb) => {
        var filename = req.session.userid + '_' + req.session.name.split(" ")[0]  + '.' + file.originalname.split('.')[1]
        cb(null, filename);
    },

})
var uploadAssn = multer({ storage: storage3 });
module.exports = uploadAssn;

router.get('/', (req, res) => {
    userModel.findOne({'userEmail': req.session.email}, (err, user) => {
        console.log(user)
        console.log(user.userId)
        if(user.cls) { 
            var cls = user.cls
            classModel.findOne({'name': cls}, {subjects: 1, students: 1}, (err, doc) => {
                console.log(doc)
                console.log(Object.keys(doc.subjects).length)
                console.log('hi')
                var sub = doc.students[user.userId]['subjects']
                console.log(sub)
                res.render('frontstu', { data: doc.subjects, mysub: sub, message: 'hi', cls: cls });
            })
        } else {
            res.send('You are not logged in')
        }
    })
})

router.post('/mobileapi', (req, res) => {
    email = req.body.email
    userModel.findOne({'userEmail': email}, (err, user) => {
        console.log(user)
        var cls = user.cls
        classModel.findOne({'name': cls}, {subjects: 1, students: 1}, (err, doc) => {
            console.log(doc)
            console.log(Object.keys(doc.subjects).length)
            console.log('hi')
            var sub = doc.students[user.userId]['subjects']
            console.log(sub)
            res.json({data: doc.subjects, mysub: sub, cls: cls})
        })
    })
})

router.get('/get/attendance/:cls', (req, res) => {
    console.log(req.params.cls)
    var cls = (req.params.cls).split('::')[0]
    classModel.findOne({'name': cls}, {attendance: 1}, (err, att)=> {
        if(err) {
            console.log(err)
            res.json({msg: 'err'})
        } else {
            var uid = req.session.userid
            res.render('attendance', {att: att['attendance'], uid: uid, subj: (req.params.cls).split('::')[1]})        
        }
    })
})
router.post('/get/attendance/:cls', (req, res) => {
    console.log(req.params.cls)
    var cls = (req.params.cls).split('::')[0]
    classModel.findOne({'name': cls}, {attendance: 1}, (err, att)=> {
        if(err) {
            console.log(err)
            res.json({msg: 'err'})
        } else {
            userModel.findOne({'userEmail': req.body.email}, {userId: 1}, (err, user) => {
                if(err) {
                    console.log(err)
                    res.json({msg: 'err'})
                } else {
                    var uid = user.userId
                    console.log(uid)
                    res.json({att: att['attendance'], uid: uid, subj: (req.params.cls).split('::')[1]})        
                }
            })
        }
    })
})
router.get('/get/overall-attendance/:cls', (req, res) => {
    console.log(req.params.cls)
    var cls = (req.params.cls).split('::')[0]
    var sub = (req.params.cls).split('::')[1]
    classModel.findOne({'name': req.params.cls}, {attendance: 1}, (err, att)=> {
        if(err) {
            console.log(err) 
            res.json({msg: 'err'}) 
        } else {  
            var uid = req.session.userid
            console.log(att['attendance'])
            res.render('overall_att', {att: att['attendance'], uid: uid})
        }
    })
})

router.get('/get/assignments/:cls', (req, res) => {
    var cls = (req.params.cls).split('::')[0]
    classModel.findOne({'name': cls}, {assignments: 1}, (err, assn) => {
        if(err) {
            console.log(err) 
            res.json({msg: 'err'}) 
        } else {
            console.log(assn)
            console.log(req.session.userid)
            res.render('assignmentS', {data: assn['assignments'], cls: cls, sysid: req.session.userid})
        }
    })
})
router.post('/api/upload/assignment/:id', uploadAssn.single("uploadfileByStu"), (req, res) => {
    console.log(req.file)
    console.log(req.body)
    var md = {}
    var mdkey = 'assignments.'+req.params.id+'.uploads.'+req.session.userid
    md[mdkey] = {'date': new Date(), 'filename': req.file.filename}
    var md2 = {}
    var md2key = 'assignments.'+req.params.id+'.total_uploads'
    md2[md2key] = 1
    var newVal = {$set: md, $inc: md2}
    classModel.updateOne({name: req.body.classDB}, newVal, (err, up) => {
        if(err) {
            console.log(err) 
            res.json({msg: 'err'}) 
        } else {
            res.json({msg: 'suc'})
        }
    })
})
module.exports = router;