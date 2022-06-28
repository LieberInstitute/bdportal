#/bin/bash
##TODO: should update .env first
rm -rf dist/*
npm run build-dev-based
rm -rf ~/html/dev/bdportal/* 
rsync -av dist/ ~/html/dev/bdportal/
