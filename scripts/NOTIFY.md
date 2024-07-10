# Ntfy.sh Notifications

Just using the public instance to play for now.

```bash
# not-so-random-topic
❯ echo -n 'im.qcic' | sha256sum
e18fb432047e65a45bafb9f0606118dc4624e20b6af8e980b95a70e2e7b46f09  -

topic=$(echo -n 'im.qcic' | sha256sum | awk '{print $1}')
curl -d "Ntfy Test" "ntfy.sh/${topic}"
curl -d "Ntfy Test" "ntfy.sh/e18fb432047e65a45bafb9f0606118dc4624e20b6af8e980b95a70e2e7b46f09"

# Look at the web page
open https://ntfy.sh/${topic}
open https://ntfy.sh/e18fb432047e65a45bafb9f0606118dc4624e20b6af8e980b95a70e2e7b46f09

# subscription (as JSON - Raw, and SSE ServerSde Events also available)
curl -s "https://ntfy.sh/${topic}/json"
curl -s "https://ntfy.sh/e18fb432047e65a45bafb9f0606118dc4624e20b6af8e980b95a70e2e7b46f09/json"
```
