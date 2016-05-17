FROM java:8

ADD engine.jar engine.jar

EXPOSE 9000

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/engine.jar"]
