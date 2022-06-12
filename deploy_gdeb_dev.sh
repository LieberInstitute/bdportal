#!/bin/bash
echo "Assuming dist/ content was built with: "
echo "    npm run build-dev-based"

ssh gdebsrv 'rm -rf ~/html/dev/bdportal' ; rsync -av dist/ gdebsrv:~/html/dev/bdportal/
