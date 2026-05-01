FROM gradle:8.7-jdk21 AS builder

WORKDIR /app

# Copy Gradle files
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle.properties ./

# Warm dependency cache
RUN gradle dependencies --no-daemon || true

# Copy source
COPY src ./src

# Build the application distribution
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the installed app distribution
COPY --from=builder /app/build/install/item-service /app

EXPOSE 8080 50051

# Start the generated launcher script
ENTRYPOINT ["/app/bin/item-service"]