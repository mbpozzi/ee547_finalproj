'use strict';

const axios = require('axios');
const scrape = require('./scraper.js');
const util = require('util');
const fs = require('fs');
const { join } = require('path');



const readFile = util.promisify(fs.readFile);
const AL_TEAMS = ['BAL','BOS','CHW','CLE','DET','HOU','KCR','LAA','MIN','NYY','OAK','SEA','TBR','TEX','TOR'];
const NL_TEAMS = ['ARI','ATL','CHC','CIN','COL','LAD','MIA','MIL','NYM','PHI','PIT','SDP','SFG','STL','WSN'];
class Decorator{
    teamStats(obj_hit, obj_pitch){
        return {
            team: obj_hit.team.name,
            stats: {
                hitting: obj_hit.stat,
                pitching: obj_pitch.stat 
            }
        }
    }
    getStats(hit_splits,pitch_splits){
        var stats = []
        for(let i = 0; i < hit_splits.length; i++){
            let team = hit_splits[i].team.name;
            this.findStats(team,pitch_splits)
            stats.push(this.teamStats(hit_splits[i],this.findStats(team,pitch_splits)));
        }
        return(stats);
    };
    getAdvStats(results){
        var hit = results[0];
        var pitch = results[1];
        var adv_stats = [];
        for(const row of hit){
            //console.log(row);
            adv_stats.push(this.teamAdvStats(row,this.findAdvStats(row[1],pitch)));
        }
        return(adv_stats)
    };

    teamAdvStats(row_hit,row_pitch){
        return {
            team:   row_hit[1],
            stats:  {
                hitting:    {
                    bb_perc:    this.statDec(row_hit[3]),
                    k_perc:     this.statDec(row_hit[4]),
                    bb_k:       this.statDec(row_hit[5]),
                    avg:        this.statDec(row_hit[6]),
                    obp:        this.statDec(row_hit[7]),
                    slg:        this.statDec(row_hit[8]),
                    ops:        this.statDec(row_hit[9]),
                    iso:        this.statDec(row_hit[10]),
                    spd:        this.statDec(row_hit[11]),
                    babip:      this.statDec(row_hit[12]),
                    ubr:        this.statDec(row_hit[13]),
                    wGDP:       this.statDec(row_hit[14]),
                    wSB:        this.statDec(row_hit[15]),
                    wRC:        this.statDec(row_hit[16]),
                    wRAA:       this.statDec(row_hit[17]),
                    wOBA:       this.statDec(row_hit[18]),
                    wRCp:       this.statDec(row_hit[19])
                },
                pitching:   {
                    k_9:        this.statDec(row_pitch[2]),
                    bb_9:       this.statDec(row_pitch[3]),
                    k_bb:       this.statDec(row_pitch[4]),
                    hr_9:       this.statDec(row_pitch[5]),
                    k_perc:     this.statDec(row_pitch[6]),
                    bb_perc:    this.statDec(row_pitch[7]),
                    k_bb_perc:  this.statDec(row_pitch[8]),
                    avg:        this.statDec(row_pitch[9]),
                    whip:       this.statDec(row_pitch[10]),
                    babip:      this.statDec(row_pitch[11]),
                    lob_perc:   this.statDec(row_pitch[12]),
                    era_m:      this.statDec(row_pitch[13]),
                    fip_m:      this.statDec(row_pitch[14]),
                    xfip_m:     this.statDec(row_pitch[15]),
                    era:        this.statDec(row_pitch[16]),
                    fip:        this.statDec(row_pitch[17]),
                    e_f:        this.statDec(row_pitch[18]),
                    xfip:       this.statDec(row_pitch[19]),
                    siera:      this.statDec(row_pitch[20])
                }   
            }
        }
    }

    findStats(team,splits){
        for(let i = 0; i < splits.length; i++){
            if(team == splits[i].team.name){
                return(splits[i])
            }
        }
    }

    findAdvStats(team,table){
        for(let i = 0; i<table.length;i++){
            if(team == table[i][1]){
                return(table[i]);
            }
        }
    }

    statDec(stat){
        if(stat.includes('%')){
            stat = parseFloat(stat)/100;        
        }
        return((Number(stat).toFixed(3)))
    }
    


}
const d = new Decorator();

class Predictor{
    getCSV(file){
        return readFile(file, 'utf-8');
    }
    getCoeff(csv){
        var thenProm = this.getCSV(csv).then(data => {
            data = data.replace(/\n/g, ",").split(",")
            var keys = [];
            var vals = []
            for(var i = 0; i < data.length; i += 2) {  
                keys.push(data[i]);
                vals.push(data[i+1]);
            }
            var result = {}
            keys.forEach((key, i) => result[key] = vals[i]);
            return result
        })
        return(thenProm);
    }
    dotProduct(a,b){
        const result = a.reduce((acc, cur, index)=>{
          acc += (cur * b[index]);
          return acc;
        }, 0);
        return result;
    }
    async calcRegr(data){
        var cof = await this.getCoeff('./coef.csv');
        var hitting_vals = Object.values(data.stats.hitting);
        var hitting_cof = Object.values(cof).slice(0,hitting_vals.length)
        var hitting_reg = this.dotProduct(hitting_vals,hitting_cof)

        var pitching_vals = Object.values(data.stats.pitching);
        var pitching_cof = Object.values(cof).slice(hitting_vals.length,hitting_vals.length+pitching_vals.length)
        var pitching_reg = this.dotProduct(pitching_vals,pitching_cof)
        return(hitting_reg+pitching_reg+Number(cof.int))
    }

    async getALProbs(arr){
        var result = []
        var keys = []
        for(const obj of arr){
            if(AL_TEAMS.includes(obj.team)){
                var reg = await this.calcRegr(obj);
                keys.push(obj.team)
                result.push(reg);
            } 
        }
        var res_norm = this.calcNorm(result);
        var soft = this.calcSoftmax(res_norm);
        var vals = []
        for(const val of soft){
            vals.push((val*100).toFixed(2)+' %');
        }
        var result = {};
        keys.forEach((key, i) => result[key] = vals[i]);
        return result;
    }
    
    async getNLProbs(arr){
        var result = []
        var keys = []
        for(const obj of arr){
            if(NL_TEAMS.includes(obj.team)){
                var reg = await this.calcRegr(obj);
                keys.push(obj.team)
                result.push(reg);
            } 
        }
        var res_norm = this.calcNorm(result);
        var soft = this.calcSoftmax(res_norm);
        var vals = []
        for(const val of soft){
            vals.push((val*100).toFixed(2)+' %');
        }
        var result = {};
        keys.forEach((key, i) => result[key] = vals[i]);
        return result;
    }

    calcNorm(arr){
        var new_arr = []
        var den = Math.max(...arr) - Math.min(...arr);
        for(const val of arr){
            new_arr.push(((val-Math.min(...arr))/den))
        }
        return(new_arr)
    }

    calcSoftmax(arr) {
        return arr.map(function(value,index) { 
          return Math.exp(value) / arr.map( function(y /*value*/){ return Math.exp(y) } ).reduce( function(a,b){ return a+b })
        })
    }
};
const p = new Predictor;

class MlbApi {
    getTeamsStats(year, callback) {
        const hitting_call = `https://statsapi.mlb.com/api/v1/teams/stats?group=hitting&stats=season&season=${year}&sportIds=1`;
        const pitching_call =  `https://statsapi.mlb.com/api/v1/teams/stats?group=pitching&stats=season&season=${year}&sportIds=1`
        const requestOne = axios.get(hitting_call);
        const requestTwo = axios.get(pitching_call);
        axios.all([requestOne, requestTwo]).then(axios.spread((...responses) => {
            const resp_one = responses[0]
            const resp_two = responses[1]
            callback(null, d.getStats(resp_one.data.stats[0].splits,resp_two.data.stats[0].splits));
          })).catch(errors => {
            console.log("Error");
            callback(errors);
        });
    }
    
    getTeamsAdvStats(year,callback){
        try{
            var scrape_data = scrape.scrape(year);
            scrape_data.then(function(result){
                callback(null,d.getAdvStats(result));
            });
        }
        catch(err){
            callback(err);
        }
    }

    getWorldSeriesPerc(callback){
        //const csv = './coef.csv';
        var adv_stats = this.getTeamsAdvStats('2022', (err,data) => {
            try{
                (async () =>{
                    var AL_probs = await p.getALProbs(data);
                    var NL_probs = await p.getNLProbs(data);
                    var ret = {
                        American: AL_probs,
                        National: NL_probs
                    }
                    callback(null,ret);
                })();
            }
            catch{
                return(err);
            }
        });
        
    }
}

exports.MlbApi = MlbApi;



