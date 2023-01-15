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
let auth_srv = 'https://192.168.77.16:6443'; //where to send the auth request, "/auth" will be appended
let dbserver = process.env.DB_SRV;
let r_filedir='/dbdata/cdb/r_staging'; //default on srv16
let d_filedir='/ssd/dbdata/h5base'; //default on srv16
let mail_url = 'http://192.168.77.16:1244/';
if (hostname=="gryzen" || hostname=="glin" || hostname=="gdebsrv") {
    if (!dbserver) dbserver='gdebsrv';
    if (hostname=="gryzen") {
             r_filedir="\\\\gdebsrv\\ssdata\\postgresql\\r_staging\\";
             d_filedir="\\\\gdebsrv\\data1\\postgresql\\h5base\\"
    }
       else if (hostname=="glin") {
           r_filedir="/data/gdebsrv_ssdata/postgresql/r_staging";
           d_filedir="/data/gdebsrv_data1/postgresql/h5base"
       } else { //gdebsrv itself
           r_filedir="/ssdata/postgresql/r_staging";
           d_filedir="/data1/postgresql/h5base";
       }
    mail_url = 'http://gdebsrv:14244/';
    auth_srv= 'http://192.168.2.2:16600'; //no ssl in my LAN tests
} else { //LIBD devel, or server, or aws
  if (!dbserver) dbserver='192.168.77.16';
  if (hostname=="linwks34") {
         if (dbserver=='localhost') {
             r_filedir= '/ssdata/postgresql/r_staging';
             d_filedir='/ssdata/postgresql/h5base';
         }
  } //else { //MUST be on srv16 itself, or aws
    //r_filedir='/dbdata/cdb/r_staging';
    //if (hostname!=='srv16') console.log("WARNING: srv16 assumed, r_filedir set to: ", r_filedir)
  //}
}
const auth_url = `${auth_srv}/auth`;
db.clog(`db ${dbuser}@${dbserver} (${r_filedir}), mail url: ${mail_url}, auth: ${auth_srv}`)

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
app.use(express.urlencoded({ extended: true }));
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


app.post('/authck', (req, res) => {
  //const jwt_token = req.headers.authorization;
  const jwt_token = req.body.token;
  let uname = req.body.username; // does not matter
  try {
    // override username with the one in the encoded token
      const decoded_token = jwt.verify(jwt_token, jwt_shh);
      if (uname == decoded_token)  //override prev given username
          res.send(uname)
      else res.status(403).send("JWT error: username mismatch!")
  } catch(err) {
       res.status(403).send("Unauthorized Access /user AUTH");
    return;
  }
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
    console.log("auth response data:", authres.data)
    res.status(200).json(authres.data);
    //log authentication here
    //updateLog(db, req.body.username, 'AUTH')
  }).catch((err) => {
    console.log("auth FAIL in middleware!");
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
  //console.log("received mail request:", req.body)
  axios.post(mail_url, req.body).then(ares=> {
    res.status(200).json(ares.data);
  }).catch((err) => {
    console.log("mail req err:", err)
    res.status(500).json({ message: err });
  });
});


app.post('/pgdb/gcheck', (req, res) => {
   let body=req.body
   let dtype=body.dtype
   let glst=body.genelist
   let annset=body.annset || 'gencode25'
   //console.log( "received glst as:", glst )
   if (glst.length===0) res.status(500).send(
       { error: ':user error', message: " empty gene list provided"}
      )
   db.query("select g.id, g.gene_id, g.name, g.type from ann_dsets a, genes g "+
      ` where a.name ILIKE '${annset}%' and g.name=ANY($1)`, [ glst ]
            , (err, dbrows)=>{
      if (err) {
        res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
      }
      else {
        res.json(dbrows);
      }
   });
});

app.post('/pgdb/adl', (req, res) => {
   let body=req.body
   let feature=body.feature || 'g';
   feature=feature.charAt(0).toLowerCase(); // 'g', 't', 'e', 'j' or 'm'
   let filetype=body.filetype || 'rse';
   let fxt = filetype.charAt(0).toLowerCase()=='r' ? '' : filetype.charAt(0).toLowerCase();
   let glst=body.genes
   //console.log(" received req.body:", body, "   glst=", glst)
   let fname=body.fname;
   //let glst=req.boby.genes;
   const garr=(glst)?glst.split(',') : []
   let dtype=body.dtype || 'counts'; //can also be 'meta' for metadata only
   let sarr=body.samples;
   if (sarr.length===0) res.status(500).send(
       { error: ':user error', message: " empty sample list provided"}
   )
   //const glst=['RIN2A','GRIN2B','SP4']
   const qry=(glst) ? "select save_rse($1, $2, 1, $3, $4, $5, $6)" :
   "select save_rse($1, $2, 1, '{}', $3, $4, $5)";
   const qparms=(glst) ? [fname, sarr, garr, feature, dtype, fxt ] :
                         [fname, sarr, feature, dtype, fxt ] ;
   // [fname, sarr, glst, feature, dtype, fxt ]
   db.query(qry, qparms
            , (err, dbrows)=>{
      
      if (err) {
        //console.log( "pdgb/adl error: ", err)
        res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
      }
      else {
        //console.log( "pdgb/adl response: ", dbrows)
        res.json(dbrows);
      }
   });
})

app.post('/ulog', (req, res) => {
  let body=req.body
  const user=`'${body.user}'`
  const action=`'${body.action}'::user_act`
  //action MUST be one of: 'login', 'explore', 'request', 'req_geno', 'download'
  
  const dtype=body.dtype ? `'${body.dtype}'::expDataType` : 'rnaseq'
  //dtype one of: 'rnaseq', 'dnam', 'wgs', 'lrna', 'mirna', 'scrna', 'genotype'

  const reqtext=body.reqtext ? `'${body.reqtext}'` : 'NULL'
  let dsets="'NULL'"
  if (body.dsets && Array.isArray(body.dsets)) { // must be an array of dataset_ids (int)
    dsets="'{"+body.dsets.join(',') +"}'" 
  }
  
  const iqry='insert into userlog (login, activity, dtype, dsets, reqtext) '+
              `values (${user}, ${action}, ${dtype}, ${dsets}, ${reqtext})`
  db.query(iqry, [], (err, dbrows)=>{
          if (err) {
            console.log( "ulog error: ", err)
            res.status(500).send({ error: err.severity+': '+err.code, message: err.message })
          }
          else {
            console.log( "ulog response: ", dbrows)
            res.json(dbrows);
          }
       });
})

app.post('/gtreq', (req, res) => {
  let body=req.body
  //let brlist=body.brlist;
  //console.log(" received req.body:", body, "   glst=", glst)
  //const barr=(brlist)?brlist.split(',') : []
  let brarr=body.brnums;
  if (brarr.length===0) res.status(500).send(
      { error: ':user error', message: " empty BrNum list provided"}
  )
  //TODO: write the list to file, send the list to geo.pertea@libd.org

})

app.post('/pgdb/plotdl', (req, res) => {
  let body=req.body
  let feature=body.feature || 'g';
  feature=feature.charAt(0).toLowerCase();
  // let filetype=body.filetype || 'json'; // plotly JSON
  //let fxt = filetype.charAt(0).toLowerCase()=='r' ? '' : filetype.charAt(0).toLowerCase();
  let glst=body.genes //expect as string, comma delimited list
  //console.log(" received req.body:", body, "   glst=", glst)
  let plotType=body.plotType; //which plot: 'age', 'box-gene', 'box-region', ...
  //let glst=req.boby.genes;
  const garr=(glst)?glst.split(',') : []
  if (plotType.indexOf('qc')<0) { // most plots require a gene list, except maybe QC plots?
    if (garr.length===0)
      res.status(500).send( { error: ':user error', message: " no gene list provided!"} )
  }
  //let dtype=body.dtype || 'counts';
  let sarr=body.samples;
  if (sarr.length===0) res.status(500).send(
      { error: ':user error', message: " empty sample list provided"}
  )
  const qry=(glst) ? "select save_plot($1, $2, 1, $3, $4)" :
  "select save_plot($1, $2, 1, '{}', $3)";
  const qparms=(glst) ? [plotType, sarr, garr, feature ] :
                        [plotType, sarr, feature ] ;
  // [fname, sarr, glst, feature, dtype, fxt ]
  db.query(qry, qparms
           , (err, dbrows)=>{
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
    db.clog(`got pg query: ${req.params.qry}`);
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
  db.clog('~~ got rstaging query:', relpath);
  let fpath=path.join(r_filedir, relpath);
  if (fs.existsSync(fpath)) {
       //res.download(fpath)
       //const cfghdr={ 'content-encoding':'gzip', 'content-type': 'application/json' }
       //if (relpath.endsWith('.json.gz') ) res.set(cfghdr);
       //console.log("Sending file: ", fpath)
       if (relpath.endsWith('.json.gz') || relpath.endsWith('.json') || relpath.endsWith('.png'))
          res.sendFile(fpath)
       else
          res.download(fpath)
       //res.sendFile(fpath, { headers: cfghdr })
    }
    else res.status(400).send(`ERROR: file does not exist: ${fpath}`);
})

app.get('/stdata/:fpath', (req, res)=> { // static data file under H5BASE file directory
  let relpath=req.params.fpath
  //convert relpath under d_filedir
  relpath=relpath.replace(/\|/g, '/')
  db.clog('~~ got stdata query:', relpath);
  let fpath=path.join(d_filedir, relpath);
  if (fs.existsSync(fpath)) {
       //res.download(fpath)
       //const cfghdr={ 'content-encoding':'gzip', 'content-type': 'application/json' }
       //if (relpath.endsWith('.json.gz') ) res.set(cfghdr);
       //console.log("Sending file: ", fpath)
       if (relpath.endsWith('.json.gz') || relpath.endsWith('.json') || relpath.endsWith('.png'))
          res.sendFile(fpath)
       else
          res.download(fpath)
       //res.sendFile(fpath, { headers: cfghdr })
    }
    else res.status(400).send(`ERROR: file does not exist: ${fpath}`);
})


app.get('/ruthere', (req, res)=> {
    db.clog(' ping /ruthere received')
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
app.listen(app_port, () => console.log('listening on port', app_port))
