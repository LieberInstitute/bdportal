const express = require('express');

const { Pool, Client } = require("pg");
//const http = require('http');
//const bodyParser = require('body-parser');
//const async = require("async");
//const request = require("request");


// Read in config vars
const config = require('./config.json');

//ATTN: make sure config.json has these properly set and localized
// r_filedir must match the R_FILE_STAGING directory (or a local mounted directory of it)
const dbserver = config['dbserver']; 
const dbuser = config['dbuser'];
const dbpasswd = config['dbpasswd'];
const dbname = config['dbname'];
const r_filedir= config['r_filedir'];
/* -- config as in Bill's timesheet server
const jwtsecret = config['jwtsecret'];
const authserver = config['authserver'];
const cafile = config['cafile'];
const mailserver = config['mailserver'];
const mailport = config['mailport'];

// const dburl = "mongodb://" + dbserver + ":27017/timesheets";
const authurl = "https://" + authserver + "/auth";
const namecheckurl = "https://" + authserver + "/auth/exists";
const mailurl = "http://" + mailserver + ":" + mailport + "/";
*/

const credentials = {
  user: dbuser,
  host: dbserver,
  database: dbname,
  password: dbpasswd,
  port: 5432,
};

const fs = require('fs');
const path = require('path');
const db = require('./db');
const app = express();
const port = 4000;

db.init(credentials);

// -- Parsers for POST data (Bill)
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));


/* Use a self-calling function so we can use async / await.
(async () => {
  const poolResult = await poolNowTest();
  console.log("Time with pool: " + poolResult.rows[0]["now"]);

  const clientResult = await clientNowTest();
  console.log("Time with client: " + clientResult.rows[0]["now"]);
})();
*/

// Connect with a connection pool.
function poolTest() {
  
  //const now = await pool.query("SELECT NOW()");
  //await pool.end();
  db.query("select id, name from datasets where dtype='rnaseq'", [], (err, res)=>{
     return res;
  });
  
}

// Allow CORS requests
app.use(  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    res.status(400).send('Invalid Request');
});

//const mdata={};
//const jzfile='rnaseq_samples.json.gz';
//-- load json.gz file
/* const fetchZjson = async (url) => {
function fetchZjson(fname) {
   const compr = new Uint8Array(
     fs.readFileSync(fname)
     );
   const decompr = fflate.decompressSync(compr);
   //console.log("Decompressed len: ", decompr.byteLength);
   const str = fflate.strFromU8(decompr);
   return JSON.parse(str);
}

function resRNASeqSelector(res, dta) {
  //TODO: cookie/session data to restore last selection?
  //TODO: caching so there is no need to return the whole thing again?
  res.json(dta);
} 
//
let res=fetchZjson(jzfile);
console.log("loading json.gz file..")
//let objs=Object.keys(res); console.log(objs);
for(var prop in res) mdata[prop]=res[prop];
*/
/* ---- example route:
app.get('/rnaseq', (req, res) => {
  // main rnaseq entry - sample selector
  console.log('/rnaseq req!')
  resRNASeqSelector(res, mdata);
})
*/

function errorHandler(err, req, res, next) {
  res.status(500)
  res.render('error', { error: err })
}

function notImplemented(req, res) {
 res.json({ route: req.path, status: "NOT IMPLEMENTED"} ); //just show the request object
}

const qry_rna_dsets=`with dsbr as (select distinct dataset_id as ds_id, p.id as p_id
  FROM exp_rnaseq e, samples s, subjects p
  WHERE e.dropped is not true and e.s_id=s.id and s.subj_id = p.id ),
dxc as (select ds_id, dx_id, count(*) as bc from dsbr, subjects p
     where p_id=p.id group by 1,2 order by 1 ),
 dxsum as (select ds_id, array_agg(dx || ':' || bc::text order by dx.id) as dxs,
   sum(bc) as brcount from dxc, dx where dx_id=dx.id group by 1 ),
ac as (select ds_id, case when age<=0 then 0 when age<=15 then 1  else 2 end as agebin,
     count(*) as bc from dsbr, subjects p where p_id=p.id group by 1,2 order by 1 ),
 asum as (select ds_id, array_agg(case agebin when 0 then 'fetal' when 1 then 'child' else 'adult' end
      || ':' || bc::text order by agebin) as agebins from ac group by 1 order by 1 ),
racec as (select ds_id, race, count(*) as bc from dsbr, subjects p
     where p_id=p.id group by 1,2 order by 1 ),
 racesum as (select ds_id, array_agg(race || ':' || bc::text order by race) as ancestry
   from racec group by 1 )
select d.id, d.name, dxs as "Dx", ancestry as "ancestry", agebins, brcount as "#subjects"
 from dxsum dx, asum a, racesum r, datasets d where d.id=dx.ds_id
   and r.ds_id=d.id and a.ds_id=dx.ds_id`
function queryDatasets(res, dtype) {
   let parms=[];
   if (dtype && dtype.length) parms=dtype;
  //if (dtype) { qry+=" where dtype = $1"; parms=[dtype]; }
  //qry+="  order by 1"
  db.query(qry_rna_dsets, parms, (err, dbrows)=>{
    if (err) {
      res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
    } 
    else {
      res.json(dbrows);
    }
 });
}

async function queryDx(res) {
  //should return res.json(something)? async.watefall maybe?
  //find examples for running queries
  const pool = new Pool(credentials);
  const now = await pool.query("SELECT NOW()");
  await pool.end();
  return now;
}

// ----  route with sub-routes/terms
app.get(['/pgdb/:qry/:dtype','/pgdb/:qry'] , (req, res)=> {
    console.log("got pg query:"+req.params.qry);
    //possible subpages: sel (default), ex, rep
    switch (req.params.qry) {
      case 'dsets': queryDatasets(res, req.params.dtype); 
                    break;
      case 'dx': notImplemented(req, res);//queryDx(res);
                 break;
      default: res.status(400).send('Invalid Request');
    }
})

app.get('/rstaging/:file', (req, res)=> {
  console.log("got rstaging query:"+req.params.file);
  let fpath=path.join(r_filedir,req.params.file);
  console.log(" trying to load: ", fpath);
  if (fs.existsSync(fpath)) {
      //console.log(`calling res.download(${fpath})`)
      res.download(fpath)
    }
    else res.status(400).send('File does not exist!');
})

app.get('/ruthere', (req, res)=> {
    res.send("online");
})


app.get('/pgplrinit', (req, res)=> {
  //DEBUG: disable this for now:
  res.send('nop');return;
  db.query('select * from r_version()', [], (err, dbrows)=>{
    if (err) {
      //res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
      res.send('error')
    } 
    else {
      res.send('pl/r');
    }
 });
  //res.status(400).send('x');
})


//adding some fake dummy sub-tabs for the RNASeq entry
app.listen(port, () => console.log(`Server started on port ${port}`))
