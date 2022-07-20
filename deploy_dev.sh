#/bin/bash
##should update .env first
lasthash=$(git rev-parse --short HEAD)
lastdate=$(git log -1 --format='%ai' | gawk '{print $1}')
sed -i -E "s/COMMIT_DATE=.+/COMMIT_DATE=${lastdate}/" .env
sed -i -E "s/COMMIT_HASH=.+/COMMIT_HASH=${lasthash}/" .env
host=$(hostname -d)
rdest="" #remote target (home)
docroot=/var/www/html
case "$host" in
  "gryzen" | "gi7" | "guvb")
      docroot=/data/nginx/html
      rdest="gdebsrv" ;;
   "srv16")
      sed -i -E "s/_MWSERVER=.+/_MWSERVER=http://srv16.lieber.local:4095/" .env
      ;;
esac
/bin/rm -rf dist/*
npm run build-dev-based

if [[ "$rdest" ]]; then
 ssh $rdest "/bin/rm -rf $docroot/dev/bdportal/* "
 rdest="${rdest}:"
else 
 /bin/rm -rf $docroot/dev/bdportal/* 
fi
rsync -av dist/ ${rdest}${docroot}/dev/bdportal/
