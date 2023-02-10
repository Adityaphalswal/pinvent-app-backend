const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const { sendEmail } = require("../utils/sendEmail");


const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: "1d"})
}

const registerUser = asyncHandler( async (req,res) => {
   const {name,email,password} = req.body;

   // Validation 
   if(!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields", name,email,password)
   }

   if(password.length < 8 ) {
    res.status(400);
    throw new Error("Password must be upto 8 characters")
   }

   const userExists =  await User.findOne({email})
   if(userExists) {
    res.status(400);
    throw new Error("Email has already been registered")
   }

   // Create new user
   const user = await User.create({
    name,
    email,
    password
   })

    // Generate Token
    const token = generateToken(user._id)
    // Send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400 ), // 1day
        // sameSite: "none",
        // secure: true
    })

   if(user) {
    const {_id, name, email, photo, phone, bio} = user
    res.status(201).json({
        _id, name, email, photo, phone, bio,token
    })
   } else {
    res.status(400)
    throw new Error("Invalid user data")
   }


})

// Login User
const loginUser = asyncHandler( async (req,res) => {
    const {email,password} =req.body;

    // Validate Request
    if(!email || !password) {
        res.status(400)
        throw new Error("Please Email and Password")
    }

    // Check if user exists
    const user = await User.findOne({email});
    if(!user) {
        res.status(404)
        throw new Error("User not found, Please Signup")
    }

    // User exists, check if password correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password)

    // Generate Token
    const token = generateToken(user._id)

    // Send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400 ), // 1day
        // sameSite: "none",
        // secure: true
    })

    if(user && passwordIsCorrect) {
        const {_id, name, email, photo, phone, bio} = user;
        res.status(200).json({
        _id, name, email, photo, phone, bio,token
        })
    }else{
        res.status(400)
        throw new Error("Invalid email or password");
    }

})

const logout = asyncHandler(async(req,res)=>{
    // Logout
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0), // expire cookie
        // sameSite: "none",
        // secure: true
    })
    return res.status(200).json({
        message: "Successfully logout"
    })
})

// Get User data
const getUser = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user._id)

    if(user) {
        const {_id, name, email, photo, phone, bio} = user
        res.status(200).json({
            _id, name, email, photo, phone, bio
        })
    }else{
        res.status(404);
        throw new Error("User not found")
    }
})

// Login Status
const loginStatus = asyncHandler(async (req,res) => {
    const token  = req.cookies.token;
    if(!token) {
        return res.json(false)
    }
    const verified = jwt.verify(token,process.env.JWT_SECRET);
    if(verified) {
        return res.json(true)
    }else {
        return false
    }
})

// Update User
const updateUser = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user._id)

    if(user) {
        const {name, email, photo, phone, bio} = user;
        user.email = email;
        user.name = req.body.name || name;
        user.photo = req.body.photo || photo;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;

        const updatedUser = await user.save();
        res.json({
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            bio: updatedUser.bio,
            phone: updatedUser.phone,
        })
    }else{
        res.status(404);
        throw new Error("User not found")
    }
})

// Update Password
const updatePassword = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user._id)

    const {oldPassword, password} = req.body

    if(!user) {
        res.send(400);
        throw new Error("User not found, please signup ")
    }
    // Validate
    if(!oldPassword || !password) {
        res.send(400);
        throw new Error("Please add old and new Password")
    }
    // check if password matches password in db
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    // Save new password
    if(user && passwordIsCorrect){
        user.password = password
        await user.save()
        res.status(200).send("Password changed successfully")
    } else{
        res.status(400);
        throw new Error("Old Password is Incorrect")
    }

})

const forgotPassword = asyncHandler(async (req,res) => {
    const {email} = req.body
    const user = await User.findOne({email})

    if(!user){
       res.status(404)
       throw new Error("User does not exists")
    }

    // Delete token if it exists in DB
    let token = await Token.findOne({userId: user._id})
    if(token) {
        await token.deleteOne()
    }

    // Create Reset Token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    console.log(resetToken)
    
    // Hash Token to store in DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Save Token to DB
    await new Token ({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 *(60*1000) // Thirty Minutes
    }).save()

    // Construct Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${hashedToken}`

    // Reset Email
    const message = `
        <h2>Hello ${user.name}</h2>
        <p>Please use the url below to rest your password.</p>
        <p>This reset link is valid for only 30 minutes.</p>
        <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
        <p>Regards</p>
        <p>Pinvent Team</p>
    `
    // Subject,sent_from,send_to
    const subject = "Password Reset Request"
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER

    try {
        await sendEmail(subject,message,send_to,sent_from)
        res.status(200).json({success:true,message:"Reset Email Sent"})
    } catch (error) {
        res.status(500)
        throw new Error(`Email not sent, please try again. ${error}`)
    }

})

// Reset Password
const resetPassword = asyncHandler(async(req,res) => {
    const  {password} = req.body
    const {resetToken} = req.params

    // Hash Token, compare to that one in db
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Find token in DB
    const userToken = await Token.findOne({
        token: hashedToken,
        expiresAt: {$gt:Date.now()}
    })

    if(!userToken){
        res.status(404);
        throw new Error("Invalid Token");
    }

    // Find user
    const user = await User.findOne({_id: userToken.userId})
    user.password = password;
    await user.save()
    res.status(200).json({message: "Password reset successful. Please login"})

})

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    updatePassword,
    forgotPassword,
    resetPassword
}