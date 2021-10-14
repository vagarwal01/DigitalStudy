const { response } = require('express');
const express = require('express'),
    mongoose = require('mongoose'),
    multer = require('multer'),
    fs = require("fs"),
    xlsxFile = require('read-excel-file/node');
const router = express.Router();
var ObjectId = require("mongodb").ObjectID
const nodemailer = require('nodemailer');

const userModel = mongoose.model('users')
const classModel = mongoose.model('classes')

var storage = multer.memoryStorage()
var upload = multer({ storage: storage });
module.exports = upload;

var storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + "/uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },

})
var uploadFile = multer({ storage: storage2 });
module.exports = uploadFile;

var storage3 = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = __basedir + "/uploads/assignments/" + req.params.id
        console.log(dir)
        if (!fs.existsSync(dir)) {
            console.log('!fs')
            fs.mkdirSync(dir, { recursive: true })
        }
        return cb(null, dir)
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },

})
var uploadAssn = multer({ storage: storage3 });
module.exports = uploadAssn;

router.get('/', (req, res) => {
    userModel.findOne({'userEmail': req.session.email}, {'subjects': 1}, (err, user) => {
        console.log(user)
        console.log(user.subjects)
        res.render('front', { data: user.subjects, message: 'hi' });
    })
})
router.post('/mobileapi', (req, res) => {
    email = req.body.email
    userModel.findOne({'userEmail': email}, {'subjects': 1}, (err, user) => {
        console.log(user)
        // console.log(user.subjects)
        var data = (!user.subjects || Object.keys(user.subjects).length == 0) ? {} : user.subjects
        console.log(data)
        res.json({data: data})
    })
})

//forming class
router.get('/forming_a_class', (req, res) => { 
    res.render('forming_a_class');
})
router.post('/api/create/newClass', (req, res) => {
    var dbname = req.body.cls + req.body.section;
    classModel.findOne({'name': dbname}, (err, doc) => {
        if(err) {
            res.json({'status': 'err', 'mssg': 'There occurred some problem. Please try after some time.'});
        } else {
            if(doc) {
                res.json({'status': 'suc', 'mssg': 'This class is already formed.'})
            } else {
                var newClass = new classModel()
                newClass.name = dbname
                newClass.save((err, cls) => {
                    console.log(cls)
                    res.json({'status': 'success'});
                })    
            }
        }
    })
})
router.post('/api/upload/subjectFacList', uploadFile.single("subjectList"), (req, res) => {
    var path = __basedir + "/uploads/" + req.file.originalname;
    var sub = {}
    xlsxFile(path).then((rows) => {
        for (var i = 1; i < rows.length; i++) {
            sub[rows[i][2]] = {
                'name': rows[i][1],
                'faculty': rows[i][3],
                'status': false
            }    
        }
        console.log(sub)
        console.log(req.body.class)
        var newVal = {$set: {'subjects': sub}}
        classModel.updateOne({'name': req.body.class}, newVal, (err, resp) => {
            if(err) {
                console.log(err)
                res.json({status: 'err', 'mssg': 'There occurred some problem. Please try after some time.'});
            } else {
                console.log('succ')
                fs.unlink(path, (err) => {
                    if (err) {
                        console.log(err)
                        res.json({'status': 'err', 'mssg': err})
                    };
                    res.json({'status': 'success'});
                });        
            }
        })    
    });
})
router.post('/api/upload/studentList', uploadFile.single("studentList"), (req, res) => {
    console.log(req.file);

    var path = __basedir + "/uploads/" + req.file.originalname;

    st = {}
    var stlist = []
    xlsxFile(path).then((rows) => {
        // console.log(rows);
        console.table(rows);
        for (var i = 1; i < rows.length; i++) {
            console.log('ne ' + i)
            var newUser = new userModel
            newUser.userEmail = rows[i][2]
            newUser.userId = rows[i][1]
            newUser.cls = req.body.class
            newUser.userType = 'student'
            newUser.save((err, user) => {
                console.log(user.userId);
                st[user.userId] = {}
                st[user.userId]['status'] = false
                st[user.userId]['email'] = user.userEmail
                st[user.userId]['subjects'] = []
                stlist.push(user.userEmail)
            })
        }
    })
    setTimeout(() => {
        console.log(st)
        newVal = {$set: {'students': st}}
        classModel.updateOne({'name': req.body.class}, newVal, (err, user) => {
            fs.unlink(path, (err) => {
                if (err) res.json({'status': 'err', 'mssg': err});
                var trans = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'agarwalriya0101@gmail.com',
                        pass: 'riya01012000'
                    }
                });

                var text = 'hello. this is a testing mail.';

                const mailOpt = {
                    from: 'agarwalriya0101',
                    // to: stlist,
                    to: '2018006465.vedangi@ug.sharda.ac.in',
                    subject: 'New class added',
                    text: text,
                    html: 'Dear student,<br>you have been assigned to a class - <b>'+req.body.class+'</b>. You are therefore requested to <b>register yourself</b> to avoid any conflicts in future.<br><br>Click on this link to register yourself.<br>http://localhost:8000'
                };

                trans.sendMail(mailOpt, function(error, info) {
                    console.log('ok');
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('message sent: ' + info.response);
                        res.json({'status': 'success'});
                    };
                });
            });    
        })                 
    }, 3000);
})
router.post('/api/get/classTimeTable', uploadFile.single("timeTable"), (req, res) => {
    console.log(req.file);

    var path = __basedir + "/uploads/" + req.file.originalname;

    xlsxFile(path).then((rows) => {
        console.log(rows);
        console.table(rows);
        fs.unlink(path, (err) => {
            if (err) res.json({'status': 'err', 'mssg': err});
            res.json(rows);
        });
    });
})
router.post('/api/upload/timeTable', uploadFile.single("timeTable"), (req, res) => {
    console.log(req.file);

    var path = __basedir + "/uploads/" + req.file.originalname;

    xlsxFile(path).then((rows) => {
        console.log(rows);
        console.table(rows);
        var tt = {}
        for (var i = 1; i < rows.length; i++) {
            tt[rows[i][0]] = [rows[i][1], rows[i][2], rows[i][3], rows[i][4], rows[i][5]]
        }
        console.log(tt)
        var newVal = {$set: {'timetable': tt}}
        classModel.updateOne({'name': req.body.class}, newVal, (err, user) => {
            fs.unlink(path, (err) => {
                if (err) res.json({'status': 'err', 'mssg': err});
                res.json({'status': 'success'});
            });
        })
    });
})
router.post('/api/upload/classTimeTable', (req, res) => {
    console.log('called');
    const tdata = req.body;
    var tt = {}
    for (var i = 1; i < Object.keys(tdata).length; i++) {
        tt[tdata[i][0]] = [tdata[i][1], tdata[i][2], tdata[i][3], tdata[i][4], tdata[i][5]]
    }
    console.log(tt)
    var newVal = {$set: {'timetable': tt}}
    classModel.updateOne({'name': tdata.class}, newVal, (err, user) => {
        res.json({'status': 'success'});
    })
}) 

//creating a group
router.get('/creating_a_group', (req, res) => {
    res.render('creating_a_group');
})
router.post('/api/update/subject_list', (req, res) => {
    console.log('called');
    console.log(req.body);
    var sub = req.body.subject.toUpperCase()
    var md = {}
    var mdkey = 'subjects.' + sub + '.status'
    console.log(mdkey)
    md[mdkey] = true
    var newVal = {$set: md}
    classModel.updateOne({'name': req.body.cls}, newVal, (err, resp) => {
        if(err) res.json({'status': 'err', 'mssg': err});
        else {
            classModel.findOne({'name': req.body.cls}, {subjects: 1}, (err, doc) => {
                if(err) res.json({'status': 'err', 'mssg': err});
                else {
                    // console.log(doc)
                    console.log(sub)
                    console.log(doc['subjects'][sub])
                    console.log(doc[sub])
                    var md = {}
                    var key = req.body.cls + '_' + req.body.subject
                    var mdkey = 'subjects.' + key
                    md[mdkey] = {'class': req.body.cls, 'subjectCode': req.body.subject, 'subject': doc['subjects'][sub]['name']}
                    var newVal = {$set: md}
                    if(req.body.email) {
                        var email = req.body.email
                    } else {
                        var email = req.session.email
                    }
                    console.log(email)
                    userModel.updateOne({'userEmail': email}, newVal, (err, resp2) => {
                        if(err) res.json({'status': 'err', 'mssg': err});
                        else res.json({'status': 'success'});
                    })
                }
            })
        }
    })
})
router.post('/api/add/description', (req, res)=> {
    var sub = req.body.subject.toUpperCase()
    var md = {}
    var mdkey = 'subjects.' + sub + '.description'
    md[mdkey] = req.body.des
    var newVal = {$set: md}
    classModel.updateOne({'name': req.body.cls}, newVal, (err, resp) => {
        if(err) res.json({'status': 'err', 'mssg': err});
        else res.json({'status': 'success'});
    })
})
router.get('/get/studentEmails/:cls', (req, res) => {
    classModel.findOne({'name': req.params.cls}, {students: 1}, (err, docs) => {
        if(err) res.json({'status': 'err', 'mssg': err});
        else {
            console.log(docs['students'])
            res.json(docs['students'])
        }
    })
})
router.post('/api/savenewgroup', (req, res) => {
    console.log('save new grp...........')
    console.log(req.body)
    if (req.body.students[0] == 'on') {
        req.body.students.shift();
    }
    var md = {}
    for(var i=0;i<req.body.students.length; i++) {
        var id = req.body.students[i]
        var mdkey = 'students.' + id + '.subjects'
        md[mdkey] = req.body.subject.toUpperCase()
        console.log(md)
    }
    console.log(md)
        var newVal = {$push: md}   
        classModel.updateOne({'name': req.body.cls}, newVal, (err, resp) => {
            if(err) {
                console.log(err)
                res.json({'status': 'err', 'mssg': err});
            }
            else {
                console.log('suc')
                res.json({'status': 'success'});
            }
        }) 
    // setTimeout(() => {
        
    // }, 3000);
})
router.get('/get/assignments/:cls', (req, res) => {
    var cls = (req.params.cls).split('_')[0]
    classModel.findOne({'name': cls}, {assignments: 1}, (err, assn) => {
        if(err) {
            console.log(err) 
            res.json({msg: 'err'}) 
        } else {
            console.log(assn)
            res.render('assignmentF', {data: assn['assignments'], cls: cls})
        }
    })
})
router.get('/delete/assignment/:cls/:id', (req, res) => {
    var cls = (req.params.cls).split('_')[0]
    var path = __basedir+'/uploads/assignments/'+req.params.id
    fs.rmdir(path, { recursive: true }, (err) => {
        if (err) {
            console.log(err)
            res.json({'status': 'err', 'mssg': err})
        } else {
            var md = {}
            var mdkey = 'assignments.' + req.params.id
            md[mdkey] = ""
            classModel.updateOne({name: cls}, {$unset: md}, (err, up) => {
                if(err) {
                    console.log(err) 
                    res.json({msg: 'err'}) 
                } else {
                    res.json({msg: 'suc'})
                }
            })        
        }
    });        
})
router.post('/api/upload/assignment/:cls/:id', uploadAssn.single("uploadfileByFac"), (req, res) => {
    console.log(req.file)
    console.log(req.body)
    console.log(req.params.cls)
    var cls = req.params.cls.split('_')[0];
    var subjectCode = req.params.cls.split('_')[1];

    var id = req.params.id
    if (req.body.uploadTime.length < 1) {
        var dt = new Date();
        var date = dt.toISOString().split("T")[0] + 'T' + dt.getHours() + ':' + dt.getMinutes();
    } else {
        var date = req.body.uploadTime;
    }
    var md = {}
    var mdkey = 'assignments.'+id
    md[mdkey] = {subject: subjectCode, assnNo: req.body.assno, file_name: req.file.filename, upload_time: date}
    var newVal = {$set: md}
    classModel.updateOne({name: cls}, newVal, (err, up) => {
        if(err) {
            console.log(err) 
            res.json({msg: 'err'}) 
        } else {
            res.json({status: 'suc'})        
        }
    })
})
router.post('/fileupload', uploadFile.single("file"), (req, res) => {
    console.log(req.file);
    res.json({status: 'suc'})
})
router.post('/try', (req, res) => {
    // console.log(req.file);
    console.log(req.body.email)
    res.json({status: 'suc'})
})

module.exports = router;