Create a prompt to create a design document for a `project manager agent`.

The purpose of the project management agent is to manage the project's SLDC.

The SLDC assumes the used of github as the environment.

- Github issues are used to request changes to the code base
- PR's are used to as a human control point to review code with the assistance of an AI review agent.
- PR's should use squash commits before merging to `main`
- Github actions should be used to provide tests, lining, and security checks to PR request

The project manager agents should be able to perform the following tasks:

- perform issue intake
  - Work with the rules lawyer to maintain consistency and advise of possible conflicts
  - work from a ticket template that provies enough information for AI coding agents to implement the ticket and tests
  - add/update issues in github (use skill)
- create long term project plan using github milestones
- ensure documentation, code, and github issues remains consistent within the project

Guiding principals:

- keep project light weight
- issues need to be fine grained enough to easily implemented via an AI coding assistant
- issues need to be specific enough to easily be implemented via an AI coding assistant
