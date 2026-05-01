FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY rental-service/rental-service.csproj ./rental-service/
COPY rental-service-tests/rental-service-tests.csproj ./rental-service-tests/

RUN dotnet restore ./rental-service/rental-service.csproj
RUN dotnet restore ./rental-service-tests/rental-service-tests.csproj

COPY rental-service ./rental-service
COPY rental-service-tests ./rental-service-tests

RUN rm -rf ./rental-service/bin ./rental-service/obj ./rental-service-tests/bin ./rental-service-tests/obj

RUN dotnet restore ./rental-service/rental-service.csproj
RUN dotnet restore ./rental-service-tests/rental-service-tests.csproj

RUN dotnet build ./rental-service/rental-service.csproj -c Release --no-restore
RUN dotnet build ./rental-service-tests/rental-service-tests.csproj -c Release --no-restore

FROM build AS test
RUN dotnet test ./rental-service-tests/rental-service-tests.csproj -c Release --no-build

FROM build AS publish
RUN dotnet publish ./rental-service/rental-service.csproj -c Release --no-build -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5000

ENTRYPOINT ["dotnet", "rental-service.dll"]