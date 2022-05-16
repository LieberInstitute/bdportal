#!/usr/bin/perl
use strict;
use Getopt::Std;
use DBI;
use DBD::Pg qw(:pg_types);
use Sys::Hostname;


my $usage = q/Usage:
  pull4webapp.pl [server]

   Fetches: regions, datasets[], dx, brains, samples[]
   and prepares a json file with all the parsed data, 
   with dx, region, brain and datasets ids reindexed 
/;
umask 0002;
getopts('o:') || die($usage."\n");
my $dbh; # global DB handle object

my $srv=shift(@ARGV);
if (!$srv) {
  my ($host)=split(/\./, hostname());
  $srv = $host eq 'linwks34' ? 'localhost' : 'gdebsrv';
}
dbLogin($srv);

my $outfile=$Getopt::Std::opt_o;
if ($outfile) {
  open(OUTF, '>'.$outfile) || die("Error creating output file $outfile\n");
  select(OUTF);
}

##this should match the subjRace type definition in postgresql:
#CREATE TYPE subjRace AS
# ENUM ('AA','AS', 'CAUC', 'HISP', 'Native American', 'Multi-Racial', 'Other');
my %hrace;
my @races     = ('AA','AS', 'CAUC', 'HISP', 'Native American', 'Multi-Racial', 'Other');
@hrace{@races} = (  1,   2,      3,     4,        5,                  6,            7);

my %hsex;
my @sexes     = ('F', 'M');
@hsex{@sexes} = ( 1  , 2 );
# -- builds dx, region, arrays with only the existing indexes populated
#### ord# is the new (local) order index to be used for array indexing in UI/webapp
my (@ds, @dx, @reg); 
#store ord# data at index found in the database id column from database: 
#  for @ds: $ds[dbid] = [ord#, name, public(0,1), count]
#  for @dx: $dx[dbid] = [ord#, name, fullnam, count]

my %br; # brint => [ ord#, dx, race, sex, age, pmi ]

#-----------------
# Then the samples data is written with the new indexes (ord#) for each categorical data
# instead of the original database ids 
##

#my @flst = my ($fdatasets, $fregions, $fdx, $fbrains, @fsamples) =
#   ( map { $_.'.tab' } qw{datasets regions dx brains samples.0 samples.1} );

###--------------------------------
## datatypes to use (must match datasets.dtype column
## can be obtained using: select distinct dtype from datasets
# e.g. ('rnaseq', 'dnamet')
#print STDERR join("\t", @xdts)."\n";
my $rd=dbQuery('select distinct dtype from datasets order by 1');
my @xdts=map { $$_[0] } @$rd; # list of dataset types in order they are parsed from the last column of the datasets file

###### ---- datasets json output is 2 objects:
##    "dtypes" : [ "rnaseq" , "dnam", ... ],  list of dataset types
print "{\"dtypes\": [\n",
    '   "'.join('", "', @xdts).'" ],'."\n";
print "\"sex\": [\n",
    '   "'.join('", "', @sexes).'" ],'."\n";
print "\"race\": [\n",
    '   "'.join('", "', @races).'" ],'."\n";
##     "datasets" : [  // array of dataset info arrays
#           [ // array of rnaseq dataset array entries 
#              [ 1, "rnaseq_ds_name", public_flag(0/1), dbid, smp_count, refs ],
#              ...
#             ],
#           [ // array of dnam dataset array entries
#              [ 1, "dnam_ds_name", public_flag(0/1), dbid, smp_count, refs ],
#              ...
#             ],
#           ...
#       ]
print "\"datasets\": [\n";
my ($nr, $ndx, $nbr); #number of records (lines)
## dataset json record:  ord#, name, public(1/0), dbid, count
my $idt=0;
foreach my $dt (@xdts) {
  #print "$dt:\n";
  my $i=0;
  print ($idt ? ", [" : " [");
  ## qry field order: 0:name, 1:public, 2:id, 3:count
  my $q=qq/
    SELECT d.name, case when d.public is true then 1 else 0 end as public,
       d.id, COUNT(*) as num, COALESCE(refs, '') as refs
      FROM exp_$dt x, datasets d
      WHERE x.dataset_id = d.id AND x.dropped is not TRUE and dtype='$dt'
       GROUP BY 3 ORDER BY 3/;
  my ($sth, $r)=dbExec($q);
  while (my $rd=dbFetch($sth)) { #@$rd = ds_dbid, ds_name, public(0/1), count
     print ($i ? ",\n" : "\n");
     $i++;
     # $$rd[2] is d.id from SELECT above = [ ord#, name, public, count, refs ]
     my $refs=$$rd[4];
     if (length($refs)) {
       $refs=~s/[\r\n]+$//;
       $refs=~s/[\n\r]+/\|\|/g;
       $refs=~tr/"//d; #"
       $$rd[4]=$refs;
     }
     $ds[ $$rd[2] ]=[ $i, @$rd[0,1,3] ];
     my @js=($i, @$rd);
     print '  ',jsonarr(\@js, '010001');
  }
  print ($idt==$#xdts ? "\n ]\n" : "\n ]");
  #$sth->finish();
  $idt++;
}
print "],\n"; # close datasets

## --- pull regions as a reindexed array:
## build @reg array :  $reg[dbId] =  [ ord#, name, fullname, dbId, count_dt1, count_dt2, ..]
my @rord; #push dbid for region (r_id) in order they were listed (by regions.ord)
foreach my $dt (@xdts) {
    my $q=qq/
    SELECT r.name, INITCAP(COALESCE(r.fullname, r.name)) as fullname,
       r.id, COUNT(r_id) as rnum FROM exp_$dt x
     JOIN  samples s ON x.s_id=s.id AND x.dropped is not true
     RIGHT OUTER JOIN regions r ON s.r_id=r.id
     GROUP BY 3 ORDER BY r.ord/;
    my ($sth, $r)=dbExec($q);
    while (my $rd=dbFetch($sth)) { #@$rd = r_dbid, r_name, r_fullname, count
        my @r=@$rd;
        my $c=pop(@r); # get counts
        my $dbid=$r[2]; # mind SELECT order
        unless($reg[$dbid]) {
           $reg[$dbid]=[0, @r];
           push(@rord, $dbid);
        }
        # ord# not settled yet, will be updated later after filtering out all-0 regions
        push(@{$reg[$dbid]}, $c);
    }
}
## now write JSON: [ ord#, name, fullname, dbId, count_dt1, count_dt2, .. ]
print "\"reg\": [";
my $i=0;
my $jst='0110'.('0' x scalar(@xdts));
my $re=4+scalar(@xdts)-1;
foreach my $rid (@rord) {
  my $rd=$reg[$rid];
  if ($rd) {
     # also skip if all counts are 0!
     my $sum=0;
     map {$sum+=$_ } @$rd[4..$re];
     next if $sum==0;
     print ($i ? ",\n" : "\n");
     $i++;
     $$rd[0]=$i;
     #my @r=($i, @$rd);
     print ' '.jsonarr($rd, $jst);
  } else {
     die("Error mapping region data for $rid!");
  }
}
print "\n],\n";

## ----- dx, similar to reg, but with sequenced subject counts per datatype -------
## build @dx array :  $dx[dbId] = [ ord#, dx, name, dbId, brcount_dt1, brcount_dt2, ..]
## NOTE: dropped subjects are not counted!
my @dxord; #push dbid for dx (dx_id) in order they were listed (by dx.ord)
foreach my $dt (@xdts) {
    my $q=qq/with bd as (select distinct brint, dx_id
    from exp_$dt x, samples s, subjects p, dx d 
      where x.dropped is not true and p.dropped is not true 
       and x.s_id = s.id and p.id=s.subj_id and d.id=p.dx_id)
   SELECT dx, coalesce(name, dx), dx.id, count(dx_id) from bd b
    right outer join dx on dx.id=b.dx_id
    group by 3,2,1 order by dx.ord
/;
    my ($sth, $r)=dbExec($q);
    while (my $rd=dbFetch($sth)) { #@$rd = dbid, dx, name, count
        my @r=@$rd;
        my $c=pop(@r);  # counts
        my $dbid=$r[2]; # SELECT order
        unless($dx[$dbid]) { ## first time seeing this dx
          $dx[$dbid]=[0, @r];
          push(@dxord, $dbid);
        }
        # ord# not settled here
        push(@{$dx[$dbid]}, $c);
    }
}
## now write JSON: [ ord#, dx, name, dbId, count_dt1, count_dt2, .. ]
print '"dx": [';
$i=0;
$jst='0110'.('0' x scalar(@xdts));
$re=4+scalar(@xdts)-1;
foreach my $dxid (@dxord) {
  my $rd=$dx[$dxid];
  if ($rd) {
     # do NOT skip if all counts are 0, we need all dx for brain matrix!
     #my $sum=0;
     #map {$sum+=$_ } @$rd[4..$re];
     #next if $sum==0;
     print ($i ? ",\n" : "\n");
     $i++;
     $$rd[0]=$i;
     print ' '.jsonarr($rd, $jst);
  }
}
print "\n],\n";

## ----- get the brains - brint hashed but with a new ord# as well
## NOTE: dropped subjects are also pulled but they should be always excluded from all counts!
my ($sth, $r)=dbExec(q/with rbrs as (SELECT distinct brint from exp_rnaseq x, samples s, subjects p
       where x.dropped is not true and x.s_id = s.id and p.id=s.subj_id),
    dbrs as (SELECT distinct brint from exp_dnam x, samples s, subjects p
       where x.dropped is not true and x.s_id = s.id and p.id=s.subj_id),
    wbrs as (SELECT distinct brint from exp_wgs x, samples s, subjects p
       where x.dropped is not true and x.s_id = s.id and p.id=s.subj_id),
    xs as (select coalesce(r.brint, case when d.brint is null then w.brint else d.brint end) as brint
    from rbrs r
      full join dbrs d on d.brint=r.brint
      full join wbrs w on w.brint=r.brint)
 select brint,  dx_id, race, sex, TRUNC(age::NUMERIC, 2) as age, coalesce(pmi,0) as pmi,
  case when exists(select from xs where s.brint=xs.brint) then 1 else 0 end as has_seq,
  case when genotyped is true then 1 else 0 end as genotyped,  
  case when dropped is true then 1 else 0 end as dropped from subjects s /);

## JSON out: array of [ord#, brint, dx#, race#, sex#, age, has_seq, genotyped, dropped]
print '"brains": [';
$i=0;
while (my $rd=dbFetch($sth)) {
 my ($brint, $dx_id, $race, $sex, $age, $pmi, $has_seq, $has_geno, $drop)=@$rd;
 print ($i ? ",\n" : "\n");
 $i++;
 my $dxd=$dx[$dx_id] || die("Error getting \$dx[$dx_id] for brint $brint loading!\n");
 $br{$brint}=$i;
 my $ridx=$hrace{$race} ||
    die("Error: race $race has no index translation in \%races!\n");
 my $sidx=$hsex{$sex} ||
    die("Error: sex $sex has no index translation in \%sexes!\n");
 print ' '.jsonarr([$i, $brint, $$dxd[0], $ridx, $sidx, $age, $pmi, $has_seq, $has_geno, $drop], '0000000000');
}
print "\n],\n";

## -- finally, get the sample lists, 
##      replacing region_id, brint, dataset_id with their ord#s 
print "\"sdata\":  [\n";
## WARNING: hard coded qry parts for: rnaseq, dnam
##
my %qf=(
 $xdts[0] => q/case when protocol='RiboZeroGold' then 3
  when protocol='RiboZeroHMR' then 2
  when protocol='PolyA' then 1 
  else 0 end as proto/, ## rnaseq
 $xdts[1] => q/case when atype='450k' then 1
  when atype='WGBS' then 2
  else 0 end as atype/, ## dnam
  $xdts[2] => '1 as proto'  ## wgs dummy protocol 1 (all samples)
);

$idt=0;

## JSON out array of arrays per dataset:
##    [ br_ord#, sample_id, dataset_ord#, reg_ord#, proto ]
##  no need to print a ord# for samples
## NOTE: dropped samples and subjects are DISCARDED
foreach my $dt (@xdts) {
   my $q=qq/SELECT brint, sample_id as id, dataset_id as dset, s.r_id as reg, 
   $qf{$dt}
   FROM  exp_$dt x, samples s, subjects p  WHERE s_id=s.id
   AND s.subj_id=p.id AND x.dropped is not true AND p.dropped is not true/;
   my $i=0;
   print ($idt ? ", [" : " [");
   my ($sth, $r)=dbExec($q);
   while (my $rd=dbFetch($sth)) { #@$rd = brint, sample_id, dataset_id, region_id, proto
     print ($i ? ",\n" : "\n");
     $i++;
     my @sd=@$rd;
     $sd[0]=$br{$sd[0]}; # replace with br_ord#
     $sd[2]=$ds[$sd[2]][0]; # replace with dataset_ord# (for this data type!)
     $sd[3]=$reg[$sd[3]][0]; # replace with region_ord#
     #@sd=($i, @sd); #unshift $i
     print '  ',jsonarr(\@sd, '01000');
   }
   print ($idt==$#xdts ? "\n ]\n" : "\n ]");
   $idt++;
}
print "]\n}\n"; # close samples, end of JSON file!

# --
if ($outfile) {
 select(STDOUT);
 close(OUTF);
}

$dbh->disconnect();

#************ Subroutines **************

# print JSON array according to type (quoting) string (1=quoting, 0=don't quote)
sub jsonarr {
  my @d=@{$_[0]}; #array to print
  my @s=split(//,$_[1]); #spec
  if (scalar(@d)!=scalar(@s)) {
     my $ds=join(', ', @d);
     die( "Error, spec mismatch! '$_[1]' vs ( $ds )\n");
  }
  my $r='[';
  for (0 .. $#d) {
     $r.= $s[$_] ? '"'.$d[$_].'"' : $d[$_];
     $r.=',' unless $_==$#d;
  }  
  return $r.']';
}

sub dbErr {
 #my $dbLastError="@_\n";
 #print STDERR $_[0]."\n";
 #exit(1) unless defined($_[1]);
 die join("\n",@_)."\n";
}

#sub onErrExit {
# $dbExitSub=$_[0];
#}

# $dbh =  global database handler
sub dbLogin {
  my ($server, $db, $user)= @_;
  $server='localhost' unless $server;
  $db='rse' unless $db;
  $user='ruser' unless $user;
  open(PGPASS, "$ENV{HOME}/.pgpass") || die("Error opening $ENV{HOME}.pgpass\n");
  #hostname:port:database:username:password
  my ($pass);
  while (<PGPASS>) {
    chomp;
    next if m/^#/;
    my ($host,$port,$d,$u,$p)=split(/:/);
    if ($host eq $server && $d eq $db) {
       ($user,$pass)=($u, $p);
       last;
    }
  }
  close(PGPASS);
  die("Error: could not retrieve pass for user $user, db $db on $server\n") unless $pass;
  $dbh = DBI -> connect("dbi:Pg:dbname=$db;host=$server",  
                            $user, $pass,
                            {AutoCommit => 0, RaiseError => 1,
                             pg_server_prepare => 1 }
                         ) or die $DBI::errstr;
  # The AutoCommit attribute should always be explicitly set
}

sub dbQuery {
 #Execute a query and returns ALL the results as reference to an array 
 # of references to field value lists
 my ($query)=@_;
 my $aref=$dbh->selectall_arrayref($query) 
      || dbErr("Select all failed for:\n$query"); 
 
 return $aref;
}

sub dbPrep {
 my $sth = $dbh->prepare($_[0]);
 return $sth; 
}

sub dbExec { # execute non-query statement (update, insert)
  my ($req, @parm)=@_; # $req could be a query or a $sth
  my $sth;
  if (ref($req)) { # it's a sth
    $sth=$req;
  }
  else { #prep it first
    $sth=dbPrep($req);
  }
  ## execute should return the number of rows affected
  my $r=$sth->execute(@parm);
  if ($sth->err) {
     dbErr(" *** execute failed! ".$sth->errstr);
  }
  return wantarray ? ($sth, $r) : $r;
}

sub dbDo {
 return dbExec(@_);
}

sub dbFetch {
  my ($sth)=@_;
   #given a sth for an executed statement
   #return an arrayref with row data, or undef if none left
  my $r=$sth->fetchrow_arrayref();
  if ($sth->err) {
     dbErr(" *** fetch failed! ".$sth->errstr);
  }
  return $r;
}

sub dbFetchAll {
 # fetch all rows and return a ref to array of arrays
  my ($sth)=@_;
  return $sth->fetchall_arrayref();
}

sub dbRun {
  my $qry=$_[0];
  if ($qry=~m/\b(insert|update|delete|alter|create|drop)\b/i && 
      $qry!~m/\breturning\b/i) {
    return $dbh->do($qry); #do($q, \%attr, [@bind_values]);
  }
  return dbQuery($qry)
}

sub dbPrint {
 my ($q, $csep)=@_;
 $csep="\t" unless $csep;
 #if (ref($qry)) # pass a sth directly? nah..
 my ($s,$res)=dbExec($q);
 while (my $rd=dbFetch($s)) {
    print(join($csep, @$rd)."\n");
 }
}

sub dbDrop {
 return dbExec("drop table if exists $_[0]");
}
