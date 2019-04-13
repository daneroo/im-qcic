

build:
	gcloud builds submit --tag gcr.io/cloudrun-237421/helloworld

deploy:
	gcloud beta run deploy --image gcr.io/cloudrun-237421/helloworld

smoke:
	curl -s https://helloworld-s5gzlrjd2a-uc.a.run.app|jq .
	hey -n 10 -c 5 https://helloworld-s5gzlrjd2a-uc.a.run.app
	curl -s https://helloworld-s5gzlrjd2a-uc.a.run.app|jq .