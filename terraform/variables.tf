variable "aws_region" {
  type        = string
  description = "The AWS region to deploy resources in"
  default     = "us-east-2"
}

variable "environment" {
  type        = string
  description = "The environment / stage name (e.g. dev, prod)"
  default     = "dev"
}

variable "db_name" {
  type        = string
  description = "Name of the database to create"
  default     = "bssc_db"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
  default     = "VTLdataHash8899"
}

variable "vpc_subnet_ids" {
  type        = list(string)
  description = "Subnets to associate with RDS subnet group"
  default     = [
    "subnet-06f1debbf555ab7a4",
    "subnet-0460a171c41f70be4",
    "subnet-0278347682147b0f3"
  ]
}

variable "vpc_id" {
  type        = string
  description = "The VPC ID to create the security group in"
  default     = "vpc-0a95ee79c679996ce"
}
