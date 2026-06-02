# Recipe Cloud Book

Recipe Cloud Book is a cloud-based personal recipe book platform built as a final project for the Development in Cloud Environments course.

The system allows users to save, organize, search and manage their favorite recipes in one simple platform.

## Project Track

Serverless Application

## Main Features

- Add a new recipe
- Upload a recipe image
- Choose recipe category
- Add preparation time
- Add ingredients and instructions
- View saved recipes as cards
- Search recipes by name or category
- Delete recipes

## Current Version

The current version is a static frontend prototype built with HTML, CSS and JavaScript.

For now, the recipes are saved locally using localStorage.

In the final cloud version, the system will be connected to AWS services.

## Planned AWS Architecture

- Amazon S3 - hosting the static website and storing recipe images
- Amazon CloudFront - content delivery and HTTPS access
- Amazon API Gateway - exposing the backend API
- AWS Lambda - backend logic for creating, reading and deleting recipes
- Amazon DynamoDB - storing recipe metadata
- Amazon CloudWatch - logs and monitoring
- AWS IAM - roles and permissions
- Amazon Route 53 - domain management
- AWS Certificate Manager - HTTPS certificate

## CI/CD

The project will use GitHub Actions to automatically deploy the frontend to AWS S3 and update the live website.

## Technologies

- HTML
- CSS
- JavaScript
- GitHub
- AWS Serverless Services

## Live Application

Will be added after AWS deployment.

## Team Members

- Nofar Leibovich
