'use strict';

const express = require('express');
const { append, get } = require('express/lib/response');
const { response } = require('express');
const req = require('express/lib/request');
const fs = require('fs');
const {MongoClient, ObjectId} = require('mongodb');
const PORT = 3000;
const USER_COLLECTION = 'user';
const axios = require('axios');
const app = express();
const BodyParser = require('body-parser');
const { url } = require('inspector');
const urlEncodedBodyParser = BodyParser.urlencoded({extended: false});
const { MlbApi } = require('/home/user/final_project/mlb_api.js');

app.use(express.static('public'));


try
{
  const details = require('./config/user_mongo.json');
}
catch(err)
{
  console.log(err);
  process.exit(2);
}
try
{
  const teams = require('./config/teams.json');
}
catch(err)
{
  console.log(err);
  process.exit(2);
}


let mongoDb;
let teams;
( async () =>
{
    try 
    {
        let config = fs.readFileSync('./config/user_mongo.json');
        let teamsJSON = fs.readFileSync('./config/teams.json');
        let details = JSON.parse(config);
        teams = JSON.parse(teamsJSON);
        try 
        {
            const URI = `mongodb://${details.host}:${details.port}?useUnifiedTopology=${details.opts.useUnifiedTopology}`;
            const MONGO_DB = details.db;
            const mongoConnect = await MongoClient.connect(URI);
            mongoDb = mongoConnect.db(MONGO_DB);
            
            // let usernameIndexed = mongoDb.collection(USER_COLLECTION).createIndex({"username": "name"});
            app.listen(PORT);
            console.log(`server started, port ${PORT}`);
        }
        catch (err)
        {
            console.error(err);
            process.exit(2);
        }
    }
    catch (err)
    {
        console.error(err);
        process.exit(2);
    }
})();


class validator
{
    async validateLogin(username, password)
    {
        let result = await mongoDb.collection(USER_COLLECTION).findOne({"username":username});
        if (result == null)
        {
            console.log('no account with that username found');
            return false;
        }
        else
        {
            if (result.password == password)
            {
                console.log('login valid, forwarding to home page');
                let result = await mongoDb.collection(USER_COLLECTION).updateOne({"username": username}, {$set: {"logged_in": true}});
                return true;
            }
            else
            {
                console.log('invalid password');
                return false;
            }
        }
    }
    async validateSignup(username, password, team)
    {
        let result = await mongoDb.collection(USER_COLLECTION).findOne({"username": username});
        console.log(result);
        if (result == null)
        {
            // check that query.team matches an option in base dict
            if (teams.teams.includes(team))
            {
                let user = {"username": username,
                            "password": password,
                            "team": team,
                            "logged_in": true,
                            "created_at": new Date()};

                let inserted = await mongoDb.collection(USER_COLLECTION).insertOne(user);
                console.log(inserted);
                return inserted.insertedId;
            }
            else
            {
                console.log('pick a different team');
                return false;
            }
        }
        else
        {
            console.log('username taken');
            return false;
        }
    }
}

const v = new validator();
const mlb = new MlbApi();

app.get('/ping', (req, res, next) => {
    try{
        console.log('ping');
        res.writeHead(200);
        res.end();
    }
    catch(err)
    {
        console.error(err);
        res.writeHead(404);
        res.end();
    }
    next();
});

app.post('/login', urlEncodedBodyParser, async (req, res, next) => {
    try 
    {
        const { username, password } = req.body;
        
        let validLogin = await v.validateLogin(username, password);
        
        if (validLogin)
        {
            console.log("Logged in!");
            // should redirect to /user/:username
            res.status(303).redirect('home.html');
            res.end();
        }
        else
        {
            console.log("login failed");
            res.status(303).send({username, password}).redirect('login.html');
            res.end();
        }
    }
    catch (err)
    {
        console.error(err);
        res.writeHead(404);
        res.end();
    }
    next();
})

app.post('/signup', urlEncodedBodyParser, async (req, res, next) => {
    try 
    {
        const {username, password, team} = req.body;
        let validSignup = await v.validateSignup(username, password, team);
        if (validSignup)
        {
            console.log("Signed up!");
            // should redirect to /user/:username
            res.status(303).send({username, password}).redirect('login.html');
            res.end();
        }
        else
        {
            console.log("Signup failed");
            res.writeHead(200);
            res.end();
        }
    }
    catch (err)
    {
        console.error(err);
        res.writeHead(404);
        res.end();
    }
    next();
})


async function getStats(req,res) {
    let response = await mlb.getTeamsStats(2022, (err,data) =>
    {
        console.log(data);
        return data;
    });
    return response;
}

const util = require('util');
const getStatsProm = util.promisify(mlb.getTeamsStats);

app.get('/team', async (req, res, next) => {
    try
    {
        var response = {teams:[{name:"Giants"}, {name: "Dodgers"}]};
        axios.get("https://statsapi.mlb.com/api/v1/schedule/?sportId=1&scheduleTypes=games")
            .then(data => res.status(200).send(json(data)))
            .catch(err => next(err));
        console.log('23');
        /*
        getStatsProm().then((err,data) => {
            console.log(data);
            console.error(err);
            res.status(200).send(data);
            res.end();
        });
        console.log('hello');
        (async () => {
            await mlb.getTeamsStats(2022, (err,data) =>
            {
                response = data;
                console.log(data);
                return data ;
            });
            console.log(response);
        
            res.status(200).send(response);
            res.end();
        })();*/
        res.status(200).send(response);
        res.end();
    }
    catch (err)
    {
        console.error(err);
        res.writeHead(400);
        res.end();
    }
    next();
})