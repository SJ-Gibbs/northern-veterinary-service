package uk.co.northernveterinaryservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import uk.co.northernveterinaryservice.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
@EnableAsync
public class NorthernVetApplication {

    public static void main(String[] args) {
        SpringApplication.run(NorthernVetApplication.class, args);
    }
}
