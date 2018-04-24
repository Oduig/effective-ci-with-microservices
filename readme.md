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

Example using Jenkins/TeamCity: TODO

1. To run the build server, cd to `buildserver` and run `docker-compose up -d`. Create an `admin` account and import `teamcity-settings.zip` from the `Administration` menu.
2. Change the `VERSION` files in both microservices, commit and push the changes.
3. Wait for the builds to complete.
4. Download and start the built images with `docker-compose pull && docker-compose up -d`.

### References

[1] https://12factor.net/codebase

[2] http://blog.shippable.com/our-journey-to-microservices-and-a-mono-repository

[3] https://news.ycombinator.com/item?id=16166645