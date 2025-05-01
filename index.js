const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db_access = require('./Db.js');
const cookieParser = require('cookie-parser');
const db = db_access.db;
const server = express();
const port = 555;
const secretKey = '@TKH24$3m1W3b';  // Secret key for JWT (store it securely)


server.use(cors());
server.use(express.json());
server.use(cookieParser());

const generateToken = (userId, isAdmin) => {
    return jwt.sign({ userId, isAdmin }, secretKey, { expiresIn: '1h' });
};
server.post('/signin',(req,res)=>{
    var email = req.body.email;
    var pass = req.body.password;
//     if(username === 'admin' && pass==='123456'){
//         var user ={};
//         user.firstName = 'Amir';
//         user.lastName = 'Tarek'
//         user.score = 1000000;
//         res.send(user);
//     }
//     else{
//         res.sendStatus(401);
//     }
// })
const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
 
        if (row) {
           
            bcrypt.compare(password, row.password, (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Error comparing password' });
                }
 
                if (result) {
                   
                    res.json({
                        id: row.id,
                       
                        email: row.email
                    });
                } else {
                   
                    res.status(401).json({ error: 'Invalid password' });
                }
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});
 
 
// User login endpoint with JWT generation
server.post('/user/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    db.get(`SELECT * FROM USER WHERE EMAIL='${email}'`, (err, row) => {
        if (err || !row) {
            return res.status(401).send(`Invalid credentials`);
        }

        // Compare the hashed password
        bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).send(`Invalid credentials`);
            }

            // Generate a JWT token on successful login
            const token = generateToken(row.ID, row.ISADMIN);
            return res.status(200).send({ message: 'Login successful', token });
        });
    });
});

// User registration endpoint with hashed password
server.post('/user/register', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const isAdmin = req.body.isAdmin;
    
    bcrypt.hash(password, 5, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send('Error hashing password');
        }

        db.run(`INSERT INTO USER (name,email,password,isadmin) VALUES ('${name}','${email}','${hashedPassword}',0)`, (err) => {
            if (err) {
                console.log(err.message);
                return res.status(401).send(err);
            }
            return res.status(200).send(`Registration successful`);
        });
    });
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization; // Bearer <token>

    if (!token) {
        return res.status(403).send('Token is required');
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).send('Invalid or expired token');
        }
        
        // Attach user data to request object
        req.userId = decoded.userId;
        req.isAdmin = decoded.isAdmin;
        next();
    });
};


// Add a room (only accessible by admin)
server.post('/rooms/addroom', verifyToken, (req, res) => {
    if (!req.isAdmin) {
        return res.status(403).send('Access denied');
    }

    const { room_type, capacity, price, availability } = req.body;

    let query = `INSERT INTO ROOM (ROOM_TYPE, CAPACITY, AVAILABILITY) 
                 VALUES ('${room_type}', ${capacity}, ${availability})`;

    db.run(query, (err) => {
        if (err) {
            console.log(err);
            return res.send(err);
        }
        return res.send('Room added successfully');
    });
});

// Get all rooms (accessible by everyone)
server.get('/rooms', verifyToken, (req, res) => {
    const query = `SELECT * FROM ROOM`;
    db.all(query, (err, rows) => {
        if (err) {
            console.log(err);
            return res.send(err);
        }
        return res.json(rows);
    });
});

// Get room details by ID
server.get('/rooms/:id', verifyToken, (req, res) => {
    const query = `SELECT * FROM ROOM WHERE ID = ${req.params.id}`;
    db.get(query, (err, row) => {
        if (err) {
            console.log(err);
            return res.send(err);
        }
        return res.json(row);
    });
});

// Update room availability
server.put('/rooms/edit/:id', verifyToken, (req, res) => {
    const { availability } = req.body;
    const query = `UPDATE ROOM SET AVAILABILITY = ${availability} WHERE ID = ${req.params.id}`;

    db.run(query, (err) => {
        if (err) {
            console.log(err);
            return res.send(err);
        }
        return res.send('Room availability updated');
    });
});

// Room booking route (protected)
server.put('/book', verifyToken, (req, res) => {
    const { room_id, check_in_date, check_out_date } = req.body;
    const userId = req.userId; // User ID from JWT

    // Check if the room is available
    let query = `SELECT * FROM ROOM WHERE ID = ${room_id} AND AVAILABILITY > 0`;
    db.get(query, (err, row) => {
        if (err) {
            console.log(err);
            return res.send(err);
        }

        if (!row) {
            return res.status(404).send('Room not available');
        }

        let roomID = row.ID;

        // Insert booking record
        let query2 = `INSERT INTO BOOKING (USER_ID, ROOM_ID, CHECK_IN_DATE, CHECK_OUT_DATE)
                      VALUES (${parseInt(userId, 10)}, ${roomID}, '${check_in_date}', '${check_out_date}')`;

        db.run(query2, (err) => {
            if (err) {
                console.log(err);
                return res.send(err);
            }

            // Decrease room availability
            let updatedAvailability = row.AVAILABILITY - 1;
            query = `UPDATE ROOM SET AVAILABILITY = ${updatedAvailability} WHERE ID = ${roomID}`;

            db.run(query, (err) => {
                if (err) {
                    console.log(err);
                    return res.send(err);
                }
                return res.send('Room booked successfully');
            });
        });
    });
});

// Start server and initialize database tables
server.listen(port, () => {
console.log(`Server started at http://localhost:${port}`);
    db.serialize(() => {
        db.run(db.createUserTable, (err) => {
            if (err) console.log('Error creating user table: ' + err);
        });
        db.run(db.createRoomTable, (err) => {
            if (err) console.log('Error creating room table: ' + err);
        });
        db.run(db.createBookingTable, (err) => {
            if (err) console.log('Error creating booking table: ' + err);
        });
    });
});

