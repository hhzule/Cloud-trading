
terraform {
  required_version = ">= 1.5"
  
  backend "s3" {
    bucket         = "cloudtrade-terraform-state"
    key            = "dev/eks-cluster/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "cloudtrade"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

module "eks_cluster" {
  source = "../../modules/eks-cluster"

  project_name = "cloudtrade"
  environment  = "dev"
  
  vpc_cidr           = "10.0.0.0/16"
  kubernetes_version = "1.28"
  
  node_instance_types     = ["t3.medium"]
  node_group_min_size     = 1
  node_group_max_size     = 5
  node_group_desired_size = 2
  
  spot_instance_types = ["t3.medium", "t3a.medium"]
  
  tags = {
    CostCenter = "Engineering"
    Owner      = "DevOps"
  }
}

# RDS for production database
module "rds" {
  source = "../../modules/rds"
  
  identifier     = "cloudtrade-dev"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  
  vpc_id             = module.eks_cluster.vpc_id
  subnet_ids         = module.eks_cluster.private_subnet_ids
  allowed_cidr_blocks = [module.eks_cluster.vpc_cidr]
  
  backup_retention_period = 7
  skip_final_snapshot    = true
  
  tags = {
    Environment = "dev"
  }
}

