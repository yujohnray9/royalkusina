const express = require('express');
const http = require('http');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const opn = require('opn');
const path = require('path');
const app = express();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const socketIo = require('socket.io');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const db = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: '',
   database: 'dbfood',
});

db.connect((err) => {
   if (err) {
      console.error('Error connecting to database:', err);
      return;
   }
   console.log('Connected to database');
});

const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
   res.redirect('/login');
});

app.get('/login', (req, res) => {
   res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'login.html'));
});

app.get('/index', (req, res) => {
   res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'main.html'));
});

const sessionStore = new MySQLStore(
   {
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000,
      createDatabaseTable: true,
      connectionLimit: 1,
      endConnectionOnClose: true,
      schema: {
         tableName: 'sessions',
         columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data',
         },
      },
   },
   db
);

app.use(
   session({
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: { secure: false },
   })
);

const seatStatuses = {};

app.get('/api/user-profile', async (req, res) => {
   const userId = req.session.user.id;
   const query =
      'SELECT name, age, contact, address, email FROM users WHERE id = ?';

   try {
      const user = await dbQuery(query, [userId]);
      if (user && user.length > 0) {
         res.status(200).json({ user: user[0] });
      } else {
         res.status(404).send('User not found');
      }
   } catch (err) {
      console.error('Error retrieving user profile:', err);
      res.status(500).send('Internal Server Error');
   }
});


app.post('/signup', async (req, res) => {
   const {name,age,contact,address, newUsername, newPassword, email } = req.body;
   const hashedPassword = await bcrypt.hash(newPassword, 10);

   const query =
      'INSERT INTO users (name,age,contact,address,username, password, email) VALUES (?, ?, ?,?,?,?,?)';

   try {
      await dbQuery(query, [name,age,contact,address,newUsername, hashedPassword, email]);
      res.redirect('/login');
   } catch (err) {
      console.error('Error inserting user:', err);
      res.status(500).send('Internal Server Error');
   }
});

app.post('/login', async (req, res) => {
   const { username, password } = req.body;
   const query = 'SELECT * FROM users WHERE username = ?';

   try {
      const results = await dbQuery(query, [username]);
      if (results.length === 0) {
         return res.status(400).send('Invalid username or password');
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
         req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            cart: [],
         };
         return res.redirect('/index');
      } else {
         return res.status(400).send('Invalid username or password');
      }
   } catch (err) {
      console.error('Error validating user:', err);
      return res.status(500).send('Internal Server Error');
   }
});

app.get('/api/menu-items', (req, res) => {
   const query = 'SELECT * FROM menu_items';
   db.query(query, (err, results) => {
      if (err) {
         console.error('Error retrieving menu items:', err);
         res.status(500).send('Internal Server Error');
         return;
      }
      res.status(200).json(results);
   });
});

app.get('/api/food-items', (req, res) => {
   const searchTerm = req.query.searchTerm;
   let query = 'SELECT * FROM food_items';
   let queryParams = [];

   if (searchTerm) {
      query += ' WHERE title LIKE ?';
      queryParams.push(`%${searchTerm}%`);
   }

   db.query(query, queryParams, (err, results) => {
      if (err) {
         console.error('Error retrieving food items:', err);
         res.status(500).send('Internal Server Error');
         return;
      }
      res.status(200).json(results);
   });
});

app.post('/api/Addtocart', async (req, res) => {
   try {
      const { itemId, quantity } = req.body;
      const userId = req.session.user?.id;

      const itemDetails = await dbQuery(
         'SELECT * FROM food_items WHERE id = ?',
         [itemId]
      );

      if (!userId) {
         return res.status(401).json({ error: 'User not authenticated' });
      }

      const existingCartItem = await dbQuery(
         'SELECT * FROM carts WHERE user_id = ? AND item_id = ?',
         [userId, itemId]
      );

      if (existingCartItem.length > 0) {
         await dbQuery(
            'UPDATE carts SET quantity = ?, item_price = ?, total_amount = ? WHERE user_id = ? AND item_id = ?',
            [
               quantity,
               itemDetails[0].price,
               quantity * itemDetails[0].price,
               userId,
               itemId,
            ]
         );
      } else {
         await dbQuery(
            'INSERT INTO carts (user_id, item_id, quantity, item_price, total_amount) VALUES (?, ?, ?,?,?)',
            [
               userId,
               itemId,
               quantity,
               itemDetails[0].price,
               quantity * itemDetails[0].price,
            ]
         );
      }

      const totalAmountQuery =
         'SELECT SUM(quantity * item_price) AS total_amount FROM carts WHERE user_id = ?';
      const totalAmountResult = await dbQuery(totalAmountQuery, [userId]);
      const totalAmount = totalAmountResult[0].total_amount || 0;

      await dbQuery('UPDATE users SET cart_total = ? WHERE id = ?', [
         totalAmount,
         userId,
      ]);

      res.status(200).json({ message: 'Item added to cart' });
   } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.post('/api/Updatecartquantity', async (req, res) => {
   const { itemId, quantity } = req.body;
   const userId = req.session.user.id;

   try {
      const existingCartItem = await dbQuery(
         'SELECT * FROM carts WHERE user_id = ? AND item_id = ?',
         [userId, itemId]
      );

      if (existingCartItem.length > 0) {
         const itemDetails = await dbQuery(
            'SELECT * FROM food_items WHERE id = ?',
            [itemId]
         );

         const newTotalAmount = quantity * itemDetails[0].price;

         await dbQuery(
            'UPDATE carts SET quantity = ?, total_amount = ? WHERE user_id = ? AND item_id = ?',
            [quantity, newTotalAmount, userId, itemId]
         );

         res.status(200).json({ message: 'Cart item quantity updated' });
      } else {
         res.status(404).json({ error: 'Cart item not found' });
      }
   } catch (err) {
      console.error('Error updating cart item quantity:', err);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.get('/api/cart', async (req, res) => {
   if (!req.session || !req.session.user) {
      return res.status(401).send('Unauthorized');
   }

   const userId = req.session.user.id;
   try {
      const cartItems = await dbQuery(
         'SELECT c.*, f.title, f.price, f.img FROM carts c JOIN food_items f ON c.item_id = f.id WHERE c.user_id = ?',
         [userId]
      );
      res.status(200).json(cartItems);
   } catch (err) {
      console.error('Error retrieving cart items:', err);
      res.status(500).send('Internal Server Error');
   }
});

app.post('/api/Removecart', async (req, res) => {
   const { cartItemId } = req.body;
   const userId = req.session.user.id;

   try {
      await dbQuery('DELETE FROM carts WHERE user_id = ? AND item_id = ?', [
         userId,
         cartItemId,
      ]);
      res.status(200).json({ message: 'Item removed from cart' });
   } catch (err) {
      console.error('Error removing item from cart:', err);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.post('/api/logout', (req, res) => {
   req.session.destroy((err) => {
      if (err) {
         console.error('Error destroying session:', err);
         res.status(500).send('Internal Server Error');
      } else {
         res.status(200).send('Logout successful');
      }
   });
});

app.post('/api/Addtofavorites', async (req, res) => {
   const { itemId } = req.body;
   const userId = req.session.user.id;

   try {
      await dbQuery('INSERT INTO user_favorites (user_id, item_id) VALUES (?, ?)', [
         userId,
         itemId,
      ]);
      res.status(200).json({ message: 'Item added to favorites' });
   } catch (err) {
      console.error('Error adding item to favorites:', err);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.post('/api/Removefavorite', async (req, res) => {
   const { favoriteId } = req.body;
   const userId = req.session.user.id;

   try {
      await dbQuery('DELETE FROM user_favorites WHERE user_id = ? AND id = ?', [
         userId,
         favoriteId,
      ]);
      res.status(200).json({ message: 'Item removed from favorites' });
   } catch (err) {
      console.error('Error removing item from favorites:', err);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.get('/api/favorites', async (req, res) => {
   const userId = req.session.user.id;

   try {
      const favorites = await dbQuery('SELECT uf.*, f.title, f.price, f.img FROM user_favorites uf JOIN food_items f ON uf.item_id = f.id WHERE uf.user_id = ?',[userId]
      );
      res.status(200).json(favorites);
   } catch (err) {
      console.error('Error retrieving user favorites:', err);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.post('/api/update-cart-total', async (req, res) => {
   const userId = req.session.user.id;
   const { cartTotal } = req.body;

   try {
      await dbQuery('UPDATE users SET cart_total = ? WHERE id = ?', [
         cartTotal,
         userId,
      ]);

      res.status(200).json({ message: 'Cart total updated successfully' });
   } catch (error) {
      console.error('Error updating cart total in the database:', error);
      res.status(500).json({ error: 'Internal Server Error' });
   }
});

app.post('/api/update-user-info', async (req, res) => {
   const userId = req.session.user.id;
   const {name, address,email, age, contact } = req.body;

   const query =
      'UPDATE users SET name=?, address=?,email=?, age=?, contact=? WHERE id=?';

   try {
      await dbQuery(query, [name, address, email, age, contact, userId]);
      res.redirect('/index');
   } catch (err) {
      console.error('Error updating user information:', err);
      res.status(500).send('Internal Server Error');
   }
});

io.on('connection', (socket) => {
   socket.emit('initialSeatStatuses', seatStatuses);
   socket.on('updateSeatStatus', ({ seatId, isOccupied }) => {
      seatStatuses[seatId] = isOccupied;
      io.emit('updatedSeatStatus', { seatId, isOccupied });
   });
});

const dbQuery = (sql, params) => {
   return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
         if (err) {
            reject(err);
         } else {
            resolve(results);
         }
      });
   });
};

const PORT = 3000;
app.listen(PORT, () => {
   console.log(`Server started on port ${PORT}`);
   opn(`http://localhost:${PORT}`);
});