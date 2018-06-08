pipeline {
  environment {
    REGISTRY = "docker-registry:5000"
  }
  agent any
  stages {
    stage('Microservice 1') {
      steps {
        script {
          env.SERVICE_NAME="microservice-1"
          env.VERSION=readFile("$SERVICE_NAME/VERSION").trim()
          env.IMAGE_NAME="$SERVICE_NAME:$VERSION"
          env.IMAGE_TAG="$REGISTRY/$IMAGE_NAME"
        }
        sh "docker build $SERVICE_NAME -t $IMAGE_TAG"
        sh "docker push $IMAGE_TAG"
      }
    }
    stage('Microservice 2') {
      steps {
        script {
          env.SERVICE_NAME="microservice-2"
          env.VERSION=readFile("$SERVICE_NAME/VERSION").trim()
          env.IMAGE_NAME="$SERVICE_NAME:$VERSION"
          env.IMAGE_TAG="$REGISTRY/$IMAGE_NAME"
        }
        sh "docker build $SERVICE_NAME -t $IMAGE_TAG"
        sh "docker push $IMAGE_TAG"
      }
    }
  }
}
