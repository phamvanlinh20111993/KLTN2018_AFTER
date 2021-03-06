//ứng dụng: Phát triển dịch vụ trực tuyến hỗ trợ thực hành ngôn ngữ
var express = require('express')
var app = express()//su dung
var bodyParser = require('body-parser')//Đây là một lớp trung gian node.js để xử lí JSON, dự liệu thô, text và mã hóa URL.
var server = require('http').createServer(app) 
var io = require('socket.io')(server);
var morgan = require('morgan') //log/show request and response from client/server
var md5 = require('md5') // su dung md5 ma hoa pass
var path = require('path')
var session = require('express-session')//bat session luu tru thong tin trong phien lam viec
var cookieParser = require('cookie-parser')//su dung cookie trong nodejs
var flash = require('connect-flash')//chuong trinh bi loi req.flash is not a funtion,
var passport = require('passport')
var mysql = require('mysql');
var cloudinary = require('cloudinary')
var engines = require('consolidate');
var con = require('./model/mysqlconn')

var port = process.env.PORT||5050;
app.use(passport.initialize());
app.use(passport.session());
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}))//limit data transfer from client
app.use(bodyParser.json())
var CryptoJS = require("crypto-js")

var session = require("express-session")({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 48*3600*1000 }
});//neu de secure:true thi session khong duoc khoi tao???

var sharedsession = require("express-socket.io-session");

// Use express-session middleware for express
app.use(session);

// Use shared session middleware for socket.io
// setting autoSave:true cccc
io.use(sharedsession(session, {autoSave:true})); 

app.use(flash())
app.use(cookieParser())//su dung cookie

app.get('/', function(req, res){
	res.redirect('/languageex/user');
})


app.engine('html', engines.mustache);
app.set('view engine', 'html');
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'view'))
app.set('public', path.join(__dirname, 'public'))
//app.set('node_modules', path.join(__dirname, 'node_modules'))
//app.set('private', path.join(__dirname, 'private'))

app.use(express.static(__dirname + '/view'));//su dung cac file tĩnh trong views
app.use(express.static(__dirname + '/public'));
//app.use(express.static(__dirname + '/private'));

app.use(function(req, res, next){
	res.locals.session = req.session;//su dung session trong file client vi du session.name trong file home.ejs
	next();
});


//config cloudinary
cloudinary.config({ 
  cloud_name: 'uet', 
  api_key: '992147968271347', 
  api_secret: 'M9TfXOrwtKx0SklY5wOrxPJv-MU' 
});

//user's controller
var login = require('./controller/login_signup/login')
var signup = require('./controller/login_signup/signup')
var publicrq = require('./controller/login_signup/publicrequest');
var registerinfo = require('./controller/login_signup/registerinfo');
var authenticateuser = require('./controller/login_signup/authenticateuser');
var homerq = require('./controller/home/homerequest');
var posts = require('./controller/home/posts')
var community = require('./controller/home/community')
var messenger = require('./controller/home/messenger')
var filter = require('./controller/filter')
var msgsetting = require('./controller/home/msgsetting')
var profile = require('./controller/home/profile')
var post_setting =  require('./controller/home/posts_setting')
var callvideo = require('./controller/home/callvideo')

//admin's controller
var adminlg = require('./controller/admin/login')
var adminmnpost = require('./controller/admin/managepost')
var adminmnreport = require('./controller/admin/managereport')
var adminmnuser = require('./controller/admin/manageuser')
var rqpageadmin =  require('./controller/admin/requestpages.js')

//use for user
app.use('/languageex', publicrq)
app.use('/languageex', login)
app.use('/languageex', signup)
app.use('/languageex', registerinfo)
app.use('/languageex', authenticateuser)
app.use('/languageex', homerq)
app.use('/languageex', posts)
app.use('/languageex', filter)
app.use('/languageex', community)
app.use('/languageex', messenger)
app.use('/languageex', msgsetting)
app.use('/languageex', profile)
app.use('/languageex', post_setting)
app.use('/languageex', callvideo)

//use for admin
app.use('/languageex', adminlg)
app.use('/languageex', adminmnpost)
app.use('/languageex', adminmnreport)
app.use('/languageex', adminmnuser)
app.use('/languageex', rqpageadmin)

const translate = require('google-translate-api');

var userOnorOffline_id = [];//dia chi email
var index = 0, flag = false;
var TIME_OFFLINE = 8000;
var anotherQuery = require('./model/Anotherquery')
var querysimple = require('./model/QuerysingletableSimple')
var roomchats = [];
var _CONSTANTID = 10000000000000

io.on('connection', function(client)
{
	console.log('Client connected ' + client.id);

	client.on('notifyOnline', function(id){//tham so data la email cua nguoi dung

      if(parseInt(id) && parseInt(id) > _CONSTANTID){
       	client.handshake.session.uid = id;
         client.handshake.session.save();

         flag = false;

       	for(index = 0; index < userOnorOffline_id.length; index ++){
           	if(userOnorOffline_id[index] == id){
   	     		io.to(client.handshake.session.community).emit('numofuseronline', client.handshake.session.numOn)
               client.in(client.handshake.session.community).emit('whoonline', {id: id, state:true})//ca 
             	flag = true;
             	break;
           	}
         }

         if(!flag){

            client.handshake.session.numOn = 0;
            //client.handshake.session.community = client.handshake.session.uid;//comment 12:56am 13/4/2018
            client.handshake.session.community = "";//add 12:56am 13/4/2018
            //add to array
            userOnorOffline_id[userOnorOffline_id.length] = client.handshake.session.id;
            client.handshake.session.save();

            var sqlString = "UPDATE user SET state = 1 WHERE id = " + mysql.escape(client.handshake.session.uid)
            con.beginTransaction(function(err){
               if (err) { 
                  throw err; 
               }
               con.query(sqlString, function(err, result, fields){
                  if(err){
                     con.rollback(function() {
                        throw err;
                     });
                  }
                  else{
                     
                     con.commit(function(err) {
                        if (err) { 
                           con.rollback(function() {
                              throw err;
                           });
                        }
                        console.log(result.affectedRows + " record(s) updated online.");
                        anotherQuery.selectListUsermyCommunityEx(client.handshake.session.uid, function(data){
                           var index = 0
                           for(index = 0; index < data.length; index++){
                              if(data[index].state == 1)
                                 client.handshake.session.numOn++;
                              client.handshake.session.community += data[index].id.toString() //add toString() 12:56am 13/4
                           }
                           client.handshake.session.save();

                           console.log("My community room " + client.handshake.session.community)
                           console.log("so nguoi on: " +client.handshake.session.numOn)
                           console.log('Transaction Complete.');
                           client.join(client.handshake.session.community)
                           io.to(client.handshake.session.community).emit('numofuseronline', client.handshake.session.numOn)
                           client.in(client.handshake.session.community).emit('whoonline', {id: id, state:false})
                        })
                     })

                  }
               })
            })
         }
      }

   })


	client.on('disconnect', function(){
		console.log("User code id = " + client.handshake.session.uid + " offline.")
   
      for(index = 0; index < userOnorOffline_id.length; index++){
         if(client.handshake.session.uid == userOnorOffline_id[index]){
            userOnorOffline_id.splice(index, 1)
            break;
         }
      }

      if(client.handshake.session.uid){

         var sqlString = "UPDATE user SET state = 0 WHERE id = " + mysql.escape(client.handshake.session.uid)
         con.beginTransaction(function(err){

            if(err) throw err
            con.query(sqlString, function(err, result, fields){
               if(err){
                  con.rollback(function() {
                     throw err;
                  });
               }else{
                  con.commit(function(err) {
                     if (err) { 
                        con.rollback(function() {
                           throw err;
                        });
                     }

                     client.handshake.session.numOn--;
                     io.to(client.handshake.session.community).emit('numofuseronline', client.handshake.session.numOn)
                     //io.sockets.in(client.handshake.session.community).emit('numofuseronline', client.handshake.session.numOn)
                     console.log(result.affectedRows + " record(s) updated offline.");
                     console.log('Transaction Complete.');

                     client.leave(client.handshake.session.community);
                     client.leave(client.room);

                     var roomchatsLength = roomchats.length
                     var index = 0;//add 8:55pm 14/4/2018
                     while(index < roomchatsLength){
                        if(roomchats[index].room == client.room)
                        {
                           if(roomchats[index].idM1 == client.handshake.session.uid)
                              roomchats[index].idM1 = null
                           if(roomchats[index].idM2 == client.handshake.session.uid)
                              roomchats[index].idM2 = null

                           if(roomchats[index].idM2 == null && roomchats[index].idM1 == null){
                              roomchats.splice(index, 1)
                              roomchatsLength--;
                           }
                        }

                        index++
                     }

                     delete client.handshake.session.community;
                     delete client.handshake.session.numOn;
                     delete client.handshake.session.uid;
                     client.handshake.session.save();
                  });
               }
            })
         })

	   }

   })
   

   client.on('createroomchat', function(data){
      if(data && parseInt(data.myid) > _CONSTANTID &&  parseInt(data.pid) > _CONSTANTID)
      {
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         var isexistroom = false;

         if(myid && pid){
            if(myid > pid){
               client.join(myid + pid)
               client.room = myid + pid
            }else{
               client.join(pid + myid)
               client.room = pid + myid
            }

            for(var room in roomchats){
               if(room.room == client.room){
                  isexistroom = true;
                  break;
               }
            }

            //create a new room
            if(!isexistroom){
               roomchats[roomchats.length] = {}
               roomchats[roomchats.length-1].room = client.room
               roomchats[roomchats.length-1].idM1 = data.myid//id of users in room
               roomchats[roomchats.length-1].idM2 = data.pid//id of users in room
            }

            console.log("Da tao room " + client.room)
         }
      }
     
   }) 


   client.on('leaveroomchat', function(data){
      if(data && parseInt(data.pid) > _CONSTANTID && parseInt(data.myid) > _CONSTANTID){
         var myid = data.myid.toString();
         var pid = data.pid.toString();

         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.leave(client.room);
         console.log("Da out room " + client.room)

         var index = 0, roomchatsLength = roomchats.length
         while(index < roomchatsLength){
            if(roomchats[index].room == client.room)
            {
               if(roomchats[index].idM1 == client.handshake.session.uid)
                  roomchats[index].idM1 = null
               if(roomchats[index].idM2 == client.handshake.session.uid)
                  roomchats[index].idM2 = null

               if(roomchats[index].idM2 == null && roomchats[index].idM1 == null){
                  roomchats.splice(index, 1);
                  roomchatsLength--
               }
            }

            index++
         }
      }

   })


   //nguoi dung dang nhap tin nhan, báo cho phía bên đối tác: tao đang nhập tin nhắn cho mày
   client.on('chatting', function(data){
      if(data && parseInt(data.pid) > _CONSTANTID && parseInt(data.myid) > _CONSTANTID){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.in(client.room).emit('typing...', data)//ca 
      }
   })

   
   client.on('sendmsg', function(data){//nhan tin nhan sau do gui di

      if(data && parseInt(data.pid) > _CONSTANTID && parseInt(data.myid) > _CONSTANTID){

         var myid = data.myid.toString();//nguoi gui
         var pid = data.pid.toString();//nguoi nhan
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         //save in database
         anotherQuery.selectMaxfield("message", "id", function(res)
         {
            var idmessg = res[0].max
                idmessg = 0
          //    console.log(data)
            //chen du lieu vao bang
            querysimple.insertTable("message", 
               ["userA", "userB", "data", "content", "ischeck", "time", "misspelling"], //field
               [parseInt(data.myid), parseInt(data.pid), data.content.data, data.content.content, 1, new Date(data.time), data.content.misspelling], 
              function(result, err){
                 if(err)  throw err;
                  else{
                     console.log("1 record inserted messages.");
                     console.log("nhan tin vao room " + client.room)

                     data.content.messageid = idmessg + 1;//id cua tin nhan

                     //gui lai cho nguoi gui tin nhan ma cua tin nhan vua gui di
                     io.sockets.in(client.room).emit('sendmsgid', {myid: data.myid, msgid: idmessg+1})

                     client.in(client.room).emit('receivermsg', { //server gui tin nhan den nguoi nhận
                        content: data.content, 
                        myphoto: data.photo,
                        id_send: data.myid,
                        id_receive: data.pid,
                        time: data.time
                     })
                  }
            })

         })

         client.in(client.handshake.session.community).emit('isturnonbox', { 
            myphoto: data.photo,
            id_send: data.myid,
            id_receive: data.pid
         })//ca 
      }
   })


   client.on('isseemsg', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         querysimple.updateTable("message", [{field: "ischeck", value: 2}], 
            [{op: "", field: "userA", value: parseInt(pid)}, {op:"AND", field: "userB", value: parseInt(myid)}],
            function(result, err){
               if(err)   throw err
               else{
                 console.log(result.affectedRows + " record(s) updated seen message in socket");
                  client.in(client.room).emit('seen', data)//chi nguoi ben kia thay tin nhan
                  io.sockets.in(client.room)//ca 2 ben deu thay tin nhan-io.sockets se gui tin nhan cho het cac ben
               }
          })
      }
   })


   //su kien sua tin nhan cua nguoi dung
   client.on('editmsg', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.in(client.room).emit('editdone', data)
      }
   })

   //su kien block tin nhan cua nguoi dung
   client.on('blockmsg', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid
         //insert to database

         //ca 2 ben deu nhan duoc tin hieu block msg
         io.sockets.in(client.room).emit('blockmsgdone', data)
      }
   })



   client.on('manageroom', function(data){//send to admin

   })


   client.on('alluseronline', function(data){//send to admin

   })


   //su kien gui du lieu am thanh cua nguoi dung
   client.on('sendrecording', function(data){
      //insert to database
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         querysimple.insertTable("message", 
               ["userA", "userB", "data", "content", "ischeck", "time"], //field
               [parseInt(data.myid), parseInt(data.pid), data.content.data, data.content.content, 1, data.time], 
               function(result, err){
                  if(err)  throw err;
                  else{
                     console.log("1 record inserted messages audio.");
                     console.log("nhan tin vao room " + client.room)
                     client.in(client.room).emit('receiverecording', data)
                  }
            })
      }
   })


   //gui ma ket noi goi video
   client.on('sendcallvideocode', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.broadcast.emit('receivecallvideocode', data)
      }
   })


   client.on('acceptcall', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.in(client.room).emit('calling', data)
      }
   })


   client.on('endcall', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.in(client.room).emit('doneendcall', data)
      }
   })

   //event tu choi cuoc goi ben phia nguoi dung
   client.on('refusecall', function(data){//nguoi dung tu choi cuoc goi
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.broadcast.emit('donerefusecall', data)
      }
   })

   //thong bao tat comment tren post id
   client.on('turnoffcmt', function(data){
      if( client.handshake.session.community)
         io.sockets.in(client.handshake.session.community).emit('turnoffcmtnotify', data)
   })

   //thong bao bat comment tren post id
   client.on('turnoncmt', function(data){
      if( client.handshake.session.community)
         io.sockets.in(client.handshake.session.community).emit('turnoncmtnotify', data)
   })



   //tao cac thong bao thong thao luan
   //thong bao ve bai dang
   client.on('notifypost', function(data){
      if(client.handshake.session.community){
         if(data.user_id){
            querysimple.selectTable("follow", ["followers"], [{op: "", field: "tracked", value: data.user_id}],
               null, null, null, function(result, fields, err){
                  if (err) {throw err}
                  else{
                     var listwasfollowed = []
                     for(var ind = 0; ind < result.length; ind++){
                        listwasfollowed[ind] = result[ind].followers
                     }

                     data.listwasfollowed = listwasfollowed
                    client.in(client.handshake.session.community).emit('notifypostdone', data)
                  }
            })
                  
         }
         
      }
   })

   //thong bao ve bai dang
   client.on('notifycmt', function(data){
      if(client.handshake.session.community){
         if(data.post_id){
            querysimple.selectTable("post", ["user_id"], [{op: "", field: "id", value: data.post_id}],
               null, null, null, function(result, fields, err){
                  if (err) {throw err}
                  else{
                     data.ownpost = result[0].user_id
                     client.in(client.handshake.session.community).emit('notifycmtdone', data)
                  }
            })
         }
      }
   })

   //thong bao ve bai dang
   client.on('notifylike', function(data){
      if(client.handshake.session.community){
         if(data.post_id){
            querysimple.selectTable("post", ["user_id"], [{op: "", field: "id", value: data.post_id}],
               null, null, null, function(result, fields, err){
                  if (err) {throw err}
                  else{
                     data.ownpost = result[0].user_id
                     client.in(client.handshake.session.community).emit('notifylikedone', data)
                  }
            })
         }
        
      }
   })




   //goi video truc tuyen theo cach so 2
   //gui ma ket noi goi video page Callvideo1.js
   client.on('signalcallvideo', function(data){
      if(data && parseInt(data.pid) && parseInt(data.myid)){
         var myid = data.myid.toString();
         var pid = data.pid.toString();
         if(myid > pid)
            client.room = myid + pid
         else
            client.room = pid + myid

         client.broadcast.emit('receivesignalcallvideo', data)
      }
   })



    client.on('acceptcallvideo', function(data){
      // if(data && parseInt(data.pid) && parseInt(data.myid)){
      //    var myid = data.myid.toString();
      //    var pid = data.pid.toString();
      //    if(myid > pid)
      //       client.room = myid + pid
      //    else
      //       client.room = pid + myid

         client.broadcast.emit('callercreatecode', data)
    //  }
   })

    client.on('sendcodetoreceiver', function(data){
      // if(data && parseInt(data.caller) && parseInt(data.receiver)){
      //    var myid = data.caller.toString();
      //    var pid = data.receiver.toString();
      //    if(myid > pid)
      //       client.room = myid + pid
      //    else
      //       client.room = pid + myid
        setTimeout(function(){
            console.log("nhan tin hieu di nao")
            client.broadcast.emit('receivertakecode', data)
        }, 2000)
         
        
  //    }
   })

     client.on('sendcodetocaller', function(data){
      // if(data && parseInt(data.caller) && parseInt(data.receiver)){
      //    var myid = data.caller.toString();
      //    var pid = data.receiver.toString();
      //    if(myid > pid)
      //       client.room = myid + pid
      //    else
      //       client.room = pid + myid

         client.broadcast.emit('createdcall', data)
        
  //    }
   })


    client.on('signalendcall', function(data){
        console.log(data)
         client.broadcast.emit('endcalled', data)
   })


})


server.listen(port, function(){
	console.log('Server running on port %s!', port)
});

