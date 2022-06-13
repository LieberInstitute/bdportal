const os=require("os");
const express = require('express');
const axios = require('axios')
//const bodyParser = require('body-parser');
// -- no longer needed for express 4.16+
const jwt = require('jsonwebtoken');
const { Pool, Client } = require("pg");
//const http = require('http');
//const bodyParser = require('body-parser');
//const async = require("async");
//const request = require("request");
const fs = require('fs');
const path = require('path');
const db = require('./db');
//const { emitWarning } = require('process');


// Read in config vars
const config = require('./config.json');

//ATTN: make sure config.json has these properly set and localized
// r_filedir must match the R_FILE_STAGING directory (or a local mounted directory of it)
const dbname = config['dbname'] || 'rse';
const app_port = config['app_port'] || 4095;

//const hostname = process.env.HOSTNAME; //WHY is this undefined?!
const hostname = os.hostname()
require('dotenv').config(); // .env should have DB_SRV, DB_USER, DB_PASS
//console.log("process.env:", process.env)
const dbuser = process.env.DB_USER;
const dbpasswd = process.env.DB_PASS;
let auth_srv = 'http://192.168.77.16:6443'; //where to send the auth request, "/auth" will be appended
let dbserver = process.env.DB_SRV;
let r_filedir='/dbdata/cdb/r_staging'; //default on srv16
let mail_url = 'http://192.168.77.16:1244/';
if (hostname=="gryzen" || hostname=="gi7" || hostname=="gdebsrv") {
    if (!dbserver) dbserver='gdebsrv';
    if (hostname=="gryzen")
             r_filedir="\\\\gdebsrv\\ssdata\\postgresql\\r_staging\\";
       else if (hostname=="gi7") r_filedir="/data/gdebsrv_ssdata/postgresql/r_staging";
           else r_filedir="/ssdata/postgresql/r_staging";
    mail_url = 'http://gdebsrv:14244/';
    auth_srv= 'http://192.168.2.2:16600'; //no ssl in my LAN tests
} else { //LIBD devel or server, or aws
  if (!dbserver) dbserver='localhost';
  if (hostname=="linwks34") {
         r_filedir=(dbserver=='localhost') ? '/ssdata/postgresql/r_staging' : '';
  } //else { //MUST be on srv16 itself, or aws
    //r_filedir='/dbdata/cdb/r_staging';
    //if (hostname!=='srv16') console.log("WARNING: srv16 assumed, r_filedir set to: ", r_filedir)
  //}
}
const auth_url = `${auth_srv}/auth`;
console.log(`db ${dbuser}@${dbserver} (${r_filedir}), mail url: ${mail_url}, auth: ${auth_srv}`)

const jwt_shh =  process.env.JWTSHH

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

const db_creds = {
  user: dbuser,
  host: dbserver,
  database: dbname,
  password: dbpasswd,
  port: 5432,
};

// ------------------ MAIN ENTRY POINT:
const app = express();

db.init(db_creds);

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
// ----------- middleware setup -----
// requests FIRST go through these MIDDLEware app.use() handlers which can transform/parse the request
//      and THEN they arrive at app.get()/app.post() ENDpoint handlers
//      (with the req potentially modified by the app.use() handlers)
// ----------------------------------
// parsers for POST data
// -- bodyParser functionality now built in express 4.16+
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json()); //parse JSON-encoded POST requests
//to allow parsing of url-encoded POST requests (application/x-www-form-urlencoded):
app.use(express.urlencoded({ extended: false }));
//extend : false -- means only strings and arrays are being parsed
//       : true     any encoded (nested) objects can be decoded, more work
// Allow CORS requests
app.use(  (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ----------- routes handling

app.get('/', (req, res) => {
    res.status(400).send('Invalid Request');
});

app.post('/auth', (req, res) => {
  //Bill's request was also passing ca : fs.readFileSync(cafile) as request param
  /* for axios, certificate can be passed as a  httpsAgent parameter
     which can be read in advance, before the routing:

    const agent = new https.Agent({ ca: fs.readFileSync("./resource/bundle.crt"),
         rejectUnauthorized: (process.env.NODE_ENV !== 'development')});

    and then add an additional axios.post param :
      axios.post(url, body,
        { httpsAgent : agent } ).then( ... )
  */
  axios.post(auth_url, {
    username: req.body.username,
    password: req.body.password,
  }).then(authres=> {
    //{signed_user:, token:}
    console.log("response data:", authres.data)
    res.status(200).json(authres.data);
    //log authentication here
    //updateLog(db, req.body.username, 'AUTH')
  }).catch((err) => {
    res.status(500).json({ message: err });
    //updateLog(db, req.body.username, 'AUTHFAIL')
  });
});

/* once authentication took place, authres.data.token will be stored
 by the client and sent as req.token (or req.authorization) with every
 future restricted/sensitive request, so the request should be validated
 like this:
app.post('/status', (req, res)=> {
    const jwt_token = req.headers.authorization;
    let username = req.body.username; // does not matter
    try {
      // override username with the one in the encoded token
      const decoded_token = jwt.verify(jwt_token, jwt_shh);
      username = decoded_token; //override prev given username
    } catch(err) {
      res.status(403).send("EMPLOYEE: Unauthorized Access /employee AUTH");
      return;
    }
   ...
  });
*/

app.post('/mail', (req, res) => {
  axios.post(mail_url, req.body).then(ares=> {
    res.status(200).json(ares.data);
  }).catch((err) => {
    res.status(500).json({ message: err });
  });
});

app.post('/pgdb/adl', (req, res) => {
   let feature=req.body.feature || 'g'
   let filetype=req.body.filetype || 'rse'
   let fname=req.body.fname || 'ftmp'
   let dtype=req.body.dtype || 'counts'
   let sarr=req.body.samples
   if (sarr.length===0) res.status(500).send(
       { error: ':user error', message: " empty sample list provided"}
   )
   db.query('select save_rse_gene($1, $2, $3)',
         [fname, sarr, dtype ], (err, dbrows)=>{
      if (err) {
        res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
      }
      else {
        //console.log( "pdgb/adl response: ", res)
        res.json(dbrows);
      }
   });
})


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
  const pool = new Pool(db_creds);
  const now = await pool.query("SELECT NOW()");
  await pool.end();
  return now;
}

function queryDsetList(res, dtype) {
  const dslstqry=`SELECT d.name, case when d.public is true then 1 else 0 end as public,
  d.id, COUNT(*) as num_samples FROM exp_${dtype} x, datasets d
  WHERE x.dataset_id = d.id AND x.dropped is not TRUE and dtype='${dtype}'
  GROUP BY 3 ORDER BY 3`;
  db.query(dslstqry, [], (err, dbrows)=>{
    if (err) {
      res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
    } else {
     res.json(dbrows);
   }
  });
}


// ----  route with sub-routes/terms
app.get(['/pgdb/:qry/:dtype','/pgdb/:qry'] , (req, res)=> {
    console.log(`got pg query: ${req.params.qry}`);
    //possible subpages: sel (default), ex, rep
    switch (req.params.qry) {
      case 'dsets': queryDatasets(res, req.params.dtype);
                    break;
      case 'dslist': queryDsetList(res, req.params.dtype);
                     break;
      case 'adl': notImplemented(req, res);//queryDx(res);
                     break;
      case 'dx': notImplemented(req, res);//queryDx(res);
                 break;
      default: res.status(400).send('Invalid Request');
    }
})

app.get('/rstaging/:fpath', (req, res)=> {
  let relpath=req.params.fpath
  //convert relpath
  relpath=relpath.replace(/\|/g, '/')
  console.log("~~vv~~ got rstaging query: "+relpath);
  let fpath=path.join(r_filedir, relpath);
  //console.log("     trying to load: ", fpath);
  if (fs.existsSync(fpath)) {
      //console.log(`calling res.download(${fpath})`)
      res.download(fpath)
    }
    else res.status(400).send('File does not exist!');
})

app.get('/ruthere', (req, res)=> {
    console.log('#>>> ping /ruthere received')
    res.send("online");
})


app.get('/pgplrinit', (req, res)=> {
  //DEBUG: disable this for now:
  //res.send('nop'); return;
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
app.listen(app_port, () => console.log(`Server listening on port ${app_port}`))
