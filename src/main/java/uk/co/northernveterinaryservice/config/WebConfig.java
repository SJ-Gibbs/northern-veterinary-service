package uk.co.northernveterinaryservice.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

/**
 * Serves the static public/ front-end and uploads/ directory.
 * Spring Boot serves from classpath:/static/ by default; here we override
 * to serve from the external filesystem directories instead.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AppProperties appProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String publicDir = new File(appProperties.getPublicDir()).getAbsolutePath();
        String uploadsDir = new File(appProperties.getUploadsDir()).getAbsolutePath();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadsDir + "/");

        registry.addResourceHandler("/**")
                .addResourceLocations("file:" + publicDir + "/");
    }
}
