const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRoute = require("./routes/userRoute")
const contactRoute = require("./routes/contactRoute")
const productRoute = require("./routes/productRoutes")
const errorHandler  =require("./middleWare/errorMiddleware")
const cookieParser = require("cookie-parser")
const path = require("path");

const app  = express()

// Middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(function (req, res, next) {
    //Enabling CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, 
    Accept, x-client-key, x-client-token, x-client-secret, Authorization");
     next();
    });
// app.use(cors({
//      origin : ["http://localhost:3000", "https://pinvent-4fdojnnbo-adityaphalswal.vercel.app"],
//      credentials: false
//  }))
// app.use(cors({
//     origin: '*',
//     methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
// }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Routes Middleware
app.use("/api/users", userRoute)
app.use("/api/products", productRoute)
app.use("/api/contactus", contactRoute)

// Routes
app.get("/",(req,res)=>{
    res.send("Home Page")
})

//Error Middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000;

// Connect to Mongodb and start server
mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`Server Running on port ${PORT}`)
    })
}).catch((err) => console.log(err))
