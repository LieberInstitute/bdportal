---- ## trigger for subjects table 
DROP TRIGGER IF EXISTS subj_ins_trigger on subjects;
DROP FUNCTION IF EXISTS subj_ins_trig;

CREATE function subj_ins_trig() RETURNS TRIGGER AS $$
 BEGIN
   IF NEW.id IS NULL OR NEW.id = 0 THEN
     NEW.id := (WITH x AS (SELECT idx::int from generate_series(2518,57599) as g(idx)
       WHERE NOT EXISTS (select id from subjects s where g.idx=s.id))
        SELECT idx FROM x OFFSET random()*(select count(*) from x) LIMIT 1); 
   END IF;
   RETURN NEW;
 END
 $$ LANGUAGE plpgsql;

CREATE TRIGGER subj_ins_trigger BEFORE INSERT ON subjects 
 FOR EACH ROW EXECUTE PROCEDURE subj_ins_trig();

---- #### function to encode/decode subject IDs to/from 4 char coding
--- #### NOTE : IDs must be < 57600 !
 -- 4-char encoding function: subjects.id => 4-char ID
 DROP function if exists encode4c;
 CREATE OR REPLACE FUNCTION encode4c(ids int[]) 
           RETURNS text[] as $$
  lset <- LETTERS[ ! LETTERS %in% c('I','O') ]
  dset <- as.character(seq(0,9))
  res <- c()
  for (n in ids) {
    v=n
    r4='' 
    for (div in c(10,24,10,24)) {
      if (div==10) {
        c=dset[ v %% div + 1]
      } else {
        c=lset[ v %% div + 1]
      }
      r4=paste0(c, r4)
      v = v %/% div
    }
    res<-c(r4, res)
  }
  return(res)
  $$ language plr;

 DROP function if exists decode4c;
 CREATE OR REPLACE FUNCTION decode4c(ids text[]) 
           RETURNS int[] as $$
  lset <- LETTERS[ ! LETTERS %in% c('I','O') ]
  dset <- as.character(seq(0,9))
  mul=c(1, 10, 24*10, 24*10*10)
  res <- c()
  for (c in ids) {
    arrc= rev(unlist(strsplit(c, split = "")))
    d=0
    for (i in seq(1,4)) {
      if ((i %% 2)==0) {
        d = d + (match(arrc[i], lset)-1)*mul[i]
      } else {
        d = d + (match(arrc[i], dset)-1)*mul[i]
      }
    }  
    res<-c(d, res)
  }
  return(res)
  $$ language plr;

---# example usage:
--select encode4c('{52897, 239}');
--select decode4c(ARRAY ['A0Z9', 'Y0K7']);


--------------------------------------------------------
--- get union of junction id sets by sample lists
drop function get_union_jset;
create or replace function get_union_jset (slist text[], ver int)
   returns int[]
   --returns table(sample_id text, jset_id int, jset_len int)
   as $$
   DECLARE
     allj int[] :='{}';
     r record; 
   BEGIN
	 FOR r in WITH js as (SELECT distinct f_set_id 
	        from exp_RNASeq x, exp_RNAseq_data d
               where x.sample_id =any(slist)  
               and d.ftype='j' and version=ver 
               and x.id=d.exp_id) 
              select f_ids from js, feature_sets 
                  where f_set_id=id
	 LOOP
        allj = allj | r.f_ids;
     END LOOP;
     RETURN allj;
END $$ language plpgsql;

--------------------------
-- ## see plr_modules.7.R for globally installed R functions
---------------------------

-- calcGeneRPKM(exp_id_start, exp_id_end, version)
DROP FUNCTION if exists calcGeneRPKM; 
drop type longmxrec;
create type longmxrec as (fset int, ord int, f_id int, exp_id int, value real);
CREATE OR REPLACE FUNCTION calcGeneRPKM(exp1 integer, exp2 integer, ver integer default 1) 
           RETURNS setof longmxrec as $$  
  rd=dbGetQuery(dbConn, paste0("select exp_id, f_set_id, f_ids as gids, f_data as counts",
      " from exp_rnaseq_data d, feature_sets s where dtype='counts' and version=", ver,
      " and d.f_set_id=s.id and d.ftype='g' and exp_id between ",exp1, " and ", exp2, " order by 1"))
  #-- split by f_set_id
  fsets<-unique(rd$f_set_id)
  accdf<-NULL
  for (fsetid in fsets) {
    dd<-subset(rd, f_set_id==fsetid)
    if (length(dd$exp_id)!=length(unique(dd$exp_id))) 
       pgerr("Duplicate exp_ids !")
    cmx<-as.matrix(do.call(cbind, dd$counts))
    colnames(cmx)<-dd$exp_id
    rownames(cmx)<-unlist(dd$gids[1])
    rdf<-dbGetQuery(dbConn, paste0("with fs as (select ord, fid FROM",
         " feature_sets f, unnest(f.f_ids) with ordinality a(fid, ord)", 
         " where ftype='g' and id=",fsetid, ")",
      " select ord, id as f_id, length from genes, fs where fid=id order by 1"))
    if (!identical(rdf$f_id, as.integer(rownames(cmx)))) {
          pgmsg(" ids NOT in the same order")
          rdf <-rdf[match(as.integer(rownames(cmx)), rdf$f_id), ]
    }
    #--compute normalized values
    nmx<-mxRPKM(cmx, rdf$length)
    longdx<-melt(data.table(nmx)[, fset:=fsetid][, ord:=rdf$ord][, f_id:=rdf$f_id], id.vars=c('fset','ord', 'f_id'))
    setnames(longdx, 'variable', 'exp_id')
    if (is.null(accdf)) { accdf <- longdx
       } else longdx <- rbindlist(list(accdf, longdx))
  }
  return(accdf)    
$$ language plr;

-- To use:
-- select * from calcGeneRPKM(1,3);

DROP FUNCTION if exists save_rse_gene;
--- params: fname, smplst, assay
-- REQUIRES the loaded helper R function: buildRSE(smplst, ftype='g', assay=assay)
CREATE OR REPLACE FUNCTION save_rse_gene(fname varchar, smplst varchar[], assay varchar default 'counts') 
           RETURNS text as $$
  outpath<-Sys.getenv('R_FILE_STAGING')
  if (substring(outpath,nchar(outpath))!='/') outpath<-paste0(outpath,'/')
  Sys.umask(mode="002")
  wdir=tempfile("", tmpdir="")
  if (substring(wdir,1,1)=='/') wdir<-substring(wdir,2)
  odir <- paste0(outpath, wdir)
  dir.create(odir, recursive=T)
  relpath <- paste0(wdir, '/', fname)
  outfile <- paste0(outpath, relpath)
  message(Sys.time(), "> received request to create ",fname)
  t0=Sys.time()
  rse_gene<-buildRSE(smplst, ftype='g', assay=assay)
  t1=Sys.time()  
  message("  << built in ",as.numeric(round(t1-t0,2)),"s. Saving it.. ")
  save(rse_gene, file=outfile)
  t2=Sys.time()
  message("  << file saved in ",as.numeric(round(t2-t1,2)),"s","\n       (", outfile, ")")
  return(relpath)
 $$ LANGUAGE plr;

DROP FUNCTION if exists save_rse;
-- params: fname, smplst, ftype, assaytype
-- REQUIRES the loaded helper R function: saveRSE() taking the same params
-- assay can be 'counts' or 'rpkm' ('c' or 'r'/'n'); fxt can be ''(RSE) or ',' (csv) or 't' (tsv) 
CREATE OR REPLACE FUNCTION save_rse(fname varchar, smplst varchar[], ver int default 1, genes varchar[] default '{}',
                  ftype varchar default 'g', mxtype varchar default 'counts', fxt varchar default '', h5 boolean default true) 
           RETURNS text as $$
    saveRSE(fname, smplst, ver, genes, ftype, mxtype, fxt, h5)       
 $$ LANGUAGE plr;

DROP FUNCTION if exists save_plot;
CREATE OR REPLACE FUNCTION save_plot(plot_type varchar, smplst varchar[], ver int default 1, genes varchar[] default '{}',
                  ftype varchar default 'g', fxt varchar default 'json') 
           RETURNS text as $$
    if (startsWith(tolower(plot_type),'age')) {
      return(saveAgePlot(smplst, ver, genes, ftype, fxt))
    }
    if (startsWith(tolower(plot_type),'box')) {
     return(saveBoxPlot(plot_type, smplst, ver, genes, ftype, fxt))
    }
    return(NULL)
 $$ LANGUAGE plr;


-- ## example uses:
--select save_rse( 'test_rse.from_h5.rda', array['R15930', 'R5637_C41CPACXX'], 1, '{}', 
--   'g', 'rpkm', '', true);
-- ## or for larger datasets:
--  NOTE: double (()) are needed for select statements to be seen as arrays!
-- # 69 samples took ~4s on gdebsrv
--  select save_rse_gene( "test_habenula.rda", (
--   select array_agg(sample_id) from exp_rnaseq x, datasets d 
--     where d.name='Habenula' and dataset_id=d.id) );
-- 727 samples in BSP1 
--SELECT * FROM reload_plr_modules();
--select * from r_typenames();
--select save_rse('bsp1_test.comprlvl2.rda',  (select array_agg(sample_id) from 
--        rnaseq_samples where dropped is not true and dataset='BrainSeq_Phase1'), 
--        1, '{}',  'g', 'rpkm', '', false);
--  h5:false : built in 10.77s, saved in 12.91s (total: 23.68s)
--  h5:true  : built in  3.96s, saved in 12.43s (total: 16.39s)
--select save_rse('bsp1_test.csv.gz',  (select array_agg(sample_id) from 
--        rnaseq_samples where dropped is not true and dataset='BrainSeq_Phase1'), 
--        1, '{}',  'g', 'rpkm', ',', false);
-- built in 9.14s  saved in 12.21s (total: 21.35s)
--select save_rse('bsp1_test.from_h5.csv.gz',  (select array_agg(sample_id) from 
--        rnaseq_samples where dropped is not true and dataset='BrainSeq_Phase1'),
--        1, '{}',  'g', 'rpkm', ',', true);
-- built in 5.38s saved in 19.17s (total: 24.55s)  -- double precision, more to write!

