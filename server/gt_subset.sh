#!/usr/bin/env bash
## args:
# 1. full path to merged bcf with all LIBD genotypes
# 2. brnum.lst list of BrNums for which to extract genotypes
# 3. output file (full path, must be a .vcf.gz filename)
# 4. (optional) chromosome location to get SNPs for  
bcf=$1
fbrs=$2
opath=$3
loc=$4
if [[ -z $opath ]]; then
 echo "Error: 3 parameters needed!"
 exit 1
fi
PATH=/usr/bin:/usr/local/bin:/home/gpertea/sw/bin
#chmod 775 .
umask 002

odir=${opath%/*}
if [[ ! -d $odir ]]; then
  mkdir -p $odir
fi

xtab="geno2brnum.tab" #must exist alongside $bcf
xtab=${bcf%/*}/$xtab
#hdr="${bcf%/*}/header.hdr"
for f in $bcf $fbrs $xtab; do
  if [[ ! -f $f ]]; then
   echo "File $f not found!"
   exit 1
  fi
done

ftmp="$opath.tmp"

fgrep -wf $fbrs $xtab > $ftmp

cut -f1 $ftmp | bcftools view -Ou -S- $bcf $loc |\
 bcftools reheader -s $ftmp - |\
 bcftools view -Oz --threads 2 -o $opath -

#/bin/rm -f $ftmp
unlink $ftmp
