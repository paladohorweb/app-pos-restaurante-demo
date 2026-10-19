package com.nativa.pos.license;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class JgmLicenseConfiguration {
    @Bean JgmLicenseClient jgmLicenseClient(@Value("${JGM_LICENSE_ENABLED:false}") boolean enabled,@Value("${JGM_CONTROL_URL:}") String url,@Value("${JGM_INTEGRATION_KEY:}") String key,ObjectMapper mapper){return new JgmLicenseClient(enabled,url,key,mapper);}
    @Configuration static class Gate implements WebMvcConfigurer {
        private final JgmLicenseClient client;private final ObjectMapper mapper;
        Gate(JgmLicenseClient client,ObjectMapper mapper){this.client=client;this.mapper=mapper;}
        public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new JgmPosLicenseInterceptor(client,mapper)).addPathPatterns("/api/**");}
    }
    @RestController static class Status {
        private final JgmLicenseClient client;Status(JgmLicenseClient client){this.client=client;}
        @GetMapping("/api/jgm/license") public JgmLicenseClient.Decision status(){return client.check("default");}
    }
}
