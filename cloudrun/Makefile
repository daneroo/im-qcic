
PROJECTID=qcic-237620
SERVICE=myip
# gcloud beta run services describe myip --format json | jq .status.address.hostname
ENDPOINT=https://myip-6vdzfoe7cq-uc.a.run.app

build:
	gcloud builds submit --tag gcr.io/${PROJECTID}/${SERVICE}

deploy:
	gcloud beta run deploy ${SERVICE} \
		--image gcr.io/${PROJECTID}/${SERVICE} \
		--memory=128Mi \
		--concurrency 80 \
		--allow-unauthenticated 

smoke:
	curl -s ${ENDPOINT} | jq .
	hey -n 10 -c 5 ${ENDPOINT}
	curl -s ${ENDPOINT} | jq .
	@echo "while true; do sleep 1; curl -s ${ENDPOINT} | jq .; done"

local:
	docker run -it --rm -p 8080:8080 gcr.io/qcic-237620/myip