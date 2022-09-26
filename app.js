require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

const users = [];

const pool = mysql.createPool({
    host:process.env.HOST,
    port:process.env.PORT,
    user:process.env.USER,
    password:process.env.PASSWORD,
    database:process.env.DATABASE
})

// Főoldal

app.get("/", function (req, res) {
    const q = "SELECT * FROM cars;";
    pool.query(q, 
        function (error, results) {
            if (!error) {
                res.render("home", {
                    cars: results
                });
            }
        }
    );
});

app.get("/about", function (req, res) {
    res.render("about");
});

// Admin felület

app.get("/admin", function (req, res) {
    res.render("admin");
});

app.post("/admin", function (req, res) {
    const password = "teslaisbest";
    if (req.body.adminpass == password) {
        res.redirect("admin/rents")
    }
    else {
        res.send({message: "Hibás jelszó!"})
    }
});

app.get("/admin/rents", function (req, res) {
    const q = "SELECT * FROM rents;"
    pool.query(q,
        function (error, results) {
            if (!error) {
                res.render("rents", {
                    rents: results
                });
            }
        }
    );
});

app.get("/admin/rents/:email", function (req, res) {
    const q = "SELECT * FROM rents WHERE email = ?;";
    pool.query(q, [req.params.email],
        function (error, results) {
            if (!error && results[0]) {
                res.render("rent", {
                    rent: results[0]
                });
            }
        }    
    );
});

app.post("/rents/:email", function (req, res) {
    const q = "DELETE FROM rents WHERE email = ?";
    pool.query(q, [req.params.email],
        function (error, results) {
            if (!error) {
                res.redirect("/admin/rents")
            }
        }    
    );
});

// Felhasználók

app.get("/users", (req, res) => {
    res.render("users", {
    });
});

app.get("/users/login", (req, res) => {
    res.render("login", {
    });
});

// Regisztráció

app.post('/users', (req, res) => {
    const username = req.body.username;
    const userpassword = req.body.userpassword
    const user = users.find(user => user.name == username);
    if (user) return res.status(400).send({message: "Van már ilyen nevű felhasználó!"});

    const hash = bcrypt.hashSync(userpassword, 10);
    users.push({name: username, password: hash});
    res.redirect("/users/login");
});

// Bejelentkezés

app.post('/users/login', (req, res) => {
    const username = req.body.username;
    const userpassword = req.body.userpassword
    const user = users.find(user => user.name == username);
    if (!user) return res.status(401).send({message: "Nincs ilyen nevű felhasználó!"});
    if (!bcrypt.compareSync(userpassword, user.password)) {
        return res.status(401).send({message: "Hibás jelszó!"});
    }
    const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: 3600});
    res.redirect("/cars");
});

// Token ellenőrzés

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send({message: "Azonosítás szükséges!"});
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).send({message: "Nincs jogosultsága!"});
        req.user = user;
        next();
    });
}

// Autók böngészése

app.get("/cars", function (req, res) {
    const q = "SELECT * FROM cars;";
    pool.query(q, 
        function (error, results) {
            if (!error) {
                res.render("cars", {
                    cars: results
                });
            }
        }
    );
});

app.get("/cars/:lplate", function (req, res) {
    const q = "SELECT * FROM cars WHERE lplate = ?;";
    pool.query(q, [req.params.lplate],
        function (error, results) {
            if (!error && results[0]) {
                res.render("car", {
                    car: results[0]
                });
            }
        }
    );
});

app.post("/cars/:lplate", function (req, res) {
    const q = "INSERT INTO rents (lplate, email, startdate, fname, lname) VALUES (?, ?, ?, ?, ?)"
    pool.query(q, [req.params.lplate, req.body.email, req.body.startdate, req.body.fname, req.body.lname],
        function (error, results) {
            if (!error) {
                res.redirect("/cars");
            }
            else {
                res.send("Ez az autó jelenleg foglalt!");
            }
        }
    )
});

app.listen(5000 , () => console.log("Szerver elindítva az 5000-es porton."));