terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# -----------------------------------------------------------------------------
# Cognito User Pool & Client
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool" "user_pool" {
  name = "candidate-portal-user-pool-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  name         = "candidate-portal-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.user_pool.id

  generate_secret = false
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
}

# -----------------------------------------------------------------------------
# S3 Document Storage
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "documents_bucket" {
  bucket        = "${var.environment}-${var.aws_region}-candidate-portal-documents"
  force_destroy = true
}

resource "aws_s3_bucket_cors_configuration" "documents_cors" {
  bucket = aws_s3_bucket.documents_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# (RDS Database resources removed to reuse existing database)

# -----------------------------------------------------------------------------
# IAM Deployment User & Permissions
# -----------------------------------------------------------------------------
resource "aws_iam_user" "deployer" {
  name = "bssc-sls-deployer-${var.environment}"
}

resource "aws_iam_access_key" "deployer_key" {
  user = aws_iam_user.deployer.name
}

resource "aws_iam_user_policy" "deployer_policy" {
  name = "bssc-deployer-policy-${var.environment}"
  user = aws_iam_user.deployer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ServerlessDeployment"
        Effect = "Allow"
        Action = [
          "cloudformation:*",
          "lambda:*",
          "apigateway:*",
          "s3:*",
          "iam:*",
          "cognito-idp:*",
          "route53:*",
          "acm:*",
          "ec2:*",
          "logs:*",
          "secretsmanager:*",
          "ses:*"
        ]
        Resource = "*"
      }
    ]
  })
}
