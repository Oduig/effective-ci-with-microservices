# Effective CI with Microservices

At Trifork Eindhoven, we have several teams developing microservice-based solutions for our customers. While each solution is different in terms of business domain, languages and tools, we observed that the release cycles were very similar. These similarities led us to look for a single, unified flow that we could use for all our projects. 



##### Release cycle

To clear up any misunderstandings, we define the following phases in the release cycle.

- **Development** starts with a ticket. It is implemented and code is pushed to version control (VCS). 
- **Continuous Integration** polls version control. Certain branches/tags trigger a build: compile, check, test, package, distribute. In the final step (distribute), the package is pushed to an artifact repository.


- **Continuous Deployment** picks up the new artifacts, and deploys them to a live environment.

Our primary focus for today is the **CI** phase.



##### Scope

Narrowing things down, the flow should work for any project with the following properties.

- A **microservices architecture** is a fitting solution for the business problem.
- A **single team** (two pizza rule) is responsible for the entire solution.
- The team works on **vertical features**, spanning several microservices.
- The team controls the **release cycle** and is empowered to customize CI/CD tools.


One could raise plenty of questions about these assertions, but that's a different topic.



### Versioning

In any CI/CD solution, releases are ultimately triggered by code changes. These changes may be either backwards compatible or backwards incompatible. This is a judgement call that can typically not be made by automated code analysis. This is why an incompatible change should carry a version number as part of the change: setting the version at a later time has more room for error. 

The keyword here is "change". What is the most effective unit of change to use? An often-cited argument for microservices is that they should be self-contained and therefore have their own release cycle. That means they have their own version number. 

On the other hand, there is the "less pure" option of versioning the solution as a whole, building and deploying all microservices at once with each release. Both options have their pros and cons. 



##### Service-based

Consider a situation where we version each service individually.

- Faster builds, small releases. Only services that change need to be redeployed.
- More versatile. One service may keep running its A/B test while the other gets a new release C.
- More complexity. Will service `a:4` work with `b:6` and `c:3`? If we need to roll back to `c:2`, do we also need to roll back to `b:5`? Or `b:4`? Can we release `c:4` before `a:5`?
- Slightly more labor. A change might lead to multiple services getting a new version number.



##### Solution-based

Now consider a situation where the solution is versioned as a whole.

- Slower builds, large releases. All services need to be redeployed when one service changes.
- Less versatile. When an A/B test is running and a new release C is made, what happens?
- Less complexity. Developers only need to take into account that `a:4` is compatible with `a:3`, `b:3` and `b:4`. It's easier to roll back the solution to a previous, known working state.
- Less labor. Only one version number needs to be kept up-to-date.



##### Our choice

While having opted for the solution-based approach in the past, we chose to migrate to a service-based approach. We have to experiment to find out if the benefits are worth the extra complexity.


### Repository

For solution-based versioning, the choice for a repository is simple. If there is one version number and one build for all services, there should be one repository. When a commit is tagged, the CI server can build it under the current number.

For service-based versioning we encounter a dilemma. Many sources recommend one repository per service, but that means:

- multiple branches per feature,
- multiple merges per feature,
- multiple reviews per feature.

This adds a lot of manual work and introduces potential conflicts because features are not atomic. When the team team is small and developers work on multiple services at once, this is a hassle. For example, for git there are no mature tools for managing multiple repositories at once, and submodules have their own set of problems.

This led us to the choice a mono-repo, with a specific setup.

- Services are organized into folders. 
- Services are self-contained and have no dependencies in the repository, outside their folder.
- Each service folder has it's own version file.
- Builds trigger when anything in the folder has changed.
- Builds on the `develop` branch create `<service-name>:<service-version>-SNAPSHOT-<buildnr>` images.
- Builds on tags `release-<YYYYMMDD>` create `<service-name>:<service-version>` images.

The downside is that, to support this process, we have to detect changes in folders. Many tools like `GitLab` and `BitBucket` do not support these type of builds, and force one to use a single build file for the entire repository. Hosting microservices in a mono-repo requires a more powerful tool like `TeamCity` or `Jenkins`.



### Proof of concept

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



### References

[1] https://12factor.net/codebase

[2] http://blog.shippable.com/our-journey-to-microservices-and-a-mono-repository

[3] https://news.ycombinator.com/item?id=16166645