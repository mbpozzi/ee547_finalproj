'use strict';

const express = require('express');
const { MlbApi } = require('/home/user/ee547/project/mlb_api.js')
const mlb = new MlbApi();

const bodyparser = require('body-parser');
const fs = require('fs');
const { pid } = require('process');

const app = express();
const PORT = 3000

// Server functions
app.get('/ping', (req,res) => {
    console.log("Hello")
    res.status(204);
    res.end();
});

app.get('/test', (req,res) => {
    mlb.getTeamsStats('2022', (err,data) =>{
        console.log(data);
        res.status(200).json(data);
        res.end();
    })

});

app.listen(PORT)

console.log("Server started")