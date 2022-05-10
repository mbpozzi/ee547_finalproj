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
let teamNames;
( async () =>
{
    try 
    {
        let config = fs.readFileSync('./config/user_mongo.json');
        let teamsJSON = fs.readFileSync('./config/teams.json');
        let details = JSON.parse(config);
        teamNames = JSON.parse(teamsJSON);
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
            if (teamNames.teams.includes(team))
            {
                let user = {"username": username,
                            "password": password,
                            "team": team,
                            "logged_in": true,
                            "created_at": new Date()};

                let inserted = await mongoDb.collection(USER_COLLECTION).insertOne(user);
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

class decorator
{
    decorateTeamForDirectory(team)
    {
        let decTeam = { "team": team.team, 
                        "stats": {
                                "batting_avg_for": team.stats.hitting.avg,
                                "runs_for": team.stats.hitting.runs,
                                "era_for": team.stats.pitching.era,
                                "runs_against": team.stats.pitching.runs    
                            }
                        }
        return decTeam;
    }
    decorateTeamForUser(team)
    {
        team = team[0];
        let decTeam = {"team": team.team, 
                "stats": {
                    "batting_avg_for": team.stats.hitting.avg,
                    "obp_for": team.stats.hitting.obp,
                    "slg_for": team.stats.hitting.slg,
                    "ops_for": team.stats.hitting.ops,
                    "runs_for": team.stats.hitting.runs,
                    "era_pitching": team.stats.pitching.era,
                    "strikeouts_pitching": team.stats.pitching.strikeOuts,
                    "walks_pitching": team.stats.pitching.baseOnBalls,
                    "runs_against": team.stats.pitching.runs
                    }
                }
        return decTeam;
    }
}
const v = new validator();
const d = new decorator();
const mlb = new MlbApi();

let teamsArray = [];
mlb.getTeamsStats('2022', (err, data) =>
{
    teamsArray = data;
    console.log('Got teams');   
});
/*
let predictions = [];
mlb.getWorldSeriesPerc((err, data) => {
    predictions = [];
    console.log('got predictions');
    console.log(predictions);
})
*/
app.get('/ping', (req, res, next) => {
    try{
        console.log('ping');
        console.log(teamsArray);
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
            res.status(303).redirect(`/user.html?username=${username}`);
            res.end();
        }
        else
        {
            res.status(303).redirect('login.html');
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

app.get('/user/:username', urlEncodedBodyParser, async (req, res, next) =>
{
    try
    {
        // check if username exists and user is logged in
        
        let userData = await mongoDb.collection(USER_COLLECTION).findOne({"username": req.params.username});
        let favoriteTeam = teamsArray.filter(t => t.team == userData.team);
        let decoratedTeam = d.decorateTeamForUser(favoriteTeam); 
        //res.writeHead(303, {Location: "user.html"}).json(decoratedTeam);
        res.status(200).json(decoratedTeam);
        //res.status(303).redirect('user.html').json(decoratedTeam);
        res.end();
        next();
    }
    catch (err) 
    {
        console.error(err);
        res.end();
        next();
    }
})

app.post('/signup', urlEncodedBodyParser, async (req, res, next) => {
    try 
    {
        const {username, password, team} = req.body;
        let validSignup = await v.validateSignup(username, password, team);
        if (validSignup)
        {
            res.status(303).redirect(`/user.html?username=${username}`);
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

app.post('/logout', urlEncodedBodyParser, async (req, res, next) =>{
    try
    {
        let body = req.body;
        //let result = await mongoDb.collection(USER_COLLECTION).updateOne({"username": username}, {$set: {"logged_in": true}});        
        console.log('logging out');
    }
    catch (err)
    {
        console.error(err);
        res.writeHead(400);
        res.end();
    }
    next();
})

app.get('/team', async (req, res, next) => {
    try
    {
        let decoratedTeams = teamsArray.map(t => d.decorateTeamForDirectory(t));
        res.status(200).json(decoratedTeams);
        res.end();
        next();
    }
    catch (err)
    {
        console.error(err);
        res.writeHead(400);
        res.end();
        next();
    }
})

app.post('/user', urlEncodedBodyParser, async (req, res, next) => {
    try
    {
        const newTeam = req.body.team;
        const username = req.body.username;
        let updatedTeam = await mongoDb.collection(USER_COLLECTION).updateOne({"username": username}, {$set: {"team": newTeam}});
        let path = `/user.html?username=${username}`;
        res.status(303).redirect(path);
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