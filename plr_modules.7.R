dbConn <- NULL

pgmsg <- function(...) {
  pg.thrownotice(paste0(...))
} 

pgerr <- function(...) {
  pg.throwerror(paste0(...))
}

rse_getRPKM <- function(rse, length_var = "Length", mapped_var = NULL) {
  mapped <- if (!is.null(mapped_var)) colData(rse)[, mapped_var] else colSums(assays(rse)$counts)
  bg <- matrix(mapped, ncol = ncol(rse), nrow = nrow(rse), byrow = TRUE)
  len <- if (!is.null(length_var)) rowData(rse)[, length_var] else width(rowRanges(rse))
  wid <- matrix(len, nrow = nrow(rse), ncol = ncol(rse), byrow = FALSE)
  assays(rse)$counts / (wid / 1000) / (bg / 1e6)
}

## cntmx  : a counts matrix with cols=samples x rows=features (genes)
## lenvec : a vector with length of each feature (row) 
## return a matrix of RPKM values
mxRPKM <- function(cntmx, lenvec) {
  csums <- colSums(cntmx)
  bg <- matrix(csums, ncol = ncol(cntmx), nrow = nrow(cntmx), byrow = TRUE)
  wid <- matrix(lenvec, nrow = nrow(cntmx), ncol = ncol(cntmx), byrow = FALSE)
  cntmx / (wid / 1000) / (bg / 1e6)
}

mxRP10M <- function(cntmx) {
  csums <- colSums(cntmx)
  bg <- matrix(csums, ncol = ncol(cntmx), nrow = nrow(cntmx), byrow = TRUE)
  (cntmx * 10) / (bg / 1e6)
}


dbGetSamples <- function(datasets=c('BrainSeq_Phase1'), regions=c(), sex=c('M','F'), races=c('AA', 'CAUC'), 
                         dx=c('Control', 'SCZD'), age=c(16,120) ) {
  qage <- ""
  qsex <- ""
  qreg <- ""
  qrace <- ""
  qdx <- ""
  qdset <- ""
  if (length(age)==2) {
    qage <- sprintf(" and age between %s and %s", age[1], age[2])
  }
  if (length(sex)==1) {
    qsex <- sprintf(" and sex='%s'", sex[1])
  }
  if (length(datasets)>0) {
    qdset <- paste0(" and dataset=ANY(ARRAY['",paste(datasets, collapse="','"),"'])")
  }
  if (length(races)>0) {
    qrace <- paste0(" and race=ANY(ARRAY['",paste(races, collapse="','"),"']::subjrace[])")
  }
  if (length(dx)>0) {
    qdx <- paste0(" and dx=ANY(ARRAY['",paste(dx, collapse="','"),"'])")
  }
  if (length(regions)>0) {
    qreg <- paste0(" and region=ANY(ARRAY['",paste(regions, collapse="','"),"'])")
  }
  # returns a dataframe with metadata
  qry=paste0("select sample_id, rnum, region, dataset, rin, brnum, dx, race, sex, age, pmi ",
             " from rnaseq_samples where dropped is not true", qage, qsex, qreg, qrace, qdx, qdset)
  dbGetQuery(dbConn, qry)
}


sliceHDF <- function(smplst=c(), genes=c(), ftype='g', mxtype='counts', fxt='') {
  ## load global object
  cdf <- db_colData(smplst)
  if (ftype=='m') {
    return(as.data.table(cdf))
  }
  datasets=unique(cdf$Dataset)
  ds=datasets[1] #only working for one datasets at a time currently -> except for gene data
  rsepath <- c("h5_rse_gene", paste0(ds,"/h5_tx"), paste0(ds,"/h5_ex"),paste0(ds,"/h5_jx"))[which(ftype==c('g', 't', 'e', 'j'))]
  rse <- tryCatch( {
    loadHDF5SummarizedExperiment(dir=paste0(Sys.getenv('R_H5BASE'),'/', rsepath))
  }, error=function(cond) {
    pg.thrownotice("Warning [sliceHDF] failed opening R_H5BASE/h5_rse_gene")
    message(cond)
    return(NULL)
  } )
  if (is.null(rse)) return(NULL)
  rsel <- rse[, rse$SAMPLE_ID %in% smplst]
  if (dim(rsel)[2]!=length(smplst)) {
    pg.thrownotice("Warning [sliceHDF] not all sample IDs were found in rse_gene!")
  }
  
  cdf <- cdf[match(rsel$SAMPLE_ID, cdf$SAMPLE_ID), ]
  if (!identical(cdf$SAMPLE_ID, rsel$SAMPLE_ID)) {
    pg.thrownotice("Error [sliceHDF] : failed matching SAMPLE list to colData!")
    return(NULL)
  }
  rr <- rowRanges(rsel)
  if (ftype=='g') {
    if (length(genes)>0) {
      rsel <- rsel[rowData(rsel)$Symbol %in% genes, ]
      if (dim(rsel)[1]!=length(genes)) {
        pg.thrownotice("Warning [sliceHDF] not all gene symbols found in rse_gene$Symbol!")
      }
      rr <- rowRanges(rsel)
    }
    rownames(rsel) <- paste0(rr$Symbol,'|',rr$gencodeID)
  } else if (ftype=='t') { # transcripts
    mxtype='tpm'
    if (length(genes)>0) {
      rsel <- rsel[rowData(rsel)$gene_name %in% genes, ]
      rr <- rowRanges(rsel)
    }
    rownames(rsel) <- paste0(rr$transcript_name,'|',rr$transcript_id)
  } else if (ftype=='e') { # exons
    if (length(genes)>0) {
      rsel <- rsel[rowData(rsel)$Symbol %in% genes, ]
      rr <- rowRanges(rsel)
    }
    rownames(rsel) <- paste0(rr$Symbol, '|', seqnames(rr), ':', start(rr),'-',end(rr),strand(rr))
  } else { # junctions
    if (substr(mxtype,1,1)=='r' || substr(mxtype,1,1)=='n') mxtype='rp10m'
    if (length(genes)>0) {
      rsel <- rsel[rowData(rsel)$Symbol %in% genes, ]
      rr <- rowRanges(rsel)
    }
    rownames(rsel) <- paste0(ifelse(is.na(rr$Symbol), 'n', rr$Symbol), '|', rownames(rsel))
  }
  cmx <- as.matrix(assays(rsel)[[mxtype]])
  rr <- rowRanges(rsel)
  cdf$Age <- round(as.numeric(cdf$Age),2)
  if (is.null(fxt) || nchar(fxt)==0) { # return RSE
    assays <- list(cmx)
    names(assays)[1] <- mxtype
    rownames(cdf)<-colnames(cmx)
    ret <- SummarizedExperiment(assays = assays, rowRanges=rr, colData=cdf)
  } else { # return data.table
    if (ftype=='g' && mxtype=='counts') { # append gene length
      rownames(cmx) <- paste0(rownames(cmx), '|', rr$Length)
    }
    if (fxt %in% c('m', 'mx', 'matrix', 'a', 'assay')) {
      return(list(coldata=cdf, assay=cmx))
    }
    if (dim(cmx)[2]>=dim(cmx)[1] || dim(cmx)[1]<=420) { # fewer features than samples (gene list filter)
      ## gene selection in place, transpose the table
      ret <- as.data.table(t(cmx), keep.rownames = T) %>% setnames('rn', 'sampleID')
      ## add demo data columns as first columns
      ret <- cbind(cdf[, c('Region', 'Sex', 'Race', 'Age', 'Dx', 'BrNum') ], ret)
    } else { 
      colnames(cmx) <- paste(colnames(cmx), cdf$BrNum, cdf$Dx, cdf$Sex, cdf$Race, cdf$Age, sep='|')
      ret <- as.data.table(cmx, keep.rownames = T)  %>% setnames('rn', 'featureID')
    }
  }
  rm(rr,cdf)
  return(ret)
}

db_colData <- function(smplst) {
  pg_smp_arr <- paste0("ARRAY['",paste(smplst, collapse="','"),"']")
  cdf<-dbGetQuery(dbConn, paste0('select sample_id as "SAMPLE_ID", s_name as "RNum", rin as "RIN", r.name as "Region", d.name as "Dataset", 
     brnum as "BrNum", dx as "Dx", age as "Age", sex::text as "Sex", race::text as "Race", protocol::text as "Protocol", numreads as "numReads", nummapped as "numMapped", 
     numunmapped as "numUnmapped", mitomapped as "mitoMapped", totalmapped as "totalMapped", overallmaprate as "overallMapRate",
     concordmaprate as "concordMapRate", mitorate as "mitoRate", rrna_rate as "rRNA_rate", 
     totalassignedgene as "totalAssignedGene", bamfile as "bamFile"
     from exp_rnaseq x, datasets d, subjects p, samples s, regions r, dx
     where sample_id=ANY(',pg_smp_arr, ') and d.id=dataset_id
     and x.s_id=s.id and p.id=s.subj_id and r.id=s.r_id and dx.id=p.dx_id'))
  for (i in which(colnames(cdf) %in% c('Region', 'Dataset', 'Dx', 'Sex', 'Race', 'Protocol'))) {
    cdf[[i]]=as.factor(cdf[[i]])
  }
  return(cdf)
}

## more generic version 
buildRSE <- function(smplst=c(), ver=1, genes=c(), ftype='g', mxtype='counts', fxt='') {
  if (ftype!='g' && ftype!='m') {
    errmsg=("buildRSE: Only gene counts/rpkm implemented yet!")
    message(errmsg)
    pg.throwerror(errmsg)
  }
  cdf<-db_colData(smplst)
  if (ftype=='m') {
    return(as.data.table(cdf))
  }
  pg_smp_arr <- paste0("ARRAY['",paste(smplst, collapse="','"),"']")
  rowqry <- paste0("select sample_id, f_set_id, f_ids as fids, f_data as evs ",
                   "from exp_RNASeq x, exp_RNAseq_data d, feature_sets s ",
                   "where sample_id=ANY(", pg_smp_arr, ") and d.ftype='",ftype,"' and d.version=",ver,
                   " and dtype='",mxtype,"' and x.id=d.exp_id and d.f_set_id=s.id order by 1")
  if (length(genes)>0) {
    pg_gene_arr <- paste0("ARRAY['",paste(genes, collapse="','"),"']")
    rowqry <- paste0("with g as (select id, gene_id, name from genes where name=ANY(",pg_gene_arr, ")), ",
                     "s as (select id, sample_id, s_name from exp_RNASeq where sample_id=ANY(", pg_smp_arr, ")), ",
                     "i as (select g.id as fid, f.id as fsetid, f.name, f.ftype, g.name as f_name, ",
                     "array_position(f_ids, g.id) as aix from feature_sets f, g where f.ftype='",ftype,"') ",
                     "select sample_id, fsetid as f_set_id, array_agg(fid) as fids, array_agg(f_data[aix]) as evs ",
                     "from i, s, exp_rnaseq_data d where dtype='",mxtype,"' and d.exp_id = s.id and ",
                     "fsetid=f_set_id and d.version=",ver," group by 1,2")
  }

  dd <-dbGetQuery(dbConn, rowqry)

  cmx <- as.matrix(do.call(cbind, dd$evs))
  colnames(cmx) <- dd$sample_id
  rownames(cmx) <- unlist(dd$fids[1])
  
  fsid<-unique(dd$f_set_id) #must be only 1 feature set
  if (length(fsid)!=1) {
    pg.throwerror("only one feature set expected!")
  }
  ## only 'g' type (gene) rowData defined for now
  rdataq <- "select id, length, gene_id as gencodeID, chr, cstart, cend, strand,
  type as gene_type, name as symbol, class, array_length(txids,1) as numtx from genes, fs where fid=id"
  rdf<-dbGetQuery(dbConn, sprintf("with fs as (select unnest(f_ids) as fid from feature_sets 
       where ftype='%s' and id=%d) %s", ftype, fsid, rdataq))
  if (!identical(rdf$id, as.integer(rownames(cmx)))) {
    #message("buildRSE() ids NOT in the same order, fixing")
    rdf <-rdf[match(as.integer(rownames(cmx)), rdf$id), ]
    if (!identical(rdf$id, as.integer(rownames(cmx)))) {
      pg.throwerror("buildRSE() : could not match order of rowRanges w/ feature IDs!")
    }
  }
  ## for 'g' only for now
  rdf$class<-as.factor(rdf$class)
  setnames(rdf, c('length', 'gencodeid', 'symbol', 'class', 'numtx'), 
           c('Length', 'gencodeID', 'Symbol', 'Class', 'NumTx'))
  rdf$ensemblID<-sub('\\.\\w+$','',rdf$gencodeID)
  rr<-GRanges(rdf$chr, IRanges(rdf$cstart, rdf$cend), strand=rdf$strand,
              rdf[, c('Length','gencodeID', 'ensemblID', 'gene_type', 'Symbol', 'Class')])
  rownames(cmx)<-paste0(rdf$Symbol, '|', rdf$gencodeID)
  names(rr)<-rownames(cmx)
  ## -- return RSE or data.table
  ret <- NULL
  if (!identical(cdf$SAMPLE_ID, colnames(cmx))) {
    cdf <-cdf[match(colnames(cmx), cdf$SAMPLE_ID), ]
    if (!identical(cdf$SAMPLE_ID, colnames(cmx))) {
      pg.throwerror("buildRSE() : could not match order of colData w/ sample IDs!")
    }
  }
  cdf$Age <- round(as.numeric(cdf$Age),2)
  if (is.null(fxt) || nchar(fxt)==0) {
    # build RSE
    assays <- list(cmx)
    names(assays)[1] <- mxtype
    rownames(cdf)<-colnames(cmx)
    ret <- SummarizedExperiment(assays = assays, rowRanges=rr, colData=cdf)
  } else {
    rownames(cmx) <- paste0(rownames(cmx), '|', rr$Length)
    if (dim(cmx)[2]>=dim(cmx)[1]) {
      ## gene selection in place, transpose the table
      ret <- as.data.table(t(cmx), keep.rownames = T) %>% setnames('rn', 'sampleID')
      ## add demo data columns as first columns
      ret <- cbind(cdf[, c('Dataset', 'Region', 'Sex', 'Race', 'Age', 'Dx', 'BrNum') ], ret)
    } else { 
      colnames(cmx) <- paste(colnames(cmx), cdf$BrNum, cdf$Dx, cdf$Sex, cdf$Race, cdf$Age, sep='|')
      ret <- as.data.table(cmx, keep.rownames = T)  %>% setnames('rn', 'featureID')
    }
  }
  return(ret)
}

saveRSE <- function(fname, smplst=c(), ver=1, genes=c(), ftype='g', mxtype='counts', fxt='', h5=T) {
  ftype=tolower(substr(ftype,1,1))
  if (is.null(smplst) || length(smplst)==0) {
    pg.thrownotice("saveRSE: empty sample list!")
    return(NULL)
  }
  if (is.null(fname) || nchar(stri_trim(fname))==0) pg.throwerror("saveRSE: no file name given")
  lout <- prepStagingPath(fname, '')
  outfile <- paste0(lout$outpath, lout$relpath)
  message(Sys.time(), "> received request to create ",fname)
  t0=Sys.time()
  if (h5) {
    r <- sliceHDF(smplst, genes=genes, ftype=ftype, mxtype=mxtype, fxt=fxt)
  } else { # slower from database!
    r<-buildRSE(smplst, ver=ver, genes=genes, ftype=ftype, mxtype=mxtype, fxt=fxt)
  }
  t1=Sys.time()
  if (is.null(r)) {
    message(" saveRSE: Error building result object!")
    return('')
  }
  message("  << built in ",as.numeric(round(t1-t0,2)),"s. Saving it.. ")
  if (is.null(fxt) || nchar(fxt)==0 || fxt=='rse') {
    rse_name=c("gene", "tx", "exon", "jx")[which(ftype==c('g', 't', 'e', 'j'))]
    rse_name=paste0('rse_', rse_name)
    assign(rse_name, r)
    save(list=rse_name, file=outfile, compress='gzip', compression_level = 2)
  } else { # data.table fwrite
    fsep=','
    if (fxt=='t' || fxt=='\t' || fxt=='tab') fsep='\t'
    fwrite(r, file=outfile, row.names=F, sep=fsep, showProgress=F, verbose=F)
  }
  t2=Sys.time()
  message("  << file saved in ",as.numeric(round(t2-t1,2)),"s",
          "(total: ",as.numeric(round(t2-t0,2)),"s)\n (", outfile, ")")
  rm(r)
  invisible(gc())
  return(lout$relpath) 
}

loess.ci <-  function(x, y = NULL, nsigma = 1, ...) {
  pred<-predict(loess(y ~ x), se=T)
  list(yfit=pred$fit, yupper=pred$fit+qt(0.975,pred$df)*pred$se,
       ylower=pred$fit-qt(0.975, pred$df)*pred$se)
}

prepStagingPath <- function(fname, fext) {
  outpath<-Sys.getenv('R_FILE_STAGING')
  if (nchar(outpath)==0) outpath="./_r_staging"
  if (substring(outpath,nchar(outpath))!='/') outpath<-paste0(outpath,'/')
  if (nchar(fext)>0) fname=paste0(fname,  '.', fext)
  Sys.umask(mode="002")
  wdir=sub('\\', '', tempfile("r", tmpdir=""), fixed=T)
  if (substring(wdir,1,1)=='/') wdir<-substring(wdir,2)
  odir <- paste0(outpath, wdir)
  dir.create(odir, recursive=T)
  list(outpath=outpath, relpath= paste0(wdir, '/', fname))
}


saveAgePlot <- function(smplst=c(), ver=1, genes=c(), feature='g', fxtype='json') {
  if (is.null(smplst) || length(smplst)==0) {
    pg.thrownotice("saveAgePlot: empty sample list!")
    return(NULL)
  }  
  fname=paste0("agePlot_n",length(smplst))
  fext <- 'json.gz'
  if (fxtype!='json') fext <- fxtype
  lout <- prepStagingPath(fname, fext)
  outfile <- paste0(lout$outpath, lout$relpath)
  ## get the matrix
  lmx <- sliceHDF(smplst, genes=genes, ftype='g', mxtype='rpkm', fxt='m')
  gmx <- lmx$assay
  coldata <- lmx$coldata
  colnames(coldata) <- tolower(colnames(coldata))
  #--- plot data prep
  coldata$age <- round(coldata$age, 2)
  idcols <- c('sex', 'race', 'age', 'dx', 'brnum')
  dxSet=as.character(unique(coldata$dx))
  
  dxNC=dxSet[dxSet!='Control']
  haveControls <- (length(dxSet[dxSet=='Control'])>0)
  cPal='Paired'
  if (length(dxSet)>2) {
    if (haveControls) { 
      dxSet <- c('Control', dxNC[1]) 
    } else {
      dxSet <- dxSet[1:2]
    }
    #message("Warning: Age Plot can only plot at most Dx, using ", paste(dxSet, collapse=' and '))
    coldata <- subset(coldata, dx %in% dxSet)
    gmx <- gmx[, coldata$sample_id, drop = F]
    #stopifnot(identical(coldata$sample_id, colnames(gmx)))
  }
  if (length(dxSet)==1) cPal='Set1'
  atitle='' #age title
  dtitle=paste0(paste(dxSet, collapse=',  '), ' | Age: ')
  gdta <- coldata[, idcols]
  gdta <- cbind(gdta, t(round( log2(gmx+1), 3 )))
  setDT(gdta)
  genecols=unique(rownames(gmx))
  dt <- melt(gdta, id.vars=idcols, measure.vars=genecols, variable.name = "gene", value.name = "log2rpkm")
  
  minAge=min(dt$age) #should be made the same for all
  maxAge=max(dt$age)
  ageBreaks <- c(minAge, maxAge)
  
  ## convert all character columns to factor
  cols2factor <- colnames(dt)[which(as.vector(dt[,lapply(.SD, class)]) == "character")]
  dt[, (cols2factor):=lapply(.SD, as.factor), .SDcols=cols2factor]
  setorder(dt, age, gene)
  #minAge=min(dt[dx %in% dxNC]$age) #should be made the same for all
  #dt <- dt[age >= minAge] # discard controls younger than the youngest non-control
  races <- unique(dt$race)
  ymax=max(dt$log2rpkm)+0.1
  if (length(dxSet)>1) {
    dt[, geneDx:=paste0(sub('^([^|]+).*', '\\1', gene, perl=T),'|',dx)]
    dt[, brnum:=paste0(brnum,'|',dx)]
  } else {
    dt[, geneDx:=sub('^([^|]+).*', '\\1', gene, perl=T)]
  }
  
  gdxLevels <- sort(unique(dt$geneDx))
  dt$geneDx <- factor(dt$geneDx, levels=gdxLevels)
  
  fetalPlot <- NULL
  allplots <- list(NULL)
  pl <- NULL
  haveBorn <- (maxAge>0)
  haveFetal <- (minAge<0)
  if (haveFetal) {
    atitle='fetal'
    ageBreaks <- c(minAge, 0, maxAge)
    tickvals=as.list(seq(0,35,5))
    ticktext=tickvals
    fdt <-  dt[age<=0][, PCW := age * 52 + 40]
    xmax=max(fdt$PCW)
    if (!haveBorn) {
      ticktext <- c(ticktext, 'Birth')
      tickvals <- c(tickvals, 40)
      xmax=40
    }
    xmin <- min(fdt$PCW)
    fetalPlot <- fdt %>% group_by(gene) %>% 
      plot_ly(x=~jitter(PCW), y=~log2rpkm, color=~geneDx, colors=cPal, 
              type="scatter", text=~brnum, mode="none", legendgroup=~geneDx, showlegend = F) %>%
      layout(plot_bgcolor='#fafaff', yaxis=list(range=c(0,ymax), title= "log2(rpkm+1)"), 
             xaxis=list(title = 'PCW', ticklen=2, color="#777", tickvals=tickvals, ticktext=ticktext,
                        range=c(xmin,xmax)), margin=list(b=4, l=4, r=4) )
    for (gdx in gdxLevels) {
      gdxdt <- fdt %>% filter(geneDx==gdx)
      if (nrow(gdxdt)==0) next
      fetalPlot <- fetalPlot %>% add_data(gdxdt) %>% 
        mutate(as.data.frame(loess.ci(PCW, log2rpkm))) %>%
        add_trace(y=~yupper, mode="lines", alpha=0, showlegend = F) %>% 
        add_trace(y=~ylower, mode="none", name="conf. interval", 
                  alpha=0.2, opacity=1, fill="tonexty", showlegend = F) %>% 
        add_lines(y=~yfit, name="loess trend", alpha=0.8, opacity=0.8, fill="none", showlegend=F) %>% 
        add_markers(marker=list(size=6, opacity = 0.8, fill="none"), showlegend=!haveBorn)
      
    }  
    allplots <- c(allplots, list(fetalPlot))
  }
  # -- now the post-birth age group:
  pl <- NULL
  if (haveBorn) {
    bdt <- dt[age>=0]
    agemin=floor(min(bdt$age))
    agemax=floor(max(bdt$age))
    if (haveFetal) {
      atitle=paste0(atitle, ' + ',agemin,'-',agemax, ' years')
    } else {
      atitle=paste0(agemin,' - ',agemax,  ' years')
    }
    tickvals=as.list(seq(0,100,10))
    ticktext=tickvals
    ticktext[[1]]='Birth'
    pl <- bdt %>% group_by(geneDx) %>% 
      plot_ly(x=~age, y=~log2rpkm, color=~geneDx, colors=cPal, 
              type="scatter", text=~brnum, mode="none", legendgroup=~geneDx, showlegend = F) %>%
      layout(plot_bgcolor='#fafaff', yaxis=list(range=c(0,ymax)), 
             xaxis=list(title = 'Age', nticks=10, ticklen=4, color="#777",
                        tickvals=tickvals, ticktext=ticktext), margin=list(b=4, l=4, r=4) )
    
    for (gdx in gdxLevels) {
      gdxdt <- bdt %>% filter(geneDx==gdx)
      if (nrow(gdxdt)==0) next
      pl <- pl %>% add_data(gdxdt) %>% 
        mutate(as.data.frame(loess.ci(age, log2rpkm))) %>%
        add_trace(y=~yupper, mode="lines", alpha=0, showlegend = F) %>% 
        add_trace(y=~ylower, mode="none", name="conf. interval", 
                  alpha=0.2, opacity=1, fill="tonexty", showlegend = F) %>% 
        add_lines(y=~yfit, name="loess trend", alpha=0.8, opacity=0.8, fill="none", showlegend=F) %>% 
        add_markers(marker=list(size=6, opacity = 0.8, fill="none"), showlegend=T)
    }
  }
  allplots <- c(allplots, list(pl)) 
  allplots <- allplots[lengths(allplots)!=0]
  json <- NULL
  jsongz <- NULL
  dtitle=paste0(dtitle, atitle)
  if (length(allplots)==1) {
    if (haveFetal) pl <- fetalPlot
    pl <- pl %>% layout(title=list(text=dtitle, xanchor="right"))
  } else {
    pl <- subplot(allplots, widths=c(0.35,0.65), shareY=T, titleX=T, nrows=1, margin=0.00) %>%
      layout(title=list(text=dtitle, xanchor="right"))
  }
  ### --------write the json.gz for this plot (<100k)
  json <- plotly_json(pl, jsonedit=F, pretty=F)
  fcon=gzfile(outfile, "w")
  write(json, fcon)
  close(fcon)
  return(lout$relpath)
}

saveBoxPlot <- function(boxtype='gene', smplst=c(), ver=1, genes=c(), feature='g', fxtype='json') {
  if (is.null(smplst) || length(smplst)==0) {
    pg.thrownotice("saveBoxPlot: empty sample list!")
    return(NULL)
  }
  fname=paste0("boxPlot_n",length(smplst))
  fext <- 'json.gz'
  if (fxtype!='json') fext <- fxtype
  lout <- prepStagingPath(fname, fext)
  outfile <- paste0(lout$outpath, lout$relpath)
  ## get the matrix
  lmx <- sliceHDF(smplst, genes=genes, ftype='g', mxtype='rpkm', fxt='m')
  gmx <- lmx$assay
  coldata <- lmx$coldata
  colnames(coldata) <- tolower(colnames(coldata))
  #--- plot data prep
  coldata$age <- round(coldata$age, 2)
  idcols <- c('sex', 'race', 'age', 'dx', 'brnum', 'region', 'sample_id', 'rnum')
  dxSet=as.character(unique(coldata$dx))
  dxNC=dxSet[dxSet!='Control']
  ## prep dt
  gdta <- coldata[, idcols]
  gdta <- cbind(gdta, t(round( log2(gmx+1), 3 )))
  setDT(gdta)
  genecols=unique(rownames(gmx))
  dt <- melt(gdta, id.vars=idcols, measure.vars=genecols, variable.name = "gene", value.name = "log2rpkm")
  setnames(dt, 'dx', 'Dx')
  dt$gene <- sub('^([^|]+).*', '\\1', dt$gene, perl=T)
  dt$gene <- factor(dt$gene, levels = sort(genes) )
  regions=unique(dt$region)
  byRegion=grepl('region', boxtype, fixed = T) && length(regions)>=1 && length(genes)==1
  ## generate plot
  gg <- ggplot(dt, aes(x=Dx, y=log2rpkm, color=Dx, text="")) + 
    geom_boxplot(aes(text=NULL), outlier.shape=NA, outlier.color = NA, outlier.size = 0)
  if (byRegion) {
    gg <- gg +stat_summary(fun.data= function(y) { return(data.frame(y = -0.1, label = length(y) ) ) }, 
                           geom="text", color="#404040")
  }
  gg <- suppressWarnings(gg+geom_jitter( aes(text=paste0(brnum, '|', sample_id, ' : ', log2rpkm)), width=0.02, alpha=0.4 ) )
  if (byRegion) {
    nr=length(unique(dt$region))
    ncol=3
    if (nr==4 | nr>6) ncol=4
    gg <- gg + facet_wrap(~region, ncol = ncol)
  } else {
    nr=length(unique(dt$gene))
    ncol=3
    if (nr==4 | nr>6) ncol=4
    gg <- gg + facet_wrap(~gene, ncol = ncol)
  }
  gg <- gg+theme_bw()
  pl <- ggplotly(gg, tooltip=c("text"))
  if (byRegion) {
    pl <- pl %>% layout(title=list(text=genes[1]), margin = list(t = 58))
  }
  pl$x$data <- lapply(pl$x$data, FUN = function(x){
    if (x$type == "box") {
      x$marker = list(opacity = 0)
    }
    return(x)
  })
  ### --------write the json.gz for this plot (<100k)
  json <- plotly_json(pl, jsonedit=F, pretty=F)
  fcon=gzfile(outfile, "w")
  write(json, fcon)
  close(fcon)
  return(lout$relpath)
}
