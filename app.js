const connection = require('./models')

const stroutes = require('./routes/students')
const fcroutes = require('./routes/teachers')

const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
const bodyparser = require('body-parser')



const xl = require('excel4node');
const wb = new xl.Workbook();
const ws = wb.addWorksheet('Attendance');
const nodemailer = require('nodemailer');





app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'uploads')));
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json());
global.__basedir = __dirname;

// const { response } = require('express');
// const router = express.Router();
var ObjectId = require("mongodb").ObjectID

const userModel = mongoose.model('users')
const classModel = mongoose.model('classes')

require('dotenv').config()
const passport = require('passport')
const cookieSession = require('cookie-session')
require('./passport-setup')
app.use(cookieSession({
    name: 'tuto-session',
    keys: ['key1', 'key2']
}));
app.use(passport.initialize());
app.use(passport.session());
const { createConnection } = require("net")
const router = require('./routes/students')
const isLoggedIn = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
};
app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
app.get('/google/callback', passport.authenticate('google', { failureRedirect: '/failed' }),
    function(req, res) {
        console.log(req.user.displayName)
        console.log(req.user.email)
        console.log(req.user.picture)
        res.redirect('/success-web');
    }
)
app.get('/failed', (req, res) => res.send({'msg':'You Failed to log in!'}))
// app.get('/success', (req, res) => res.send({'msg':'successfully log in!'}))
app.get('/success-web', (req, res) => {
    console.log('called social login')
    let email = req.user ? req.user.emails[0].value : '';
    console.log(email)
    userModel.findOne({ 'userEmail': email }, (err, user) => {
        if (err) {
            res.send(err)
        }
        if (user) {
            console.log("user found")
            if(!user.userName && user.userType == 'student') {
                userDetails = { 'email': req.user.email, 'name': req.user.displayName, 'photo': req.user.picture, 'id': user.userId, 'type': 'student' }
                // console.log(userDetails)
                res.render('profile', { data: userDetails })    
            } else {
                req.session.email = user.userEmail
                req.session.name = user.userName
                req.session.userid = user.userId
                if(user.userType.toLowerCase() == 'student') {
                    res.redirect('/student')
                } else {
                    res.redirect('/teacher')
                }    
            }
        } else {
            console.log('not registered')
            // console.log(req.user) 
            userDetails = { 'email': req.user.email, 'name': req.user.displayName, 'photo': req.user.picture, 'id': '', 'type': 'teacher' }
            // console.log(userDetails)
            res.render('profile', { data: userDetails })
        }
    }); 
})
app.post('/success-app', (req, res) => {
    console.log('called social login')
    let email = req.body.email
    console.log(email)
    userModel.findOne({ 'userEmail': email }, (err, user) => {
        if (err) {
            res.send({'msg': err}) 
        } else {
            if (user) {
                console.log("user found")
                if(!user.userName && user.userType == 'student') {
                    userDetails = { 'msg': 'new', 'id': user.userId, 'type': 'student' }
                    res.send(userDetails)
                } else {
                    res.send({'msg': 'found', 'type': user.userType})
                }
            } else { 
                console.log('not registered')
                console.log(req.user) 
                res.send({'msg': 'new', 'type': 'teacher'})
            }
        }
    });
})
app.post('/profile-setup', (req, res) => {
    console.log('setup')
    console.log(req.body)
    if(req.body.type.toLowerCase() == 'student') {
        var newVal = {$set: {userName: req.body.name, userPhoto: req.body.photo}}
        userModel.findOneAndUpdate({'userEmail': req.body.email}, newVal, (err, resp) => {
            if(err) {
                console.log(err)
                res.send({'msg': err})
            } else {
                var md = {}
                var mdkey = 'students.'+req.body.id+'.status'
                md[mdkey] = true
                var newVal2 = {$set: md}
                classModel.updateOne({'name': resp.cls}, newVal2, (err, resp2) => {
                    if(err) {
                        console.log(err)
                        res.send({'msg': err})        
                    } else {
                        res.redirect('/student')
                    }
                })
            }
        })
    } else {
        var newUser = new userModel()
        newUser.userName = req.body.name
        newUser.userEmail = req.body.email
        newUser.userPhoto = req.body.photo
        newUser.userType = req.body.type
        newUser.userId = req.body.id
        newUser.save((err, doc) => {
            if (err) {
                console.log(err)
                // res.send(err)
                res.send({'msg': err})
            } else {
                req.session.email = doc.userEmail
                req.session.name = doc.userName
                req.session.userid = doc.userId
                console.log('succ')
                res.redirect('/teacher')
            }
        });    
    }
})
app.post('/profile-setup-mob', (req, res) => {
    console.log('setup')
    console.log(req.body)
    if(req.body.type.toLowerCase() == 'student') {
        var newVal = {$set: {userName: req.body.name, userPhoto: req.body.photo}}
        userModel.findOneAndUpdate({'userEmail': req.body.email}, newVal, (err, resp) => {
            if(err) {
                console.log(err)
                res.send({'msg': err})
            } else {
                var md = {}
                var mdkey = 'students.'+req.body.id+'.status'
                md[mdkey] = true
                var newVal2 = {$set: md}
                classModel.updateOne({'name': resp.cls}, newVal2, (err, resp2) => {
                    if(err) {
                        console.log(err)
                        res.send({'msg': err})        
                    } else {
                        res.send({'msg': 'success'})
                    }
                })
            }
        })
    } else {
        var newUser = new userModel()
        newUser.userName = req.body.name
        newUser.userEmail = req.body.email
        newUser.userPhoto = req.body.photo
        newUser.userType = req.body.type
        newUser.userId = req.body.id
        newUser.save((err, doc) => {
            if (err) {
                console.log(err)
                // res.send(err)
                res.send({'msg': err})
            } else {
                req.session.email = doc.userEmail
                req.session.name = doc.userName
                req.session.userid = doc.userId
                console.log('succ')
                res.redirect('/teacher')
            }
        });    
    }  
})
app.use('/student', stroutes)
app.use('/teacher', fcroutes)

app.get('/join', (req, res) => {
    res.render('try2')
})
app.get('/leave', (req, res) => {
    res.render('try2')
})
app.post('/join', (req, res) => {
    console.log(req.body)
    var email
    if(req.body.email) 
        email = req.body.email
    else 
        email = req.session.email
    userModel.findOne({'userEmail': email}, (err, user) => {
        if(err) {
            console.log(err)
            res.json({'msg': 'err'})
        } else {
            // console.log(user)
            var d = new Date()
            // console.log(d.toLocaleDateString())
            // console.log(d.toLocaleTimeString())
            var md = {}
            var mdkey = 'attendance.'+d.toLocaleDateString() + '.'+req.body.sub+'.'+user.userId+'.entryTime'
            md[mdkey] = new Date().getTime()
            var md2 = {}
            var md2key = 'attendance.'+d.toLocaleDateString() + '.'+req.body.sub+'.'+user.userId+'.name'
            md2[md2key] = user.userName
            // md2[md2key] = {'entryTime': new Date().getTime(), 'name': user.userName}
            var newVal = {$push: md, $set: md2}
            console.log(md)
            classModel.updateOne({'name': user.cls}, newVal, (err, resp) => {
                if(err) {
                    console.log(err)
                    res.json({'msg': 'err'})
                } else {
                    res.json({'msg': 'suc'})
                }
            })        
        }
    })
})
app.post('/leave', (req, res) => {
    console.log(req.body)
    userModel.findOne({'userEmail': req.body.email}, (err, user) => {
        if(err) {
            console.log(err)
            res.json({'msg': 'err'})
        } else {
            if(user.userType == 'student') {
                classModel.findOne({'name': user.cls}, {attendance: 1}, (err, att) => {
                    if(err) {
                        console.log(err)
                        res.json({'msg': 'err'})
                    } else {
                        var entrylist = att.attendance[new Date().toLocaleDateString()][req.body.sub][user.userId]['entryTime']
                        var entry = entrylist[entrylist.length - 1]
                        // var exit = att.attendance[new Date().toLocaleDateString()][req.body.sub][user.userId]['exitTime']
                        var md = {}
                        var mdkey = 'attendance.'+new Date().toLocaleDateString() + '.'+req.body.sub+'.'+user.userId+'.exitTime'
                        md[mdkey] = new Date().getTime()
                        var md2 = {}
                        var md2key = 'attendance.'+new Date().toLocaleDateString() + '.'+req.body.sub+'.'+user.userId+'.time'
                        md2[md2key] = ((md[mdkey] - entry) / 1000)/60;
                        var newVal2 = {$push: md, $inc: md2}
                        classModel.updateOne({'name': user.cls}, newVal2, (err, resp) => {
                            if(err) {
                                console.log(err)
                                res.json({'msg': 'err'})
                            } else {
                                res.json({'msg': 'suc'})
                            }
                        })
                    }
                })
            } else {
                console.log('teacher left')
                res.json({'msg': 'suc'})
                // classModel.findOne({'name': req.body.cls}, {attendance: 1}, (err, doc) => {
                //     if(err) {
                //         console.log(err)
                //         res.json({'msg': 'err'})
                //     } else {
                //         var dt = new Date().toLocaleDateString()                    
                //         console.log(doc.attendance[dt])
                //         res.json({'msg': 'suc'})
                //     }
                // })
            }
        }
    })
})
// CCV101
app.get('/get/attendance/:cls/:sub/:type', (req, res) => {
    var sub = (req.params.sub).toUpperCase()
    classModel.findOne({'name': req.params.cls}, {attendance: 1}, (err, doc) => {
        if(err) { 
            console.log(err)
            res.json({'msg': 'err'})
        } else {
            var dt = new Date().toLocaleDateString()   
            var d = new Date()                 
            // console.log(doc.attendance[dt][sub])
            const att = doc.attendance[dt][sub]
            var timecons = 20
            for(stu in att) {
                if(att[stu]['exitTime'] && att[stu]['entryTime'].length == att[stu]['exitTime'].length) {
                    var md = {}
                    var mdkey = 'attendance.'+d.toLocaleDateString() + '.'+sub+'.'+stu+'.att'
                    md[mdkey] = (att[stu]['time']>=timecons ? 'P' : 'A')
                    var newVal = {$set: md}
                    classModel.updateOne({'name': req.params.cls}, newVal, (err, resp) => {
                        if(err) {
                            console.log(err)
                            res.send({'msg': 'err'})
                        }
                    })
                } else {
                    var dt = ((d.getTime() - att[stu]['entryTime'][att[stu]['entryTime'].length - 1]) / 1000)/60
                    console.log(dt)
                    // var md = {}
                    // var mdkey = 'attendance.'+d.toLocaleDateString() + '.'+sub+'.'+stu+'.att'
                    // md[mdkey] = (dt>=timecons ? 'P' : 'A')
                    var md3 = {}
                    var md3key = 'attendance.'+d.toLocaleDateString() + '.'+sub+'.'+stu+'.time'
                    md3[md3key] = dt
                    // md[mdkey] = {'att': (dt>=timecons ? 'P' : 'A'), 'time': dt, 'exitTime': d.toLocaleTimeString(), 'entryTime': new Date(att[stu]['entryTime']).toLocaleTimeString()}
                    // md[mdkey] = {'att': (dt>=timecons ? 'P' : 'A'), 'time': dt}
                    var md2 = {}
                    var md2key = 'attendance.'+d.toLocaleDateString() + '.'+sub+'.'+stu+'.exitTime'
                    md2[md2key] = d.getTime()
                    var newVal = {$inc: md3, $push: md2}
                    classModel.updateOne({'name': req.params.cls}, newVal, (err, resp) => {
                        if(err) {
                            console.log(err)
                            res.send({'msg': 'err'})
                        } else {
                            classModel.findOne({'name': req.params.cls}, {attendance: 1}, (err, attend) => {
                                if(err) {
                                    console.log(err)
                                    res.send({'msg': 'err'})
                                } else {
                                    var md = {}
                                    var mdkey = 'attendance.'+d.toLocaleDateString() + '.'+sub+'.'+stu+'.att'
                                    md[mdkey] = (attend['attendance'][d.toLocaleDateString()][sub][stu]['time']>=timecons ? 'P' : 'A')
                                    var newVal = {$set: md}
                                    classModel.updateOne({'name': req.params.cls}, newVal, (err, resp) => {
                                        if(err) {
                                            console.log(err)
                                            res.send({'msg': 'err'})
                                        }
                                    })        
                                }
                            })
                        }
                    })
                }
            }
            setTimeout(() => {
                classModel.findOne({'name': req.params.cls}, {attendance: 1}, (err, doc) => {
                    var dt = new Date().toLocaleDateString()   
                    var d = new Date()                 
                    console.log(doc.attendance[dt][sub])
                    var data = doc.attendance[dt][sub]
                    const headingColumnNames = [
                        "SystemId",
                        "Name",
                        "Last EntryTime",
                        "Last ExitTime",
                        "Attendance"
                    ]
                    let headingColumnIndex = 1;
                    headingColumnNames.forEach(heading => {
                        ws.cell(1, headingColumnIndex++)
                            .string(heading)
                    });
                    let rowIndex = 2;
                    for(stu in data) {
                         ws.cell(rowIndex, 1).string(stu)
                         ws.cell(rowIndex, 2).string(data[stu]['name'])
                         ws.cell(rowIndex, 3).string(new Date(data[stu]['entryTime'][data[stu]['entryTime'].length - 1]).toLocaleTimeString())
                         ws.cell(rowIndex, 4).string(new Date(data[stu]['exitTime'][data[stu]['exitTime'].length - 1]).toLocaleTimeString())
                         ws.cell(rowIndex, 5).string(data[stu]['att'])
                         rowIndex++;
                    }
                    var d = new Date().toLocaleDateString()
                    var newd = d.replace(/\//g, '')
                    console.log(d)
                    wb.write('Att_CCV101_'+newd+'.xlsx');
                    setTimeout(() => {
                        if(req.params.type == 'mobile')
                            res.send({'msg': 'suc', 'name': 'Att_CCV101_'+newd+'.xlsx'})
                        else
                            res.download('Att_CCV101_'+newd+'.xlsx')
                    }, 3000);

                    // res.send({'msg': 'suc'})
                })
            }, 5000);
        }
    })
})

app.get('/download/assignment/:id/:file', (req, res) => {
    var path = __basedir+'/uploads/assignments/'+req.params.id+'/'+req.params.file
    res.download(path)
})
// https://www.npmjs.com/package/react-native-simple-download-manager

// https://stackoverflow.com/questions/44546199/how-to-download-a-file-with-react-native


app.get('/get/absentStudentList/:cls/:sub', (req, res) => {
    var sub = (req.params.sub).toUpperCase()
    classModel.findOne({'name': req.params.cls}, {students:1, attendance: 1}, (err, docs) => {
        if(err) {
            console.log(err)
            // res.json({'msg': 'err'})
        } else {
            var abst = []
            var att = docs['attendance'][new Date().toLocaleDateString()][sub]
            console.log(att)
            for(st in docs['students']) {
                console.log(st)
                if(docs['students'][st]['subjects'] && (docs['students'][st]['subjects']).includes(sub)) {
                    console.log('sub present')
                    if(!att[st]) {
                        abst.push(st)
                    }
                }
            }
            console.log(abst)
            var abstlist = []
            for(var i=0;i<abst.length;i++) {
                console.log(abst[i])
                userModel.findOne({'userId': abst[i]}, {userEmail: 1}, (err, user) => {
                    if(err) {
                        console.log(err)
                    } else {
                        console.log(user.userEmail)
                        abstlist.push(user.userEmail)
                    }
                })
            }
            setTimeout(() => {
                console.log(abstlist)
                var trans = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'agarwalriya0101@gmail.com',
                        pass: 'riya01012000'
                    }
                });

                var text = 'hello. this is a testing mail.';

                // var stlist = ['2018006465.vedangi@ug.sharda.ac.in']
                const mailOpt = {
                    from: 'agarwalriya0101',
                    // to: abstlist,
                    to: ['2018006465.vedangi@ug.sharda.ac.in'],
                    subject: 'Reminder !!!',
                    text: text,
                    html: '<b>You have still not joined the class of CCV101.</b><br><br>Click on this link to join the class.<br>http://localhost:8000/join/'
                };

                trans.sendMail(mailOpt, function(error, info) {
                    console.log('ok');
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('message sent: ' + info.response);
                        // res.send(info.response);
                        res.send('sent')
                    };
                });
            }, 2000);
        }
    })
})


app.get('/try', (req, res) => {})
app.get('/logout', (req, res) => {
    req.session = null;
    req.logout();
    res.redirect('/');
})


app.get('/', (req, res) => res.send({'msg':'hi'}))
app.post('/posting', (req, res) => { 
    console.log('helloo') 
    console.log(req.body.email)
    console.log(req.body.name)
    res.send({'status': 'succ'})
})
app.listen(8000, ()=> console.log('app started successfully on 8000.'))