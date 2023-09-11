#! /bin/bash
rm -rf dist || echo ""
rm -rf node_modules || echo ""
rm lambda.zip || echo ""

npm i
npm run build

rm -rf node_modules
npm i --production

zip -r lambda.zip node_modules dist/*