const router = require('express').Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../models/user')
const { default: axios } = require('axios');
const { authMiddleWare } = require('../utils/auth')


router.post('/signup', async (req, res) => {

    let user = await User.findOne({ $or: [{ steamid: req.body.steamid }, { username: req.body.username }, { email: req.body.email }]})

    if (user) {
        return res.status(400).json({
            message: "The Username/E-mail/SteamID has already been registered!"
        })
    }
    

    const hash = await bcrypt.hash(req.body.password, 10)

    try {
        const user = new User({
            username: req.body.username, 
            email: req.body.email,
            password: hash,
            steamid: req.body.steamid
        })
    
        await user.save()

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '16h' })
    
        return res.status(200).json({
            username: user.username,
            accessToken: token
        })
    } catch (err) {
        return res.status(500).json({
            message: "Something went wrong, Try again!"
        })
    }

    

})

router.post('/signin', async (req, res) => {

    const user = await User.findOne({ $or: [ { username: req.body.username }, { steamid: req.body.username }, { email: req.body.username }] })
    
    if (!user) {
        return res.status(400).json({
            message: "Please check your credentials!"
        })
    }

    const match = await bcrypt.compare(req.body.password, user.password)
    
    if (!match) {
        return res.status(400).json({
            message: "Please check your credentials!"
        })
    }

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '16h' })

    return res.status(200).json({
        username: user.username,
        accessToken: token
    })
})

router.get('/checksteamauth', async (req, res) => {

    let steamExists = true;
    
    if (!req.query.steamid) {
        return res.status(400).json({
            message: "Enter a valid SteamID"
        })
    }

    await axios.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + process.env.STEAM_KEY + '&steamids=' + req.query.steamid)
    .then((res) => {
        if (!res.data || !res.data.response || !res.data.response.players || res.data.response.players.length === 0) {
            steamExists = false
        }
        
    })
    .catch((err) => {
        console.log(err)
        steamExists = false
    })

    if (steamExists) {
        return res.status(200).json({
            message: "SteamID is Valid"
        })
    } 

    return res.status(400).json({
        message: "This SteamID Does Not Exist!"
    })

})

router.get('/checkcreds', async (req, res) => {
    
    let userNameFind = await User.findOne({ username: req.query.username })

    if (userNameFind) {
        return res.status(400).json({
            message: "This Username is already taken!"
        })
    }   

    let userEmailFind = await User.findOne({ email: req.query.email })

    if (userEmailFind) {
        return res.status(400).json({
            message: "This E-mail is already registered!"
        })
    }

    return res.status(200).json({
        message: "Credential Check Success!"
    })

})

router.get('/checkauth', authMiddleWare, (req, res) => {
    res.status(200).json({
        message: req.username
    })
})

module.exports = router