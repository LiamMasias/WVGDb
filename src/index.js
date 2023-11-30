const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.
const path = require('path');

const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

const createFriendshipsTable = `
  CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id1 INT REFERENCES users(userId),
    user_id2 INT REFERENCES users(userId),
    status VARCHAR(20) DEFAULT 'pending'
  );
`;

db.none(createFriendshipsTable)
  .then(() => {
    console.log('Friendships table created successfully');
  })
  .catch((error) => {
    console.error('Error creating friendships table:', error.message || error);
  });

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

  app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static(path.join(__dirname, 'resources')));

// Test API
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});

});
///////////////////////////////////////////////////////////////////////////////////////
app.get('/')

app.get('/', (req, res) => {
  res.redirect("/login");
  });
  
app.get("/login", (req, res) => {
  res.render("pages/login");
});




app.post("/login", async (req, res) => {
  // check if password from request matches with password in DB
  const query = "SELECT * FROM users where username = $1;";
  const username = req.body.username;

  db.any(query, [username])
      .then(async function (data) {
          if(data.length > 0){
              const match = await bcrypt.compare(req.body.password, data[0].password);
          console.log(match);

          console.log(data[0])

          
          console.log("Database connection and search successful");
          
          if(match){
              req.session.user = username;
              req.session.save();
              res.redirect("/home");
          } else {
              throw new Error("User not found")
          }
          } else {
              res.redirect("/home")
          }
      })
      .catch((err) => {
          console.log("Login Failed!!!")
          res.status(200).render("pages/login"), {
              message: "Login failed, please double check your login",
          };
      });
})

app.get('/register', (req, res) =>{
  res.render('pages/register');
});
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10); // Add this back in bcrypt.hash
  const username = await req.body.username;
  const firstName = await req.body.firstName;
  const lastName = await req.body.lastName;
  const email = await req.body.email;

  const insertUsers = `INSERT INTO users (username, email, firstName, lastName, password) VALUES ('${username}', '${email}', '${firstName}', '${lastName}', '${hash}');`;
  db.any(insertUsers)
      // If query succeeds, will send an okay status, post on the console for dev purposes
      .then(function (data){
          console.log("User Registration Successful")
          res.redirect('/login');
      })
      // If query fails due to error in retrieving required information
      .catch(function (err){
          console.log("User Registration Failed, Please Try Again")
          res.redirect('/');
      })
})


const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/register");
  }
  next();
};

// // Authentication Required
app.use(auth);

// Route for logout
app.get('/logout', (req, res) => {
  // Destroy the user's session
  req.session.destroy((err) => {
    if(err) {
      console.error('Error during logout:', err);
    } 
    
    else {
      console.log('Logged out Succesfully');
    }
    
    // Redirect to the login page with a success message
    res.render('pages/logout', { message: 'Logged out Successfully', error: false });
  });
});

app.get('/home', (req, res) => {
  res.render('pages/game');
  // let data = 'fields name,aggregated_rating,genres.name;\nsort aggregated_rating desc;\nwhere aggregated_rating != null & genres != null;';

  // let config = {
  //   method: 'post',
  //   maxBodyLength: Infinity,
  //   url: 'https://api.igdb.com/v4/games',
  //   headers: { 
  //     'Client-ID': process.env.TWITCH_CID, 
  //     'Authorization': 'Bearer '+ process.env.ACCESS_TOKEN, 
  //     'Content-Type': 'text/plain', 
  //     'Cookie': '__cf_bm=8QJ8jiONy6Mtn0esNjAq1dWDKMpRoJSuFwD.GELBeBY-1699991247-0-AVsH85k1GHSbc/QyMLxL41NsnyPCcMewbUmoqYU27SEklnJ+yZp3DmsAJWgoIQf4n8xdepIl4htcY4I65HSmaZQ='
  //   },
  //   data : data
  // };

  // axios.request(config)
  // .then((response) => {
  //   console.log(JSON.stringify(response.data));
  //   res.sendStatus(200).message("Success").render("pages/home", {games: response});
  // })
  // .catch((error) => {
  //   res.sendStatus(500).message("Failure");
  //   console.log(error);
  // });
});

app.post("/upload-img", (req, res) => {
  // const data = 
});

// Discover
app.get("/discover", (req, res) => {
  let data =
    'fields name,aggregated_rating,genres.name, screenshots.url ;\nsort aggregated_rating desc;\nwhere aggregated_rating != null & genres != null & screenshots!=null;';

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.igdb.com/v4/games",
    headers: {
      "Client-ID": process.env.TWITCH_CID,
      Authorization: "Bearer " + process.env.ACCESS_TOKEN,
      "Content-Type": "text/plain",
      Cookie:
        "__cf_bm=8QJ8jiONy6Mtn0esNjAq1dWDKMpRoJSuFwD.GELBeBY-1699991247-0-AVsH85k1GHSbc/QyMLxL41NsnyPCcMewbUmoqYU27SEklnJ+yZp3DmsAJWgoIQf4n8xdepIl4htcY4I65HSmaZQ=",
    },
    data: data,
  };
  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      res.status(200).render("pages/discover", { games: response.data });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Failure");
    });
});

app.get('/game', (req, res) =>{
  res.render('pages/game');
});



app.get('/profile', auth, async (req, res) => {
  try {
    const username = req.session.user; // Assuming the user's username is stored in the session
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Render the profile page with user data
    const friends = await getFriends(user.userId);
    const friendRequests = await getFriendRequests(user.userId);

    res.render('pages/profile', { user, friends, friendRequests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//helper fcn for getting friendfs
async function getFriends(userId) {
  try {
    const query = `
      SELECT users.*
      FROM users
      JOIN friendships ON users.userId = friendships.user_id2
      WHERE friendships.user_id1 = $1 AND friendships.status = 'accepted';
    `;
    const friends = await db.any(query, [userId]);
    return friends;
  } catch (err) {
    console.error(err);
    return [];
  }
}
//helper fcn for grabbing friend reqs
async function getFriendRequests(userId) {
  try {
    const query = `
      SELECT users.*
      FROM users
      JOIN friendships ON users.userId = friendships.user_id1
      WHERE friendships.user_id2 = $1 AND friendships.status = 'pending';
    `;
    const friendRequests = await db.any(query, [userId]);
    return friendRequests;
  } catch (err) {
    console.error(err);
    return [];
  }
}

app.post('/send-friend-request', auth, async (req, res) => {
  try {
    // Get the current user and friend's username from the form
    const { user } = req.session;
    const { friendUsername } = req.body;

    // Get user IDs for the current user and the friend
    const currentUser = await db.one('SELECT userId FROM users WHERE username = $1', [user]);
    const friend = await db.one('SELECT userId FROM users WHERE username = $1', [friendUsername]);

    // Check if a friend request already exists
    const existingRequest = await db.oneOrNone(
      'SELECT * FROM friendships WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)',
      [currentUser.userId, friend.userId]
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent or received.' });
    }

    // Create a new friend request
    await db.none('INSERT INTO friendships (user_id1, user_id2, status) VALUES ($1, $2, $3)', [
      currentUser.userId,
      friend.userId,
      'pending',
    ]);

    res.status(200).json({ message: 'Friend request sent successfully.' });
    res.render('pages/profile', { user, friends, friendRequests });
  } catch (error) {
    console.error('Error sending friend request:', error.message || error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





  module.exports  = app.listen(3000);
  console.log('Server is listening on port 3000');
