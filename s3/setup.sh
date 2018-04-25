. ENV.sh

set -e
echo 
echo "Creating user ${USERNAME} (with profile ${AWS_PROFILE})"
aws iam create-user --user-name ${USERNAME} 

echo 
echo "Creating access key"
aws iam create-access-key --user-name qcic-s3-rw

echo 
echo "Creating access policy"
aws iam create-policy --policy-name ${POLICYNAME} --policy-document file://qcic-iam-sw-rw-policy.json

policyArn=`aws iam list-policies --scope Local | jq -r ".Policies[]|select(.PolicyName==\"${POLICYNAME}\").Arn"`
echo
echo "Attaching User Policy (${policyArn})"
aws iam attach-user-policy --user-name ${USERNAME} --policy-arn arn:aws:iam::123517053355:policy/qcic-s3-rw-policy

echo
echo "Done"
