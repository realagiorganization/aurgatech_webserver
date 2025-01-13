# Project Overview

This project consists of two main parts:
1. An ASP.NET Core project (`web.api` folder) that provides web APIs.
2. A Node.js project (`web.app` folder) that provides the sign-up/sign-in UI.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [.NET SDK](https://dotnet.microsoft.com/download)
- [IIS](https://www.iis.net/) (for Windows hosting)
- [Nginx](https://nginx.org/) or [Apache](https://httpd.apache.org/) (for Linux hosting)

## Step 1: Build the Node.js Project

### Automatic Build and Copy for Windows, Linux, and macOS

If `npm` is installed, the following scripts can automatically build the Node.js project and copy the built files to the `web.api/wwwroot` directory for debugging:

- **Windows Users**: Run the batch script:
  ```bash
  .\web.app\win.bat
  ```
- **Linux Users**: Run the shell  script:
  ```bash
  ./web.app/linux.sh
  ```
- **macOS Users**: Run the shell  script:
  ```bash
  ./web.app/osx.sh
  ```
### Manual Build
- Navigate to the `web.app` folder:
- Follow the instructions in the `web.app/README.md` to build the Node.js project.
- After building, copy the dist folder to web.api/wwwroot.

### Debug
 - Edit src/utils/config.ts, change BASE_URL to web.api's URL, like http://localhost:8800.
 - run
 ```
 npm run dev
 ```

## Step 2: Build the ASP.NET Core Project

### Configure the Project
Before building the project, you need to configure the ASP.NET Core project settings in the `appsettings.json` file located in the `app` folder.

### Sample `appsettings.json` Configuration

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=aurga.db"
  },
  "EmailServer": "smtp.yourdomain.com",
  "EmailAccount": "account@yourdomain.com",
  "EmailPassword": "smtp_password",
  "WebSiteUrl": "https://aurga.yourdomain.com", 
  "WebSiteMirrorUrl": "https://aurga.yourdomain.com" 
}
```
Configuration Details

`DefaultConnection`: Specifies the SQLite database file location. Update this to your desired database file path.

`EmailServer`: The SMTP server address. Replace smtp.yourdomain.com with your SMTP server's address.

`EmailAccount`: The email account used for sending emails. Replace account@yourdomain.com with your email account.

`EmailPassword`: The password for the email account. Replace smtp_password with your email account's password.

`WebSiteUrl`: The site url attached in invitation email.

`WebSiteMirrorUrl`: This is the URL used by the mirror application to communicate with the main web server. It acts as the host address for mirroring requests and responses. Ensure this URL points to the correct endpoint where the mirror app can access the server. Typically, this will be the same as WebSiteUrl unless you have a separate domain or subdomain dedicated to mirroring functionality. 

### Automatic Build and Copy for Windows, Linux, and macOS

- Navigate to the app folder:
- Build the ASP.NET Core project in Release configuration:
```bash
dotnet build -c Release
```
After building, the files are generated in `app/bin/Release/netx.0/`. Copy the `web.app/dist` folder to this location and rename it to `wwwroot`:

### Debug
Open `aurga.csproj` with Visual Studio and debug.

## Step 3: Host the Web Server
### Windows (IIS)
- Open IIS Manager.
- Create a new website and point the physical path to `app/bin/Release/netx.0/`.
- Configure the bindings (e.g., port, hostname).
- Start the website.
### Linux (Nginx or Apache)
- [Apache](https://www.yogihosting.com/aspnet-core-host-apache-linux/)
- [Nginx](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/linux-nginx?view=aspnetcore-9.0&tabs=linux-ubuntu)
- [Docker](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/docker/building-net-docker-images?view=aspnetcore-9.0)

## Docker Setup

Follow these steps to build and run the project using Docker:

### Prerequisites
- Docker installed on your machine ([Install Docker](https://docs.docker.com/get-docker/)).
- Docker Compose (optional, but recommended).

### Steps

1. **Configure `web.api/appsettings.json`**  
   Update the `appsettings.json` file with your configuration details. Refer to [Step 2](#step-2-configuration) for guidance.

2. **Set Database Location**  
   Change the database path in `appsettings.json` to a bind mount path inside the Docker container. For example:
   ```json
   "DefaultConnection": "Data Source=/database/data.db"
   ```
3. **Build the Docker Image**
      - Windows: Run `build.bat`.
      - Linxu/macOS: Run `bash build.sh`.
      
      This script will:

      - Build the Node.js project (if applicable).
      - Copy the necessary files to web.api/wwwroot.
      - Build the Docker image.
3. **Run the Docker Container**
  Start the Docker container with a local volume for the database. For example:
      ```bash
      docker run -d -p 80:8080 -v /path/to/local/database:/database <image-name>
      ```
Replace `/path/to/local/database` with the path to your local database directory and `<image-name>` with the name of your Docker image.

Alternatively, use Docker Compose:
```yaml
version: '3.8'
services:
  web:
    image: <image-name>
    ports:
      - "80:8080"
    volumes:
      - /path/to/local/database:/database
```
Save this as `docker-compose.yml` and run:
```bash
docker-compose up -d
```
### Notes
- Ensure the local database directory (`/path/to/local/database`) exists and has the correct permissions.

- If you encounter issues, check the Docker logs for errors:
```bash
docker logs <container-id>
```
