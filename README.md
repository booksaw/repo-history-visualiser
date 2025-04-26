# Repo-History-Visualiser

A project to produce customisable visualsiations of Git repository histories. This project was created as part of a Computer Science degree.

## Running the program

There are several ways to run the program depending on your needs:
NOTE: Java 17 must be installed and all commands must be executed using it.

### Downloadable JAR

Alternatively, you can download the latest build from [GitHub Actions](https://github.com/booksaw/repo-history-visualiser/actions). 

Simply click on the latest "Maven Test and Package" action, scroll to the bottom, and download the `.jar` file.

### Development mode

Within the directory "front-end" execute the command:

#### `npm start`

Then within the root folder execute the command: 

#### `mvnw spring-boot:run`

The Spring Boot server is now being hosted on [http://localhost:8080](http://localhost:8080) so endpoints can be tested to that port.

Open [http://localhost:3000](http://localhost:3000) to view the front-end in your browser.
The page will reload when you make changes.\
You may also see any lint errors in the console.

### Combined development mode

This mode builds the front-end and copies the files across to run with the back-end

Execute the following command in the root directory: 
#### `./mvnw spring-boot:run -Pprod`

This builds the front-end react app and runs the springboot applciation

You can then access the project at [http://localhost:8080](http://localhost:8080)

## Other scripts
### `npm test`

This must be executed in the front-end folder.

Launches the jest test runner.

### `npm run coverage`

This must be executed in the front-end folder.

Runs all front-end tests with code coverage

### `mvn -B package -Pprod --file pom.xml`

This must be executed in the root folder. 

Builds the entire application into a single `.jar` file
 
