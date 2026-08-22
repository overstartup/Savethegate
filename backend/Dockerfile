# Multi-stage build for GateWall.Admin (ASP.NET Core 8 API + admin panel).
# Build context is expected to be the `backend/` directory (Coolify "Base
# Directory" = backend, "Dockerfile Location" = Dockerfile).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy just the project files first so `dotnet restore` is cached across
# builds unless a .csproj actually changes.
COPY GateWall.sln ./
COPY src/GateWall.Data/GateWall.Data.csproj src/GateWall.Data/
COPY src/GateWall.Admin/GateWall.Admin.csproj src/GateWall.Admin/
RUN dotnet restore GateWall.sln

# Now copy the rest of the source and publish.
COPY . .
RUN dotnet publish src/GateWall.Admin/GateWall.Admin.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "GateWall.Admin.dll"]
