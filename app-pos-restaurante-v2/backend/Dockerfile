FROM maven:3.9-amazoncorretto-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package

FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/target/restaurant-pos-api-2.0.0.jar app.jar
RUN addgroup -S nativa && adduser -S nativa -G nativa
USER nativa
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

