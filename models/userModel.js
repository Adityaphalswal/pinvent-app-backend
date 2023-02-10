const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = mongoose.Schema({
    name : {
        type: String,
        required: [true, "Please add a name"]
    },
    email: {
        type: String,
        required: [true, "Please add a email"],
        unique: true,
        trim:true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            "Please enter a valid email"
        ]
    },
    password:{
        type:String,
        required: [true, "Please add a password"],
        minLength: [8, "Password must be more than 8 characters"],
        //maxLength: [23, "Password must be less than 23 characters"]
    },
    photo:{
        type:String,
        required: [true, "Please add a photo"],
        default: "https:://i.ibb.co/4pDNDk1/avatar.png"
    },
    phone:{
        type:Number,
        default: "+1"
    },
    bio: {
        type:String,
        maxLength: [500, "Bio must not be more than 250 characters"],
        default: "bio"
    }
},{
    timestamps:true
})

// Encrypt password before saving to DB
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")){
        return next();
    }
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password,salt);
    this.password = hashedPassword;
    next()
;})

const User = mongoose.model("User",userSchema)
module.exports = User