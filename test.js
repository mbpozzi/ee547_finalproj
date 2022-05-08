const { MlbApi } = require('/home/user/ee547/project/mlb_api.js')


mlb = new MlbApi();
/*
mlb.getTeamsAdvStats('2017', (err,data) => {
    try{
        console.log(data[0].team);
        console.log(data[0].stats)
    }
    catch(err){
        console.log(err);
    }
});
*/
mlb.getWorldSeriesPerc((err,data) =>{
    console.log(data)
})



