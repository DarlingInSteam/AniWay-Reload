package shadowshift.studio.imagestorageservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.minio.MinioClient;
import io.minio.ListObjectsArgs;
import io.minio.Result;
import io.minio.messages.Item;
import shadowshift.studio.imagestorageservice.config.YandexStorageProperties;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @Autowired
    private MinioClient minioClient;

    @Autowired
    private YandexStorageProperties yandexProperties;

    @GetMapping("/yandex-connection")
    public ResponseEntity<?> testYandexConnection() {
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("bucketName", yandexProperties.getBucketName());
            
            // Пытаемся получить список объектов в bucket'е
            Iterable<Result<Item>> objects = minioClient.listObjects(
                ListObjectsArgs.builder()
                    .bucket(yandexProperties.getBucketName())
                    .maxKeys(5) // Только первые 5 объектов для тестирования
                    .build()
            );
            
            List<String> objectNames = new ArrayList<>();
            for (Result<Item> itemResult : objects) {
                Item item = itemResult.get();
                objectNames.add(item.objectName());
            }
            
            result.put("status", "success");
            result.put("message", "Connection to Yandex Object Storage successful");
            result.put("objectCount", objectNames.size());
            result.put("sampleObjects", objectNames);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", "Failed to connect to Yandex Object Storage: " + e.getMessage());
            error.put("errorType", e.getClass().getSimpleName());
            
            System.err.println("Yandex Object Storage connection test failed: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
