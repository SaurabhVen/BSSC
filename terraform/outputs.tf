output "aws_access_key_id" {
  value       = aws_iam_access_key.deployer_key.id
  description = "AWS Access Key ID for deployment"
}

output "aws_secret_access_key" {
  value       = aws_iam_access_key.deployer_key.secret
  description = "AWS Secret Access Key for deployment"
  sensitive   = true
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.user_pool.id
  description = "AWS Cognito User Pool ID"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.user_pool_client.id
  description = "AWS Cognito User Pool Client ID"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.documents_bucket.id
  description = "S3 Bucket name for document uploads"
}
