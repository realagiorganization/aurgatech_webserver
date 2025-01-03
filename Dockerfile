# Learn about building .NET container images:
# https://github.com/dotnet/dotnet-docker/blob/main/samples/README.md
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /source

# Copy project file and restore as distinct layers
COPY web.api/*.csproj .
RUN dotnet restore -a $TARGETARCH

# Copy source code and publish app
COPY web.api/. .
RUN dotnet publish -c Release -p:DefineConstants="" --no-restore -a $TARGETARCH -o /app


# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
EXPOSE 8080
WORKDIR /app
COPY --from=build /app .
#USER $APP_UID
ENTRYPOINT ["./aurga"]
