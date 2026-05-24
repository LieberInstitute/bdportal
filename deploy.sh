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
case "$host" in
  "gryzen" | "gi7" | "guvb")
      docroot=/data/nginx/html
      rdest="gdebsrv" ;;
esac
/bin/rm -rf dist/*
brun='-dev'
bdir='dev/bdportal'
if [[ -n $dest && $dest != 'dev' ]]; then
  if [[ $dest == 'devel' ]]; then
    brun='-devel'
    bdir='devel/bdportal'
  elif [[ $dest == 'root' || $dest == 'bdportal' || $dest == '/' ]]; then
    brun=''
    bdir='bdportal'
  else
    echo "Unrecognized target, use one of: dev, devel, root"
    echo "   (root synonyms: bdportal, /)"
  exit 1
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
