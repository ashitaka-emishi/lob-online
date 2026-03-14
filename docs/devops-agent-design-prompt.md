Create a prompt to create a design document for a `devops agent`.

The purpose of the devops agent is to perform these tasks:

- Build the system
  - buld system with `build` skill
  - Include code format by default
  - Include lint be default
  - Server is simple javascript code
  - Needs to build the client using vite
- Run the system
  - verifies system isn't already running. If running run `stop` skill
  - run system with `start` skill
  - start webserver that serves client website
  - start server
  - ensure system started successfully by checking ports
  - record server stdout to log files for error analysis
- Stop the system
  - stop system with `stop` skill
  - stops client webserver and server grcefully if possible, otherwise after 10s timeout kill processes
- Test the system
  - ensures the system is running, start if not running
  - run server and client tests
  - redirect test stdout to a test log file
  - summarize results
  - track flakiy tests
  - provide error resolution analysis bases on test and server logs
  - keep local copy of tests results

Guiding Principles:

- frequent tasks should be managed as skills
- keep code clean using lint and auto formating
- keep neccessary logging to diagnose errors while performaing tasks
- Use `npm run` where ever possible to execute commands
- keep logs in `logs` folder which should be .gitignore'd
- keep test, server, and client logs in separate folders uner `logs`
- keep test results in `test-results` folder which should be .gitignored'd
