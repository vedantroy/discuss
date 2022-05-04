#! /usr/bin/bash
set -euxo pipefail

# copies files faster (cache)
rsync -a --exclude='test-temp' . ./test-temp
echo 'cd test-temp && docker-compose -f docker-compose.test.yaml up'