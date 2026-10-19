package com.nativa.pos.license;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;

/** Server-to-server entitlement checks. Credentials never reach the browser. */
public final class JgmLicenseClient {
    public record Decision(String tenant,String productCode,boolean allowed,String state,String checkedAt,String validUntil,String portalUrl) {}
    private record Cached(Decision decision,Instant until) {}
    private final boolean enabled;private final String base,key,product;
    private final ObjectMapper mapper;private final Clock clock;private final HttpClient http;
    private final ConcurrentHashMap<String,Cached> cache=new ConcurrentHashMap<>();
    public JgmLicenseClient(boolean enabled,String base,String key,ObjectMapper mapper){this(enabled,base,key,mapper,Clock.systemUTC());}
    public JgmLicenseClient(boolean enabled,String base,String key,ObjectMapper mapper,Clock clock){
        this.enabled=enabled;this.mapper=mapper;this.clock=clock;this.product="RESTAURANTE_POS";this.key=key;
        this.base=base==null?"":base.replaceAll("/+$","");
        this.http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
        if(enabled){
            URI uri;try{uri=URI.create(this.base);}catch(Exception e){throw new IllegalStateException("JGM_CONTROL_URL no es válida");}
            boolean loopback="localhost".equalsIgnoreCase(uri.getHost())||"127.0.0.1".equals(uri.getHost())||"[::1]".equals(uri.getHost());
            if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null
                ||!("https".equalsIgnoreCase(uri.getScheme())||("http".equalsIgnoreCase(uri.getScheme())&&loopback))
                ||key==null||!key.matches("[A-Za-z0-9_-]{43}"))
                throw new IllegalStateException("Licencia JGM: configura URL HTTPS y clave de instalación válida; HTTP solo se admite en localhost");
        }
    }
    public boolean enabled(){return enabled;}
    public Decision check(String tenant){
        if(!enabled)return new Decision(tenant,product,true,"STANDALONE",clock.instant().toString(),clock.instant().plusSeconds(30).toString(),"");
        if(tenant==null||!tenant.matches("[A-Za-z0-9_.:-]{1,80}"))return unavailable(tenant);
        Instant now=clock.instant();Cached existing=cache.get(tenant);if(existing!=null&&existing.until().isAfter(now))return existing.decision();
        if(cache.size()>1000){cache.entrySet().removeIf(e->!e.getValue().until().isAfter(now));if(cache.size()>1000)return fetch(tenant).decision();}
        return cache.compute(tenant,(t,old)->old!=null&&old.until().isAfter(clock.instant())?old:fetch(t)).decision();
    }
    private Cached fetch(String tenant){
        try {
            var request=HttpRequest.newBuilder(URI.create(base+"/api/integrations/license?tenant="+URLEncoder.encode(tenant,StandardCharsets.UTF_8)))
                .timeout(Duration.ofSeconds(3)).header("Accept","application/json").header("X-JGM-Integration-Key",key).GET().build();
            var response=http.send(request,HttpResponse.BodyHandlers.ofByteArray());
            if(response.statusCode()!=200||response.body().length>32768)throw new IllegalStateException();
            Decision d=mapper.readValue(response.body(),Decision.class);Instant now=clock.instant(),end=Instant.parse(d.validUntil()),checked=Instant.parse(d.checkedAt());
            if(!tenant.equals(d.tenant())||!product.equals(d.productCode())||!end.isAfter(now)
                    ||checked.isAfter(now.plusSeconds(30))||checked.isBefore(now.minusSeconds(60))||d.state()==null)throw new IllegalStateException();
            Instant cap=now.plusSeconds(30);return new Cached(d,end.isBefore(cap)?end:cap);
        }catch(InterruptedException e){Thread.currentThread().interrupt();return new Cached(unavailable(tenant),clock.instant().plusSeconds(2));}
        catch(Exception e){return new Cached(unavailable(tenant),clock.instant().plusSeconds(2));}
    }
    private Decision unavailable(String tenant){return new Decision(tenant,product,false,"CONTROL_UNAVAILABLE",clock.instant().toString(),clock.instant().plusSeconds(2).toString(),"");}
}
