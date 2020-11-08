var express = require('express');
var router = express.Router();
var pool = require('../helpers/dbhelper').pool;
var bcrypt = require('bcryptjs');



router.get('/allcity', async function(req, res, next) {
  let q = `SELECT * FROM cities`;
  let resp = await pool.query(q);
  res.json(resp);
});

router.get('/joinprodunits/:cart_id', async function(req, res) {
  let q = `SELECT cart_unit.id_cart_unit, product.name, cart_unit.quantity, cart_unit.gen_price
  FROM product
  INNER JOIN cart_unit
  ON product.id_prod = cart_unit.prod_id
  WHERE cart_unit.cart_id='${req.params.cart_id}'
  `
  let resp = await pool.query(q);
  res.json(resp);
})

router.get('/getcartunits/:cart_id', async function(req, res) {
  let q = `SELECT * FROM cart_unit WHERE cart_id='${req.params.cart_id}'`;
  let resp = await pool.query(q);
  res.json(resp);
});



router.get('/getproducts', async function(req, res, next) {
  let q = `SELECT * FROM product`;

  if(req.query.catID && req.query.searchWord) {
    q += ` WHERE (name LIKE '%${req.query.searchWord}%') AND (cat_id = ${req.query.catID})`
  }
  else if (req.query.searchWord) {
    q += ` WHERE name LIKE '%${req.query.searchWord}%'`
  }
  else if (req.query.catID) {
    q += ` WHERE cat_id = ${req.query.catID}`
  }

  let resp = await pool.query(q);
  res.json(resp);
});

router.get('/getcat', async function(req, res, next) {
  let q = `SELECT * FROM prod_category`;
  let resp = await pool.query(q);
  res.json(resp);

});


router.delete('/del/:id', async function(req, res, next) {
  let q = `DELETE FROM product WHERE id_prod='${req.params.id}'`;
  let resp = await pool.query(q);
  res.json({msg:`product with id ${req.params.id} was deleted successfully`});

});

router.post('/addprod', async function(req, res, next) {
  let q = `INSERT INTO product (name,cat_id,price,pic_url)
  VALUES ('${req.body.name}',${req.body.cat_id},${req.body.price},'${req.body.picture}');`
  let resp = await pool.query(q);
  res.json(resp);

});

router.get('/checkcart/:id', async function(req, res, next) {
  let q = `SELECT * FROM cart WHERE client_id=${req.params.id}`;
  let resp = await pool.query(q);
  let test = await resp.some((el)=> el.is_open == 'true')
  console.log('carts of this id: ',resp)
  if(resp.length === 0 || test === false){
    console.log('no cart open of this user!');
    
    res.json({msg:'404'});
  }
  
  else{res.json(resp);}
});

router.post('/newcart', async function(req, res, next) {
  
  let q = `INSERT INTO cart (client_id,created_at,is_open)
  VALUES ('${req.body.client.id_num}','${req.body.time}','${true}');`
  let resp1 = await pool.query(q);
  let q2 = `SELECT id FROM cart WHERE client_id='${req.body.client.id_num}' AND is_open='${true}'`;
  let resp2 = await pool.query(q2);
  console.log(resp2)
  res.json({msg:"new cart has been created!!",cartID:resp2[0].id});
})


router.get('/checkitemincart/:id_prod/:cart_id', async function(req, res){
  var checkArr = [];
  var params = {
    id_prod:req.params.id_prod,
    cart_id:req.params.cart_id
  }
  
  checkArr = await pool.query(`SELECT * FROM cart_unit WHERE prod_id='${params.id_prod}' && cart_id=${params.cart_id}`)
  console.log(checkArr);

  if(checkArr.length !== 0){
    res.json({quantity:checkArr[0].quantity});
  }
  else{
    res.json({msg:'product Doesnt exists...',action:'newcartitem',quantity:0})
  }
})



router.post('/newcartitem', async function(req, res, next) {
  let q = `INSERT INTO cart_unit (prod_id,quantity,gen_price,cart_id)
     VALUES (${req.body.prod.id_prod},${1},${req.body.prod.price},${req.body.cart_id});`
     await pool.query(q);
     res.json({msg:"new item insertion is successfull"})  
});


router.put('/updatecartitem/:cart_id', async function(req, res, next) {
  var genPrice = req.body.sentNewItem.prod.price * req.body.quantity;
  if(req.body.quantity !== 0){
    let q = `UPDATE cart_unit SET quantity=${req.body.quantity}, gen_price=${genPrice} WHERE cart_id=${req.params.cart_id} && prod_id=${req.body.sentNewItem.prod.id_prod}`
    var resp = await pool.query(q);
  }
  else{
    let q2 = `DELETE FROM cart_unit WHERE cart_id=${req.params.cart_id} && prod_id=${req.body.sentNewItem.prod.id_prod}`
    var resp = await pool.query(q2);
  }
  res.json({resp:resp,msg:'unit quantity updated successfully'})
})

router.delete('/clearcart/:cartID',async (req,res)=>{
  let q = `DELETE FROM cart_unit WHERE cart_id=${req.params.cartID}`;
  await pool.query(q);
  res.json({msg:`all Products from cart ${req.params.cartID} has been deleted`})
})


router.delete('/delcartunit/:unitID',async (req,res)=>{
  let q = `DELETE FROM cart_unit WHERE id_cart_unit=${req.params.unitID}`;
  await pool.query(q);
  res.json({msg:`product id ${req.params.unitID} has been deleted`})
})

router.post('/neworder', async function(req, res) {
  var deliveryDate = req.body.order.deliveryDate;

  let getQuery = `SELECT * FROM orders WHERE delivery_date = '${deliveryDate}'`
  let resp1 = await pool.query(getQuery);
  var creditCard =String(req.body.order.creditCard) ;

  if(resp1.length < 3){
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(creditCard, salt, async function(err, hash) {
        if(err) throw err;
        creditCard = hash;
        let today = new Date();
        let q = `INSERT INTO orders ( client_id, cart_id, final_price, city, street, delivery_date, order_date, credit_card)
                VALUES ( '${req.body.extras.userID}', '${req.body.extras.cartID}', ${req.body.extras.totalPrice}, '${req.body.order.city}', '${req.body.order.street}', '${deliveryDate}', '${today.toLocaleDateString()}', '${creditCard}');`
        let resp2 = await pool.query(q);
        let q3 = `UPDATE cart SET is_open='${false}' WHERE id='${req.body.extras.cartID}'`
        let q4 = `SELECT id_order FROM orders WHERE client_id='${req.body.extras.userID}' AND cart_id='${req.body.extras.cartID}'`
        await pool.query(q3);
        let resp3 = await pool.query(q4);
        res.status(200).json({msg:'Order was submitted successfully!!',orderID:resp3[0].id_order});
        })
      })
  }
  else{
    res.json({msg:'the number of orders at the same date cannot exceed 3'})
  }
});

router.get('/allorders', async function(req, res) {
  let q = `SELECT orders.id_order, users.first_name, users.last_name, orders.final_price,orders.city,orders.street,orders.delivery_date, orders.order_date
  FROM users
  INNER JOIN orders 
  ON orders.client_id=users.id_num
  `;
  let resp = await pool.query(q);
  res.json(resp);
});


router.delete('/delorder/:id', async function(req, res) {
  let q = `DELETE FROM orders WHERE id_order='${req.params.id}'`;
  await pool.query(q);
  res.json({msg:`order with id ${req.params.id} was deleted successfully`});
})

router.get('/getcart/:id', async function(req, res, next) {
  let q = `SELECT * FROM cart WHERE client_id=${req.params.id}`;
  let resp = await pool.query(q);
  res.json(resp);
});

module.exports = router;
