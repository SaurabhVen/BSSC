variable "aws_region" {
  type        = string
  description = "The AWS region to deploy resources in"
  default     = "ap-south-1"
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
  default     = "oms_postgres"
}

