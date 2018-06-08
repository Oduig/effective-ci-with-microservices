pipeline {
  environment {
  }
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'docker build microservice-1 -t foo'
        sh 'docker build microservice-2 -t foo'
      }
    }
    stage('Test') {
      steps {
        echo 'Testing...'
      }
    }
    stage('Distribute') {
      steps {
        echo 'Distributing...'
      }
    }
  }
}
