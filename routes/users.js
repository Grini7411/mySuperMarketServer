var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var pool = require('../helpers/dbhelper').pool;



var isConnected = false;

router.get('/getallusers', async (req,res) => {
  if(isConnected){
    let q = `SELECT * FROM users`
    let resp = await pool.query(q);
    res.json(resp[0]);
  }
  else {
    res.redirect('http://localhost:4200/');
  }
})


router.get('/getusertypes', async (req,res) => {
  // if(req.session.connectedUser){}
  let q = `SELECT * FROM roles`;
  let resp = await pool.query(q);
  res.status(200).json(resp[0]);
})

router.post('/login', async function(req, res, next) {
  let username = req.body.email;
  let password = req.body.password;
  let q = `SELECT * FROM users WHERE email='${username}'`;
  
  let userArr = await pool.query(q);
  if (userArr[0].length>0) {
    await bcrypt.compare(password, userArr[0][0].password , function(err, result) {
      if (result) {
        isConnected = true;
        req.session.connectedUser = userArr[0][0];
        res.status(200).json({success:true, userConnected: req.session.connectedUser, isConnected:isConnected});
      }
      else {
        res.json({ msg:'username or password not correct!!'})
      }
    })
  } 
})



router.post('/adduser', async (req,res) => {

  let role = 1;
  if (req.body.userType){
    role = req.body.userType;
  }

  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(req.body.password, salt, async function(err, hash) {
      if(err) throw err;
      req.body.password = hash;
      let q = `INSERT INTO users (first_name,last_name,id_num,email,password,city,street,role)
      VALUES ('${req.body.firstName}','${req.body.lastName}','${req.body.idNum}','${req.body.email}','${req.body.password}','${req.body.city}','${req.body.street}',${role});`
      let resp = await pool.query(q);
    });
});
  res.json({msg:"save successfully!"});
})


router.get('/checkuser', function(req, res) {

  if (req.session.connectedUser) { // change to req.session.connectedUser
    res.json({
        username: req.session.connectedUser.email, // change to req.session.connectedUser.email
        userId: req.session.connectedUser.id_num, // change to req.session.connectedUser.id
        fullName: `${req.session.connectedUser.first_name} ${req.session.connectedUser.last_name}`
    });
}
else {
    res.json({ msg: "not connected" });
}
});

router.delete('/deluser/:id', async function(req, res, next) {
  let q = `DELETE FROM users WHERE id_num='${req.params.id}';`
  await pool.query(q);
  res.json({msg:`user with id number: ${req.params.id} was deleted successfully`})
});


//logout:
router.get('/logout', (req, res) => {

  // req.session.connectedUser = null;  
  req.session.destroy(()=>{
    console.log('session cookie destroied!');
  });
  res.json({msg:"logged out!"})
     
 }); 

module.exports = router;
