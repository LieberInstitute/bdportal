#!/bin/bash
#make sure PGHOST is set to the server host
psql -d rse -U ruser << 'EOT' > regions.tab
COPY (with rc as (SELECT r.id, r.name, INITCAP(COALESCE(r.fullname, r.name)) as fullname,
	      COUNT(r_id) as rnum FROM exp_rnaseq x
	   JOIN  samples s ON x.s_id=s.id AND x.dropped is not true
	   RIGHT OUTER JOIN regions r ON s.r_id=r.id
	   GROUP BY 1),
	 dc as (SELECT r.id, COUNT(r_id) as dnum 
	  FROM exp_dnam m
	   JOIN  samples s ON m.s_id=s.id AND m.dropped is not true
	   RIGHT OUTER JOIN regions r ON s.r_id=r.id
	   GROUP BY 1)
	select rc.id, rc.name, rc.fullname, rnum as "RNAseq", 
	  dnum as "DNAm" from rc, dc where rc.id=dc.id 
	   and (rnum>0 or dnum>0) order by 1) TO STDOUT WITH DELIMITER E'\t';
EOT

psql -d rse -U ruser << 'EOT' > datasets.tab
COPY (with rds as (SELECT d.id, d.name, 
  case when d.public is true then 1 else 0 end as public, COUNT(*) as num,
  dtype
  FROM exp_rnaseq x, datasets d
   WHERE x.dataset_id = d.id AND x.dropped is not TRUE	    
    GROUP BY 1 ORDER BY 1),
 dds as ( select d.id, d.name, 
  case when d.public is true then 1 else 0 end as public, COUNT(*) as num,
  dtype
  FROM exp_dnam x, datasets d
   WHERE x.dataset_id = d.id AND x.dropped is not TRUE
    GROUP BY 1 ORDER BY 1)
 select * from rds 
   union
 select * from dds
 order by 1) TO STDOUT WITH DELIMITER E'\t';
EOT

psql -d rse -U ruser << 'EOT' > dx.tab
COPY (with rxnum as (SELECT dx_id, count(dx_id) as num
 FROM (select distinct brint, dx_id
    from exp_rnaseq x, samples s, subjects p, dx d 
    where x.dropped is not true and 
    x.s_id = s.id and p.id=s.subj_id and d.id=p.dx_id) as sel
   group by 1),
dxnum as (SELECT dx_id, count(dx_id) as num
 FROM (select distinct brint, dx_id 
   from exp_dnam m, samples s, subjects p, dx d 
   where m.s_id = s.id and p.id=s.subj_id and d.id=p.dx_id) as sel
   group by 1),
 dxtbl as ( select case when r.dx_id is null then d.dx_id
        else r.dx_id end, coalesce(r.num,0) as RNAseq, coalesce(d.num,0) as DNAm
  from rxnum r
  full outer join dxnum d on r.dx_id=d.dx_id )
 select dx_id, dx, INITCAP(COALESCE(dx.name, dx)) as fullname, rnaseq, dnam from dxtbl, dx
  where dx_id=dx.id order by 1) TO STDOUT WITH DELIMITER E'\t';
EOT

psql -d rse -U ruser << 'EOT' > brains.tab
COPY (select id, brint,  dx_id, race, sex, 
  TRUNC(age::NUMERIC, 2) as age, pmi from subjects where dropped is not true)
 TO STDOUT WITH DELIMITER E'\t';
EOT

psql -d rse -U ruser << 'EOT' > samples.0.tab
COPY (SELECT brint, sample_id as id, dataset_id as dset, s.r_id as reg,
      case when protocol='RiboZeroGold' then 3
         when protocol='RiboZeroHMR' then 2
         when protocol='PolyA' then 1 
         else 0 end as proto
       FROM  exp_rnaseq x, samples s, subjects p
     WHERE s_id=s.id AND s.subj_id=p.id AND x.dropped is not true)
  TO STDOUT WITH DELIMITER E'\t';
EOT

psql -d rse -U ruser << 'EOT' > samples.1.tab
COPY (SELECT brint, sample_id as id, dataset_id as dset,
      s.r_id as reg,       
      case when atype='450k' then 1
         when atype='WGBS' then 2
         else 0 end as atype
       FROM  exp_dnam x, samples s, subjects p
     WHERE s_id=s.id AND s.subj_id=p.id AND x.dropped is not true)
  TO STDOUT WITH DELIMITER E'\t';
EOT

