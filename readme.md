# Effective CI with Microservices

At work, we have several teams developing microservice-based solutions for our customers. While each solution is different in terms of business domain, languages and tools, we observed that our release cycles were very similar. These similarities led us to look for a single, unified flow that we could use for all our future projects. 

#### Definitions

We define the following phases in the release cycle.

- **Development** starts with a ticket. It is implemented and code is pushed to version control (VCS). 
- **Continuous Integration** polls version control. Certain branches/tags trigger a build. The build has a series of steps: compile, check, test, package, distribute. In the final step (distribute), the package is pushed to an artifact repository.


- **Continuous Deployment** picks up the new artifacts, and deploys them to a live environment. This may be done automatically via polling, or alternatively by manually performing a release action.

Our focus for today is the **CI** phase.


#### Scope

For a plan to be concrete and actionable, we have to make some trade-offs. Our approach may work for different companies, teams and projects, but let's make it concrete and make some assumptions.

- A **microservices architecture** is a fitting solution for the business problem.
- A **single team** (two pizza rule) is responsible for the entire solution.
- The team works on **vertical features**, spanning several microservices.
- The team has full control of the **release cycle** and is empowered to customize CI/CD tools.


In other words, we want to leverage microservices to our advantage in a small to medium sized company, which is not large enough to dedicate entire teams to one microservice.


## Comparing CI approaches

### Repository structure

A popular practice for microservices is that each service should be individually developed, built and deployed. [1] For many that means each microservice should live in its own repository, which integrates neatly with CI tools like GitLab, BitBucket and Travis. However, this is where we encounter a dilemma when we work on vertical features.

- Each feature requires a branch for each affected repo. All these branches need to be kept in sync, and existing tools to manage multiple repos are complex and scarce.
- Developers have to send out multiple merge requests for a single feature. Merges are not atomic: sometimes one merge might succeed while the other runs into a conflict.
- Most code reviewing tools do not support diffs across multiple repositories.

There are two solutions to this dilemma, both involving a single repository. We can either combine our service builds and release them under a shared version, or customize our CI tools to build microservices individually. 
There is some prior work in this area. [2][3]

### Combined build

In a combined build strategy, every service in the platform is built for each triggering commit. After the build is done, the new version number is assigned to all services.

This strategy has the advantage of being simple - interoperability between services is easy to guarantee and many cloud-hosted CI tools (GitLab, BitBucket, Travis) are ready to integrate with the repository. However, there are several drawbacks.

- All builds and build steps are specified in one file, which can get very large. [4]
- The more microservices there are in this build and the more commits are being made, the slower the CI feedback loop.
- The mentioned CI tools require a single build file and do not have great support for caching. This especially hurts for docker images and NPM packages. While this is not an argument against a combined build, it is an argument for using a more powerful CI tool that has persistent storage. [6]
- There is a false sense of security when doing zero-downtime releases. For a brief time during a release, a mix of services will run from the old and new version of the platform. Versioning a platform as a whole is not a complete guarantee for interoperability.
- When doing A/B testing of different versions of a service, doing a full new release may interrupt the running A/B test even if both services A and B are unchanged.

### Separate builds

Building microservices individually requires a little more setup. 

- Microservices are organized into folders.
- Each service folder has it's own version file.
- Services are self-contained and have no code-level dependencies outside their folder. Libraries can exist outside the folder if they are versioned.
- In order to support separate builds, we need a more powerful CI tool like `TeamCity` or `Jenkins`, which allow separating builds cleanly and support triggers based on subfolders. [5]
- Builds trigger when anything in the microservice folder has changed.
- Builds triggered by development branches create `<service-name>:<service-version>-SNAPSHOT-<buildnr>` images.
- Builds triggered by test branches create `<service-name>:latest` images.
- Builds triggered by tags create `<service-name>:<service-version>` images.

The advantage of this approach is the microservice mantra: services are independently versioned and deployed, small changes are easy to push and the system scales up well with many microservices and many developers.

The approach also has some drawbacks.

- Versioning becomes an action as part of the development process, rather than the release process. Discipline is required to correctly version services.
- Interoperability is more complex. Does service `a:4` work with `b:6` and `c:3`? If we need to roll back to `c:2`, do we also need to roll back to `b:5`? Or `b:4`? Can we release `c:4` before `a:5`? These are questions we should constantly be aware of while implementing features. While backwards compatibility is a good thing, it can make development more difficult.


### Versioning

Versions for software packages say something about its backwards compatibility. Whether code is backwards compatible is a judgement call that can typically not be made by automated  analysis, so developers at some point need to make a conscious choice to update the version number.

The more time between the change and its corresponding version bump, the more room for confusion and error about which version is which. Therefore, a feature implementation that carries an incompatible change should receive a new version number as part of the change. The ideal time to bump a version number is when creating a feature branch.


## Conclusion

Weighing the pros and cons, we chose to migrate from a mono-repo strategy with a single build to a mono-repo strategy with separate builds. It provides more speed and control over the CI/CD pipeline and forces us to think about correct versioning and compatibility. We believe this method pays back the additional effort and complexity in terms of quality and flexibility.


## Proof of concept

### Using Jenkins (WIP)

##### Setting up Jenkins

1. Fetch the password with `docker exec -it buildserver_jenkins-server_1 cat var/jenkins_home/secrets/initialAdminPassword`
2. Use the default set of plugins, in addition install the `PathIgnore` plugin.
3. Create a Pipeline build called `Microservice 1`.
4. Point it to your fork of this repository.
5. Build `master` and use the SCM Jenkinsfile at `microservice-1/Jenkinsfile`.
6. Select `Polling ignores commits in certain paths`, and add an `Include Region` of `microservice-1/*`.
6. Copy the Pipeline build `Microservice 1` and replace the `1`s by `2`s.

### Using TeamCity

##### Setting up TeamCity

1. Append the `hosts` file to the host mapping in your OS.
2. To run the build server, cd to `buildserver` and run `docker-compose up -d`. 
3. Use the default directory and database settings.
4. Create an `admin` account.
5. Go to `Agents` and authorize the unauthorized agent.
6. Go to `Projects` and create a new `Example Project`.
7. Go to the project configuration and add `+:refs/tags/*` as a branch configuration.

##### Adding a release build

1. Add a `Release Build`.

2. Add a `git` trigger (point it to your fork of this repo).

3. Configure `+:release-*` as a branch specifier and check `Use tags as branches`.

4. Add two `Console` build steps with the following script. Make sure you substitute `microservice-2` for the second build.

   ```
   set -e
   SERVICE_NAME=microservice-1
   REGISTRY=docker-registry:5000
   VERSION=$(sed -r 's/\s+//g' $SERVICE_NAME/VERSION)
   IMAGE_NAME=$SERVICE_NAME:$VERSION
   IMAGE_TAG=$REGISTRY/$IMAGE_NAME
   docker build $SERVICE_NAME -t $IMAGE_TAG
   docker push $IMAGE_TAG
   ```

##### Adding a development build

1. Add two builds, a `Build Microservice 1` and a `Build Microservice 2`. Perform the steps hereafter for both builds.

2. Add a `git` trigger (reuse the existing VCS setup).

3. Configure `+:microservice-1/**` or `+:microservice-2/**` as a VCS trigger rule.

4. Configure `+:<default>` as a branch specifier.

5. Add a `Console` build step with the following script. Make sure you substitute `microservice-2` for the second build.

   ```
   set -e
   SERVICE_NAME=microservice-1
   REGISTRY=docker-registry:5000
   VERSION=$(sed -r 's/\s+//g' $SERVICE_NAME/VERSION)
   IMAGE_NAME=$SERVICE_NAME:$VERSION-SNAPSHOT-%build.counter%
   IMAGE_TAG=$REGISTRY/$IMAGE_NAME
   LATEST_TAG=$REGISTRY/$SERVICE_NAME
   docker build $SERVICE_NAME -t $IMAGE_TAG
   docker tag $IMAGE_TAG $LATEST_TAG
   docker push $IMAGE_TAG
   docker push $LATEST_TAG
   ```


##### Performing a development build

1. Change the `VERSION` files in both microservices, commit and push the changes.
2. Wait for the builds to complete.
3. Download and start the built images with `docker-compose pull && docker-compose up -d`.
4. If you want, try changing just one of the `VERSION` files and notice that only one build is started.


##### Performing a release build

1. Tag a commit. The name of the tag could include your system-wide release verison, e.g. `release-myproject-v1` or `release-sprint-3`.
2. Wait for the builds to complete.
3. Check the `VERSION` file for `microservice-1` and run `docker pull docker-registry:5000/microservice-1:<VERSION>`. The release build should now be pulled.


##### Continuous Deployment

Continuous Deployment is the next step in the chain. It should monitor the docker registry and launch new deployments based on a number of custom triggers.

For example, you could create a TeamCity build that pushes a specific major version number to production, or you could add a deploy step to one of the existing builds to always deploy the latest image automatically.



## References

[1] https://12factor.net/codebase

[2] http://blog.shippable.com/our-journey-to-microservices-and-a-mono-repository

[3] https://news.ycombinator.com/item?id=16166645

[4] https://gitlab.com/gitlab-org/gitlab-ce/issues/18157

[5] https://gitlab.com/gitlab-org/gitlab-ce/issues/19813

[6] https://gitlab.com/gitlab-org/gitlab-ce/issues/17861
