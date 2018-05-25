FROM jetbrains/teamcity-agent

ARG REGISTRY_HOST

RUN echo "DOCKER_OPTS=\"--insecure-registry $REGISTRY_HOST\"" >> /etc/default/docker
