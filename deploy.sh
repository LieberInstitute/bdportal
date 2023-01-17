#/bin/bash
dest=$1
##should update .env first
lasthash=$(git rev-parse --short HEAD)
lastdate=$(git log -1 --format='%ai' | awk '{print $1}')
sed -i -E "s/COMMIT_DATE=.*/COMMIT_DATE=${lastdate}/" .env
sed -i -E "s/COMMIT_HASH=.*/COMMIT_HASH=${lasthash}/" .env
host=$(hostname -s)
rdest="" #remote target (home)
docroot=/var/www/html
mwsrv=geowks.lieber.local
case "$host" in
  "gryzen" | "gi7" | "guvb")
      docroot=/data/nginx/html
      mwsrv="gdebsrv"
      rdest="gdebsrv" ;;
   "srv16")
      mwsrv="srv16.lieber.local"
      ;;
   "linwks34")
      mwsrv="geowks.lieber.local"
      ;;
esac
echo "mwsrv = $mwsrv"
sed -i -E "s|_MWSERVER=.*|_MWSERVER=http://${mwsrv}:4095|" .env
/bin/rm -rf dist/*
brun='-dev'
bdir='dev/bdportal'
if [[ $dest == 'devel' ]]; then
  brun='-devel'
  bdir='devel/bdportal'
else 
  if [[ $dest == 'root' || $dest == 'bdportal' || $dest == '/' ]]; then
    brun=''
    bdir='bdportal'
  fi
fi
echo -e "running:\n npm run build$brun-based"
npm run build$brun-based

if [[ "$rdest" ]]; then
 ssh $rdest "/bin/rm -rf $docroot/$bdir/* "
 rdest="${rdest}:"
else
 /bin/rm -rf $docroot/$bdir/*
fi
rsync -av dist/ ${rdest}${docroot}/$bdir/
