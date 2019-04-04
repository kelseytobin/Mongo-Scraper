//grab dependencies 
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
require("dotenv").config();

//scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

//require all models
var db = require("./models");

//set the port
var PORT = process.env.PORT || 3000;

//initialize Express
var app = express();

//use morgan logger for logging requests
app.use(logger("dev"));
// parse request body as JSON
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
//make public a static folder
app.use(express.static("public"));

//Handlebars
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main"
    })
);
app.set("view engine", "handlebars");

//original connection to mongo that produced error
//var MONGODB_URI = process.env.MONGODB_URI || ("mongodb://localhost/articles", { useNewUrlParser: true });
//mongoose.connect(MONGODB_URI);


//second connection string that works
// var uristring =
//     process.env.MONGOLAB_URI ||
//     process.env.MONGOHQ_URL ||
//     'mongodb://localhost/buckrail';

// mongoose.connect(uristring, {
//     useNewUrlParser: true
// }, function (err, res) {
//     if (err) {
//         console.log('ERROR connecting to: ' + uristring + '. ' + err);
//     } else {
//         console.log('Succeeded connected to: ' + uristring);
//     }
// });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/buckrail";
mongoose.connect(MONGODB_URI);

//Routes
//=======================================================================================================================
app.get("/", function(req, res) {

    db.Article.find({})
    .then(function(dbArticle) {
        var hbsobj = {
            article: dbArticle
        };
        res.render("index")
    })
    .catch(function(err) {
        res.json(err);
    })
});

app.get("/scrape", function (req, res) {

    axios.get("https://buckrail.com/").then(function (response) {

        var $ = cheerio.load(response.data);
        //   console.log(response.data)


        $("header").each(function (i, element) {

            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("h5")
                .text();
            // result.summary = $(this)
            //     .children("p")
            //     .text();
            result.link = $(this)
                .children("h5")
                .children("a")
                .attr("href");

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {

                    console.log(dbArticle);
                })
                .catch(function (err) {

                    console.log(err);
                });
            
            // console.log(result);
            console.log(result.link);
        });

        // Send a message to the client
        res.redirect("/");
    });
});

app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({
            _id: req.params.id
        })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({
                _id: req.params.id
            }, {
                note: dbNote._id
            }, {
                new: true
            });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});



// Start the server
//==================================================================================================================
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});