package uk.co.northernveterinaryservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String masterAdminEmail = "info@northernveterinaryservice.co.uk";
    private boolean allowPublicSignup = true;
    private String siteGateUser = "nvs";
    private String siteGatePass = "change-this-site-password";
    private String url = "http://localhost:3000";
    private String smtpFrom = "Northern Veterinary Service <noreply@northernveterinaryservice.co.uk>";
    private String uploadsDir = "uploads";
    private String publicDir = "public";
    private boolean trustProxy = false;

    public String getMasterAdminEmail() { return masterAdminEmail; }
    public void setMasterAdminEmail(String v) { this.masterAdminEmail = v.toLowerCase(); }

    public boolean isAllowPublicSignup() { return allowPublicSignup; }
    public void setAllowPublicSignup(boolean v) { this.allowPublicSignup = v; }

    public String getSiteGateUser() { return siteGateUser; }
    public void setSiteGateUser(String v) { this.siteGateUser = v; }

    public String getSiteGatePass() { return siteGatePass; }
    public void setSiteGatePass(String v) { this.siteGatePass = v; }

    public String getUrl() { return url; }
    public void setUrl(String v) { this.url = v.replaceAll("/$", ""); }

    public String getSmtpFrom() { return smtpFrom; }
    public void setSmtpFrom(String v) { this.smtpFrom = v; }

    public String getUploadsDir() { return uploadsDir; }
    public void setUploadsDir(String v) { this.uploadsDir = v; }

    public String getPublicDir() { return publicDir; }
    public void setPublicDir(String v) { this.publicDir = v; }

    public boolean isTrustProxy() { return trustProxy; }
    public void setTrustProxy(boolean v) { this.trustProxy = v; }
}
