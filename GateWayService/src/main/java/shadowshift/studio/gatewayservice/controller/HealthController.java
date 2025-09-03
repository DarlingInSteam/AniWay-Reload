package shadowshift.studio.gatewayservice.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Gateway is healthy!");
    }
    
    @GetMapping("/cors-test")
    public ResponseEntity<String> corsTest() {
        return ResponseEntity.ok("CORS is working!");
    }
}
