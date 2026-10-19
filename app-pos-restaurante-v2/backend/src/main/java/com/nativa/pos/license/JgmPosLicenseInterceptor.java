package com.nativa.pos.license;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import org.springframework.web.servlet.HandlerInterceptor;
import java.util.Map;
public final class JgmPosLicenseInterceptor implements HandlerInterceptor {
    private final JgmLicenseClient client;private final ObjectMapper mapper;
    public JgmPosLicenseInterceptor(JgmLicenseClient client,ObjectMapper mapper){this.client=client;this.mapper=mapper;}
    public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler)throws Exception{
        String path=request.getRequestURI();
        if(!client.enabled()||request.getMethod().equals("OPTIONS")||path.equals("/api/health")||path.equals("/api/jgm/license")||path.matches("/api/tables/[^/]+/pay"))return true;
        var d=client.check("default");response.setHeader("X-JGM-License-State",d.state());if(d.portalUrl()!=null&&!d.portalUrl().isBlank())response.setHeader("X-JGM-Billing-Url",d.portalUrl());
        if(request.getMethod().equals("GET")||request.getMethod().equals("HEAD")||d.allowed())return true;
        boolean outage=d.state().equals("CONTROL_UNAVAILABLE");response.setStatus(outage?503:402);response.setContentType("application/json");response.setCharacterEncoding("UTF-8");response.setHeader("Cache-Control","no-store");
        response.getWriter().write(mapper.writeValueAsString(Map.of("code",outage?"LICENSE_UNAVAILABLE":"SUBSCRIPTION_REQUIRED","message",outage?"No pudimos verificar el servicio; las consultas siguen disponibles.":"Operación suspendida. Revisa la suscripción del negocio.","portalUrl",d.portalUrl()==null?"":d.portalUrl())));return false;
    }
}
