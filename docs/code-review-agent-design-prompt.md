Create a prompt to create a design document for a `code review agent`.

The purpose of the code review agent is to perform these tasks:

- Ensure code meets coding standards
- ensure code meets high industry standards in terms of documentation, simplicity, and clarity
- Ensure code builds and runs
- ensure tests pass
- looks for common coding issues:
  - dead code
  - duplicate code
  - possible null pointers or type mismatches
  - unreferenced variables

- create a skill `review` which reviews the current PR after it is created by the devops agent
- create a skill `assess` which does a full examination of the code base focused on simplifying and removing deplicate code along with other improvements and needed refactorings.
- Ensure adequate test coverage

Guiding Principles:

- frequent tasks should be managed as skills
- keep code clean using lint and auto formating
- keep neccessary logging to diagnose errors while performaing tasks
- Use `npm run` where ever possible to execute commands
- keep logs in `logs` folder which should be .gitignore'd
- log activity for debugging and auditing purposes
