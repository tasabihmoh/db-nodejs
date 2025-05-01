const sqlite= require('sqlite3')
const db= new sqlite.Database('MAD.db')
const createUserTable= `CREATE TABLE IF NOT EXISTS USER 
(ID INTEGER PRIMARY KEY AUTOINCREMENT,
NAME TEXT NOT NULL,
EMAIL TEXT UNIQUE NOT NULL,
PASSWORD TEXT NOT NULL,
ISADMIN INT)`



const createRoomTable = `CREATE TABLE IF NOT EXISTS ROOM (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ROOM_TYPE TEXT NOT NULL,
    CAPACITY INT NOT NULL,
    AVAILABILITY INT NOT NULL
)`;

const createBookingTable = `CREATE TABLE IF NOT EXISTS BOOKING (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    USER_ID INT,
    ROOM_ID INT,
    CHECK_IN_DATE TEXT NOT NULL,
    CHECK_OUT_DATE TEXT NOT NULL,
    FOREIGN KEY (USER_ID) REFERENCES USER(ID),
    FOREIGN KEY (ROOM_ID) REFERENCES ROOM(ID)
)`;

// Export database schema creation queries
module.exports = {
    db,
    createUserTable,
    createRoomTable,
    createBookingTable
};

